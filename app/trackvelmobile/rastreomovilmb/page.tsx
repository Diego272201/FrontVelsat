'use client';
import React, { useState, useEffect } from 'react';
import RequestComponent from './RequestComponent';

export default function Page() {
  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1920,
  );

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    // Establecer el ancho inicial
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Determinar el clipPath según el ancho de la ventana
  const getClipPath = () => {
    if (windowWidth <= 830) {
      return 'none'; // Sin clipPath para pantallas pequeñas
    } else if (windowWidth <= 1380) {
      return 'polygon(0 0, 100% 0, 100% 95%, 82% 95%, 80% 28%, 19% 28%, 17% 100%, 0 100%)';
    } else {
      return 'polygon(0 0, 100% 0, 100% 95%, 90% 95%, 88% 28%, 19% 28%, 17% 100%, 0 100%)';
    }
  };

  return (
    <div className="relative">
      <div
        className="absolute left-0 right-0 top-0 z-10 shadow-lg"
        style={{
          backgroundColor: '#113eb9',
          clipPath: getClipPath(),
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-0 py-0">
          <div className="flex items-center gap-2 px-2 py-2">
            <h1 className="text-[13px] font-bold uppercase text-white">
              Trackvel Mobile
            </h1>
          </div>

          {/* Botón de Reporte */}
          <button className="mt-[-4px] bg-blue-800 px-3 py-[8px] text-[12px] font-medium text-white hover:bg-blue-700">
            Reporte de recorrido
          </button>
        </div>
      </div>

      <RequestComponent />
    </div>
  );
}
