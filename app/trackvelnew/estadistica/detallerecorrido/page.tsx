
export const dynamic = 'force-dynamic'; // Esta línea debe ir sola antes de todo

import React, { Suspense } from 'react';
import loadable from 'next/dynamic'; // Renombramos para evitar conflicto
import { Toaster } from 'sonner';

const MapContent = loadable(() => import('./MapContent'), {
  ssr: false,
});

export default function RequestPageDetail() {
  return (
    <div className='mt-[-90px]'>
      <Suspense fallback={<div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}>Cargando ...</div>}>
        <MapContent />
      </Suspense>
      <Toaster />
    </div>
  );
}
