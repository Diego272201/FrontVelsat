
export const dynamic = 'force-dynamic';

import React, { Suspense } from 'react';
import loadable from 'next/dynamic'; // Renombramos para evitar conflicto

import { Toaster } from 'sonner';


const PageContent = loadable(() => import('./PageContent'), {
  ssr: false,
});
export default function Page() {
  return (
    <div className="tablaReport tablaReportMargen">
      <Suspense fallback={<div>Cargando...</div>}>
        <PageContent />
      </Suspense>
      <Toaster />
    </div>
  );
}
