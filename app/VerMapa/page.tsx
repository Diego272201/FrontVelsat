'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const Momento = dynamic(() => import('../components/Momento'), {
  ssr: false, 
  loading: () => <div>Cargando mapa...</div>
});

function MomentoContent() {
  const searchParams = useSearchParams();
  
  const lat = parseFloat(searchParams.get('lat') || '0');
  const lng = parseFloat(searchParams.get('lng') || '0');
  const dvc = searchParams.get('deviceId') || '';
  const dir = searchParams.get('dir') || '';
  const fecha = searchParams.get('fecha') || '';
  const hora = searchParams.get('hora') || '';
  const speed = parseFloat(searchParams.get('speed') || '0');
  
  return (
    <Momento 
      latitude={lat} 
      longitude={lng} 
      deviceId={dvc} 
      direccion={dir}
      fecha={fecha}
      hora={hora}
      velocidad={speed}
    />
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