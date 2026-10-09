export const dynamic = 'force-dynamic';

import React, { Suspense } from 'react';
import loadable from 'next/dynamic';
import { Toaster } from 'sonner';


const MapContent = loadable(
  () => import('@/app/trackvelnew/estadistica/detallerecorrido/MapContent'),
  {
    ssr: false,
  },
);



export default function RequestPageDetail() {
  return (
    <div>
      <Suspense
        fallback={
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100vh',
            }}
          >
            Cargando ...
          </div>
        }
      >
        <MapContent />
      </Suspense>
      <Toaster richColors position="top-center" />
    </div>
  );
}
