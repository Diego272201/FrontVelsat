'use client';

import React from 'react';
import {
  CalendarDays,
  Search,
  FileSpreadsheet,
  FileText,
  X,
} from 'lucide-react';
import { EstadoPuntualidad } from './types';
import { getIsoToday } from '../utils';

interface RutaOpcion {
  id: number;
  codigo: string;
  nombre: string;
}

interface FiltrosReporteProps {
  fechaIso: string;
  onFechaChange: (f: string) => void;
  rutaId: number | 'TODAS';
  onRutaChange: (id: number | 'TODAS') => void;
  rutasOpciones: RutaOpcion[];
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
  fechaIso,
  onFechaChange,
  rutaId,
  onRutaChange,
  rutasOpciones,
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

  const setFechaAyer = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    onFechaChange(`${yyyy}-${mm}-${dd}`);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-slate-200 bg-white p-2.5 shadow-xs">
      {/* Selector de Fecha y accesos rápidos */}
      <div className="flex items-center gap-1.5">
        <label className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] font-semibold text-slate-700 shadow-2xs hover:border-slate-300 cursor-pointer">
          <CalendarDays className="h-3.5 w-3.5 text-slate-500" />
          <input
            type="date"
            value={fechaIso}
            onChange={(e) => e.target.value && onFechaChange(e.target.value)}
            className="cursor-pointer bg-transparent text-[12px] font-semibold text-slate-800 outline-none"
          />
        </label>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onFechaChange(hoyIso)}
            className={`h-8 rounded-lg px-2.5 text-[11.5px] font-semibold transition-colors ${
              fechaIso === hoyIso
                ? 'bg-slate-200 text-slate-900 font-bold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={setFechaAyer}
            className="h-8 rounded-lg bg-slate-100 px-2.5 text-[11.5px] font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Ayer
          </button>
        </div>
      </div>

      {/* Selector de Ruta */}
      <div className="flex items-center">
        <select
          value={rutaId}
          onChange={(e) => {
            const val = e.target.value;
            onRutaChange(val === 'TODAS' ? 'TODAS' : Number(val));
          }}
          className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] font-semibold text-slate-700 shadow-2xs hover:border-slate-300 focus:outline-none cursor-pointer"
        >
          <option value="TODAS">Todas las rutas</option>
          {rutasOpciones.map((r) => (
            <option key={r.id} value={r.id}>
              {r.codigo} - {r.nombre}
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
          placeholder="Buscar parada, placa, conductor o ruta"
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
