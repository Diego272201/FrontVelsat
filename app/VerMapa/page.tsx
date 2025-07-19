'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';

// Importar el componente Momento de forma dinámica, solo en el cliente
const Momento = dynamic(() => import('../components/Momento'), {
  ssr: false, // Deshabilitar Server-Side Rendering para este componente
  loading: () => <div>Cargando mapa...</div>
});

function MomentoContent() {
  const searchParams = useSearchParams();
  
  const lat = parseFloat(searchParams.get('lat') || '0');
  const lng = parseFloat(searchParams.get('lng') || '0');
  const dvc = searchParams.get('deviceId') || '';
  const dir = searchParams.get('dir') || '';
  
  return (
    <Momento latitude={lat} longitude={lng} deviceId={dvc} direccion={dir} />
  );
}

export default function MomentoPage() {
  return (
    <div>
      <Suspense fallback={<div>Cargando...</div>}>
        <MomentoContent />
      </Suspense>
    </div>
  );
}