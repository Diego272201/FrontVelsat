'use client';

import React from 'react';
import { FolderKanban, Route as RouteIcon } from 'lucide-react';

export interface RutaItemInfo {
  id: number;
  codigo: string;
  nombre: string;
  grupo: string;
  cantidadServicios: number;
}

export interface GrupoItemInfo {
  nombre: string;
  cantidadServicios: number;
  totalRutas: number;
  rutas: RutaItemInfo[];
}

interface NavegadorGruposRutasProps {
  grupos: GrupoItemInfo[];
  totalServicios: number;
  grupoSeleccionado: string | 'TODOS';
  onSeleccionarGrupo: (g: string | 'TODOS') => void;
  rutaSeleccionada: number | 'TODOS';
  onSeleccionarRuta: (r: number | 'TODOS') => void;
}

const NavegadorGruposRutas: React.FC<NavegadorGruposRutasProps> = ({
  grupos,
  totalServicios,
  grupoSeleccionado,
  onSeleccionarGrupo,
  rutaSeleccionada,
  onSeleccionarRuta,
}) => {
  const grupoActivo =
    grupoSeleccionado !== 'TODOS'
      ? grupos.find((g) => g.nombre === grupoSeleccionado)
      : null;

  return (
    <div className="w-full border-b border-gray-200 bg-[#f8fafc]">
      {/* 1. Barra de Tabs por GRUPO (Estilo compacto corporativo idéntico a Servicios Turismo) */}
      <div className="flex items-center gap-1 overflow-x-auto px-4 pt-1.5">
        {/* Tab: Todos los grupos */}
        <button
          type="button"
          role="tab"
          aria-selected={grupoSeleccionado === 'TODOS'}
          onClick={() => {
            onSeleccionarGrupo('TODOS');
            onSeleccionarRuta('TODOS');
          }}
          className={`flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-1.5 text-[12px] transition-colors ${
            grupoSeleccionado === 'TODOS'
              ? 'border-[#113EB9] font-bold text-[#113EB9] bg-white rounded-t-md'
              : 'border-transparent font-medium text-gray-500 hover:text-gray-800'
          }`}
        >
          <FolderKanban className="h-3.5 w-3.5" />
          <span>Todos los grupos</span>
          <span
            className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] font-bold ${
              grupoSeleccionado === 'TODOS'
                ? 'bg-blue-50 text-[#113EB9]'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {totalServicios}
          </span>
        </button>

        {/* Tabs de cada Grupo */}
        {grupos.map((g) => {
          const activo = grupoSeleccionado === g.nombre;
          return (
            <button
              key={g.nombre}
              type="button"
              role="tab"
              aria-selected={activo}
              onClick={() => {
                onSeleccionarGrupo(g.nombre);
                onSeleccionarRuta('TODOS');
              }}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-1.5 text-[12px] transition-colors ${
                activo
                  ? 'border-[#113EB9] font-bold text-[#113EB9] bg-white rounded-t-md'
                  : 'border-transparent font-medium text-gray-500 hover:text-gray-800'
              }`}
            >
              <span>{g.nombre}</span>
              <span
                className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                  activo
                    ? 'bg-blue-50 text-[#113EB9]'
                    : g.cantidadServicios > 0
                      ? 'bg-gray-100 text-gray-600'
                      : 'bg-gray-100/60 text-gray-400'
                }`}
              >
                {g.cantidadServicios}
              </span>
            </button>
          );
        })}
      </div>

      {/* 2. Sub-barra de Rutas cuando se selecciona un grupo */}
      {grupoActivo && (
        <div className="flex items-center gap-1.5 overflow-x-auto border-t border-gray-200 bg-white px-4 py-2 text-[12px]">
          <div className="flex items-center gap-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider mr-1">
            <RouteIcon className="h-3.5 w-3.5 text-[#113EB9]" />
            <span>Rutas:</span>
          </div>

          <button
            type="button"
            onClick={() => onSeleccionarRuta('TODOS')}
            className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-[11.5px] transition-colors ${
              rutaSeleccionada === 'TODOS'
                ? 'bg-blue-50 text-[#113EB9] font-bold border border-blue-200'
                : 'text-gray-600 hover:bg-gray-100 font-medium'
            }`}
          >
            <span>Todas ({grupoActivo.cantidadServicios})</span>
          </button>

          {grupoActivo.rutas.map((r) => {
            const activa = rutaSeleccionada === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => onSeleccionarRuta(r.id)}
                title={r.nombre}
                className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-[11.5px] transition-colors ${
                  activa
                    ? 'bg-blue-50 text-[#113EB9] font-bold border border-blue-200'
                    : 'text-gray-700 hover:bg-gray-100 font-medium'
                }`}
              >
                <span className="font-mono font-bold">{r.codigo}</span>
                <span className="max-w-[160px] truncate">{r.nombre}</span>
                <span className="rounded-full bg-gray-100 px-1.5 font-mono text-[10px] font-bold text-gray-600">
                  {r.cantidadServicios}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NavegadorGruposRutas;
