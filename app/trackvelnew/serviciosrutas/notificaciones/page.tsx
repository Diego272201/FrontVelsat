'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { Bell, CheckCheck, ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react';
import { Spinner } from '@nextui-org/react';
import { toast, Toaster } from 'sonner';
import '@/app/styles/sonner.css';
import BaseModal from '@/app/components/ui/BaseModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import { mensajeError, useServiciosRutasApi } from '../api';
import {
  CategoriaNotificacion,
  EstadoNotificacion,
  Notificacion,
  NotificacionTipo,
} from '../types';
import { formatoFechaHora, isoToDdMmYyyy } from '../utils';
import { CATEGORIAS, CATEGORIA_CLASE, ESTADOS, ESTADO_CLASE } from './constantes';
import { useNotificaciones } from './useNotificaciones';
import { avisarNotificacion } from './avisoNotificacion';

type Pestana = 'historial' | 'catalogo';

const TIPO_VACIO: Omit<NotificacionTipo, 'id'> = {
  codigo: '',
  categoria: 'INCIDENCIA',
  titulo: '',
  descripcion: '',
  requiereParadero: false,
  requiereComentario: false,
  activo: true,
  orden: 0,
};

const inputClase =
  'h-8 rounded-md border border-gray-300 bg-white px-2 text-[12px] focus:border-[#113EB9] focus:outline-none focus:ring-1 focus:ring-[#113EB9]';

const NotificacionesPage: React.FC = () => {
  const api = useServiciosRutasApi();
  const [pestana, setPestana] = useState<Pestana>('historial');

  // ---- Historial ----
  const [lista, setLista] = useState<Notificacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [estado, setEstado] = useState<EstadoNotificacion | ''>('');
  const [tipo, setTipo] = useState('');
  const [soloNoLeidas, setSoloNoLeidas] = useState(false);
  const [detalle, setDetalle] = useState<Notificacion | null>(null);
  const [respuesta, setRespuesta] = useState('');
  const [gestionando, setGestionando] = useState(false);

  // ---- Catálogo ----
  const [tipos, setTipos] = useState<NotificacionTipo[]>([]);
  const [editandoTipo, setEditandoTipo] = useState<NotificacionTipo | null>(null);
  const [formTipo, setFormTipo] = useState<Omit<NotificacionTipo, 'id'> | null>(null);
  const [guardandoTipo, setGuardandoTipo] = useState(false);
  const [tipoAEliminar, setTipoAEliminar] = useState<NotificacionTipo | null>(null);

  const cargarHistorial = useCallback(async () => {
    if (!api.listo) return;
    setCargando(true);
    try {
      setLista(
        await api.getNotificaciones({
          desde: desde ? isoToDdMmYyyy(desde) : undefined,
          hasta: hasta ? isoToDdMmYyyy(hasta) : undefined,
          estado,
          tipo,
          soloNoLeidas,
        }),
      );
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudieron cargar las notificaciones'));
    } finally {
      setCargando(false);
    }
  }, [api, desde, hasta, estado, tipo, soloNoLeidas]);

  const cargarTipos = useCallback(async () => {
    if (!api.listo) return;
    try {
      setTipos(await api.getNotificacionTipos(false));
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudieron cargar los mensajes predefinidos'));
    }
  }, [api]);

  useEffect(() => {
    cargarHistorial();
  }, [cargarHistorial]);

  useEffect(() => {
    cargarTipos();
  }, [cargarTipos]);

  // Una notificación nueva aparece al instante en el historial.
  useNotificaciones((n) => {
    avisarNotificacion(n);
    cargarHistorial();
  });

  const abrirDetalle = async (n: Notificacion) => {
    setDetalle(n);
    setRespuesta(n.respuesta ?? '');
    if (!n.leida) {
      try {
        await api.marcarNotificacionLeida(n.id);
        setLista((l) => l.map((x) => (x.id === n.id ? { ...x, leida: true } : x)));
      } catch {
        // no bloquea la lectura
      }
    }
  };

  const gestionar = async (nuevo: EstadoNotificacion) => {
    if (!detalle) return;
    setGestionando(true);
    try {
      await api.gestionarNotificacion(detalle.id, nuevo, respuesta);
      toast.success(nuevo === 'PENDIENTE' ? 'Marcada como pendiente' : `Notificación ${nuevo.toLowerCase()}`);
      setDetalle(null);
      await cargarHistorial();
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo actualizar la notificación'));
    } finally {
      setGestionando(false);
    }
  };

  const marcarTodas = async () => {
    try {
      await api.marcarTodasNotificacionesLeidas();
      await cargarHistorial();
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudieron marcar como leídas'));
    }
  };

  const abrirTipo = (t: NotificacionTipo | null) => {
    setEditandoTipo(t);
    setFormTipo(t ? { ...t, descripcion: t.descripcion ?? '' } : { ...TIPO_VACIO, orden: tipos.length + 1 });
  };

  const guardarTipo = async () => {
    if (!formTipo) return;
    if (!formTipo.titulo.trim() || !formTipo.codigo.trim()) {
      toast.error('El código y el título son obligatorios');
      return;
    }
    setGuardandoTipo(true);
    try {
      await api.guardarNotificacionTipo(formTipo, editandoTipo?.id);
      setFormTipo(null);
      toast.success('Mensaje guardado');
      await cargarTipos();
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo guardar el mensaje'));
    } finally {
      setGuardandoTipo(false);
    }
  };

  const alternarTipo = async (t: NotificacionTipo) => {
    try {
      await api.guardarNotificacionTipo({ ...t, activo: !t.activo }, t.id);
      await cargarTipos();
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo cambiar el estado'));
    }
  };

  const confirmarEliminarTipo = async () => {
    const t = tipoAEliminar;
    setTipoAEliminar(null);
    if (!t) return;
    try {
      await api.eliminarNotificacionTipo(t.id);
      toast.success('Mensaje eliminado');
      await cargarTipos();
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo eliminar'));
    }
  };

  const noLeidas = lista.filter((n) => !n.leida).length;

  return (
    <div className="min-h-screen bg-gray-100">
      <Toaster position="top-right" richColors />

      <div className="bg-[#113EB9]">
        <div className="flex h-12 items-stretch justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-full items-center bg-gradient-to-r from-orange-500 to-red-500 px-4">
              <Image src="/LogoWeb.png" alt="Velsat" width={44} height={44} className="h-9 w-9 object-contain" priority />
            </div>
            <div className="h-7 w-[2px] self-center rounded-full bg-white/40" />
            <div className="flex flex-col justify-center">
              <span className="mb-0.5 text-[9.5px] font-bold uppercase leading-none tracking-wider text-blue-200">
                SERVICIOS / RUTAS
              </span>
              <h1 className="flex items-center gap-1.5 text-[14px] font-bold uppercase leading-none text-white">
                <Bell className="h-3.5 w-3.5" /> NOTIFICACIONES DE CONDUCTORES
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-1 pr-4">
            {(['historial', 'catalogo'] as Pestana[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPestana(p)}
                className={`h-8 rounded-md px-3 text-[12px] font-semibold ${
                  pestana === p ? 'bg-white text-[#113EB9]' : 'text-white hover:bg-white/15'
                }`}
              >
                {p === 'historial' ? 'Historial' : 'Mensajes predefinidos'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4">
        {pestana === 'historial' ? (
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 px-4 py-3 text-[12px]">
              <label className="flex items-center gap-1">
                Desde <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={inputClase} />
              </label>
              <label className="flex items-center gap-1">
                Hasta <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={inputClase} />
              </label>
              <select value={estado} onChange={(e) => setEstado(e.target.value as EstadoNotificacion | '')} className={inputClase}>
                <option value="">Todos los estados</option>
                {ESTADOS.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={inputClase}>
                <option value="">Todos los tipos</option>
                {tipos.map((t) => (
                  <option key={t.id} value={t.codigo}>
                    {t.titulo}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={soloNoLeidas} onChange={(e) => setSoloNoLeidas(e.target.checked)} />
                Solo sin leer
              </label>
              <button
                type="button"
                onClick={marcarTodas}
                disabled={noLeidas === 0}
                className="ml-auto flex h-8 items-center gap-1.5 rounded-md border border-gray-300 px-3 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Marcar todas como leídas
              </button>
            </div>

            {cargando ? (
              <div className="flex justify-center py-12">
                <Spinner color="primary" size="md" />
              </div>
            ) : lista.length === 0 ? (
              <div className="py-12 text-center text-[12px] text-gray-500">No hay notificaciones para mostrar.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[12px]">
                  <thead className="bg-gray-50 text-[11px] uppercase text-gray-500">
                    <tr>
                      <th className="px-3 py-2">Fecha</th>
                      <th className="px-3 py-2">Tipo</th>
                      <th className="px-3 py-2">Conductor / Unidad</th>
                      <th className="px-3 py-2">Ruta / Paradero</th>
                      <th className="px-3 py-2">Coordenadas</th>
                      <th className="px-3 py-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lista.map((n) => (
                      <tr
                        key={n.id}
                        onClick={() => abrirDetalle(n)}
                        className={`cursor-pointer border-t border-gray-100 hover:bg-blue-50/50 ${n.leida ? '' : 'bg-blue-50/40 font-semibold'}`}
                      >
                        <td className="whitespace-nowrap px-3 py-2">{formatoFechaHora(n.createdAt)}</td>
                        <td className="px-3 py-2">
                          <span className={`mr-1.5 rounded px-1.5 py-0.5 text-[9px] font-bold ${CATEGORIA_CLASE[n.categoria]}`}>
                            {n.categoria}
                          </span>
                          {n.titulo}
                        </td>
                        <td className="px-3 py-2">{[n.conductorNombre, n.deviceID].filter(Boolean).join(' · ') || '—'}</td>
                        <td className="px-3 py-2">{[n.rutaNombre, n.paraderoNombre].filter(Boolean).join(' · ') || '—'}</td>
                        <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px]">
                          {n.latitud.toFixed(6)}, {n.longitud.toFixed(6)}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${ESTADO_CLASE[n.estado]}`}>{n.estado}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <p className="text-[12px] text-gray-600">
                Estos son los mensajes que el conductor ve en la app. Los cambios se reflejan la próxima vez que la app los consulte.
              </p>
              <button
                type="button"
                onClick={() => abrirTipo(null)}
                className="flex h-8 items-center gap-1.5 rounded-md bg-[#113EB9] px-3 text-[12px] font-semibold text-white hover:bg-[#0C2D78]"
              >
                <Plus className="h-3.5 w-3.5" /> Nuevo mensaje
              </button>
            </div>
            <table className="w-full text-left text-[12px]">
              <thead className="bg-gray-50 text-[11px] uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">Orden</th>
                  <th className="px-3 py-2">Mensaje</th>
                  <th className="px-3 py-2">Categoría</th>
                  <th className="px-3 py-2">Pide</th>
                  <th className="px-3 py-2">Activo</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {tipos.map((t) => (
                  <tr key={t.id} className={`border-t border-gray-100 ${t.activo ? '' : 'opacity-50'}`}>
                    <td className="px-3 py-2">{t.orden}</td>
                    <td className="px-3 py-2">
                      <div className="font-semibold">{t.titulo}</div>
                      <div className="text-[11px] text-gray-500">{t.descripcion}</div>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${CATEGORIA_CLASE[t.categoria]}`}>{t.categoria}</span>
                    </td>
                    <td className="px-3 py-2 text-[11px] text-gray-600">
                      {[t.requiereParadero && 'paradero', t.requiereComentario && 'comentario'].filter(Boolean).join(' + ') || '—'}
                    </td>
                    <td className="px-3 py-2">
                      <input type="checkbox" checked={t.activo} onChange={() => alternarTipo(t)} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      <button type="button" onClick={() => abrirTipo(t)} className="mr-2 text-gray-500 hover:text-[#113EB9]" title="Editar">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => setTipoAEliminar(t)} className="text-gray-500 hover:text-red-600" title="Eliminar">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmación para eliminar un mensaje predefinido */}
      <AlertDialog open={tipoAEliminar !== null} onOpenChange={(open) => !open && setTipoAEliminar(null)}>
        <AlertDialogContent className="z-[160] max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              <span>¿Eliminar mensaje?</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[13px] text-slate-600">
              ¿Estás seguro de que deseas eliminar{' '}
              <strong className="text-slate-900">{tipoAEliminar?.titulo}</strong>? Dejará de aparecer en la app del
              conductor. El historial ya enviado no se modifica.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTipoAEliminar(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarEliminarTipo} className="bg-red-600 text-white hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Detalle de una notificación */}
      <BaseModal isOpen={detalle !== null} onClose={() => setDetalle(null)} title={detalle?.titulo ?? ''} size="lg">
        {detalle && (
          <div className="space-y-3 p-4 text-[12px]">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${CATEGORIA_CLASE[detalle.categoria as CategoriaNotificacion]}`}>
                {detalle.categoria}
              </span>
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${ESTADO_CLASE[detalle.estado]}`}>{detalle.estado}</span>
              <span className="text-gray-500">{formatoFechaHora(detalle.createdAt)}</span>
            </div>
            <dl className="grid grid-cols-[110px_1fr] gap-y-1.5">
              <dt className="text-gray-500">Conductor</dt>
              <dd>{[detalle.conductorNombre, detalle.conductorBrevete].filter(Boolean).join(' · ') || '—'}</dd>
              <dt className="text-gray-500">Unidad</dt>
              <dd>{detalle.deviceID || '—'}</dd>
              <dt className="text-gray-500">Ruta</dt>
              <dd>{detalle.rutaNombre || '—'}</dd>
              <dt className="text-gray-500">Paradero</dt>
              <dd>{detalle.paraderoNombre || '—'}</dd>
              <dt className="text-gray-500">Comentario</dt>
              <dd>{detalle.comentario || '—'}</dd>
              <dt className="text-gray-500">Ubicación</dt>
              <dd>
                <a
                  href={`https://www.google.com/maps?q=${detalle.latitud},${detalle.longitud}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[#113EB9] hover:underline"
                >
                  {detalle.latitud.toFixed(6)}, {detalle.longitud.toFixed(6)} <ExternalLink className="h-3 w-3" />
                </a>
              </dd>
              {detalle.gestionadoPor && (
                <>
                  <dt className="text-gray-500">Gestionada por</dt>
                  <dd>
                    {detalle.gestionadoPor} · {formatoFechaHora(detalle.gestionadoAt)}
                  </dd>
                </>
              )}
            </dl>

            <div>
              <label className="mb-1 block text-gray-500">Nota (opcional)</label>
              <textarea
                value={respuesta}
                onChange={(e) => setRespuesta(e.target.value)}
                maxLength={500}
                rows={2}
                className="w-full rounded-md border border-gray-300 p-2 text-[12px] focus:border-[#113EB9] focus:outline-none"
              />
            </div>
            <p className="text-[11px] text-gray-500">
              Aceptar o rechazar solo deja un registro: no modifica rutas ni coordenadas de paraderos.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={gestionando}
                onClick={() => gestionar('RECHAZADA')}
                className="h-8 rounded-md border border-gray-300 px-3 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Rechazar
              </button>
              <button
                type="button"
                disabled={gestionando}
                onClick={() => gestionar('ACEPTADA')}
                className="h-8 rounded-md bg-emerald-600 px-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                Aceptar
              </button>
            </div>
          </div>
        )}
      </BaseModal>

      {/* Alta / edición de un mensaje predefinido */}
      <BaseModal
        isOpen={formTipo !== null}
        onClose={() => setFormTipo(null)}
        title={editandoTipo ? 'Editar mensaje' : 'Nuevo mensaje'}
        size="lg"
      >
        {formTipo && (
          <div className="space-y-3 p-4 text-[12px]">
            <div className="grid grid-cols-2 gap-3">
              <label>
                Título (lo que lee el conductor)
                <input
                  value={formTipo.titulo}
                  maxLength={120}
                  onChange={(e) => setFormTipo({ ...formTipo, titulo: e.target.value })}
                  className={`${inputClase} mt-1 w-full`}
                />
              </label>
              <label>
                Código (sin espacios)
                <input
                  value={formTipo.codigo}
                  maxLength={40}
                  disabled={editandoTipo !== null}
                  onChange={(e) => setFormTipo({ ...formTipo, codigo: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_') })}
                  className={`${inputClase} mt-1 w-full disabled:bg-gray-100`}
                />
              </label>
              <label>
                Categoría
                <select
                  value={formTipo.categoria}
                  onChange={(e) => setFormTipo({ ...formTipo, categoria: e.target.value as CategoriaNotificacion })}
                  className={`${inputClase} mt-1 w-full`}
                >
                  {CATEGORIAS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Posición en la lista (1 = primero; los demás se corren)
                <input
                  type="number"
                  value={formTipo.orden}
                  onChange={(e) => setFormTipo({ ...formTipo, orden: Number(e.target.value) || 0 })}
                  className={`${inputClase} mt-1 w-full`}
                />
              </label>
            </div>
            <label className="block">
              Descripción (ayuda opcional)
              <input
                value={formTipo.descripcion ?? ''}
                maxLength={255}
                onChange={(e) => setFormTipo({ ...formTipo, descripcion: e.target.value })}
                className={`${inputClase} mt-1 w-full`}
              />
            </label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={formTipo.requiereParadero}
                  onChange={(e) => setFormTipo({ ...formTipo, requiereParadero: e.target.checked })}
                />
                Pide elegir el paradero
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={formTipo.requiereComentario}
                  onChange={(e) => setFormTipo({ ...formTipo, requiereComentario: e.target.checked })}
                />
                Pide escribir un comentario
              </label>
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={formTipo.activo} onChange={(e) => setFormTipo({ ...formTipo, activo: e.target.checked })} />
                Activo
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setFormTipo(null)} className="h-8 rounded-md border border-gray-300 px-3 font-semibold text-gray-700 hover:bg-gray-50">
                Cancelar
              </button>
              <button
                type="button"
                onClick={guardarTipo}
                disabled={guardandoTipo}
                className="h-8 rounded-md bg-[#113EB9] px-3 font-semibold text-white hover:bg-[#0C2D78] disabled:opacity-50"
              >
                Guardar
              </button>
            </div>
          </div>
        )}
      </BaseModal>
    </div>
  );
};

export default NotificacionesPage;
