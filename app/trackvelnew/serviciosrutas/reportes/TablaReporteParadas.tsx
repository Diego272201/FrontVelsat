'use client';

import React, { useState } from 'react';
import {
  Bus,
  Clock,
  User,
  ChevronDown,
  ChevronUp,
  FileQuestion,
} from 'lucide-react';
import { EstadoPuntualidad, ReporteServicio } from './types';

interface TablaReporteParadasProps {
  servicios: ReporteServicio[];
  estadoFiltro: 'TODOS' | EstadoPuntualidad;
  busqueda: string;
}

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
  // Por defecto la primera ruta (índice 0) abierta y las demás colapsadas, como en el diseño de referencia
  const [colapsados, setColapsados] = useState<Record<number, boolean>>(() => {
    const init: Record<number, boolean> = {};
    servicios.forEach((s, idx) => {
      init[s.id] = idx !== 0; // Solo la primera abierta
    });
    return init;
  });

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
          normalizar(`${s.rutaCodigo} ${s.rutaNombre} ${s.grupo}`).includes(query));

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
    <div className="space-y-3">
      {serviciosFiltrados.map((s) => {
        const estaColapsado = colapsados[s.id] ?? false;
        const totalParadas = s.paradas.length;
        const pctPuntual = totalParadas > 0 ? Math.round((s.paradasATiempo / totalParadas) * 100) : 100;

        return (
          <div
            key={s.id}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs transition-shadow hover:shadow-sm"
          >
            {/* Header de la ruta en blanco con metadata completa y resumen de puntualidad */}
            <div
              onClick={() => toggleColapso(s.id)}
              className={`flex cursor-pointer flex-wrap items-center justify-between gap-3 bg-white px-4 py-3 text-slate-800 transition-colors hover:bg-slate-50/80 ${
                !estaColapsado ? 'border-b border-slate-200' : ''
              }`}
            >
              <div className="flex flex-wrap items-center gap-3">
                {/* Código de Ruta con badge suave */}
                <span className="rounded bg-blue-50 border border-blue-200 px-2 py-0.5 font-mono text-[11.5px] font-bold text-blue-700">
                  {s.rutaCodigo}
                </span>

                {/* Nombre de la Ruta */}
                <span className="text-[14px] font-bold text-slate-900">
                  {s.rutaNombre}
                </span>

                {/* Grupo / Operación */}
                <span className="text-[12.5px] font-normal text-slate-500">
                  {s.grupo}
                </span>

                <div className="hidden h-3.5 w-[1px] bg-slate-200 md:block" />

                {/* Info vehículo, conductor y salida */}
                <div className="hidden flex-wrap items-center gap-4 text-[12px] text-slate-600 md:flex">
                  <span className="flex items-center gap-1 font-semibold text-slate-700">
                    <Bus className="h-3.5 w-3.5 text-slate-400" />
                    {s.deviceID}
                  </span>
                  <span className="flex items-center gap-1 font-medium text-slate-600">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    {s.conductorNombre}
                  </span>
                  <span className="flex items-center gap-1 font-mono text-slate-600">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    Salida: <strong className="font-bold text-slate-900">{s.horaSalidaReal ?? s.horaSalidaProgramada}</strong>
                  </span>
                </div>
              </div>

              {/* Lado derecho: conteos de puntualidad, mini barra de porcentaje y toggle */}
              <div className="flex items-center gap-3.5">
                <div className="flex items-center gap-3 text-[12px] font-semibold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    {s.paradasATiempo} a tiempo
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    {s.paradasRetrasadas} retrasos
                  </span>
                </div>

                {/* Mini barra de progreso bicolor */}
                <div className="hidden items-center gap-2 sm:flex">
                  <div className="h-1.5 w-14 overflow-hidden rounded-full bg-rose-400 flex">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${pctPuntual}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-[12px] font-bold text-slate-700">
                    {pctPuntual}%
                  </span>
                </div>

                <button
                  type="button"
                  className="rounded p-1 text-slate-400 hover:text-slate-600"
                  title={estaColapsado ? 'Expandir paradas' : 'Colapsar paradas'}
                >
                  {estaColapsado ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Sub-barra en dispositivos móviles */}
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
                <table className="w-full border-collapse text-[12px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/60 text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="w-10 py-2.5 pl-4 pr-2 text-center">N°</th>
                      <th className="px-3 py-2.5 text-left">PARADERO DE CONTROL</th>
                      <th className="px-3 py-2.5 text-center">PROG.</th>
                      <th className="px-3 py-2.5 text-center">LLEGADA</th>
                      <th className="px-3 py-2.5 text-center">SALIDA</th>
                      <th className="px-3 py-2.5 text-center">ESTANCIA</th>
                      <th className="px-3 py-2.5 text-center">DIFERENCIA</th>
                      <th className="px-3 py-2.5 text-left">ESTADO</th>
                      <th className="py-2.5 pl-3 pr-4 text-left">OBSERVACIÓN</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {s.paradasFiltradas.map((p) => {
                      const esRetrasado = p.estadoPuntualidad === 'RETRASADO';
                      const esAdelantado = p.estadoPuntualidad === 'ADELANTADO';

                      return (
                        <tr
                          key={p.id}
                          className={`transition-colors ${
                            esRetrasado
                              ? 'border-l-[3px] border-rose-500 bg-rose-50/25'
                              : esAdelantado
                                ? 'border-l-[3px] border-blue-500 bg-blue-50/15'
                                : 'border-l-[3px] border-transparent hover:bg-slate-50/60'
                          }`}
                        >
                          {/* N° Orden */}
                          <td className="py-2.5 pl-4 pr-2 text-center font-mono text-[11px] text-slate-400">
                            {p.orden}
                          </td>

                          {/* Nombre del Paradero */}
                          <td className="px-3 py-2.5">
                            <span className="font-semibold text-slate-800">{p.nombre}</span>
                            {p.tipo === 'ORIGEN' && (
                              <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 font-mono text-[9px] font-bold text-blue-700">
                                ORIGEN
                              </span>
                            )}
                            {p.tipo === 'DESTINO' && (
                              <span className="ml-2 rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[9px] font-bold text-white">
                                DESTINO
                              </span>
                            )}
                          </td>

                          {/* Hora Programada */}
                          <td className="px-3 py-2.5 text-center font-mono text-slate-500">
                            {p.horaProgramada}
                          </td>

                          {/* Hora Llegada Real */}
                          <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-900">
                            {p.horaLlegadaReal ?? '—'}
                          </td>

                          {/* Hora Salida Real */}
                          <td className="px-3 py-2.5 text-center font-mono text-slate-500">
                            {p.horaSalidaReal ?? '—'}
                          </td>

                          {/* Tiempo de Estancia */}
                          <td className="px-3 py-2.5 text-center font-medium text-slate-600">
                            {p.tiempoPermanenciaMin !== null ? `${p.tiempoPermanenciaMin} min` : '—'}
                          </td>

                          {/* Diferencia */}
                          <td className="px-3 py-2.5 text-center font-mono font-bold">
                            {p.diferenciaMinutos > 0 ? (
                              <span className={esRetrasado ? 'text-rose-600' : 'text-emerald-600'}>
                                +{p.diferenciaMinutos} min
                              </span>
                            ) : p.diferenciaMinutos < 0 ? (
                              <span className="text-blue-600">
                                {p.diferenciaMinutos} min
                              </span>
                            ) : (
                              <span className="text-emerald-600">Exacto</span>
                            )}
                          </td>

                          {/* Estado con punto de color */}
                          <td className="px-3 py-2.5">
                            {esRetrasado ? (
                              <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-rose-600">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                Retrasado
                              </span>
                            ) : esAdelantado ? (
                              <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-blue-600">
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                                Adelantado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-emerald-600">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                A tiempo
                              </span>
                            )}
                          </td>

                          {/* Observación */}
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
