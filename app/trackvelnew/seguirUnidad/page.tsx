export const dynamic = 'force-dynamic'; // Esta línea debe ir sola antes de todo

import React, { Suspense } from 'react';
import '@/app/styles/trackvelnew.css';
import loadable from 'next/dynamic'; // Renombramos para evitar conflicto

// Carga dinámica sin SSR
const SeguirUnidad = loadable(() => import('@/app/request/seguirUnidad'), {
  ssr: false,
});

export default function Page() {
  return (
    <div className="trackvelnew">
      <Suspense fallback={<div>Cargando mapa...</div>}>
        <SeguirUnidad />
      </Suspense>
    </div>
  );
}
