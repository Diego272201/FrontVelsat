'use client';

import { usePathname } from 'next/navigation';
import Tollbar from '../components/Tollbar';

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showTollbar = pathname === '/trackvelnew';
  const isGeocercas = pathname?.includes('/geocercas');

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {isGeocercas ? (
        // Geocercas maneja su propio layout a pantalla completa (flex-row)
        // No usar .mainPruebas porque fuerza flex-direction: column
        <div style={{ width: '100%', height: '100vh', overflow: 'hidden' }}>{children}</div>
      ) : (
        <div className="mainPruebas">{children}</div>
      )}
      {showTollbar && <Tollbar />}
    </div>
  );
}
