import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createKaspiClient } from '@/lib/kaspi-api';

// POST - синхронизировать данные из Kaspi в БД
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, daysBack = 30 } = body;

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

    // Получаем заказы из Kaspi
    const kaspiClient = createKaspiClient(store.kaspi_api_key, store.kaspi_merchant_id);

    const dateTo = Date.now();
    const dateFrom = dateTo - daysBack * 24 * 60 * 60 * 1000;

    const { orders } = await kaspiClient.getOrders({
      dateFrom,
      dateTo,
      size: 100
    });

    // Статистика синхронизации
    let ordersCreated = 0;
    let ordersUpdated = 0;
    let productsCreated = 0;

    // Собираем уникальные продукты
    const productsMap = new Map<string, any>();

    // Сохраняем заказы в БД
    for (const order of orders) {
      // Собираем продукты из заказа
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

      // Проверяем существует ли заказ
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('id')
        .eq('kaspi_order_id', order.orderId)
        .eq('store_id', store.id)
        .single();

      const orderData = {
        store_id: store.id,
        kaspi_order_id: order.orderId,
        customer_name: `${order.customer.firstName} ${order.customer.lastName}`.trim(),
        customer_phone: order.customer.cellPhone,
        delivery_address: order.deliveryAddress?.formattedAddress || order.deliveryAddress?.address,
        delivery_date: order.plannedDeliveryDate ? new Date(parseInt(order.plannedDeliveryDate)).toISOString().split('T')[0] : null,
        status: order.state.toLowerCase(),
        total_amount: order.totalPrice,
        items: order.entries.map(e => ({
          product_code: e.product.code,
          product_name: e.product.name,
          quantity: e.quantity,
          price: e.basePrice,
          total: e.totalPrice
        })),
        updated_at: new Date().toISOString()
      };

      if (existingOrder) {
        // Обновляем существующий заказ
        await supabase
          .from('orders')
          .update(orderData)
          .eq('id', existingOrder.id);
        ordersUpdated++;
      } else {
        // Создаём новый заказ
        await supabase
          .from('orders')
          .insert({
            ...orderData,
            created_at: order.creationDate ? new Date(parseInt(order.creationDate)).toISOString() : new Date().toISOString()
          });
        ordersCreated++;
      }
    }

    // Сохраняем продукты в БД
    for (const product of productsMap.values()) {
      const { data: existingProduct } = await supabase
        .from('products')
        .select('id')
        .eq('kaspi_id', product.kaspi_id)
        .eq('store_id', store.id)
        .single();

      if (!existingProduct) {
        await supabase
          .from('products')
          .insert(product);
        productsCreated++;
      }
    }

    // Обновляем дневную статистику
    const stats = await kaspiClient.getOrdersStatistics(dateFrom, dateTo);

    // Группируем заказы по дням
    const dailyStats = new Map<string, {
      revenue: number;
      orders_count: number;
      products_sold: number;
    }>();

    for (const order of orders) {
      const date = order.creationDate
        ? new Date(parseInt(order.creationDate)).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      if (!dailyStats.has(date)) {
        dailyStats.set(date, { revenue: 0, orders_count: 0, products_sold: 0 });
      }

      const stat = dailyStats.get(date)!;
      stat.revenue += order.totalPrice;
      stat.orders_count += 1;
      stat.products_sold += order.entries.reduce((sum, e) => sum + e.quantity, 0);
    }

    // Сохраняем дневную статистику
    for (const [date, stat] of dailyStats) {
      const { data: existingStat } = await supabase
        .from('daily_stats')
        .select('id')
        .eq('store_id', store.id)
        .eq('date', date)
        .single();

      if (existingStat) {
        await supabase
          .from('daily_stats')
          .update({
            revenue: stat.revenue,
            orders_count: stat.orders_count,
            products_sold: stat.products_sold
          })
          .eq('id', existingStat.id);
      } else {
        await supabase
          .from('daily_stats')
          .insert({
            store_id: store.id,
            date,
            revenue: stat.revenue,
            orders_count: stat.orders_count,
            products_sold: stat.products_sold
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
      }
    });

  } catch (error) {
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

    // Получаем магазин пользователя
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

    // Получаем статистику за последние 30 дней
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: dailyStats } = await supabase
      .from('daily_stats')
      .select('*')
      .eq('store_id', store.id)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: true });

    // Получаем количество товаров и заказов
    const { count: ordersCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', store.id);

    const { count: productsCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', store.id);

    // Считаем общую выручку
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
