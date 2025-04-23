
import Tollbar from '../components/Tollbar';
import React from 'react';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
      <div style={{ display: 'flex', height: '100vh' }}>
        <div className="mainPruebas">{children}</div>
        <Tollbar></Tollbar>      
      </div>
  );
}
