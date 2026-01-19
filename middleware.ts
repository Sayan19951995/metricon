import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Временно отключена авторизация для отладки UI
export function middleware(req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/app/:path*'],
};

// Закомментировано для отладки:
// import { withAuth } from 'next-auth/middleware';
// export default withAuth(
//   function middleware(req) {
//     return NextResponse.next();
//   },
//   {
//     callbacks: {
//       authorized: ({ token }) => !!token,
//     },
//     pages: {
//       signIn: '/login',
//     },
//   }
// );
