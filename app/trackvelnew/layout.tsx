'use client'
import Sidebar from '../components/Sidebar';
import Tollbar from '../components/Tollbar';
import { ReportProvider } from '../context/ReportProvider';
import SideNav from '../ui/dashboard/sidenav';
import { BrowserRouter as Router } from 'react-router-dom';

import React, { useRef, useState } from 'react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const mapRef = useRef<google.maps.Map | null>(null);


  const centerMap = () => {
    if (mapRef.current) {
      mapRef.current.setCenter({ lat: -12.046591525826495, lng: -77.04689047482863 });
      mapRef.current.setZoom(12);
    }
  };

  return (
    <Router>
      <div style={{ display: 'flex', height: '100vh' }}>
        <div className="mainPruebas">{children}</div>
        <Tollbar></Tollbar>      
      </div>
      </Router>
  );
}
