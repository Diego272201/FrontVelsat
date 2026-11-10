'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, Plus } from 'lucide-react';
import { Ruta, Sentido } from '../types';
import type { FocoSelector, PuntoParadero } from './MapaSelectorParaderos';
import DatosRutaForm from './DatosRutaForm';
import EncabezadoEditor from './EncabezadoEditor';
import TarjetaParadero from './TarjetaParadero';
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
  const [datosAbiertos, setDatosAbiertos] = useState(!ruta);
  // Paradero que recibe el próximo clic del mapa (por uid); null = el clic crea uno nuevo.
  const [activoUid, setActivoUid] = useState<string | null>(() => (ruta ? null : (form.paraderos[0].uid ?? null)));
  const [foco, setFoco] = useState<FocoSelector | null>(null);
  const focoClave = useRef(0);
  const filasRef = useRef<Map<string, HTMLDivElement>>(new Map());

  const total = form.paraderos.length;
  const activoIdx = form.paraderos.findIndex((p) => p.uid === activoUid);

  const setCampo = <K extends keyof RutaForm>(campo: K, valor: RutaForm[K]) =>
    setForm((prev) => ({ ...prev, [campo]: valor }));

  // La pareja elegida deja de valer si el sentido cambia (tendría el mismo sentido que esta ruta).
  const cambiarSentido = (sentido: Sentido) => setForm((prev) => ({ ...prev, sentido, rutaParejaId: '' }));

  const setParaderoPorUid = useCallback((uid: string, cambios: Partial<ParaderoForm>) => {
    setForm((prev) => ({
      ...prev,
      paraderos: prev.paraderos.map((p) => (p.uid === uid ? { ...p, ...cambios } : p)),
    }));
  }, []);

  const centrar = (lat: number, lng: number) => setFoco({ lat, lng, clave: ++focoClave.current });

  const irAFila = (uid: string) =>
    window.setTimeout(() => filasRef.current.get(uid)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);

  /** Si el paradero no tiene nombre todavía, le propone el de la calle donde se ubicó. */
  const sugerirNombre = useCallback(async (uid: string, lat: number, lng: number) => {
    const nombre = await nombreDeCoordenada(lat, lng);
    if (!nombre) return;
    setForm((prev) => ({
      ...prev,
      paraderos: prev.paraderos.map((p) => (p.uid === uid && p.nombre.trim() === '' ? { ...p, nombre } : p)),
    }));
  }, []);

  /* ------------------------- Acciones del mapa ------------------------- */

  const clickMapa = (lat: number, lng: number) => {
    const latitud = redondear(lat);
    const longitud = redondear(lng);

    if (activoIdx >= 0) {
      const actual = form.paraderos[activoIdx];
      setParaderoPorUid(actual.uid!, { latitud, longitud });
      if (actual.nombre.trim() === '') void sugerirNombre(actual.uid!, lat, lng);
      // Pasa solo al siguiente paradero sin ubicar; si no hay, el próximo clic crea uno nuevo.
      const siguiente = form.paraderos.find((p, i) => i > activoIdx && !coordenadasValidas(p));
      setActivoUid(siguiente?.uid ?? null);
      if (siguiente?.uid) irAFila(siguiente.uid);
      return;
    }

    const nuevo: ParaderoForm = { ...paraderoVacio(), latitud, longitud };
    setForm((prev) => ({ ...prev, paraderos: [...prev.paraderos, nuevo] }));
    irAFila(nuevo.uid!);
    void sugerirNombre(nuevo.uid!, lat, lng);
  };

  const moverMarcador = (indice: number, lat: number, lng: number) => {
    const p = form.paraderos[indice];
    if (!p?.uid) return;
    setParaderoPorUid(p.uid, { latitud: redondear(lat), longitud: redondear(lng) });
    if (p.nombre.trim() === '') void sugerirNombre(p.uid, lat, lng);
  };

  const seleccionarIdx = (indice: number) => {
    const p = form.paraderos[indice];
    if (!p?.uid) return;
    setActivoUid(p.uid);
    irAFila(p.uid);
    if (coordenadasValidas(p)) centrar(Number(p.latitud), Number(p.longitud));
  };

  /* ----------------------- Acciones de la lista ------------------------ */

  const agregarParadero = () => {
    const nuevo = paraderoVacio();
    setForm((prev) => ({ ...prev, paraderos: [...prev.paraderos, nuevo] }));
    setActivoUid(nuevo.uid!);
    irAFila(nuevo.uid!);
  };

  const insertarDespuesDe = (indice: number) => {
    const nuevo = paraderoVacio();
    setForm((prev) => {
      const copia = [...prev.paraderos];
      copia.splice(indice + 1, 0, nuevo);
      return { ...prev, paraderos: copia };
    });
    setActivoUid(nuevo.uid!);
    irAFila(nuevo.uid!);
  };

  const quitarParadero = (indice: number) => {
    const quitado = form.paraderos[indice];
    setForm((prev) => ({ ...prev, paraderos: prev.paraderos.filter((_, i) => i !== indice) }));
    if (quitado?.uid === activoUid) setActivoUid(null);
  };

  const mover = (indice: number, delta: -1 | 1) =>
    setForm((prev) => {
      const destino = indice + delta;
      if (destino < 0 || destino >= prev.paraderos.length) return prev;
      const copia = [...prev.paraderos];
      [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
      return { ...prev, paraderos: copia };
    });

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
                radio: numeroValido(p.radioMetros) ? Number(p.radioMetros) : 0,
              },
            ]
          : [],
      ),
    [form.paraderos],
  );

  const intentarCerrar = () => {
    if (guardando) return;
    if (JSON.stringify(form) !== inicial.current && !window.confirm('Hay cambios sin guardar. ¿Salir de todos modos?')) {
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
        onGuardar={() => onGuardar(form)}
      />

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Panel izquierdo: datos de la ruta y lista de paraderos */}
        <div className="flex max-h-[55%] w-full shrink-0 flex-col border-b border-slate-200 bg-white lg:max-h-none lg:w-[430px] lg:border-b-0 lg:border-r">
          <div className="min-h-0 flex-1 overflow-y-auto">
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

            <div className="px-4 py-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-[12px] font-bold uppercase tracking-wide text-slate-700">Paraderos ({total})</h3>
                <button
                  type="button"
                  onClick={agregarParadero}
                  className="flex h-7 items-center gap-1 rounded-md bg-blue-600 px-2.5 text-[12px] font-medium text-white transition hover:bg-blue-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Agregar
                </button>
              </div>

              <div className="space-y-2">
                {form.paraderos.map((p, i) => (
                  <TarjetaParadero
                    key={p.uid}
                    paradero={p}
                    indice={i}
                    total={total}
                    activo={p.uid === activoUid}
                    registrarFila={(el) => {
                      if (!p.uid) return;
                      if (el) filasRef.current.set(p.uid, el);
                      else filasRef.current.delete(p.uid);
                    }}
                    onSeleccionar={() => seleccionarIdx(i)}
                    onCambio={(cambios) => setParaderoPorUid(p.uid!, cambios)}
                    onMover={(delta) => mover(i, delta)}
                    onInsertarDespues={() => insertarDespuesDe(i)}
                    onQuitar={() => quitarParadero(i)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Mapa */}
        <div className="relative min-h-[260px] flex-1">
          <MapaSelectorParaderos
            puntos={puntos}
            total={total}
            activo={activoIdx >= 0 ? activoIdx : null}
            onClickMapa={clickMapa}
            onMover={moverMarcador}
            onSeleccionar={seleccionarIdx}
            foco={foco}
            claveEncuadre={`${ruta?.id ?? 'nueva'}`}
          />
        </div>
      </div>
    </div>
  );
};

// Editor a pantalla completa: el estado del formulario nace al abrir (se desmonta al cerrar).
const ModalRuta: React.FC<ModalRutaProps> = ({ isOpen, ...resto }) =>
  isOpen ? <Editor key={resto.ruta?.id ?? 'nueva'} {...resto} /> : null;

export default ModalRuta;
