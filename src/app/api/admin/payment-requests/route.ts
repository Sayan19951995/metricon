import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAuth } from '@/lib/api-auth';

async function requireAdmin(request: NextRequest) {
  const auth = await requireAuth(request);
  if ('error' in auth) return auth;
  const { data } = await supabaseAdmin.from('users').select('is_admin').eq('id', auth.user.id).single();
  if (!(data as any)?.is_admin) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return auth;
}

/** GET /api/admin/payment-requests */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('error' in auth) return auth.error;

  const url = new URL(request.url);
  const status = url.searchParams.get('status') || 'pending';

  const query = supabaseAdmin
    .from('payment_requests' as any)
    .select('*')
    .order('created_at', { ascending: false });

  if (status !== 'all') {
    query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, data: data || [] });
}

/** PATCH /api/admin/payment-requests — confirm or reject */
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('error' in auth) return auth.error;

  const { id, action, days } = await request.json();
  if (!id || !action) {
    return NextResponse.json({ success: false, message: 'id и action обязательны' }, { status: 400 });
  }

  // Get request
  const { data: req } = await supabaseAdmin
    .from('payment_requests' as any)
    .select('*')
    .eq('id', id)
    .single();

  if (!req) return NextResponse.json({ success: false, message: 'Заявка не найдена' }, { status: 404 });

  if (action === 'confirm') {
    const durationDays = days || 30;
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + durationDays);

    // Upsert subscription
    const { data: existing } = await supabaseAdmin
      .from('subscriptions')
      .select('id')
      .eq('user_id', (req as any).user_id)
      .single();

    if (existing) {
      await supabaseAdmin
        .from('subscriptions')
        .update({
          plan: (req as any).plan_id,
          status: 'active',
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        })
        .eq('user_id', (req as any).user_id);
    } else {
      await supabaseAdmin
        .from('subscriptions')
        .insert({
          user_id: (req as any).user_id,
          plan: (req as any).plan_id,
          status: 'active',
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          auto_renew: false,
        });
    }

    // Mark request as confirmed
    await supabaseAdmin
      .from('payment_requests' as any)
      .update({ status: 'confirmed', updated_at: new Date().toISOString() })
      .eq('id', id);

  } else if (action === 'reject') {
    await supabaseAdmin
      .from('payment_requests' as any)
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', id);
  } else {
    return NextResponse.json({ success: false, message: 'Неизвестное действие' }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
