import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAuth } from '@/lib/api-auth';

/**
 * GET /api/team — получить участников команды
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ('error' in auth) return auth.error;
    const userId = auth.user.id;

    // Находим store владельца
    const { data: store } = await supabaseAdmin
      .from('stores')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!store) {
      return NextResponse.json({ success: false, message: 'Магазин не найден' }, { status: 404 });
    }

    const { data: members, error } = await supabaseAdmin
      .from('team_members' as any)
      .select('*')
      .eq('store_id', store.id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, data: members || [] });
  } catch (error) {
    console.error('Team GET error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка сервера',
    }, { status: 500 });
  }
}

/**
 * POST /api/team — пригласить участника
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ('error' in auth) return auth.error;
    const userId = auth.user.id;

    const body = await request.json();
    const { email, name, role } = body;

    if (!email || !role) {
      return NextResponse.json({
        success: false,
        message: 'email и role обязательны',
      }, { status: 400 });
    }

    const validRoles = ['admin', 'manager', 'warehouse', 'viewer'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({
        success: false,
        message: `Роль должна быть одна из: ${validRoles.join(', ')}`,
      }, { status: 400 });
    }

    const { data: store } = await supabaseAdmin
      .from('stores')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!store) {
      return NextResponse.json({ success: false, message: 'Магазин не найден' }, { status: 404 });
    }

    const { data: member, error } = await (supabaseAdmin
      .from('team_members' as any)
      .insert({
        store_id: store.id,
        email: email.toLowerCase().trim(),
        name: name || email.split('@')[0],
        role,
        status: 'pending',
        invited_by: userId,
      }) as any)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({
          success: false,
          message: 'Этот email уже приглашён',
        }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ success: true, data: member });
  } catch (error) {
    console.error('Team POST error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка сервера',
    }, { status: 500 });
  }
}

/**
 * PATCH /api/team — изменить роль участника
 */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ('error' in auth) return auth.error;
    const userId = auth.user.id;

    const body = await request.json();
    const { memberId, role, commission_offline, commission_kaspi, salary_fixed } = body;

    if (!memberId) {
      return NextResponse.json({
        success: false,
        message: 'memberId обязателен',
      }, { status: 400 });
    }

    // Проверяем что userId — владелец store, которому принадлежит member
    const { data: store } = await supabaseAdmin
      .from('stores')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!store) {
      return NextResponse.json({ success: false, message: 'Нет прав' }, { status: 403 });
    }

    const updateData: Record<string, any> = {};
    if (role !== undefined) updateData.role = role;
    if (commission_offline !== undefined) updateData.commission_offline = commission_offline;
    if (commission_kaspi !== undefined) updateData.commission_kaspi = commission_kaspi;
    if (salary_fixed !== undefined) updateData.salary_fixed = salary_fixed;

    const { error } = await supabaseAdmin
      .from('team_members' as any)
      .update(updateData)
      .eq('id', memberId)
      .eq('store_id', store.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Team PATCH error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка сервера',
    }, { status: 500 });
  }
}

/**
 * DELETE /api/team?memberId=yyy — удалить участника
 */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ('error' in auth) return auth.error;
    const userId = auth.user.id;

    const params = new URL(request.url).searchParams;
    const memberId = params.get('memberId');

    if (!memberId) {
      return NextResponse.json({
        success: false,
        message: 'memberId обязателен',
      }, { status: 400 });
    }

    const { data: store } = await supabaseAdmin
      .from('stores')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!store) {
      return NextResponse.json({ success: false, message: 'Нет прав' }, { status: 403 });
    }

    const { error } = await supabaseAdmin
      .from('team_members' as any)
      .delete()
      .eq('id', memberId)
      .eq('store_id', store.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Team DELETE error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка сервера',
    }, { status: 500 });
  }
}
