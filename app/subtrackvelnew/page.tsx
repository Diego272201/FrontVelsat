export const dynamic = 'force-dynamic'; 

import React, { Suspense } from 'react';
import { default as dynamicImport } from 'next/dynamic'; // ✅ Renombrar el import
import '@/app/styles/trackvelnew.css';
import Loader from '../components/Loader';

const RequestPageComponent = dynamicImport(() => import('../requestsub/RequestPageComponent'), { 
  ssr: false,
  loading: () => <Loader />
});

export default function page() {
  return (
    <div className="trackvelnew">
      <Suspense
        fallback={<Loader />}
      >
        <RequestPageComponent />
      </Suspense>
    </div>
  );
}