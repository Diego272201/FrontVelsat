'use client'; // Necesario para usar usePathname

import { usePathname } from 'next/navigation';
import Tollbar from '../components/Tollbar';

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const showTollbar = pathname === '/trackvelnew';

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <div className="mainPruebas">{children}</div>
      {showTollbar && <Tollbar />}
    </div>
  );
}
