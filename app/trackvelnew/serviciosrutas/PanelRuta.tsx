'use client';

import React from 'react';
import { Bus, Check, Flag, Pencil, Phone, Plus, User, X } from 'lucide-react';
import { Paradero, RutaVista, Servicio } from './types';
import { AccionesServicio, AccionesServicioProps, BarraAvance, EstadoChip } from './PanelServicios';
import { formatoDuracion, formatoKm, ordenarServicios, sumarMinutos } from './utils';

interface PanelRutaProps extends AccionesServicioProps {
  ruta: RutaVista;
  /** Servicios de esta ruta en el día elegido. */
  servicios: Servicio[];
  /** Servicio cuyas horas se muestran (null = sin servicios). */
  servicio: Servicio | null;
  onElegirServicio: (servicio: Servicio) => void;
  cargandoDetalle: boolean;
  fechaTexto: string;
  onCerrar: () => void;
  onEnfocarParadero: (paradero: Paradero) => void;
  onEditarRuta: () => void;
  onNuevoServicio: () => void;
  puedeCrear: boolean;
}

// Panel derecho con el detalle de la ruta seleccionada: datos, servicios del día y paradas.
const PanelRuta: React.FC<PanelRutaProps> = ({
  ruta,
  servicios,
  servicio,
  onElegirServicio,
  cargandoDetalle,
  fechaTexto,
  onCerrar,
  onEnfocarParadero,
  onEditarRuta,
  onNuevoServicio,
  puedeCrear,
  ...acciones
}) => {
  const paraderos = ruta.paraderos;
  const completados = servicio ? servicio.paraderosCompletados : 0;
  const ordenados = ordenarServicios(servicios);

  const estadistica = (titulo: string, valor: string) => (
    <div className="rounded-lg border border-slate-200 px-3 py-2">
      <div className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-slate-400">{titulo}</div>
      <div className="mt-0.5 whitespace-nowrap text-[14px] font-bold tracking-tight text-slate-800">{valor}</div>
    </div>
  );

  return (
    <div className="flex h-full flex-col">
      {/* Encabezado */}
      <div className="flex items-start gap-2.5 border-b border-slate-200 px-4 py-3">
        <span className="mt-0.5 h-9 w-[3px] shrink-0 rounded-full" style={{ backgroundColor: ruta.color }} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11.5px] font-semibold text-slate-400">{ruta.codigo}</span>
            <span className="truncate text-[14px] font-bold text-slate-800">{ruta.nombre}</span>
          </div>
          <div className="truncate text-[11.5px] text-slate-500">{ruta.grupo}</div>
        </div>
        <button
          type="button"
          onClick={onCerrar}
          title="Cerrar (Esc)"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Datos de la ruta */}
        <div className="grid grid-cols-3 gap-2 px-4 pt-3">
          {estadistica('Distancia', formatoKm(ruta.distanciaKm))}
          {estadistica('Duración', formatoDuracion(ruta.duracionMin))}
          {estadistica('Paradas', String(ruta.cantidadParaderos || paraderos.length))}
        </div>
        {ruta.descripcion && <p className="px-4 pt-2 text-[11.5px] text-slate-500">{ruta.descripcion}</p>}

        {/* Servicios del día en esta ruta */}
        <div className="px-4 pt-4">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Servicios · {fechaTexto}
            </span>
            <span className="text-[11px] text-slate-400">{servicios.length}</span>
          </div>

          {ordenados.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 px-3 py-2.5 text-[11.5px] text-slate-500">
              Sin servicios este día. Las horas de las paradas se muestran como minutos desde la salida.
            </div>
          ) : (
            <>
              {ordenados.length > 1 && (
                <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
                  {ordenados.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => onElegirServicio(s)}
                      className={`shrink-0 rounded-md border px-2 py-1 text-left text-[11px] transition-colors ${
                        servicio?.id === s.id
                          ? 'border-[#1E40AF] bg-blue-50 text-[#1E40AF]'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="font-mono font-bold">{s.horaSalida}</span> · {s.deviceID}
                    </button>
                  ))}
                </div>
              )}

              {servicio && (
                <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-[14px] font-bold text-slate-800">{servicio.horaSalida}</span>
                      <span className="font-mono text-[10.5px] text-slate-400">
                        llega {sumarMinutos(servicio.horaSalida, ruta.duracionMin)}
                      </span>
                    </div>
                    <EstadoChip estado={servicio.estado} />
                  </div>
                  <div className="space-y-0.5 text-[11.5px] text-slate-600">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                      <Bus className="h-3.5 w-3.5 text-slate-400" /> {servicio.deviceID}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-slate-400" /> {servicio.conductorNombre}
                      <span className="text-slate-400">· {servicio.conductorBrevete}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-slate-400" /> {servicio.conductorCelular}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <BarraAvance servicio={servicio} color={ruta.color} />
                    </div>
                    <AccionesServicio servicio={servicio} {...acciones} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Paradas */}
        <div className="px-4 pb-4 pt-4">
          <div className="mb-2 flex items-center justify-between text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            <span>Paradas de recojo</span>
            <span>{servicio ? 'Hora' : 'Tiempo'}</span>
          </div>

          {cargandoDetalle && paraderos.length === 0 ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-9 animate-pulse rounded-md bg-slate-100" />
              ))}
            </div>
          ) : (
            <ol className="relative">
              {paraderos.map((p, i) => {
                const esDestino = i === paraderos.length - 1 && paraderos.length > 1;
                const esOrigen = i === 0;
                const hecha = servicio !== null && i < completados;
                const hora = servicio
                  ? sumarMinutos(servicio.horaSalida, p.minutosAcumulados)
                  : esOrigen
                    ? 'Salida'
                    : `+${p.minutosAcumulados} min`;
                const detalle = esOrigen
                  ? `Inicio · radio ${p.radioMetros} m`
                  : esDestino
                    ? `Destino · +${p.minutosDesdeAnterior} min desde la anterior`
                    : `+${p.minutosDesdeAnterior} min desde la anterior`;

                return (
                  <li key={p.id} className="relative flex gap-3 pb-1">
                    {/* Línea de tiempo */}
                    {i < paraderos.length - 1 && (
                      <span
                        className="absolute left-[11px] top-6 h-[calc(100%-12px)] w-[2px]"
                        style={{ backgroundColor: hecha ? ruta.color : '#e2e8f0' }}
                      />
                    )}
                    <span className="relative z-[1] mt-1 flex h-6 w-6 shrink-0 items-center justify-center">
                      {esDestino ? (
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#0f1f4b]">
                          <Flag className="h-3.5 w-3.5 text-amber-400" />
                        </span>
                      ) : (
                        <span
                          className={`flex h-6 w-6 items-center justify-center border-2 font-mono text-[10.5px] font-bold ${
                            esOrigen ? 'rounded-md' : 'rounded-full'
                          }`}
                          style={{
                            borderColor: ruta.color,
                            backgroundColor: esOrigen || hecha ? ruta.color : '#fff',
                            color: esOrigen || hecha ? '#fff' : ruta.color,
                          }}
                        >
                          {hecha && !esOrigen ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => onEnfocarParadero(p)}
                      title="Ver en el mapa"
                      className="flex min-w-0 flex-1 items-start justify-between gap-2 rounded-md px-1.5 py-1 text-left hover:bg-slate-50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[12.5px] font-semibold text-slate-800" title={p.nombre}>
                          {p.nombre}
                        </span>
                        <span className="block truncate text-[11px] text-slate-500">{detalle}</span>
                      </span>
                      <span
                        className={`shrink-0 pt-0.5 font-mono text-[12px] font-semibold ${
                          hecha ? 'text-slate-400 line-through' : 'text-slate-700'
                        }`}
                      >
                        {hora}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>

      {/* Acciones */}
      <div className="flex gap-2 border-t border-slate-200 p-3">
        <button
          type="button"
          onClick={onEditarRuta}
          disabled={paraderos.length === 0}
          className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#1E40AF] text-[12.5px] font-semibold text-white hover:bg-[#1A378F] disabled:opacity-50"
        >
          <Pencil className="h-3.5 w-3.5" />
          Editar ruta
        </button>
        <button
          type="button"
          onClick={onNuevoServicio}
          disabled={!puedeCrear}
          className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-3 text-[12.5px] font-semibold text-[#1E40AF] hover:bg-blue-50 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Servicio
        </button>
      </div>
    </div>
  );
};

export default PanelRuta;
