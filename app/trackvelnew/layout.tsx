import Sidebar from '../components/Sidebar';
import Tollbar from '../components/Tollbar';
import SideNav from '../ui/dashboard/sidenav';

import React from 'react';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <div className="mainPruebas">{children}</div>

      <Tollbar></Tollbar>

      <Sidebar></Sidebar>
    </div>
  );
}
