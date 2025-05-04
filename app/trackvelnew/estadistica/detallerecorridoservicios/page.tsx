export const dynamic = 'force-dynamic';

import React, { Suspense } from 'react';
import loadable from 'next/dynamic'; 
import { Toaster } from 'sonner';

const ReportServicios = loadable(() => import('./ReportServicios'), {
  ssr: false,
});

export default function Page() {
  return (
    <div className="tablaReport tablaReportMargen">
      <Suspense fallback={<div>Cargando...</div>}>
        <ReportServicios />
      </Suspense>
      <Toaster />
    </div>
  );
}
