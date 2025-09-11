'use client';
import { useSession } from 'next-auth/react';
import { GoogleMapsProvider } from '@/context/GoogleMapsContext';
import { ReactNode, useMemo } from 'react';

// Mapeo de usuarios a sus respectivas API keys
const API_KEY_MAP: Record<string, string> = {
  movilbus: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY_MOVILBUS as string,
  cgacela: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY_GACELA as string,
  talmav: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY_TALMA as string,
};

const DEFAULT_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY_125 as string;

interface MapsWrapperProps {
  children: ReactNode;
  servidorUrl?: string;
  disableGoogleMaps?: boolean;
}

function getUserIdentifier(user: any): string {
  if (user?.username) {
    return user.username;
  }
  return 'default';
}

export default function MapsWrapper({ children, servidorUrl, disableGoogleMaps = false }: MapsWrapperProps) {
  const { data: session, status } = useSession();

  const apiKey = useMemo(() => {
    // Si está deshabilitado, usar una API key dummy
    if (disableGoogleMaps) {
      return 'dummy-key';
    }

    // Durante loading o sin sesión, usar API key por defecto
    if (status === 'loading' || !session?.user) {
      return DEFAULT_API_KEY;
    }
    
    const userIdentifier = getUserIdentifier(session.user);
    const selectedKey = API_KEY_MAP[userIdentifier.toLowerCase()] || DEFAULT_API_KEY;
    
    // console.log('🔑 MapsWrapper - Usuario:', userIdentifier, 'API Key:', selectedKey?.substring(0, 20) + '...');
    
    return selectedKey;
  }, [session, status, disableGoogleMaps]);

  // Siempre renderizar GoogleMapsProvider
  if (!apiKey) {
    // console.warn('⚠️ MapsWrapper - No hay API key disponible');
    return <>{children}</>;
  }

  return (
    <GoogleMapsProvider 
      apiKey={apiKey} 
      servidorUrl={disableGoogleMaps ? '' : servidorUrl}
      disabled={disableGoogleMaps}    
    >
      {children}
    </GoogleMapsProvider>
  );
}