import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAuth } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ('error' in auth) return auth.error;
    const userId = auth.user.id;

    const body = await request.json();
    const { storeId: bodyStoreId, source, date, comment, items, totalAmount } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'items обязательны',
      }, { status: 400 });
    }

    let storeId = bodyStoreId;

    if (!storeId) {
      // Try owner's store
      const storeResult = await supabaseAdmin
        .from('stores')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (storeResult.data) {
        storeId = storeResult.data.id;
      } else {
        // Fallback: team member
        const { data: membership } = await (supabaseAdmin as any)
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
    const userResult = await supabaseAdmin
      .from('users')
      .select('name')
      .eq('id', userId)
      .single();
    const userName = userResult.data?.name || userId;

    // Generate a unique order ID for manual orders
    const manualId = `M-${Date.now()}`;

    // Treat date as Kazakhstan time (UTC+5)
    let orderDate: string;
    if (date && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(date)) {
      // datetime-local: "2026-03-06T14:30"
      orderDate = `${date}:00+05:00`;
    } else if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      // date only: "2026-03-06"
      orderDate = `${date}T12:00:00+05:00`;
    } else {
      orderDate = date || new Date().toISOString();
    }

    const { error } = await supabaseAdmin
      .from('orders')
      .insert({
        store_id: storeId,
        kaspi_order_id: manualId,
        status: 'completed',
        total_amount: totalAmount,
        items,
        customer_name: 'Ручной заказ',
        created_at: orderDate,
        completed_at: orderDate,
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
      await supabaseAdmin.from('products').insert(
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

/**
 * DELETE /api/orders/manual?orderId=xxx — удалить офлайн заказ (только owner)
 */
export async function DELETE(request: NextRequest) {
  try {
    const authDel = await requireAuth(request);
    if ('error' in authDel) return authDel.error;
    const userId = authDel.user.id;

    const params = new URL(request.url).searchParams;
    const orderId = params.get('orderId');

    if (!orderId) {
      return NextResponse.json({ success: false, message: 'orderId обязателен' }, { status: 400 });
    }

    // Verify user is the store owner
    const storeResult = await supabaseAdmin.from('stores').select('id').eq('user_id', userId).single();
    if (!storeResult.data) {
      return NextResponse.json({ success: false, message: 'Нет прав для удаления' }, { status: 403 });
    }
    const storeId = storeResult.data.id;

    // Fetch the order — ensure it belongs to this store and is a manual order
    const { data: order, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('id, kaspi_order_id')
      .eq('id', orderId)
      .eq('store_id', storeId)
      .single();

    if (fetchError || !order) {
      return NextResponse.json({ success: false, message: 'Заказ не найден' }, { status: 404 });
    }

    if (!order.kaspi_order_id?.startsWith('M-')) {
      return NextResponse.json({ success: false, message: 'Можно удалять только офлайн заказы' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from('orders').delete().eq('id', orderId);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Manual order delete error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка удаления заказа',
    }, { status: 500 });
  }
}
