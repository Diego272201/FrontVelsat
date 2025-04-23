
export const dynamic = 'force-dynamic'; // Esta línea debe ir sola antes de todo

import React, { Suspense } from 'react';
import loadable from 'next/dynamic'; // Renombramos para evitar conflicto

const ReporteErrores = loadable(() => import('./ReporteErrores'), {
  ssr: false,
});
export default function PageWrapper() {
  return (
    <Suspense fallback={<div>Cargando reporte...</div>}>
      <ReporteErrores />
    </Suspense>
  );
}
