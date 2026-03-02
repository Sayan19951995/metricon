import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAuth } from '@/lib/api-auth';

/**
 * POST /api/orders/confirm — подтвердить заказ
 * Body: { orderId, userName }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ('error' in auth) return auth.error;
    const userId = auth.user.id;

    const body = await request.json();
    const { orderId, userName, saleSource, saleComment } = body;

    if (!orderId) {
      return NextResponse.json({
        success: false,
        message: 'orderId обязателен',
      }, { status: 400 });
    }

    if (!saleSource) {
      return NextResponse.json({
        success: false,
        message: 'Укажите канал продажи',
      }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('orders')
      .update({
        confirmed_at: new Date().toISOString(),
        confirmed_by: userName || userId,
        sale_source: saleSource,
        sale_comment: saleComment || null,
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
 * DELETE /api/orders/confirm?orderId=xxx — отменить подтверждение
 */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ('error' in auth) return auth.error;

    const params = new URL(request.url).searchParams;
    const orderId = params.get('orderId');

    if (!orderId) {
      return NextResponse.json({
        success: false,
        message: 'orderId обязателен',
      }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('orders')
      .update({
        confirmed_at: null,
        confirmed_by: null,
        sale_source: null,
        sale_comment: null,
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
