'use client';
import dynamic from 'next/dynamic';
import Loader from '../components/Loader';

// Importación dinámica sin SSR
const RequestPageComponent = dynamic(() => import('./RequestPageComponent'), {
  ssr: false,
  loading: () => <Loader />
});

export default function Page() {
  return <RequestPageComponent />;
}