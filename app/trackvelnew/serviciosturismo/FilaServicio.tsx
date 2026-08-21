'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronRight,
  Pencil,
  Ban,
  Check,
  X,
  Loader2,
  Clock,
  Eye,
  CheckCircle2,
  XCircle,
  CalendarClock,
  FlagTriangleRight,
  PauseCircle,
  PlayCircle,
  History,
} from 'lucide-react';
import { AuditoriaCampo, EditFormServicio, ServicioTurismoVista } from './types';
import {
  SECCIONES_DETALLE,
  CAMPOS_SERVICIO,
  SECCIONES_NOTAS,
  ETIQUETAS_CAMPOS_AUDITORIA,
} from './constants';
import DetalleCampo from './DetalleCampo';
import CampoEditable from './CampoEditable';
import { formatFechaHoraAuditoria } from './utils';
import {
  Conductor,
  SelectConductorBuscable,
  SelectPlacaBuscable,
  SelectTipoUnidad,
} from './SelectBuscable';

// Estado visible del servicio: color + inicial. Ya no viene como texto combinado desde el backend
// (columna "estado" eliminada); se deriva acá mismo a partir de las columnas booleanas
// cancelado/standby/finalizado/confirmado/visto, en ese orden de prioridad. "Reprogramado" es
// independiente (ver ESTADO_REPROGRAMADO) para poder mostrarse junto a Visto/Confirmado cuando ambos aplican.
type ClaveEstado =
  | 'Pendiente'
  | 'Visto por Conductor'
  | 'Confirmado por Conductor'
  | 'Finalizado por Conductor'
  | 'Stand By'
  | 'Cancelado';

const ESTADOS_SERVICIO: Record<
  ClaveEstado,
  { chip: string; sigla: string; icono: React.ReactNode; titulo: string }
> = {
  Pendiente: {
    chip: 'bg-slate-100 text-slate-500 border border-slate-200',
    sigla: 'P',
    icono: <Clock className="h-3 w-3" />,
    titulo: 'Pendiente',
  },
  'Visto por Conductor': {
    chip: 'bg-amber-50 text-amber-600 border border-amber-200/80',
    sigla: 'VC',
    icono: <Eye className="h-3 w-3" />,
    titulo: 'Visto por Conductor',
  },
  'Confirmado por Conductor': {
    chip: 'bg-emerald-50 text-emerald-600 border border-emerald-200/80',
    sigla: 'CC',
    icono: <CheckCircle2 className="h-3 w-3" />,
    titulo: 'Confirmado por Conductor',
  },
  'Finalizado por Conductor': {
    chip: 'bg-red-50 text-red-700 border border-red-200/80',
    sigla: 'F',
    icono: <FlagTriangleRight className="h-3 w-3" />,
    titulo: 'Finalizado por Conductor',
  },
  'Stand By': {
    chip: 'bg-orange-50 text-orange-600 border border-orange-200/80',
    sigla: 'SB',
    icono: <PauseCircle className="h-3 w-3" />,
    titulo: 'Stand By',
  },
  Cancelado: {
    chip: 'bg-red-50 text-red-600 border border-red-200/80',
    sigla: 'C',
    icono: <XCircle className="h-3 w-3" />,
    titulo: 'Cancelado',
  },
};

function calcularEstado(servicio: {
  cancelado: number | null;
  standby: number | null;
  finalizado: number | null;
  confirmado: number | null;
  visto: number | null;
}): ClaveEstado {
  if (Number(servicio.cancelado) === 1) return 'Cancelado';
  if (Number(servicio.standby) === 1) return 'Stand By';
  if (Number(servicio.finalizado) === 1) return 'Finalizado por Conductor';
  if (Number(servicio.confirmado) === 1) return 'Confirmado por Conductor';
  if (Number(servicio.visto) === 1) return 'Visto por Conductor';
  return 'Pendiente';
}

const ESTADO_REPROGRAMADO = {
  chip: 'bg-violet-50 text-violet-600 border border-violet-200/80',
  sigla: 'R',
  icono: <CalendarClock className="h-3 w-3" />,
  titulo: 'Reprogramado',
};

const FilaServicio: React.FC<{
  servicio: ServicioTurismoVista;
  unidades: string[];
  conductores: Conductor[];
  expandido: boolean;
  onToggle: () => void;
  editando: boolean;
  bloqueado: boolean;
  guardando: boolean;
  formEdicion: EditFormServicio | null;
  motivoEdicion: string;
  onCambiarMotivoEdicion: (valor: string) => void;
  onCambioCampo: (campo: keyof EditFormServicio, valor: string) => void;
  onIniciarEdicion: () => void;
  onCancelarEdicion: () => void;
  onGuardarEdicion: () => void;
  onSolicitarCancelar: () => void;
  onPonerEnStandby: () => void;
  onReanudar: () => void;
  procesandoStandby: boolean;
  auditoria: AuditoriaCampo[] | undefined;
  cargandoAuditoria: boolean;
  puedeVerHistorial: boolean;
}> = ({
  servicio,
  unidades,
  conductores,
  expandido,
  onToggle,
  editando,
  bloqueado,
  guardando,
  formEdicion,
  motivoEdicion,
  onCambiarMotivoEdicion,
  onCambioCampo,
  onIniciarEdicion,
  onCancelarEdicion,
  onGuardarEdicion,
  onSolicitarCancelar,
  onPonerEnStandby,
  onReanudar,
  procesandoStandby,
  auditoria,
  cargandoAuditoria,
  puedeVerHistorial,
}) => {
  const hayNotas = SECCIONES_NOTAS.some((campo) => servicio[campo.key]);

  // Campos de BD (no las claves combinadas del front) que cambiaron en la última edición manual,
  // si fue en las últimas 24h (el backend deja de mandar ultimaModificacion pasado ese plazo).
  const campoModificado = (...columnas: string[]) =>
    columnas.some((columna) =>
      servicio.ultimaModificacion?.campos.includes(columna),
    );
  const claseSiModificado = (...columnas: string[]) =>
    campoModificado(...columnas) ? 'font-semibold text-[#113EB9]' : '';

  const [menuAbierto, setMenuAbierto] = useState(false);
  const [historialAbierto, setHistorialAbierto] = useState(false);
  const [posicionMenu, setPosicionMenu] = useState({ top: 0, left: 0 });
  const botonMenuRef = useRef<HTMLButtonElement>(null);
  const menuPortalRef = useRef<HTMLDivElement>(null);

  // El menú se renderiza en un portal (fuera del contenedor con scroll de la tabla) y se posiciona
  // con "fixed" según la posición real del botón, para que no quede recortado por el overflow-auto
  // de la tabla en las últimas filas.
  const toggleMenu = () => {
    if (!menuAbierto && botonMenuRef.current) {
      const rect = botonMenuRef.current.getBoundingClientRect();
      setPosicionMenu({ top: rect.bottom + 4, left: rect.right - 128 });
    }
    setMenuAbierto((v) => !v);
  };

  useEffect(() => {
    if (!menuAbierto) return;
    const handleClickFuera = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        botonMenuRef.current &&
        !botonMenuRef.current.contains(target) &&
        menuPortalRef.current &&
        !menuPortalRef.current.contains(target)
      ) {
        setMenuAbierto(false);
      }
    };
    document.addEventListener('mousedown', handleClickFuera);
    return () => document.removeEventListener('mousedown', handleClickFuera);
  }, [menuAbierto]);

  // Cierra el menú al hacer scroll (en la tabla o en la página) para que no quede mal posicionado,
  // ya que su posición se calcula una sola vez al abrirlo.
  useEffect(() => {
    if (!menuAbierto) return;
    const handleScroll = () => setMenuAbierto(false);
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [menuAbierto]);

  const seleccionarPiloto = (conductor: Conductor) => {
    onCambioCampo('piloto', conductor.apellidos || '');
    onCambioCampo('brevete', conductor.brevete || '');
    onCambioCampo('celular', conductor.telefono || '');
  };

  const seleccionarCopiloto = (conductor: Conductor) => {
    onCambioCampo('copiloto', conductor.apellidos || '');
    onCambioCampo('cobrevete', conductor.brevete || '');
    onCambioCampo('cocelular', conductor.telefono || '');
  };

  // Al borrar el texto del piloto/copiloto (sin seleccionar otro conductor), se limpian
  // también sus datos autocompletados, ya que esos campos no son editables manualmente.
  const cambiarTextoPiloto = (valor: string) => {
    onCambioCampo('piloto', valor);
    if (valor.trim() === '') {
      onCambioCampo('brevete', '');
      onCambioCampo('celular', '');
    }
  };

  const cambiarTextoCopiloto = (valor: string) => {
    onCambioCampo('copiloto', valor);
    if (valor.trim() === '') {
      onCambioCampo('cobrevete', '');
      onCambioCampo('cocelular', '');
    }
  };

  const estado = calcularEstado(servicio);
  const celdaEstado = ESTADOS_SERVICIO[estado];

  const mostrarDetalle = expandido || editando;
  const puedeAlternar = !bloqueado && !editando;

  return (
    <>
      <tr
        onClick={puedeAlternar ? onToggle : undefined}
        className={`group border-l-4 transition-colors ${
          puedeAlternar
            ? 'cursor-pointer'
            : bloqueado
              ? 'cursor-not-allowed opacity-60'
              : ''
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
        <td className={`whitespace-nowrap px-1.5 py-1.5 text-[12px] text-slate-700 ${claseSiModificado('fechainicio')}`}>
          {servicio.fechainicio || '-'}
        </td>
        <td className={`whitespace-nowrap px-1.5 py-1.5 text-[12px] text-slate-700 ${claseSiModificado('horainicio')}`}>
          {servicio.horainicio || '-'}
        </td>
        <td className={`whitespace-nowrap px-1.5 py-1.5 text-[12px] text-slate-700 ${claseSiModificado('tipounidad')}`}>
          {servicio.tipounidad || '-'}
        </td>
        <td className={`whitespace-nowrap px-1.5 py-1.5 text-[12px] text-slate-700 ${claseSiModificado('bus', 'placa')}`}>
          {servicio.placaCombinada || '-'}
        </td>
        <td className={`max-w-[180px] truncate px-1.5 py-1.5 text-[12px] text-slate-700 ${claseSiModificado('piloto')}`}>
          {servicio.piloto || '-'}
        </td>
        <td className={`max-w-[200px] truncate px-1.5 py-1.5 text-[12px] text-slate-800 ${claseSiModificado('cliente')}`}>
          {servicio.cliente || '-'}
        </td>
        <td className={`max-w-[160px] truncate px-1.5 py-1.5 text-[12px] text-slate-700 ${claseSiModificado('grupo')}`}>
          {servicio.grupo || '-'}
        </td>
        <td className={`max-w-[220px] truncate px-1.5 py-1.5 text-[12px] text-slate-700 ${claseSiModificado('origen')}`}>
          {servicio.origen || '-'}
        </td>
        <td className={`max-w-[220px] truncate px-1.5 py-1.5 text-[12px] text-slate-700 ${claseSiModificado('destino')}`}>
          {servicio.destino || '-'}
        </td>
        <td className="px-1.5 py-1.5">
          <div
            className="flex items-center gap-1.5"
            onClick={(e) => e.stopPropagation()}
          >
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
                  disabled={bloqueado || estado === 'Cancelado'}
                  title={
                    estado === 'Cancelado'
                      ? 'No se puede editar: servicio cancelado'
                      : 'Editar'
                  }
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[#113EB9] transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                {estado === 'Stand By' && (
                  <button
                    onClick={onReanudar}
                    disabled={bloqueado || procesandoStandby}
                    title="Reanudar servicio"
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md text-emerald-600 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    {procesandoStandby ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <PlayCircle className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
                <button
                  ref={botonMenuRef}
                  onClick={toggleMenu}
                  disabled={bloqueado || estado === 'Cancelado'}
                  title="Cancelar / Stand By"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md text-red-500 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Ban className="h-3.5 w-3.5" />
                </button>
                {menuAbierto &&
                  createPortal(
                    <div
                      ref={menuPortalRef}
                      style={{ top: posicionMenu.top, left: posicionMenu.left }}
                      className="fixed z-50 w-32 overflow-hidden rounded-md border border-gray-200 bg-white py-1 shadow-lg"
                    >
                      <button
                        onClick={() => {
                          setMenuAbierto(false);
                          onPonerEnStandby();
                        }}
                        disabled={procesandoStandby}
                        className="block w-full px-3 py-1.5 text-left text-[12px] text-orange-600 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Stand By
                      </button>
                      <button
                        onClick={() => {
                          setMenuAbierto(false);
                          onSolicitarCancelar();
                        }}
                        className="block w-full px-3 py-1.5 text-left text-[12px] text-red-600 hover:bg-red-50"
                      >
                        Cancelar
                      </button>
                    </div>,
                    document.body,
                  )}
              </>
            )}
          </div>
        </td>
        <td className="border-l border-slate-100 px-1.5 py-1.5">
          <div className="flex items-center gap-1">
            {Number(servicio.reprogramado) === 1 && (
              <span
                title={ESTADO_REPROGRAMADO.titulo}
                className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${ESTADO_REPROGRAMADO.chip}`}
              >
                {ESTADO_REPROGRAMADO.icono}
                {ESTADO_REPROGRAMADO.sigla}
              </span>
            )}
            <span
              title={celdaEstado.titulo}
              className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${celdaEstado.chip}`}
            >
              {celdaEstado.icono}
              {celdaEstado.sigla}
            </span>
          </div>
        </td>
      </tr>

      {mostrarDetalle && (
        <tr className="border-l-4 border-[#113EB9] bg-slate-50/70">
          <td colSpan={12} className="px-6 py-4">
            {editando && formEdicion ? (
              <div className="animate-in fade-in slide-in-from-top-1 grid grid-cols-1 gap-4 duration-200 sm:grid-cols-2 lg:grid-cols-3">
                {/* Motivo del cambio (opcional): queda en la auditoría junto a los campos modificados. */}
                <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:col-span-2 lg:col-span-3">
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Motivo del cambio (opcional)
                  </label>
                  <input
                    type="text"
                    value={motivoEdicion}
                    onChange={(e) => onCambiarMotivoEdicion(e.target.value)}
                    placeholder="Ej. Cambio de solicitud del cliente"
                    className="mt-0.5 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-[12px] focus:border-[#113EB9] focus:outline-none focus:ring-1 focus:ring-[#113EB9]"
                  />
                </div>

                {/* Vehículo y Piloto */}
                <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#113EB9]">
                    Vehículo y Piloto
                  </p>
                  <div className="mb-2 grid grid-cols-2 gap-2 border-b border-slate-100 pb-2">
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Placa
                      </label>
                      <SelectPlacaBuscable
                        value={formEdicion.placa}
                        opciones={unidades}
                        onChange={(v) => onCambioCampo('placa', v)}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Tipo Unidad
                      </label>
                      <SelectTipoUnidad
                        value={formEdicion.tipounidad}
                        onChange={(v) => onCambioCampo('tipounidad', v)}
                        className="mt-0.5 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-[12px] focus:border-[#113EB9] focus:outline-none focus:ring-1 focus:ring-[#113EB9]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Piloto
                      </label>
                      <SelectConductorBuscable
                        value={formEdicion.piloto}
                        conductores={conductores}
                        onSeleccionar={seleccionarPiloto}
                        onChangeTexto={cambiarTextoPiloto}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Copiloto
                      </label>
                      <SelectConductorBuscable
                        value={formEdicion.copiloto}
                        conductores={conductores}
                        onSeleccionar={seleccionarCopiloto}
                        onChangeTexto={cambiarTextoCopiloto}
                      />
                    </div>
                    <CampoEditable
                      label="Brevete"
                      value={formEdicion.brevete}
                      onChange={(v) => onCambioCampo('brevete', v)}
                      readOnly
                    />
                    <CampoEditable
                      label="Brevete Copiloto"
                      value={formEdicion.cobrevete}
                      onChange={(v) => onCambioCampo('cobrevete', v)}
                      readOnly
                    />
                    <CampoEditable
                      label="Celular"
                      value={formEdicion.celular}
                      onChange={(v) => onCambioCampo('celular', v)}
                      readOnly
                    />
                    <CampoEditable
                      label="Celular Copiloto"
                      value={formEdicion.cocelular}
                      onChange={(v) => onCambioCampo('cocelular', v)}
                      readOnly
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
                    <DetalleCampo
                      label="Placa"
                      value={servicio.placaCombinada}
                    />
                    <DetalleCampo
                      label="Tipo Unidad"
                      value={servicio.tipounidad}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                    <DetalleCampo label="Piloto" value={servicio.piloto} />
                    <DetalleCampo label="Copiloto" value={servicio.copiloto} />
                    <DetalleCampo label="Brevete" value={servicio.brevete} />
                    <DetalleCampo
                      label="Brevete Copiloto"
                      value={servicio.cobrevete}
                    />
                    <DetalleCampo label="Celular" value={servicio.celular} />
                    <DetalleCampo
                      label="Celular Copiloto"
                      value={servicio.cocelular}
                    />
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
                    <DetalleCampo
                      label="Hora Retorno"
                      value={servicio.horaretorno}
                    />
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

                {/* Historial de cambios: solo aparece si ya se cargó la auditoría y tiene registros,
                    y si se destrabó "Opciones avanzadas" con la clave correcta. La lista en sí es
                    desplegable (colapsada por defecto) para no alargar el detalle de la fila cuando
                    hay muchos cambios acumulados. */}
                {puedeVerHistorial &&
                  (cargandoAuditoria || (auditoria && auditoria.length > 0)) && (
                  <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:col-span-2 lg:col-span-3">
                    <button
                      type="button"
                      onClick={() => setHistorialAbierto((v) => !v)}
                      className="flex w-full items-center justify-between gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[#113EB9]"
                    >
                      <span className="flex items-center gap-1.5">
                        <History className="h-3.5 w-3.5" />
                        Historial de cambios
                        {!cargandoAuditoria && auditoria && (
                          <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-[#113EB9]">
                            {auditoria.length}
                          </span>
                        )}
                      </span>
                      <ChevronRight
                        className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
                          historialAbierto ? 'rotate-90' : ''
                        }`}
                      />
                    </button>
                    {historialAbierto &&
                      (cargandoAuditoria ? (
                        <div className="mt-2 flex items-center gap-2 py-2 text-[12px] text-slate-400">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Cargando historial...
                        </div>
                      ) : (
                        <ul className="mt-2 space-y-2">
                          {auditoria!.map((cambio) => (
                            <li
                              key={cambio.idauditoria}
                              className="border-b border-slate-100 pb-2 text-[12px] last:border-0 last:pb-0"
                            >
                              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                                <span className="font-semibold text-slate-700">
                                  {ETIQUETAS_CAMPOS_AUDITORIA[cambio.campo] || cambio.campo}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  {formatFechaHoraAuditoria(cambio.fecha)}
                                  {cambio.usuario ? ` · ${cambio.usuario}` : ''}
                                </span>
                              </div>
                              <p className="mt-0.5 text-slate-600">
                                <span className="text-slate-400 line-through">
                                  {cambio.valorAnterior || '(vacío)'}
                                </span>
                                {' → '}
                                <span className="text-slate-800">
                                  {cambio.valorNuevo || '(vacío)'}
                                </span>
                              </p>
                              {cambio.motivo && (
                                <p className="mt-0.5 italic text-slate-500">
                                  Motivo: {cambio.motivo}
                                </p>
                              )}
                            </li>
                          ))}
                        </ul>
                      ))}
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
