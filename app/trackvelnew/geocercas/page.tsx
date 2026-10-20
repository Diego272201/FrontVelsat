'use client';

import dynamic from 'next/dynamic';

// El mapa es Leaflet, que necesita `window`: la vista se carga solo en el navegador
const GeocercasView = dynamic(() => import('./GeocercasView'), { ssr: false });

export default function GeocercasPage() {
  return <GeocercasView />;
}
