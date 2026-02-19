import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

/**
 * GET /api/team?userId=xxx — получить участников команды
 */
export async function GET(request: NextRequest) {
  try {
    const userId = new URL(request.url).searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ success: false, message: 'userId обязателен' }, { status: 400 });
    }

    // Находим store владельца
    const { data: store } = await supabase
      .from('stores')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!store) {
      return NextResponse.json({ success: false, message: 'Магазин не найден' }, { status: 404 });
    }

    const { data: members, error } = await supabase
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
    const body = await request.json();
    const { userId, email, name, role } = body;

    if (!userId || !email || !role) {
      return NextResponse.json({
        success: false,
        message: 'userId, email и role обязательны',
      }, { status: 400 });
    }

    const validRoles = ['admin', 'manager', 'warehouse', 'viewer'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({
        success: false,
        message: `Роль должна быть одна из: ${validRoles.join(', ')}`,
      }, { status: 400 });
    }

    const { data: store } = await supabase
      .from('stores')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!store) {
      return NextResponse.json({ success: false, message: 'Магазин не найден' }, { status: 404 });
    }

    const { data: member, error } = await (supabase
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
    const body = await request.json();
    const { userId, memberId, role } = body;

    if (!userId || !memberId || !role) {
      return NextResponse.json({
        success: false,
        message: 'userId, memberId и role обязательны',
      }, { status: 400 });
    }

    // Проверяем что userId — владелец store, которому принадлежит member
    const { data: store } = await supabase
      .from('stores')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!store) {
      return NextResponse.json({ success: false, message: 'Нет прав' }, { status: 403 });
    }

    const { error } = await supabase
      .from('team_members' as any)
      .update({ role })
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
 * DELETE /api/team?userId=xxx&memberId=yyy — удалить участника
 */
export async function DELETE(request: NextRequest) {
  try {
    const params = new URL(request.url).searchParams;
    const userId = params.get('userId');
    const memberId = params.get('memberId');

    if (!userId || !memberId) {
      return NextResponse.json({
        success: false,
        message: 'userId и memberId обязательны',
      }, { status: 400 });
    }

    const { data: store } = await supabase
      .from('stores')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!store) {
      return NextResponse.json({ success: false, message: 'Нет прав' }, { status: 403 });
    }

    const { error } = await supabase
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
