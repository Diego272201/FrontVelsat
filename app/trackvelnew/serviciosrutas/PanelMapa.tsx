'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, PanelLeftClose, PanelLeftOpen, MapPin } from 'lucide-react';
import { Servicio } from './types';

interface PanelMapaProps {
  /** Servicios EN_CURSO dentro del filtro actual: son las unidades que irán en el mapa. */
  unidadesActivas: Servicio[];
  /** Texto con las rutas filtradas, ej. "Ruta 1, Ruta 2" o "Todas las rutas". */
  descripcionFiltro: string;
  /** El mapa ocupa todo el ancho y la lista de servicios se oculta. */
  ampliado: boolean;
  onToggleAmpliado: () => void;
}

// Contenedor del mapa. Por ahora es un placeholder gris: aquí irá el mapa (Leaflet, igual que
// geocercas) con las unidades en curso y los paraderos de las rutas filtradas.
const PanelMapa: React.FC<PanelMapaProps> = ({
  unidadesActivas,
  descripcionFiltro,
  ampliado,
  onToggleAmpliado,
}) => {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const [pantallaCompleta, setPantallaCompleta] = useState(false);

  useEffect(() => {
    const onChange = () => setPantallaCompleta(document.fullscreenElement === contenedorRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const togglePantallaCompleta = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void contenedorRef.current?.requestFullscreen();
    }
  };

  return (
    <div
      ref={contenedorRef}
      className="relative flex h-full min-h-[320px] w-full flex-col overflow-hidden rounded-md border border-gray-300 bg-gray-200"
    >
      {/* Barra de controles */}
      <div className="absolute right-2 top-2 z-10 flex gap-1">
        <button
          type="button"
          onClick={onToggleAmpliado}
          title={ampliado ? 'Mostrar lista de servicios' : 'Ampliar mapa'}
          className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-gray-700 shadow hover:bg-gray-100"
        >
          {ampliado ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={togglePantallaCompleta}
          title={pantallaCompleta ? 'Salir de pantalla completa' : 'Pantalla completa'}
          className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-gray-700 shadow hover:bg-gray-100"
        >
          {pantallaCompleta ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>

      {/* Resumen del filtro sobre el mapa */}
      <div className="absolute left-2 top-2 z-10 max-w-[70%] rounded-md bg-white/90 px-3 py-1.5 text-[12px] shadow">
        <div className="font-semibold text-gray-800">{descripcionFiltro}</div>
        <div className="text-gray-500">
          {unidadesActivas.length === 0
            ? 'Sin servicios en curso'
            : `${unidadesActivas.length} servicio${unidadesActivas.length === 1 ? '' : 's'} en curso: ${unidadesActivas
                .map((s) => s.deviceID)
                .join(', ')}`}
        </div>
      </div>

      {/* Placeholder del mapa */}
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-gray-400">
        <MapPin className="h-12 w-12" />
        <span className="text-sm font-medium">Aquí irá el mapa</span>
      </div>
    </div>
  );
};

export default PanelMapa;
