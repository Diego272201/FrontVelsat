'use client';

import React from 'react';
import {
  CalendarDays,
  Search,
  FileSpreadsheet,
  FileText,
  X,
} from 'lucide-react';
import { EstadoServicio } from '../types';
import { EstadoPuntualidad } from './types';
import { getIsoDesplazado, getIsoToday } from '../utils';

export type FiltroEstadoServicio = 'TODOS' | EstadoServicio;

interface FiltrosReporteProps {
  desdeIso: string;
  hastaIso: string;
  onRangoChange: (desde: string, hasta: string) => void;
  estadoServicio: FiltroEstadoServicio;
  onEstadoServicioChange: (e: FiltroEstadoServicio) => void;
  unidad: string;
  onUnidadChange: (u: string) => void;
  unidades: string[];
  estadoFiltro: 'TODOS' | EstadoPuntualidad;
  onEstadoFiltroChange: (e: 'TODOS' | EstadoPuntualidad) => void;
  busqueda: string;
  onBusquedaChange: (b: string) => void;
  onExportarExcel: () => void;
  onExportarPdf: () => void;
  exportandoExcel: boolean;
  exportandoPdf: boolean;
}

const FiltrosReporte: React.FC<FiltrosReporteProps> = ({
  desdeIso,
  hastaIso,
  onRangoChange,
  estadoServicio,
  onEstadoServicioChange,
  unidad,
  onUnidadChange,
  unidades,
  estadoFiltro,
  onEstadoFiltroChange,
  busqueda,
  onBusquedaChange,
  onExportarExcel,
  onExportarPdf,
  exportandoExcel,
  exportandoPdf,
}) => {
  const hoyIso = getIsoToday();
  const ayerIso = getIsoDesplazado(-1);
  const hace6Iso = getIsoDesplazado(-6);

  const atajo = (activo: boolean) =>
    `h-8 rounded-lg px-2.5 text-[11.5px] font-semibold transition-colors ${
      activo ? 'bg-slate-200 text-slate-900 font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
    }`;

  const campoFecha =
    'flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] font-semibold text-slate-700 shadow-2xs hover:border-slate-300 cursor-pointer';

  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-slate-200 bg-white p-2.5 shadow-xs">
      {/* Rango de fechas y accesos rápidos */}
      <div className="flex flex-wrap items-center gap-1.5">
        <label className={campoFecha} title="Desde">
          <CalendarDays className="h-3.5 w-3.5 text-slate-500" />
          <input
            type="date"
            value={desdeIso}
            max={hastaIso}
            onChange={(e) => e.target.value && onRangoChange(e.target.value, hastaIso)}
            className="cursor-pointer bg-transparent text-[12px] font-semibold text-slate-800 outline-none"
          />
        </label>
        <span className="text-[11px] font-semibold text-slate-400">al</span>
        <label className={campoFecha} title="Hasta">
          <CalendarDays className="h-3.5 w-3.5 text-slate-500" />
          <input
            type="date"
            value={hastaIso}
            min={desdeIso}
            onChange={(e) => e.target.value && onRangoChange(desdeIso, e.target.value)}
            className="cursor-pointer bg-transparent text-[12px] font-semibold text-slate-800 outline-none"
          />
        </label>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onRangoChange(hoyIso, hoyIso)}
            className={atajo(desdeIso === hoyIso && hastaIso === hoyIso)}
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={() => onRangoChange(ayerIso, ayerIso)}
            className={atajo(desdeIso === ayerIso && hastaIso === ayerIso)}
          >
            Ayer
          </button>
          <button
            type="button"
            onClick={() => onRangoChange(hace6Iso, hoyIso)}
            className={atajo(desdeIso === hace6Iso && hastaIso === hoyIso)}
          >
            7 días
          </button>
        </div>
      </div>

      {/* Estado del servicio y unidad */}
      <div className="flex items-center gap-1.5">
        <select
          value={estadoServicio}
          onChange={(e) => onEstadoServicioChange(e.target.value as FiltroEstadoServicio)}
          title="Estado del servicio"
          className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] font-semibold text-slate-700 shadow-2xs hover:border-slate-300 focus:outline-none cursor-pointer"
        >
          <option value="TODOS">Todos los servicios</option>
          <option value="FINALIZADO">Finalizados</option>
          <option value="EN_CURSO">En curso</option>
          <option value="PROGRAMADO">Programados</option>
          <option value="CANCELADO">Cancelados</option>
        </select>
        <select
          value={unidad}
          onChange={(e) => onUnidadChange(e.target.value)}
          title="Unidad"
          className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] font-semibold text-slate-700 shadow-2xs hover:border-slate-300 focus:outline-none cursor-pointer"
        >
          <option value="">Todas las unidades</option>
          {unidades.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>

      {/* Filtro de Estado Segmentado (Pills) */}
      <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[11.5px]">
        <button
          type="button"
          onClick={() => onEstadoFiltroChange('TODOS')}
          className={`flex h-7 items-center gap-1.5 rounded-md px-2.5 font-semibold transition-all ${
            estadoFiltro === 'TODOS'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
          Todos
        </button>
        <button
          type="button"
          onClick={() => onEstadoFiltroChange('A_TIEMPO')}
          className={`flex h-7 items-center gap-1.5 rounded-md px-2.5 font-semibold transition-all ${
            estadoFiltro === 'A_TIEMPO'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          A tiempo
        </button>
        <button
          type="button"
          onClick={() => onEstadoFiltroChange('RETRASADO')}
          className={`flex h-7 items-center gap-1.5 rounded-md px-2.5 font-semibold transition-all ${
            estadoFiltro === 'RETRASADO'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
          Retrasados
        </button>
        <button
          type="button"
          onClick={() => onEstadoFiltroChange('ADELANTADO')}
          className={`flex h-7 items-center gap-1.5 rounded-md px-2.5 font-semibold transition-all ${
            estadoFiltro === 'ADELANTADO'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          Adelantados
        </button>
      </div>

      {/* Buscador Integrado */}
      <div className="relative min-w-[220px] flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={busqueda}
          onChange={(e) => onBusquedaChange(e.target.value)}
          placeholder="Buscar parada, placa o conductor"
          className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50/70 pl-8 pr-7 text-[12px] text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {busqueda && (
          <button
            type="button"
            onClick={() => onBusquedaChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Botones de Descarga Excel y PDF */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onExportarExcel}
          disabled={exportandoExcel}
          className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50 disabled:opacity-50"
          title="Descargar reporte en formato Excel"
        >
          <FileSpreadsheet className="h-3.5 w-3.5 text-[#107C41]" />
          <span>Excel</span>
        </button>

        <button
          type="button"
          onClick={onExportarPdf}
          disabled={exportandoPdf}
          className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50 disabled:opacity-50"
          title="Descargar reporte en formato PDF"
        >
          <FileText className="h-3.5 w-3.5 text-[#E11D48]" />
          <span>PDF</span>
        </button>
      </div>
    </div>
  );
};

export default FiltrosReporte;
