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
        success: false,
        message: 'Магазин не найден'
      }, { status: 400 });
    }

    // === 1. Вся история daily_stats ===
    const { data: allDailyStats } = await supabase
      .from('daily_stats')
      .select('*')
      .eq('store_id', store.id)
      .order('date', { ascending: true });

    const dailyStats = allDailyStats || [];

    // Формируем dailyData в формате, совместимом с фронтендом
    const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const dailyData = dailyStats.map(stat => {
      const d = new Date(stat.date + 'T12:00:00');
      const dayOfWeek = d.getDay();
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      return {
        date: `${dd}.${mm}`,
        fullDate: stat.date + 'T12:00:00',  // ISO string, будет преобразовано в Date на клиенте
        day: dayNames[dayOfWeek],
        orders: stat.orders_count || 0,
        revenue: stat.revenue || 0,
        cost: stat.cost || 0,
        advertising: stat.advertising || 0,
        commissions: stat.commissions || 0,
        tax: 0,
        delivery: stat.delivery_cost || 0,
        profit: stat.profit || 0,
      };
    });

    // === 2. Топ товары — агрегируем из заказов за всю историю ===
    const { data: allOrders } = await supabase
      .from('orders')
      .select('items, total_amount, status, created_at')
      .eq('store_id', store.id)
      .not('status', 'in', '(cancelled,returned)');

    const productSales = new Map<string, { name: string; sold: number; revenue: number }>();

    for (const order of (allOrders || [])) {
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
              revenue: item.total,
            });
          }
        }
      }
    }

    const topProducts = Array.from(productSales.entries())
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 20)
      .map(([code, data], idx) => ({
        id: String(idx + 1),
        name: data.name,
        sku: code,
        image: '',
        sales: data.sold,
        adSales: 0,
        revenue: data.revenue,
        cost: 0,
        profit: 0,
      }));

    // === 3. Статусы заказов ===
    const { data: ordersByStatusRaw } = await supabase
      .from('orders')
      .select('status')
      .eq('store_id', store.id);

    const statusCounts: Record<string, number> = {};
    for (const o of (ordersByStatusRaw || [])) {
      const s = o.status || 'unknown';
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    }

    // Маппинг в формат фронтенда
    const pending = (statusCounts['new'] || 0) + (statusCounts['pending'] || 0);
    const processing = (statusCounts['kaspi_delivery_packing'] || 0) +
                       (statusCounts['kaspi_delivery_preorder'] || 0) +
                       (statusCounts['sign_required'] || 0);
    const shipped = (statusCounts['delivery'] || 0) +
                    (statusCounts['kaspi_delivery_transfer'] || 0) +
                    (statusCounts['kaspi_delivery_transmitted'] || 0) +
                    (statusCounts['pickup'] || 0);
    const delivered = (statusCounts['completed'] || 0) + (statusCounts['delivered'] || 0);
    const cancelled = (statusCounts['cancelled'] || 0) + (statusCounts['returned'] || 0);

    // === 4. Активные заказы (pending orders — ожидают поступления) ===
    const completedStatuses = ['completed', 'delivered', 'cancelled', 'returned', 'archive'];
    const { data: activeOrdersRaw } = await supabase
      .from('orders')
      .select('kaspi_order_id, customer_name, delivery_address, total_amount, created_at, items, status')
      .eq('store_id', store.id)
      .not('status', 'in', `(${completedStatuses.join(',')})`)
      .order('created_at', { ascending: false });

    const activeOrders = activeOrdersRaw || [];
    const pendingOrdersList = activeOrders.slice(0, 20).map(o => {
      const items = o.items as Array<{ product_name: string }> | null;
      const productName = items && items.length > 0 ? items[0].product_name : 'Товар';
      return {
        id: o.kaspi_order_id,
        product: productName,
        amount: o.total_amount,
        date: o.created_at ? o.created_at.split('T')[0] : '',
        customer: o.delivery_address || o.customer_name || '',
      };
    });

    // === 5. Итоговые цифры ===
    const totalRevenue = dailyStats.reduce((sum, s) => sum + (s.revenue || 0), 0);
    const totalOrders = dailyStats.reduce((sum, s) => sum + (s.orders_count || 0), 0);
    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    return NextResponse.json({
      success: true,
      data: {
        totalOrders,
        totalRevenue,
        totalCost: 0,
        totalAdvertising: 0,
        totalTax: 0,
        totalCommissions: 0,
        totalDelivery: 0,
        totalProfit: 0,
        avgOrderValue,
        ordersBySource: {
          organic: totalOrders,
          ads: 0,
          offline: 0,
        },
        pendingOrders: {
          count: activeOrders.length,
          totalAmount: activeOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
          orders: pendingOrdersList,
        },
        dailyData,
        topProducts,
        ordersByStatus: {
          pending,
          processing,
          shipped,
          delivered,
          cancelled,
        },
        salesSources: {
          organic: totalOrders,
          advertising: 0,
        },
        deliveryModes: {
          intercity: 0,
          myDelivery: 0,
          expressDelivery: 0,
          pickup: 0,
        },
      }
    });

  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка сервера'
    }, { status: 500 });
  }
}
