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

// Debugging de variables de entorno
// console.log('🔧 Variables de entorno:');
// console.log('MOVILBUS:', process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY_MOVILBUS ? 'Configurada' : 'NO CONFIGURADA');
// console.log('GACELA:', process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY_GACELA ? 'Configurada' : 'NO CONFIGURADA');
// console.log('TALMA:', process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY_TALMA ? 'Configurada' : 'NO CONFIGURADA');
// console.log('DEFAULT:', process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY_125 ? 'Configurada' : 'NO CONFIGURADA');

interface MapsWrapperProps {
  children: ReactNode;
}

function getUserIdentifier(user: any): string {
//   console.log('🔍 Usuario completo:', user);
  
  // Intentar diferentes campos para identificar al usuario
  let identifier = '';
  
  // 1. Intentar username
  if (user.username) {
    identifier = user.username;
    // console.log('✅ Usando username:', identifier);
    return identifier;
  }
  
//   console.log('❌ No se encontró identificador, usando default');
  return 'default';
}

export default function MapsWrapper({ children }: MapsWrapperProps) {
  const { data: session, status } = useSession();
  
  const apiKey = useMemo(() => {
    // console.log('🚀 Status de sesión:', status);
    // console.log('📋 Session data:', session);
    
    if (status === 'loading') {
    //   console.log('⏳ Cargando sesión, usando API key por defecto');
      return DEFAULT_API_KEY;
    }
    
    if (!session?.user) {
    //   console.log('👤 Sin usuario, usando API key por defecto');
      return DEFAULT_API_KEY;
    }
    
    const userIdentifier = getUserIdentifier(session.user);
    const selectedKey = API_KEY_MAP[userIdentifier.toLowerCase()] || DEFAULT_API_KEY;
    
    // console.log('🔑 Usuario identificado como:', userIdentifier);
    // console.log('🗝️ API Key seleccionada:', selectedKey ? selectedKey.substring(0, 20) + '...' : 'undefined');
    
    return selectedKey;
  }, [session, status]);

  // No renderizar hasta que la sesión esté determinada
  if (status === 'loading') {
    return;
  }

  if (!apiKey) {
    return;
  }

  return (
    <GoogleMapsProvider apiKey={apiKey}>
      {children}
    </GoogleMapsProvider>
  );
}