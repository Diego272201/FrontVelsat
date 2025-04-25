
export const dynamic = 'force-dynamic'; 

import React, { Suspense } from 'react';
import loadable from 'next/dynamic';

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
