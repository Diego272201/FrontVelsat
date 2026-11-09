'use client';

import React, { useState } from 'react';
import {
  Bus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FastForward,
  Flag,
  User,
  ChevronDown,
  ChevronUp,
  MapPin,
  Circle,
  FileQuestion,
} from 'lucide-react';
import { EstadoPuntualidad, ReporteServicio, TipoParada } from './types';

interface TablaReporteParadasProps {
  servicios: ReporteServicio[];
  estadoFiltro: 'TODOS' | EstadoPuntualidad;
  busqueda: string;
}

const EstadoBadge: React.FC<{ estado: EstadoPuntualidad }> = ({ estado }) => {
  switch (estado) {
    case 'A_TIEMPO':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200">
          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
          A tiempo
        </span>
      );
    case 'RETRASADO':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-700 ring-1 ring-rose-200">
          <AlertTriangle className="h-3 w-3 text-rose-600" />
          Retrasado
        </span>
      );
    case 'ADELANTADO':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-700 ring-1 ring-rose-200">
          <FastForward className="h-3 w-3 text-rose-600" />
          Adelantado
        </span>
      );
    case 'OMITIDO':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">
          <Circle className="h-2 w-2 text-slate-400" />
          Omitido
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-medium text-blue-700 ring-1 ring-blue-200">
          Pendiente
        </span>
      );
  }
};

const TipoBadge: React.FC<{ tipo: TipoParada }> = ({ tipo }) => {
  if (tipo === 'ORIGEN') {
    return (
      <span className="rounded bg-blue-100 px-1.5 py-0.5 font-mono text-[9px] font-bold text-blue-800">
        ORIGEN
      </span>
    );
  }
  if (tipo === 'DESTINO') {
    return (
      <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[9px] font-bold text-amber-300">
        DESTINO
      </span>
    );
  }
  return null;
};

const normalizar = (txt: string) =>
  txt
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

const TablaReporteParadas: React.FC<TablaReporteParadasProps> = ({
  servicios,
  estadoFiltro,
  busqueda,
}) => {
  const [colapsados, setColapsados] = useState<Record<number, boolean>>({});

  const toggleColapso = (id: number) => {
    setColapsados((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const query = normalizar(busqueda.trim());

  const serviciosFiltrados = servicios
    .map((s) => {
      const coincideServicio =
        query &&
        (normalizar(s.conductorNombre).includes(query) ||
          normalizar(s.deviceID).includes(query) ||
          normalizar(`${s.rutaCodigo} ${s.rutaNombre}`).includes(query));

      const paradasFiltradas = s.paradas.filter((p) => {
        if (estadoFiltro !== 'TODOS' && p.estadoPuntualidad !== estadoFiltro) {
          return false;
        }
        if (!query) return true;
        if (coincideServicio) return true;
        return (
          normalizar(p.nombre).includes(query) ||
          normalizar(p.observaciones || '').includes(query)
        );
      });

      return {
        ...s,
        paradasFiltradas,
      };
    })
    .filter((s) => s.paradasFiltradas.length > 0);

  if (serviciosFiltrados.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <FileQuestion className="h-6 w-6" />
        </div>
        <h3 className="mt-3 text-[14px] font-bold text-slate-800">No se encontraron registros</h3>
        <p className="mt-1 text-[12.5px] text-slate-500">
          Ninguna parada o servicio coincide con los filtros seleccionados.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {serviciosFiltrados.map((s) => {
        const estaColapsado = colapsados[s.id] ?? false;

        return (
          <div
            key={s.id}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs transition-shadow hover:shadow-sm"
          >
            {/* Header unificado en plomito (gray-400) para todas las rutas */}
            <div
              onClick={() => toggleColapso(s.id)}
              className="flex cursor-pointer flex-wrap items-center justify-between gap-3 bg-gray-400 px-4 py-3 text-slate-900 transition-colors hover:bg-gray-400/90"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-slate-800 px-2 py-0.5 font-mono text-[12px] font-black tracking-wide text-white shadow-2xs">
                    {s.rutaCodigo}
                  </span>
                  <span className="text-[15px] font-black tracking-wide text-slate-900">
                    {s.rutaNombre}
                  </span>
                  <span className="rounded-md bg-slate-700 px-2 py-0.5 text-[11px] font-semibold text-white shadow-2xs">
                    {s.grupo}
                  </span>
                </div>

                <div className="hidden h-4 w-[1px] bg-slate-500/40 md:block" />

                <div className="hidden flex-wrap items-center gap-3 text-[12px] text-slate-800 md:flex">
                  <span className="flex items-center gap-1 font-bold text-slate-900">
                    <Bus className="h-3.5 w-3.5 text-slate-700" />
                    {s.deviceID}
                  </span>
                  <span className="flex items-center gap-1 font-medium text-slate-800">
                    <User className="h-3.5 w-3.5 text-slate-700" />
                    {s.conductorNombre}
                  </span>
                  <span className="flex items-center gap-1 font-mono text-slate-800">
                    <Clock className="h-3.5 w-3.5 text-slate-700" />
                    Salida: {s.horaSalidaReal ?? s.horaSalidaProgramada}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-1.5 text-[11px] font-bold">
                  <span className="rounded-full bg-white px-2.5 py-0.5 text-slate-800 shadow-2xs border border-gray-300">
                    {s.paradasATiempo} a tiempo
                  </span>
                  {s.paradasRetrasadas > 0 && (
                    <span className="rounded-full bg-rose-600 px-2.5 py-0.5 text-white shadow-xs">
                      {s.paradasRetrasadas} demoras
                    </span>
                  )}
                  {s.paradasAdelantadas > 0 && (
                    <span className="rounded-full bg-rose-600 px-2.5 py-0.5 text-white shadow-xs">
                      {s.paradasAdelantadas} adelantos
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  className="rounded-lg bg-black/10 p-1 text-slate-800 hover:bg-black/15 transition-colors"
                  title={estaColapsado ? 'Expandir paradas' : 'Colapsar paradas'}
                >
                  {estaColapsado ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Sub-barra informativa en móviles */}
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2 text-[12px] text-slate-600 md:hidden">
              <span className="flex items-center gap-1 font-bold text-slate-800">
                <Bus className="h-3.5 w-3.5 text-slate-500" />
                {s.deviceID}
              </span>
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-slate-500" />
                {s.conductorNombre}
              </span>
              <span className="flex items-center gap-1 font-mono text-slate-700">
                <Clock className="h-3.5 w-3.5 text-slate-500" />
                Salida: {s.horaSalidaReal ?? s.horaSalidaProgramada}
              </span>
            </div>

            {/* Tabla detallada de paradas de la ruta */}
            {!estaColapsado && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[12.5px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11.5px] font-bold text-slate-700">
                      <th className="py-2.5 pl-4 pr-2 text-center">N°</th>
                      <th className="px-3 py-2.5">Paradero de Control</th>
                      <th className="px-3 py-2.5 text-center">Hora Prog.</th>
                      <th className="px-3 py-2.5 text-center">Llegada Real</th>
                      <th className="px-3 py-2.5 text-center" title="Minutos detenido en la parada">
                        Estancia / Parada
                      </th>
                      <th className="px-3 py-2.5 text-center">Salida Real</th>
                      <th className="px-3 py-2.5 text-center">Diferencia</th>
                      <th className="px-3 py-2.5 text-center">Puntualidad</th>
                      <th className="py-2.5 pl-3 pr-4">Observaciones / Telemetría</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {s.paradasFiltradas.map((p) => {
                      const esRetrasado = p.estadoPuntualidad === 'RETRASADO';
                      const esAdelantado = p.estadoPuntualidad === 'ADELANTADO';

                      const difTexto =
                        p.diferenciaMinutos === 0
                          ? 'Exacto'
                          : p.diferenciaMinutos > 0
                            ? `+${p.diferenciaMinutos} min`
                            : `${p.diferenciaMinutos} min`;

                      return (
                        <tr
                          key={p.id}
                          className="transition-colors hover:bg-slate-50/80"
                        >
                          {/* N° Orden */}
                          <td className="py-2.5 pl-4 pr-2 text-center font-mono font-bold text-slate-400">
                            {p.orden}
                          </td>

                          {/* Nombre del Paradero */}
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              {p.tipo === 'ORIGEN' ? (
                                <MapPin className="h-4 w-4 shrink-0 text-blue-600" />
                              ) : p.tipo === 'DESTINO' ? (
                                <Flag className="h-4 w-4 shrink-0 text-amber-500" />
                              ) : (
                                <Circle className="h-2 w-2 shrink-0 text-slate-300" />
                              )}
                              <span className="font-semibold text-slate-800">{p.nombre}</span>
                              <TipoBadge tipo={p.tipo} />
                            </div>
                          </td>

                          {/* Hora Programada */}
                          <td className="px-3 py-2.5 text-center font-mono font-medium text-slate-600">
                            {p.horaProgramada}
                          </td>

                          {/* Hora Llegada Real */}
                          <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-900">
                            {p.horaLlegadaReal ?? '—'}
                          </td>

                          {/* Tiempo de Estancia (Minutos detenido en parada) */}
                          <td className="px-3 py-2.5 text-center">
                            {p.tiempoPermanenciaMin !== null ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 font-mono text-[11.5px] font-bold text-[#1E40AF] ring-1 ring-blue-100">
                                <Clock className="h-3 w-3 text-blue-600" />
                                {p.tiempoPermanenciaMin} min
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          {/* Hora Salida Real */}
                          <td className="px-3 py-2.5 text-center font-mono text-slate-700">
                            {p.horaSalidaReal ?? '—'}
                          </td>

                          {/* Diferencia / Desvío */}
                          <td className="px-3 py-2.5 text-center">
                            <span
                              className={`font-mono text-[12px] font-bold ${
                                esRetrasado
                                  ? 'text-rose-600'
                                  : esAdelantado
                                    ? 'text-rose-600'
                                    : 'text-emerald-600'
                              }`}
                            >
                              {difTexto}
                            </span>
                          </td>

                          {/* Estado de Puntualidad */}
                          <td className="px-3 py-2.5 text-center">
                            <EstadoBadge estado={p.estadoPuntualidad} />
                          </td>

                          {/* Observaciones */}
                          <td className="py-2.5 pl-3 pr-4 text-[12px] text-slate-500">
                            {p.observaciones || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default TablaReporteParadas;
