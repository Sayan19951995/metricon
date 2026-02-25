import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, storeId: bodyStoreId, source, date, comment, items, totalAmount } = body;

    if (!userId || !items || items.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'userId и items обязательны',
      }, { status: 400 });
    }

    let storeId = bodyStoreId;

    if (!storeId) {
      // Try owner's store
      const storeResult = await supabase
        .from('stores')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (storeResult.data) {
        storeId = storeResult.data.id;
      } else {
        // Fallback: team member
        const { data: membership } = await (supabase as any)
          .from('team_members')
          .select('store_id')
          .eq('user_id', userId)
          .eq('status', 'active')
          .single();
        if (membership) storeId = membership.store_id;
      }
    }

    if (!storeId) {
      return NextResponse.json({ success: false, message: 'Магазин не найден' }, { status: 400 });
    }

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

    // Create product records for custom items (product_code starts with 'custom_')
    // This allows analytics to find cost prices via costPriceMap
    const customItems = (items as any[]).filter((it: any) => it.product_code?.startsWith('custom_'));
    if (customItems.length > 0) {
      await supabase.from('products').insert(
        customItems.map((it: any) => ({
          store_id: storeId,
          kaspi_id: it.product_code,
          name: it.product_name,
          price: it.price,
          cost_price: it.cost_price ?? null,
          active: true,
        }))
      );
    }

    return NextResponse.json({ success: true, orderId: manualId });
  } catch (error) {
    console.error('Manual order error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка создания заказа',
    }, { status: 500 });
  }
}
