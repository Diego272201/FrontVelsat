export const dynamic = 'force-dynamic';

import React, { Suspense } from 'react';
import loadable from 'next/dynamic';

const GraficosContent = loadable(() => import('./GraficosContent'), {
  ssr: false,
});

export default function Page() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <GraficosContent />
    </Suspense>
  );
}
