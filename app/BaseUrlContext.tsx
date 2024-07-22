// baseUrlContext.tsx
'use client';

// baseUrlContext.tsx
import { createContext, useContext, useState, ReactNode } from 'react';

interface BaseUrlContextProps {
  baseUrl: string;
  setBaseUrl: (url: string) => void;
}

const BaseUrlContext = createContext<BaseUrlContextProps | undefined>(undefined);

export const BaseUrlProvider = ({ children }: { children: ReactNode }) => {
  const [baseUrl, setBaseUrlState] = useState('http://66.240.210.125:8586');

  const setBaseUrl = (url: string) => {
    setBaseUrlState(url);
    console.log('Base URL updated to:', url);
  };

  return (
    <BaseUrlContext.Provider value={{ baseUrl, setBaseUrl }}>
      {children}
    </BaseUrlContext.Provider>
  );
};

export const useBaseUrl = () => {
  const context = useContext(BaseUrlContext);
  if (context === undefined) {
    throw new Error('useBaseUrl must be used within a BaseUrlProvider');
  }
  return context;
};
