'use client'
import { BrowserRouter as Router } from 'react-router-dom';
import React from 'react';
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <Router>
      <div style={{ display: 'flex', height: '100vh' }}>
        <div className="mainPruebas">{children}</div>
      </div>
      </Router>
  );
}
