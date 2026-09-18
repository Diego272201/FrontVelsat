import axios from 'axios';

export const TRACCAR_SERVERS = [
  'https://do.velsat.pe:2087/api',
] as const;

export const DEFAULT_TRACCAR_URL = TRACCAR_SERVERS[0];

export interface TraccarDevice {
  id: number;
  name: string;
  uniqueId: string;
  status?: string;
  disabled?: boolean;
  attributes?: Record<string, any>;
}

export interface TraccarGeofence {
  id: number;
  name: string;
  description?: string;
  area: string;
  attributes?: Record<string, any>;
}

export interface TraccarPermission {
  deviceId: number;
  geofenceId: number;
}

export interface ResolvedTraccarDevice {
  serverUrl: string;
  deviceId: number;
  plate: string;
  device: TraccarDevice;
}

export interface ServerDevicesResult {
  serverUrl: string;
  devices: TraccarDevice[];
  error?: string;
}

/**
 * Limpia la URL de Traccar removiendo barras finales
 */
export function cleanTraccarUrl(url: string = DEFAULT_TRACCAR_URL): string {
  let cleaned = (url || DEFAULT_TRACCAR_URL).trim();
  while (cleaned.endsWith('/')) {
    cleaned = cleaned.slice(0, -1);
  }
  return cleaned;
}

/**
 * Determina el servidor Traccar (fijado a https://do.velsat.pe:2087/api)
 */
export function getTraccarServerForUrl(_baseUrl?: string): string {
  return DEFAULT_TRACCAR_URL;
}

/**
 * Obtiene la cabecera Authorization: Basic <base64> desde las variables de entorno
 * Usa NEXT_PUBLIC_TRACCAR_EMAIL y NEXT_PUBLIC_TRACCAR_PASSWORD (o NEXT_PUBLIC_TRACCAR_AUTH).
 */
export function getTraccarAuthHeader(email?: string, password?: string): string {
  // 1. Variables de entorno (prioridad principal definida en .env / .env.local)
  const envEmail = process.env.NEXT_PUBLIC_TRACCAR_EMAIL;
  const envPass = process.env.NEXT_PUBLIC_TRACCAR_PASSWORD;
  if (envEmail && envPass) {
    const creds = `${envEmail.trim()}:${envPass.trim()}`;
    return typeof window !== 'undefined'
      ? `Basic ${window.btoa(creds)}`
      : `Basic ${Buffer.from(creds).toString('base64')}`;
  }

  const envAuth = process.env.NEXT_PUBLIC_TRACCAR_AUTH;
  if (envAuth && envAuth.trim()) {
    return envAuth.startsWith('Basic ') ? envAuth.trim() : `Basic ${envAuth.trim()}`;
  }

  // 2. Parámetros opcionales explícitos
  if (email && password) {
    const creds = `${email.trim()}:${password.trim()}`;
    return typeof window !== 'undefined'
      ? `Basic ${window.btoa(creds)}`
      : `Basic ${Buffer.from(creds).toString('base64')}`;
  }

  // 3. Fallback de localStorage en caso exista
  if (typeof window !== 'undefined') {
    const directAuth = localStorage.getItem('traccar_auth');
    if (directAuth && directAuth.trim()) {
      return directAuth.startsWith('Basic ') ? directAuth.trim() : `Basic ${directAuth.trim()}`;
    }

    const storedEmail = localStorage.getItem('traccar_email');
    const storedPass = localStorage.getItem('traccar_password');
    if (storedEmail && storedPass) {
      const creds = `${storedEmail.trim()}:${storedPass.trim()}`;
      return `Basic ${window.btoa(creds)}`;
    }
  }

  return '';
}

/**
 * Obtiene todos los dispositivos de un servidor Traccar específico
 * GET /api/devices
 */
export async function getTraccarDevices(
  baseUrl: string = DEFAULT_TRACCAR_URL,
  authHeader?: string,
): Promise<TraccarDevice[]> {
  const auth = authHeader || getTraccarAuthHeader();
  if (!auth) {
    throw new Error('Credenciales de Traccar no configuradas en el entorno');
  }

  const response = await axios.get<TraccarDevice[]>(`${cleanTraccarUrl(baseUrl)}/devices`, {
    headers: {
      Authorization: auth,
    },
    timeout: 12000,
  });

  return Array.isArray(response.data) ? response.data : [];
}

/**
 * Obtiene los dispositivos de TODOS los servidores Traccar configurados en paralelo
 */
export async function getDevicesFromAllTraccarServers(
  authHeader?: string,
): Promise<ServerDevicesResult[]> {
  const auth = authHeader || getTraccarAuthHeader();
  if (!auth) {
    throw new Error('Credenciales de Traccar no configuradas');
  }

  const promises = TRACCAR_SERVERS.map(async (serverUrl) => {
    try {
      const devices = await getTraccarDevices(serverUrl, auth);
      return { serverUrl, devices };
    } catch (err: any) {
      console.warn(`[Traccar] No se pudo obtener dispositivos de ${serverUrl}:`, err.message);
      return { serverUrl, devices: [], error: err.message || 'Error de conexión' };
    }
  });

  return Promise.all(promises);
}

/**
 * Prueba la autenticación contra todos los servidores Traccar
 */
export async function testTraccarAuthMultiServer(
  authHeader?: string,
): Promise<{ serverUrl: string; ok: boolean; message: string; deviceCount?: number }[]> {
  const auth = authHeader || getTraccarAuthHeader();
  if (!auth) {
    return TRACCAR_SERVERS.map((serverUrl) => ({
      serverUrl,
      ok: false,
      message: 'No hay credenciales de Traccar configuradas',
    }));
  }

  const promises = TRACCAR_SERVERS.map(async (serverUrl) => {
    try {
      const response = await axios.get<TraccarDevice[]>(`${cleanTraccarUrl(serverUrl)}/devices`, {
        headers: { Authorization: auth },
        timeout: 8000,
      });
      const count = Array.isArray(response.data) ? response.data.length : 0;
      return {
        serverUrl,
        ok: true,
        message: `Conectado exitosamente (${count} dispositivos)`,
        deviceCount: count,
      };
    } catch (error: any) {
      const status = error.response?.status;
      const msg =
        status === 401
          ? 'Error 401: Usuario o contraseña incorrectos en Traccar'
          : error?.response?.data?.message || error.message || 'Error de conexión';
      return {
        serverUrl,
        ok: false,
        message: msg,
      };
    }
  });

  return Promise.all(promises);
}

/**
 * Prueba la autenticación contra Traccar (servidor único)
 */
export async function testTraccarAuth(
  baseUrl: string = DEFAULT_TRACCAR_URL,
  authHeader?: string,
): Promise<{ ok: boolean; message: string; deviceCount?: number }> {
  const auth = authHeader || getTraccarAuthHeader();
  if (!auth) {
    return { ok: false, message: 'No hay credenciales de Traccar configuradas' };
  }

  try {
    const response = await axios.get<TraccarDevice[]>(`${cleanTraccarUrl(baseUrl)}/devices`, {
      headers: {
        Authorization: auth,
      },
      timeout: 8000,
    });

    const count = Array.isArray(response.data) ? response.data.length : 0;
    return { ok: true, message: `Conectado exitosamente (${count} dispositivos encontrados)`, deviceCount: count };
  } catch (error: any) {
    if (error.response?.status === 401) {
      return { ok: false, message: 'Error 401: Usuario o contraseña incorrectos en Traccar' };
    }
    return {
      ok: false,
      message: error?.response?.data?.message || error.message || 'Error al conectar con Traccar',
    };
  }
}

/**
 * Normaliza una placa o ID para comparaciones tolerantes a guiones, espacios y mayúsculas
 */
function normalizeIdentifier(val?: string | number): string {
  if (val == null) return '';
  return String(val).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Busca el ID numérico de un vehículo en una lista de dispositivos Traccar.
 * Prioridad:
 * 1. attributes.deviceID exactamente igual
 * 2. attributes.deviceID normalizado (sin guiones)
 * 3. name o uniqueId exactamente igual
 * 4. name o uniqueId normalizado
 */
export function findTraccarDeviceId(
  devices: TraccarDevice[],
  plateOrDeviceId: string,
): number | null {
  if (!plateOrDeviceId || !Array.isArray(devices)) return null;
  const targetExact = plateOrDeviceId.trim().toLowerCase();
  const targetNorm = normalizeIdentifier(plateOrDeviceId);

  // 1. Coincidencia exacta en attributes.deviceID
  const matchAttrExact = devices.find((d) => {
    const devId = d.attributes?.deviceID;
    return devId != null && String(devId).trim().toLowerCase() === targetExact;
  });
  if (matchAttrExact) return matchAttrExact.id;

  // 2. Coincidencia normalizada en attributes.deviceID
  if (targetNorm) {
    const matchAttrNorm = devices.find((d) => {
      const devId = d.attributes?.deviceID;
      return devId != null && normalizeIdentifier(devId) === targetNorm;
    });
    if (matchAttrNorm) return matchAttrNorm.id;
  }

  // 3. Coincidencia exacta por name o uniqueId
  const matchNameExact = devices.find(
    (d) =>
      (d.name && d.name.trim().toLowerCase() === targetExact) ||
      (d.uniqueId && d.uniqueId.trim().toLowerCase() === targetExact),
  );
  if (matchNameExact) return matchNameExact.id;

  // 4. Coincidencia normalizada por name o uniqueId
  if (targetNorm) {
    const matchNameNorm = devices.find((d) => {
      const nameNorm = normalizeIdentifier(d.name);
      const uniqueNorm = normalizeIdentifier(d.uniqueId);
      return (nameNorm && nameNorm === targetNorm) || (uniqueNorm && uniqueNorm === targetNorm);
    });
    if (matchNameNorm) return matchNameNorm.id;
  }

  return null;
}

/**
 * Resuelve un dispositivo buscando en los resultados de todos los servidores Traccar
 */
export function resolveTraccarDevice(
  serverDevicesList: ServerDevicesResult[],
  plateOrDeviceId: string,
  preferredServerUrl?: string,
): ResolvedTraccarDevice | null {
  if (!plateOrDeviceId) return null;

  // Si se proporcionó un servidor preferido, buscar ahí primero
  if (preferredServerUrl) {
    const preferredClean = cleanTraccarUrl(preferredServerUrl);
    const prefResult = serverDevicesList.find(
      (s) => cleanTraccarUrl(s.serverUrl) === preferredClean,
    );
    if (prefResult && prefResult.devices.length > 0) {
      const deviceId = findTraccarDeviceId(prefResult.devices, plateOrDeviceId);
      if (deviceId != null) {
        const device = prefResult.devices.find((d) => d.id === deviceId)!;
        return {
          serverUrl: prefResult.serverUrl,
          deviceId,
          plate: plateOrDeviceId,
          device,
        };
      }
    }
  }

  // Buscar en todos los servidores
  for (const s of serverDevicesList) {
    if (preferredServerUrl && cleanTraccarUrl(s.serverUrl) === cleanTraccarUrl(preferredServerUrl)) {
      continue; // ya se buscó arriba
    }
    const deviceId = findTraccarDeviceId(s.devices, plateOrDeviceId);
    if (deviceId != null) {
      const device = s.devices.find((d) => d.id === deviceId)!;
      return {
        serverUrl: s.serverUrl,
        deviceId,
        plate: plateOrDeviceId,
        device,
      };
    }
  }

  return null;
}

/**
 * Determina el servidor Traccar (fijado a https://do.velsat.pe:2087/api)
 */
export function resolveAccountTraccarServer(
  _username?: string,
  _serverDevicesList?: ServerDevicesResult[],
  _fallbackBaseUrl?: string,
): string {
  return DEFAULT_TRACCAR_URL;
}

/**
 * Crear la geocerca en Traccar
 * POST /api/geofences
 * Body: { "name": "...", "area": "CIRCLE (...) | POLYGON (...)" }
 */
export async function createTraccarGeofence(
  baseUrl: string = DEFAULT_TRACCAR_URL,
  name: string,
  areaWkt: string,
  description?: string,
  authHeader?: string,
): Promise<TraccarGeofence> {
  const auth = authHeader || getTraccarAuthHeader();
  if (!auth) {
    throw new Error('Credenciales de Traccar no configuradas');
  }

  const payload: any = {
    name,
    area: areaWkt,
  };
  if (description) {
    payload.description = description;
  }

  const targetUrl = `${cleanTraccarUrl(baseUrl)}/geofences`;
  console.log(`[Traccar] Creando geocerca en ${targetUrl}:`, payload);

  const response = await axios.post<TraccarGeofence>(targetUrl, payload, {
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json',
    },
    timeout: 10000,
  });

  return response.data;
}

/**
 * Editar geocerca en Traccar
 * PUT /api/geofences/{id}
 */
export async function updateTraccarGeofence(
  baseUrl: string = DEFAULT_TRACCAR_URL,
  id: number,
  name: string,
  areaWkt: string,
  description?: string,
  authHeader?: string,
): Promise<TraccarGeofence> {
  const auth = authHeader || getTraccarAuthHeader();
  if (!auth) {
    throw new Error('Credenciales de Traccar no configuradas');
  }

  const payload: any = {
    id,
    name,
    area: areaWkt,
  };
  if (description !== undefined) {
    payload.description = description;
  }

  const targetUrl = `${cleanTraccarUrl(baseUrl)}/geofences/${id}`;
  console.log(`[Traccar] Actualizando geocerca en ${targetUrl}:`, payload);

  const response = await axios.put<TraccarGeofence>(targetUrl, payload, {
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json',
    },
    timeout: 10000,
  });

  return response.data;
}

/**
 * Eliminar geocerca en Traccar
 * DELETE /api/geofences/{id}
 */
export async function deleteTraccarGeofence(
  baseUrl: string = DEFAULT_TRACCAR_URL,
  id: number,
  authHeader?: string,
): Promise<void> {
  const auth = authHeader || getTraccarAuthHeader();
  if (!auth) {
    throw new Error('Credenciales de Traccar no configuradas');
  }

  const targetUrl = `${cleanTraccarUrl(baseUrl)}/geofences/${id}`;
  console.log(`[Traccar] Eliminando geocerca en ${targetUrl}...`);

  await axios.delete(targetUrl, {
    headers: {
      Authorization: auth,
    },
    timeout: 10000,
  });
}

/**
 * Vincular vehículo a la geocerca en Traccar
 * POST /api/permissions
 * Body: { "deviceId": 649, "geofenceId": 1 }
 * Lanza error si Traccar rechaza la asignación.
 */
export async function linkDeviceToGeofenceTraccar(
  baseUrl: string = DEFAULT_TRACCAR_URL,
  deviceId: number,
  geofenceId: number,
  authHeader?: string,
): Promise<void> {
  const auth = authHeader || getTraccarAuthHeader();
  if (!auth) {
    throw new Error('Credenciales de Traccar no configuradas');
  }

  const targetUrl = `${cleanTraccarUrl(baseUrl)}/permissions`;
  const body = { deviceId, geofenceId };

  console.log(`[Traccar] POST ${targetUrl} payload:`, body);

  try {
    const response = await axios.post(targetUrl, body, {
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    console.log(
      `[Traccar] ✅ Permiso otorgado exitosamente en ${baseUrl} (HTTP ${response.status}) para deviceId: ${deviceId} y geofenceId: ${geofenceId}`,
    );
  } catch (error: any) {
    const status = error.response?.status;
    const errorDetails =
      error.response?.data?.message ||
      (typeof error.response?.data === 'string' ? error.response.data : '') ||
      error.message ||
      'Error desconocido';

    console.error(
      `[Traccar] ❌ Error al vincular deviceId: ${deviceId} con geofenceId: ${geofenceId} en ${baseUrl} (HTTP ${status}):`,
      errorDetails,
    );

    throw new Error(
      `Traccar (${status || 'sin respuesta'}): ${errorDetails.slice(0, 150)}`,
    );
  }
}

/**
 * Desvincular vehículo de la geocerca en Traccar
 * DELETE /api/permissions
 * Body: { "deviceId": 649, "geofenceId": 1 }
 */
export async function unlinkDeviceFromGeofenceTraccar(
  baseUrl: string = DEFAULT_TRACCAR_URL,
  deviceId: number,
  geofenceId: number,
  authHeader?: string,
): Promise<void> {
  const auth = authHeader || getTraccarAuthHeader();
  if (!auth) {
    throw new Error('Credenciales de Traccar no configuradas');
  }

  const targetUrl = `${cleanTraccarUrl(baseUrl)}/permissions`;
  console.log(`[Traccar] DELETE ${targetUrl} deviceId: ${deviceId}, geofenceId: ${geofenceId}`);

  try {
    const response = await axios.delete(targetUrl, {
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json',
      },
      data: {
        deviceId,
        geofenceId,
      },
      timeout: 10000,
    });

    console.log(
      `[Traccar] ✅ Desvinculación exitosa en ${baseUrl} (HTTP ${response.status}) deviceId: ${deviceId}, geofenceId: ${geofenceId}`,
    );
  } catch (error: any) {
    // Si ya no existía el permiso o el recurso fue eliminado (404/204), no considerarlo fallo bloqueante
    if (error.response?.status === 404) {
      console.warn(`[Traccar] Permiso ya no existía en ${baseUrl}, continuando.`);
      return;
    }

    const status = error.response?.status;
    const errorDetails =
      error.response?.data?.message ||
      (typeof error.response?.data === 'string' ? error.response.data : '') ||
      error.message;

    console.error(`[Traccar] ❌ Error al desvincular en ${baseUrl} (HTTP ${status}):`, errorDetails);
    throw new Error(`Traccar desvinculación (${status || 'error'}): ${errorDetails}`);
  }
}
