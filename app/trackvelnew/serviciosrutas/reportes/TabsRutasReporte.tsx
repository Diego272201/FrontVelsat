'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export interface TabRuta {
  id: number;
  codigo: string;
  nombre: string;
  /** Servicios de esta ruta en lo cargado (con los demás filtros aplicados). */
  cantidad: number;
}

interface TabsRutasReporteProps {
  tabs: TabRuta[];
  /** Total de servicios (pestaña "Todos"). */
  total: number;
  seleccionada: number | 'TODOS';
  onSeleccionar: (id: number | 'TODOS') => void;
}

const TabsRutasReporte: React.FC<TabsRutasReporteProps> = ({ tabs, total, seleccionada, onSeleccionar }) => {
  const [mostrarTodas, setMostrarTodas] = useState<boolean>(false);

  const hayVacias = tabs.some((t) => t.cantidad === 0);
  const tabsVisibles = mostrarTodas || !hayVacias
    ? tabs
    : tabs.filter((t) => t.cantidad > 0 || t.id === seleccionada);

  const numOcultas = tabs.length - tabsVisibles.length;

  const clase = (activa: boolean) =>
    `flex shrink-0 items-center gap-1.5 border-b-2 px-3.5 py-2 text-[12px] font-semibold transition-colors ${
      activa
        ? 'border-[#113EB9] text-[#113EB9]'
        : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
    }`;

  const contador = (n: number, activa: boolean) => (
    <span
      className={`rounded-full px-1.5 py-px font-mono text-[10.5px] font-semibold ${
        activa
          ? 'bg-blue-100 text-[#113EB9]'
          : n > 0
            ? 'bg-slate-100 text-slate-600'
            : 'bg-slate-50 text-slate-400'
      }`}
    >
      {n}
    </span>
  );

  return (
    <div
      role="tablist"
      className="flex items-center overflow-x-auto rounded-xl border border-slate-200 bg-white px-1.5 shadow-xs"
    >
      <button
        type="button"
        role="tab"
        aria-selected={seleccionada === 'TODOS'}
        onClick={() => onSeleccionar('TODOS')}
        className={clase(seleccionada === 'TODOS')}
      >
        <span>Todos</span>
        {contador(total, seleccionada === 'TODOS')}
      </button>

      {tabsVisibles.map((t) => {
        const activa = seleccionada === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={activa}
            onClick={() => onSeleccionar(t.id)}
            title={t.nombre}
            className={clase(activa)}
          >
            <span className="font-mono">{t.codigo}</span>
            {contador(t.cantidad, activa)}
          </button>
        );
      })}

      {hayVacias && numOcultas > 0 && !mostrarTodas && (
        <button
          type="button"
          onClick={() => setMostrarTodas(true)}
          className="ml-auto flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-colors"
          title="Ver rutas que no tuvieron servicios en este rango"
        >
          <span>+{numOcultas} sin servicios</span>
          <ChevronDown className="h-3 w-3" />
        </button>
      )}

      {hayVacias && mostrarTodas && (
        <button
          type="button"
          onClick={() => setMostrarTodas(false)}
          className="ml-auto flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-colors"
          title="Ocultar rutas sin servicios"
        >
          <span>Ocultar vacías</span>
          <ChevronUp className="h-3 w-3" />
        </button>
      )}
    </div>
  );
};

export default TabsRutasReporte;
