'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Search } from 'lucide-react';

interface EncabezadoRutasProps {
  totalVisibles: number;
  busqueda: string;
  onBusqueda: (valor: string) => void;
  grupos: readonly string[];
  grupoFiltro: string;
  onGrupo: (grupo: string) => void;
  /** Cantidad de rutas por grupo ('TODOS' = el total). */
  cantidadPorGrupo: (grupo: string) => number;
  nuevaDeshabilitada: boolean;
  onNueva: () => void;
}

// Cabecera de "Administrar rutas": título, buscador, botón de nueva ruta y filtro por grupo.
const EncabezadoRutas: React.FC<EncabezadoRutasProps> = ({
  totalVisibles,
  busqueda,
  onBusqueda,
  grupos,
  grupoFiltro,
  onGrupo,
  cantidadPorGrupo,
  nuevaDeshabilitada,
  onNueva,
}) => (
  <div className="border-b border-slate-200 bg-white px-5 py-3">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Link
          href="/trackvelnew/serviciosrutas"
          className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-[12px] font-medium text-slate-700 transition hover:bg-slate-100"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Servicios
        </Link>
        <div>
          <h1 className="text-[17px] font-bold leading-tight text-slate-800">
            Administrar rutas
          </h1>
          <p className="text-[12px] text-slate-500">
            {totalVisibles} {totalVisibles === 1 ? 'ruta' : 'rutas'} · edita
            paraderos, tiempos y geocercas
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex h-9 w-60 items-center gap-2 rounded-lg border border-slate-300 bg-white px-2.5 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
          <Search className="h-3.5 w-3.5 text-slate-400" />
          <input
            value={busqueda}
            onChange={(e) => onBusqueda(e.target.value)}
            placeholder="Buscar por código o nombre…"
            className="min-w-0 flex-1 bg-transparent text-[12.5px] text-slate-800 outline-none placeholder:text-slate-400"
          />
        </div>
        <button
          type="button"
          onClick={onNueva}
          disabled={nuevaDeshabilitada}
          className="flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-[12.5px] font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Nueva ruta
        </button>
      </div>
    </div>

    <div className="mt-3 flex flex-wrap gap-1.5">
      {['TODOS', ...grupos].map((g) => {
        const activo = grupoFiltro === g;
        return (
          <button
            key={g}
            type="button"
            onClick={() => onGrupo(g)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium transition ${
              activo
                ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {g === 'TODOS' ? 'Todos los grupos' : g}
            <span
              className={`rounded-full px-1.5 text-[10.5px] font-bold ${
                activo
                  ? 'bg-white/25 text-white'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {cantidadPorGrupo(g)}
            </span>
          </button>
        );
      })}
    </div>
  </div>
);

export default EncabezadoRutas;
