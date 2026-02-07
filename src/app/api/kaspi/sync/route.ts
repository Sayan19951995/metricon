import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createKaspiClient } from '@/lib/kaspi-api';
import { OrderState, KaspiOrder } from '@/types/kaspi';

// POST - синхронизировать данные из Kaspi в БД
export async function POST(request: NextRequest) {
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
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (storeError || !store || !store.kaspi_api_key || !store.kaspi_merchant_id) {
      return NextResponse.json({
        success: false,
        message: 'Kaspi не подключен'
      }, { status: 400 });
    }

    const kaspiClient = createKaspiClient(store.kaspi_api_key, store.kaspi_merchant_id);
    const dateTo = Date.now();
    const dateFrom = dateTo - daysBack * 24 * 60 * 60 * 1000;
    // === 1. Получаем ВСЕ заказы без фильтра по state, затем фильтруем активные локально ===
    // Kaspi API не возвращает заказы при фильтрации по активным статусам (KASPI_DELIVERY и т.д.)
    // Макс. диапазон дат — 14 дней (ограничение Kaspi API)
    const activeStates = new Set<string>(['KASPI_DELIVERY', 'DELIVERY', 'NEW', 'SIGN_REQUIRED', 'PICKUP']);
    const allFetchedOrders: KaspiOrder[] = [];
    const existingIds = new Set<string>();

    try {
      const { orders: fetchedOrders } = await kaspiClient.getAllOrders({
        dateFrom,
        dateTo,
        pageSize: 100
      });
      for (const o of fetchedOrders) {
        if (!existingIds.has(o.code)) {
          allFetchedOrders.push(o);
          existingIds.add(o.code);
        }
      }
    } catch (err) {
      console.error('SYNC: failed to fetch all orders:', err);
    }

    console.log(`SYNC: fetched ${allFetchedOrders.length} total orders (no state filter)`);

    // Фильтруем только активные заказы
    const orders = allFetchedOrders.filter(o => activeStates.has(o.state));

    console.log(`SYNC: ${orders.length} active orders out of ${allFetchedOrders.length} total`);

    // Загружаем entries для активных заказов
    for (const order of orders) {
      const entries = await kaspiClient.getOrderEntries(order.code);
      order.entries = entries;
    }

    // Логируем
    const stateCounts: Record<string, number> = {};
    for (const order of orders) {
      stateCounts[order.state] = (stateCounts[order.state] || 0) + 1;
    }
    console.log('SYNC: active orders by state:', JSON.stringify(stateCounts));

    // Подстатусы KASPI_DELIVERY
    const kdOrders = orders.filter(o => o.state === 'KASPI_DELIVERY');
    const subStatusCounts: Record<string, number> = { awaiting_assembly: 0, transmitted: 0, transfer: 0 };
    for (const o of kdOrders) {
      const sub = o.kaspiDelivery?.courierTransmissionDate ? 'transmitted'
        : o.kaspiDelivery?.waybill ? 'transfer'
        : 'awaiting_assembly'; // preOrder + packing объединены (API не различает)
      subStatusCounts[sub]++;
    }
    console.log('SYNC KD sub-statuses:', JSON.stringify(subStatusCounts));

    // === 2. Сохраняем активные заказы в БД ===
    let ordersCreated = 0;
    let ordersUpdated = 0;
    let productsCreated = 0;
    const productsMap = new Map<string, any>();

    for (const order of orders) {
      // Собираем продукты
      for (const entry of order.entries) {
        if (!productsMap.has(entry.product.code)) {
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

      const { data: existingOrder } = await supabase
        .from('orders')
        .select('id')
        .eq('kaspi_order_id', order.orderId)
        .eq('store_id', store.id)
        .single();

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
          const base = order.state.toLowerCase();
          if (order.state === 'KASPI_DELIVERY') {
            if (order.kaspiDelivery?.courierTransmissionDate) return 'kaspi_delivery_transmitted';
            if (order.kaspiDelivery?.waybill) return 'kaspi_delivery_transfer';
            return 'kaspi_delivery_awaiting'; // Предзаказ+Упаковка (API не различает)
          }
          return base;
        })(),
        total_amount: order.totalPrice,
        items: order.entries.map(e => ({
          product_code: e.product.code,
          product_name: e.product.name,
          quantity: e.quantity,
          price: e.basePrice,
          total: e.totalPrice
        })),
      };

      if (existingOrder) {
        await supabase.from('orders').update(orderData).eq('id', existingOrder.id);
        ordersUpdated++;
      } else {
        await supabase.from('orders').insert({
          ...orderData,
          created_at: order.creationDate ? new Date(parseInt(order.creationDate)).toISOString() : new Date().toISOString()
        });
        ordersCreated++;
      }
    }

    // Сохраняем продукты
    for (const product of productsMap.values()) {
      const { data: existingProduct } = await supabase
        .from('products')
        .select('id')
        .eq('kaspi_id', product.kaspi_id)
        .eq('store_id', store.id)
        .single();

      if (!existingProduct) {
        await supabase.from('products').insert(product);
        productsCreated++;
      }
    }

    // === 3. Отслеживание завершений и возвратов ===
    // Получаем все архивные заказы из Kaspi за период
    const allArchiveOrders: KaspiOrder[] = [];
    const archiveIds = new Set<string>();

    for (const state of ['ARCHIVE', 'COMPLETED'] as OrderState[]) {
      try {
        const { orders: stateOrders } = await kaspiClient.getAllOrders({
          state,
          dateFrom,
          dateTo,
          pageSize: 100
        });
        for (const o of stateOrders) {
          if (!archiveIds.has(o.code)) {
            allArchiveOrders.push(o);
            archiveIds.add(o.code);
          }
        }
      } catch {
        // Нет заказов в этом статусе
      }
    }

    console.log(`SYNC: fetched ${allArchiveOrders.length} archive orders for completion tracking`);

    // Для каждого архивного заказа проверяем в БД
    let completionsDetected = 0;
    let returnsDetected = 0;

    for (const order of allArchiveOrders) {
      const orderId = order.orderId;
      const kaspiStatus = (order.state === 'ARCHIVE' || order.state === 'COMPLETED')
        ? (order.status || order.state).toLowerCase()
        : order.state.toLowerCase();

      const { data: dbOrder } = await supabase
        .from('orders')
        .select('id, status, completed_at')
        .eq('kaspi_order_id', orderId)
        .eq('store_id', store.id)
        .single();

      if (!dbOrder) continue;

      // Заказ выдан (COMPLETED) — completed_at = лучшее приближение даты выдачи
      // Kaspi API v2 не даёт stateDate для ARCHIVE. Используем:
      // 1. stateDate (если есть) — точная дата перехода в COMPLETED
      // 2. courierTransmissionDate — дата передачи курьеру (ближайшее к выдаче)
      // 3. approveDate/creationDate — дата создания заказа (fallback)
      if (kaspiStatus === 'completed') {
        const update: Record<string, any> = { status: 'completed' };
        // completed_at ставим ТОЛЬКО при первом обнаружении (не перезаписываем)
        // new Date() ≈ дата выдачи если sync запускается регулярно
        if (!dbOrder.completed_at) {
          update.completed_at = new Date().toISOString();
          completionsDetected++;
        }
        if (dbOrder.status !== 'completed' || update.completed_at) {
          await supabase.from('orders').update(update).eq('id', dbOrder.id);
        }
      }

      // Заказ возвращён — обновляем статус, НЕ трогаем completed_at если уже есть
      if (kaspiStatus === 'returned' && dbOrder.status !== 'returned') {
        const update: Record<string, any> = { status: 'returned' };
        if (!dbOrder.completed_at) {
          update.completed_at = new Date().toISOString();
        }
        await supabase.from('orders').update(update).eq('id', dbOrder.id);
        returnsDetected++;
      }

      // Отменённый заказ
      if (kaspiStatus === 'cancelled' && dbOrder.status !== 'cancelled') {
        await supabase.from('orders').update({
          status: 'cancelled'
        }).eq('id', dbOrder.id);
      }
    }

    console.log(`SYNC: completions=${completionsDetected}, returns=${returnsDetected}, ordersCreated=${ordersCreated}, ordersUpdated=${ordersUpdated}`);

    // === 4. Пересчитываем daily_stats по дате СОЗДАНИЯ из Kaspi (исключая отменённые/возвращённые) ===
    // completed_at tracking работает параллельно для будущего переключения на дату выдачи
    const allStatsOrders: KaspiOrder[] = [];
    const statsIds = new Set<string>();
    const allStates: OrderState[] = [
      'ARCHIVE', 'COMPLETED', 'CANCELLED', 'RETURNED',
      'KASPI_DELIVERY', 'DELIVERY', 'NEW', 'SIGN_REQUIRED', 'PICKUP'
    ];

    for (const state of allStates) {
      try {
        const { orders: stateOrders } = await kaspiClient.getAllOrders({
          state,
          dateFrom,
          dateTo,
          pageSize: 100
        });
        for (const o of stateOrders) {
          if (!statsIds.has(o.code)) {
            allStatsOrders.push(o);
            statsIds.add(o.code);
          }
        }
      } catch {
        // Нет заказов в этом статусе
      }
    }

    console.log(`SYNC: fetched ${allStatsOrders.length} orders for daily_stats`);

    const dailyStats = new Map<string, { revenue: number; orders_count: number }>();

    for (const order of allStatsOrders) {
      // Пропускаем отменённые и возвращённые
      const orderStatus = (order.status || order.state || '').toUpperCase();
      if (orderStatus === 'CANCELLED' || orderStatus === 'RETURNED') continue;

      // Дата создания в UTC+5
      const utcMs = order.creationDate ? parseInt(order.creationDate) : Date.now();
      const kzDate = new Date(utcMs + 5 * 60 * 60 * 1000).toISOString().split('T')[0];

      if (!dailyStats.has(kzDate)) {
        dailyStats.set(kzDate, { revenue: 0, orders_count: 0 });
      }
      const stat = dailyStats.get(kzDate)!;
      stat.revenue += order.totalPrice;
      stat.orders_count += 1;
    }

    // Сохраняем daily_stats
    for (const [date, stat] of dailyStats) {
      const { data: existingStat } = await supabase
        .from('daily_stats')
        .select('id')
        .eq('store_id', store.id)
        .eq('date', date)
        .single();

      if (existingStat) {
        await supabase.from('daily_stats').update({
          revenue: stat.revenue,
          orders_count: stat.orders_count
        }).eq('id', existingStat.id);
      } else {
        await supabase.from('daily_stats').insert({
          store_id: store.id,
          date,
          revenue: stat.revenue,
          orders_count: stat.orders_count
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Синхронизация завершена`,
      stats: {
        ordersCreated,
        ordersUpdated,
        productsCreated,
        totalOrders: orders.length
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

    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (storeError || !store) {
      return NextResponse.json({
        success: false,
        message: 'Магазин не найден'
      }, { status: 400 });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: dailyStats } = await supabase
      .from('daily_stats')
      .select('*')
      .eq('store_id', store.id)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: true });

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
