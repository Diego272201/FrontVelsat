'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { toast, Toaster } from 'sonner';
import '@/app/styles/sonner.css';
import {
  Ban,
  ListChecks,
  PanelLeftOpen,
  Plus,
} from 'lucide-react';
import BaseModal from '@/app/components/ui/BaseModal';
import EncabezadoServiciosRutas from './EncabezadoServiciosRutas';
import ListaRutas, { ResumenRuta } from './ListaRutas';
import ModalNuevoServicio from './ModalNuevoServicio';
import ModalReprogramar, { ReprogramarForm } from './ModalReprogramar';
import ModalTolerancia from './ModalTolerancia';
import PanelRuta from './PanelRuta';
import PanelServicios from './PanelServicios';
import type { FocoMapa } from './MapaRutas';
import { mensajeError, useServiciosRutasApi } from './api';
import { usePosicionesEnVivo } from './usePosicionesEnVivo';
import {
  AvisoServicio,
  NuevoServicioForm,
  Paradero,
  Ruta,
  RutaVista,
  Servicio,
} from './types';
import { getIsoToday, RUTA_COLORES, servicioReferencia } from './utils';

// Leaflet necesita `window`: el mapa se carga solo en el navegador
const MapaRutas = dynamic(() => import('./MapaRutas'), { ssr: false });

// Cada cuánto se refrescan los servicios (polling). Las marcas de llegada/salida las
// envía la app del conductor y esta pantalla solo las consulta.
const INTERVALO_REFRESCO_MS = 15000;

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
  const [unidades, setUnidades] = useState<string[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [cargandoServicios, setCargandoServicios] = useState(true);
  const [fechaIso, setFechaIso] = useState(getIsoToday());

  // Vista
  const [ocultas, setOcultas] = useState<ReadonlySet<number>>(new Set());
  const [seleccionadaId, setSeleccionadaId] = useState<number | null>(null);
  const [servicioElegidoId, setServicioElegidoId] = useState<number | null>(
    null,
  );
  const [resaltadaId, setResaltadaId] = useState<number | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [foco, setFoco] = useState<FocoMapa | null>(null);
  const [listaAbierta, setListaAbierta] = useState(false);
  const [panelAbierto, setPanelAbierto] = useState(true);

  // Modales
  const [showModalNuevo, setShowModalNuevo] = useState(false);
  const [rutaInicial, setRutaInicial] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [servicioEditando, setServicioEditando] = useState<Servicio | null>(
    null,
  );
  const [servicioCancelando, setServicioCancelando] = useState<Servicio | null>(
    null,
  );
  const [servicioReprogramando, setServicioReprogramando] =
    useState<Servicio | null>(null);

  // Tolerancia general (± minutos para considerar "a tiempo" la llegada a un paradero)
  const [toleranciaMin, setToleranciaMin] = useState<number | null>(null);
  const [modalTolerancia, setModalTolerancia] = useState(false);

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
      const detallesLista = await Promise.all(
        lista.map((r) => api.getRuta(r.id).catch(() => null)),
      );
      const mapa: Record<number, Ruta> = {};
      detallesLista.forEach((d) => {
        if (d) mapa[d.id] = d;
      });
      setDetalles(mapa);
      if (detallesLista.some((d) => d === null))
        toast.error('No se pudieron cargar las paradas de algunas rutas');
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
    api
      .getUnidades()
      .then(setUnidades)
      .catch(() => setUnidades([]));
  }, [api]);

  const cargarServicios = useCallback(
    async (silencioso = false) => {
      if (!api.listo) return;
      try {
        setServicios(await api.getServicios(fechaIso));
      } catch (error) {
        // En el refresco automático no se molesta al usuario con un toast por cada fallo.
        if (!silencioso)
          toast.error(
            mensajeError(error, 'No se pudieron cargar los servicios'),
          );
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

  // Tiempo real por SignalR. Posiciones: el backend no las guarda en la base. Avisos: cuando la app
  // marca una llegada/salida o cambia un servicio, se refresca al instante (el refresco de 15 s queda
  // como respaldo) y se muestra un aviso con lo ocurrido.
  const alRecibirAviso = useCallback(
    (aviso: AvisoServicio) => {
      const unidad = aviso.deviceID ? `${aviso.deviceID}: ` : '';
      if (aviso.tipo === 'LLEGADA') {
        const dif = aviso.diferenciaMin ?? 0;
        const estado = (aviso.estadoParadero ?? '')
          .replace('_', ' ')
          .toLowerCase();
        toast.info(
          `${unidad}llegó a ${aviso.paradero} · ${(aviso.hora ?? '').slice(0, 5)} (${estado}${
            dif !== 0 ? `, ${dif > 0 ? '+' : ''}${dif} min` : ''
          })`,
        );
      } else if (aviso.tipo === 'SALIDA') {
        toast.info(
          `${unidad}salió de ${aviso.paradero} · ${(aviso.hora ?? '').slice(0, 5)}${
            aviso.permanenciaMin != null
              ? ` (estuvo ${aviso.permanenciaMin} min)`
              : ''
          }`,
        );
      } else if (aviso.tipo === 'ESTADO') {
        toast.info(
          `${unidad}servicio ${(aviso.estadoServicio ?? '').replace('_', ' ').toLowerCase()}`,
        );
      }
      cargarServicios(true);
    },
    [cargarServicios],
  );
  const posiciones = usePosicionesEnVivo(alRecibirAviso);

  /* ------------------------------------------------------------------ */
  /* Datos derivados                                                     */
  /* ------------------------------------------------------------------ */
  // Rutas activas ordenadas por código, con su color y el detalle (paraderos + trazado).
  const rutas = useMemo<RutaVista[]>(
    () =>
      rutasBase
        .filter((r) => r.activo)
        .sort((a, b) =>
          a.codigo.localeCompare(b.codigo, undefined, { numeric: true }),
        )
        .map((r, i) => {
          const d = detalles[r.id];
          return {
            ...r,
            descripcion: d?.descripcion ?? r.descripcion,
            paraderos: d?.paraderos ?? [],
            trazado: d?.trazado ?? null,
            duracionMin: r.duracionMin || d?.duracionMin || 0,
            color: RUTA_COLORES[i % RUTA_COLORES.length],
          };
        }),
    [rutasBase, detalles],
  );

  const colorPorRuta = useMemo(
    () => Object.fromEntries(rutas.map((r) => [r.id, r.color])),
    [rutas],
  );
  const rutasPorId = useMemo(
    () => Object.fromEntries(rutas.map((r) => [r.id, r])),
    [rutas],
  );
  const grupos = useMemo(
    () => Array.from(new Set(rutas.map((r) => r.grupo))).sort(),
    [rutas],
  );
  const rutasVisibles = useMemo(
    () => rutas.filter((r) => !ocultas.has(r.id)),
    [rutas, ocultas],
  );

  // Servicios EN_CURSO cuya unidad está enviando posición ahora (vigente). Si deja de reportar, ya no cuenta.
  const serviciosEnVivo = useMemo(() => {
    const unidades = new Set(
      posiciones.map((p) => (p.deviceID ?? '').trim().toUpperCase()).filter(Boolean),
    );
    const ids = new Set<number>();
    for (const s of servicios) {
      if (s.estado !== 'EN_CURSO') continue;
      if (unidades.has((s.deviceID ?? '').trim().toUpperCase())) ids.add(s.id);
    }
    return ids;
  }, [posiciones, servicios]);

  const resumenes = useMemo(() => {
    const res: Record<number, ResumenRuta> = {};
    for (const r of rutas) {
      const propios = servicios.filter((s) => s.rutaId === r.id);
      res[r.id] = {
        referencia: servicioReferencia(propios),
        total: propios.length,
        enCurso: propios.filter((s) => s.estado === 'EN_CURSO').length,
        enVivo: propios.filter((s) => serviciosEnVivo.has(s.id)).length,
      };
    }
    return res;
  }, [rutas, servicios, serviciosEnVivo]);

  const seleccionada =
    seleccionadaId !== null ? (rutasPorId[seleccionadaId] ?? null) : null;
  const serviciosSeleccionada = useMemo(
    () =>
      seleccionadaId === null
        ? []
        : servicios.filter((s) => s.rutaId === seleccionadaId),
    [servicios, seleccionadaId],
  );
  const servicioActual =
    serviciosSeleccionada.find((s) => s.id === servicioElegidoId) ??
    servicioReferencia(serviciosSeleccionada);

  // Ocultar rutas del mapa no oculta sus servicios: el panel siempre muestra todos los del día.
  const serviciosEnMapa = servicios;
  const enCursoTotal = servicios.filter((s) => s.estado === 'EN_CURSO').length;

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
      : fecha.toLocaleDateString('es-PE', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        });
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
    if (!visible && seleccionadaId !== null && ids.includes(seleccionadaId))
      cerrarRuta();
  };

  const enfocarParadero = (p: Paradero) =>
    setFoco({ lat: p.latitud, lng: p.longitud, clave: Date.now() });

  // Esc cierra el detalle de la ruta
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (
        e.key === 'Escape' &&
        tag !== 'INPUT' &&
        tag !== 'SELECT' &&
        tag !== 'TEXTAREA'
      )
        cerrarRuta();
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

  // La tolerancia se pide una sola vez al entrar.
  useEffect(() => {
    if (!api.listo) return;
    api.getTolerancia().then(setToleranciaMin).catch(() => undefined);
  }, [api]);

  const guardarTolerancia = async (minutos: number) => {
    setGuardando(true);
    try {
      setToleranciaMin(await api.setTolerancia(minutos));
      toast.success('Tolerancia actualizada');
      setModalTolerancia(false);
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo guardar la tolerancia'));
    } finally {
      setGuardando(false);
    }
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
      toast.success(
        servicioEditando ? 'Servicio actualizado' : 'Servicio agregado',
      );
      // Si el servicio es de otro día, se muestra ese día para que el usuario lo vea.
      if (form.fechaIso !== fechaIso) setFechaIso(form.fechaIso);
      else await cargarServicios();
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo guardar el servicio'));
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

      {/* Encabezado institucional idéntico a Gestión de Rutas y Conductores */}
      <EncabezadoServiciosRutas
        totalRutas={rutas.length}
        totalServicios={servicios.length}
        enCursoTotal={enCursoTotal}
        posicionesTotal={posiciones.length}
        fechaIso={fechaIso}
        onFechaChange={setFechaIso}
        esHoy={esHoy}
        onHoy={() => setFechaIso(getIsoToday())}
        toleranciaMin={toleranciaMin}
        onAbrirTolerancia={() => setModalTolerancia(true)}
      />

      <div className="relative flex min-h-0 flex-1">
        {/* Lista de rutas: fija en escritorio, cajón en móvil */}
        {listaAbierta && (
          <div
            className="absolute inset-0 z-20 bg-slate-900/30 md:hidden"
            onClick={() => setListaAbierta(false)}
          />
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
                  serviciosEnVivo={serviciosEnVivo}
                  onElegirServicio={(s) => setServicioElegidoId(s.id)}
                  cargandoDetalle={cargandoDetalles}
                  fechaTexto={fechaTexto}
                  onCerrar={cerrarRuta}
                  onEnfocarParadero={enfocarParadero}
                  {...accionesServicio}
                />
              ) : (
                <PanelServicios
                  servicios={serviciosEnMapa}
                  serviciosEnVivo={serviciosEnVivo}
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
              <span className="rounded-full bg-slate-100 px-1.5 text-[11px]">
                {serviciosEnMapa.length}
              </span>
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

      <ModalTolerancia
        isOpen={modalTolerancia}
        valorActual={toleranciaMin ?? 5}
        guardando={guardando}
        onClose={() => setModalTolerancia(false)}
        onGuardar={guardarTolerancia}
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
        cancelButtonClass="bg-slate-100 hover:bg-slate-200 text-slate-700"
        loadingText="Cancelando..."
        confirmIcon={<Ban className="h-3.5 w-3.5" />}
        confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
        isLoading={guardando}
        onConfirm={confirmarCancelacion}
      >
        {servicioCancelando && (
          <p className="text-[13px] text-gray-700">
            Se cancelará el servicio de <b>{servicioCancelando.deviceID}</b> en
            la ruta <b>{servicioCancelando.rutaNombre}</b> de las{' '}
            <b>{servicioCancelando.horaSalida}</b>.
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
