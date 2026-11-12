'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  FileBarChart2,
  ListChecks,
  Radio,
  Route,
  Settings2,
  Timer,
} from 'lucide-react';
import SelectorFechaHeader from './SelectorFechaHeader';

interface EncabezadoServiciosRutasProps {
  totalRutas: number;
  totalServicios: number;
  enCursoTotal: number;
  posicionesTotal: number;
  fechaIso: string;
  onFechaChange: (fecha: string) => void;
  esHoy: boolean;
  onHoy: () => void;
  toleranciaMin: number | null;
  onAbrirTolerancia: () => void;
}

// Cabecera institucional de "Servicios Rutas" con los mismos estilos de Gestión de Rutas y Conductores
const EncabezadoServiciosRutas: React.FC<EncabezadoServiciosRutasProps> = ({
  totalRutas,
  totalServicios,
  enCursoTotal,
  posicionesTotal,
  fechaIso,
  onFechaChange,
  esHoy,
  onHoy,
  toleranciaMin,
  onAbrirTolerancia,
}) => {
  return (
    <header className="shrink-0 bg-[#113EB9] shadow-sm">
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
              <span>SERVICIOS RUTAS</span>
            </h1>
          </div>

          <div className="h-7 w-[2px] rounded-full bg-white/20 self-center hidden lg:block" />

          {/* Métricas de monitoreo en vivo con diseño profesional */}
          <div className="hidden items-center rounded-lg border border-white/20 bg-black/20 p-1 text-white shadow-inner backdrop-blur-xs lg:flex">
            {/* Rutas activas */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-0.5 text-[12px]"
              title={`${totalRutas} rutas configuradas`}
            >
              <Route className="h-3.5 w-3.5 text-blue-200" />
              <span className="font-bold text-white">{totalRutas}</span>
              <span className="text-[11px] font-medium text-blue-200">rutas</span>
            </div>

            <div className="h-3.5 w-[1px] bg-white/20" />

            {/* Servicios del día */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-0.5 text-[12px]"
              title={`${totalServicios} servicios programados`}
            >
              <ListChecks className="h-3.5 w-3.5 text-blue-200" />
              <span className="font-bold text-white">{totalServicios}</span>
              <span className="text-[11px] font-medium text-blue-200">
                {totalServicios === 1 ? 'servicio' : 'servicios'}
              </span>
            </div>

            {/* En curso */}
            {enCursoTotal > 0 && (
              <>
                <div className="h-3.5 w-[1px] bg-white/20" />
                <div
                  className="flex items-center gap-1.5 rounded-md bg-emerald-500/25 px-2.5 py-0.5 text-[12px] font-semibold text-emerald-100 border border-emerald-400/30"
                  title={`${enCursoTotal} servicios en recorrido activo`}
                >
                  <span className="font-bold text-white">{enCursoTotal}</span>
                  <span className="text-[11px] font-medium text-emerald-200">en curso</span>
                </div>
              </>
            )}

            {/* En vivo (Posiciones GPS en tiempo real) */}
            {posicionesTotal > 0 && (
              <>
                <div className="h-3.5 w-[1px] bg-white/20" />
                <div
                  className="flex items-center gap-1.5 rounded-md bg-amber-500/25 px-2.5 py-0.5 text-[12px] font-semibold text-amber-100 border border-amber-400/30"
                  title={`${posicionesTotal} unidades transmitiendo GPS en vivo`}
                >
                  <Radio className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
                  <span className="font-bold text-white">{posicionesTotal}</span>
                  <span className="text-[11px] font-medium text-amber-200">en vivo</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Lado derecho: Selector de fecha, tolerancia, reportes y administrar rutas */}
        <div className="flex items-center gap-2 pr-4">
          <SelectorFechaHeader
            fechaIso={fechaIso}
            onFechaChange={onFechaChange}
            esHoy={esHoy}
            onHoy={onHoy}
          />

          <button
            type="button"
            onClick={onAbrirTolerancia}
            disabled={toleranciaMin === null}
            className="flex h-8 items-center gap-1.5 rounded-md border border-white/30 bg-white/10 px-3 text-[12px] font-medium text-white transition-colors hover:bg-white/15 disabled:opacity-50"
            title="Tolerancia para considerar un paradero a tiempo (configuración general)"
          >
            <Timer className="h-3.5 w-3.5 text-blue-200" />
            <span className="hidden sm:inline">
              Tolerancia{toleranciaMin !== null ? `: ±${toleranciaMin} min` : ''}
            </span>
          </button>

          <Link
            href="/trackvelnew/serviciosrutas/reportes"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-8 items-center gap-1.5 rounded-md border border-white/30 bg-white/10 px-3 text-[12px] font-medium text-white transition-colors hover:bg-white/15"
            title="Reportes de servicios y paradas (abre en nueva pestaña)"
          >
            <FileBarChart2 className="h-3.5 w-3.5 text-blue-200" />
            <span className="hidden sm:inline">Reportes</span>
          </Link>

          <Link
            href="/trackvelnew/serviciosrutas/rutas"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-8 items-center gap-1.5 rounded-md bg-white px-3.5 text-[12px] font-semibold text-[#113EB9] shadow-sm transition-colors hover:bg-blue-50"
            title="Administrar rutas (abre en nueva pestaña)"
          >
            <Settings2 className="h-3.5 w-3.5 text-[#113EB9]" />
            <span className="hidden sm:inline">Administrar rutas</span>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default EncabezadoServiciosRutas;
