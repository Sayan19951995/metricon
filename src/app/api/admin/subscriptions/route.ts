import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAuth } from '@/lib/api-auth';

async function checkAdmin(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin.from('users').select('*').eq('id', userId).single();
  return !!(data as any)?.is_admin;
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) return authResult.error;
    const userId = authResult.user.id;

    if (!(await checkAdmin(userId))) {
      return NextResponse.json({ success: false, message: 'Нет доступа' }, { status: 403 });
    }

    // Get subscriptions with user info
    const { data: subscriptions, error } = await supabaseAdmin
      .from('subscriptions')
      .select('id, user_id, plan, status, start_date, end_date, auto_renew')
      .order('start_date', { ascending: false });

    if (error) throw error;

    // Get user names
    const userIds = [...new Set((subscriptions || []).map(s => (s as any).user_id))];
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, name, email')
      .in('id', userIds);

    const userMap = new Map<string, { name: string; email: string }>();
    for (const u of (users || [])) {
      userMap.set(u.id, { name: u.name, email: u.email });
    }

    const enriched = (subscriptions || []).map(s => {
      const user = userMap.get((s as any).user_id);
      return {
        id: s.id,
        userId: (s as any).user_id,
        userName: user?.name || 'Неизвестный',
        userEmail: user?.email || '',
        plan: s.plan,
        status: s.status,
        startDate: s.start_date,
        endDate: s.end_date,
        autoRenew: s.auto_renew,
      };
    });

    return NextResponse.json({ success: true, data: enriched });
  } catch (error) {
    console.error('Admin subscriptions error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка сервера',
    }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/subscriptions — extend, cancel, changePlan
 */
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) return authResult.error;
    const adminUserId = authResult.user.id;

    const body = await request.json();
    const { subscriptionId, action, value } = body;

    if (!subscriptionId || !action) {
      return NextResponse.json({ success: false, message: 'Не все параметры указаны' }, { status: 400 });
    }

    if (!(await checkAdmin(adminUserId))) {
      return NextResponse.json({ success: false, message: 'Нет доступа' }, { status: 403 });
    }

    switch (action) {
      case 'extend': {
        // value = number of days to add
        const days = Number(value) || 30;
        const { data: sub } = await supabaseAdmin
          .from('subscriptions')
          .select('end_date, status')
          .eq('id', subscriptionId)
          .single();

        if (!sub) {
          return NextResponse.json({ success: false, message: 'Подписка не найдена' }, { status: 404 });
        }

        // Extend from current end_date or from now if expired
        const baseDate = sub.end_date && new Date(sub.end_date) > new Date()
          ? new Date(sub.end_date)
          : new Date();
        baseDate.setDate(baseDate.getDate() + days);

        const { error } = await supabaseAdmin
          .from('subscriptions')
          .update({ end_date: baseDate.toISOString(), status: 'active' })
          .eq('id', subscriptionId);
        if (error) throw error;
        break;
      }
      case 'cancel': {
        const { error } = await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'cancelled' })
          .eq('id', subscriptionId);
        if (error) throw error;
        break;
      }
      case 'changePlan': {
        const { error } = await supabaseAdmin
          .from('subscriptions')
          .update({ plan: value })
          .eq('id', subscriptionId);
        if (error) throw error;
        break;
      }
      default:
        return NextResponse.json({ success: false, message: `Неизвестное действие: ${action}` }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin subscriptions PATCH error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка сервера',
    }, { status: 500 });
  }
}

/**
 * POST /api/admin/subscriptions — create new subscription
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) return authResult.error;
    const adminUserId = authResult.user.id;

    const body = await request.json();
    const { targetUserId, plan, durationDays } = body;

    if (!targetUserId || !plan) {
      return NextResponse.json({ success: false, message: 'Не все параметры указаны' }, { status: 400 });
    }

    if (!(await checkAdmin(adminUserId))) {
      return NextResponse.json({ success: false, message: 'Нет доступа' }, { status: 403 });
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + (durationDays || 30));

    // Check if already exists
    const { data: existing } = await supabaseAdmin
      .from('subscriptions')
      .select('id')
      .eq('user_id', targetUserId)
      .single();

    if (existing) {
      const { error } = await supabaseAdmin
        .from('subscriptions')
        .update({
          plan,
          status: 'active',
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        })
        .eq('user_id', targetUserId);
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin
        .from('subscriptions')
        .insert({
          user_id: targetUserId,
          plan,
          status: 'active',
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          auto_renew: false,
        });
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin subscriptions POST error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка сервера',
    }, { status: 500 });
  }
}
