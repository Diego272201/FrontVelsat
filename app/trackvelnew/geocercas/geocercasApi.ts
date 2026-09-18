import axios from 'axios';
import { LatLng, ShapeType } from './types';

export interface ApiGeocerca {
  id: number;
  accountID: string;
  geofenceID?: number;
  nombre: string;
  descripcion?: string;
  tipo: 'circle' | 'polygon';
  areaWkt: string;
  coordenadasJson?: string;
  color: string;
  activo?: boolean;
  fechaCreacion?: string;
  fechaActualizacion?: string;
}

export interface ApiGeocercaVehiculo {
  id?: number;
  idGeocerca: number;
  deviceID: string;
  fechaVinculacion?: string;
  activo?: boolean;
}

export interface CreateGeocercaPayload {
  accountID: string;
  geofenceID?: number;
  nombre: string;
  descripcion?: string;
  tipo: 'circle' | 'polygon';
  areaWkt: string;
  coordenadasJson?: string;
  color: string;
}

export interface UpdateGeocercaPayload {
  nombre: string;
  descripcion?: string;
  tipo: 'circle' | 'polygon';
  areaWkt: string;
  coordenadasJson?: string;
  color: string;
}

/* ------------------------------------------------------------------ */
/* Helpers de conversión de geometría a WKT y JSON                    */
/* ------------------------------------------------------------------ */

/**
 * Genera el WKT para un círculo: CIRCLE (lat lng, radius)
 */
export function formatCircleWkt(center: LatLng, radius: number): string {
  const lat = Number(center.lat.toFixed(6));
  const lng = Number(center.lng.toFixed(6));
  const rad = Math.round(radius);
  return `CIRCLE (${lat} ${lng}, ${rad})`;
}

/**
 * Genera el WKT para un polígono: POLYGON ((lat1 lng1, lat2 lng2, ..., lat1 lng1))
 * Asegura que el primer y último punto sean idénticos para cerrar la figura.
 */
export function formatPolygonWkt(path: LatLng[]): string {
  if (!path || path.length < 3) return '';
  const closed = [...path];
  const first = closed[0];
  const last = closed[closed.length - 1];

  const isSameAsFirst =
    Math.abs(first.lat - last.lat) < 1e-6 && Math.abs(first.lng - last.lng) < 1e-6;

  // Cerrar el polígono automáticamente si el último no es idéntico al primero
  if (!isSameAsFirst) {
    closed.push({ lat: first.lat, lng: first.lng });
  } else {
    // Si ya era el punto de cierre, asegurar coordenadas idénticas exactas al primero
    closed[closed.length - 1] = { lat: first.lat, lng: first.lng };
  }

  const coords = closed
    .map((p) => `${Number(p.lat.toFixed(6))} ${Number(p.lng.toFixed(6))}`)
    .join(', ');

  return `POLYGON ((${coords}))`;
}

/**
 * Genera el string JSON de coordenadas.
 * En polígonos incluye automáticamente el punto de cierre (primer y último punto idénticos).
 */
export function formatCoordenadasJson(
  tipo: ShapeType,
  center?: LatLng,
  radius?: number,
  path?: LatLng[],
): string {
  if (tipo === 'circle' && center) {
    return JSON.stringify([
      {
        lat: Number(center.lat.toFixed(6)),
        lng: Number(center.lng.toFixed(6)),
        radius: radius ? Math.round(radius) : 0,
      },
    ]);
  }

  if (tipo === 'polygon' && path && path.length >= 3) {
    const closed = [...path];
    const first = closed[0];
    const last = closed[closed.length - 1];

    const isSameAsFirst =
      Math.abs(first.lat - last.lat) < 1e-6 && Math.abs(first.lng - last.lng) < 1e-6;

    if (!isSameAsFirst) {
      closed.push({ lat: first.lat, lng: first.lng });
    } else {
      closed[closed.length - 1] = { lat: first.lat, lng: first.lng };
    }

    return JSON.stringify(
      closed.map((p) => ({
        lat: Number(p.lat.toFixed(6)),
        lng: Number(p.lng.toFixed(6)),
      })),
    );
  }

  return '[]';
}

/**
 * Parsea la geometría desde la respuesta de la API (usa coordenadasJson o areaWkt como respaldo).
 */
export function parseGeocercaGeometry(apiGeo: ApiGeocerca): {
  center?: LatLng;
  radius?: number;
  path?: LatLng[];
} {
  const tipo = apiGeo.tipo?.toLowerCase() === 'polygon' ? 'polygon' : 'circle';

  // 1. Intentar parsear coordenadasJson primero
  if (apiGeo.coordenadasJson) {
    try {
      const parsed = JSON.parse(apiGeo.coordenadasJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        if (tipo === 'circle') {
          const pt = parsed[0];
          let radius = pt.radius || 0;
          // Si el radio no está en el JSON, buscarlo en areaWkt
          if (!radius && apiGeo.areaWkt) {
            const matchWkt = apiGeo.areaWkt.match(/CIRCLE\s*\(\s*[-\d.]+\s+[-\d.]+\s*,\s*([-\d.]+)\s*\)/i);
            if (matchWkt && matchWkt[1]) radius = parseFloat(matchWkt[1]);
          }
          if (!radius) radius = 300;
          return {
            center: { lat: Number(pt.lat), lng: Number(pt.lng) },
            radius,
          };
        } else if (tipo === 'polygon' && parsed.length >= 3) {
          // Si el último punto es duplicado del primero (cerrado), removerlo para la edición en UI
          let points: LatLng[] = parsed.map((p: any) => ({
            lat: Number(p.lat),
            lng: Number(p.lng),
          }));
          const first = points[0];
          const last = points[points.length - 1];
          if (points.length > 3 && Math.abs(first.lat - last.lat) < 1e-6 && Math.abs(first.lng - last.lng) < 1e-6) {
            points = points.slice(0, -1);
          }
          return { path: points };
        }
      }
    } catch {
      // Fallback a parseo de WKT
    }
  }

  // 2. Fallback: Parsear areaWkt
  if (apiGeo.areaWkt) {
    if (tipo === 'circle') {
      const match = apiGeo.areaWkt.match(/CIRCLE\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*,\s*([-\d.]+)\s*\)/i);
      if (match) {
        return {
          center: { lat: parseFloat(match[1]), lng: parseFloat(match[2]) },
          radius: parseFloat(match[3]),
        };
      }
    } else if (tipo === 'polygon') {
      const match = apiGeo.areaWkt.match(/POLYGON\s*\(\(\s*([^)]+)\s*\)\)/i);
      if (match && match[1]) {
        const rawPairs = match[1].split(',');
        const points: LatLng[] = [];
        for (const pair of rawPairs) {
          const parts = pair.trim().split(/\s+/);
          if (parts.length >= 2) {
            points.push({ lat: parseFloat(parts[0]), lng: parseFloat(parts[1]) });
          }
        }
        if (points.length >= 3) {
          const first = points[0];
          const last = points[points.length - 1];
          if (points.length > 3 && Math.abs(first.lat - last.lat) < 1e-6 && Math.abs(first.lng - last.lng) < 1e-6) {
            return { path: points.slice(0, -1) };
          }
          return { path: points };
        }
      }
    }
  }

  return {};
}

export const DEFAULT_API_BASE_URL = 'https://do.velsat.pe:2083';

export const cleanBaseUrl = (url?: string) => {
  const target = url && url.trim() ? url.trim() : DEFAULT_API_BASE_URL;
  return target.replace(/\/+$/, '');
};

/**
 * 1. Crear geocerca: POST /api/geocercas
 */
export async function createGeocercaApi(
  baseUrl: string,
  payload: CreateGeocercaPayload,
): Promise<{ id: number }> {
  const url = `${cleanBaseUrl(baseUrl)}/api/geocercas`;
  const body = {
    ...payload,
    geofenceID: payload.geofenceID || Math.floor(Date.now() / 1000),
  };
  const response = await axios.post(url, body);
  return response.data;
}

/**
 * 2. Listar geocercas de una cuenta: GET /api/geocercas?accountID={accountID}
 */
export async function getGeocercasApi(
  baseUrl: string,
  accountID: string,
): Promise<ApiGeocerca[]> {
  const url = `${cleanBaseUrl(baseUrl)}/api/geocercas`;
  const response = await axios.get(url, {
    params: { accountID },
  });
  return Array.isArray(response.data) ? response.data : [];
}

/**
 * 3. Detalle de una geocerca: GET /api/geocercas/{id}
 */
export async function getGeocercaByIdApi(
  baseUrl: string,
  id: number | string,
): Promise<ApiGeocerca> {
  const url = `${cleanBaseUrl(baseUrl)}/api/geocercas/${id}`;
  const response = await axios.get(url);
  return response.data;
}

/**
 * 4. Editar geocerca: PUT /api/geocercas/{id}
 */
export async function updateGeocercaApi(
  baseUrl: string,
  id: number | string,
  payload: UpdateGeocercaPayload,
): Promise<string> {
  const url = `${cleanBaseUrl(baseUrl)}/api/geocercas/${id}`;
  const response = await axios.put(url, payload);
  return response.data;
}

/**
 * 5. Eliminar geocerca: DELETE /api/geocercas/{id}
 */
export async function deleteGeocercaApi(
  baseUrl: string,
  id: number | string,
): Promise<string> {
  const url = `${cleanBaseUrl(baseUrl)}/api/geocercas/${id}`;
  const response = await axios.delete(url);
  return response.data;
}

/**
 * 6. Vincular vehículos a una geocerca: POST /api/geocercas/{id}/vehiculos
 */
export async function assignVehiculosToGeocercaApi(
  baseUrl: string,
  idGeocerca: number | string,
  deviceIds: string[],
): Promise<string> {
  const url = `${cleanBaseUrl(baseUrl)}/api/geocercas/${idGeocerca}/vehiculos`;
  const response = await axios.post(url, deviceIds);
  return response.data;
}

/**
 * 7. Desvincular un vehículo de una geocerca: DELETE /api/geocercas/{id}/vehiculos/{deviceID}
 */
export async function removeVehiculoFromGeocercaApi(
  baseUrl: string,
  idGeocerca: number | string,
  deviceID: string,
): Promise<string> {
  const url = `${cleanBaseUrl(baseUrl)}/api/geocercas/${idGeocerca}/vehiculos/${encodeURIComponent(deviceID)}`;
  const response = await axios.delete(url);
  return response.data;
}

/**
 * 8. Listar vehículos vinculados a una geocerca: GET /api/geocercas/{id}/vehiculos
 */
export async function getGeocercaVehiculosApi(
  baseUrl: string,
  idGeocerca: number | string,
): Promise<ApiGeocercaVehiculo[]> {
  const url = `${cleanBaseUrl(baseUrl)}/api/geocercas/${idGeocerca}/vehiculos`;
  const response = await axios.get(url);
  return Array.isArray(response.data) ? response.data : [];
}

/**
 * 9. Listar geocercas de un vehículo: GET /api/vehiculos/{deviceID}/geocercas
 */
export async function getVehiculoGeocercasApi(
  baseUrl: string,
  deviceID: string,
): Promise<ApiGeocerca[]> {
  const url = `${cleanBaseUrl(baseUrl)}/api/vehiculos/${encodeURIComponent(deviceID)}/geocercas`;
  const response = await axios.get(url);
  return Array.isArray(response.data) ? response.data : [];
}
