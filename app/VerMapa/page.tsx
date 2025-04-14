'use client';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Momento from '../components/Momento';

export default function MomentoPage() {
  const searchParams = useSearchParams();

  const [lat, setLat] = useState(0);
  const [lng, setLng] = useState(0);
  const [dvc, setDvc] = useState('');
  const [dir, setDir] = useState('');

  useEffect(() => {
    const latParam = parseFloat(searchParams.get('lat') || '0');
    const lngParam = parseFloat(searchParams.get('lng') || '0');
    const deviceId = searchParams.get('deviceId') || '';
    const direccion = searchParams.get('dir') || '';

    setLat(latParam);
    setLng(lngParam);
    setDvc(deviceId);
    setDir(direccion);
  }, [searchParams]);

  return (
    <div>
      <Momento latitude={lat} longitude={lng} deviceId={dvc} direccion={dir} />
    </div>
  );
}
