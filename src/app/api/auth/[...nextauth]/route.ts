import NextAuth from 'next-auth';
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        // Временная авторизация для разработки
        // TODO: Заменить на реальную проверку в базе данных
        if (credentials?.email && credentials?.password) {
          return {
            id: '1',
            name: 'Demo User',
            email: credentials.email,
          };
        }
        return null;
      }
    })
  ],
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET || 'development-secret-key-change-in-production',
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
