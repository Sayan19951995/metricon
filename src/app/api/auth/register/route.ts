import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/api-auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name, phone, utm } = body as {
      email: string;
      password: string;
      name: string;
      phone?: string;
      utm?: { utm_source?: string; utm_medium?: string; utm_campaign?: string };
    };

    if (!email || !password || !name) {
      return NextResponse.json(
        { success: false, error: 'Заполните все обязательные поля' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Пароль должен быть не менее 6 символов' },
        { status: 400 }
      );
    }

    // 1. Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (authError) {
      // Duplicate email
      if (authError.message?.includes('already been registered') || authError.message?.includes('already exists')) {
        return NextResponse.json(
          { success: false, error: 'Этот email уже зарегистрирован' },
          { status: 409 }
        );
      }
      throw authError;
    }

    if (!authData.user) {
      throw new Error('Failed to create user');
    }

    const userId = authData.user.id;

    // 2. Upsert into users table (триггер может создать запись автоматически)
    const { error: userError } = await supabaseAdmin.from('users').upsert({
      id: userId,
      email,
      name,
      ...(phone ? { phone } : {}),
      ...(utm || {}),
    } as any, { onConflict: 'id' });

    if (userError) {
      // Cleanup: delete auth user if profile insert fails
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw userError;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Registration error:', err);
    const message = err?.message || err?.msg || (typeof err === 'string' ? err : JSON.stringify(err)) || 'Неизвестная ошибка';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
