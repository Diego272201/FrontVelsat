'use client'
import Sidebar from '../components/Sidebar';
import Tollbar from '../components/Tollbar';
import { BrowserRouter as Router } from 'react-router-dom';

import React, { useRef, useState } from 'react';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <Router>
      <div style={{ display: 'flex', height: '100vh' }}>
        <div className="mainPruebas">{children}</div>
        <Tollbar></Tollbar>      
      </div>
      </Router>
  );
}
