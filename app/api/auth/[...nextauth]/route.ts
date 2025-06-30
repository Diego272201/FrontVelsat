import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

// Cache para URLs de servidor (en memoria)
const serverUrlCache = new Map<string, { url: string; timestamp: number }>();
const CACHE_TTL =  7 * 24 * 60 * 60 * 1000; // 7 días

const getServerUrl = async (username: string): Promise<string> => {
  const cached = serverUrlCache.get(username);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`URL del servidor obtenida del cache para ${username}`);
    return cached.url;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); 

    const res = await fetch(`https://velsat.pe:8586/api/Server/${username}`, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    
    if (!data.servidor) {
      throw new Error('Respuesta del servidor inválida');
    }

    serverUrlCache.set(username, {
      url: data.servidor,
      timestamp: Date.now()
    });

    console.log(`Servidor recibido para ${username}:`, data.servidor);
    return data.servidor;
  } catch (error) {
    console.error(`Error al obtener URL del servidor para ${username}:`, error);
    
    const expiredCache = serverUrlCache.get(username);
    if (expiredCache) {
      console.warn(`Usando cache expirado para ${username}`);
      return expiredCache.url;
    }
    
    throw new Error('Error al obtener la URL del servidor');
  }
};

const performLogin = async (serverUrl: string, credentials: { login: string; clave: string }) => {
  const urlLogin = `${serverUrl}/api/Login/login`;
  console.log('URL de login:', urlLogin);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(urlLogin, {
      method: 'POST',
      signal: controller.signal,
      body: JSON.stringify({
        login: credentials.login,
        clave: credentials.clave,
      }),
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
    });

    clearTimeout(timeoutId);

    const user = await res.json();

    if (!res.ok) {
      if (user?.errors) {
        const errorMessages = Object.values(user.errors).flat().join(', ');
        throw new Error(errorMessages);
      }
      throw new Error(`Error de autenticación: ${res.status} ${res.statusText}`);
    }

    if (!user?.token) {
      throw new Error('Token no recibido del servidor');
    }

    return user;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
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
      async authorize(credentials) {
        if (!credentials?.login || !credentials?.clave) {
          throw new Error('Login y contraseña son obligatorios');
        }

        try {
          const serverUrl = await getServerUrl(credentials.login);
          
          const user = await performLogin(serverUrl, {
            login: credentials.login,
            clave: credentials.clave
          });

          user.serverUrl = serverUrl;
          
          return user;
        } catch (error) {
          console.error('Error en autorización:', error);
          throw error;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      // Solo agregar datos del usuario en el primer login
      if (user) {
        return {
          ...token,
          ...user,
          serverUrl: user.serverUrl
        };
      }
      return token;
    },
    
    async session({ session, token }) {

      // Optimizar asignación de session
      session.user = {
        ...session.user,
        ...token,
        serverUrl: token.serverUrl
      };
      return session;
    },
  },

  pages: {
    signIn: "/",
    signOut: "/",
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, 
  },
  
  jwt: {
    maxAge: 30 * 24 * 60 * 60, 
  }
});

export { handler as GET, handler as POST };