'use client';

import React from 'react';
import {
  CalendarDays,
  Search,
  FileSpreadsheet,
  FileText,
  RotateCcw,
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
  onLimpiarFiltros?: () => void;
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
  onLimpiarFiltros,
}) => {
  const hoyIso = getIsoToday();
  const ayerIso = getIsoDesplazado(-1);
  const hace6Iso = getIsoDesplazado(-6);

  const hayFiltrosSecundarios =
    estadoServicio !== 'TODOS' ||
    Boolean(unidad) ||
    estadoFiltro !== 'TODOS' ||
    Boolean(busqueda.trim());

  const handleLimpiar = () => {
    if (onLimpiarFiltros) {
      onLimpiarFiltros();
    } else {
      onEstadoServicioChange('TODOS');
      onUnidadChange('');
      onEstadoFiltroChange('TODOS');
      onBusquedaChange('');
    }
  };

  const botonPreset = (activo: boolean) =>
    `h-7 rounded-md px-2.5 text-[11.5px] font-bold transition-all ${
      activo
        ? 'bg-[#113EB9] text-white shadow-2xs'
        : 'text-slate-700 hover:bg-slate-200 hover:text-slate-900'
    }`;

  return (
    <div className="w-full border-b border-gray-200 bg-white px-4 py-2.5 space-y-2">
      {/* FILA 1: Parámetros del Reporte (Fechas, Presets, Estado, Unidad y Puntualidad) */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Fechas */}
          <div className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-[12px]">
            <CalendarDays className="h-3.5 w-3.5 text-[#113EB9] shrink-0" />
            <input
              type="date"
              value={desdeIso}
              max={hastaIso}
              onChange={(e) => e.target.value && onRangoChange(e.target.value, hastaIso)}
              className="cursor-pointer bg-transparent font-bold text-slate-800 outline-none text-[12px]"
              title="Fecha desde"
            />
            <span className="font-semibold text-slate-400 px-0.5 text-[11px]">al</span>
            <input
              type="date"
              value={hastaIso}
              min={desdeIso}
              onChange={(e) => e.target.value && onRangoChange(desdeIso, e.target.value)}
              className="cursor-pointer bg-transparent font-bold text-slate-800 outline-none text-[12px]"
              title="Fecha hasta"
            />
          </div>

          {/* Accesos rápidos */}
          <div className="flex items-center gap-0.5 rounded-md border border-gray-300 bg-slate-100 p-0.5">
            <button
              type="button"
              onClick={() => onRangoChange(hoyIso, hoyIso)}
              className={botonPreset(desdeIso === hoyIso && hastaIso === hoyIso)}
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => onRangoChange(ayerIso, ayerIso)}
              className={botonPreset(desdeIso === ayerIso && hastaIso === ayerIso)}
            >
              Ayer
            </button>
            <button
              type="button"
              onClick={() => onRangoChange(hace6Iso, hoyIso)}
              className={botonPreset(desdeIso === hace6Iso && hastaIso === hoyIso)}
            >
              7 días
            </button>
          </div>
        </div>

        {/* Filtros de Afinación */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={estadoServicio}
            onChange={(e) => onEstadoServicioChange(e.target.value as FiltroEstadoServicio)}
            title="Estado del servicio"
            className="h-7 rounded-md border border-gray-300 bg-white px-2 text-[12px] font-bold text-slate-800 focus:border-[#113EB9] focus:outline-none cursor-pointer"
          >
            <option value="TODOS">Todos los estados</option>
            <option value="FINALIZADO">Finalizados</option>
            <option value="EN_CURSO">En curso</option>
            <option value="PROGRAMADO">Programados</option>
            <option value="CANCELADO">Cancelados</option>
          </select>

          <select
            value={unidad}
            onChange={(e) => onUnidadChange(e.target.value)}
            title="Unidad / Vehículo"
            className="h-7 rounded-md border border-gray-300 bg-white px-2 text-[12px] font-bold text-slate-800 focus:border-[#113EB9] focus:outline-none cursor-pointer"
          >
            <option value="">Todas las unidades</option>
            {unidades.map((u) => (
              <option key={u} value={u}>
                Unidad {u}
              </option>
            ))}
          </select>

          {/* Segmentador de Puntualidad */}
          <div className="flex items-center gap-0.5 rounded-md border border-gray-300 bg-slate-100 p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => onEstadoFiltroChange('TODOS')}
              className={`flex h-6 items-center gap-1.5 rounded px-2 font-bold transition-all ${
                estadoFiltro === 'TODOS'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              Todos
            </button>
            <button
              type="button"
              onClick={() => onEstadoFiltroChange('A_TIEMPO')}
              className={`flex h-6 items-center gap-1.5 rounded px-2 font-bold transition-all ${
                estadoFiltro === 'A_TIEMPO'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${estadoFiltro === 'A_TIEMPO' ? 'bg-white' : 'bg-emerald-500'}`} />
              A tiempo
            </button>
            <button
              type="button"
              onClick={() => onEstadoFiltroChange('RETRASADO')}
              className={`flex h-6 items-center gap-1.5 rounded px-2 font-bold transition-all ${
                estadoFiltro === 'RETRASADO'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-rose-700'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${estadoFiltro === 'RETRASADO' ? 'bg-white' : 'bg-rose-500'}`} />
              Retrasados
            </button>
            <button
              type="button"
              onClick={() => onEstadoFiltroChange('ADELANTADO')}
              className={`flex h-6 items-center gap-1.5 rounded px-2 font-bold transition-all ${
                estadoFiltro === 'ADELANTADO'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-blue-700'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${estadoFiltro === 'ADELANTADO' ? 'bg-white' : 'bg-blue-500'}`} />
              Adelantados
            </button>
          </div>
        </div>
      </div>

      {/* FILA 2: Buscador completo + Acciones */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
        <div className="relative min-w-[280px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => onBusquedaChange(e.target.value)}
            placeholder="Buscar por paradero, placa, conductor o código de ruta..."
            className="h-7 w-full rounded-md border border-gray-300 bg-white pl-8 pr-8 text-[12px] font-medium text-slate-800 placeholder:text-slate-400 focus:border-[#113EB9] focus:outline-none focus:ring-1 focus:ring-[#113EB9]"
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

        <div className="flex items-center gap-2">
          {hayFiltrosSecundarios && (
            <button
              type="button"
              onClick={handleLimpiar}
              className="flex h-7 items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2.5 text-[11.5px] font-bold text-[#113EB9] hover:bg-blue-100 transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Restablecer</span>
            </button>
          )}

          <button
            type="button"
            onClick={onExportarExcel}
            disabled={exportandoExcel}
            className="flex h-7 items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-3 text-[11.5px] font-bold text-emerald-800 transition-colors hover:bg-emerald-100 disabled:opacity-50"
            title="Descargar en formato Excel"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-[#107C41]" />
            <span>Excel</span>
          </button>

          <button
            type="button"
            onClick={onExportarPdf}
            disabled={exportandoPdf}
            className="flex h-7 items-center gap-1.5 rounded-md border border-rose-300 bg-rose-50 px-3 text-[11.5px] font-bold text-rose-800 transition-colors hover:bg-rose-100 disabled:opacity-50"
            title="Descargar en formato PDF"
          >
            <FileText className="h-3.5 w-3.5 text-[#E11D48]" />
            <span>PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default FiltrosReporte;
