'use client';

import React from 'react';
import { EstadoServicio, Ruta } from './types';
import { ESTADO_SERVICIO_LABEL } from './utils';

export type FiltroEstado = EstadoServicio | 'TODOS';

interface FiltrosRutasProps {
  rutas: Ruta[];
  grupos: readonly string[];
  /** Ids de las rutas seleccionadas. Vacío = todas. */
  rutasSeleccionadas: number[];
  onCambiarRutas: (ids: number[]) => void;
  estadoFiltro: FiltroEstado;
  onCambiarEstado: (estado: FiltroEstado) => void;
  fechaIso: string;
  onCambiarFecha: (fechaIso: string) => void;
}

const FiltrosRutas: React.FC<FiltrosRutasProps> = ({
  rutas,
  grupos,
  rutasSeleccionadas,
  onCambiarRutas,
  estadoFiltro,
  onCambiarEstado,
  fechaIso,
  onCambiarFecha,
}) => {
  const rutasActivas = rutas.filter((r) => r.activo);

  const toggleRuta = (id: number) => {
    onCambiarRutas(
      rutasSeleccionadas.includes(id)
        ? rutasSeleccionadas.filter((x) => x !== id)
        : [...rutasSeleccionadas, id],
    );
  };

  const toggleGrupo = (grupo: string) => {
    const ids = rutasActivas.filter((r) => r.grupo === grupo).map((r) => r.id);
    const todasMarcadas = ids.every((id) => rutasSeleccionadas.includes(id));
    onCambiarRutas(
      todasMarcadas
        ? rutasSeleccionadas.filter((id) => !ids.includes(id))
        : Array.from(new Set([...rutasSeleccionadas, ...ids])),
    );
  };

  const chip = (activo: boolean) =>
    `rounded-full border px-2.5 py-0.5 text-[12px] font-medium transition-colors ${
      activo
        ? 'border-blue-600 bg-blue-600 text-white'
        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
    }`;

  return (
    <div className="flex flex-col gap-2 border-b border-gray-200 bg-white px-4 py-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="flex items-center gap-2 text-[12px] font-medium text-gray-600">
          Fecha
          <input
            type="date"
            value={fechaIso}
            onChange={(e) => onCambiarFecha(e.target.value)}
            className="h-8 rounded-md border border-gray-300 px-2 text-[12px] text-gray-800"
          />
        </label>

        <label className="flex items-center gap-2 text-[12px] font-medium text-gray-600">
          Estado
          <select
            value={estadoFiltro}
            onChange={(e) => onCambiarEstado(e.target.value as FiltroEstado)}
            className="h-8 rounded-md border border-gray-300 px-2 text-[12px] text-gray-800"
          >
            <option value="TODOS">Todos</option>
            {(Object.keys(ESTADO_SERVICIO_LABEL) as EstadoServicio[]).map((e) => (
              <option key={e} value={e}>
                {ESTADO_SERVICIO_LABEL[e]}
              </option>
            ))}
          </select>
        </label>

        {rutasSeleccionadas.length > 0 && (
          <button
            type="button"
            onClick={() => onCambiarRutas([])}
            className="text-[12px] font-medium text-blue-600 hover:underline"
          >
            Ver todas las rutas
          </button>
        )}
      </div>

      {/* Rutas por grupo: sin selección se muestran todas */}
      <div className="flex flex-col gap-1.5">
        {grupos.map((grupo) => {
          const delGrupo = rutasActivas.filter((r) => r.grupo === grupo);
          if (delGrupo.length === 0) return null;
          const grupoCompleto = delGrupo.every((r) => rutasSeleccionadas.includes(r.id));
          return (
            <div key={grupo} className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => toggleGrupo(grupo)}
                className={`min-w-[72px] text-left text-[12px] font-bold ${
                  grupoCompleto ? 'text-blue-700' : 'text-gray-600 hover:text-blue-700'
                }`}
                title="Marcar / desmarcar todo el grupo"
              >
                {grupo}
              </button>
              {delGrupo.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => toggleRuta(r.id)}
                  className={chip(rutasSeleccionadas.includes(r.id))}
                >
                  {r.nombre}
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FiltrosRutas;
