/**
 * Utilidades de rumbo (heading) para dibujar los vehículos orientados en el mapa.
 * 0° = Norte, sentido horario.
 */

const CARDINALS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'] as const;

/** Campos en los que distintos backends envían el rumbo de un punto GPS. */
const HEADING_KEYS = ['heading', 'course', 'rumbo', 'angle', 'angulo', 'lastHeading', 'lastValidHeading'];

/** Rumbo que viene en el propio punto, si el backend lo envía. */
export function readHeading(point: Record<string, unknown> | null | undefined): number | null {
  if (!point) return null;
  for (const key of HEADING_KEYS) {
    const raw = point[key];
    if (raw === null || raw === undefined || raw === '') continue;
    const n = Number(raw);
    if (Number.isFinite(n)) return ((n % 360) + 360) % 360;
  }
  return null;
}

/** Rumbo (grados) para ir del punto A al punto B. */
export function bearingBetween(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = Math.PI / 180;
  const φ1 = lat1 * toRad;
  const φ2 = lat2 * toRad;
  const Δλ = (lng2 - lng1) * toRad;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) / toRad) % 360 + 360) % 360;
}

/** Distancia aproximada en metros (suficiente para distancias cortas). */
function metersBetween(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = Math.PI / 180;
  const x = (lng2 - lng1) * toRad * Math.cos(((lat1 + lat2) / 2) * toRad);
  const y = (lat2 - lat1) * toRad;
  return Math.sqrt(x * x + y * y) * 6371000;
}

interface TrackPoint {
  latitude: number;
  longitude: number;
}

/**
 * Rumbo de cada punto de un recorrido. Usa el que envía el backend cuando existe;
 * si no, lo calcula con la dirección del movimiento hacia el siguiente punto que esté
 * a más de `minMeters` (o desde el anterior, en el último tramo). Si la unidad está
 * detenida en el mismo lugar, conserva el último rumbo conocido.
 */
export function computeTrackHeadings(points: TrackPoint[], minMeters = 5, lookAhead = 20): number[] {
  const headings = new Array<number>(points.length);
  let last = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const fromApi = readHeading(p as unknown as Record<string, unknown>);
    if (fromApi !== null) {
      headings[i] = fromApi;
      last = fromApi;
      continue;
    }

    let found: number | null = null;
    for (let j = i + 1; j < points.length && j <= i + lookAhead; j++) {
      const q = points[j];
      if (metersBetween(p.latitude, p.longitude, q.latitude, q.longitude) > minMeters) {
        found = bearingBetween(p.latitude, p.longitude, q.latitude, q.longitude);
        break;
      }
    }
    if (found === null) {
      for (let k = i - 1; k >= 0 && k >= i - lookAhead; k--) {
        const q = points[k];
        if (metersBetween(q.latitude, q.longitude, p.latitude, p.longitude) > minMeters) {
          found = bearingBetween(q.latitude, q.longitude, p.latitude, p.longitude);
          break;
        }
      }
    }
    headings[i] = found ?? last;
    last = headings[i];
  }
  return headings;
}

/** Texto legible del rumbo, p. ej. "135° SE". */
export function headingLabel(deg: number): string {
  const d = ((Math.round(deg) % 360) + 360) % 360;
  return `${d}° ${CARDINALS[Math.round(d / 45) % 8]}`;
}
