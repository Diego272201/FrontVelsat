
export const dynamic = 'force-dynamic';

import React, { Suspense } from 'react';
import loadable from 'next/dynamic';
import { Toaster } from 'sonner';

const TurnosContent = loadable(() => import('./TurnosContent'), {
  ssr: false,
});

export default function Page() {
  return (
    <div>
      <Suspense fallback={<div>Cargando...</div>}>
        <TurnosContent />
      </Suspense>
      <Toaster />
    </div>
  );
}
