'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import dynamic from 'next/dynamic';
import { Loader2, MapPin, Plus, Redo2, Spline, Trash2, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
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
import { useServiciosRutasApi } from '../api';
import { Ruta, Sentido } from '../types';
import type { FocoSelector, PuntoParadero } from './MapaSelectorParaderos';
import DatosRutaForm from './DatosRutaForm';
import EncabezadoEditor from './EncabezadoEditor';
import PanelTrazado from './PanelTrazado';
import TarjetaParadero from './TarjetaParadero';
import {
  Punto,
  agregarPunto,
  insertarDespuesDe as insertarPuntoDespuesDe,
  largoMetros,
  moverPunto,
  quitarPunto,
} from './trazado';
import { useEditorTrazado } from './useEditorTrazado';
import {
  ParaderoForm,
  RutaForm,
  coordenadasValidas,
  formDesdeRuta,
  nombreDeCoordenada,
  numeroValido,
  paraderoCompleto,
  paraderoVacio,
  redondear,
} from './formRuta';

export type { ParaderoForm, RutaForm } from './formRuta';
export { rutaFormAGuardar } from './formRuta';

// Leaflet necesita el navegador: el mapa se carga solo en el cliente.
const MapaSelectorParaderos = dynamic(() => import('./MapaSelectorParaderos'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
    </div>
  ),
});

interface ModalRutaProps {
  isOpen: boolean;
  onClose: () => void;
  /** null = ruta nueva. */
  ruta: Ruta | null;
  grupos: readonly string[];
  /** Rutas existentes: de ahí se elige la pareja (la del sentido contrario). */
  rutas: readonly Ruta[];
  guardando?: boolean;
  onGuardar: (form: RutaForm) => void;
}

const Editor: React.FC<Omit<ModalRutaProps, 'isOpen'>> = ({
  onClose,
  ruta,
  grupos,
  rutas,
  guardando = false,
  onGuardar,
}) => {
  const [form, setForm] = useState<RutaForm>(() => formDesdeRuta(ruta, grupos));
  const inicial = useRef(JSON.stringify(form));
  // true = el usuario eligió "+ Nuevo grupo…" y escribe el nombre a mano.
  const [nuevoGrupo, setNuevoGrupo] = useState(grupos.length === 0);
  // Por default los datos de la ruta salen mostrados
  const [datosAbiertos, setDatosAbiertos] = useState(true);
  // Paradero seleccionado para ver o editar (por uid); null = ninguno
  const [seleccionadoUid, setSeleccionadoUid] = useState<string | null>(null);
  // Paradero que espera clic en el mapa para ubicar coordenadas (por uid); null = ninguno
  const [colocandoUid, setColocandoUid] = useState<string | null>(() => {
    if (ruta) return null;
    const sinUbicar = form.paraderos.find((p) => !coordenadasValidas(p));
    return sinUbicar?.uid ?? null;
  });
  const [foco, setFoco] = useState<FocoSelector | null>(null);
  const focoClave = useRef(0);
  const [paraderoAEliminar, setParaderoAEliminar] = useState<{
    indice: number;
    nombre: string;
  } | null>(null);

  // Trazado (la línea del recorrido): se edita en la pestaña "Trazado", con historial para deshacer.
  const api = useServiciosRutasApi();
  const [modo, setModo] = useState<'paraderos' | 'trazado'>('paraderos');
  const t = useEditorTrazado(ruta?.trazado ?? null);
  const [puntoSel, setPuntoSel] = useState<number | null>(null);
  const [alInicio, setAlInicio] = useState(false);
  const [demasiadosPuntos, setDemasiadosPuntos] = useState(false);

  // Historial de paraderos para Deshacer / Rehacer (movimientos en el mapa, reordenamientos, altas y bajas)
  const [historialParaderos, setHistorialParaderos] = useState<{
    pasado: ParaderoForm[][];
    futuro: ParaderoForm[][];
  }>({ pasado: [], futuro: [] });

  const registrarHistorial = useCallback((paraderosPrevios: ParaderoForm[]) => {
    const copia = paraderosPrevios.map((p) => ({ ...p }));
    setHistorialParaderos((h) => ({
      pasado: [...h.pasado, copia].slice(-50),
      futuro: [],
    }));
  }, []);

  const deshacerParadero = useCallback(() => {
    if (historialParaderos.pasado.length === 0) return;

    const previo =
      historialParaderos.pasado[historialParaderos.pasado.length - 1];
    const copiaActual = form.paraderos.map((p) => ({ ...p }));

    setHistorialParaderos((h) => ({
      pasado: h.pasado.slice(0, -1),
      futuro: [copiaActual, ...h.futuro],
    }));

    setForm((prev) => ({
      ...prev,
      paraderos: previo.map((p) => ({ ...p })),
    }));
    setColocandoUid(null);

    toast.info('Cambio deshecho en paraderos', { id: 'paraderos-undo' });
  }, [form.paraderos, historialParaderos.pasado]);

  const rehacerParadero = useCallback(() => {
    if (historialParaderos.futuro.length === 0) return;

    const siguiente = historialParaderos.futuro[0];
    const copiaActual = form.paraderos.map((p) => ({ ...p }));

    setHistorialParaderos((h) => ({
      pasado: [...h.pasado, copiaActual],
      futuro: h.futuro.slice(1),
    }));

    setForm((prev) => ({
      ...prev,
      paraderos: siguiente.map((p) => ({ ...p })),
    }));
    setColocandoUid(null);

    toast.info('Cambio rehecho en paraderos', { id: 'paraderos-undo' });
  }, [form.paraderos, historialParaderos.futuro]);

  const puedeDeshacerParaderos = historialParaderos.pasado.length > 0;
  const puedeRehacerParaderos = historialParaderos.futuro.length > 0;

  // Cálculo automático de distancia a partir del trazado (no de los paraderos)
  useEffect(() => {
    if (t.trazado && t.trazado.length >= 2) {
      const kmCalculado = (
        Math.round((largoMetros(t.trazado) / 1000) * 100) / 100
      ).toFixed(2);
      setForm((prev) =>
        prev.distanciaKm === kmCalculado
          ? prev
          : { ...prev, distanciaKm: kmCalculado },
      );
    }
  }, [t.trazado]);

  const accionesTrazado = useMemo(
    () => ({
      onInsertar: (indice: number, lat: number, lng: number) => {
        t.aplicar(insertarPuntoDespuesDe(t.trazado, indice, [lat, lng]));
        setPuntoSel(indice + 1);
      },
      onMover: (indice: number, lat: number, lng: number) =>
        t.aplicar(moverPunto(t.trazado, indice, [lat, lng])),
      onSeleccionar: (indice: number) =>
        setPuntoSel((actual) => (actual === indice ? null : indice)),
      onEliminar: (indice: number) => {
        t.aplicar(quitarPunto(t.trazado, indice));
        setPuntoSel(null);
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t.trazado, t.aplicar],
  );

  // Ctrl+Z / Ctrl+Y para deshacer/rehacer tanto en Paraderos como en Trazado
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (
        el &&
        (el.tagName === 'INPUT' ||
          el.tagName === 'TEXTAREA' ||
          el.tagName === 'SELECT')
      )
        return;
      if (!(e.ctrlKey || e.metaKey)) return;
      const tecla = e.key.toLowerCase();
      if (tecla === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (modo === 'paraderos') {
          deshacerParadero();
        } else {
          t.deshacer();
        }
      } else if (tecla === 'y' || (tecla === 'z' && e.shiftKey)) {
        e.preventDefault();
        if (modo === 'paraderos') {
          rehacerParadero();
        } else {
          t.rehacer();
        }
      }
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [modo, deshacerParadero, rehacerParadero, t.deshacer, t.rehacer]);

  const cargarTrazadoDe = useCallback(
    async (rutaId: number): Promise<Punto[]> =>
      (await api.getRuta(rutaId)).trazado ?? [],
    [api],
  );
  const filasRef = useRef<Map<string, HTMLDivElement>>(new Map());

  const total = form.paraderos.length;
  const seleccionadoIdx = form.paraderos.findIndex(
    (p) => p.uid === seleccionadoUid,
  );
  const colocandoIdx = form.paraderos.findIndex((p) => p.uid === colocandoUid);

  const setCampo = <K extends keyof RutaForm>(campo: K, valor: RutaForm[K]) =>
    setForm((prev) => ({ ...prev, [campo]: valor }));

  // La pareja elegida deja de valer si el sentido cambia (tendría el mismo sentido que esta ruta).
  const cambiarSentido = (sentido: Sentido) =>
    setForm((prev) => ({ ...prev, sentido, rutaParejaId: '' }));

  const setParaderoPorUid = useCallback(
    (uid: string, cambios: Partial<ParaderoForm>) => {
      setForm((prev) => ({
        ...prev,
        paraderos: prev.paraderos.map((p) =>
          p.uid === uid ? { ...p, ...cambios } : p,
        ),
      }));
    },
    [],
  );

  const centrar = (lat: number, lng: number) =>
    setFoco({ lat, lng, clave: ++focoClave.current });

  const irAFila = (uid: string) =>
    window.setTimeout(
      () =>
        filasRef.current
          .get(uid)
          ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }),
      50,
    );

  /** Si el paradero no tiene nombre todavía, le propone el de la calle donde se ubicó. */
  const sugerirNombre = useCallback(
    async (uid: string, lat: number, lng: number) => {
      const nombre = await nombreDeCoordenada(lat, lng);
      if (!nombre) return;
      setForm((prev) => ({
        ...prev,
        paraderos: prev.paraderos.map((p) =>
          p.uid === uid && p.nombre.trim() === '' ? { ...p, nombre } : p,
        ),
      }));
    },
    [],
  );

  /* ------------------------- Acciones del mapa ------------------------- */

  const clickMapa = (lat: number, lng: number) => {
    // En la pestaña de trazado el clic agrega un punto a la línea (al final o al inicio).
    if (modo === 'trazado') {
      t.aplicar(agregarPunto(t.trazado, [lat, lng], alInicio));
      setPuntoSel(alInicio ? 0 : t.trazado.length);
      return;
    }

    // Si NO estamos colocando un paradero, el clic en el mapa NO hace nada.
    // Los paraderos nuevos solo se crean al presionar el botón "+ Agregar".
    if (!colocandoUid) return;

    const idxAColocar = form.paraderos.findIndex((p) => p.uid === colocandoUid);
    if (idxAColocar < 0) {
      setColocandoUid(null);
      return;
    }

    const latitud = redondear(lat);
    const longitud = redondear(lng);

    registrarHistorial(form.paraderos);
    const actual = form.paraderos[idxAColocar];
    setParaderoPorUid(actual.uid!, { latitud, longitud });
    if (actual.nombre.trim() === '')
      void sugerirNombre(actual.uid!, lat, lng);

    // Pasa al siguiente paradero sin ubicar solo si existe
    const siguiente = form.paraderos.find(
      (p, i) => i > idxAColocar && !coordenadasValidas(p),
    );
    if (siguiente?.uid) {
      setColocandoUid(siguiente.uid);
      setSeleccionadoUid(siguiente.uid);
      irAFila(siguiente.uid);
    } else {
      setColocandoUid(null);
    }
  };

  const moverMarcador = (indice: number, lat: number, lng: number) => {
    const p = form.paraderos[indice];
    if (!p?.uid) return;
    registrarHistorial(form.paraderos);
    setParaderoPorUid(p.uid, {
      latitud: redondear(lat),
      longitud: redondear(lng),
    });
    if (p.nombre.trim() === '') void sugerirNombre(p.uid, lat, lng);
  };

  const seleccionarIdx = (indice: number) => {
    const p = form.paraderos[indice];
    if (!p?.uid) return;
    setSeleccionadoUid(p.uid);
    // Si no tiene coordenadas válidas, activar colocación con el clic en el mapa
    if (!coordenadasValidas(p)) {
      setColocandoUid(p.uid);
    } else {
      setColocandoUid(null);
    }
    irAFila(p.uid);
    if (coordenadasValidas(p)) centrar(Number(p.latitud), Number(p.longitud));
  };

  /* ----------------------- Acciones de la lista ------------------------ */

  const agregarParadero = () => {
    registrarHistorial(form.paraderos);
    const nuevo = paraderoVacio();
    setForm((prev) => ({ ...prev, paraderos: [...prev.paraderos, nuevo] }));
    setColocandoUid(nuevo.uid!);
    setSeleccionadoUid(nuevo.uid!);
    irAFila(nuevo.uid!);
  };

  const insertarDespuesDe = (indice: number) => {
    registrarHistorial(form.paraderos);
    const nuevo = paraderoVacio();
    setForm((prev) => {
      const copia = [...prev.paraderos];
      copia.splice(indice + 1, 0, nuevo);
      return { ...prev, paraderos: copia };
    });
    setColocandoUid(nuevo.uid!);
    setSeleccionadoUid(nuevo.uid!);
    irAFila(nuevo.uid!);
  };

  const quitarParadero = (indice: number) => {
    registrarHistorial(form.paraderos);
    const quitado = form.paraderos[indice];
    setForm((prev) => ({
      ...prev,
      paraderos: prev.paraderos.filter((_, i) => i !== indice),
    }));
    if (quitado?.uid === colocandoUid) setColocandoUid(null);
    if (quitado?.uid === seleccionadoUid) setSeleccionadoUid(null);
  };

  const mover = (indice: number, delta: -1 | 1) => {
    const destino = indice + delta;
    if (destino < 0 || destino >= form.paraderos.length) return;
    registrarHistorial(form.paraderos);
    setForm((prev) => {
      const copia = [...prev.paraderos];
      [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
      return { ...prev, paraderos: copia };
    });
  };

  /* ----------------------------- Validación ---------------------------- */

  const incompletos = form.paraderos.filter((p) => !paraderoCompleto(p)).length;
  const completo =
    form.codigo.trim() !== '' &&
    form.nombre.trim() !== '' &&
    (!nuevoGrupo || form.grupo.trim() !== '') &&
    form.paraderos.length >= 2 &&
    incompletos === 0;

  const pendiente = completo
    ? ''
    : incompletos > 0
      ? `${incompletos} paradero${incompletos === 1 ? '' : 's'} por completar`
      : 'Completa los datos de la ruta';

  const puntos = useMemo<PuntoParadero[]>(
    () =>
      form.paraderos.flatMap((p, indice) =>
        coordenadasValidas(p)
          ? [
              {
                indice,
                nombre: p.nombre,
                lat: Number(p.latitud),
                lng: Number(p.longitud),
                radio:
                  numeroValido(p.radioMetros) && Number(p.radioMetros) > 0
                    ? Number(p.radioMetros)
                    : 25,
              },
            ]
          : [],
      ),
    [form.paraderos],
  );

  const intentarCerrar = () => {
    if (guardando) return;
    if (
      (JSON.stringify(form) !== inicial.current || t.editado) &&
      !window.confirm('Hay cambios sin guardar. ¿Salir de todos modos?')
    ) {
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-100">
      <EncabezadoEditor
        titulo={ruta ? `Editar ruta · ${ruta.codigo}` : 'Nueva ruta'}
        pendiente={pendiente}
        guardando={guardando}
        puedeGuardar={completo}
        onCancelar={intentarCerrar}
        // El trazado solo viaja si se tocó: si no, el backend conserva el que ya tiene la ruta.
        onGuardar={() =>
          onGuardar({ ...form, trazado: t.editado ? t.trazado : undefined })
        }
      />

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Panel izquierdo: datos de la ruta y lista de paraderos */}
        <div className="flex max-h-[55%] w-full shrink-0 flex-col border-b border-slate-200 bg-white lg:max-h-none lg:w-[430px] lg:border-b-0 lg:border-r">
          <div className="grid shrink-0 grid-cols-2 gap-1 border-b border-slate-200 bg-slate-50 p-1.5">
            {(
              [
                {
                  id: 'paraderos',
                  texto: 'Paraderos',
                  Icono: MapPin,
                  count: total,
                },
                {
                  id: 'trazado',
                  texto: 'Trazado',
                  Icono: Spline,
                  count: t.trazado.length,
                },
              ] as const
            ).map(({ id, texto, Icono, count }) => (
              <button
                key={id}
                type="button"
                onClick={() => setModo(id)}
                className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 text-[12.5px] font-semibold transition ${
                  modo === id
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icono className="h-3.5 w-3.5" />
                <span>{texto}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10.5px] font-bold ${
                    modo === id
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-slate-200/80 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {modo === 'trazado' && (
              <PanelTrazado
                trazado={t.trazado}
                seleccionado={puntoSel}
                demasiadosPuntos={demasiadosPuntos}
                alInicio={alInicio}
                onAlInicio={setAlInicio}
                puedeDeshacer={t.puedeDeshacer}
                puedeRehacer={t.puedeRehacer}
                onDeshacer={t.deshacer}
                onRehacer={t.rehacer}
                onAplicar={t.aplicar}
                onDeseleccionar={() => setPuntoSel(null)}
                otrasRutas={rutas.filter((r) => r.id !== ruta?.id)}
                onCargarTrazadoDe={cargarTrazadoDe}
                origen={
                  coordenadasValidas(form.paraderos[0])
                    ? [
                        Number(form.paraderos[0].latitud),
                        Number(form.paraderos[0].longitud),
                      ]
                    : null
                }
                destino={
                  total > 1 && coordenadasValidas(form.paraderos[total - 1])
                    ? [
                        Number(form.paraderos[total - 1].latitud),
                        Number(form.paraderos[total - 1].longitud),
                      ]
                    : null
                }
                onUsarDistancia={(km) => setCampo('distanciaKm', String(km))}
              />
            )}

            {modo === 'paraderos' && (
              <>
                <DatosRutaForm
                  form={form}
                  ruta={ruta}
                  grupos={grupos}
                  rutas={rutas}
                  abierto={datosAbiertos}
                  onToggle={() => setDatosAbiertos((v) => !v)}
                  nuevoGrupo={nuevoGrupo}
                  onNuevoGrupo={setNuevoGrupo}
                  onCampo={setCampo}
                  onCambiarSentido={cambiarSentido}
                />

                <div className="px-3 py-2.5">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-[11.5px] font-bold uppercase tracking-wider text-slate-700">
                      Paraderos ({total})
                    </h3>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={deshacerParadero}
                        disabled={!puedeDeshacerParaderos}
                        title="Deshacer cambio en paraderos (Ctrl+Z)"
                        className="flex h-7 items-center gap-1 rounded border border-slate-300 bg-white px-2 text-[11px] font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <Undo2 className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Deshacer</span>
                      </button>

                      <button
                        type="button"
                        onClick={rehacerParadero}
                        disabled={!puedeRehacerParaderos}
                        title="Rehacer cambio en paraderos (Ctrl+Y)"
                        className="flex h-7 items-center gap-1 rounded border border-slate-300 bg-white px-2 text-[11px] font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <Redo2 className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Rehacer</span>
                      </button>

                      <button
                        type="button"
                        onClick={agregarParadero}
                        className="flex h-7 items-center gap-1 rounded-md bg-blue-600 px-2.5 text-[11.5px] font-medium text-white transition hover:bg-blue-700"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Agregar
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {form.paraderos.map((p, i) => (
                      <TarjetaParadero
                        key={p.uid}
                        paradero={p}
                        indice={i}
                        total={total}
                        activo={p.uid === seleccionadoUid}
                        colocando={p.uid === colocandoUid}
                        registrarFila={(el) => {
                          if (!p.uid) return;
                          if (el) filasRef.current.set(p.uid, el);
                          else filasRef.current.delete(p.uid);
                        }}
                        onSeleccionar={() => seleccionarIdx(i)}
                        onCambio={(cambios) =>
                          setParaderoPorUid(p.uid!, cambios)
                        }
                        onMover={(delta) => mover(i, delta)}
                        onInsertarDespues={() => insertarDespuesDe(i)}
                        onQuitar={() =>
                          setParaderoAEliminar({
                            indice: i,
                            nombre: p.nombre.trim() || `Paradero ${i + 1}`,
                          })
                        }
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Mapa */}
        <div className="relative min-h-[260px] flex-1">
          <MapaSelectorParaderos
            puntos={puntos}
            total={total}
            activo={seleccionadoIdx >= 0 ? seleccionadoIdx : null}
            colocando={colocandoIdx >= 0 ? colocandoIdx : null}
            onClickMapa={clickMapa}
            onMover={moverMarcador}
            onSeleccionar={seleccionarIdx}
            foco={foco}
            claveEncuadre={`${ruta?.id ?? 'nueva'}`}
            modo={modo}
            trazado={t.trazado}
            puntoSeleccionado={puntoSel}
            accionesTrazado={accionesTrazado}
            onDemasiadosPuntos={setDemasiadosPuntos}
          />
        </div>
      </div>

      {/* Alerta de confirmación para eliminar paradero */}
      {paraderoAEliminar && (
        <AlertDialog
          open={paraderoAEliminar !== null}
          onOpenChange={(open) => !open && setParaderoAEliminar(null)}
        >
          <AlertDialogContent className="z-[160] max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="h-5 w-5" />
                <span>¿Eliminar paradero?</span>
              </AlertDialogTitle>
              <AlertDialogDescription className="text-[13px] text-slate-600">
                ¿Estás seguro de que deseas eliminar{' '}
                <strong className="text-slate-900">
                  {paraderoAEliminar.nombre}
                </strong>
                ? Esta acción quitará el paradero de la ruta. Podrás deshacerlo en cualquier momento con el botón Deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setParaderoAEliminar(null)}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  quitarParadero(paraderoAEliminar.indice);
                  setParaderoAEliminar(null);
                }}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

// Editor a pantalla completa: el estado del formulario nace al abrir (se desmonta al cerrar).
const ModalRuta: React.FC<ModalRutaProps> = ({ isOpen, ...resto }) =>
  isOpen ? <Editor key={resto.ruta?.id ?? 'nueva'} {...resto} /> : null;

export default ModalRuta;
