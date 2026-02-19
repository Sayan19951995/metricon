import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

/**
 * POST /api/orders/confirm — подтвердить заказ
 * Body: { orderId, userId, userName }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, userId, userName } = body;

    if (!orderId || !userId) {
      return NextResponse.json({
        success: false,
        message: 'orderId и userId обязательны',
      }, { status: 400 });
    }

    const { error } = await supabase
      .from('orders')
      .update({
        confirmed_at: new Date().toISOString(),
        confirmed_by: userName || userId,
      } as any)
      .eq('id', orderId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Order confirm error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка подтверждения',
    }, { status: 500 });
  }
}

/**
 * DELETE /api/orders/confirm?orderId=xxx&userId=yyy — отменить подтверждение
 */
export async function DELETE(request: NextRequest) {
  try {
    const params = new URL(request.url).searchParams;
    const orderId = params.get('orderId');
    const userId = params.get('userId');

    if (!orderId || !userId) {
      return NextResponse.json({
        success: false,
        message: 'orderId и userId обязательны',
      }, { status: 400 });
    }

    const { error } = await supabase
      .from('orders')
      .update({
        confirmed_at: null,
        confirmed_by: null,
      } as any)
      .eq('id', orderId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Order unconfirm error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка',
    }, { status: 500 });
  }
}
