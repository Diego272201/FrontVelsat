'use client';

import React from 'react';
import { ResumenKpisData } from './types';
import { formatoSegundos } from '../utils';

interface ResumenKpisProps {
  kpis: ResumenKpisData;
  /** Tolerancia configurada de la cuenta (± minutos para estar "a tiempo"). */
  toleranciaMin?: number;
}

const ResumenKpis: React.FC<ResumenKpisProps> = ({ kpis, toleranciaMin = 5 }) => {
  return (
    <div className="grid grid-cols-2 gap-y-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs sm:grid-cols-3 lg:grid-cols-6 lg:divide-x lg:divide-slate-100">
      {/* 1. SERVICIOS */}
      <div className="flex flex-col px-3 first:pl-1 last:pr-1">
        <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
          SERVICIOS
        </span>
        <div className="mt-1 text-[26px] font-black tracking-tight text-slate-900 leading-none">
          {kpis.totalServicios}
        </div>
        <span className="mt-1.5 text-[11px] font-medium text-slate-500">
          Servicios analizados
        </span>
      </div>

      {/* 2. PARADAS */}
      <div className="flex flex-col px-3 first:pl-1 last:pr-1">
        <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
          PARADAS
        </span>
        <div className="mt-1 text-[26px] font-black tracking-tight text-slate-900 leading-none">
          {kpis.totalParadas}
        </div>
        <span className="mt-1.5 text-[11px] font-medium text-slate-500">
          {kpis.paradasCompletadas} ejecutadas
        </span>
      </div>

      {/* 3. PUNTUALIDAD */}
      <div className="flex flex-col px-3 first:pl-1 last:pr-1">
        <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
          PUNTUALIDAD
        </span>
        <div className="mt-1 text-[26px] font-black tracking-tight text-slate-900 leading-none">
          {kpis.porcentajePuntualidad}%
        </div>
        <span className="mt-1.5 text-[11px] font-medium text-slate-500">
          {kpis.paradasATiempo} a tiempo
        </span>
      </div>

      {/* 4. RETRASADAS */}
      <div className="flex flex-col px-3 first:pl-1 last:pr-1">
        <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
          RETRASADAS
        </span>
        <div className="mt-1 text-[26px] font-black tracking-tight text-rose-600 leading-none">
          {kpis.paradasRetrasadas}
        </div>
        <span className="mt-1.5 text-[11px] font-medium text-slate-500">
          Más de {toleranciaMin} min de demora
        </span>
      </div>

      {/* 5. ADELANTADAS */}
      <div className="flex flex-col px-3 first:pl-1 last:pr-1">
        <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
          ADELANTADAS
        </span>
        <div className="mt-1 text-[26px] font-black tracking-tight text-slate-900 leading-none">
          {kpis.paradasAdelantadas}
        </div>
        <span className="mt-1.5 text-[11px] font-medium text-slate-500">
          Más de {toleranciaMin} min de anticipo
        </span>
      </div>

      {/* 6. ESTANCIA PROMEDIO */}
      <div className="flex flex-col px-3 first:pl-1 last:pr-1">
        <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
          ESTANCIA PROMEDIO
        </span>
        <div className="mt-1 text-[26px] font-black tracking-tight text-slate-900 leading-none">
          {formatoSegundos(kpis.promedioPermanenciaSeg)}
        </div>
        <span className="mt-1.5 text-[11px] font-medium text-slate-500">
          Total: {formatoSegundos(kpis.tiempoTotalEnParadasSeg)}
        </span>
      </div>
    </div>
  );
};

export default ResumenKpis;
