import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/api-auth';
import { waSendMessage } from '@/lib/whatsapp/client';
import { KaspiMarketingClient, MarketingSession } from '@/lib/kaspi/marketing-client';

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
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get stores with WhatsApp connected
    const { data: stores } = await supabaseAdmin
      .from('stores')
      .select('id, user_id, name, whatsapp_connected, marketing_session')
      .eq('whatsapp_connected', true);

    if (!stores || stores.length === 0) {
      return NextResponse.json({ success: true, message: 'No stores' });
    }

    const yesterday = kzDaysAgo(1);
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

        // Get yesterday's sales
        const { data: dailyData } = await supabaseAdmin
          .from('daily_stats')
          .select('revenue, orders_count, cost, profit')
          .eq('store_id', store.id)
          .eq('date', yesterday)
          .single();

        const revenue = Number(dailyData?.revenue) || 0;
        const ordersCount = Number(dailyData?.orders_count) || 0;
        const profit = Number(dailyData?.profit) || 0;

        // Get yesterday's new orders (by created_at) for product breakdown
        const yesterdayStart = `${yesterday}T00:00:00+05:00`;
        const yesterdayEnd = `${yesterday}T23:59:59+05:00`;
        const { data: orders } = await supabaseAdmin
          .from('orders')
          .select('items, total_amount')
          .eq('store_id', store.id)
          .gte('created_at', yesterdayStart)
          .lte('created_at', yesterdayEnd);

        // Aggregate products from order items
        const productMap = new Map<string, { qty: number; total: number }>();
        if (orders) {
          for (const order of orders) {
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

        // Sort by quantity descending
        const allProducts = [...productMap.entries()]
          .sort((a, b) => b[1].qty - a[1].qty);

        // Get yesterday's ad data (if marketing connected)
        let adCost = 0;
        let adTransactions = 0;
        let adGmv = 0;

        const marketingSession = store.marketing_session as MarketingSession | null;
        if (marketingSession?.user_token) {
          try {
            const client = new KaspiMarketingClient(marketingSession);
            const campaigns = await client.getCampaigns(yesterday, yesterday);
            const summary = KaspiMarketingClient.aggregateCampaigns(campaigns);
            adCost = summary.totalCost;
            adTransactions = summary.totalTransactions;
            adGmv = summary.totalGmv;
          } catch (e) {
            console.error(`[DailySummary] Marketing error for ${store.id}:`, e);
          }
        }

        // Build message
        const storeName = store.name || 'Ваш магазин';
        const [y, m, d] = yesterday.split('-');
        const dateStr = `${d}.${m}.${y}`;
        let message = `📈 *${storeName}* — сводка за ${dateStr}\n\n`;
        message += `🛒 Продажи: ${ordersCount} заказов\n`;
        message += `💰 Выручка: ${formatMoney(revenue)} ₸\n`;

        if (profit > 0) {
          message += `📊 Прибыль: ${formatMoney(profit)} ₸\n`;
        }

        if (allProducts.length > 0) {
          message += `\n📦 *Товары:*\n`;
          allProducts.forEach(([name, data]) => {
            const shortName = name.length > 35 ? name.slice(0, 35) + '…' : name;
            message += `  • ${shortName} — ${data.qty} шт. (${formatMoney(data.total)} ₸)\n`;
          });
        }

        if (adCost > 0 || adTransactions > 0 || adGmv > 0) {
          message += `\n📣 *Из них по рекламе:*\n`;
          message += `  Продажи: ${adTransactions} заказов`;
          if (adGmv > 0) message += ` на ${formatMoney(adGmv)} ₸`;
          message += `\n`;
          message += `  Расходы: ${formatMoney(adCost)} ₸\n`;
          if (revenue > 0 && adGmv > 0) {
            const adPercent = ((adGmv / revenue) * 100).toFixed(0);
            message += `  Доля в продажах: ${adPercent}%\n`;
          }
          if (adGmv > 0 && adCost > 0) {
            const adCostPercent = ((adCost / adGmv) * 100).toFixed(0);
            message += `  Расход: ${adCostPercent}% от выручки рекламы\n`;
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
