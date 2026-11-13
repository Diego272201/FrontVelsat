'use client';

import React, { useMemo, useState } from 'react';
import { Ban, Bus, CalendarClock, CalendarX2, Pencil, Plus, User, X } from 'lucide-react';
import { EstadoServicio, RutaVista, Servicio } from './types';
import {
  ESTADO_SERVICIO_CLASE,
  ESTADO_SERVICIO_LABEL,
  ordenarServicios,
  sumarMinutos,
  textoSobre,
} from './utils';

export interface AccionesServicioProps {
  /** Solo servicios PROGRAMADO. */
  onEditar: (servicio: Servicio) => void;
  /** Solo servicios EN_CURSO (los PROGRAMADO se cambian con Editar). */
  onReprogramar: (servicio: Servicio) => void;
  /** Servicios PROGRAMADO y EN_CURSO. */
  onCancelar: (servicio: Servicio) => void;
}

// Iniciar y finalizar un servicio, y marcar los paraderos, lo hace la app móvil: aquí no hay botones.
export const AccionesServicio: React.FC<AccionesServicioProps & { servicio: Servicio }> = ({
  servicio: s,
  onEditar,
  onReprogramar,
  onCancelar,
}) => {
  const boton =
    'flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-[#1E40AF]';
  const detener = (e: React.MouseEvent, accion: () => void) => {
    e.stopPropagation();
    accion();
  };
  return (
    <div className="flex items-center gap-1">
      {s.estado === 'PROGRAMADO' && (
        <button type="button" title="Editar servicio" className={boton} onClick={(e) => detener(e, () => onEditar(s))}>
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
      {s.estado === 'EN_CURSO' && (
        <button
          type="button"
          title="Reprogramar servicio"
          className={boton}
          onClick={(e) => detener(e, () => onReprogramar(s))}
        >
          <CalendarClock className="h-3.5 w-3.5" />
        </button>
      )}
      {(s.estado === 'PROGRAMADO' || s.estado === 'EN_CURSO') && (
        <button
          type="button"
          title="Cancelar servicio"
          className="flex h-7 w-7 items-center justify-center rounded-md border border-red-200 bg-white text-red-600 hover:bg-red-50"
          onClick={(e) => detener(e, () => onCancelar(s))}
        >
          <Ban className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};

export const EstadoChip: React.FC<{ estado: EstadoServicio }> = ({ estado }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${ESTADO_SERVICIO_CLASE[estado]}`}
  >
    {ESTADO_SERVICIO_LABEL[estado]}
  </span>
);

export const BarraAvance: React.FC<{ servicio: Servicio; color: string; sobreColor?: boolean }> = ({
  servicio: s,
  color,
  sobreColor = false,
}) => {
  const total = Math.max(s.totalParaderos, 1);
  const pct = Math.min(100, Math.round((s.paraderosCompletados / total) * 100));
  return (
    <div className="flex items-center gap-2">
      <div className={`h-2 flex-1 overflow-hidden rounded-full ${sobreColor ? 'bg-black/25' : 'bg-slate-200'}`}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: sobreColor ? textoSobre(color) : color }}
        />
      </div>
      <span className="shrink-0 font-mono text-[11px] font-bold text-slate-700">
        {s.paraderosCompletados}/{s.totalParaderos}
      </span>
    </div>
  );
};

type FiltroEstado = EstadoServicio | 'TODOS';
const FILTROS: FiltroEstado[] = ['TODOS', 'EN_CURSO', 'PROGRAMADO', 'FINALIZADO', 'CANCELADO'];

interface PanelServiciosProps extends AccionesServicioProps {
  /** Servicios del día en las rutas visibles. */
  servicios: Servicio[];
  rutasPorId: Record<number, RutaVista | undefined>;
  /** Ids de servicios cuya unidad está enviando posición ahora. */
  serviciosEnVivo: ReadonlySet<number>;
  fechaTexto: string;
  esHoy: boolean;
  cargando: boolean;
  onAbrir: (servicio: Servicio) => void;
  onNuevo: () => void;
  puedeCrear: boolean;
  onCerrar: () => void;
}

// Panel derecho cuando no hay una ruta seleccionada: todos los servicios del día.
const PanelServicios: React.FC<PanelServiciosProps> = ({
  servicios,
  rutasPorId,
  serviciosEnVivo,
  fechaTexto,
  esHoy,
  cargando,
  onAbrir,
  onNuevo,
  puedeCrear,
  onCerrar,
  ...acciones
}) => {
  const [filtro, setFiltro] = useState<FiltroEstado>('TODOS');

  const conteo = useMemo(() => {
    const c: Record<FiltroEstado, number> = { TODOS: servicios.length, EN_CURSO: 0, PROGRAMADO: 0, FINALIZADO: 0, CANCELADO: 0 };
    servicios.forEach((s) => (c[s.estado] += 1));
    return c;
  }, [servicios]);

  const lista = useMemo(
    () => ordenarServicios(filtro === 'TODOS' ? servicios : servicios.filter((s) => s.estado === filtro)),
    [servicios, filtro],
  );

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 px-4 pb-3 pt-3.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-900">
              Servicios {esHoy ? 'de hoy' : 'del día'}
            </div>
            <div className="mt-0.5 text-[15px] font-bold text-slate-900 tracking-tight">
              {fechaTexto.charAt(0).toUpperCase() + fechaTexto.slice(1)}
            </div>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            title="Ocultar panel"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {FILTROS.map((f) => {
            if (f !== 'TODOS' && conteo[f] === 0) return null;
            const activo = filtro === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFiltro(f)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11.5px] transition-all shadow-2xs ${
                  activo
                    ? 'border-[#113EB9] bg-[#113EB9] text-white font-bold'
                    : 'border-slate-300 bg-white text-slate-700 font-semibold hover:border-slate-400 hover:bg-slate-50'
                }`}
              >
                <span>{f === 'TODOS' ? 'Todos' : ESTADO_SERVICIO_LABEL[f]}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10.5px] font-bold ${
                    activo ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {conteo[f]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {cargando && servicios.length === 0 ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : lista.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 py-10 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100">
              <CalendarX2 className="h-5 w-5 text-slate-400" />
            </div>
            <p className="text-[12.5px] font-semibold text-slate-700">Sin servicios</p>
            <p className="text-[11.5px] text-slate-500">
              No hay servicios {filtro === 'TODOS' ? '' : `${ESTADO_SERVICIO_LABEL[filtro].toLowerCase()}s `}en las
              rutas para el {fechaTexto}.
            </p>
            <p className="text-[11.5px] text-slate-400">Elige una ruta en el mapa o en la lista para ver sus paradas.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {lista.map((s) => {
              const ruta = rutasPorId[s.rutaId];
              const color = ruta?.color ?? '#64748b';
              const enVivo = serviciosEnVivo.has(s.id);
              return (
                <li key={s.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onAbrir(s)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onAbrir(s);
                    }}
                    style={
                      enVivo
                        ? ({ backgroundColor: color, '--sr-vivo-txt': textoSobre(color) } as React.CSSProperties)
                        : undefined
                    }
                    className={`flex cursor-pointer gap-3 px-4 py-3 outline-none transition-colors ${
                      enVivo
                        ? 'sr-vivo hover:brightness-95 focus-visible:brightness-95'
                        : 'hover:bg-slate-50 focus-visible:bg-blue-50'
                    }`}
                  >
                    <span
                      className="w-[3px] shrink-0 rounded-full"
                      style={{ backgroundColor: enVivo ? textoSobre(color) : color }}
                    />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <span className="font-mono text-[15px] font-bold text-slate-900 tracking-tight">
                              {s.horaSalida}
                            </span>
                            {ruta && (
                              <span className="inline-flex items-center gap-1 rounded bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-600 shadow-2xs border border-slate-200/80">
                                <span className="text-slate-400">llega</span>
                                <span className="font-mono font-bold text-slate-800">
                                  {sumarMinutos(s.horaSalida, ruta.duracionMin)}
                                </span>
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-1.5 truncate text-[12.5px]">
                            <span
                              className="inline-flex shrink-0 items-center rounded px-1.5 py-0.2 font-mono text-[10.5px] font-bold tracking-tight whitespace-nowrap shadow-2xs"
                              style={
                                enVivo
                                  ? {
                                      backgroundColor: '#ffffff',
                                      color: '#0f172a',
                                      border: '1px solid rgba(255, 255, 255, 0.8)',
                                    }
                                  : {
                                      backgroundColor: `${color}18`,
                                      color: color,
                                      border: `1px solid ${color}35`,
                                    }
                              }
                            >
                              {s.rutaCodigo}
                            </span>
                            <span className="truncate font-semibold text-slate-900" title={s.rutaNombre}>
                              {s.rutaNombre}
                            </span>
                            {s.rutaSentido === 'REGRESO' && (
                              <span className="ml-0.5 rounded bg-amber-100 px-1.5 py-0.2 text-[10px] font-bold text-amber-800 border border-amber-200">
                                Regreso
                              </span>
                            )}
                          </div>
                        </div>
                        <EstadoChip estado={s.estado} />
                      </div>
                      <div className="flex items-center gap-2.5 text-[12px]">
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200/80 shadow-2xs">
                          <Bus className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                          <span>{s.deviceID}</span>
                        </span>
                        {s.conductorNombre && (
                          <span className="flex min-w-0 items-center gap-1 font-medium text-slate-700 truncate">
                            <User className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <span className="truncate font-semibold text-slate-800">{s.conductorNombre}</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <BarraAvance servicio={s} color={color} sobreColor={enVivo} />
                        </div>
                        <AccionesServicio servicio={s} {...acciones} />
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="border-t border-slate-200 p-3">
        <button
          type="button"
          onClick={onNuevo}
          disabled={!puedeCrear}
          className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[#1E40AF] text-[12.5px] font-semibold text-white hover:bg-[#1A378F] disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Programar servicio
        </button>
      </div>
    </div>
  );
};

export default PanelServicios;
