'use client';
import { useEffect, useState } from 'react';

const GOOGLE_MAPS_API_KEY =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY_MOVILBUS ||
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY_125 ||
  'AIzaSyDjSwibBACnjf7AZXR2sj1yBUEMGq2o1ho';

const GOOGLE_MAPS_LIBRARIES = 'places,geometry,drawing';

const hasMaps = () =>
  typeof window !== 'undefined' && Boolean((window as any).google?.maps?.Map);

// Flag global para evitar que React Strict Mode inyecte el script 2 veces en desarrollo
let injectionStarted = false;

/**
 * Hook autónomo para cargar Google Maps de forma óptima y sin advertencias en consola.
 * - Incluye `loading=async` para cumplir con las mejores prácticas de Google Maps.
 * - Previene doble inyección por remonte de componentes (React Strict Mode).
 * - Carga librerías completas necesarias: places, geometry, drawing.
 */
export function useMapsReady(): boolean {
  const [ready, setReady] = useState(hasMaps);

  useEffect(() => {
    if (hasMaps()) {
      setReady(true);
      return;
    }

    // Si ya existe en el DOM o ya se inició la inyección, solo esperar disponibilidad
    const existing = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existing || injectionStarted) {
      const poll = setInterval(() => {
        if (hasMaps()) {
          setReady(true);
          clearInterval(poll);
        }
      }, 50);
      return () => clearInterval(poll);
    }

    injectionStarted = true;

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=${GOOGLE_MAPS_LIBRARIES}&language=es&region=PE&loading=async`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      const check = setInterval(() => {
        if (hasMaps()) {
          setReady(true);
          clearInterval(check);
        }
      }, 50);
      setTimeout(() => clearInterval(check), 10000);
    };

    script.onerror = () => {
      injectionStarted = false;
    };

    document.head.appendChild(script);

    const fallback = setInterval(() => {
      if (hasMaps()) {
        setReady(true);
        clearInterval(fallback);
      }
    }, 100);

    return () => clearInterval(fallback);
  }, []);

  return ready;
}
