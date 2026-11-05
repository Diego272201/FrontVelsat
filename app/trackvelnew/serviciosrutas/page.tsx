'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast, Toaster } from 'sonner';
import '@/app/styles/sonner.css';
import { Ban, Plus, Route as RouteIcon } from 'lucide-react';
import BaseModal from '@/app/components/ui/BaseModal';
import FiltrosRutas, { FiltroEstado } from './FiltrosRutas';
import ListaServicios from './ListaServicios';
import ModalNuevoServicio from './ModalNuevoServicio';
import ModalReprogramar, { ReprogramarForm } from './ModalReprogramar';
import PanelMapa from './PanelMapa';
import { mensajeError, useServiciosRutasApi } from './api';
import { NuevoServicioForm, Ruta, Servicio } from './types';
import { getIsoToday } from './utils';

// Cada cuánto se refrescan los servicios (polling). Las marcas de llegada/salida las
// envía la app del conductor y esta pantalla solo las consulta.
const INTERVALO_REFRESCO_MS = 15000;

// Vista principal de Servicios Rutas: mapa + servicios en una sola pantalla.
// Pendiente: el mapa real (hoy es un panel gris).
const ServiciosRutasPage: React.FC = () => {
  const api = useServiciosRutasApi();
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [unidades, setUnidades] = useState<string[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [fechaIso, setFechaIso] = useState(getIsoToday());
  const [rutasSeleccionadas, setRutasSeleccionadas] = useState<number[]>([]);
  const [estadoFiltro, setEstadoFiltro] = useState<FiltroEstado>('TODOS');
  const [mapaAmpliado, setMapaAmpliado] = useState(false);
  const [showModalNuevo, setShowModalNuevo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [servicioEditando, setServicioEditando] = useState<Servicio | null>(null);
  const [servicioCancelando, setServicioCancelando] = useState<Servicio | null>(null);
  const [servicioReprogramando, setServicioReprogramando] = useState<Servicio | null>(null);

  // Rutas activas y unidades: se cargan una vez.
  useEffect(() => {
    if (!api.listo) return;
    api
      .getRutas(false)
      .then(setRutas)
      .catch((error) => toast.error(mensajeError(error, 'No se pudieron cargar las rutas')));
    api.getUnidades().then(setUnidades).catch(() => setUnidades([]));
  }, [api]);

  // TEMPORAL: pide el detalle de cada ruta activa solo para verlo en consola (paraderos + trazado).
  // Cuando exista el mapa, estos datos se usarán para dibujar las rutas filtradas.
  useEffect(() => {
    if (!api.listo || rutas.length === 0) return;
    rutas.forEach((r) => {
      api.getRuta(r.id).catch(() => undefined);
    });
  }, [api, rutas]);

  const cargarServicios = useCallback(
    async (silencioso = false) => {
      if (!api.listo) return;
      try {
        setServicios(await api.getServicios(fechaIso));
      } catch (error) {
        // En el refresco automático no se molesta al usuario con un toast por cada fallo.
        if (!silencioso) toast.error(mensajeError(error, 'No se pudieron cargar los servicios'));
      }
    },
    [api, fechaIso],
  );

  // Servicios del día elegido + refresco periódico mientras la pestaña está visible.
  useEffect(() => {
    cargarServicios();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') cargarServicios(true);
    }, INTERVALO_REFRESCO_MS);
    return () => clearInterval(timer);
  }, [cargarServicios]);

  // Los grupos salen de las rutas activas.
  const grupos = useMemo(() => Array.from(new Set(rutas.map((r) => r.grupo))).sort(), [rutas]);

  // Filtro por rutas (vacío = todas). Es lo que ve el mapa y la lista (la API ya filtra por fecha).
  const serviciosDelFiltro = useMemo(
    () =>
      servicios.filter(
        (s) => rutasSeleccionadas.length === 0 || rutasSeleccionadas.includes(s.rutaId),
      ),
    [servicios, rutasSeleccionadas],
  );

  // La lista además respeta el filtro de estado; el mapa solo muestra los EN_CURSO.
  const serviciosVisibles = useMemo(
    () =>
      estadoFiltro === 'TODOS'
        ? serviciosDelFiltro
        : serviciosDelFiltro.filter((s) => s.estado === estadoFiltro),
    [serviciosDelFiltro, estadoFiltro],
  );

  const unidadesActivas = useMemo(
    () => serviciosDelFiltro.filter((s) => s.estado === 'EN_CURSO'),
    [serviciosDelFiltro],
  );

  const descripcionFiltro = useMemo(() => {
    if (rutasSeleccionadas.length === 0) return 'Todas las rutas';
    return rutas
      .filter((r) => rutasSeleccionadas.includes(r.id))
      .map((r) => r.nombre)
      .join(', ');
  }, [rutas, rutasSeleccionadas]);

  const abrirNuevo = () => {
    setServicioEditando(null);
    setShowModalNuevo(true);
  };

  const abrirEdicion = (servicio: Servicio) => {
    setServicioEditando(servicio);
    setShowModalNuevo(true);
  };

  const confirmarReprogramacion = async (form: ReprogramarForm) => {
    if (!servicioReprogramando) return;
    setGuardando(true);
    try {
      await api.reprogramarServicio(servicioReprogramando.id, form);
      toast.success('Servicio reprogramado');
      setServicioReprogramando(null);
      // Si pasó a otro día, se muestra ese día para que el usuario lo siga viendo.
      if (form.fechaIso !== fechaIso) setFechaIso(form.fechaIso);
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo reprogramar el servicio'));
    } finally {
      setGuardando(false);
      await cargarServicios(true);
    }
  };

  const confirmarCancelacion = async () => {
    if (!servicioCancelando) return;
    setGuardando(true);
    try {
      await api.cancelarServicio(servicioCancelando.id);
      toast.success('Servicio cancelado');
      setServicioCancelando(null);
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo cancelar el servicio'));
      setServicioCancelando(null);
    } finally {
      setGuardando(false);
      // Recarga también si falló: el estado pudo cambiar desde la app móvil.
      await cargarServicios(true);
    }
  };

  const handleGuardarServicio = async (form: NuevoServicioForm) => {
    setGuardando(true);
    try {
      if (servicioEditando) {
        await api.actualizarServicio(servicioEditando.id, form);
      } else {
        await api.crearServicio(form);
      }
      setShowModalNuevo(false);
      toast.success(servicioEditando ? 'Servicio actualizado' : 'Servicio agregado');
      // Si el servicio es de otro día, se muestra ese día para que el usuario lo vea.
      if (form.fechaIso !== fechaIso) setFechaIso(form.fechaIso);
      else await cargarServicios();
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo guardar el servicio'));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="flex h-screen w-full flex-col bg-gray-100">
      <Toaster position="top-right" richColors />

      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-white px-4 py-2">
        <div>
          <h1 className="text-[15px] font-bold text-gray-800">Servicios Rutas</h1>
          <p className="text-[11.5px] text-gray-500">
            {serviciosVisibles.length} servicio{serviciosVisibles.length === 1 ? '' : 's'} ·{' '}
            {unidadesActivas.length} en curso
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/trackvelnew/serviciosrutas/rutas"
            className="flex h-8 items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 text-[12px] font-medium text-gray-700 hover:bg-gray-100"
          >
            <RouteIcon className="h-3.5 w-3.5" />
            Administrar rutas
          </Link>
          <button
            type="button"
            onClick={abrirNuevo}
            disabled={!api.listo}
            className="flex h-8 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-[12px] font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Nuevo servicio
          </button>
        </div>
      </div>

      <FiltrosRutas
        rutas={rutas}
        grupos={grupos}
        rutasSeleccionadas={rutasSeleccionadas}
        onCambiarRutas={setRutasSeleccionadas}
        estadoFiltro={estadoFiltro}
        onCambiarEstado={setEstadoFiltro}
        fechaIso={fechaIso}
        onCambiarFecha={setFechaIso}
      />

      {/* Mapa (izquierda / arriba) + lista de servicios (derecha / abajo) */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-2 lg:flex-row">
        <div className={mapaAmpliado ? 'h-full w-full' : 'h-1/2 w-full lg:h-full lg:w-1/2'}>
          <PanelMapa
            unidadesActivas={unidadesActivas}
            descripcionFiltro={descripcionFiltro}
            ampliado={mapaAmpliado}
            onToggleAmpliado={() => setMapaAmpliado((prev) => !prev)}
          />
        </div>

        {!mapaAmpliado && (
          <div className="h-1/2 w-full min-h-0 lg:h-full lg:w-1/2">
            <ListaServicios
              servicios={serviciosVisibles}
              onEditar={abrirEdicion}
              onReprogramar={setServicioReprogramando}
              onCancelar={setServicioCancelando}
            />
          </div>
        )}
      </div>

      <ModalNuevoServicio
        isOpen={showModalNuevo}
        onClose={() => setShowModalNuevo(false)}
        rutas={rutas}
        grupos={grupos}
        unidades={unidades}
        servicio={servicioEditando}
        guardando={guardando}
        onGuardar={handleGuardarServicio}
      />

      <ModalReprogramar
        servicio={servicioReprogramando}
        guardando={guardando}
        onClose={() => setServicioReprogramando(null)}
        onGuardar={confirmarReprogramacion}
      />

      <BaseModal
        isOpen={servicioCancelando !== null}
        onClose={() => setServicioCancelando(null)}
        title="Cancelar servicio"
        icon={<Ban className="h-4 w-4 text-red-600" />}
        iconBgColor="bg-red-100"
        size="md"
        confirmText="Sí, cancelar servicio"
        cancelText="Volver"
        loadingText="Cancelando..."
        confirmIcon={<Ban className="h-3.5 w-3.5" />}
        confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
        isLoading={guardando}
        onConfirm={confirmarCancelacion}
      >
        {servicioCancelando && (
          <p className="text-[13px] text-gray-700">
            Se cancelará el servicio de <b>{servicioCancelando.deviceID}</b> en la ruta{' '}
            <b>{servicioCancelando.rutaNombre}</b> de las <b>{servicioCancelando.horaSalida}</b>.
            {servicioCancelando.estado === 'EN_CURSO' &&
              ' El servicio ya está en curso: se detendrá el seguimiento.'}{' '}
            Esta acción no se puede deshacer.
          </p>
        )}
      </BaseModal>
    </div>
  );
};

export default ServiciosRutasPage;
