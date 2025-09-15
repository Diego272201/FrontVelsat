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
  servidorUrl?: string;
  disabled?: boolean;
}

// Variables globales para controlar el estado de carga
let isGoogleMapsGloballyLoaded = false;
let isGoogleMapsGloballyLoading = false;
let currentLoadedApiKey = '';
let loadPromise: Promise<void> | null = null;

// Función para cargar Google Maps manualmente (optimizada)
function loadGoogleMapsScript(apiKey: string): Promise<void> {
  // Si ya está cargado con la MISMA API key, resolver inmediatamente
  if (isGoogleMapsGloballyLoaded && 
      currentLoadedApiKey === apiKey && 
      typeof window !== 'undefined' && 
      (window as any).google?.maps) {
    // console.log('✅ Google Maps ya está cargado con la misma API key - reutilizando');
    return Promise.resolve();
  }

  // Si ya se está cargando con la MISMA API key, retornar la promesa existente
  if (isGoogleMapsGloballyLoading && currentLoadedApiKey === apiKey && loadPromise) {
    // console.log('⏳ Google Maps ya se está cargando con la misma API key - esperando...');
    return loadPromise;
  }

  // Si hay una API key diferente cargada, limpiar y recargar
  if (currentLoadedApiKey && currentLoadedApiKey !== apiKey) {
    // console.log('🔄 API key diferente detectada, limpiando y recargando...');
    // console.log('🔑 API key anterior:', currentLoadedApiKey.substring(0, 20) + '...');
    // console.log('🔑 API key nueva:', apiKey.substring(0, 20) + '...');
    
    // Limpiar script anterior
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]') as HTMLScriptElement;
    if (existingScript) {
      existingScript.remove();
    }
    
    // Limpiar objeto global
    if (typeof window !== 'undefined' && (window as any).google) {
      delete (window as any).google;
    }
    
    isGoogleMapsGloballyLoaded = false;
    loadPromise = null;
  }

  // Crear nueva promesa de carga
  loadPromise = new Promise((resolve, reject) => {
    // console.log('📦 Cargando Google Maps con API key:', apiKey.substring(0, 20) + '...');
    
    isGoogleMapsGloballyLoading = true;
    currentLoadedApiKey = apiKey;
    
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=${libraries.join(',')}&language=es&region=PE&loading=async`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      // console.log('✅ Google Maps cargado exitosamente para:', apiKey.substring(0, 20) + '...');
      isGoogleMapsGloballyLoaded = true;
      isGoogleMapsGloballyLoading = false;
      resolve();
    };
    
    script.onerror = (error) => {
      // console.error('❌ Error cargando Google Maps:', error);
      isGoogleMapsGloballyLoading = false;
      currentLoadedApiKey = '';
      loadPromise = null;
      reject(new Error('Error loading Google Maps'));
    };
    
    document.head.appendChild(script);
  });

  return loadPromise;
}

export function GoogleMapsProvider({ children, apiKey, servidorUrl, disabled = false }: GoogleMapsProviderProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<Error | undefined>(undefined);
  const currentApiKeyRef = useRef<string>('');
  const hasInitializedRef = useRef<boolean>(false);

  // Verificar si el servidor usa OSM (contiene "sub") - FUERA del useEffect
  const usesOSM = servidorUrl ? servidorUrl.includes('sub') : false;
  
  // Si está deshabilitado o usa OSM, no cargar Google Maps
  const shouldSkipGoogleMaps = disabled || usesOSM;

  useEffect(() => {
    // EARLY RETURN: Si está deshabilitado o usa OSM, no hacer nada más
    if (shouldSkipGoogleMaps) {
      // if (disabled) {
      //   console.log('⏸️ Google Maps deshabilitado por configuración');
      // } else if (usesOSM) {
      //   console.log('🗺️ Servidor OSM detectado:', servidorUrl, '- Saltando carga de Google Maps');
      // }
      setIsLoaded(false);
      setLoadError(undefined);
      return;
    }

    // Solo ejecutar si tenemos una API key válida
    if (!apiKey || apiKey === 'dummy-key') {
      console.warn('⚠️ No se proporcionó API key válida para Google Maps');
      return;
    }

    // Cargar si es la primera vez O si cambió la API key (diferente usuario)
    const needsLoading = !hasInitializedRef.current || apiKey !== currentApiKeyRef.current;
    
    if (needsLoading) {
      // if (apiKey !== currentApiKeyRef.current && currentApiKeyRef.current !== '') {
      //   console.log('🔄 Cambio de usuario detectado - cambiando API key');
      //   console.log('👤 Usuario anterior:', currentApiKeyRef.current.substring(0, 20) + '...');
      //   console.log('👤 Usuario nuevo:', apiKey.substring(0, 20) + '...');
      // } else {
      //   console.log('🚀 Iniciando carga inicial de Google Maps...');
      // }
      
      setLoadError(undefined);
      setIsLoaded(false);
      
      loadGoogleMapsScript(apiKey)
        .then(() => {
          // Verificación adicional de que Google Maps esté realmente disponible
          const checkGoogleMaps = () => {
            if (typeof window !== 'undefined' && 
                (window as any).google?.maps?.Map && 
                (window as any).google?.maps?.places) {
              setIsLoaded(true);
              currentApiKeyRef.current = apiKey;
              hasInitializedRef.current = true;
              // console.log('🎉 Google Maps listo para el usuario:', apiKey.substring(0, 20) + '...');
            } else {
              // Reintentar después de un breve delay
              setTimeout(checkGoogleMaps, 100);
            }
          };
          
          checkGoogleMaps();
        })
        .catch((error) => {
          setLoadError(error);
          setIsLoaded(false);
          // console.error('💥 Error al cargar Google Maps para usuario:', apiKey.substring(0, 20) + '...', error);
        });
    } else if (currentLoadedApiKey === apiKey && isGoogleMapsGloballyLoaded && !isLoaded) {
      // Verificar que Google Maps esté realmente disponible antes de marcar como cargado
      if (typeof window !== 'undefined' && 
          (window as any).google?.maps?.Map && 
          (window as any).google?.maps?.places) {
        // console.log('🔄 Sincronizando estado local con Google Maps ya cargado');
        setIsLoaded(true);
      }
    }
  }, [apiKey, shouldSkipGoogleMaps]);

  const contextValue = {
    isLoaded: !shouldSkipGoogleMaps && isLoaded && isGoogleMapsGloballyLoaded && currentLoadedApiKey === apiKey && 
              typeof window !== 'undefined' && !!(window as any).google?.maps?.Map,
    loadError: shouldSkipGoogleMaps ? undefined : loadError
  };

  return (
    <GoogleMapsContext.Provider value={contextValue}>
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

// Función de utilidad para verificar manualmente si Google Maps está disponible
export function isGoogleMapsAvailable(): boolean {
  return isGoogleMapsGloballyLoaded && typeof window !== 'undefined' && !!(window as any).google?.maps;
}

// Función de utilidad para obtener la API key actualmente cargada
export function getCurrentLoadedApiKey(): string {
  return currentLoadedApiKey;
}