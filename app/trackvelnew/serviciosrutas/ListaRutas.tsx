'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { MapPin, Search, X } from 'lucide-react';
import { RutaVista, Servicio } from './types';
import { agruparDestinos, formatoDuracion, formatoKm, sumarMinutos, textoSobre } from './utils';

export interface ResumenRuta {
  /** Servicio que da las horas de la ruta (en curso, o el próximo programado). */
  referencia: Servicio | null;
  total: number;
  enCurso: number;
  /** Servicios en curso cuya unidad está enviando posición ahora. */
  enVivo: number;
}

interface ListaRutasProps {
  rutas: RutaVista[];
  cargando: boolean;
  ocultas: ReadonlySet<number>;
  onCambiarVisibles: (ids: number[], visible: boolean) => void;
  onEnfocarGrupo: (grupo: string, ids: number[]) => void;
  grupoEnfocado: string | null;
  seleccionadaId: number | null;
  onSeleccionar: (id: number) => void;
  onResaltar: (id: number | null) => void;
  resumenes: Record<number, ResumenRuta | undefined>;
  busqueda: string;
  onBuscar: (texto: string) => void;
}

const normalizar = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

const Casilla: React.FC<{
  marcada: boolean;
  indeterminada?: boolean;
  onCambiar: () => void;
  titulo: string;
}> = ({ marcada, indeterminada = false, onCambiar, titulo }) => {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminada;
  }, [indeterminada]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={marcada}
      onChange={onCambiar}
      onClick={(e) => e.stopPropagation()}
      title={titulo}
      className="h-4 w-4 shrink-0 cursor-pointer accent-[#1E40AF]"
    />
  );
};

const ListaRutas: React.FC<ListaRutasProps> = ({
  rutas,
  cargando,
  ocultas,
  onCambiarVisibles,
  onEnfocarGrupo,
  grupoEnfocado,
  seleccionadaId,
  onSeleccionar,
  onResaltar,
  resumenes,
  busqueda,
  onBuscar,
}) => {
  // Búsqueda por código, nombre, grupo o nombre de un paradero.
  const filtradas = useMemo(() => {
    const q = normalizar(busqueda.trim());
    return rutas
      .map((r) => {
        if (!q) return { ruta: r, parada: null as string | null };
        if (normalizar(`${r.codigo} ${r.nombre} ${r.grupo}`).includes(q)) return { ruta: r, parada: null };
        const p = r.paraderos.find((x) => normalizar(x.nombre).includes(q));
        return p ? { ruta: r, parada: p.nombre } : null;
      })
      .filter((x): x is { ruta: RutaVista; parada: string | null } => x !== null);
  }, [rutas, busqueda]);

  const grupos = useMemo(() => {
    const mapa = new Map<string, typeof filtradas>();
    for (const item of filtradas) {
      const lista = mapa.get(item.ruta.grupo) ?? [];
      lista.push(item);
      mapa.set(item.ruta.grupo, lista);
    }
    return Array.from(mapa.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtradas]);

  const visiblesTotal = rutas.filter((r) => !ocultas.has(r.id)).length;

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Búsqueda */}
      <div className="border-b border-slate-200 p-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => onBuscar(e.target.value)}
            placeholder="Buscar ruta o parada..."
            className="h-8 w-full rounded-md border border-slate-300 bg-white pl-8 pr-8 text-[12px] text-slate-800 placeholder:text-slate-400 focus:border-[#1E40AF] focus:outline-none focus:ring-1 focus:ring-[#1E40AF]"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => onBuscar('')}
              title="Limpiar búsqueda"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Rutas por grupo */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {cargando && rutas.length === 0 && (
          <div className="space-y-2 p-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-md bg-slate-100" />
            ))}
          </div>
        )}

        {!cargando && rutas.length === 0 && (
          <p className="p-6 text-center text-[12.5px] text-slate-400">No hay rutas activas</p>
        )}

        {rutas.length > 0 && filtradas.length === 0 && (
          <p className="p-6 text-center text-[12.5px] text-slate-400">
            Ninguna ruta o parada coincide con “{busqueda}”
          </p>
        )}

        {grupos.map(([grupo, items]) => {
          const ids = items.map((i) => i.ruta.id);
          const enMapa = ids.filter((id) => !ocultas.has(id)).length;
          const destinos = agruparDestinos(items.map((i) => i.ruta));
          const subtitulo =
            destinos.length === 1
              ? `${items.length} ${items.length === 1 ? 'origen' : 'orígenes'} → ${destinos[0].nombre}`
              : `${items.length} ruta${items.length === 1 ? '' : 's'}`;

          const esGrupoEnfocado = grupoEnfocado === grupo;

          return (
            <div key={grupo}>
              {/* Al hacer clic en el encabezado se centra el mapa en este grupo (sin ocultar los demás) */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => onEnfocarGrupo(grupo, ids)}
                title={
                  esGrupoEnfocado
                    ? 'Centrado en este grupo. Haz clic para reencuadrar todas las rutas'
                    : `Haz clic para centrar el mapa en ${grupo}`
                }
                className={`sticky top-0 z-[1] flex cursor-pointer select-none items-center gap-2.5 border-b border-slate-200 px-3 py-2 transition-colors ${
                  esGrupoEnfocado
                    ? 'border-l-[3px] border-l-[#1E40AF] bg-blue-50/80 hover:bg-blue-100/60'
                    : 'bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <Casilla
                  marcada={enMapa === ids.length}
                  indeterminada={enMapa > 0 && enMapa < ids.length}
                  onCambiar={() => onCambiarVisibles(ids, enMapa < ids.length)}
                  titulo="Mostrar / ocultar grupo en el mapa"
                />
                <div className="min-w-0 flex-1">
                  <div
                    className={`truncate text-[12.5px] font-bold ${
                      esGrupoEnfocado ? 'text-[#1E40AF]' : 'text-slate-800'
                    }`}
                  >
                    {grupo}
                  </div>
                  <div className="truncate text-[10.5px] text-slate-500" title={subtitulo}>
                    {subtitulo}
                  </div>
                </div>

                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[10.5px] font-bold transition-colors ${
                    esGrupoEnfocado
                      ? 'bg-[#1E40AF] text-white shadow-2xs'
                      : 'bg-blue-50 text-[#1E40AF] ring-1 ring-blue-100'
                  }`}
                  title={`${enMapa} de ${ids.length} rutas visibles en el mapa`}
                >
                  {enMapa}/{ids.length}
                </span>
              </div>

              {items.map(({ ruta: r, parada }) => {
                const resumen = resumenes[r.id];
                const ref = resumen?.referencia;
                const seleccionada = r.id === seleccionadaId;
                const visible = !ocultas.has(r.id);
                const enVivo = visible && (resumen?.enVivo ?? 0) > 0;
                return (
                  <div
                    key={r.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSeleccionar(r.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSeleccionar(r.id);
                      }
                    }}
                    onMouseEnter={() => onResaltar(r.id)}
                    onMouseLeave={() => onResaltar(null)}
                    style={
                      enVivo
                        ? ({ backgroundColor: r.color, '--sr-vivo-txt': textoSobre(r.color) } as React.CSSProperties)
                        : undefined
                    }
                    className={`relative flex cursor-pointer items-center gap-2.5 border-b border-slate-100 px-2.5 py-2 outline-none transition-colors ${
                      enVivo
                        ? 'sr-vivo hover:brightness-95 focus-visible:brightness-95'
                        : `focus-visible:bg-blue-50 ${seleccionada ? 'bg-blue-50/70' : 'hover:bg-slate-50'}`
                    }`}
                  >
                    {seleccionada && (
                      <span className={`absolute inset-y-0 left-0 w-[3px] ${enVivo ? 'bg-white' : 'bg-[#1E40AF]'}`} />
                    )}
                    <Casilla
                      marcada={visible}
                      onCambiar={() => onCambiarVisibles([r.id], !visible)}
                      titulo={visible ? 'Ocultar del mapa' : 'Mostrar en el mapa'}
                    />
                    <span
                      className="h-7 w-[3px] shrink-0 rounded-full"
                      style={{
                        backgroundColor: enVivo ? textoSobre(r.color) : r.color,
                        opacity: visible ? 1 : 0.35,
                      }}
                    />
                    <div className={`min-w-0 flex-1 ${visible ? '' : 'opacity-60'}`}>
                      <div className="flex items-center gap-1.5">
                        <span className="shrink-0 font-mono text-[11px] font-semibold text-slate-400">
                          {r.codigo}
                        </span>
                        <span className="truncate text-[12px] font-semibold text-slate-800">{r.nombre}</span>
                      </div>
                      <div className="truncate text-[10.5px] text-slate-500">
                        {r.cantidadParaderos} paradas · {formatoKm(r.distanciaKm)} ·{' '}
                        {ref ? `llega ${sumarMinutos(ref.horaSalida, r.duracionMin)}` : formatoDuracion(r.duracionMin)}
                      </div>
                      {parada && (
                        <div className="mt-0.5 flex items-center gap-1 truncate text-[10.5px] font-medium text-[#1E40AF]">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{parada}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Pie */}
      <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-3 py-2 text-[11.5px] text-slate-500">
        <span>
          En mapa <b className="text-slate-800">{visiblesTotal}</b> de {rutas.length} rutas
        </span>
        <button
          type="button"
          disabled={rutas.length === 0}
          onClick={() =>
            onCambiarVisibles(
              rutas.map((r) => r.id),
              visiblesTotal < rutas.length,
            )
          }
          className="rounded-md border border-slate-300 bg-white px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {visiblesTotal < rutas.length ? 'Mostrar todas' : 'Ocultar todas'}
        </button>
      </div>
    </div>
  );
};

export default ListaRutas;
