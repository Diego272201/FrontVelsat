'use client';
import { useSearchParams } from 'next/navigation';
import Momento from '../components/Momento';

export default function MomentoPage() {
  const searchParams = useSearchParams();

  const lat = parseFloat(searchParams.get('lat') || '0');
  const lng = parseFloat(searchParams.get('lng') || '0');
  const dvc = searchParams.get('deviceId') || '';
  const dir = searchParams.get('dir') || '';

  return (
    <div>
      <Momento latitude = {lat} longitude = {lng} deviceId = {dvc} direccion = {dir}/>
    </div>
  );
}