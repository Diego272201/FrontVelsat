'use client';
import { useEffect, useState } from 'react';

const hasMaps = () =>
  typeof window !== 'undefined' && Boolean((window as any).google?.maps?.Map);

/**
 * El script de Google Maps ya lo inyecta el layout raíz de la app, así que aquí
 * solo se espera a que esté disponible: cargarlo otra vez rompería el resto.
 */
export function useMapsReady(): boolean {
  const [ready, setReady] = useState(hasMaps);

  useEffect(() => {
    if (ready) return;
    const interval = setInterval(() => {
      if (hasMaps()) setReady(true);
    }, 120);
    return () => clearInterval(interval);
  }, [ready]);

  return ready;
}
