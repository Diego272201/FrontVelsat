import SessionAuthProvider from '@/context/SessionAuthProvider';
import './globals.css';
import { ApiProvider } from '@/context/ApiContext';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import type { Viewport } from 'next';
import ConditionalMapsWrapper from '@/app/components/ConditionalMapsWrapper';

export const viewport: Viewport = {
  themeColor: '#172554',
};

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
        <meta name="theme-color" content="#172554" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>

      <body>
        <SessionAuthProvider>
          <ApiProvider>
            <ConditionalMapsWrapper>
              {children}
              <SpeedInsights />
            </ConditionalMapsWrapper>
            <Analytics />
          </ApiProvider>
        </SessionAuthProvider>
      </body>
    </html>
  );
}