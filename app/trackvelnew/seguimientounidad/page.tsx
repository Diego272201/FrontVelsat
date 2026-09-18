'use client';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { Spinner } from '@nextui-org/react';

const SeguimientoUnidadContent = dynamic(
  () => import('./MapComponent'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-screen bg-slate-100">
        <Spinner size="lg" color="primary" />
      </div>
    )
  }
);

export default function SeguimientoUnidad() {
  return (
    <Suspense 
      fallback={
        <div className="flex items-center justify-center h-screen bg-slate-100">
          <Spinner size="lg" color="primary" />
        </div>
      }
    >
      <SeguimientoUnidadContent />
    </Suspense>
  );
}