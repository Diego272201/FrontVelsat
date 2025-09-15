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
  
  // No cargar hasta que haya sesión autenticada
  const shouldLoadMaps = status === 'authenticated' && session?.user && !isAuthPage;

  // Obtener serverUrl de la sesión (puede estar vacío)
  const servidorUrl = session?.user?.serverUrl || '';

  if (!shouldLoadMaps) {
    // console.log('⏸️ No cargando Google Maps - Razón:', {
    //   status,
    //   hasUser: !!session?.user,
    //   isAuthPage,
    //   pathname
    // });
    
    // Siempre proporcionar GoogleMapsProvider, pero con valores por defecto
    return (
      <MapsWrapper servidorUrl="" disableGoogleMaps={true}>
        {children}
      </MapsWrapper>
    );
  }

//   console.log('🔗 ConditionalMapsWrapper - servidorUrl obtenido:', servidorUrl);

  // Cargar MapsWrapper normalmente
  return (
    <MapsWrapper servidorUrl={servidorUrl} disableGoogleMaps={false}>
      {children}
    </MapsWrapper>
  );
}