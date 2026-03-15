import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/api-auth';
import { waSendMessage } from '@/lib/whatsapp/client';
import { KaspiMarketingClient, MarketingSession } from '@/lib/kaspi/marketing-client';
import { createKaspiClient } from '@/lib/kaspi-api';

const KZ_OFFSET = 5 * 3600000; // UTC+5

function kzDaysAgo(days: number): string {
  const kzNow = new Date(Date.now() + KZ_OFFSET);
  const d = new Date(kzNow.getTime() - days * 86400000);
  return d.toISOString().split('T')[0];
}

function formatMoney(n: number): string {
  return Math.round(n).toLocaleString('ru-RU');
}

/**
 * GET /api/cron/daily-summary
 * Ежедневная сводка по WhatsApp: продажи, выручка, реклама.
 * Запускается в 7:00 по Казахстану (2:00 UTC).
 *
 * Перед отправкой сводки делает свежий синк заказов из Kaspi API,
 * чтобы данные были актуальными (не зависим от отдельного kaspi-sync крона).
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // === STEP 1: Синкаем заказы напрямую из Kaspi API ===
    console.log('[DailySummary] Step 1: Syncing orders from Kaspi API...');
    const { data: allStores } = await supabaseAdmin
      .from('stores')
      .select('id, name, kaspi_api_key, kaspi_merchant_id')
      .not('kaspi_api_key', 'is', null)
      .not('kaspi_merchant_id', 'is', null);

    if (allStores) {
      for (const s of allStores) {
        try {
          const kaspiClient = createKaspiClient(s.kaspi_api_key!, s.kaspi_merchant_id!);
          const dateTo = Date.now();
          const dateFrom = dateTo - 3 * 24 * 60 * 60 * 1000; // 3 дня назад
          const { orders: fetchedOrders } = await kaspiClient.getAllOrders({ dateFrom, dateTo, pageSize: 100 });

          if (!fetchedOrders || fetchedOrders.length === 0) continue;

          // Получаем существующие заказы
          const orderIds = fetchedOrders.map(o => o.orderId);
          const { data: existingOrders } = await supabaseAdmin
            .from('orders')
            .select('kaspi_order_id, status, completed_at')
            .eq('store_id', s.id)
            .in('kaspi_order_id', orderIds.length > 0 ? orderIds : ['__none__']);
          const existingMap = new Map((existingOrders || []).map(o => [o.kaspi_order_id, o]));

          for (const order of fetchedOrders) {
            const existing = existingMap.get(order.orderId);
            const isCompleted = order.state === 'COMPLETED' || order.state === 'ARCHIVE';
            const isReturned = order.state === 'RETURNED';
            const isCancelled = order.state === 'CANCELLED';

            if (!existing) {
              // Новый заказ — вставляем
              const status = isCompleted ? 'completed' : isReturned ? 'returned' : isCancelled ? 'cancelled' : order.state.toLowerCase();
              await supabaseAdmin.from('orders').upsert({
                store_id: s.id,
                kaspi_order_id: order.orderId,
                customer_name: `${order.customer.firstName} ${order.customer.lastName}`.trim(),
                customer_phone: order.customer.cellPhone,
                status,
                total_amount: order.totalPrice,
                delivery_mode: order.deliveryMode || null,
                delivery_cost: order.deliveryCostForSeller || 0,
                created_at: order.creationDate ? new Date(parseInt(order.creationDate)).toISOString() : new Date().toISOString(),
                completed_at: isCompleted ? new Date(parseInt(order.creationDate)).toISOString() : null,
                items: [],
              } as any, { onConflict: 'store_id,kaspi_order_id' });
            } else if (isCompleted && existing.status !== 'completed') {
              // Обновляем статус на completed
              const update: Record<string, any> = { status: 'completed' };
              if (!existing.completed_at) {
                update.completed_at = order.creationDate
                  ? new Date(parseInt(order.creationDate)).toISOString()
                  : new Date().toISOString();
              }
              await supabaseAdmin.from('orders')
                .update(update)
                .eq('kaspi_order_id', order.orderId)
                .eq('store_id', s.id);
            } else if (isReturned && existing.status !== 'returned') {
              await supabaseAdmin.from('orders')
                .update({ status: 'returned' })
                .eq('kaspi_order_id', order.orderId)
                .eq('store_id', s.id);
            }
          }

          console.log(`[DailySummary] Synced ${fetchedOrders.length} orders for store ${s.name || s.id}`);
        } catch (syncErr) {
          console.error(`[DailySummary] Sync failed for store ${s.name || s.id}:`, syncErr);
        }
      }
    }

    // === STEP 2: Формируем и отправляем сводку ===
    console.log('[DailySummary] Step 2: Building summary...');
    const { data: stores } = await supabaseAdmin
      .from('stores')
      .select('id, user_id, name, marketing_session')
      .eq('whatsapp_connected', true);

    if (!stores || stores.length === 0) {
      return NextResponse.json({ success: true, message: 'No stores' });
    }

    const yesterday = kzDaysAgo(1);
    const yesterdayStart = `${yesterday}T00:00:00+05:00`;
    const yesterdayEnd = `${yesterday}T23:59:59+05:00`;
    let sent = 0;

    for (const store of stores) {
      try {
        // Get owner phone
        const { data: user } = await supabaseAdmin
          .from('users')
          .select('phone')
          .eq('id', store.user_id as string)
          .single();

        const phone = (user as any)?.phone;
        if (!phone) continue;

        const cleanPhone = phone.replace(/\D/g, '');
        const waPhone = cleanPhone.startsWith('8') ? '7' + cleanPhone.slice(1) : cleanPhone;

        // Считаем выручку напрямую из orders по completed_at за вчера
        const { data: completedOrders } = await supabaseAdmin
          .from('orders')
          .select('items, total_amount')
          .eq('store_id', store.id)
          .eq('status', 'completed')
          .gte('completed_at', yesterdayStart)
          .lte('completed_at', yesterdayEnd);

        const ordersCount = completedOrders?.length || 0;
        let revenue = 0;
        const productMap = new Map<string, { qty: number; total: number }>();

        if (completedOrders) {
          for (const order of completedOrders) {
            revenue += Number(order.total_amount) || 0;
            const items = (order.items as any[]) || [];
            for (const item of items) {
              const name = item.product_name || item.name || 'Товар';
              const qty = Number(item.quantity) || 1;
              const total = Number(item.total) || Number(item.price) * qty || 0;
              const existing = productMap.get(name) || { qty: 0, total: 0 };
              productMap.set(name, { qty: existing.qty + qty, total: existing.total + total });
            }
          }
        }

        // Также считаем новые заказы за вчера (по created_at)
        const { data: newOrders } = await supabaseAdmin
          .from('orders')
          .select('kaspi_order_id')
          .eq('store_id', store.id)
          .gte('created_at', yesterdayStart)
          .lte('created_at', yesterdayEnd);
        const newOrdersCount = newOrders?.length || 0;

        const allProducts = [...productMap.entries()]
          .sort((a, b) => b[1].qty - a[1].qty);

        // Marketing data
        let marketingTotal = 0;
        let channelCosts = { productAds: 0, externalAds: 0, sellerBonuses: 0, reviewBonuses: 0 };
        let adTransactions = 0;
        let adGmv = 0;

        const marketingSession = store.marketing_session as MarketingSession | null;
        if (marketingSession?.user_token) {
          try {
            const client = new KaspiMarketingClient(marketingSession);
            const channels = await client.getAllChannelsCost(yesterday, yesterday);
            marketingTotal = channels.totalCost;
            adTransactions = channels.totalTransactions;
            adGmv = channels.totalGmv;
            channelCosts = {
              productAds: channels.productAds.cost,
              externalAds: channels.externalAds.cost,
              sellerBonuses: channels.sellerBonuses.cost,
              reviewBonuses: channels.reviewBonuses.cost,
            };
          } catch (e) {
            console.error(`[DailySummary] Marketing error for ${store.id}:`, e);
          }
        }

        // Build message
        const storeName = store.name || 'Ваш магазин';
        const [y, m, d] = yesterday.split('-');
        const dateStr = `${d}.${m}.${y}`;
        let message = `📈 *${storeName}* — сводка за ${dateStr}\n\n`;
        message += `🛒 Поступления: ${ordersCount} заказов на ${formatMoney(revenue)} ₸\n`;
        if (newOrdersCount > 0) {
          message += `📥 Новых заказов: ${newOrdersCount}\n`;
        }

        if (allProducts.length > 0) {
          message += `\n📦 *Товары (выданные):*\n`;
          allProducts.forEach(([name, data]) => {
            const shortName = name.length > 35 ? name.slice(0, 35) + '…' : name;
            message += `  • ${shortName} — ${data.qty} шт. (${formatMoney(data.total)} ₸)\n`;
          });
        }

        if (marketingTotal > 0 || adTransactions > 0) {
          message += `\n📣 *Маркетинг:*\n`;
          if (channelCosts.productAds > 0) message += `  Реклама товаров: ${formatMoney(channelCosts.productAds)} ₸\n`;
          if (channelCosts.externalAds > 0) message += `  Внешняя реклама: ${formatMoney(channelCosts.externalAds)} ₸\n`;
          if (channelCosts.sellerBonuses > 0) message += `  Бонусы от продавца: ${formatMoney(channelCosts.sellerBonuses)} ₸\n`;
          if (channelCosts.reviewBonuses > 0) message += `  Бонусы за отзыв: ${formatMoney(channelCosts.reviewBonuses)} ₸\n`;
          message += `  *Итого: ${formatMoney(marketingTotal)} ₸*\n`;
          if (adTransactions > 0) {
            message += `  Продажи: ${adTransactions} заказов`;
            if (adGmv > 0) message += ` на ${formatMoney(adGmv)} ₸`;
            message += `\n`;
          }
          if (revenue > 0 && marketingTotal > 0) {
            const marketingPercent = ((marketingTotal / revenue) * 100).toFixed(0);
            message += `  Доля от выручки: ${marketingPercent}%\n`;
          }
        }

        message += `\nПодробнее: metricon.kz/app/analytics`;

        const ok = await waSendMessage('metricon-global', waPhone, message);
        if (ok) sent++;

      } catch (err) {
        console.error(`[DailySummary] Error for store ${store.id}:`, err);
      }
    }

    return NextResponse.json({ success: true, checked: stores.length, sent });
  } catch (error) {
    console.error('[DailySummary] Cron error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
