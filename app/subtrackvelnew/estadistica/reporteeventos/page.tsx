export const dynamic = 'force-dynamic';

import React, { Suspense } from 'react';
import loadable from 'next/dynamic';
import { Toaster } from 'sonner';

const EventContent = loadable(() => import('./EventContent'), {
  ssr: false,
});

export default function Page() {
  return (
    <div className="tablaReport tablaReportMargen">
      <Suspense fallback={<div>Cargando...</div>}>
        <EventContent />
      </Suspense>
      <Toaster />
    </div>
  );
}