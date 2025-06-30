import SessionAuthProvider from '@/context/SessionAuthProvider';
import './globals.css';
import { ApiProvider } from '@/context/ApiContext';
import { Analytics } from '@vercel/analytics/next';

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
            <Analytics />
          </ApiProvider>
        </SessionAuthProvider>
      </body>
    </html>
  );
}
