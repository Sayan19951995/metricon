import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  // Supabase хранит сессию в localStorage (не cookies), поэтому проверяем
  // нашу индикаторную куку metricon-session (ставится при входе)
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

export const config = {
  matcher: ['/app/:path*'],
};
