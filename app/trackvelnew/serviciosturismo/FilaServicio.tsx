'use client';

import React from 'react';
import { ChevronRight, Pencil, Trash2, Check, X, Loader2 } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { EditFormServicio, ServicioTurismoVista } from './types';
import { SECCIONES_DETALLE, CAMPOS_SERVICIO, SECCIONES_NOTAS } from './constants';
import DetalleCampo from './DetalleCampo';
import CampoEditable from './CampoEditable';

const FilaServicio: React.FC<{
  servicio: ServicioTurismoVista;
  expandido: boolean;
  onToggle: () => void;
  editando: boolean;
  bloqueado: boolean;
  guardando: boolean;
  formEdicion: EditFormServicio | null;
  onCambioCampo: (campo: keyof EditFormServicio, valor: string) => void;
  onIniciarEdicion: () => void;
  onCancelarEdicion: () => void;
  onGuardarEdicion: () => void;
  onSolicitarEliminar: () => void;
}> = ({
  servicio,
  expandido,
  onToggle,
  editando,
  bloqueado,
  guardando,
  formEdicion,
  onCambioCampo,
  onIniciarEdicion,
  onCancelarEdicion,
  onGuardarEdicion,
  onSolicitarEliminar,
}) => {
  const hayNotas = SECCIONES_NOTAS.some((campo) => servicio[campo.key]);
  const mostrarDetalle = expandido || editando;
  const puedeAlternar = !bloqueado && !editando;

  return (
    <>
      <tr
        onClick={puedeAlternar ? onToggle : undefined}
        className={`group border-l-4 transition-colors ${
          puedeAlternar ? 'cursor-pointer' : bloqueado ? 'cursor-not-allowed opacity-60' : ''
        } ${
          mostrarDetalle
            ? 'border-[#113EB9] bg-blue-50/50'
            : 'border-transparent hover:border-[#113EB9]/40 hover:bg-blue-50/30'
        }`}
      >
        <td className="py-2 pl-3 pr-1">
          <ChevronRight
            className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 group-hover:text-[#113EB9] ${
              mostrarDetalle ? 'rotate-90 text-[#113EB9]' : ''
            }`}
          />
        </td>
        <td className="whitespace-nowrap px-3 py-2 text-[12px] font-medium text-slate-700">
          {servicio.fechainicio || '-'}
        </td>
        <td className="whitespace-nowrap px-3 py-2 text-[12px] text-slate-700">
          {servicio.horainicio || '-'}
        </td>
        <td className="max-w-[180px] truncate px-3 py-2 text-[12px] text-slate-700">
          {servicio.piloto || '-'}
        </td>
        <td className="max-w-[200px] truncate px-3 py-2 text-[12px] font-medium text-slate-800">
          {servicio.cliente || '-'}
        </td>
        <td className="max-w-[220px] truncate px-3 py-2 text-[12px] text-slate-700">
          {servicio.origen || '-'}
        </td>
        <td className="max-w-[220px] truncate px-3 py-2 text-[12px] text-slate-700">
          {servicio.destino || '-'}
        </td>
        <td className="px-3 py-2">
          <div
            className="flex items-center gap-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              disabled={bloqueado}
              title="Enviar por WhatsApp (próximamente)"
              className="inline-flex h-6 w-6 items-center justify-center rounded-md text-green-600 transition-colors hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <FaWhatsapp className="h-3.5 w-3.5" />
            </button>
            {editando ? (
              <>
                <button
                  onClick={onGuardarEdicion}
                  disabled={guardando}
                  title="Guardar cambios"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md text-emerald-600 transition-colors hover:bg-emerald-50 disabled:opacity-50"
                >
                  {guardando ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                </button>
                <button
                  onClick={onCancelarEdicion}
                  disabled={guardando}
                  title="Cancelar edición"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onIniciarEdicion}
                  disabled={bloqueado}
                  title="Editar"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[#113EB9] transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={onSolicitarEliminar}
                  disabled={bloqueado}
                  title="Eliminar"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md text-red-500 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        </td>
      </tr>

      {mostrarDetalle && (
        <tr className="border-l-4 border-[#113EB9] bg-slate-50/70">
          <td colSpan={8} className="px-6 py-4">
            {editando && formEdicion ? (
              <div className="animate-in fade-in slide-in-from-top-1 grid grid-cols-1 gap-4 duration-200 sm:grid-cols-2 lg:grid-cols-3">
                {/* Vehículo y Piloto */}
                <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#113EB9]">
                    Vehículo y Piloto
                  </p>
                  <div className="mb-2 grid grid-cols-2 gap-2 border-b border-slate-100 pb-2">
                    <CampoEditable
                      label="Placa"
                      value={formEdicion.placa}
                      onChange={(v) => onCambioCampo('placa', v)}
                    />
                    <CampoEditable
                      label="Tipo Unidad"
                      value={formEdicion.tipounidad}
                      onChange={(v) => onCambioCampo('tipounidad', v)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                    <CampoEditable
                      label="Piloto"
                      value={formEdicion.piloto}
                      onChange={(v) => onCambioCampo('piloto', v)}
                    />
                    <CampoEditable
                      label="Copiloto"
                      value={formEdicion.copiloto}
                      onChange={(v) => onCambioCampo('copiloto', v)}
                    />
                    <CampoEditable
                      label="Brevete"
                      value={formEdicion.brevete}
                      onChange={(v) => onCambioCampo('brevete', v)}
                    />
                    <CampoEditable
                      label="Brevete Copiloto"
                      value={formEdicion.cobrevete}
                      onChange={(v) => onCambioCampo('cobrevete', v)}
                    />
                    <CampoEditable
                      label="Celular"
                      value={formEdicion.celular}
                      onChange={(v) => onCambioCampo('celular', v)}
                    />
                    <CampoEditable
                      label="Celular Copiloto"
                      value={formEdicion.cocelular}
                      onChange={(v) => onCambioCampo('cocelular', v)}
                    />
                  </div>
                </div>

                {/* Servicio */}
                <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#113EB9]">
                    Servicio
                  </p>
                  <div className="mb-2 grid grid-cols-3 gap-2 border-b border-slate-100 pb-2">
                    <CampoEditable
                      label="Fecha"
                      type="date"
                      value={formEdicion.fechainicio}
                      onChange={(v) => onCambioCampo('fechainicio', v)}
                    />
                    <CampoEditable
                      label="Hora"
                      type="time"
                      value={formEdicion.horainicio}
                      onChange={(v) => onCambioCampo('horainicio', v)}
                    />
                    <CampoEditable
                      label="Hora Retorno"
                      value={formEdicion.horaretorno}
                      onChange={(v) => onCambioCampo('horaretorno', v)}
                    />
                  </div>
                  <div className="space-y-2">
                    <CampoEditable
                      label="Cliente"
                      value={formEdicion.cliente}
                      onChange={(v) => onCambioCampo('cliente', v)}
                    />
                    <CampoEditable
                      label="Grupo"
                      value={formEdicion.grupo}
                      onChange={(v) => onCambioCampo('grupo', v)}
                    />
                    <CampoEditable
                      label="N° Pax"
                      value={formEdicion.numpax}
                      onChange={(v) => onCambioCampo('numpax', v)}
                    />
                    <CampoEditable
                      label="Origen"
                      value={formEdicion.origen}
                      onChange={(v) => onCambioCampo('origen', v)}
                    />
                    <CampoEditable
                      label="Destino"
                      value={formEdicion.destino}
                      onChange={(v) => onCambioCampo('destino', v)}
                    />
                  </div>
                </div>

                {/* Detalles */}
                <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#113EB9]">
                    Detalles
                  </p>
                  <div className="space-y-2">
                    <CampoEditable
                      label="Guía Turista"
                      value={formEdicion.guiaturista}
                      onChange={(v) => onCambioCampo('guiaturista', v)}
                    />
                    <CampoEditable
                      label="Vuelo Cliente"
                      value={formEdicion.vuelocliente}
                      onChange={(v) => onCambioCampo('vuelocliente', v)}
                    />
                    <CampoEditable
                      label="Ejecutivo"
                      value={formEdicion.ejecutivo}
                      onChange={(v) => onCambioCampo('ejecutivo', v)}
                    />
                    <CampoEditable
                      label="Cotización"
                      value={formEdicion.cotizacion}
                      onChange={(v) => onCambioCampo('cotizacion', v)}
                    />
                  </div>
                </div>

                {/* Notas */}
                <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:col-span-2 lg:col-span-3">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#113EB9]">
                    Notas
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <CampoEditable
                      label="Instrucciones"
                      value={formEdicion.instrucciones}
                      onChange={(v) => onCambioCampo('instrucciones', v)}
                      textarea
                    />
                    <CampoEditable
                      label="Indicaciones"
                      value={formEdicion.indicaciones}
                      onChange={(v) => onCambioCampo('indicaciones', v)}
                      textarea
                    />
                    <CampoEditable
                      label="Observaciones"
                      value={formEdicion.observaciones}
                      onChange={(v) => onCambioCampo('observaciones', v)}
                      textarea
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-top-1 grid grid-cols-1 gap-4 duration-200 sm:grid-cols-2 lg:grid-cols-3">
                {/* Vehículo y Piloto */}
                <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#113EB9]">
                    Vehículo y Piloto
                  </p>
                  <div className="mb-2 grid grid-cols-2 gap-2 border-b border-slate-100 pb-2">
                    <DetalleCampo label="Placa" value={servicio.placaCombinada} />
                    <DetalleCampo label="Tipo Unidad" value={servicio.tipounidad} />
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                    <DetalleCampo label="Piloto" value={servicio.piloto} />
                    <DetalleCampo label="Copiloto" value={servicio.copiloto} />
                    <DetalleCampo label="Brevete" value={servicio.brevete} />
                    <DetalleCampo label="Brevete Copiloto" value={servicio.cobrevete} />
                    <DetalleCampo label="Celular" value={servicio.celular} />
                    <DetalleCampo label="Celular Copiloto" value={servicio.cocelular} />
                  </div>
                </div>

                {/* Servicio */}
                <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#113EB9]">
                    Servicio
                  </p>
                  <div className="mb-2 grid grid-cols-3 gap-2 border-b border-slate-100 pb-2">
                    <DetalleCampo label="Fecha" value={servicio.fechainicio} />
                    <DetalleCampo label="Hora" value={servicio.horainicio} />
                    <DetalleCampo label="Hora Retorno" value={servicio.horaretorno} />
                  </div>
                  <div className="space-y-2">
                    {CAMPOS_SERVICIO.map((campo) => (
                      <DetalleCampo
                        key={campo.key}
                        label={campo.label}
                        value={servicio[campo.key]}
                      />
                    ))}
                  </div>
                </div>

                {/* Detalles */}
                {SECCIONES_DETALLE.map((seccion) => (
                  <div
                    key={seccion.titulo}
                    className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
                  >
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#113EB9]">
                      {seccion.titulo}
                    </p>
                    <div className="space-y-2">
                      {seccion.campos.map((campo) => (
                        <DetalleCampo
                          key={campo.key}
                          label={campo.label}
                          value={servicio[campo.key]}
                        />
                      ))}
                    </div>
                  </div>
                ))}

                {hayNotas && (
                  <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:col-span-2 lg:col-span-3">
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#113EB9]">
                      Notas
                    </p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      {SECCIONES_NOTAS.map((campo) => (
                        <DetalleCampo
                          key={campo.key}
                          label={campo.label}
                          value={servicio[campo.key]}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
};

export default FilaServicio;
