'use client';
import dynamic from 'next/dynamic';
import Loader from '../components/Loader';

// Importación dinámica sin SSR
const RequestComponent = dynamic(() => import('./RequestComponent'), {
  ssr: false,
  loading: () => <Loader />,
});

export default function Page() {
  return <RequestComponent />;
}
