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

type ApiContextType = {
  baseUrl: string;
  setBaseUrl: (url: string) => void;
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

  return (
    <ApiContext.Provider value={{ baseUrl, setBaseUrl }}>
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
