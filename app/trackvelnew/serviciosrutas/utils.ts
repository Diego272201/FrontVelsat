import { DestinoComun, EstadoServicio } from './types';

const ZONA_PERU = 'America/Lima';

/** Fecha de hoy en Perú (yyyy-MM-dd), sin depender de la zona horaria del navegador. */
export function getIsoToday(): string {
  // "en-CA" formatea como yyyy-MM-dd.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_PERU,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** Fecha (yyyy-MM-dd) `dias` días antes o después de hoy en Perú. */
export function getIsoDesplazado(dias: number): string {
  const [y, m, d] = getIsoToday().split('-').map(Number);
  const fecha = new Date(Date.UTC(y, m - 1, d + dias));
  return fecha.toISOString().slice(0, 10);
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

/** Color de texto (blanco u oscuro) legible sobre un fondo `#rrggbb`. */
export const textoSobre = (hex: string): string => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return '#ffffff';
  const n = parseInt(m[1], 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.62 ? '#0f172a' : '#ffffff';
};

/** Segundos como texto legible: "35 s", "1 min 05 s". */
export function formatoSegundos(seg: number | null | undefined): string {
  if (seg === null || seg === undefined) return '—';
  const total = Math.abs(Math.round(seg));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m === 0 ? `${s} s` : `${m} min ${String(s).padStart(2, '0')} s`;
}

/** Diferencia con la hora esperada: "Exacto", "+1 min 20 s" (retraso) o "-35 s" (adelanto). */
export function formatoDiferencia(seg: number): string {
  if (seg === 0) return 'Exacto';
  return `${seg > 0 ? '+' : '-'}${formatoSegundos(seg)}`;
}

/** Hora "HH:mm" -> "HH:mm:ss" (con "00" si no trae segundos). Deja igual lo que ya los trae o no es hora. */
export function conSegundos(hora: string | null | undefined): string {
  if (!hora) return '—';
  return /^\d{1,2}:\d{2}$/.test(hora) ? `${hora}:00` : hora;
}
