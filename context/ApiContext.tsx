'use client'; // Para permitir el uso de hooks del cliente

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useSession } from 'next-auth/react';

type ApiContextType = {
  baseUrl: string;
  setBaseUrl: (url: string) => void;
};

const ApiContext = createContext<ApiContextType | undefined>(undefined);

export const ApiProvider = ({ children }: { children: ReactNode }) => {
  const [baseUrl, setBaseUrl] = useState('http://66.240.210.125:8586/api');
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user?.serverUrl) {
      setBaseUrl(`${session.user.serverUrl}/api`);
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
