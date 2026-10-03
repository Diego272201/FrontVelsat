import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_TRACKVEL_API_URL || 'http://localhost:5000';
export const REPORTS_API_BASE = `${BASE_URL.replace(/\/+$/, '')}/api/reportes/geocercas`;

export const STATIC_TOKEN =
  process.env.NEXT_PUBLIC_TRACKVEL_STATIC_TOKEN || 'trackvel-static-token-2026';

export interface VisitaItem {
  id: number | string;
  accountID?: string;
  deviceID: string;
  geofenceID: number;
  geofenceName: string;
  fechaEntrada: string;
  fechaSalida?: string | null;
  duracionMinutos?: number | null;
  latitudEntrada?: number | null;
  longitudEntrada?: number | null;
  latitudSalida?: number | null;
  longitudSalida?: number | null;
  eventoEntradaId?: number;
  eventoSalidaId?: number;
  entradaIncompleta?: boolean;
  fechaRegistro?: string;
  [key: string]: any;
}

export interface VisitasReportResponse {
  visitas: VisitaItem[];
  totalRegistros: number;
  paginaActual: number;
  totalPaginas: number;
  pageSize: number;
}

export interface VisitasFilterParams {
  accountID?: string;
  deviceID?: string;
  geofenceID?: number | string;
  fechaDesde?: string;
  fechaHasta?: string;
  page?: number;
  pageSize?: number;
}

export interface ResumenItem {
  deviceID?: string;
  geofenceID?: number;
  geofenceName?: string;
  totalVisitas: number;
  minutosTotales: number;
  minutosPromedioPorVisita: number;
  [key: string]: any;
}

export interface ResumenFilterParams {
  accountID?: string;
  fechaDesde: string;
  fechaHasta: string;
  geofenceID?: number | string;
  deviceID?: string;
}

/**
 * Genera la cabecera de autorización Bearer usando siempre el token permanente estático
 */
function getAuthHeaders(_token?: string) {
  const effectiveToken =
    process.env.NEXT_PUBLIC_TRACKVEL_STATIC_TOKEN ||
    STATIC_TOKEN ||
    'trackvel-static-token-2026';

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${effectiveToken.trim()}`,
  };
}

// Helper para convertir fechas a ISO 8601 con soporte para horas (ej: '2026-09-01T00:00:00Z')
function toIsoDate(dateStr?: string, isEnd = false): string | undefined {
  if (!dateStr || !dateStr.trim()) return undefined;
  const trimmed = dateStr.trim();
  if (trimmed.includes('T')) {
    // Formato datetime-local HTML: YYYY-MM-DDTHH:mm (16 caracteres)
    if (trimmed.length === 16) {
      return isEnd ? `${trimmed}:59Z` : `${trimmed}:00Z`;
    }
    // Formato con segundos sin zona: YYYY-MM-DDTHH:mm:ss (19 caracteres)
    if (trimmed.length === 19) {
      return `${trimmed}Z`;
    }
    if (!trimmed.endsWith('Z') && !trimmed.includes('+')) {
      return `${trimmed}Z`;
    }
    return trimmed;
  }
  return isEnd ? `${trimmed}T23:59:59Z` : `${trimmed}T00:00:00Z`;
}

/**
 * 1. GET /api/reportes/geocercas/visitas
 * Parámetros (Query): accountID (Requerido), deviceID, geofenceID, fechaDesde, fechaHasta, page, pageSize
 */
export async function getVisitasReport(
  token?: string,
  params?: VisitasFilterParams,
): Promise<VisitasReportResponse> {
  const url = `${REPORTS_API_BASE}/visitas`;
  const cleanParams: Record<string, any> = {
    accountID: params?.accountID || 'movilbus',
  };

  if (params?.deviceID && params.deviceID.trim()) {
    cleanParams.deviceID = params.deviceID.trim();
  }
  if (params?.geofenceID !== undefined && params?.geofenceID !== '') {
    cleanParams.geofenceID = Number(params.geofenceID);
  }
  if (params?.fechaDesde) {
    cleanParams.fechaDesde = toIsoDate(params.fechaDesde, false);
  }
  if (params?.fechaHasta) {
    cleanParams.fechaHasta = toIsoDate(params.fechaHasta, true);
  }
  if (params?.page) {
    cleanParams.page = params.page;
  }
  if (params?.pageSize) {
    cleanParams.pageSize = params.pageSize;
  }

  const response = await axios.get<VisitasReportResponse>(url, {
    params: cleanParams,
    headers: getAuthHeaders(token),
  });

  return (
    response.data || {
      visitas: [],
      totalRegistros: 0,
      paginaActual: 1,
      totalPaginas: 1,
      pageSize: 20,
    }
  );
}

/**
 * 2. GET /api/reportes/geocercas/resumen
 * Parámetros (Query): accountID (Requerido), fechaDesde (Requerido), fechaHasta (Requerido), deviceID, geofenceID
 */
export async function getResumenReport(
  token: string | undefined,
  params: ResumenFilterParams,
): Promise<ResumenItem[]> {
  const url = `${REPORTS_API_BASE}/resumen`;
  const cleanParams: Record<string, any> = {
    accountID: params.accountID || 'movilbus',
    fechaDesde: toIsoDate(params.fechaDesde, false) || params.fechaDesde,
    fechaHasta: toIsoDate(params.fechaHasta, true) || params.fechaHasta,
  };

  if (params.deviceID && params.deviceID.trim()) {
    cleanParams.deviceID = params.deviceID.trim();
  }
  if (params.geofenceID !== undefined && params.geofenceID !== '') {
    cleanParams.geofenceID = Number(params.geofenceID);
  }

  const response = await axios.get<ResumenItem[]>(url, {
    params: cleanParams,
    headers: getAuthHeaders(token),
  });

  return Array.isArray(response.data) ? response.data : [];
}

/**
 * 3. GET /api/reportes/geocercas/visitas/{id}?accountID=movilbus
 * Parámetros: {id} en la ruta, accountID en query (Requerido)
 */
export async function getVisitaById(
  token: string | undefined,
  id: number | string,
  accountID: string = 'movilbus',
): Promise<VisitaItem> {
  const url = `${REPORTS_API_BASE}/visitas/${id}`;
  const response = await axios.get<VisitaItem>(url, {
    params: { accountID: accountID || 'movilbus' },
    headers: getAuthHeaders(token),
  });
  return response.data;
}

export interface AlertaItem {
  id: number;
  accountID: string;
  deviceID: string;
  eventType: 'geofenceEnter' | 'geofenceExit' | string;
  serverTime: number;
  serverTimeUtc: string;
  latitude: number;
  longitude: number;
  speed?: number;
  geofenceID: number;
  geofenceName: string;
  isEnviado?: boolean;
  durationMinutes?: number | null;
  [key: string]: any;
}

export interface AlertasFilterParams {
  accountID?: string;
  limit?: number;
  deviceID?: string;
  geofenceID?: number | string;
}

/**
 * 4. GET /api/reportes/geocercas/alertas
 * Lista el historial de alertas individuales (entradas y salidas) registradas en deviceevent.
 * Parámetros (Query): accountID (Requerido), limit (Opcional, default: 50), deviceID, geofenceID
 */
export async function getAlertasReport(
  token?: string,
  params?: AlertasFilterParams,
): Promise<AlertaItem[]> {
  const url = `${REPORTS_API_BASE}/alertas`;
  const cleanParams: Record<string, any> = {
    accountID: params?.accountID || 'movilbus',
    limit: params?.limit || 50,
  };
  if (params?.deviceID && params.deviceID.trim()) {
    cleanParams.deviceID = params.deviceID.trim();
  }
  if (params?.geofenceID !== undefined && params?.geofenceID !== '') {
    cleanParams.geofenceID = Number(params.geofenceID);
  }

  const response = await axios.get<AlertaItem[]>(url, {
    params: cleanParams,
    headers: getAuthHeaders(token),
  });

  return Array.isArray(response.data) ? response.data : [];
}

