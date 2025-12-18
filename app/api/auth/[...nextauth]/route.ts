import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

const getServerUrl = async (username: string) => {
  try {
    const res = await fetch(`https://do.velsat.pe:2083/api/Server/${username}`);
    if (!res.ok) {
      throw new Error('No se pudo obtener la URL del servidor');
    }
    const data = await res.json();
    console.log("Servidor recibido:", data.servidor);
    return data.servidor;
  } catch (error) {
    console.error('Error al obtener la URL del servidor:', error);
    throw new Error('Error al obtener la URL del servidor');
  }
};
const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      id: 'credentials',
      credentials: {
        login: { label: 'Login', type: 'text' },
        clave: { label: 'Clave', type: 'password' },
      },
      async authorize(credentials, req) {
        
        if (!credentials?.login || !credentials.clave) {
          throw new Error('Credenciales no proporcionadas');
        }
        const serverUrl = await getServerUrl(credentials.login);
      const urlLogin = `${serverUrl}/api/Login/login`;
      
      console.log('URL de login:', urlLogin);
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
        if (res.ok && user && user.token) {
          user.serverUrl = serverUrl;
          return user;
        }
        return null;
        
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
