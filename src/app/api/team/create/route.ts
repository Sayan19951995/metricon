import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';

// Серверный клиент с правами администратора
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * POST /api/team/create
 * Создать аккаунт для члена команды (владелец задаёт email + пароль)
 * Body: { ownerUserId, name, email, password, role }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ownerUserId, name, email, password, role } = body;

    if (!ownerUserId || !name || !email || !password || !role) {
      return NextResponse.json({
        success: false,
        message: 'ownerUserId, name, email, password и role обязательны',
      }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({
        success: false,
        message: 'Пароль должен быть не менее 6 символов',
      }, { status: 400 });
    }

    const validRoles = ['admin', 'manager', 'warehouse', 'viewer'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({
        success: false,
        message: `Роль должна быть одна из: ${validRoles.join(', ')}`,
      }, { status: 400 });
    }

    // Находим магазин владельца
    const { data: store } = await supabase
      .from('stores')
      .select('id')
      .eq('user_id', ownerUserId)
      .single();

    if (!store) {
      return NextResponse.json({
        success: false,
        message: 'Магазин не найден',
      }, { status: 404 });
    }

    // Создаём пользователя в Supabase Auth (без подтверждения email)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (authError) {
      if (authError.message.includes('already been registered') || authError.message.includes('already exists')) {
        return NextResponse.json({
          success: false,
          message: 'Пользователь с таким email уже существует',
        }, { status: 409 });
      }
      throw authError;
    }

    const newUserId = authData.user.id;

    // Создаём запись в таблице users
    await supabaseAdmin.from('users').insert({
      id: newUserId,
      email: email.toLowerCase().trim(),
      name,
    });

    // Добавляем в team_members
    const { data: member, error: memberError } = await (supabaseAdmin
      .from('team_members' as any)
      .insert({
        store_id: store.id,
        user_id: newUserId,
        email: email.toLowerCase().trim(),
        name,
        role,
        status: 'active',
        invited_by: ownerUserId,
        accepted_at: new Date().toISOString(),
      }) as any)
      .select()
      .single();

    if (memberError) {
      // Откатываем: удаляем созданного пользователя
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      throw memberError;
    }

    return NextResponse.json({ success: true, data: member });
  } catch (error) {
    console.error('Team create error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка создания аккаунта',
    }, { status: 500 });
  }
}
