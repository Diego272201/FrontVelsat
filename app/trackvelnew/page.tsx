export const dynamic = 'force-dynamic'; // Esta línea debe ir sola antes de todo

import React, { Suspense } from 'react';
import loadable from 'next/dynamic'; // Renombramos para evitar conflicto

const RequestPage = loadable(() => import('../request/page'), { ssr: false });
import '@/app/styles/trackvelnew.css';
import Tollbar from '../components/Tollbar';

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

              


        <RequestPage />
      </Suspense>
    </div>
  );
}
