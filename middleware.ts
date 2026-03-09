import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// API роуты со своей авторизацией (не требуют JWT)
const PUBLIC_API_PREFIXES = [
  '/api/auth/',            // Регистрация / авторизация (публичные)
  '/api/kaspi/feed',       // Публичный XML-фид (авторизация по feed_token)
  '/api/cron/',            // Крон-джобы (авторизация по CRON_SECRET)
  '/api/whatsapp/webhook', // WhatsApp вебхук (авторизация по x-api-key)
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // === Защита страниц /manage-k8m2x9/* (админка) ===
  if (pathname.startsWith('/manage-k8m2x9')) {
    const hasSession =
      req.cookies.has('metricon-session') ||
      req.cookies.getAll().some(
        (c) => c.name.startsWith('sb-') && c.name.includes('-auth-token')
      );

    if (!hasSession) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    return NextResponse.next();
  }

  // === Защита страниц /app/* (существующая логика) ===
  if (pathname.startsWith('/app/')) {
    const hasSession =
      req.cookies.has('metricon-session') ||
      req.cookies.getAll().some(
        (c) => c.name.startsWith('sb-') && c.name.includes('-auth-token')
      );

    if (!hasSession) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    return NextResponse.next();
  }

  // === Защита API /api/* ===
  if (pathname.startsWith('/api/')) {
    // Пропускаем публичные роуты
    if (PUBLIC_API_PREFIXES.some(prefix => pathname.startsWith(prefix))) {
      return NextResponse.next();
    }

    // Проверяем наличие Authorization header (быстрый отказ)
    // Полная верификация JWT происходит в requireAuth() внутри роута
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Authorization required' },
        { status: 401 }
      );
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/app/:path*', '/api/:path*', '/manage-k8m2x9/:path*'],
};
