'use client';

import { useCallback, useEffect, useState } from 'react';
import { getCurrentUser } from './useUserSettings';
import { useApi } from '@/context/ApiContext';

/** Placas reales de la cuenta, obtenidas del mismo servicio que usa el mapa principal. */
export function useAccountUnits() {
  const { baseUrl } = useApi();
  const [units, setUnits] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    const username = getCurrentUser();
    if (!username) {
      setLoading(false);
      setError('No se encontró el usuario de la sesión');
      return;
    }
    // baseUrl llega un instante después de cargar la página: se espera
    if (!baseUrl) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`${baseUrl}/api/DeviceList/${username}`, {
      headers: { 'Cache-Control': 'no-cache' },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const ids: string[] = (data?.datosDevice ?? [])
          .map((d: { deviceId?: string }) => (d.deviceId || '').trim().toUpperCase())
          .filter(Boolean);
        setUnits(Array.from(new Set(ids)).sort((a, b) => a.localeCompare(b)));
      })
      .catch(() => {
        if (!cancelled) setError('No se pudieron cargar las unidades de la cuenta');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [baseUrl, reloadKey]);

  return { units, loading, error, reload };
}
