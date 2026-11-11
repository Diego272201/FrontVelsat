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
    <div className="w-full border-b border-gray-200 bg-[#fafafa] px-4 py-2">
      <div className="grid grid-cols-2 gap-y-2 sm:grid-cols-3 lg:grid-cols-6 lg:divide-x lg:divide-gray-200">
        {/* 1. SERVICIOS */}
        <div className="flex flex-col px-3 first:pl-0 last:pr-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            SERVICIOS
          </span>
          <div className="mt-0.5 text-[20px] font-semibold tracking-tight text-slate-800 leading-none">
            {kpis.totalServicios}
          </div>
          <span className="mt-1 text-[11px] font-normal text-slate-400">
            Servicios analizados
          </span>
        </div>

        {/* 2. PARADAS */}
        <div className="flex flex-col px-3 first:pl-0 last:pr-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            PARADAS
          </span>
          <div className="mt-0.5 text-[20px] font-semibold tracking-tight text-slate-800 leading-none">
            {kpis.totalParadas}
          </div>
          <span className="mt-1 text-[11px] font-normal text-slate-400">
            {kpis.paradasCompletadas} ejecutadas
          </span>
        </div>

        {/* 3. PUNTUALIDAD */}
        <div className="flex flex-col px-3 first:pl-0 last:pr-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            PUNTUALIDAD
          </span>
          <div className="mt-0.5 text-[20px] font-semibold tracking-tight text-slate-800 leading-none">
            {kpis.porcentajePuntualidad}%
          </div>
          <span className="mt-1 text-[11px] font-normal text-slate-400">
            {kpis.paradasATiempo} a tiempo
          </span>
        </div>

        {/* 4. RETRASADAS */}
        <div className="flex flex-col px-3 first:pl-0 last:pr-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            RETRASADAS
          </span>
          <div className="mt-0.5 text-[20px] font-semibold tracking-tight text-rose-600 leading-none">
            {kpis.paradasRetrasadas}
          </div>
          <span className="mt-1 text-[11px] font-normal text-slate-400">
            Más de {toleranciaMin} min demora
          </span>
        </div>

        {/* 5. ADELANTADAS */}
        <div className="flex flex-col px-3 first:pl-0 last:pr-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            ADELANTADAS
          </span>
          <div className="mt-0.5 text-[20px] font-semibold tracking-tight text-blue-600 leading-none">
            {kpis.paradasAdelantadas}
          </div>
          <span className="mt-1 text-[11px] font-normal text-slate-400">
            Más de {toleranciaMin} min anticipo
          </span>
        </div>

        {/* 6. ESTANCIA PROMEDIO */}
        <div className="flex flex-col px-3 first:pl-0 last:pr-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            ESTANCIA PROMEDIO
          </span>
          <div className="mt-0.5 text-[20px] font-semibold tracking-tight text-slate-800 leading-none">
            {formatoSegundos(kpis.promedioPermanenciaSeg)}
          </div>
          <span className="mt-1 text-[11px] font-normal text-slate-400">
            Total: {formatoSegundos(kpis.tiempoTotalEnParadasSeg)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ResumenKpis;
