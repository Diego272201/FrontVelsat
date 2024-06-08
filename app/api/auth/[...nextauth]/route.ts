import { urlLogin } from '@/app/components/urlsApi/urlApi';
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        login: { label: 'Login', type: 'text' },
        clave: { label: 'Clave', type: 'password' },
      },
      async authorize(credentials, req) {
        const res = await fetch(urlLogin, {
          method: 'POST',
          body: JSON.stringify({
            login: credentials?.login,
            clave: credentials?.clave,
          }),
          headers: { 'Content-Type': 'application/json' },
        });

        const user = await res.json();

        if (!res.ok) {
          if (user && user.errors) {
            throw new Error(Object.values(user.errors).flat().join(', '));
          }
          throw new Error('Error de autenticación');
        }
        if (user) {
          return user;
        } 
        
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      return { ...token, ...user };
    },
    async session({ session, token }) {
      session.user = token as any;
      return session;
    },
  },

  pages: {
    signIn: "/",
    signOut: "/", 
  }


});


export { handler as GET, handler as POST };
