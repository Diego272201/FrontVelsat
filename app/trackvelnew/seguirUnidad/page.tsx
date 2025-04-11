'use client'
import dynamic from 'next/dynamic';

const SeguirUnidad = dynamic(() => import('@/app/request/seguirUnidad'), { ssr: false });
import React from 'react';
import '@/app/styles/trackvelnew.css';

export default function page() {

  return (
      <div className="trackvelnew">
        <SeguirUnidad></SeguirUnidad>
      </div>
  );
}
