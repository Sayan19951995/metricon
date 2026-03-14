import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/api-auth';
import { createKaspiClient } from '@/lib/kaspi-api';

const DAYS_BACK = 3;
const CONCURRENCY = 5;

async function parallelMap<T, R>(items: T[], fn: (item: T) => Promise<R>, concurrency: number): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency);
    const chunkResults = await Promise.all(chunk.map(fn));
    results.push(...chunkResults);
  }
  return results;
}

/**
 * GET /api/cron/kaspi-sync
 * Ежедневный фоновый синк заказов Kaspi для всех магазинов.
 * Запускается в 1:00 UTC (6:00 Алматы).
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: stores } = await supabaseAdmin
    .from('stores')
    .select('id, name, kaspi_api_key, kaspi_merchant_id')
    .not('kaspi_api_key', 'is', null)
    .not('kaspi_merchant_id', 'is', null);

  if (!stores || stores.length === 0) {
    return NextResponse.json({ success: true, message: 'No stores' });
  }

  const dateTo = Date.now();
  const dateFrom = dateTo - DAYS_BACK * 24 * 60 * 60 * 1000;

  let synced = 0;
  let failed = 0;

  for (const store of stores) {
    try {
      const kaspiClient = createKaspiClient(store.kaspi_api_key!, store.kaspi_merchant_id!);

      const { orders: fetchedOrders } = await kaspiClient.getAllOrders({ dateFrom, dateTo, pageSize: 100 });

      if (!fetchedOrders || fetchedOrders.length === 0) {
        synced++;
        continue;
      }

      const activeStates = new Set(['KASPI_DELIVERY', 'DELIVERY', 'NEW', 'SIGN_REQUIRED', 'PICKUP']);
      const activeOrders = fetchedOrders.filter(o => activeStates.has(o.state));
      const archiveOrders = fetchedOrders.filter(o =>
        o.state === 'ARCHIVE' || o.state === 'COMPLETED' || o.state === 'RETURNED' || o.state === 'CANCELLED'
      );

      // Batch-check которые уже есть в БД
      const allOrderIds = fetchedOrders.map(o => o.orderId);
      const { data: existingDbOrders } = await supabaseAdmin
        .from('orders')
        .select('kaspi_order_id, items, status, completed_at')
        .eq('store_id', store.id)
        .in('kaspi_order_id', allOrderIds.length > 0 ? allOrderIds : ['__none__']);

      const existingMap = new Map((existingDbOrders || []).map(o => [o.kaspi_order_id, o]));

      // Обновляем активные заказы
      await parallelMap(activeOrders, async (order) => {
        const existing = existingMap.get(order.orderId);
        const status = (() => {
          if (order.state === 'KASPI_DELIVERY') {
            if (order.kaspiDelivery?.courierTransmissionDate) return 'kaspi_delivery_transmitted';
            if (order.kaspiDelivery?.waybill) return 'kaspi_delivery_transfer';
            return 'kaspi_delivery_awaiting';
          }
          return order.state.toLowerCase();
        })();

        const orderData: Record<string, any> = {
          store_id: store.id,
          kaspi_order_id: order.orderId,
          customer_name: `${order.customer.firstName} ${order.customer.lastName}`.trim(),
          customer_phone: order.customer.cellPhone,
          status,
          total_amount: order.totalPrice,
          delivery_mode: order.deliveryMode || null,
          delivery_cost: order.deliveryCostForSeller || 0,
        };

        if (!existing) {
          orderData.created_at = order.creationDate
            ? new Date(parseInt(order.creationDate)).toISOString()
            : new Date().toISOString();
          orderData.items = [];
          await supabaseAdmin.from('orders').upsert(orderData, { onConflict: 'store_id,kaspi_order_id' });
        } else if (existing.status !== status) {
          await supabaseAdmin.from('orders')
            .update({ status, delivery_mode: orderData.delivery_mode, delivery_cost: orderData.delivery_cost })
            .eq('kaspi_order_id', order.orderId)
            .eq('store_id', store.id);
        }
      }, CONCURRENCY);

      // Обновляем статусы архивных заказов
      await parallelMap(archiveOrders, async (order) => {
        const existing = existingMap.get(order.orderId);
        if (!existing) return;

        const kaspiStatus = (order.state || '').toLowerCase();
        const newStatus = kaspiStatus === 'completed' ? 'completed'
          : kaspiStatus === 'returned' ? 'returned'
          : kaspiStatus === 'cancelled' ? 'cancelled'
          : null;

        if (newStatus && existing.status !== newStatus) {
          const update: Record<string, any> = { status: newStatus };
          if ((newStatus === 'completed' || newStatus === 'returned') && !existing.completed_at) {
            update.completed_at = new Date().toISOString();
          }
          await supabaseAdmin.from('orders')
            .update(update)
            .eq('kaspi_order_id', order.orderId)
            .eq('store_id', store.id);
        }
      }, CONCURRENCY);

      synced++;
      console.log(`[CRON kaspi-sync] Store ${store.name || store.id}: synced ${fetchedOrders.length} orders`);
    } catch (err) {
      failed++;
      console.error(`[CRON kaspi-sync] Store ${store.name || store.id} failed:`, err);
    }
  }

  return NextResponse.json({ success: true, total: stores.length, synced, failed });
}
