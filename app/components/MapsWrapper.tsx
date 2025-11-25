'use client';
import { useSession } from 'next-auth/react';
import { GoogleMapsProvider } from '@/context/GoogleMapsContext';
import { ReactNode, useMemo } from 'react';

// Define users that should use TALMA API key
const TALMA_USERS = [
  'talmav',
  'agfajardo',
  'fjbarboza',
  'rccoaguila',
  'rmlozano',
  'talma',
  'aloremisse',
];

// Mapeo de usuarios a sus respectivas API keys
const API_KEY_MAP: Record<string, string> = {
  movilbus: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY_MOVILBUS as string,
  cgacela: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY_GACELA as string,
};

// API key for TALMA users
const TALMA_API_KEY = process.env
  .NEXT_PUBLIC_GOOGLE_MAPS_API_KEY_TALMA as string;

const DEFAULT_API_KEY = process.env
  .NEXT_PUBLIC_GOOGLE_MAPS_API_KEY_125 as string;

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

export default function MapsWrapper({
  children,
  servidorUrl,
  disableGoogleMaps = false,
}: MapsWrapperProps) {
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
    const usernameLower = userIdentifier.toLowerCase();

    // Check if user should use TALMA API key
    if (TALMA_USERS.includes(usernameLower)) {
      return TALMA_API_KEY;
    }

    // Check specific API keys for other users
    const selectedKey = API_KEY_MAP[usernameLower] || DEFAULT_API_KEY;

    return selectedKey;
  }, [session?.user, status, disableGoogleMaps]);

  // ✅ AGREGAR ESTO - Calcular username
  const username = useMemo(() => {
    if (status === 'loading' || !session?.user) {
      return undefined;
    }
    const user = getUserIdentifier(session.user);
    // console.log('🔑 Username calculado:', user);
    return user;
  }, [session?.user, status]);

  // Siempre renderizar GoogleMapsProvider
  if (!apiKey) {
    return <>{children}</>;
  }

  // console.log('🔍 MapsWrapper DEBUG:', {
  //   username, // ✅ AGREGAR ESTO
  //   apiKey: apiKey?.substring(0, 20) + '...',
  //   servidorUrl,
  //   disableGoogleMaps,
  //   sessionStatus: status,
  //   hasSession: !!session?.user
  // });

  return (
    <GoogleMapsProvider
      apiKey={apiKey}
      servidorUrl={disableGoogleMaps ? '' : servidorUrl}
      disabled={disableGoogleMaps}
      username={username} // ✅ AGREGAR ESTO
    >
      {children}
    </GoogleMapsProvider>
  );
}
