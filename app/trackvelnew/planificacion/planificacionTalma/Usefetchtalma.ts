import { useState, useEffect } from 'react';

interface UseFetchOptions {
  autoFetch?: boolean;
  dependencies?: any[];
}

export function useFetchTalma<T>(url: string | null, options: UseFetchOptions = {}) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { autoFetch = true, dependencies = [] } = options;

  const fetchData = async () => {
    if (!url) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      setData(result);
      setError(null); // Limpiar error si todo salió bien
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Limpiar estados cuando cambia la URL
    setError(null);
    setData(null);
    
    if (autoFetch) {
      fetchData();
    }
  }, [url, ...dependencies]);

  return { data, loading, error, refetch: fetchData };
}