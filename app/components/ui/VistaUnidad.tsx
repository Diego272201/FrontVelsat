import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { SiPagespeedinsights } from 'react-icons/si';
import { MdShutterSpeed } from 'react-icons/md';

interface Props {
  item: number;
  deviceId: string;
  kilometros: number;
}

export default function VistaUnidad({ item, deviceId, kilometros }: Props) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) observer.observe(ref.current);

    return () => {
      if (ref.current) observer.unobserve(ref.current);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="flex flex-col md:flex-row items-center bg-white p-4 gap-4 w-full max-w-2xl mx-auto animate-fade-in  border-b border-gray-300"
    >
      {/* Imagen + Info Unidad */}
      <div className="flex flex-col items-center text-center md:w-1/2">
        <div className="text-sm font-semibold bg-orange-100 text-orange-600 px-3 py-1 rounded mb-2">
          ITEM N° {item}
        </div>

        {isVisible && (
          <Image
            src="/UnidadK.webp"
            width={140}
            height={140}
            alt="Unidad"
            className="rounded-lg"
            loading="lazy"
          />
        )}

        <div className="flex items-center gap-2 mt-3 text-gray-700 text-sm">
          <SiPagespeedinsights className="text-blue-500 text-lg" />
          <span className="font-medium">Unidad:</span>
          <span className="uppercase">{deviceId}</span>
        </div>
      </div>

      {/* Separador */}
      <div className="hidden md:block border-l h-24 mx-4"></div>

      {/* Kilómetros */}
      <div className="flex flex-col items-center md:w-1/2">
        <div className="text-3xl font-bold text-blue-600">{kilometros} KM</div>
        <div className="flex items-center gap-2 mt-2 text-gray-600 text-sm">
          <MdShutterSpeed className="text-orange-500 text-xl" />
          <span>Kilómetros recorridos</span>
        </div>
      </div>
    </div>
  );
}
