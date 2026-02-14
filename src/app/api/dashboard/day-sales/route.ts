import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

/**
 * GET /api/dashboard/day-sales?userId=...&date=YYYY-MM-DD
 * Возвращает проданные товары за конкретный день
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const date = searchParams.get('date'); // YYYY-MM-DD

    if (!userId || !date) {
      return NextResponse.json({ success: false, message: 'userId и date обязательны' }, { status: 400 });
    }

    const storeResult = await supabase
      .from('stores')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!storeResult.data) {
      return NextResponse.json({ success: false, message: 'Магазин не найден' }, { status: 404 });
    }

    const storeId = storeResult.data.id;

    // UTC+5 Алматы
    const dayStart = new Date(date + 'T00:00:00+05:00');
    const dayEnd = new Date(date + 'T23:59:59.999+05:00');

    const { data: orders } = await supabase
      .from('orders')
      .select('items, total_amount')
      .eq('store_id', storeId)
      .gte('created_at', dayStart.toISOString())
      .lte('created_at', dayEnd.toISOString())
      .not('status', 'in', '(cancelled,returned)');

    const soldMap = new Map<string, { name: string; quantity: number; revenue: number }>();
    for (const order of (orders || [])) {
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
          const existing = soldMap.get(key);
          if (existing) {
            existing.quantity += item.quantity;
            existing.revenue += item.total;
          } else {
            soldMap.set(key, {
              name: item.product_name,
              quantity: item.quantity,
              revenue: item.total,
            });
          }
        }
      }
    }

    const products = Array.from(soldMap.values()).sort((a, b) => b.revenue - a.revenue);

    return NextResponse.json({ success: true, data: products });
  } catch (error) {
    console.error('Day sales error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка'
    }, { status: 500 });
  }
}
