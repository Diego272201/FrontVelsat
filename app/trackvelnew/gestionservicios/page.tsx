export const dynamic = 'force-dynamic';

import React, { Suspense } from 'react';
import loadable from 'next/dynamic'; 

const ServiciosContent = loadable(() => import('./ServiciosContent'), {
  ssr: false,
});

export default function Page() {
  return (
    <div className="tablaReport tablaReportMargen">
      <Suspense fallback={<div>Cargando...</div>}>
        <ServiciosContent />
      </Suspense>
    </div>
  );
}
