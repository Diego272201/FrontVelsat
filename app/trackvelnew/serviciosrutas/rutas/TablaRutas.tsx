'use client';

import React from 'react';
import { Pencil, Route as RouteIcon } from 'lucide-react';
import { Ruta } from '../types';

interface TablaRutasProps {
  rutas: readonly Ruta[];
  cargando: boolean;
  /** Hay rutas en total (para distinguir "no hay ninguna" de "el filtro no coincide"). */
  hayRutas: boolean;
  onEditar: (ruta: Ruta) => void;
  onToggleActivo: (ruta: Ruta) => void;
}

const COLUMNAS = 9;

const MensajeFila: React.FC<{ texto: string }> = ({ texto }) => (
  <tr>
    <td colSpan={COLUMNAS} className="px-3 py-10 text-center text-slate-500">
      {texto}
    </td>
  </tr>
);

// Listado de rutas con su sentido, pareja, estado y acceso al editor.
const TablaRutas: React.FC<TablaRutasProps> = ({ rutas, cargando, hayRutas, onEditar, onToggleActivo }) => (
  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] border-collapse text-[12.5px]">
        <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-2.5 font-semibold">Ruta</th>
            <th className="px-3 py-2.5 font-semibold">Grupo</th>
            <th className="px-3 py-2.5 font-semibold">Sentido</th>
            <th className="px-3 py-2.5 font-semibold">Pareja</th>
            <th className="px-3 py-2.5 text-right font-semibold">Paraderos</th>
            <th className="px-3 py-2.5 text-right font-semibold">Duración</th>
            <th className="px-3 py-2.5 text-right font-semibold">Distancia</th>
            <th className="px-3 py-2.5 font-semibold">Estado</th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {rutas.map((r) => (
            <tr
              key={r.id}
              className={`border-t border-slate-100 transition hover:bg-blue-50/40 ${r.activo ? '' : 'text-slate-400'}`}
            >
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                    <RouteIcon className="h-4 w-4 text-blue-600" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800">{r.codigo}</p>
                    <p className="truncate text-[12px] text-slate-500">{r.nombre}</p>
                  </div>
                </div>
              </td>
              <td className="px-3 py-2.5">{r.grupo}</td>
              <td className="px-3 py-2.5">
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    r.sentido === 'REGRESO' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'
                  }`}
                >
                  {r.sentido === 'REGRESO' ? 'Regreso' : 'Ida'}
                </span>
              </td>
              <td className="px-3 py-2.5">{r.rutaParejaCodigo ?? '—'}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{r.cantidadParaderos}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{r.duracionMin} min</td>
              <td className="px-3 py-2.5 text-right tabular-nums">
                {r.distanciaKm != null ? `${r.distanciaKm} km` : '—'}
              </td>
              <td className="px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => onToggleActivo(r)}
                  title={r.activo ? 'Desactivar ruta' : 'Activar ruta'}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition ${
                    r.activo
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                  }`}
                >
                  {r.activo ? 'Activa' : 'Inactiva'}
                </button>
              </td>
              <td className="px-4 py-2.5 text-right">
                <button
                  type="button"
                  onClick={() => onEditar(r)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-[12px] font-medium text-slate-700 transition hover:border-blue-500 hover:text-blue-700"
                >
                  <Pencil className="h-3 w-3" />
                  Editar
                </button>
              </td>
            </tr>
          ))}
          {cargando && <MensajeFila texto="Cargando rutas…" />}
          {!cargando && rutas.length === 0 && (
            <MensajeFila
              texto={hayRutas ? 'Ninguna ruta coincide con el filtro.' : 'No hay rutas. Crea la primera con “Nueva ruta”.'}
            />
          )}
        </tbody>
      </table>
    </div>
  </div>
);

export default TablaRutas;
