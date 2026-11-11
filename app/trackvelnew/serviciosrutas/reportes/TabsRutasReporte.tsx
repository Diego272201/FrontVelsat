'use client';

import React from 'react';

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
  const clase = (activa: boolean) =>
    `flex shrink-0 items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-[12.5px] font-semibold transition-colors ${
      activa
        ? 'border-[#113EB9] text-[#113EB9]'
        : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
    }`;

  const contador = (n: number, activa: boolean) => (
    <span
      className={`rounded-full px-1.5 py-px font-mono text-[10.5px] font-bold ${
        activa ? 'bg-blue-100 text-[#113EB9]' : 'bg-slate-100 text-slate-500'
      }`}
    >
      {n}
    </span>
  );

  return (
    <div
      role="tablist"
      className="flex overflow-x-auto rounded-xl border border-slate-200 bg-white px-1.5 shadow-xs"
    >
      <button
        type="button"
        role="tab"
        aria-selected={seleccionada === 'TODOS'}
        onClick={() => onSeleccionar('TODOS')}
        className={clase(seleccionada === 'TODOS')}
      >
        Todos
        {contador(total, seleccionada === 'TODOS')}
      </button>

      {tabs.map((t) => {
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
    </div>
  );
};

export default TabsRutasReporte;
