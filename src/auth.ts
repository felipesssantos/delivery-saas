import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import prisma from '@/lib/prisma'
import { authConfig } from './auth.config'
import bcrypt from 'bcryptjs'

export const { auth, signIn, signOut, handlers } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = (credentials.email as string).trim();
        const password = credentials.password as string;

        console.log("LOGIN ATTEMPT:", email);

        const user = await prisma.user.findUnique({
          where: { email: email }
        });

        console.log("USER FOUND:", !!user);
        if (!user || !user.password) return null;

        const passwordsMatch = await bcrypt.compare(
          password,
          user.password
        );

        console.log("PASSWORD MATCH:", passwordsMatch);
        if (passwordsMatch) {
          // Em NextAuth v5, o objeto retornado não pode ter classes/dados não serializáveis.
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            storeId: user.storeId
          };
        }

        return null;
      }
    })
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.storeId = (user as any).storeId;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as any).storeId = token.storeId;
        (session.user as any).role = token.role;
      }
      return session;
    }
  }
})
