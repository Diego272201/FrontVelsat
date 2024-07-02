'use client';
import RequestPageDetail from '@/app/request/mapDetails'
import React, { useEffect } from 'react';
import '@/app/styles/trackvelnew.css';

export default function Page() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Este código solo se ejecutará en el cliente
      console.log('Running on the client side');
    }
  }, []);
  if (!location) {
    // Renderiza un estado de carga o un mensaje de espera mientras se obtiene la localización
    return <div>Cargando...</div>;
  }
  return (
    <div className='trackvelnew'>
        <RequestPageDetail></RequestPageDetail>
    </div>
  )
}