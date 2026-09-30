'use client';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import MapsWrapper from './MapsWrapper';
import { ReactNode } from 'react';

interface ConditionalMapsWrapperProps {
  children: ReactNode;
}

export default function ConditionalMapsWrapper({ children }: ConditionalMapsWrapperProps) {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  // No cargar MapsWrapper en páginas de autenticación
  const isAuthPage = pathname === '/' || pathname === '/login' || pathname === '/auth';

  // En la página de geocercas, la propia vista gestiona el script de Google Maps con librerías completas
  const isGeocercasPage = pathname?.includes('/geocercas');

  // No cargar hasta que haya sesión autenticada
  const shouldLoadMaps = status === 'authenticated' && session?.user && !isAuthPage;

  // Obtener serverUrl de la sesión (puede estar vacío)
  const servidorUrl = session?.user?.serverUrl || '';

  if (isGeocercasPage || !shouldLoadMaps) {
    // Proporcionar GoogleMapsProvider pero deshabilitado para evitar conflictos de doble script
    return (
      <MapsWrapper servidorUrl="" disableGoogleMaps={true}>
        {children}
      </MapsWrapper>
    );
  }

  // Cargar MapsWrapper normalmente
  return (
    <MapsWrapper servidorUrl={servidorUrl} disableGoogleMaps={false}>
      {children}
    </MapsWrapper>
  );
}