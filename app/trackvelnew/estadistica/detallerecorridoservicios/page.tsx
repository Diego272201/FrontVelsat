export const dynamic = 'force-dynamic';

import React, { Suspense } from 'react';
import loadable from 'next/dynamic'; 
import { Toaster } from 'sonner';

const ReportServicios = loadable(() => import('./ReportServicios'), {
  ssr: false,
});

export default function Page() {
  return (
    <div className="mt-[-90px]">
      <Suspense fallback={<div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}>Cargando ...</div>}>
        <ReportServicios />
      </Suspense>
      <Toaster />
    </div>
  );
}
