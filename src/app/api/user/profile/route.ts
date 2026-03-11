import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAuth } from '@/lib/api-auth';

/**
 * GET /api/user/profile
 * Returns user + store + subscription for the authenticated (or impersonated) user.
 * Uses supabaseAdmin (service role) — bypasses RLS, supports impersonation.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ('error' in auth) return auth.error;
    const userId = auth.user.id;

    const [userResult, storeResult, subResult] = await Promise.all([
      supabaseAdmin.from('users').select('*').eq('id', userId).single(),
      supabaseAdmin.from('stores').select('*').eq('user_id', userId).single(),
      supabaseAdmin.from('subscriptions').select('*').eq('user_id', userId).single(),
    ]);

    // Also check team membership if no owned store
    let store = storeResult.data || null;
    let role = 'owner';
    if (!store) {
      const { data: membership } = await supabaseAdmin
        .from('team_members' as any)
        .select('store_id, role')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();
      if (membership) {
        const { data: teamStore } = await supabaseAdmin
          .from('stores')
          .select('*')
          .eq('id', (membership as any).store_id)
          .single();
        store = teamStore || null;
        role = (membership as any).role || 'viewer';
      }
    }

    return NextResponse.json({
      success: true,
      user: userResult.data || null,
      store,
      subscription: subResult.data || null,
      role,
    });
  } catch (err) {
    console.error('Profile GET error:', err);
    return NextResponse.json({ success: false, error: 'Внутренняя ошибка' }, { status: 500 });
  }
}

/**
 * PATCH /api/user/profile
 * Update user profile (name, phone)
 */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ('error' in auth) return auth.error;

    const { name, phone } = await request.json();

    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, error: 'Нет данных для обновления' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', auth.user.id);

    if (error) {
      console.error('Profile update error:', error);
      return NextResponse.json({ success: false, error: 'Ошибка сохранения' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Profile API error:', err);
    return NextResponse.json({ success: false, error: 'Внутренняя ошибка' }, { status: 500 });
  }
}
