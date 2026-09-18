export const dynamic = 'force-dynamic';

import React, { Suspense } from 'react';
import loadable from 'next/dynamic'; 
import { Toaster } from 'sonner';

const AlertasReportContent = loadable(() => import('./AlertasReportContent'), {
  ssr: false,
});

export default function Page() {
  return (
    <div className="w-full">
      <Suspense fallback={<div>Cargando...</div>}>
        <AlertasReportContent />
      </Suspense>
      <Toaster />
    </div>
  );
}
