'use client';

import dynamic from 'next/dynamic';

// La vista usa Leaflet (necesita `window`) y la fecha de hoy del navegador: se carga solo en el
// cliente para que el render del servidor no difiera (zona horaria / formato de fecha).
const ServiciosRutasView = dynamic(() => import('./ServiciosRutasView'), { ssr: false });

export default function ServiciosRutasPage() {
  return <ServiciosRutasView />;
}
