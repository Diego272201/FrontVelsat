
import SessionAuthProvider from '@/context/SessionAuthProvider';
import './globals.css';
import { Providers } from './providers';
import { ApiProvider, useApi } from '@/context/ApiContext';
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
// import { poppins} from './ui/fonts';

// const UpdateBaseUrl = () => {
//   const { data: session } = useSession();
//   const { setBaseUrl } = useApi();

//   useEffect(() => {
//     if (session?.user?.serverUrl) {
//       setBaseUrl(`${session.user.serverUrl}/api`);
//     }
//   }, [session, setBaseUrl]);

//   return null;
// };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta
          name="Sistema web Velsat"
          content="Empresa peruana con 15 años de experiencia en gestión de flotas mediante geolocalización. Ofrecemos plataformas móviles y web para monitoreo y control logístico, garantizando seguridad en el transporte."
        />
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
      </head>

      <body>
          <SessionAuthProvider>
          <ApiProvider>

            {children}
            </ApiProvider>

          </SessionAuthProvider>
      </body>

      {/* <body className={`${poppins.className} antialiased`}>{children}</body> */}
    </html>
  );
}
