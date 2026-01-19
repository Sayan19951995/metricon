import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
// import { prisma } from '@/lib/db/prisma';
// import bcrypt from 'bcrypt';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // Временно отключено для отладки UI
        return null;

        // if (!credentials?.email || !credentials?.password) {
        //   throw new Error('Введите email и пароль');
        // }

        // const user = await prisma.user.findUnique({
        //   where: { email: credentials.email },
        // });

        // if (!user) {
        //   throw new Error('Пользователь не найден');
        // }

        // const isPasswordValid = await bcrypt.compare(
        //   credentials.password,
        //   user.password
        // );

        // if (!isPasswordValid) {
        //   throw new Error('Неверный пароль');
        // }

        // return {
        //   id: user.id,
        //   email: user.email,
        //   name: user.name,
        //   role: user.role,
        // };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 1 день
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
