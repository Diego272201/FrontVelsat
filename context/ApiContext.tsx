'use client'; 

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useSession, getSession } from 'next-auth/react';
import axios from 'axios';

// Solo las APIs de Reporting de este backend exigen token
const REPORTING_URL = 'https://do.velsat.pe:2083/api/Reporting/';
let reportingToken: string | undefined;

if (typeof window !== 'undefined') {
  axios.interceptors.request.use(async (config) => {
    if (config.url?.startsWith(REPORTING_URL)) {
      // Si la sesión aún no cargó en el provider, se pide a next-auth
      const token = reportingToken ?? (await getSession())?.user?.token;
      if (token) config.headers.set('Authorization', `Bearer ${token}`);
    }
    return config;
  });
}

export function isDoServer(url?: string): boolean {
  const target = (url || '').toLowerCase().trim();
  if (target) {
    return target.includes('do.velsat.pe') || target.includes('2083');
  }
  if (typeof window !== 'undefined') {
    try {
      const stored = (localStorage.getItem('servidorUrl') || '').toLowerCase().trim();
      if (stored) {
        return stored.includes('do.velsat.pe') || stored.includes('2083');
      }
    } catch {
      return false;
    }
  }
  return false;
}

export const checkIsDoServer = isDoServer;

type ApiContextType = {
  baseUrl: string;
  setBaseUrl: (url: string) => void;
  isDoServer: boolean;
};

const ApiContext = createContext<ApiContextType | undefined>(undefined);

export const ApiProvider = ({ children }: { children: ReactNode }) => {
  const [baseUrl, setBaseUrl] = useState('');
  const { data: session } = useSession();

  useEffect(() => {
    const stored = localStorage.getItem('servidorUrl');
    if (stored) setBaseUrl(stored);
  }, []);

  useEffect(() => {
    reportingToken = session?.user?.token;
  }, [session]);

  useEffect(() => {
    if (session?.user?.serverUrl) {
      setBaseUrl(session.user.serverUrl);
      localStorage.setItem('servidorUrl', session.user.serverUrl);
    }
  }, [session]);

  // Solo desde baseUrl: leer localStorage en el render da distinto en el
  // servidor que en el navegador y rompe la hidratación (la campana de
  // alertas del Tollbar aparecía solo en el cliente). baseUrl se carga desde
  // localStorage en el efecto de arriba, así que se actualiza enseguida.
  const isDo = baseUrl ? isDoServer(baseUrl) : false;

  return (
    <ApiContext.Provider value={{ baseUrl, setBaseUrl, isDoServer: isDo }}>
      {children}
    </ApiContext.Provider>
  );
};

export const useApi = () => {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
};
