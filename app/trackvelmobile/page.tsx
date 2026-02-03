'use client';
import React from 'react';
import RequestComponent from './RequestComponent';

export default function Page() {
  return (
    <div className="relative">
      <div
        className="absolute top-0 left-0 right-0 z-10 shadow-lg"
        style={{ 
          backgroundColor: '#113eb9',
          clipPath: 'polygon(0 0, 100% 0, 100% 95%, 90% 95%, 88% 28%, 19% 28%, 17% 100%, 0 100%)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-0 py-0">
          <div className="flex items-center px-2 py-2 gap-2">
            <h1 className="text-[13px] font-bold uppercase text-white p">
              Trackvel Mobile
            </h1>
          </div>

          {/* Botón de Reporte */}
          <button className="bg-blue-800 px-3 py-[8px] text-[12px] font-medium text-white hover:bg-blue-700 mt-[-4px] ">
            Reporte de recorrido
          </button>
        </div>
      </div>

      <RequestComponent />
    </div>
  );
}