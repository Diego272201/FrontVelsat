'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { toast, Toaster } from 'sonner';
import '@/app/styles/sonner.css';
import { Ban, CalendarDays, FileBarChart2, ListChecks, PanelLeftOpen, Plus, Route as RouteIcon, Settings2 } from 'lucide-react';
import BaseModal from '@/app/components/ui/BaseModal';
import ListaRutas, { ResumenRuta } from './ListaRutas';
import ModalNuevoServicio from './ModalNuevoServicio';
import ModalReprogramar, { ReprogramarForm } from './ModalReprogramar';
import PanelRuta from './PanelRuta';
import PanelServicios from './PanelServicios';
import ModalRuta, { RutaForm, rutaFormAGuardar } from './rutas/ModalRuta';
import type { FocoMapa } from './MapaRutas';
import { mensajeError, useServiciosRutasApi } from './api';
import { NuevoServicioForm, Paradero, PosicionConductor, Ruta, RutaVista, Servicio } from './types';
import { getIsoToday, RUTA_COLORES, servicioReferencia } from './utils';

// Leaflet necesita `window`: el mapa se carga solo en el navegador
const MapaRutas = dynamic(() => import('./MapaRutas'), { ssr: false });

// Cada cuánto se refrescan los servicios (polling). Las marcas de llegada/salida las
// envía la app del conductor y esta pantalla solo las consulta.
const INTERVALO_REFRESCO_MS = 15000;

// Cada cuánto se piden las posiciones en vivo de los conductores.
const INTERVALO_POSICIONES_MS = 5000;

/** Ancho del panel flotante de la derecha (+ margen) en escritorio, para encuadrar el mapa. */
const ANCHO_PANEL = 372;

const useEsEscritorio = () => {
  const [es, setEs] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const actualizar = () => setEs(mq.matches);
    actualizar();
    mq.addEventListener('change', actualizar);
    return () => mq.removeEventListener('change', actualizar);
  }, []);
  return es;
};

// Servicios Rutas: lista de rutas a la izquierda, mapa con los trazados al centro y, a la
// derecha, el detalle de la ruta elegida (paradas y horas) o los servicios del día.
const ServiciosRutasView: React.FC = () => {
  const api = useServiciosRutasApi();
  const esEscritorio = useEsEscritorio();

  // Datos
  const [rutasBase, setRutasBase] = useState<Ruta[]>([]);
  const [detalles, setDetalles] = useState<Record<number, Ruta>>({});
  const [cargandoRutas, setCargandoRutas] = useState(true);
  const [cargandoDetalles, setCargandoDetalles] = useState(true);
  // Recorrido por calles de cada ruta (null = falló: se dibuja el trazado como respaldo).
  const [lineasCalles, setLineasCalles] = useState<Record<number, [number, number][] | null>>({});
  const [posiciones, setPosiciones] = useState<PosicionConductor[]>([]);
  const [unidades, setUnidades] = useState<string[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [cargandoServicios, setCargandoServicios] = useState(true);
  const [fechaIso, setFechaIso] = useState(getIsoToday());

  // Vista
  const [ocultas, setOcultas] = useState<ReadonlySet<number>>(new Set());
  const [seleccionadaId, setSeleccionadaId] = useState<number | null>(null);
  const [servicioElegidoId, setServicioElegidoId] = useState<number | null>(null);
  const [resaltadaId, setResaltadaId] = useState<number | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [foco, setFoco] = useState<FocoMapa | null>(null);
  const [listaAbierta, setListaAbierta] = useState(false);
  const [panelAbierto, setPanelAbierto] = useState(true);

  // Modales
  const [showModalNuevo, setShowModalNuevo] = useState(false);
  const [rutaInicial, setRutaInicial] = useState<number | null>(null);
  const [modalRutaAbierto, setModalRutaAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [servicioEditando, setServicioEditando] = useState<Servicio | null>(null);
  const [servicioCancelando, setServicioCancelando] = useState<Servicio | null>(null);
  const [servicioReprogramando, setServicioReprogramando] = useState<Servicio | null>(null);

  /* ------------------------------------------------------------------ */
  /* Carga                                                               */
  /* ------------------------------------------------------------------ */
  // El listado no trae paraderos ni trazado: se pide el detalle de cada ruta activa.
  const cargarRutas = useCallback(async () => {
    if (!api.listo) return;
    try {
      const lista = await api.getRutas(false);
      setRutasBase(lista);
      setCargandoRutas(false);
      const detallesLista = await Promise.all(lista.map((r) => api.getRuta(r.id).catch(() => null)));
      const mapa: Record<number, Ruta> = {};
      detallesLista.forEach((d) => {
        if (d) mapa[d.id] = d;
      });
      setDetalles(mapa);
      // La línea por calles se calcula en el servidor (OpenRouteService) y queda en caché hasta que
      // la ruta cambie. Cada ruta se dibuja apenas llega la suya.
      lista.forEach((r) => {
        api
          .getLineaCalles(r.id)
          .then((linea) => setLineasCalles((prev) => ({ ...prev, [r.id]: linea })))
          .catch(() => setLineasCalles((prev) => ({ ...prev, [r.id]: null })));
      });
      if (detallesLista.some((d) => d === null)) toast.error('No se pudieron cargar las paradas de algunas rutas');
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudieron cargar las rutas'));
    } finally {
      setCargandoRutas(false);
      setCargandoDetalles(false);
    }
  }, [api]);

  useEffect(() => {
    cargarRutas();
  }, [cargarRutas]);

  useEffect(() => {
    if (!api.listo) return;
    api.getUnidades().then(setUnidades).catch(() => setUnidades([]));
  }, [api]);

  const cargarServicios = useCallback(
    async (silencioso = false) => {
      if (!api.listo) return;
      try {
        setServicios(await api.getServicios(fechaIso));
      } catch (error) {
        // En el refresco automático no se molesta al usuario con un toast por cada fallo.
        if (!silencioso) toast.error(mensajeError(error, 'No se pudieron cargar los servicios'));
      } finally {
        setCargandoServicios(false);
      }
    },
    [api, fechaIso],
  );

  // Servicios del día elegido + refresco periódico mientras la pestaña está visible.
  useEffect(() => {
    setCargandoServicios(true);
    cargarServicios();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') cargarServicios(true);
    }, INTERVALO_REFRESCO_MS);
    return () => clearInterval(timer);
  }, [cargarServicios]);

  /* ------------------------------------------------------------------ */
  /* Datos derivados                                                     */
  /* ------------------------------------------------------------------ */
  // Rutas activas ordenadas por código, con su color y el detalle (paraderos + trazado).
  const rutas = useMemo<RutaVista[]>(
    () =>
      rutasBase
        .filter((r) => r.activo)
        .sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }))
        .map((r, i) => {
          const d = detalles[r.id];
          return {
            ...r,
            descripcion: d?.descripcion ?? r.descripcion,
            paraderos: d?.paraderos ?? [],
            trazado: d?.trazado ?? null,
            duracionMin: r.duracionMin || d?.duracionMin || 0,
            color: RUTA_COLORES[i % RUTA_COLORES.length],
            lineaCalles: lineasCalles[r.id] ?? null,
          };
        }),
    [rutasBase, detalles, lineasCalles],
  );

  const colorPorRuta = useMemo(() => Object.fromEntries(rutas.map((r) => [r.id, r.color])), [rutas]);
  const rutasPorId = useMemo(() => Object.fromEntries(rutas.map((r) => [r.id, r])), [rutas]);
  const grupos = useMemo(() => Array.from(new Set(rutas.map((r) => r.grupo))).sort(), [rutas]);
  const rutasVisibles = useMemo(() => rutas.filter((r) => !ocultas.has(r.id)), [rutas, ocultas]);

  const resumenes = useMemo(() => {
    const res: Record<number, ResumenRuta> = {};
    for (const r of rutas) {
      const propios = servicios.filter((s) => s.rutaId === r.id);
      res[r.id] = {
        referencia: servicioReferencia(propios),
        total: propios.length,
        enCurso: propios.filter((s) => s.estado === 'EN_CURSO').length,
      };
    }
    return res;
  }, [rutas, servicios]);

  const seleccionada = seleccionadaId !== null ? rutasPorId[seleccionadaId] ?? null : null;
  const serviciosSeleccionada = useMemo(
    () => (seleccionadaId === null ? [] : servicios.filter((s) => s.rutaId === seleccionadaId)),
    [servicios, seleccionadaId],
  );
  const servicioActual =
    serviciosSeleccionada.find((s) => s.id === servicioElegidoId) ?? servicioReferencia(serviciosSeleccionada);

  // El panel de servicios muestra solo los de las rutas que están en el mapa.
  const serviciosEnMapa = useMemo(() => servicios.filter((s) => !ocultas.has(s.rutaId)), [servicios, ocultas]);
  const enCursoTotal = servicios.filter((s) => s.estado === 'EN_CURSO').length;

  // Posiciones en vivo cada 5 s mientras la pestaña está visible. Si la API falla se conserva
  // la última posición conocida (sin avisos: es un refresco automático).
  useEffect(() => {
    if (!api.listo) return;
    let activo = true;
    const cargar = () => {
      if (document.visibilityState !== 'visible') return;
      api
        .getPosiciones()
        .then((lista) => {
          if (activo) setPosiciones(lista);
        })
        .catch(() => undefined);
    };
    cargar();
    const timer = setInterval(cargar, INTERVALO_POSICIONES_MS);
    return () => {
      activo = false;
      clearInterval(timer);
    };
  }, [api]);

  const panelVisible = seleccionada !== null || panelAbierto;
  const margenDerecho = esEscritorio && panelVisible ? ANCHO_PANEL : 0;
  const claveEncuadre = `${seleccionadaId ?? 'todas'}|${rutasVisibles.map((r) => r.id).join(',')}|${
    Object.keys(detalles).length
  }|${margenDerecho}`;

  const esHoy = fechaIso === getIsoToday();
  const fechaTexto = useMemo(() => {
    const fecha = new Date(`${fechaIso}T00:00:00`);
    return Number.isNaN(fecha.getTime())
      ? fechaIso
      : fecha.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
  }, [fechaIso]);

  /* ------------------------------------------------------------------ */
  /* Acciones de vista                                                   */
  /* ------------------------------------------------------------------ */
  const mostrarRuta = (id: number) =>
    setOcultas((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

  const seleccionarRuta = useCallback((id: number) => {
    setSeleccionadaId(id);
    setServicioElegidoId(null);
    mostrarRuta(id);
    setListaAbierta(false);
  }, []);

  const cerrarRuta = useCallback(() => {
    setSeleccionadaId(null);
    setServicioElegidoId(null);
  }, []);

  const abrirServicio = (s: Servicio) => {
    setSeleccionadaId(s.rutaId);
    setServicioElegidoId(s.id);
    mostrarRuta(s.rutaId);
  };

  const cambiarVisibles = (ids: number[], visible: boolean) => {
    setOcultas((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (visible ? next.delete(id) : next.add(id)));
      return next;
    });
    // Si se oculta la ruta abierta, se cierra su detalle.
    if (!visible && seleccionadaId !== null && ids.includes(seleccionadaId)) cerrarRuta();
  };

  const enfocarParadero = (p: Paradero) => setFoco({ lat: p.latitud, lng: p.longitud, clave: Date.now() });

  // Esc cierra el detalle de la ruta
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (e.key === 'Escape' && tag !== 'INPUT' && tag !== 'SELECT' && tag !== 'TEXTAREA') cerrarRuta();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cerrarRuta]);

  /* ------------------------------------------------------------------ */
  /* Servicios                                                           */
  /* ------------------------------------------------------------------ */
  const abrirNuevo = (rutaId: number | null = null) => {
    setServicioEditando(null);
    setRutaInicial(rutaId);
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

  // Editar la ruta abierta (mismo modal que Administrar rutas). El backend recalcula el trazado.
  const handleGuardarRuta = async (form: RutaForm) => {
    if (!seleccionada) return;
    setGuardando(true);
    try {
      await api.actualizarRuta(seleccionada.id, rutaFormAGuardar(form));
      setModalRutaAbierto(false);
      toast.success('Ruta guardada');
      await cargarRutas();
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo guardar la ruta'));
    } finally {
      setGuardando(false);
    }
  };

  const accionesServicio = {
    onEditar: abrirEdicion,
    onReprogramar: setServicioReprogramando,
    onCancelar: setServicioCancelando,
  };

  return (
    <div className="flex h-screen w-full flex-col bg-slate-100">
      <Toaster position="top-right" richColors />

      {/* Encabezado */}
      <header className="flex h-14 shrink-0 items-stretch bg-[#1E40AF] text-white shadow-sm">
        <div className="flex items-center gap-2.5 bg-[#0B1F4D] px-4">
          <RouteIcon className="h-5 w-5 text-amber-400" />
          <div className="leading-tight">
            <div className="text-[9.5px] font-semibold tracking-[0.18em] text-blue-200">TRACKVEL SYSTEM</div>
            <div className="text-[13px] font-bold tracking-wide">SERVICIOS RUTAS</div>
          </div>
        </div>

        <div className="ml-4 hidden flex-col justify-center border-l-2 border-white/25 pl-3 leading-tight md:flex">
          <div className="text-[9.5px] font-semibold tracking-[0.18em] text-blue-200">MONITOREO</div>
          <div className="text-[13px] font-semibold">
            {rutas.length} rutas · {servicios.length} servicio{servicios.length === 1 ? '' : 's'}
            {enCursoTotal > 0 && <span className="text-green-300"> · {enCursoTotal} en curso</span>}
            {posiciones.length > 0 && <span className="text-amber-300"> · {posiciones.length} en vivo</span>}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2 px-3">
          <label
            className="flex h-8 items-center gap-1.5 rounded-md border border-white/30 bg-white/10 px-2 text-[12px] font-medium hover:bg-white/15"
            title="Día de los servicios"
          >
            <CalendarDays className="h-3.5 w-3.5 text-blue-200" />
            <input
              type="date"
              value={fechaIso}
              onChange={(e) => e.target.value && setFechaIso(e.target.value)}
              className="w-[112px] bg-transparent text-white outline-none [color-scheme:dark]"
            />
          </label>
          {!esHoy && (
            <button
              type="button"
              onClick={() => setFechaIso(getIsoToday())}
              className="hidden h-8 rounded-md px-2 text-[12px] font-medium text-blue-100 hover:bg-white/10 sm:block"
            >
              Hoy
            </button>
          )}
          <Link
            href="/trackvelnew/serviciosrutas/reportes"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-8 items-center gap-1.5 rounded-md border border-white/40 px-3 text-[12px] font-semibold hover:bg-white/10"
            title="Reportes de servicios y paradas (abre en nueva pestaña)"
          >
            <FileBarChart2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Reportes</span>
          </Link>
          <Link
            href="/trackvelnew/serviciosrutas/rutas"
            className="flex h-8 items-center gap-1.5 rounded-md border border-white/40 px-3 text-[12px] font-semibold hover:bg-white/10"
            title="Administrar rutas"
          >
            <Settings2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Administrar rutas</span>
          </Link>
          <button
            type="button"
            onClick={() => abrirNuevo(seleccionadaId)}
            disabled={!api.listo}
            className="flex h-8 items-center gap-1.5 rounded-md bg-white px-3 text-[12px] font-semibold text-[#1E40AF] shadow-sm hover:bg-blue-50 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Nuevo servicio</span>
          </button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        {/* Lista de rutas: fija en escritorio, cajón en móvil */}
        {listaAbierta && (
          <div className="absolute inset-0 z-20 bg-slate-900/30 md:hidden" onClick={() => setListaAbierta(false)} />
        )}
        <aside
          className={`${
            listaAbierta ? 'flex' : 'hidden'
          } absolute inset-y-0 left-0 z-30 w-[300px] max-w-[85vw] flex-col border-r border-slate-200 shadow-xl md:static md:z-auto md:flex md:shadow-none`}
        >
          <ListaRutas
            rutas={rutas}
            cargando={cargandoRutas}
            ocultas={ocultas}
            onCambiarVisibles={cambiarVisibles}
            seleccionadaId={seleccionadaId}
            onSeleccionar={seleccionarRuta}
            onResaltar={setResaltadaId}
            resumenes={resumenes}
            busqueda={busqueda}
            onBuscar={setBusqueda}
          />
        </aside>

        {/* Mapa + panel flotante */}
        <main className="relative min-w-0 flex-1">
          <MapaRutas
            rutas={rutasVisibles}
            posiciones={posiciones}
            colorPorRuta={colorPorRuta}
            seleccionadaId={seleccionadaId}
            resaltadaId={resaltadaId}
            paraderosCompletados={servicioActual?.paraderosCompletados ?? 0}
            onSeleccionar={seleccionarRuta}
            foco={foco}
            margenDerecho={margenDerecho}
            claveEncuadre={claveEncuadre}
            accesosIzquierda={
              <button
                type="button"
                onClick={() => setListaAbierta(true)}
                title="Ver rutas"
                className="flex h-[34px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] font-semibold text-slate-700 shadow-md md:hidden"
              >
                <PanelLeftOpen className="h-4 w-4" />
                Rutas
              </button>
            }
          />

          {panelVisible ? (
            <section className="absolute inset-x-2 bottom-2 z-10 flex h-[55%] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl lg:inset-x-auto lg:bottom-3 lg:right-3 lg:top-3 lg:h-auto lg:w-[340px]">
              {seleccionada ? (
                <PanelRuta
                  key={seleccionada.id}
                  ruta={seleccionada}
                  servicios={serviciosSeleccionada}
                  servicio={servicioActual}
                  onElegirServicio={(s) => setServicioElegidoId(s.id)}
                  cargandoDetalle={cargandoDetalles}
                  fechaTexto={fechaTexto}
                  onCerrar={cerrarRuta}
                  onEnfocarParadero={enfocarParadero}
                  onEditarRuta={() => setModalRutaAbierto(true)}
                  onNuevoServicio={() => abrirNuevo(seleccionada.id)}
                  puedeCrear={api.listo}
                  {...accionesServicio}
                />
              ) : (
                <PanelServicios
                  servicios={serviciosEnMapa}
                  rutasPorId={rutasPorId}
                  fechaTexto={fechaTexto}
                  esHoy={esHoy}
                  cargando={cargandoServicios}
                  onAbrir={abrirServicio}
                  onNuevo={() => abrirNuevo(null)}
                  puedeCrear={api.listo}
                  onCerrar={() => setPanelAbierto(false)}
                  {...accionesServicio}
                />
              )}
            </section>
          ) : (
            <button
              type="button"
              onClick={() => setPanelAbierto(true)}
              className="absolute right-3 top-3 z-10 flex h-[34px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 shadow-md hover:text-[#1E40AF]"
            >
              <ListChecks className="h-4 w-4" />
              Servicios
              <span className="rounded-full bg-slate-100 px-1.5 text-[11px]">{serviciosEnMapa.length}</span>
            </button>
          )}
        </main>
      </div>

      <ModalNuevoServicio
        isOpen={showModalNuevo}
        onClose={() => setShowModalNuevo(false)}
        rutas={rutas}
        grupos={grupos}
        unidades={unidades}
        servicio={servicioEditando}
        rutaInicial={rutaInicial}
        guardando={guardando}
        onGuardar={handleGuardarServicio}
      />

      <ModalReprogramar
        servicio={servicioReprogramando}
        guardando={guardando}
        onClose={() => setServicioReprogramando(null)}
        onGuardar={confirmarReprogramacion}
      />

      <ModalRuta
        isOpen={modalRutaAbierto}
        onClose={() => setModalRutaAbierto(false)}
        ruta={seleccionada}
        grupos={grupos}
        guardando={guardando}
        onGuardar={handleGuardarRuta}
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

export default ServiciosRutasView;
