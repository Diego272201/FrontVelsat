'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { AlertTriangle, CalendarClock, CheckCircle2, Pencil, Plus, Power, Search, Timer, Trash2 } from 'lucide-react';
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
import { Spinner } from '@nextui-org/react';
import { toast, Toaster } from 'sonner';
import '@/app/styles/sonner.css';
import { mensajeError, useServiciosRutasApi } from '../api';
import { ConfigPlantillas, Plantilla, PlantillaForm, Ruta } from '../types';
import ModalPlantilla, { DIAS_SEMANA } from './ModalPlantilla';

const textoDias = (dias: number[]): string => {
  if (dias.length === 7) return 'Todos los días';
  if (dias.length === 0) return 'Ningún día';
  return DIAS_SEMANA.filter((d) => dias.includes(d.valor))
    .map((d) => d.corto)
    .join(' · ');
};

// Servicios programados: plantillas de las que el backend crea los servicios de cada día.
const PlantillasPage: React.FC = () => {
  const api = useServiciosRutasApi();
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [unidades, setUnidades] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Plantilla | null>(null);
  const [config, setConfig] = useState<ConfigPlantillas | null>(null);
  const [horaTexto, setHoraTexto] = useState('');
  const [guardandoHora, setGuardandoHora] = useState(false);
  const [aEliminar, setAEliminar] = useState<Plantilla | null>(null);

  const cargar = useCallback(async () => {
    if (!api.listo) return;
    try {
      const [pl, rt, un, iv] = await Promise.all([
        api.getPlantillas(),
        api.getRutas(),
        api.getUnidades().catch(() => [] as string[]),
        api.getConfigPlantillas().catch((): ConfigPlantillas => ({ horaGeneracion: '18:00' })),
      ]);
      setConfig(iv);
      setHoraTexto(iv.horaGeneracion);
      setPlantillas(pl);
      setRutas(rt);
      setUnidades(un);
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudieron cargar los servicios programados'));
    } finally {
      setCargando(false);
    }
  }, [api]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const grupos = useMemo(() => Array.from(new Set(rutas.map((r) => r.grupo))).sort(), [rutas]);

  const texto = busqueda.trim().toLowerCase();
  const visibles = plantillas.filter(
    (p) =>
      texto === '' ||
      p.rutaNombre.toLowerCase().includes(texto) ||
      p.rutaCodigo.toLowerCase().includes(texto) ||
      p.deviceID.toLowerCase().includes(texto) ||
      p.conductorNombre.toLowerCase().includes(texto),
  );

  const porGrupo = useMemo(() => {
    const mapa = new Map<string, Plantilla[]>();
    visibles.forEach((p) => mapa.set(p.rutaGrupo, [...(mapa.get(p.rutaGrupo) ?? []), p]));
    return Array.from(mapa.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [visibles]);

  const completas = plantillas.filter((p) => p.activo && p.completa).length;
  const incompletas = plantillas.filter((p) => p.activo && !p.completa).length;

  const guardarHora = async () => {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(horaTexto)) {
      toast.error('Indica la hora de creación (HH:mm)');
      return;
    }
    setGuardandoHora(true);
    try {
      const guardado = await api.setConfigPlantillas({ horaGeneracion: horaTexto });
      setConfig(guardado);
      setHoraTexto(guardado.horaGeneracion);
      toast.success(`Los servicios de mañana se crearán desde las ${guardado.horaGeneracion}`);
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo guardar la hora de creación'));
    } finally {
      setGuardandoHora(false);
    }
  };

  const abrirNueva = () => {
    setEditando(null);
    setModalAbierto(true);
  };

  const abrirEdicion = (p: Plantilla) => {
    setEditando(p);
    setModalAbierto(true);
  };

  const guardar = async (form: PlantillaForm) => {
    setGuardando(true);
    try {
      if (editando) await api.actualizarPlantilla(editando.id, form);
      else await api.crearPlantilla(form);
      setModalAbierto(false);
      toast.success('Servicio automático guardado');
      await cargar();
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo guardar'));
    } finally {
      setGuardando(false);
    }
  };

  const toggleActivo = async (p: Plantilla) => {
    try {
      await api.actualizarPlantilla(p.id, {
        rutaId: p.rutaId,
        hora: p.hora,
        deviceID: p.deviceID,
        conductorNombre: p.conductorNombre,
        conductorBrevete: p.conductorBrevete,
        conductorCelular: p.conductorCelular,
        dias: p.dias,
        activo: !p.activo,
      });
      await cargar();
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo cambiar el estado'));
    }
  };

  const confirmarEliminar = async () => {
    const p = aEliminar;
    if (!p) return;
    setAEliminar(null);
    try {
      await api.eliminarPlantilla(p.id);
      toast.success('Servicio programado eliminado');
      await cargar();
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo eliminar'));
    }
  };

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
              <h1 className="flex items-center gap-1.5 text-[14px] font-bold uppercase leading-none tracking-[0.01em] text-white">
                SERVICIOS PROGRAMADOS
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 pr-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 text-[14px] font-semibold text-white">
              <CalendarClock className="h-3.5 w-3.5" />
              {plantillas.length}
            </div>
            <button
              type="button"
              onClick={abrirNueva}
              disabled={!api.listo}
              className="flex h-8 items-center gap-1.5 rounded-md bg-white px-3.5 text-[12px] font-semibold text-[#113EB9] shadow-sm transition-colors hover:bg-blue-50 disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Nuevo</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-4">
        {cargando ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Spinner color="primary" size="md" />
            <span className="mt-3 text-[12px] text-gray-500">Cargando servicios programados...</span>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 px-4 py-3">
              <div className="relative min-w-[220px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por ruta, unidad o conductor..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="block w-full rounded-md border border-gray-200 bg-gray-50 py-1.5 pl-9 pr-3 text-[12px] placeholder-gray-400 focus:border-[#113EB9] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#113EB9]"
                />
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
                <Timer className="h-3.5 w-3.5 text-[#113EB9]" />
                <span>Crear los de mañana desde las</span>
                <input
                  type="time"
                  value={horaTexto}
                  onChange={(e) => setHoraTexto(e.target.value)}
                  className="h-7 w-24 rounded-md border border-gray-300 px-1.5 text-[12px] focus:border-[#113EB9] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={guardarHora}
                  disabled={guardandoHora || config?.horaGeneracion === horaTexto}
                  className="h-7 rounded-md bg-[#113EB9] px-2.5 text-[11px] font-semibold text-white hover:bg-[#0C2D78] disabled:opacity-40"
                >
                  Guardar
                </button>
              </div>
              <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" /> {completas} se generan solas
              </span>
              <span className="flex items-center gap-1 text-[11px] font-medium text-amber-700">
                <AlertTriangle className="h-3.5 w-3.5" /> {incompletas} incompletas (no se generan)
              </span>
            </div>

            <p className="border-b border-gray-100 bg-blue-50/50 px-4 py-2 text-[11px] text-gray-600">
              El sistema revisa automáticamente las plantillas activas y crea el servicio de las
              que estén completas (hora, unidad y conductor). Si alguien ya creó a mano un servicio de esa ruta, fecha y
              hora, solo esa plantilla se omite; las demás se siguen creando. Los de hoy se crean al completarse y los de mañana desde la hora de creación configurada. Después puedes editar,
              reprogramar o cancelar cada servicio generado desde Servicios Rutas.
            </p>

            {visibles.length === 0 ? (
              <div className="py-12 text-center text-[12px] text-gray-500">No hay servicios programados para mostrar.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[12px]">
                  <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-2 font-semibold">Ruta</th>
                      <th className="px-3 py-2 font-semibold">Hora</th>
                      <th className="px-3 py-2 font-semibold">Días</th>
                      <th className="px-3 py-2 font-semibold">Unidad</th>
                      <th className="px-3 py-2 font-semibold">Conductor</th>
                      <th className="px-3 py-2 font-semibold">Estado</th>
                      <th className="px-4 py-2 text-right font-semibold">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {porGrupo.map(([grupo, lista]) => (
                      <React.Fragment key={grupo}>
                        <tr className="bg-gray-100">
                          <td colSpan={7} className="px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-600">
                            {grupo}
                          </td>
                        </tr>
                        {lista.map((p) => (
                          <tr key={p.id} className={`border-t border-gray-100 ${p.activo ? '' : 'opacity-60'}`}>
                            <td className="px-4 py-2 font-medium text-gray-800">
                              {p.rutaNombre} <span className="text-gray-400">({p.rutaCodigo})</span>
                            </td>
                            <td className="px-3 py-2">
                              {p.hora || <span className="text-amber-600">Sin hora</span>}
                            </td>
                            <td className="px-3 py-2 text-gray-600">{textoDias(p.dias)}</td>
                            <td className="px-3 py-2">
                              {p.deviceID || <span className="text-amber-600">Sin asignar</span>}
                            </td>
                            <td className="px-3 py-2">
                              {p.conductorNombre ? (
                                <span title={`Brevete ${p.conductorBrevete}`}>{p.conductorNombre}</span>
                              ) : p.conductorBrevete ? (
                                <span
                                  className="text-red-600"
                                  title="Ese brevete ya no corresponde a un conductor de rutas activo: no se generan servicios hasta corregirlo"
                                >
                                  Brevete {p.conductorBrevete} no encontrado
                                </span>
                              ) : (
                                <span className="text-amber-600">Sin asignar</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {!p.activo ? (
                                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">Inactivo</span>
                              ) : p.completa ? (
                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Completo</span>
                              ) : (
                                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">Incompleto</span>
                              )}
                            </td>
                            <td className="px-4 py-2">
                              <div className="flex justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => abrirEdicion(p)}
                                  title="Editar"
                                  className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-[#113EB9]"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleActivo(p)}
                                  title={p.activo ? 'Desactivar' : 'Activar'}
                                  className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-amber-600"
                                >
                                  <Power className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setAEliminar(p)}
                                  title="Eliminar"
                                  className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-red-600"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <AlertDialog open={aEliminar !== null} onOpenChange={(open) => !open && setAEliminar(null)}>
        <AlertDialogContent className="z-[160] max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              <span>¿Eliminar servicio programado?</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[13px] text-slate-600">
              ¿Estás seguro de que deseas eliminar el servicio programado de{' '}
              <strong className="text-slate-900">
                {aEliminar?.rutaNombre} ({aEliminar?.hora || 'sin hora'})
              </strong>
              ? Dejará de generar servicios. Los servicios ya generados no se tocan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAEliminar(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarEliminar} className="bg-red-600 text-white hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ModalPlantilla
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        rutas={rutas}
        grupos={grupos}
        unidades={unidades}
        plantilla={editando}
        guardando={guardando}
        onGuardar={guardar}
      />
    </div>
  );
};

export default PlantillasPage;
