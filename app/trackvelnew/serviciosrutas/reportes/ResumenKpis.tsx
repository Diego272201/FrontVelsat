'use client';

import React from 'react';
import {
  Clock,
  Bus,
  MapPin,
  TrendingUp,
  AlertTriangle,
  FastForward,
} from 'lucide-react';
import { ResumenKpisData } from './types';

interface ResumenKpisProps {
  kpis: ResumenKpisData;
}

const ResumenKpis: React.FC<ResumenKpisProps> = ({ kpis }) => {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {/* 1. Total Servicios - Azul Corporativo */}
      <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs transition-all hover:border-blue-300 hover:shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Servicios</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Bus className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="text-[24px] font-black tracking-tight text-blue-900">{kpis.totalServicios}</div>
          <p className="text-[11px] font-medium text-slate-500">Rutas analizadas</p>
        </div>
      </div>

      {/* 2. Paradas Auditadas - Azul Corporativo */}
      <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs transition-all hover:border-blue-300 hover:shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Paradas</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <MapPin className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="text-[24px] font-black tracking-tight text-blue-900">{kpis.totalParadas}</div>
          <p className="text-[11px] font-medium text-slate-500">{kpis.paradasCompletadas} ejecutadas</p>
        </div>
      </div>

      {/* 3. Puntualidad - Verde Esmeralda */}
      <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs transition-all hover:border-emerald-300 hover:shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Puntualidad</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <TrendingUp className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="text-[24px] font-black tracking-tight text-emerald-600">
            {kpis.porcentajePuntualidad}%
          </div>
          <p className="text-[11px] font-medium text-slate-500">{kpis.paradasATiempo} a tiempo</p>
        </div>
      </div>

      {/* 4. Retrasadas - Rojo Alerta */}
      <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs transition-all hover:border-rose-300 hover:shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Retrasadas</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
            <AlertTriangle className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="text-[24px] font-black tracking-tight text-rose-600">{kpis.paradasRetrasadas}</div>
          <p className="text-[11px] font-medium text-slate-500">&gt; 3 min demora</p>
        </div>
      </div>

      {/* 5. Adelantadas - Rojo Alerta (Desvío horario) */}
      <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs transition-all hover:border-rose-300 hover:shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Adelantadas</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
            <FastForward className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="text-[24px] font-black tracking-tight text-rose-600">{kpis.paradasAdelantadas}</div>
          <p className="text-[11px] font-medium text-slate-500">&gt; 2 min anticipo</p>
        </div>
      </div>

      {/* 6. Estancia - Azul Corporativo */}
      <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs transition-all hover:border-blue-300 hover:shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Estancia</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Clock className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="text-[24px] font-black tracking-tight text-blue-900">
            {kpis.promedioPermanenciaMin} <span className="text-[14px] font-bold text-slate-500">min</span>
          </div>
          <p className="text-[11px] font-medium text-slate-500">Total: {kpis.tiempoTotalEnParadasMin} min</p>
        </div>
      </div>
    </div>
  );
};

export default ResumenKpis;
