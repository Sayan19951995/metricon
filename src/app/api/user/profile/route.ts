import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAuth } from '@/lib/api-auth';

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
