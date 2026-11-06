import { DestinoComun, EstadoServicio } from './types';

export function getIsoToday(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function isoToDdMmYyyy(iso: string): string {
  if (!iso) return '';
  const [yyyy, mm, dd] = iso.split('-');
  return `${dd}/${mm}/${yyyy}`;
}

export function ddMmYyyyToIso(fecha: string): string {
  if (!fecha) return '';
  const [dd, mm, yyyy] = fecha.split('/');
  return `${yyyy}-${mm}-${dd}`;
}

export const ESTADO_SERVICIO_LABEL: Record<EstadoServicio, string> = {
  PROGRAMADO: 'Programado',
  EN_CURSO: 'En curso',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
};

export const ESTADO_SERVICIO_CLASE: Record<EstadoServicio, string> = {
  PROGRAMADO: 'bg-blue-100 text-blue-700',
  EN_CURSO: 'bg-green-100 text-green-700',
  FINALIZADO: 'bg-gray-200 text-gray-700',
  CANCELADO: 'bg-red-100 text-red-700',
};

// Colores de las rutas en el mapa y la lista (se asignan por orden de código).
export const RUTA_COLORES = [
  '#3B5BDB',
  '#0CA678',
  '#7048E8',
  '#D6336C',
  '#E8590C',
  '#1098AD',
  '#F59F00',
  '#C92A2A',
  '#5C940D',
  '#862E9C',
];

/** "05:10" + 43 min = "05:53" (pasa de medianoche si hace falta). */
export function sumarMinutos(hora: string, minutos: number): string {
  const [h, m] = hora.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return '';
  const total = (((h * 60 + m + minutos) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** 43 → "43 min", 75 → "1 h 15 min". */
export function formatoDuracion(minutos: number | null | undefined): string {
  if (!minutos) return '—';
  if (minutos < 60) return `${minutos} min`;
  const h = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto ? `${h} h ${String(resto).padStart(2, '0')} min` : `${h} h`;
}

export function formatoKm(km: number | null | undefined): string {
  return km == null ? '—' : `${km.toLocaleString('es-PE', { maximumFractionDigits: 1 })} km`;
}

const PRIORIDAD_ESTADO: Record<EstadoServicio, number> = {
  EN_CURSO: 0,
  PROGRAMADO: 1,
  FINALIZADO: 2,
  CANCELADO: 3,
};

/** Ordena primero los en curso, luego programados, finalizados y cancelados; dentro, por hora. */
export function ordenarServicios<T extends { estado: EstadoServicio; horaSalida: string }>(lista: T[]): T[] {
  return [...lista].sort(
    (a, b) =>
      PRIORIDAD_ESTADO[a.estado] - PRIORIDAD_ESTADO[b.estado] ||
      a.horaSalida.localeCompare(b.horaSalida),
  );
}

/** Servicio que da las horas de una ruta: el en curso, o el próximo programado, o el primero del día. */
export function servicioReferencia<T extends { estado: EstadoServicio; horaSalida: string }>(
  lista: T[],
): T | null {
  return ordenarServicios(lista)[0] ?? null;
}

/** Color del punto de estado (lista y chips). */
export const ESTADO_SERVICIO_PUNTO: Record<EstadoServicio, string> = {
  PROGRAMADO: 'bg-blue-500',
  EN_CURSO: 'bg-green-500',
  FINALIZADO: 'bg-gray-400',
  CANCELADO: 'bg-red-500',
};

/**
 * Agrupa las rutas por su último paradero. Dos destinos a menos de ~110 m se toman como el mismo
 * punto, así el mapa dibuja un solo marcador cuando todas las rutas llegan al mismo lugar.
 */
export function agruparDestinos(
  rutas: { id: number; paraderos: { nombre: string; latitud: number; longitud: number }[] }[],
): DestinoComun[] {
  const grupos = new Map<string, DestinoComun>();
  for (const r of rutas) {
    const ultimo = r.paraderos[r.paraderos.length - 1];
    if (!ultimo || r.paraderos.length < 2) continue;
    const clave = `${ultimo.latitud.toFixed(3)}|${ultimo.longitud.toFixed(3)}`;
    const existente = grupos.get(clave);
    if (existente) existente.rutaIds.push(r.id);
    else
      grupos.set(clave, {
        lat: ultimo.latitud,
        lng: ultimo.longitud,
        nombre: ultimo.nombre,
        rutaIds: [r.id],
      });
  }
  return Array.from(grupos.values());
}
