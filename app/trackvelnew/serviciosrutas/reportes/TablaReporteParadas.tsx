'use client';

import React, { useState } from 'react';
import {
  Bus,
  Clock,
  User,
  ChevronDown,
  ChevronUp,
  FileQuestion,
  FolderKanban,
  ChevronsUpDown,
} from 'lucide-react';
import { EstadoPuntualidad, ReporteServicio } from './types';
import { EstadoChip } from '../PanelServicios';
import { conSegundos, formatoDiferencia, formatoSegundos } from '../utils';

interface TablaReporteParadasProps {
  servicios: ReporteServicio[];
  estadoFiltro: 'TODOS' | EstadoPuntualidad;
  busqueda: string;
  onRestablecerFiltros?: () => void;
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
  onRestablecerFiltros,
}) => {
  const [abiertos, setAbiertos] = useState<Record<number, boolean>>({});
  const [colapsarTodos, setColapsarTodos] = useState<boolean>(false);

  const toggleColapso = (id: number) => {
    setAbiertos((prev) => ({
      ...prev,
      [id]: prev[id] !== undefined ? !prev[id] : false,
    }));
  };

  const alternarTodos = () => {
    const nuevoEstado = !colapsarTodos;
    setColapsarTodos(nuevoEstado);
    const mapa: Record<number, boolean> = {};
    servicios.forEach((s) => {
      mapa[s.id] = !nuevoEstado;
    });
    setAbiertos(mapa);
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
        coincideServicio: Boolean(coincideServicio),
      };
    })
    .filter((s) =>
      estadoFiltro === 'TODOS' && !query ? true : s.paradasFiltradas.length > 0 || s.coincideServicio,
    );

  if (serviciosFiltrados.length === 0) {
    const estadoTexto =
      estadoFiltro === 'A_TIEMPO'
        ? 'A tiempo'
        : estadoFiltro === 'RETRASADO'
          ? 'Retrasadas'
          : estadoFiltro === 'ADELANTADO'
            ? 'Adelantadas'
            : '';

    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <FileQuestion className="h-6 w-6" />
        </div>
        <h3 className="mt-3 text-[14px] font-bold text-slate-800">No se encontraron registros</h3>
        <p className="mt-1 max-w-md text-[12.5px] text-slate-500">
          {estadoFiltro !== 'TODOS'
            ? `No se encontraron paradas con estado "${estadoTexto}" en los servicios del rango.`
            : query
              ? `No se encontraron coincidencias para "${busqueda}".`
              : 'No hay servicios en el rango de fechas y con los filtros seleccionados.'}
        </p>
        {(estadoFiltro !== 'TODOS' || query) && onRestablecerFiltros && (
          <button
            type="button"
            onClick={onRestablecerFiltros}
            className="mt-3.5 inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-[12px] font-bold text-[#113EB9] hover:bg-blue-50 transition-colors"
          >
            Restablecer filtros
          </button>
        )}
      </div>
    );
  }

  // Agrupamiento por GRUPO y RUTA
  const gruposMap = new Map<
    string,
    Map<number, { rutaCodigo: string; rutaNombre: string; servicios: typeof serviciosFiltrados }>
  >();

  serviciosFiltrados.forEach((s) => {
    const nombreGrupo = s.grupo || 'Sin grupo';
    if (!gruposMap.has(nombreGrupo)) {
      gruposMap.set(nombreGrupo, new Map());
    }
    const rutasDelGrupo = gruposMap.get(nombreGrupo)!;
    if (!rutasDelGrupo.has(s.rutaId)) {
      rutasDelGrupo.set(s.rutaId, {
        rutaCodigo: s.rutaCodigo,
        rutaNombre: s.rutaNombre,
        servicios: [],
      });
    }
    rutasDelGrupo.get(s.rutaId)!.servicios.push(s);
  });

  return (
    <div className="w-full space-y-3 px-4 py-2.5">
      {/* Barra superior de control de vista */}
      <div className="flex items-center justify-between pb-1">
        <span className="text-[12px] font-bold text-slate-700">
          Mostrando {serviciosFiltrados.length}{' '}
          {serviciosFiltrados.length === 1 ? 'servicio' : 'servicios'} organizados por grupo y ruta
        </span>
        <button
          type="button"
          onClick={alternarTodos}
          className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-[11.5px] font-bold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <ChevronsUpDown className="h-3.5 w-3.5 text-slate-500" />
          <span>{colapsarTodos ? 'Expandir paraderos' : 'Colapsar paraderos'}</span>
        </button>
      </div>

      {/* Renderizado de Grupos */}
      {Array.from(gruposMap.entries()).map(([nombreGrupo, rutasMap]) => {
        let totalServiciosGrupo = 0;
        let paradasATiempoGrupo = 0;
        let paradasRetrasadasGrupo = 0;
        let paradasCompletadasGrupo = 0;

        rutasMap.forEach((r) => {
          totalServiciosGrupo += r.servicios.length;
          r.servicios.forEach((s) => {
            paradasATiempoGrupo += s.paradasATiempo;
            paradasRetrasadasGrupo += s.paradasRetrasadas;
            paradasCompletadasGrupo += s.paradasCompletadas;
          });
        });

        const pctPuntualGrupo =
          paradasCompletadasGrupo > 0
            ? Math.round((paradasATiempoGrupo / paradasCompletadasGrupo) * 100)
            : 0;

        return (
          <div
            key={nombreGrupo}
            className="overflow-hidden rounded-md border border-gray-200 bg-white shadow-2xs"
          >
            {/* Header del Grupo (Estilo barra corporativa) */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-[#f8fafc] px-3.5 py-2">
              <div className="flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-[#113EB9]" />
                <h2 className="text-[13px] font-bold text-slate-900">
                  {nombreGrupo}
                </h2>
                <span className="rounded-full bg-blue-50 px-2 py-0.2 font-mono text-[10.5px] font-bold text-[#113EB9]">
                  {totalServiciosGrupo} {totalServiciosGrupo === 1 ? 'servicio' : 'servicios'}
                </span>
                <span className="text-[11.5px] text-slate-400 font-medium">
                  · {rutasMap.size} {rutasMap.size === 1 ? 'ruta' : 'rutas'}
                </span>
              </div>

              {/* Indicadores de puntualidad */}
              <div className="flex items-center gap-3 text-[11.5px] font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  {paradasATiempoGrupo} a tiempo
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  {paradasRetrasadasGrupo} retrasos
                </span>
                <span className="text-[#113EB9]">{pctPuntualGrupo}% puntual</span>
              </div>
            </div>

            {/* Rutas contenidas en este Grupo */}
            <div className="divide-y divide-gray-200">
              {Array.from(rutasMap.entries()).map(([rutaId, infoRuta]) => (
                <div key={rutaId} className="bg-white">
                  {/* Sub-cabecera de la Ruta */}
                  <div className="flex items-center gap-2 bg-slate-50/60 px-3.5 py-1.5 border-b border-gray-100">
                    <span className="rounded bg-white px-1.5 py-0.2 font-mono text-[10.5px] font-bold text-[#113EB9] border border-gray-200">
                      {infoRuta.rutaCodigo}
                    </span>
                    <span className="text-[12px] font-bold text-slate-800">
                      {infoRuta.rutaNombre}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      ({infoRuta.servicios.length} {infoRuta.servicios.length === 1 ? 'servicio' : 'servicios'})
                    </span>
                  </div>

                  {/* Servicios ejecutados */}
                  <div className="divide-y divide-gray-100">
                    {infoRuta.servicios.map((s) => {
                      const estaAbierto = abiertos[s.id] !== undefined ? abiertos[s.id] : true;
                      const pctPuntual =
                        s.paradasCompletadas > 0
                          ? Math.round((s.paradasATiempo / s.paradasCompletadas) * 100)
                          : 0;

                      return (
                        <div key={s.id} className="bg-white">
                          {/* Fila del servicio */}
                          <div
                            onClick={() => toggleColapso(s.id)}
                            className="flex cursor-pointer flex-wrap items-center justify-between gap-2 px-3.5 py-2 text-slate-800 hover:bg-slate-50/70 transition-colors"
                          >
                            <div className="flex flex-wrap items-center gap-2.5">
                              <span className="font-mono text-[13.5px] font-bold text-slate-900">
                                {conSegundos(s.horaSalidaProgramada)}
                              </span>
                              <span className="text-[11.5px] font-semibold text-slate-500">
                                {s.fechaSalida}
                              </span>
                              <EstadoChip estado={s.estadoServicio} />

                              <div className="hidden h-3 w-[1px] bg-slate-200 md:block" />

                              <div className="hidden flex-wrap items-center gap-3 text-[11.5px] text-slate-600 md:flex">
                                <span className="flex items-center gap-1 font-bold text-slate-800">
                                  <Bus className="h-3.5 w-3.5 text-slate-400" />
                                  {s.deviceID}
                                </span>
                                <span className="flex items-center gap-1 font-semibold text-slate-700">
                                  <User className="h-3.5 w-3.5 text-slate-400" />
                                  {s.conductorNombre}
                                </span>
                                <span className="flex items-center gap-1 font-mono text-slate-600">
                                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                                  Salió: <strong className="font-bold text-slate-900">{s.horaSalidaReal ?? '—'}</strong>
                                  {s.horaLlegadaReal && (
                                    <>
                                      {' '}· Llegó: <strong className="font-bold text-slate-900">{s.horaLlegadaReal}</strong>
                                    </>
                                  )}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2.5 text-[11.5px] font-bold text-slate-700">
                                <span className="flex items-center gap-1 text-emerald-700">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                  {s.paradasATiempo} a tiempo
                                </span>
                                <span className="flex items-center gap-1 text-rose-700">
                                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                  {s.paradasRetrasadas} retrasos
                                </span>
                                <span className="text-slate-500 font-semibold">
                                  {s.paradasCompletadas}/{s.totalParadas} paradas
                                </span>
                              </div>

                              <div className="hidden items-center gap-1.5 sm:flex">
                                <div className="h-1.5 w-12 overflow-hidden rounded-full bg-rose-400 flex">
                                  <div
                                    className="h-full bg-emerald-500 transition-all duration-300"
                                    style={{ width: `${pctPuntual}%` }}
                                  />
                                </div>
                                <span className="w-7 text-right text-[11px] font-bold text-slate-700">
                                  {pctPuntual}%
                                </span>
                              </div>

                              <button
                                type="button"
                                className="rounded p-1 text-slate-400 hover:text-slate-600"
                                title={estaAbierto ? 'Colapsar paradas' : 'Expandir paradas'}
                              >
                                {estaAbierto ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          </div>

                          {/* Tabla de paraderos del servicio */}
                          {estaAbierto && s.paradasFiltradas.length > 0 && (
                            <div className="overflow-x-auto border-t border-gray-100 bg-[#fafafa]">
                              <table className="w-full border-collapse text-[11.5px]">
                                <thead>
                                  <tr className="border-b border-gray-200 bg-gray-100/70 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                    <th className="w-9 py-1.5 pl-3 pr-2 text-center">N°</th>
                                    <th className="px-3 py-1.5 text-left">PARADERO DE CONTROL</th>
                                    <th className="px-3 py-1.5 text-center">PROG.</th>
                                    <th className="px-3 py-1.5 text-center">LLEGADA</th>
                                    <th className="px-3 py-1.5 text-center">SALIDA</th>
                                    <th className="px-3 py-1.5 text-center">ESTANCIA</th>
                                    <th className="px-3 py-1.5 text-center">DIFERENCIA</th>
                                    <th className="px-3 py-1.5 text-left">ESTADO</th>
                                    <th className="py-1.5 pl-3 pr-4 text-left">OBSERVACIÓN</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                  {s.paradasFiltradas.map((p) => {
                                    const esRetrasado = p.estadoPuntualidad === 'RETRASADO';
                                    const esAdelantado = p.estadoPuntualidad === 'ADELANTADO';

                                    return (
                                      <tr
                                        key={p.id}
                                        className={`transition-colors ${
                                          esRetrasado
                                            ? 'border-l-[3px] border-rose-500 bg-rose-50/20'
                                            : esAdelantado
                                              ? 'border-l-[3px] border-blue-500 bg-blue-50/15'
                                              : 'border-l-[3px] border-transparent hover:bg-slate-50/60'
                                        }`}
                                      >
                                        <td className="py-1.5 pl-3 pr-2 text-center font-mono text-[10.5px] text-slate-400">
                                          {p.orden}
                                        </td>
                                        <td className="px-3 py-1.5">
                                          <span className="font-semibold text-slate-800">{p.nombre}</span>
                                          {p.tipo === 'ORIGEN' && (
                                            <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.2 font-mono text-[9px] font-bold text-blue-700">
                                              ORIGEN
                                            </span>
                                          )}
                                          {p.tipo === 'DESTINO' && (
                                            <span className="ml-2 rounded bg-slate-900 px-1.5 py-0.2 font-mono text-[9px] font-bold text-white">
                                              DESTINO
                                            </span>
                                          )}
                                        </td>
                                        <td className="px-3 py-1.5 text-center font-mono text-slate-500">
                                          {conSegundos(p.horaProgramada)}
                                        </td>
                                        <td className="px-3 py-1.5 text-center font-mono font-bold text-slate-900">
                                          {p.horaLlegadaReal ?? '—'}
                                        </td>
                                        <td className="px-3 py-1.5 text-center font-mono text-slate-500">
                                          {p.horaSalidaReal ?? '—'}
                                        </td>
                                        <td className="px-3 py-1.5 text-center font-medium text-slate-600">
                                          {formatoSegundos(p.tiempoPermanenciaSeg)}
                                        </td>
                                        <td className="px-3 py-1.5 text-center font-mono font-bold">
                                          {p.diferenciaSeg > 0 ? (
                                            <span className={esRetrasado ? 'text-rose-600' : 'text-emerald-600'}>
                                              {formatoDiferencia(p.diferenciaSeg)}
                                            </span>
                                          ) : p.diferenciaSeg < 0 ? (
                                            <span className="text-blue-600">{formatoDiferencia(p.diferenciaSeg)}</span>
                                          ) : (
                                            <span className="text-emerald-600">Exacto</span>
                                          )}
                                        </td>
                                        <td className="px-3 py-1.5">
                                          {esRetrasado ? (
                                            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-600">
                                              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                              Retrasado
                                            </span>
                                          ) : esAdelantado ? (
                                            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-600">
                                              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                                              Adelantado
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
                                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                              A tiempo
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-1.5 pl-3 pr-4 text-slate-500">
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
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TablaReporteParadas;
