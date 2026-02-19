import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const storeId = searchParams.get('storeId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    if (!userId) {
      return NextResponse.json({ success: false, message: 'userId обязателен' }, { status: 400 });
    }

    // Check admin
    const { data: adminUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (!(adminUser as any)?.is_admin) {
      return NextResponse.json({ success: false, message: 'Нет доступа' }, { status: 403 });
    }

    // If no storeId — return list of stores
    if (!storeId) {
      const { data: stores } = await supabase
        .from('stores')
        .select('id, name, kaspi_merchant_id, created_at, user_id')
        .order('created_at', { ascending: false });

      // Get user emails for each store
      const userIds = (stores || []).map(s => s.user_id).filter((id): id is string => !!id);
      const uniqueUserIds = [...new Set(userIds)];
      const { data: users } = await supabase
        .from('users')
        .select('id, email, name')
        .in('id', uniqueUserIds);

      const userMap = new Map((users || []).map(u => [u.id, u]));

      // Get revenue + order count for each store (completed orders)
      const storeIds = (stores || []).map(s => s.id);
      const { data: allOrders } = await supabase
        .from('orders')
        .select('store_id, total_amount, status')
        .in('store_id', storeIds)
        .eq('status', 'completed');

      const revenueMap = new Map<string, { revenue: number; orders: number }>();
      for (const order of (allOrders || [])) {
        const sid = order.store_id as string;
        const existing = revenueMap.get(sid);
        const amount = Number(order.total_amount) || 0;
        if (existing) {
          existing.revenue += amount;
          existing.orders += 1;
        } else {
          revenueMap.set(sid, { revenue: amount, orders: 1 });
        }
      }

      const storeList = (stores || []).map(s => {
        const user = s.user_id ? userMap.get(s.user_id) : null;
        const stats = revenueMap.get(s.id) || { revenue: 0, orders: 0 };
        return {
          id: s.id,
          name: s.name || 'Без названия',
          merchantId: s.kaspi_merchant_id,
          ownerEmail: (user as any)?.email || '',
          ownerName: (user as any)?.name || '',
          createdAt: s.created_at,
          totalRevenue: stats.revenue,
          totalOrders: stats.orders,
        };
      });

      // Sort by revenue descending by default
      storeList.sort((a, b) => b.totalRevenue - a.totalRevenue);

      return NextResponse.json({ success: true, stores: storeList });
    }

    // Fetch store details
    const { data: store } = await supabase
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .single();

    if (!store) {
      return NextResponse.json({ success: false, message: 'Магазин не найден' }, { status: 404 });
    }

    const commissionRate = (store.commission_rate ?? 12.5) as number;
    const taxRate = (store.tax_rate ?? 4.0) as number;

    // Load products for cost price
    const { data: productsDb } = await supabase
      .from('products')
      .select('kaspi_id, name, cost_price, price, product_group, quantity, kaspi_stock')
      .eq('store_id', storeId);

    const costPriceMap = new Map<string, number>();
    for (const p of (productsDb || [])) {
      if (p.kaspi_id && p.cost_price) {
        costPriceMap.set(p.kaspi_id, Number(p.cost_price));
      }
    }

    // Load completed orders
    let ordersQuery = supabase
      .from('orders')
      .select('total_amount, completed_at, created_at, status, delivery_cost, items')
      .eq('store_id', storeId)
      .eq('status', 'completed')
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: true });

    const { data: completedOrders } = await ordersQuery;

    // Parse date range
    const fromDate = dateFrom ? new Date(dateFrom) : null;
    const toDate = dateTo ? new Date(dateTo + 'T23:59:59') : null;

    // Aggregate daily data
    interface DayAgg {
      revenue: number;
      count: number;
      costPrice: number;
      commission: number;
      tax: number;
      delivery: number;
    }

    const dailyMap = new Map<string, DayAgg>();
    // Product aggregation
    const productAgg = new Map<string, {
      name: string;
      code: string;
      salesCount: number;
      totalAmount: number;
      costPrice: number;
    }>();

    let totalOrders = 0;

    for (const order of (completedOrders || [])) {
      if (!order.completed_at) continue;

      // Convert to KZ timezone (UTC+5)
      const utcMs = new Date(order.completed_at).getTime();
      const kzDate = new Date(utcMs + 5 * 3600000).toISOString().split('T')[0];
      const orderDate = new Date(kzDate);

      // Apply date filter
      if (fromDate && orderDate < fromDate) continue;
      if (toDate && orderDate > toDate) continue;

      totalOrders++;
      const amount = order.total_amount || 0;
      const orderCommission = amount * (commissionRate / 100);
      const orderTax = amount * (taxRate / 100);
      const orderDelivery = Number(order.delivery_cost) || 0;

      let orderCost = 0;
      const items = order.items as Array<{ product_code: string; product_name: string; quantity: number; price: number; total: number }> | null;
      if (items) {
        for (const item of items) {
          const cp = costPriceMap.get(item.product_code);
          if (cp) orderCost += cp * (item.quantity || 1);

          // Product aggregation
          const code = item.product_code || item.product_name;
          const existing = productAgg.get(code);
          const itemCost = (cp || 0) * (item.quantity || 1);
          if (existing) {
            existing.salesCount += item.quantity || 1;
            existing.totalAmount += item.total || 0;
            existing.costPrice += itemCost;
          } else {
            productAgg.set(code, {
              name: item.product_name,
              code,
              salesCount: item.quantity || 1,
              totalAmount: item.total || 0,
              costPrice: itemCost,
            });
          }
        }
      }

      const existing = dailyMap.get(kzDate);
      if (existing) {
        existing.revenue += amount;
        existing.count += 1;
        existing.costPrice += orderCost;
        existing.commission += orderCommission;
        existing.tax += orderTax;
        existing.delivery += orderDelivery;
      } else {
        dailyMap.set(kzDate, {
          revenue: amount,
          count: 1,
          costPrice: orderCost,
          commission: orderCommission,
          tax: orderTax,
          delivery: orderDelivery,
        });
      }
    }

    // Convert daily map to sorted array
    const dailyData = [...dailyMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, agg]) => ({
        date,
        salesCount: agg.count,
        totalAmount: agg.revenue,
        costPrice: agg.costPrice,
        commission: agg.commission,
        tax: agg.tax,
        delivery: agg.delivery,
        profit: agg.revenue - agg.costPrice - agg.commission - agg.tax - agg.delivery,
      }));

    // Totals
    const totalRevenue = dailyData.reduce((s, d) => s + d.totalAmount, 0);
    const totalCost = dailyData.reduce((s, d) => s + d.costPrice, 0);
    const totalCommission = dailyData.reduce((s, d) => s + d.commission, 0);
    const totalTax = dailyData.reduce((s, d) => s + d.tax, 0);
    const totalDelivery = dailyData.reduce((s, d) => s + d.delivery, 0);
    const totalProfit = totalRevenue - totalCost - totalCommission - totalTax - totalDelivery;
    const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // Product stats sorted by revenue
    const productStats = [...productAgg.values()]
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .map((p, idx) => ({
        id: idx + 1,
        code: p.code,
        name: p.name,
        salesCount: p.salesCount,
        totalAmount: p.totalAmount,
        avgPrice: p.salesCount > 0 ? Math.round(p.totalAmount / p.salesCount) : 0,
        costPrice: p.costPrice,
        profit: p.totalAmount - p.costPrice - (p.totalAmount * commissionRate / 100) - (p.totalAmount * taxRate / 100),
      }));

    // Store info
    const { data: ownerUser } = store.user_id
      ? await supabase
          .from('users')
          .select('email, name')
          .eq('id', store.user_id)
          .single()
      : { data: null };

    return NextResponse.json({
      success: true,
      store: {
        id: store.id,
        name: store.name,
        merchantId: store.kaspi_merchant_id,
        ownerEmail: (ownerUser as any)?.email || '',
        ownerName: (ownerUser as any)?.name || '',
        commissionRate,
        taxRate,
        productsCount: (productsDb || []).length,
        lastSyncedAt: store.last_synced_at,
      },
      totals: {
        totalOrders,
        totalRevenue,
        totalCost,
        totalCommission,
        totalTax,
        totalDelivery,
        totalProfit,
        avgOrder,
        margin,
      },
      dailyData,
      productStats,
    });
  } catch (error) {
    console.error('Admin store analytics error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка сервера',
    }, { status: 500 });
  }
}
