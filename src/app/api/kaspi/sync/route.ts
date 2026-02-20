import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { createKaspiClient } from '@/lib/kaspi-api';
import { KaspiAPIClient } from '@/lib/kaspi/api-client';
import { KaspiOrder } from '@/types/kaspi';
import { triggerWhatsAppMessages } from '@/lib/whatsapp/trigger';

interface KaspiSession {
  cookies: string;
  merchant_id: string;
}

// Параллельное выполнение с лимитом concurrency
async function parallelMap<T, R>(items: T[], fn: (item: T) => Promise<R>, concurrency: number): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency);
    const chunkResults = await Promise.all(chunk.map(fn));
    results.push(...chunkResults);
  }
  return results;
}

// POST - синхронизировать данные из Kaspi в БД
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await request.json();
    const { userId, daysBack = 14 } = body;

    if (!userId) {
      return NextResponse.json({
        success: false,
        message: 'Необходимо указать userId'
      }, { status: 400 });
    }

    // Получаем магазин пользователя
    const storeResult = await supabase
      .from('stores')
      .select('*')
      .eq('user_id', userId)
      .single();
    const store = storeResult.data;
    const storeError = storeResult.error;

    if (storeError || !store || !store.kaspi_api_key || !store.kaspi_merchant_id) {
      return NextResponse.json({
        success: false,
        message: 'Kaspi не подключен'
      }, { status: 400 });
    }

    const kaspiClient = createKaspiClient(store.kaspi_api_key, store.kaspi_merchant_id);

    // Cabinet client для получения точных дат выдачи (BFF)
    const session = store.kaspi_session as KaspiSession | null;
    const cabinetClient = session?.cookies
      ? new KaspiAPIClient(session.cookies, session.merchant_id || store.kaspi_merchant_id)
      : null;

    const dateTo = Date.now();
    const dateFrom = dateTo - daysBack * 24 * 60 * 60 * 1000;

    // === 1. ОДИН FETCH — получаем ВСЕ заказы за период (без фильтра по state) ===
    const allFetchedOrders: KaspiOrder[] = [];
    const seenIds = new Set<string>();

    try {
      const { orders: fetchedOrders } = await kaspiClient.getAllOrders({
        dateFrom,
        dateTo,
        pageSize: 100
      });
      for (const o of fetchedOrders) {
        if (!seenIds.has(o.code)) {
          allFetchedOrders.push(o);
          seenIds.add(o.code);
        }
      }
    } catch (err) {
      console.error('SYNC: failed to fetch orders:', err);
    }

    const fetchTime = Date.now() - startTime;
    console.log(`SYNC: fetched ${allFetchedOrders.length} orders in ${fetchTime}ms`);

    // === Категоризация заказов локально ===
    const activeStates = new Set(['KASPI_DELIVERY', 'DELIVERY', 'NEW', 'SIGN_REQUIRED', 'PICKUP']);
    const activeOrders = allFetchedOrders.filter(o => activeStates.has(o.state));
    const archiveOrders = allFetchedOrders.filter(o =>
      o.state === 'ARCHIVE' || o.state === 'COMPLETED' || o.state === 'RETURNED' || o.state === 'CANCELLED'
    );

    console.log(`SYNC: ${activeOrders.length} active, ${archiveOrders.length} archive out of ${allFetchedOrders.length} total`);

    // Логируем статусы
    const stateCounts: Record<string, number> = {};
    for (const order of activeOrders) {
      stateCounts[order.state] = (stateCounts[order.state] || 0) + 1;
    }
    console.log('SYNC: active orders by state:', JSON.stringify(stateCounts));

    // Подстатусы KASPI_DELIVERY
    const kdOrders = activeOrders.filter(o => o.state === 'KASPI_DELIVERY');
    const subStatusCounts: Record<string, number> = { awaiting_assembly: 0, transmitted: 0, transfer: 0 };
    for (const o of kdOrders) {
      const sub = o.kaspiDelivery?.courierTransmissionDate ? 'transmitted'
        : o.kaspiDelivery?.waybill ? 'transfer'
        : 'awaiting_assembly';
      subStatusCounts[sub]++;
    }
    console.log('SYNC KD sub-statuses:', JSON.stringify(subStatusCounts));

    // === 2. Загружаем entries ТОЛЬКО для новых заказов (не в БД) ===
    // Batch-проверка: какие kaspi_order_id уже есть в БД
    const activeOrderIds = activeOrders.map(o => o.orderId);
    const { data: existingDbOrders } = await supabase
      .from('orders')
      .select('kaspi_order_id')
      .eq('store_id', store.id)
      .in('kaspi_order_id', activeOrderIds.length > 0 ? activeOrderIds : ['__none__']);

    const existingOrderIdSet = new Set((existingDbOrders || []).map(o => o.kaspi_order_id));
    const newOrders = activeOrders.filter(o => !existingOrderIdSet.has(o.orderId));
    const knownOrders = activeOrders.filter(o => existingOrderIdSet.has(o.orderId));

    console.log(`SYNC: ${newOrders.length} new orders need entries, ${knownOrders.length} known orders skip entries`);

    // Загружаем entries параллельно для новых заказов (concurrency = 5)
    await parallelMap(newOrders, async (order) => {
      order.entries = await kaspiClient.getOrderEntries(order.code);
    }, 5);

    // Для известных заказов — entries не нужны для обновления статуса
    for (const order of knownOrders) {
      order.entries = [];
    }

    // === 3. Сохраняем активные заказы в БД (параллельно) ===
    let ordersCreated = 0;
    let ordersUpdated = 0;
    let productsCreated = 0;
    const productsMap = new Map<string, any>();

    // Подготавливаем данные для всех заказов
    const orderOps: Array<{ isNew: boolean; data: any; createdAt: string }> = [];

    for (const order of activeOrders) {
      // Собираем продукты из entries (только новые заказы имеют entries)
      for (const entry of order.entries) {
        if (!productsMap.has(entry.product.code) && entry.product.name) {
          productsMap.set(entry.product.code, {
            store_id: store.id,
            kaspi_id: entry.product.code,
            name: entry.product.name,
            sku: entry.product.sku,
            price: entry.basePrice,
            quantity: 0
          });
        }
      }

      let deliveryDate: string | null = null;
      if (order.plannedDeliveryDate) {
        deliveryDate = new Date(parseInt(order.plannedDeliveryDate)).toISOString().split('T')[0];
      }

      const orderData = {
        store_id: store.id,
        kaspi_order_id: order.orderId,
        customer_name: `${order.customer.firstName} ${order.customer.lastName}`.trim(),
        customer_phone: order.customer.cellPhone,
        delivery_address: order.deliveryAddress?.formattedAddress || order.deliveryAddress?.address,
        delivery_date: deliveryDate,
        status: (() => {
          if (order.state === 'KASPI_DELIVERY') {
            if (order.kaspiDelivery?.courierTransmissionDate) return 'kaspi_delivery_transmitted';
            if (order.kaspiDelivery?.waybill) return 'kaspi_delivery_transfer';
            return 'kaspi_delivery_awaiting';
          }
          return order.state.toLowerCase();
        })(),
        total_amount: order.totalPrice,
        delivery_mode: order.deliveryMode || null,
        delivery_cost: order.deliveryCostForSeller || 0,
        items: order.entries.length > 0 ? order.entries.map(e => ({
          product_code: e.product.code,
          product_name: e.product.name,
          quantity: e.quantity,
          price: e.basePrice,
          total: e.totalPrice
        })) : undefined,
      };

      orderOps.push({
        isNew: !existingOrderIdSet.has(order.orderId),
        data: orderData,
        createdAt: order.creationDate ? new Date(parseInt(order.creationDate)).toISOString() : new Date().toISOString(),
      });
    }

    // Выполняем DB операции параллельно (concurrency = 10)
    // Используем upsert для новых заказов чтобы избежать дубликатов при параллельных sync
    await parallelMap(orderOps, async (op) => {
      if (op.isNew) {
        await supabase.from('orders').upsert({
          ...op.data,
          items: op.data.items || [],
          created_at: op.createdAt,
        }, { onConflict: 'store_id,kaspi_order_id' });
        ordersCreated++;
      } else {
        const updateData = { ...op.data };
        if (!updateData.items) delete updateData.items;
        await supabase.from('orders').update(updateData)
          .eq('kaspi_order_id', op.data.kaspi_order_id)
          .eq('store_id', store.id);
        ordersUpdated++;
      }
    }, 10);

    // Сохраняем продукты (batch check)
    const productIds = Array.from(productsMap.keys());
    const { data: existingProducts } = await supabase
      .from('products')
      .select('kaspi_id')
      .eq('store_id', store.id)
      .in('kaspi_id', productIds.length > 0 ? productIds : ['__none__']);
    const existingProductIds = new Set((existingProducts || []).map(p => p.kaspi_id));

    const newProducts = Array.from(productsMap.values()).filter(p => !existingProductIds.has(p.kaspi_id));
    if (newProducts.length > 0) {
      await supabase.from('products').insert(newProducts);
      productsCreated = newProducts.length;
    }

    // === 3.5 АВТОРАССЫЛКА: WhatsApp при новых заказах ===
    let waSent = 0;
    let waFailed = 0;
    if (ordersCreated > 0) {
      try {
        const newOrderInfos = orderOps
          .filter(op => op.isNew)
          .map(op => ({
            kaspi_order_id: op.data.kaspi_order_id,
            customer_name: op.data.customer_name,
            customer_phone: op.data.customer_phone,
            total_amount: op.data.total_amount,
            delivery_date: op.data.delivery_date,
            items: (op.data.items || []).map((item: any) => ({
              product_name: item.product_name,
              quantity: item.quantity,
              price: item.price,
            })),
          }));

        const waResult = await triggerWhatsAppMessages(store.id, store.name, 'order_created', newOrderInfos);
        waSent += waResult.sent;
        waFailed += waResult.failed;
      } catch (err) {
        console.error('SYNC: WhatsApp order_created trigger error:', err);
      }
    }

    // === 4. Отслеживание завершений и возвратов (из уже полученных данных) ===
    let bffSessionActive = !!cabinetClient;
    let completionsDetected = 0;
    let returnsDetected = 0;
    let completionsDeferred = 0;

    // Фильтруем архивные заказы для completion tracking
    const completedOrders = archiveOrders.filter(o => {
      const s = (o.status || o.state || '').toUpperCase();
      return s === 'COMPLETED' || s === 'RETURNED' || s === 'CANCELLED';
    });

    if (completedOrders.length > 0) {
      // Batch query: все наши DB заказы по kaspi_order_id
      const archiveOrderIds = completedOrders.map(o => o.orderId);
      const { data: dbArchiveOrders } = await supabase
        .from('orders')
        .select('id, kaspi_order_id, status, completed_at, delivery_mode, delivery_cost')
        .eq('store_id', store.id)
        .in('kaspi_order_id', archiveOrderIds);

      const dbOrderMap = new Map((dbArchiveOrders || []).map(o => [o.kaspi_order_id, o]));

      // Фаза 1: BFF запросы для новых completions (sequential из-за session guard)
      const bffDates = new Map<string, string>();
      const ordersNeedingDate: string[] = [];
      for (const order of completedOrders) {
        const dbOrder = dbOrderMap.get(order.orderId);
        if (!dbOrder) continue;
        const kaspiStatus = (order.status || order.state || '').toLowerCase();
        if (kaspiStatus === 'completed' && !dbOrder.completed_at) {
          ordersNeedingDate.push(order.orderId);
          if (bffSessionActive && cabinetClient) {
            const exactDate = await cabinetClient.getOrderCompletionDate(order.orderId);
            if (exactDate) {
              bffDates.set(order.orderId, exactDate);
              completionsDetected++;
              console.log(`SYNC: order ${order.orderId} completed_at from BFF: ${exactDate}`);
            } else {
              bffSessionActive = false;
              console.warn(`SYNC: BFF returned null for order ${order.orderId}, disabling BFF`);
            }
          }
        }
      }
      completionsDeferred = ordersNeedingDate.length - completionsDetected;

      // Фаза 2: Собираем DB updates (только если что-то реально изменилось)
      const archiveUpdates: Array<{ id: string; update: Record<string, any> }> = [];

      for (const order of completedOrders) {
        const dbOrder = dbOrderMap.get(order.orderId);
        if (!dbOrder) continue;

        const kaspiStatus = (order.status || order.state || '').toLowerCase();

        if (kaspiStatus === 'completed') {
          const update: Record<string, any> = {};
          if (dbOrder.status !== 'completed') update.status = 'completed';
          const bffDate = bffDates.get(order.orderId);
          if (bffDate && !dbOrder.completed_at) update.completed_at = bffDate;
          if (order.deliveryMode && dbOrder.delivery_mode !== order.deliveryMode) update.delivery_mode = order.deliveryMode;
          if (order.deliveryCostForSeller && dbOrder.delivery_cost !== order.deliveryCostForSeller) update.delivery_cost = order.deliveryCostForSeller;
          if (Object.keys(update).length > 0) {
            archiveUpdates.push({ id: dbOrder.id, update });
          }
        }

        if (kaspiStatus === 'returned' && dbOrder.status !== 'returned') {
          const update: Record<string, any> = { status: 'returned' };
          if (!dbOrder.completed_at) update.completed_at = new Date().toISOString();
          if (order.deliveryMode) update.delivery_mode = order.deliveryMode;
          if (order.deliveryCostForSeller) update.delivery_cost = order.deliveryCostForSeller;
          archiveUpdates.push({ id: dbOrder.id, update });
          returnsDetected++;
        }

        if (kaspiStatus === 'cancelled' && dbOrder.status !== 'cancelled') {
          archiveUpdates.push({ id: dbOrder.id, update: { status: 'cancelled' } });
        }
      }

      // Фаза 3: Выполняем DB updates параллельно
      console.log(`SYNC: ${archiveUpdates.length} archive orders need DB update out of ${completedOrders.length}`);
      await parallelMap(archiveUpdates, async ({ id, update }) => {
        await supabase.from('orders').update(update).eq('id', id);
      }, 10);

      // === 4.5 АВТОРАССЫЛКА: WhatsApp при выдаче заказа ===
      if (completionsDetected > 0) {
        try {
          const deliveredOrderInfos: Array<{
            kaspi_order_id: string;
            customer_name: string | null;
            customer_phone: string | null;
            total_amount: number;
          }> = [];

          for (const order of completedOrders) {
            const kaspiStatus = (order.status || order.state || '').toLowerCase();
            if (kaspiStatus !== 'completed') continue;
            const dbOrder = dbOrderMap.get(order.orderId);
            if (dbOrder && dbOrder.status !== 'completed') {
              deliveredOrderInfos.push({
                kaspi_order_id: order.orderId,
                customer_name: `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim(),
                customer_phone: order.customer?.cellPhone || null,
                total_amount: order.totalPrice,
              });
            }
          }

          if (deliveredOrderInfos.length > 0) {
            const waDelivered = await triggerWhatsAppMessages(store.id, store.name, 'order_delivered', deliveredOrderInfos);
            waSent += waDelivered.sent;
            waFailed += waDelivered.failed;
          }
        } catch (err) {
          console.error('SYNC: WhatsApp order_delivered trigger error:', err);
        }
      }
    }

    console.log(`SYNC: completions=${completionsDetected}, deferred=${completionsDeferred}, returns=${returnsDetected}, ordersCreated=${ordersCreated}, ordersUpdated=${ordersUpdated}, bff=${bffSessionActive}`);

    // === 5. Списание остатков со склада ===
    // KASPI_DELIVERY: списать при статусе kaspi_delivery_transmitted (передан курьеру)
    // Остальные (PICKUP, DELIVERY, EXPRESS): списать при completed (выдан клиенту)
    // Возврат/отмена: вернуть на склад
    let stockDeductions = 0;
    let stockRestored = 0;

    try {
      // 5a. Списание: найти заказы где stock_deducted=false и статус требует списания
      const { data: ordersToDeduct } = await supabase
        .from('orders')
        .select('id, status, delivery_mode, items')
        .eq('store_id', store.id)
        .eq('stock_deducted' as any, false)
        .in('status', ['kaspi_delivery_transmitted', 'completed']);

      const validDeductions = (ordersToDeduct || []).filter(order => {
        const isKD = (order.delivery_mode || '').toUpperCase().includes('KASPI');
        return isKD
          ? order.status === 'kaspi_delivery_transmitted'
          : order.status === 'completed';
      }).filter(o => Array.isArray(o.items) && o.items.length > 0);

      if (validDeductions.length > 0) {
        // Собираем суммарное кол-во к списанию по каждому product_code
        const deductionMap = new Map<string, number>();
        for (const order of validDeductions) {
          for (const item of order.items as any[]) {
            if (!item.product_code || !item.quantity) continue;
            deductionMap.set(
              item.product_code,
              (deductionMap.get(item.product_code) || 0) + item.quantity
            );
          }
        }

        // Batch-читаем текущие остатки (quantity + kaspi_stock)
        const productCodes = Array.from(deductionMap.keys());
        const { data: products } = await supabase
          .from('products')
          .select('id, kaspi_id, quantity, kaspi_stock' as any)
          .eq('store_id', store.id)
          .in('kaspi_id', productCodes);

        // Обновляем оба остатка: quantity и kaspi_stock
        if (products) {
          await parallelMap(products as any[], async (product) => {
            const deduct = deductionMap.get(product.kaspi_id!) || 0;
            if (deduct > 0) {
              const update: Record<string, any> = {
                quantity: Math.max((product.quantity || 0) - deduct, 0),
              };
              if (product.kaspi_stock != null) {
                update.kaspi_stock = Math.max(product.kaspi_stock - deduct, 0);
              }
              await supabase.from('products').update(update).eq('id', product.id);
            }
          }, 10);
        }

        // Отмечаем заказы как списанные
        await supabase
          .from('orders')
          .update({ stock_deducted: true } as any)
          .in('id', validDeductions.map(o => o.id));

        stockDeductions = validDeductions.length;
      }

      // 5b. Возврат остатков: заказы были списаны, но потом вернулись/отменились
      const { data: returnedOrders } = await supabase
        .from('orders')
        .select('id, items')
        .eq('store_id', store.id)
        .eq('stock_deducted' as any, true)
        .in('status', ['returned', 'cancelled']);

      if (returnedOrders && returnedOrders.length > 0) {
        const restoreMap = new Map<string, number>();
        for (const order of returnedOrders) {
          for (const item of (Array.isArray(order.items) ? order.items : []) as any[]) {
            if (!item.product_code || !item.quantity) continue;
            restoreMap.set(
              item.product_code,
              (restoreMap.get(item.product_code) || 0) + item.quantity
            );
          }
        }

        const productCodes = Array.from(restoreMap.keys());
        const { data: products } = await supabase
          .from('products')
          .select('id, kaspi_id, quantity, kaspi_stock' as any)
          .eq('store_id', store.id)
          .in('kaspi_id', productCodes);

        if (products) {
          await parallelMap(products as any[], async (product) => {
            const restore = restoreMap.get(product.kaspi_id!) || 0;
            if (restore > 0) {
              const update: Record<string, any> = {
                quantity: (product.quantity || 0) + restore,
              };
              if (product.kaspi_stock != null) {
                update.kaspi_stock = product.kaspi_stock + restore;
              }
              await supabase.from('products').update(update).eq('id', product.id);
            }
          }, 10);
        }

        // Сбрасываем флаг (stock_deducted=false) — заказ возвращён
        await supabase
          .from('orders')
          .update({ stock_deducted: false } as any)
          .in('id', returnedOrders.map(o => o.id));

        stockRestored = returnedOrders.length;
      }
    } catch (err) {
      console.error('SYNC: stock deduction error:', err);
    }

    if (stockDeductions > 0 || stockRestored > 0) {
      console.log(`SYNC: stock deducted for ${stockDeductions} orders, restored for ${stockRestored} orders`);
    }

    // === 6. Пересчитываем daily_stats из уже полученных данных (НЕ делаем доп. API запросы) ===
    const dailyStats = new Map<string, { revenue: number; orders_count: number }>();

    for (const order of allFetchedOrders) {
      const orderStatus = (order.status || order.state || '').toUpperCase();
      if (orderStatus === 'CANCELLED' || orderStatus === 'RETURNED') continue;

      const utcMs = order.creationDate ? parseInt(order.creationDate) : Date.now();
      const kzDate = new Date(utcMs + 5 * 60 * 60 * 1000).toISOString().split('T')[0];

      if (!dailyStats.has(kzDate)) {
        dailyStats.set(kzDate, { revenue: 0, orders_count: 0 });
      }
      const stat = dailyStats.get(kzDate)!;
      stat.revenue += order.totalPrice;
      stat.orders_count += 1;
    }

    // Batch upsert daily_stats
    const statsToUpsert = Array.from(dailyStats.entries()).map(([date, stat]) => ({
      store_id: store.id,
      date,
      revenue: stat.revenue,
      orders_count: stat.orders_count,
    }));

    if (statsToUpsert.length > 0) {
      await supabase
        .from('daily_stats')
        .upsert(statsToUpsert, { onConflict: 'store_id,date' });
    }

    // Обновляем last_synced_at
    await supabase.from('stores').update({ last_synced_at: new Date().toISOString() }).eq('id', store.id);

    const totalTime = Date.now() - startTime;
    console.log(`SYNC: done in ${totalTime}ms (${(totalTime / 1000).toFixed(1)}s)`);

    return NextResponse.json({
      success: true,
      message: `Синхронизация завершена за ${(totalTime / 1000).toFixed(1)}с`,
      bffSessionActive,
      stats: {
        ordersCreated,
        ordersUpdated,
        productsCreated,
        totalOrders: activeOrders.length,
        completionsDetected,
        completionsDeferred,
        stockDeductions,
        stockRestored,
        whatsappSent: waSent,
        whatsappFailed: waFailed,
        syncTimeMs: totalTime,
      },
    });

  } catch (error) {
    console.error('SYNC error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}

// GET - получить статистику из БД
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({
        success: false,
        message: 'Необходимо указать userId'
      }, { status: 400 });
    }

    const storeResult2 = await supabase
      .from('stores')
      .select('*')
      .eq('user_id', userId)
      .single();
    const store = storeResult2.data;
    const storeError = storeResult2.error;

    if (storeError || !store) {
      return NextResponse.json({
        success: false,
        message: 'Магазин не найден'
      }, { status: 400 });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyStatsResult = await supabase
      .from('daily_stats')
      .select('*')
      .eq('store_id', store.id)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: true });
    const dailyStats = dailyStatsResult.data || [];

    const { count: ordersCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', store.id);

    const { count: productsCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', store.id);

    const totalRevenue = (dailyStats || []).reduce((sum, day) => sum + (day.revenue || 0), 0);

    return NextResponse.json({
      success: true,
      stats: {
        ordersCount: ordersCount || 0,
        productsCount: productsCount || 0,
        totalRevenue,
        dailyStats: dailyStats || []
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}
