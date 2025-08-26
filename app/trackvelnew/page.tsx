export const dynamic = 'force-dynamic'; 

import React, { Suspense } from 'react';
import loadable from 'next/dynamic'; 

const RequestComponent = loadable(() => import('../request/RequestComponent'), { ssr: false });
import '@/app/styles/trackvelnew.css';

export default function page() {
  return (
    <div className="trackvelnew">
      <Suspense
        fallback={
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100vh',
            }}
          >
            ...
          </div>
        }
      >
        <RequestComponent/>
      </Suspense>
    </div>
  );
}
