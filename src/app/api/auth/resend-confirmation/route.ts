import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/api-auth';
import { emailService } from '@/lib/email/mailer';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email обязателен' },
        { status: 400 }
      );
    }

    const host = req.headers.get('host') || '';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const origin = req.headers.get('origin') || `${protocol}://${host}`;

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email,
      options: {
        redirectTo: `${origin}/auth/verify-email`,
      },
    });

    if (linkError) {
      console.error('resend generateLink error:', linkError);
      return NextResponse.json(
        { success: false, error: 'Не удалось сгенерировать ссылку' },
        { status: 500 }
      );
    }

    if (!linkData?.properties?.hashed_token) {
      return NextResponse.json(
        { success: false, error: 'Не удалось сгенерировать токен' },
        { status: 500 }
      );
    }

    const confirmLink = `${origin}/auth/verify-email?token_hash=${linkData.properties.hashed_token}&type=signup`;
    const sent = await emailService.sendEmailConfirmation(email, confirmLink);

    if (!sent) {
      console.error('Failed to resend confirmation to:', email);
      return NextResponse.json(
        { success: false, error: 'Не удалось отправить письмо' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Resend confirmation error:', error);
    return NextResponse.json(
      { success: false, error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
