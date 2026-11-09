'use client';

import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Route as RouteIcon, Trash2, Plus } from 'lucide-react';
import BaseModal from '@/app/components/ui/BaseModal';
import { Ruta, Sentido } from '../types';
import type { RutaGuardar } from '../api';

export interface ParaderoForm {
  id?: number;
  nombre: string;
  latitud: string;
  longitud: string;
  radioMetros: string;
  minutosDesdeAnterior: string;
}

export interface RutaForm {
  codigo: string;
  nombre: string;
  grupo: string;
  sentido: Sentido;
  /** id de la ruta pareja como texto del <select>; '' = sin pareja. */
  rutaParejaId: string;
  descripcion: string;
  distanciaKm: string;
  paraderos: ParaderoForm[];
}

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

/** Pasa el formulario (todo texto) al cuerpo que espera la API. */
export const rutaFormAGuardar = (form: RutaForm): RutaGuardar => ({
  codigo: form.codigo.trim(),
  nombre: form.nombre.trim(),
  grupo: form.grupo.trim(),
  sentido: form.sentido,
  rutaParejaId: form.rutaParejaId ? Number(form.rutaParejaId) : null,
  descripcion: form.descripcion.trim() || null,
  distanciaKm: form.distanciaKm.trim() === '' ? null : Number(form.distanciaKm),
  paraderos: form.paraderos.map((p, i) => ({
    id: p.id,
    nombre: p.nombre.trim(),
    latitud: Number(p.latitud),
    longitud: Number(p.longitud),
    radioMetros: Number(p.radioMetros),
    minutosDesdeAnterior: i === 0 ? 0 : Number(p.minutosDesdeAnterior),
  })),
});

const paraderoVacio = (): ParaderoForm => ({
  nombre: '',
  latitud: '',
  longitud: '',
  radioMetros: '100',
  minutosDesdeAnterior: '0',
});

const formDesdeRuta = (ruta: Ruta | null, grupos: readonly string[]): RutaForm => ({
  codigo: ruta?.codigo ?? '',
  nombre: ruta?.nombre ?? '',
  grupo: ruta?.grupo ?? grupos[0] ?? '',
  sentido: ruta?.sentido ?? 'IDA',
  rutaParejaId: ruta?.rutaParejaId != null ? String(ruta.rutaParejaId) : '',
  descripcion: ruta?.descripcion ?? '',
  distanciaKm: ruta?.distanciaKm != null ? String(ruta.distanciaKm) : '',
  paraderos: ruta
    ? ruta.paraderos.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        latitud: String(p.latitud),
        longitud: String(p.longitud),
        radioMetros: String(p.radioMetros),
        minutosDesdeAnterior: String(p.minutosDesdeAnterior),
      }))
    : [paraderoVacio(), paraderoVacio()],
});

const NUEVO_GRUPO = '__nuevo_grupo__';

const inputClase =
  'h-8 w-full rounded-md border border-gray-300 px-2 text-[12px] text-gray-800 focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400';
const labelClase = 'mb-1 block text-[12px] font-medium text-gray-600';

const tipoDe = (indice: number, total: number) =>
  indice === 0 ? 'Origen' : indice === total - 1 ? 'Destino' : 'Intermedio';

const ModalRuta: React.FC<ModalRutaProps> = ({
  isOpen,
  onClose,
  ruta,
  grupos,
  rutas,
  guardando = false,
  onGuardar,
}) => {
  const [form, setForm] = useState<RutaForm>(() => formDesdeRuta(ruta, grupos));
  // true = el usuario eligió "+ Nuevo grupo…" y escribe el nombre a mano.
  const [nuevoGrupo, setNuevoGrupo] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(formDesdeRuta(ruta, grupos));
      // Sin grupos todavía (primera ruta): se escribe el nombre directamente.
      setNuevoGrupo(grupos.length === 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, ruta]);

  const setCampo = <K extends keyof RutaForm>(campo: K, valor: RutaForm[K]) =>
    setForm((prev) => ({ ...prev, [campo]: valor }));

  const setParadero = (indice: number, campo: keyof ParaderoForm, valor: string) =>
    setForm((prev) => ({
      ...prev,
      paraderos: prev.paraderos.map((p, i) => (i === indice ? { ...p, [campo]: valor } : p)),
    }));

  const agregarParadero = () =>
    setForm((prev) => ({ ...prev, paraderos: [...prev.paraderos, paraderoVacio()] }));

  const quitarParadero = (indice: number) =>
    setForm((prev) => ({ ...prev, paraderos: prev.paraderos.filter((_, i) => i !== indice) }));

  const mover = (indice: number, delta: -1 | 1) =>
    setForm((prev) => {
      const destino = indice + delta;
      if (destino < 0 || destino >= prev.paraderos.length) return prev;
      const copia = [...prev.paraderos];
      [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
      return { ...prev, paraderos: copia };
    });

  // Candidatas a pareja: rutas del sentido contrario (nunca la propia).
  const sentidoContrario: Sentido = form.sentido === 'IDA' ? 'REGRESO' : 'IDA';
  const candidatasPareja = rutas.filter((r) => r.sentido === sentidoContrario && r.id !== ruta?.id);

  const cambiarSentido = (sentido: Sentido) =>
    // La pareja elegida deja de valer si el sentido cambia (tendría el mismo sentido que esta ruta).
    setForm((prev) => ({ ...prev, sentido, rutaParejaId: '' }));

  const numeroValido = (v: string) => v.trim() !== '' && !Number.isNaN(Number(v));

  const completo =
    form.codigo.trim() !== '' &&
    form.nombre.trim() !== '' &&
    (!nuevoGrupo || form.grupo.trim() !== '') &&
    form.paraderos.length >= 2 &&
    form.paraderos.every(
      (p) =>
        p.nombre.trim() !== '' &&
        numeroValido(p.latitud) &&
        Math.abs(Number(p.latitud)) <= 90 &&
        numeroValido(p.longitud) &&
        Math.abs(Number(p.longitud)) <= 180 &&
        numeroValido(p.radioMetros) &&
        Number(p.radioMetros) > 0 &&
        numeroValido(p.minutosDesdeAnterior) &&
        Number(p.minutosDesdeAnterior) >= 0,
    );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={ruta ? 'Editar ruta' : 'Nueva ruta'}
      subtitle="Define los datos de la ruta y sus paraderos (el primero es el origen y el último el destino)"
      icon={<RouteIcon className="h-4 w-4 text-blue-600" />}
      size="5xl"
      confirmText="Guardar ruta"
      onConfirm={() => onGuardar(form)}
      isLoading={guardando}
      isConfirmDisabled={!completo}
      isDismissable={false}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div>
          <label className={labelClase}>Código</label>
          <input
            className={inputClase}
            placeholder="RT-001"
            value={form.codigo}
            onChange={(e) => setCampo('codigo', e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClase}>Nombre</label>
          <input
            className={inputClase}
            value={form.nombre}
            onChange={(e) => setCampo('nombre', e.target.value)}
          />
        </div>
        <div>
          <label className={labelClase}>Grupo</label>
          <select
            className={inputClase}
            value={nuevoGrupo ? NUEVO_GRUPO : form.grupo}
            onChange={(e) => {
              if (e.target.value === NUEVO_GRUPO) {
                setNuevoGrupo(true);
                setCampo('grupo', '');
              } else {
                setNuevoGrupo(false);
                setCampo('grupo', e.target.value);
              }
            }}
          >
            {grupos.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
            <option value={NUEVO_GRUPO}>+ Nuevo grupo…</option>
          </select>
          {nuevoGrupo && (
            <input
              className={`${inputClase} mt-1`}
              placeholder="Nombre del nuevo grupo"
              maxLength={50}
              autoFocus
              value={form.grupo}
              onChange={(e) => setCampo('grupo', e.target.value)}
            />
          )}
        </div>
        <div>
          <label className={labelClase}>Sentido</label>
          <select
            className={inputClase}
            value={form.sentido}
            onChange={(e) => cambiarSentido(e.target.value as Sentido)}
          >
            <option value="IDA">Ida</option>
            <option value="REGRESO">Regreso</option>
          </select>
        </div>
        <div className="sm:col-span-3">
          <label className={labelClase}>
            Ruta de {form.sentido === 'IDA' ? 'regreso' : 'ida'} (pareja, opcional)
          </label>
          <select
            className={inputClase}
            value={form.rutaParejaId}
            onChange={(e) => setCampo('rutaParejaId', e.target.value)}
          >
            <option value="">Sin pareja</option>
            {candidatasPareja.map((r) => (
              <option key={r.id} value={r.id}>
                {r.codigo} · {r.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-3">
          <label className={labelClase}>Descripción (opcional)</label>
          <input
            className={inputClase}
            value={form.descripcion}
            onChange={(e) => setCampo('descripcion', e.target.value)}
          />
        </div>
        <div>
          <label className={labelClase}>Distancia km (opcional)</label>
          <input
            className={inputClase}
            inputMode="decimal"
            placeholder="Se puede completar luego"
            value={form.distanciaKm}
            onChange={(e) => setCampo('distanciaKm', e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <h3 className="text-[12px] font-bold uppercase tracking-wide text-gray-700">
          Paraderos ({form.paraderos.length})
        </h3>
        <button
          type="button"
          onClick={agregarParadero}
          className="flex h-7 items-center gap-1 rounded-md bg-blue-600 px-2.5 text-[12px] font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-3.5 w-3.5" />
          Agregar paradero
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-[12px]">
          <thead className="text-left text-gray-500">
            <tr>
              <th className="w-8 px-1 py-1 font-semibold">#</th>
              <th className="w-20 px-1 py-1 font-semibold">Tipo</th>
              <th className="px-1 py-1 font-semibold">Nombre</th>
              <th className="w-28 px-1 py-1 font-semibold">Latitud</th>
              <th className="w-28 px-1 py-1 font-semibold">Longitud</th>
              <th className="w-20 px-1 py-1 font-semibold">Radio (m)</th>
              <th className="w-24 px-1 py-1 font-semibold">Min. desde anterior</th>
              <th className="w-24 px-1 py-1" />
            </tr>
          </thead>
          <tbody>
            {form.paraderos.map((p, i) => (
              <tr key={p.id ?? `nuevo-${i}`} className="border-t border-gray-100">
                <td className="px-1 py-1 text-gray-500">{i + 1}</td>
                <td className="px-1 py-1 text-gray-600">{tipoDe(i, form.paraderos.length)}</td>
                <td className="px-1 py-1">
                  <input
                    className={inputClase}
                    value={p.nombre}
                    onChange={(e) => setParadero(i, 'nombre', e.target.value)}
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    className={inputClase}
                    inputMode="decimal"
                    value={p.latitud}
                    onChange={(e) => setParadero(i, 'latitud', e.target.value)}
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    className={inputClase}
                    inputMode="decimal"
                    value={p.longitud}
                    onChange={(e) => setParadero(i, 'longitud', e.target.value)}
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    className={inputClase}
                    inputMode="numeric"
                    value={p.radioMetros}
                    onChange={(e) => setParadero(i, 'radioMetros', e.target.value)}
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    className={inputClase}
                    inputMode="numeric"
                    disabled={i === 0}
                    value={i === 0 ? '0' : p.minutosDesdeAnterior}
                    onChange={(e) => setParadero(i, 'minutosDesdeAnterior', e.target.value)}
                  />
                </td>
                <td className="px-1 py-1">
                  <div className="flex items-center justify-end gap-0.5">
                    <button
                      type="button"
                      onClick={() => mover(i, -1)}
                      disabled={i === 0}
                      title="Subir"
                      className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => mover(i, 1)}
                      disabled={i === form.paraderos.length - 1}
                      title="Bajar"
                      className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => quitarParadero(i)}
                      disabled={form.paraderos.length <= 2}
                      title="Quitar"
                      className="rounded p-1 text-red-500 hover:bg-red-50 disabled:opacity-30"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </BaseModal>
  );
};

export default ModalRuta;
