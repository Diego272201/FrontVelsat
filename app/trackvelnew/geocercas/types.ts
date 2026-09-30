export type ShapeType = 'circle' | 'polygon';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Geofence {
  id: string;
  numericId?: number;
  geofenceID?: number;
  name: string;
  description?: string;
  color: string;
  type: ShapeType;
  active?: boolean;
  center?: LatLng;
  radius?: number;
  path?: LatLng[];
  vehicleIds: string[];
  unconfirmedVehicleIds?: string[];
  traccarOnlyVehicleIds?: string[];
  createdAt: number;
}

export interface Vehicle {
  id: string;
  label: string;
  position: LatLng;
  speed?: number;
  orbit?: { anchor: LatLng; radiusMeters: number; speed: number; phase: number };
}

export interface GeofenceAlert {
  id: string;
  kind: 'enter' | 'exit';
  vehicleId: string;
  geofenceName: string;
  color: string;
  at: number;
}

export const GEOFENCE_COLORS = [
  '#113EB9',
  '#16A34A',
  '#DC2626',
  '#FB7B0F',
  '#7C3AED',
  '#0EA5E9',
  '#DB2777',
  '#65A30D',
];

export const LIMA_CENTER: LatLng = { lat: -12.0464, lng: -77.0428 };

const EARTH_RADIUS_M = 6371008.8;
const toRad = (deg: number) => (deg * Math.PI) / 180;

export function distanceMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

// Ray casting sobre lat/lng: exacto de sobra a escala de ciudad.
export function pointInPolygon(point: LatLng, path: LatLng[]): boolean {
  let inside = false;
  for (let i = 0, j = path.length - 1; i < path.length; j = i++) {
    const xi = path[i].lng;
    const yi = path[i].lat;
    const xj = path[j].lng;
    const yj = path[j].lat;
    const intersects =
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function isInsideGeofence(point: LatLng, geofence: Geofence): boolean {
  if (geofence.type === 'circle' && geofence.center && geofence.radius) {
    return distanceMeters(point, geofence.center) <= geofence.radius;
  }
  if (geofence.type === 'polygon' && geofence.path && geofence.path.length >= 3) {
    return pointInPolygon(point, geofence.path);
  }
  return false;
}

export function geofenceCenter(geofence: Geofence): LatLng | null {
  if (geofence.type === 'circle') return geofence.center || null;
  if (!geofence.path?.length) return null;
  const sum = geofence.path.reduce(
    (acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }),
    { lat: 0, lng: 0 },
  );
  return { lat: sum.lat / geofence.path.length, lng: sum.lng / geofence.path.length };
}

export function formatDistance(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${Math.round(meters)} m`;
}

export function describeShape(geofence: Geofence): string {
  return geofence.type === 'circle'
    ? `Círculo · ${formatDistance(geofence.radius || 0)} de radio`
    : `Polígono · ${geofence.path?.length || 0} vértices`;
}

// Las unidades con "orbit" cruzan el borde de su geocerca cada cierto tiempo,
// para que la alerta de ingreso se pueda ver sin backend detrás.
export function nextVehiclePosition(vehicle: Vehicle, tick: number): LatLng {
  if (vehicle.orbit) {
    const { anchor, radiusMeters, speed, phase } = vehicle.orbit;
    const angle = tick * speed + phase;
    const distance = radiusMeters * (0.55 + 0.65 * Math.sin(angle * 0.6));
    const metersPerDegLng = 111320 * Math.cos(toRad(anchor.lat));
    return {
      lat: anchor.lat + (distance * Math.cos(angle)) / 111320,
      lng: anchor.lng + (distance * Math.sin(angle)) / metersPerDegLng,
    };
  }
  const jitter = () => (Math.random() - 0.5) * 0.003;
  return { lat: vehicle.position.lat + jitter(), lng: vehicle.position.lng + jitter() };
}
