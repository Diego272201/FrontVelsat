import SessionAuthProvider from '@/context/SessionAuthProvider';
import './globals.css';
import { ApiProvider } from '@/context/ApiContext';
import { Analytics } from '@vercel/analytics/next';
import Script from 'next/script'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <meta
          name="Sistema web Velsat"
          content="Empresa peruana con 15 años de experiencia en gestión de flotas mediante geolocalización. Ofrecemos plataformas móviles y web para monitoreo y control logístico, garantizando seguridad en el transporte."
        />
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />

        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&loading=async`}
          strategy="beforeInteractive"
        />
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
