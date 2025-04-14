'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Momento from '../components/Momento';

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