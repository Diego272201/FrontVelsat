'use client';

import React from 'react';
import {
  CalendarDays,
  Search,
  FileSpreadsheet,
  FileText,
  Filter,
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
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Controles de Filtrado: Fecha, Rutas, Estado */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Selector de Fecha */}
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50/80 px-2.5 py-1.5 text-[12.5px]">
            <CalendarDays className="h-4 w-4 text-[#1E40AF]" />
            <input
              type="date"
              value={fechaIso}
              onChange={(e) => e.target.value && onFechaChange(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 outline-none"
            />
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onFechaChange(hoyIso)}
              className={`rounded-lg px-2.5 py-1.5 text-[11.5px] font-bold transition-colors ${
                fechaIso === hoyIso
                  ? 'bg-[#1E40AF] text-white shadow-xs'
                  : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={setFechaAyer}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11.5px] font-semibold text-slate-700 hover:bg-slate-50"
            >
              Ayer
            </button>
          </div>

          <div className="h-5 w-[1px] bg-slate-200" />

          {/* Selector de Ruta */}
          <div className="flex items-center gap-1.5">
            <label className="text-[12px] font-bold text-slate-700">Ruta:</label>
            <select
              value={rutaId}
              onChange={(e) => {
                const val = e.target.value;
                onRutaChange(val === 'TODAS' ? 'TODAS' : Number(val));
              }}
              className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-[12.5px] font-semibold text-slate-800 focus:border-[#1E40AF] focus:outline-none"
            >
              <option value="TODAS">Todas las rutas</option>
              {rutasOpciones.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.codigo} - {r.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro de Estado de Puntualidad */}
          <div className="flex items-center gap-1.5">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={estadoFiltro}
              onChange={(e) => onEstadoFiltroChange(e.target.value as 'TODOS' | EstadoPuntualidad)}
              className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-[12.5px] font-semibold text-slate-800 focus:border-[#1E40AF] focus:outline-none"
            >
              <option value="TODOS">Todos los estados</option>
              <option value="A_TIEMPO">A tiempo</option>
              <option value="RETRASADO">Retrasados</option>
              <option value="ADELANTADO">Adelantados</option>
              <option value="OMITIDO">Omitidos</option>
            </select>
          </div>
        </div>

        {/* Botones de Descarga Excel y PDF con colores vivos distintivos */}
        <div className="flex items-center gap-2">
          {/* Botón Excel: Verde Corporativo Oficial */}
          <button
            type="button"
            onClick={onExportarExcel}
            disabled={exportandoExcel}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-emerald-700 bg-[#107C41] px-3.5 text-[12.5px] font-bold text-white shadow-xs transition-colors hover:bg-[#0c6233] disabled:opacity-50"
            title="Descargar reporte en formato Excel (.xlsx)"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-100" />
            <span>{exportandoExcel ? 'Generando...' : 'Descargar Excel'}</span>
          </button>

          {/* Botón PDF: Rojo Corporativo Oficial */}
          <button
            type="button"
            onClick={onExportarPdf}
            disabled={exportandoPdf}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-rose-800 bg-[#E11D48] px-3.5 text-[12.5px] font-bold text-white shadow-xs transition-colors hover:bg-[#BE123C] disabled:opacity-50"
            title="Descargar reporte en formato PDF (.pdf)"
          >
            <FileText className="h-4 w-4 text-rose-100" />
            <span>{exportandoPdf ? 'Generando...' : 'Descargar PDF'}</span>
          </button>
        </div>
      </div>

      {/* Buscador de texto rápido */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={busqueda}
          onChange={(e) => onBusquedaChange(e.target.value)}
          placeholder="Buscar por parada, placa de unidad, conductor o ruta..."
          className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/60 pl-9 pr-9 text-[12.5px] text-slate-800 placeholder:text-slate-400 focus:border-[#1E40AF] focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
        {busqueda && (
          <button
            type="button"
            onClick={() => onBusquedaChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default FiltrosReporte;
