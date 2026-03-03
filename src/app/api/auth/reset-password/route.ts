import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/api-auth';
import { emailService } from '@/lib/email/mailer';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email обязателен' },
        { status: 400 }
      );
    }

    // Определяем base URL (production или localhost)
    const origin = request.headers.get('origin') || request.nextUrl.origin;

    // Генерируем ссылку сброса через Supabase Admin API
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: `${origin}/reset-password`,
      },
    });

    if (error) {
      console.error('generateLink error:', error);
      // Не раскрываем существует ли email (безопасность)
      return NextResponse.json({ success: true });
    }

    // Отправляем письмо через наш SMTP
    const resetLink = data.properties.action_link;
    console.log('SMTP config:', { host: process.env.SMTP_HOST, port: process.env.SMTP_PORT, user: process.env.SMTP_USER, passLen: process.env.SMTP_PASSWORD?.length });
    const sent = await emailService.sendPasswordReset(email, resetLink);

    if (!sent) {
      console.error('Failed to send reset email to:', email);
      return NextResponse.json(
        { success: false, message: 'Не удалось отправить письмо. SMTP: ' + (process.env.SMTP_USER || 'NOT SET') },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { success: false, message: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
