import { UrlLogin } from '@/app/components/urlsApi/urlApi';
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';


const getServerUrl = async (username: string) => {
  const res = await fetch(`http://66.240.210.125:8586/api/Server/${username}`);
  const data = await res.json();
  return data.servidor;
};

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        login: { label: 'Login', type: 'text' },
        clave: { label: 'Clave', type: 'password' },
      },
      async authorize(credentials, req) {
        if (!credentials?.login || !credentials.clave) {
          throw new Error('Credenciales no proporcionadas');
        }
        const serverUrl = await getServerUrl(credentials.login);
      const urlLogin = `${serverUrl}${UrlLogin}`;

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
          user.serverUrl = serverUrl; // Añadir serverUrl al usuario
          return user;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.serverUrl = user.serverUrl;
      }
      return { ...token, ...user };
    },
    async session({ session, token }) {
      session.user = token as any;
      session.user.serverUrl = token.serverUrl;
      return session;
    },
  },

  pages: { 
    signIn: "/",
    signOut: "/",
  }
});

export { handler as GET, handler as POST };
