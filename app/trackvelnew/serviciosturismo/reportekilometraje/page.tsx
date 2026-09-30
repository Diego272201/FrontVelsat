export const dynamic = 'force-dynamic';

import React, { Suspense } from 'react';
import loadable from 'next/dynamic';

const ReporteKilometrajeContent = loadable(() => import('./ReporteKilometrajeContent'), {
  ssr: false,
});

export default function Page() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <ReporteKilometrajeContent />
    </Suspense>
  );
}
