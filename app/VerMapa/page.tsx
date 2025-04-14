'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

// Cargar el componente solo en el cliente
const MomentoComponent = dynamic(() => import('../components/Momento'), { ssr: false });

export default function MomentoPage() {
  const searchParams = useSearchParams();

  const lat = parseFloat(searchParams.get('lat') || '0');
  const lng = parseFloat(searchParams.get('lng') || '0');
  const dvc = searchParams.get('deviceId') || '';
  const dir = searchParams.get('dir') || '';

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MomentoComponent latitude={lat} longitude={lng} deviceId={dvc} direccion={dir} />
    </Suspense>
  );
}
