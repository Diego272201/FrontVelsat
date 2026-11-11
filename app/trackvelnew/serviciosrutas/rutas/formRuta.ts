import { Ruta, Sentido } from '../types';
import type { RutaGuardar } from '../api';
import { largoMetros } from './trazado';

// Modelo del formulario de ruta (todo texto, como lo escribe el usuario) y sus utilidades.

export interface ParaderoForm {
  id?: number;
  /** Identificador solo de pantalla (para la selección y las llaves de React). */
  uid?: string;
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
  descripcion: string;
  distanciaKm: string;
  paraderos: ParaderoForm[];
  /**
   * Trazado editado en el mapa. Solo viene cuando el usuario lo modificó (undefined = no se toca
   * el que ya tiene la ruta). Lo llena el editor al guardar; no se edita como texto.
   */
  trazado?: [number, number][];
}

export const inputClase =
  'h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-[12px] text-slate-800 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-400';
export const labelClase =
  'mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500';

let contadorUid = 0;
const nuevoUid = () => `p${++contadorUid}`;

export const paraderoVacio = (): ParaderoForm => ({
  uid: nuevoUid(),
  nombre: '',
  latitud: '',
  longitud: '',
  radioMetros: '25',
  minutosDesdeAnterior: '1',
});

export const formDesdeRuta = (
  ruta: Ruta | null,
  grupos: readonly string[],
): RutaForm => {
  const distanciaDesdeTrazado =
    ruta?.trazado && ruta.trazado.length >= 2
      ? (Math.round((largoMetros(ruta.trazado) / 1000) * 100) / 100).toFixed(2)
      : null;

  return {
    codigo: ruta?.codigo ?? '',
    nombre: ruta?.nombre ?? '',
    grupo: ruta?.grupo ?? grupos[0] ?? '',
    sentido: ruta?.sentido ?? 'IDA',
    descripcion: ruta?.descripcion ?? '',
    distanciaKm:
      distanciaDesdeTrazado ??
      (ruta?.distanciaKm != null ? String(ruta.distanciaKm) : ''),
    paraderos: ruta
      ? ruta.paraderos.map((p) => ({
          id: p.id,
          uid: nuevoUid(),
          nombre: p.nombre,
          latitud: String(p.latitud),
          longitud: String(p.longitud),
          radioMetros: String(p.radioMetros),
          minutosDesdeAnterior: String(p.minutosDesdeAnterior),
        }))
      : [paraderoVacio(), paraderoVacio()],
  };
};

/** Pasa el formulario (todo texto) al cuerpo que espera la API. */
export const rutaFormAGuardar = (form: RutaForm): RutaGuardar => ({
  codigo: form.codigo.trim(),
  nombre: form.nombre.trim(),
  grupo: form.grupo.trim(),
  sentido: form.sentido,
  descripcion: form.descripcion.trim() || null,
  distanciaKm: form.distanciaKm.trim() === '' ? null : Number(form.distanciaKm),
  trazado: form.trazado,
  paraderos: form.paraderos.map((p, i) => ({
    id: p.id,
    nombre: p.nombre.trim(),
    latitud: Number(p.latitud),
    longitud: Number(p.longitud),
    radioMetros: Number(p.radioMetros),
    minutosDesdeAnterior: i === 0 ? 0 : Number(p.minutosDesdeAnterior),
  })),
});

export const numeroValido = (v: string) =>
  v.trim() !== '' && !Number.isNaN(Number(v));

export const coordenadasValidas = (p: ParaderoForm) =>
  numeroValido(p.latitud) &&
  Math.abs(Number(p.latitud)) <= 90 &&
  numeroValido(p.longitud) &&
  Math.abs(Number(p.longitud)) <= 180;

export const paraderoCompleto = (p: ParaderoForm) =>
  p.nombre.trim() !== '' &&
  coordenadasValidas(p) &&
  numeroValido(p.radioMetros) &&
  Number(p.radioMetros) > 0 &&
  numeroValido(p.minutosDesdeAnterior) &&
  Number(p.minutosDesdeAnterior) >= 0;

export const tipoDe = (indice: number, total: number) =>
  indice === 0 ? 'Origen' : indice === total - 1 ? 'Destino' : 'Intermedio';

export const colorTipo = (indice: number, total: number) =>
  indice === 0
    ? 'bg-green-600'
    : indice === total - 1
      ? 'bg-[#0f1f4b]'
      : 'bg-blue-600';

export const redondear = (n: number) => n.toFixed(6);

/** Nombre sugerido para un punto del mapa (calle), vía Nominatim. Devuelve '' si no se pudo. */
export const nombreDeCoordenada = async (
  lat: number,
  lng: number,
): Promise<string> => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&lat=${lat}&lon=${lng}`,
      { headers: { 'Accept-Language': 'es' } },
    );
    const d: { name?: string; address?: Record<string, string> } =
      await res.json();
    const a = d.address ?? {};
    const via = a.road || a.pedestrian || a.footway || d.name || '';
    const zona = a.neighbourhood || a.suburb || a.quarter || '';
    return [via, zona].filter(Boolean).join(' - ');
  } catch {
    return '';
  }
};
