'use client';

import { BrowserRouter as Router } from 'react-router-dom';
import React, { useEffect, useState } from 'react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null; // O un spinner/loading state si lo prefieres
  }

  return (
    <Router>
      <div style={{ display: 'flex', height: '100vh' }}>
        <div className="mainPruebas">{children}</div>
      </div>
    </Router>
  );
}
