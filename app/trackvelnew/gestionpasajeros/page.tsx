
export const dynamic = 'force-dynamic';

import React, { Suspense } from 'react';
import loadable from 'next/dynamic';
import { Toaster } from 'sonner';

const PasajeroContent = loadable(() => import('./PasajeroContent'), {
  ssr: false,
});

export default function Page() {
  return (
    <div className="h-screen w-full overflow-hidden">
      <Suspense fallback={<div>Cargando...</div>}>
        <PasajeroContent />
      </Suspense>
      <Toaster richColors />
    </div>
  );
}
