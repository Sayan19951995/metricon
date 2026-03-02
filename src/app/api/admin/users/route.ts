import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAuth } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) return authResult.error;
    const userId = authResult.user.id;

    // Check admin
    const { data: adminUser } = await supabaseAdmin.from('users').select('*').eq('id', userId).single();
    if (!(adminUser as any)?.is_admin) {
      return NextResponse.json({ success: false, message: 'Нет доступа' }, { status: 403 });
    }

    // Get all users with their stores and subscriptions
    const { data: usersRaw, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    const users = (usersRaw || []) as any[];

    // Get stores and subscriptions in parallel
    const [storesResult, subsResult] = await Promise.all([
      supabaseAdmin.from('stores').select('id, user_id, name, kaspi_merchant_id'),
      supabaseAdmin.from('subscriptions').select('id, user_id, plan, status, start_date, end_date, auto_renew'),
    ]);

    const storesByUser = new Map<string, any>();
    for (const s of (storesResult.data || [])) {
      storesByUser.set((s as any).user_id, s);
    }

    const subsByUser = new Map<string, any>();
    for (const s of (subsResult.data || [])) {
      subsByUser.set((s as any).user_id, s);
    }

    const enrichedUsers = users.map((u: any) => {
      const store = storesByUser.get(u.id);
      const sub = subsByUser.get(u.id);
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        createdAt: u.created_at,
        isAdmin: u.is_admin || false,
        isBlocked: u.is_blocked || false,
        storeName: store?.name || null,
        kaspiConnected: !!store?.kaspi_merchant_id,
        plan: sub?.plan || null,
        subscriptionStatus: sub?.status || null,
        subscriptionEnd: sub?.end_date || null,
        utmSource: u.utm_source || null,
        utmMedium: u.utm_medium || null,
        utmCampaign: u.utm_campaign || null,
      };
    });

    return NextResponse.json({ success: true, data: enrichedUsers });
  } catch (error) {
    console.error('Admin users error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка сервера',
    }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/users — update user (block/unblock, change plan, make admin, create subscription)
 */
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) return authResult.error;
    const adminUserId = authResult.user.id;

    const body = await request.json();
    const { targetUserId, action, value } = body;

    if (!targetUserId || !action) {
      return NextResponse.json({ success: false, message: 'Не все параметры указаны' }, { status: 400 });
    }

    // Check admin
    const { data: adminUser } = await supabaseAdmin.from('users').select('*').eq('id', adminUserId).single();
    if (!(adminUser as any)?.is_admin) {
      return NextResponse.json({ success: false, message: 'Нет доступа' }, { status: 403 });
    }

    switch (action) {
      case 'toggleAdmin': {
        const { error } = await supabaseAdmin
          .from('users')
          .update({ is_admin: value } as any)
          .eq('id', targetUserId);
        if (error) throw error;
        break;
      }
      case 'changePlan': {
        const { error } = await supabaseAdmin
          .from('subscriptions')
          .update({ plan: value })
          .eq('user_id', targetUserId);
        if (error) throw error;
        break;
      }
      case 'blockUser': {
        const { error } = await supabaseAdmin
          .from('users')
          .update({ is_blocked: value } as any)
          .eq('id', targetUserId);
        if (error) throw error;
        break;
      }
      case 'createSubscription': {
        // value = { plan: string, durationDays: number }
        const { plan, durationDays } = value;
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + (durationDays || 30));

        // Check if subscription already exists
        const { data: existingSub } = await supabaseAdmin
          .from('subscriptions')
          .select('id')
          .eq('user_id', targetUserId)
          .single();

        if (existingSub) {
          // Update existing
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
          // Create new
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
        break;
      }
      default:
        return NextResponse.json({ success: false, message: `Неизвестное действие: ${action}` }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin users PATCH error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка сервера',
    }, { status: 500 });
  }
}
