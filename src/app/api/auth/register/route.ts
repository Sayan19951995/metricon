import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/api-auth';
import { emailService } from '@/lib/email/mailer';

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
      email_confirm: false,
      user_metadata: { name },
    });

    if (authError) {
      const msg = authError.message || '';
      if (msg.includes('already been registered') || msg.includes('already exists')) {
        return NextResponse.json(
          { success: false, error: 'Этот email уже зарегистрирован' },
          { status: 409 }
        );
      }
      if (msg.includes('Database error')) {
        // Orphaned record in users table — clean up and retry
        await supabaseAdmin.from('users').delete().eq('email', email);
        // Retry createUser
        const retry = await supabaseAdmin.auth.admin.createUser({
          email, password, email_confirm: false, user_metadata: { name },
        });
        if (retry.error) {
          console.error('Retry createUser failed:', retry.error);
          return NextResponse.json(
            { success: false, error: 'Ошибка создания аккаунта. Попробуйте ещё раз.' },
            { status: 500 }
          );
        }
        // Use retry data
        (authData as any).user = retry.data.user;
      } else {
        throw authError;
      }
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

    // 3. Send confirmation email via our SMTP
    const host = req.headers.get('host') || '';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const origin = req.headers.get('origin') || `${protocol}://${host}`;

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email,
      password,
      options: {
        redirectTo: `${origin}/auth/verify-email`,
      },
    });

    if (linkError) {
      console.error('generateLink error:', linkError);
    } else if (linkData?.properties?.hashed_token) {
      const confirmLink = `${origin}/auth/verify-email?token_hash=${linkData.properties.hashed_token}&type=signup`;
      const sent = await emailService.sendEmailConfirmation(email, confirmLink);
      if (!sent) {
        console.error('Failed to send confirmation email to:', email, '| SMTP_USER:', process.env.SMTP_USER || 'NOT SET');
      }
    } else {
      console.error('generateLink returned no hashed_token:', linkData);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Registration error:', err);
    return NextResponse.json(
      { success: false, error: 'Ошибка при регистрации. Попробуйте ещё раз.' },
      { status: 500 }
    );
  }
}
