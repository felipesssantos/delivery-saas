import type { NextAuthConfig } from 'next-auth'

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // Redireciona usuários não logados para a tela de login
      } else if (isLoggedIn) {
        // Se estiver logado e na página de login, redireciona pro dashboard
        if (nextUrl.pathname === '/login') {
            return Response.redirect(new URL('/dashboard', nextUrl));
        }
      }
      return true;
    },
  },
  providers: [], // Providers added later in auth.ts
} satisfies NextAuthConfig
