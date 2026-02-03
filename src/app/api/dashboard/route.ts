import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({
        success: false,
        message: 'userId обязателен'
      }, { status: 400 });
    }

    // Получаем магазин пользователя
    const { data: store } = await supabase
      .from('stores')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!store) {
      return NextResponse.json({
        success: true,
        kaspiConnected: false,
        message: 'Kaspi не подключен'
      });
    }

    const kaspiConnected = !!(store.kaspi_api_key && store.kaspi_merchant_id);

    if (!kaspiConnected) {
      return NextResponse.json({
        success: true,
        kaspiConnected: false,
        storeName: store.name,
        message: 'Kaspi API не настроен'
      });
    }

    // === Дневная статистика за последние 14 дней (текущая + прошлая неделя) ===
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const { data: dailyStats } = await supabase
      .from('daily_stats')
      .select('*')
      .eq('store_id', store.id)
      .gte('date', fourteenDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: true });

    // === Заказы за последние 7 дней ===
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentOrders } = await supabase
      .from('orders')
      .select('*')
      .eq('store_id', store.id)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    // === Заказы за сегодня ===
    const today = new Date().toISOString().split('T')[0];

    const { data: todayOrders } = await supabase
      .from('orders')
      .select('*')
      .eq('store_id', store.id)
      .gte('created_at', today + 'T00:00:00')
      .lte('created_at', today + 'T23:59:59');

    // === Общие счётчики ===
    const { count: totalOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', store.id);

    const { count: totalProducts } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', store.id);

    // === Статистика за 30 дней ===
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: monthStats } = await supabase
      .from('daily_stats')
      .select('*')
      .eq('store_id', store.id)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0]);

    const monthRevenue = (monthStats || []).reduce((sum, d) => sum + (d.revenue || 0), 0);
    const monthOrdersCount = (monthStats || []).reduce((sum, d) => sum + (d.orders_count || 0), 0);
    const monthProductsSold = (monthStats || []).reduce((sum, d) => sum + (d.products_sold || 0), 0);

    // === Формируем данные по неделям для графиков ===
    const now = new Date();

    // Текущая неделя (последние 7 дней)
    const currentWeekData: number[] = [];
    const currentWeekOrders: number[] = [];
    // Прошлая неделя (7-14 дней назад)
    const prevWeekData: number[] = [];
    const prevWeekOrders: number[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const stat = (dailyStats || []).find(s => s.date === dateStr);
      currentWeekData.push(stat?.revenue || 0);
      currentWeekOrders.push(stat?.orders_count || 0);

      // Прошлая неделя
      const prevDate = new Date(now);
      prevDate.setDate(prevDate.getDate() - i - 7);
      const prevDateStr = prevDate.toISOString().split('T')[0];

      const prevStat = (dailyStats || []).find(s => s.date === prevDateStr);
      prevWeekData.push(prevStat?.revenue || 0);
      prevWeekOrders.push(prevStat?.orders_count || 0);
    }

    // === Топ товаров из заказов ===
    const productSales = new Map<string, { name: string; sold: number; revenue: number }>();

    for (const order of (recentOrders || [])) {
      const items = order.items as Array<{
        product_code: string;
        product_name: string;
        quantity: number;
        price: number;
        total: number;
      }> | null;

      if (items && Array.isArray(items)) {
        for (const item of items) {
          const key = item.product_code || item.product_name;
          const existing = productSales.get(key);
          if (existing) {
            existing.sold += item.quantity;
            existing.revenue += item.total;
          } else {
            productSales.set(key, {
              name: item.product_name,
              sold: item.quantity,
              revenue: item.total
            });
          }
        }
      }
    }

    const topProducts = Array.from(productSales.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // === Подсчёт заказов по статусам (сегодня) ===
    const todayOrdersList = todayOrders || [];
    const todayNew = todayOrdersList.filter(o => o.status === 'new' || o.status === 'pending').length;
    const todayProcessing = todayOrdersList.filter(o => o.status === 'approved' || o.status === 'processing').length;
    const todayShipping = todayOrdersList.filter(o => o.status === 'delivery' || o.status === 'delivering').length;
    const todayCompleted = todayOrdersList.filter(o => o.status === 'completed' || o.status === 'delivered').length;
    const todayRevenue = todayOrdersList.reduce((sum, o) => sum + (o.total_amount || 0), 0);

    // === Поступления за неделю (completed заказы по дням) ===
    const weeklyPayments: number[] = [];
    const weeklyCompletedCount: number[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayOrders = (recentOrders || []).filter(o => {
        const orderDate = o.created_at?.split('T')[0];
        return orderDate === dateStr && (o.status === 'completed' || o.status === 'delivered');
      });

      weeklyPayments.push(dayOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0));
      weeklyCompletedCount.push(dayOrders.length);
    }

    // === Ожидаем платежа ===
    const pendingOrders = (recentOrders || []).filter(o =>
      o.status !== 'completed' && o.status !== 'delivered' && o.status !== 'cancelled'
    );
    const awaitingPaymentTotal = pendingOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const notSent = pendingOrders.filter(o => o.status === 'new' || o.status === 'pending' || o.status === 'approved');
    const inDelivery = pendingOrders.filter(o => o.status === 'delivery' || o.status === 'delivering');

    // === Рост по сравнению с прошлой неделей ===
    const currentWeekTotal = currentWeekData.reduce((a, b) => a + b, 0);
    const prevWeekTotal = prevWeekData.reduce((a, b) => a + b, 0);
    const weekGrowth = prevWeekTotal > 0
      ? ((currentWeekTotal - prevWeekTotal) / prevWeekTotal * 100)
      : 0;

    return NextResponse.json({
      success: true,
      kaspiConnected: true,
      storeName: store.name,
      data: {
        // Продажи
        sales: {
          weekData: currentWeekData,
          prevWeekData: prevWeekData,
          ordersPerDay: currentWeekOrders,
          weekGrowth: Math.round(weekGrowth * 10) / 10,
          todayRevenue: currentWeekData[6] || 0,
          todayOrders: currentWeekOrders[6] || 0
        },
        // Месяц
        month: {
          revenue: monthRevenue,
          orders: monthOrdersCount,
          productsSold: monthProductsSold
        },
        // Заказы на сегодня
        todayOrders: {
          total: todayOrdersList.length,
          new: todayNew,
          processing: todayProcessing,
          shipping: todayShipping,
          completed: todayCompleted,
          revenue: todayRevenue
        },
        // Ожидаем платежа
        awaitingPayment: {
          totalAmount: awaitingPaymentTotal,
          ordersCount: pendingOrders.length,
          notSent: notSent.reduce((sum, o) => sum + (o.total_amount || 0), 0),
          notSentCount: notSent.length,
          inDelivery: inDelivery.reduce((sum, o) => sum + (o.total_amount || 0), 0),
          inDeliveryCount: inDelivery.length,
          weeklyPayments,
          weeklyCompletedCount
        },
        // Топ товаров
        topProducts,
        // Общие счётчики
        totals: {
          orders: totalOrders || 0,
          products: totalProducts || 0
        }
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка сервера'
    }, { status: 500 });
  }
}
