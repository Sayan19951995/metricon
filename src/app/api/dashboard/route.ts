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

    // === ВСЕ активные заказы из БД (без лимита по дате) ===
    const completedStatuses = ['completed', 'delivered', 'cancelled', 'returned', 'archive'];

    const { data: allActiveOrders } = await supabase
      .from('orders')
      .select('*')
      .eq('store_id', store.id)
      .not('status', 'in', `(${completedStatuses.join(',')})`)
      .order('created_at', { ascending: false });

    const activeOrders = allActiveOrders || [];

    // Категоризация: Не выдано vs В доставке
    const notSent = activeOrders.filter(o => {
      const s = o.status || '';
      return s === 'new' || s === 'pending' || s === 'approved' ||
        s === 'kaspi_delivery_packing' || s === 'kaspi_delivery_preorder' ||
        s === 'sign_required';
    });

    const inDelivery = activeOrders.filter(o => {
      const s = o.status || '';
      return s === 'delivery' || s === 'delivering' || s === 'pickup' ||
        s === 'kaspi_delivery_transfer' || s === 'kaspi_delivery_transmitted' ||
        s === 'kaspi_delivery';
    });

    // === daily_stats за 14 дней (для графиков) ===
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const { data: dailyStats } = await supabase
      .from('daily_stats')
      .select('*')
      .eq('store_id', store.id)
      .gte('date', fourteenDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: true });

    // === Заказы за 7 дней (для топ товаров) ===
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentOrders } = await supabase
      .from('orders')
      .select('*')
      .eq('store_id', store.id)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false });

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

    // === Данные по неделям для графиков ===
    const now = new Date();
    const currentWeekData: number[] = [];
    const currentWeekOrders: number[] = [];
    const prevWeekData: number[] = [];

    // Поступления за неделю — берём из daily_stats (revenue по дням)
    const weeklyPayments: number[] = [];
    const weeklyCompletedCount: number[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const stat = (dailyStats || []).find(s => s.date === dateStr);
      currentWeekData.push(stat?.revenue || 0);
      currentWeekOrders.push(stat?.orders_count || 0);

      // Поступления = дневная выручка из daily_stats
      weeklyPayments.push(stat?.revenue || 0);
      weeklyCompletedCount.push(stat?.orders_count || 0);

      const prevDate = new Date(now);
      prevDate.setDate(prevDate.getDate() - i - 7);
      const prevDateStr = prevDate.toISOString().split('T')[0];

      const prevStat = (dailyStats || []).find(s => s.date === prevDateStr);
      prevWeekData.push(prevStat?.revenue || 0);
    }

    // === Топ товаров ===
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

    // === Рост ===
    const currentWeekTotal = currentWeekData.reduce((a, b) => a + b, 0);
    const prevWeekTotal = prevWeekData.reduce((a, b) => a + b, 0);
    const weekGrowth = prevWeekTotal > 0
      ? ((currentWeekTotal - prevWeekTotal) / prevWeekTotal * 100)
      : 0;

    const activeRevenue = activeOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

    return NextResponse.json({
      success: true,
      kaspiConnected: true,
      storeName: store.name,
      data: {
        sales: {
          weekData: currentWeekData,
          prevWeekData: prevWeekData,
          ordersPerDay: currentWeekOrders,
          weekGrowth: Math.round(weekGrowth * 10) / 10,
          todayRevenue: currentWeekData[6] || 0,
          todayOrders: currentWeekOrders[6] || 0
        },
        month: {
          revenue: monthRevenue,
          orders: monthOrdersCount,
          productsSold: 0
        },
        todayOrders: {
          total: activeOrders.length,
          new: activeOrders.filter(o => o.status === 'new' || o.status === 'pending').length,
          processing: activeOrders.filter(o => (o.status || '').includes('kaspi_delivery')).length,
          shipping: activeOrders.filter(o => o.status === 'delivery' || o.status === 'delivering').length,
          completed: 0,
          revenue: activeRevenue
        },
        awaitingPayment: {
          totalAmount: activeRevenue,
          ordersCount: activeOrders.length,
          notSent: notSent.reduce((sum, o) => sum + (o.total_amount || 0), 0),
          notSentCount: notSent.length,
          inDelivery: inDelivery.reduce((sum, o) => sum + (o.total_amount || 0), 0),
          inDeliveryCount: inDelivery.length,
          weeklyPayments,
          weeklyCompletedCount
        },
        topProducts,
        totals: {
          orders: totalOrders || 0,
          products: totalProducts || 0
        }
      }
    });

  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка сервера'
    }, { status: 500 });
  }
}
