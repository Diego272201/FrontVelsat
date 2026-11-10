'use client';

import React from 'react';
import Image from 'next/image';
import { Download, Plus, Route as RouteIcon } from 'lucide-react';

interface EncabezadoRutasProps {
  totalRutas: number;
  nuevaDeshabilitada: boolean;
  onNueva: () => void;
  onExportar: () => void;
  exportandoDeshabilitado: boolean;
}

// Cabecera institucional de "Gestión de Rutas" con diseño optimizado
const EncabezadoRutas: React.FC<EncabezadoRutasProps> = ({
  totalRutas,
  nuevaDeshabilitada,
  onNueva,
  onExportar,
  exportandoDeshabilitado,
}) => {
  return (
    <div className="bg-[#113EB9]">
      <div className="flex h-12 items-stretch justify-between">
        {/* Lado izquierdo: Logo Velsat con gradiente, divisor y subtítulo/título */}
        <div className="flex items-center gap-3">
          <div className="flex h-full items-center bg-gradient-to-r from-orange-500 to-red-500 px-4">
            <Image
              src="/LogoWeb.png"
              alt="Velsat"
              width={44}
              height={44}
              className="h-9 w-9 object-contain"
              priority
            />
          </div>
          <div className="h-7 w-[2px] rounded-full bg-white/40 self-center" />
          <div className="flex flex-col justify-center">
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-blue-200 leading-none mb-0.5">
              SERVICIOS / RUTAS
            </span>
            <h1 className="text-[14px] font-bold leading-none tracking-[0.01em] text-white flex items-center gap-1.5 uppercase">
              <span>GESTIÓN DE RUTAS</span>
            </h1>
          </div>
        </div>

        {/* Lado derecho: Contador, Exportar y Nueva ruta */}
        <div className="flex items-center gap-2 pr-4">
          <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[14px] font-semibold text-white">
            <RouteIcon className="h-3.5 w-3.5" />
            {totalRutas}
          </div>

          <button
            type="button"
            onClick={onExportar}
            disabled={exportandoDeshabilitado}
            className="flex h-8 items-center gap-1.5 rounded-md border border-white/30 bg-white/10 px-3 text-[12px] font-medium text-white transition-colors hover:bg-white/15 disabled:opacity-50"
            title="Exportar listado a Excel"
          >
            <Download className="h-3.5 w-3.5 text-blue-200" />
            <span>Exportar</span>
          </button>

          <button
            type="button"
            onClick={onNueva}
            disabled={nuevaDeshabilitada}
            className="flex h-8 items-center gap-1.5 rounded-md bg-white px-3.5 text-[12px] font-semibold text-[#113EB9] shadow-sm transition-colors hover:bg-blue-50 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Nueva ruta</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default EncabezadoRutas;
