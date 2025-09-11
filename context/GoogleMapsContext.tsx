'use client';
import React, { createContext, useContext, ReactNode, useEffect, useState, useRef } from 'react';

const libraries: string[] = ['places'];

interface GoogleMapsContextType {
  isLoaded: boolean;
  loadError: Error | undefined;
}

const GoogleMapsContext = createContext<GoogleMapsContextType | undefined>(undefined);

interface GoogleMapsProviderProps {
  children: ReactNode;
  apiKey: string;
}

// Función para limpiar scripts previos de Google Maps
function cleanupGoogleMapsScript() {
  // console.log('🧹 Limpiando scripts de Google Maps...');
  
  // Remover scripts existentes
  const scripts = document.querySelectorAll('script[src*="maps.googleapis.com"]') as NodeListOf<HTMLScriptElement>;
  scripts.forEach(script => {
    // console.log('🗑️ Removiendo script:', script.src);
    script.remove();
  });
  
  // Limpiar el objeto global de Google Maps
  if (typeof window !== 'undefined' && (window as any).google) {
    // console.log('🌐 Limpiando objeto global google');
    delete (window as any).google;
  }
  
  // Limpiar cualquier callback global
  if (typeof window !== 'undefined' && (window as any).initMap) {
    delete (window as any).initMap;
  }
}

// Función para cargar Google Maps manualmente
function loadGoogleMapsScript(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // console.log('📦 Cargando Google Maps con API key:', apiKey.substring(0, 20) + '...');
    
    // Verificar si ya está cargado con la misma API key
    if (typeof window !== 'undefined' && (window as any).google && (window as any).google.maps) {
      // console.log('✅ Google Maps ya está cargado');
      resolve();
      return;
    }
    
    // Limpiar scripts previos si existen
    cleanupGoogleMapsScript();
    
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=${libraries.join(',')}&language=es&region=PE`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      // console.log('✅ Google Maps cargado exitosamente');
      resolve();
    };
    
    script.onerror = (error) => {
      // console.error('❌ Error cargando Google Maps:', error);
      reject(new Error('Error loading Google Maps'));
    };
    
    document.head.appendChild(script);
  });
}

export function GoogleMapsProvider({ children, apiKey }: GoogleMapsProviderProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<Error | undefined>(undefined);
  const currentApiKeyRef = useRef<string>('');
  const loadingRef = useRef<boolean>(false);
  const isInitializedRef = useRef<boolean>(false);

  useEffect(() => {
    // Solo cargar si la API key cambió y no estamos ya cargando
    if (apiKey && apiKey !== currentApiKeyRef.current && !loadingRef.current) {
      
      // Solo hacer logs si es la primera vez o si realmente cambió
      const isRealChange = currentApiKeyRef.current !== '' && currentApiKeyRef.current !== apiKey;
      const isInitialLoad = !isInitializedRef.current;
      
      // if (isRealChange) {
      //   console.log('🔄 API key cambió, recargando Google Maps...');
      //   console.log('🔑 API key anterior:', currentApiKeyRef.current.substring(0, 20) + '...');
      //   console.log('🔑 API key nueva:', apiKey.substring(0, 20) + '...');
      // } else if (isInitialLoad) {
      //   console.log('📦 Cargando Google Maps inicial con API key:', apiKey.substring(0, 20) + '...');
      // }
      
      loadingRef.current = true;
      setIsLoaded(false);
      setLoadError(undefined);
      
      loadGoogleMapsScript(apiKey)
        .then(() => {
          setIsLoaded(true);
          currentApiKeyRef.current = apiKey;
          loadingRef.current = false;
          isInitializedRef.current = true;
          
          // if (isRealChange || isInitialLoad) {
          //   console.log('🎉 Google Maps cargado y listo');
          // }
        })
        .catch((error) => {
          setLoadError(error);
          loadingRef.current = false;
          // console.error('💥 Error al cargar Google Maps:', error);
        });
    } else if (apiKey === currentApiKeyRef.current && (window as any).google?.maps) {
      // Si es la misma API key y Google Maps ya está disponible
      if (!isLoaded) {
        setIsLoaded(true);
      }
    }
  }, [apiKey, isLoaded]);

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      if (isInitializedRef.current) {
        // console.log('🧹 Limpiando al desmontar GoogleMapsProvider');
        cleanupGoogleMapsScript();
      }
    };
  }, []);

  return (
    <GoogleMapsContext.Provider value={{ isLoaded, loadError }}>
      {children}
    </GoogleMapsContext.Provider>
  );
}

export function useGoogleMaps() {
  const context = useContext(GoogleMapsContext);
  if (context === undefined) {
    throw new Error('useGoogleMaps must be used within a GoogleMapsProvider');
  }
  return context;
}