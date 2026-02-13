import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

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

    const storeResult = await supabase
      .from('stores')
      .select('*')
      .eq('user_id', userId)
      .single();
    const store = storeResult.data;

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

    const allActiveOrdersResult = await supabase
      .from('orders')
      .select('*')
      .eq('store_id', store.id)
      .not('status', 'in', `(${completedStatuses.join(',')})`)
      .order('created_at', { ascending: false });
    const activeOrders = allActiveOrdersResult.data || [];

    // Категоризация: Не выдано vs В доставке
    const notSent = activeOrders.filter(o => {
      const s = o.status || '';
      return s === 'new' || s === 'pending' || s === 'approved' ||
        s === 'kaspi_delivery_awaiting' || s === 'kaspi_delivery_packing' || s === 'kaspi_delivery_preorder' ||
        s === 'sign_required' || s === 'delivery' || s === 'delivering' || s === 'pickup';
    });

    const inDelivery = activeOrders.filter(o => {
      const s = o.status || '';
      return s === 'kaspi_delivery_transfer' || s === 'kaspi_delivery_transmitted' ||
        s === 'kaspi_delivery';
    });

    // === daily_stats за 14 дней (для графиков) ===
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const dailyStatsResult = await supabase
      .from('daily_stats')
      .select('*')
      .eq('store_id', store.id)
      .gte('date', fourteenDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: true });
    const dailyStats = dailyStatsResult.data || [];

    // === Заказы за 7 дней (для топ товаров) ===
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentOrdersResult = await supabase
      .from('orders')
      .select('*')
      .eq('store_id', store.id)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false });
    const recentOrders = recentOrdersResult.data || [];

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

    const monthStatsResult = await supabase
      .from('daily_stats')
      .select('*')
      .eq('store_id', store.id)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0]);
    const monthStats = monthStatsResult.data || [];

    const monthRevenue = monthStats.reduce((sum: number, d: any) => sum + (d.revenue || 0), 0);
    const monthOrdersCount = monthStats.reduce((sum: number, d: any) => sum + (d.orders_count || 0), 0);

    // === Данные по неделям для графиков ===
    const now = new Date();
    const currentWeekData: number[] = [];
    const currentWeekOrders: number[] = [];
    const prevWeekData: number[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const stat = (dailyStats || []).find(s => s.date === dateStr);
      currentWeekData.push(stat?.revenue || 0);
      currentWeekOrders.push(stat?.orders_count || 0);

      const prevDate = new Date(now);
      prevDate.setDate(prevDate.getDate() - i - 7);
      const prevDateStr = prevDate.toISOString().split('T')[0];

      const prevStat = (dailyStats || []).find(s => s.date === prevDateStr);
      prevWeekData.push(prevStat?.revenue || 0);
    }

    // === Поступления за неделю — по дате выдачи (completed_at) ===
    const sevenDaysAgoDate = new Date(now);
    sevenDaysAgoDate.setDate(sevenDaysAgoDate.getDate() - 7);

    const completedOrdersResult = await supabase
      .from('orders')
      .select('total_amount, completed_at, status')
      .eq('store_id', store.id)
      .not('completed_at', 'is', null)
      .eq('status', 'completed')
      .gte('completed_at', sevenDaysAgoDate.toISOString());
    const completedOrders = completedOrdersResult.data || [];

    // Группируем по дате completed_at в UTC+5
    const paymentsByDate = new Map<string, { revenue: number; count: number }>();
    for (const order of (completedOrders || [])) {
      if (!order.completed_at) continue;
      const utcMs = new Date(order.completed_at).getTime();
      const kzDate = new Date(utcMs + 5 * 3600000).toISOString().split('T')[0];
      const existing = paymentsByDate.get(kzDate);
      if (existing) {
        existing.revenue += order.total_amount || 0;
        existing.count += 1;
      } else {
        paymentsByDate.set(kzDate, { revenue: order.total_amount || 0, count: 1 });
      }
    }

    const weeklyPayments: number[] = [];
    const weeklyCompletedCount: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayStat = paymentsByDate.get(dateStr);
      weeklyPayments.push(dayStat?.revenue || 0);
      weeklyCompletedCount.push(dayStat?.count || 0);
    }

    // === Продажи сегодня (товары) ===
    const todayStr = now.toISOString().split('T')[0];
    const todayStart = new Date(todayStr + 'T00:00:00+05:00'); // UTC+5 Алматы

    const todayOrdersResult = await supabase
      .from('orders')
      .select('items, total_amount, status, created_at')
      .eq('store_id', store.id)
      .gte('created_at', todayStart.toISOString())
      .not('status', 'in', '(cancelled,returned)');
    const todayOrdersList = todayOrdersResult.data || [];

    const todaySoldMap = new Map<string, { name: string; quantity: number; revenue: number }>();
    for (const order of todayOrdersList) {
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
          const existing = todaySoldMap.get(key);
          if (existing) {
            existing.quantity += item.quantity;
            existing.revenue += item.total;
          } else {
            todaySoldMap.set(key, {
              name: item.product_name,
              quantity: item.quantity,
              revenue: item.total,
            });
          }
        }
      }
    }
    const todaySoldProducts = Array.from(todaySoldMap.values())
      .sort((a, b) => b.revenue - a.revenue);

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
        todaySoldProducts,
        totals: {
          orders: totalOrders || 0,
          products: totalProducts || 0
        },
        lastSyncedAt: store.last_synced_at || null,
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
