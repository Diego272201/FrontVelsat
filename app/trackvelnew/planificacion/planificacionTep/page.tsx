
export const dynamic = 'force-dynamic';

import React, { Suspense } from 'react';
import loadable from 'next/dynamic';
import { Toaster } from 'sonner';

const TepContent = loadable(() => import('./TepContent'), {
  ssr: false,
});

export default function Page() {
  return (
    <div >
      <Suspense fallback={<div>Cargando...</div>}>
        <TepContent />
      </Suspense>
      <Toaster />
    </div>
  );
}
