'use client';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import RequestComponent from './RequestComponent';
import ModalDetalleRecorrido from './ModalDetalleRecorrido';

export default function Page() {
  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1920,
  );

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

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

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
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
        <div className="flex h-[36px] items-center justify-between px-0 py-0 overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="flex h-[36px] w-[46px] items-center justify-center bg-gradient-to-r from-orange-500 to-red-500 p-1">
              <Image
                src="/LogoWeb.png"
                alt="Logo"
                width={20}
                height={20}
                className="object-contain"
              />
            </div>
            <h1 className="text-[13px] font-bold uppercase text-white tracking-wider">
              Trackvel Mobile
            </h1>
          </div>

          {/* Botón de Reporte */}
          <button
            onClick={handleOpenModal}
            className="h-[36px] bg-blue-800 px-3 text-[12px] font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Reporte de recorrido
          </button>
        </div>
      </div>

      <RequestComponent />

      {/* Modal */}
      <ModalDetalleRecorrido isOpen={isModalOpen} onClose={handleCloseModal} />
    </div>
  );
}
