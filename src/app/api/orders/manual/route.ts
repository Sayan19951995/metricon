import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, source, date, comment, items, totalAmount } = body;

    if (!userId || !items || items.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'userId и items обязательны',
      }, { status: 400 });
    }

    const storeResult = await supabase
      .from('stores')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!storeResult.data) {
      return NextResponse.json({ success: false, message: 'Магазин не найден' }, { status: 400 });
    }

    const storeId = storeResult.data.id;

    // Get user name for confirmed_by
    const userResult = await supabase
      .from('users')
      .select('name')
      .eq('id', userId)
      .single();
    const userName = userResult.data?.name || userId;

    // Generate a unique order ID for manual orders
    const manualId = `M-${Date.now()}`;

    const { error } = await supabase
      .from('orders')
      .insert({
        store_id: storeId,
        kaspi_order_id: manualId,
        status: 'completed',
        total_amount: totalAmount,
        items,
        customer_name: 'Ручной заказ',
        created_at: date || new Date().toISOString(),
        completed_at: date || new Date().toISOString(),
        confirmed_at: new Date().toISOString(),
        confirmed_by: userName,
        sale_source: source,
        sale_comment: comment || null,
      } as any);

    if (error) throw error;

    return NextResponse.json({ success: true, orderId: manualId });
  } catch (error) {
    console.error('Manual order error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка создания заказа',
    }, { status: 500 });
  }
}
