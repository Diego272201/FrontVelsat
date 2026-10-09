import axios from 'axios';

export const WHATSAPP_API_BASE =
  process.env.NEXT_PUBLIC_TRACKVEL_API_URL ||
  'https://do.velsat.pe:8443/notificaciones-trackbell';
export const WHATSAPP_STATIC_TOKEN =
  process.env.NEXT_PUBLIC_TRACKVEL_STATIC_TOKEN || 'trackvel-static-token-2026';

export interface DestinoWhatsAppDto {
  id: number;
  idGeocerca: number;
  nombre?: string | null;
  phone: string;
  activo: boolean;
  eventos?: 'ambos' | 'entrada' | 'salida';
  vehiculosAsignados?: string[] | null;
}

export interface VehiculoGeocercaDto {
  deviceID: string;
  activo: boolean;
  notificarWhatsapp: boolean;
}

export interface GeocercaWhatsAppDetailDto {
  id: number;
  accountID?: string | null;
  geofenceID: number;
  nombre?: string | null;
  whatsappActivo: boolean;
  whatsappModo?: 'todos' | 'seleccionados';
  whatsappEventos?: 'ambos' | 'entrada' | 'salida';
  destinos: DestinoWhatsAppDto[];
  vehiculos: VehiculoGeocercaDto[];
}

export interface UpdateWhatsAppConfigDto {
  whatsappActivo: boolean;
  whatsappModo?: 'todos' | 'seleccionados';
  whatsappEventos?: 'ambos' | 'entrada' | 'salida';
}

export interface CreateDestinoDto {
  nombre?: string;
  phone: string;
  activo?: boolean;
  eventos?: 'ambos' | 'entrada' | 'salida';
  vehiculos?: string[] | null;
}

export interface UpdateDestinoDto {
  nombre?: string;
  phone: string;
  activo?: boolean;
  eventos?: 'ambos' | 'entrada' | 'salida';
  vehiculos?: string[] | null;
}

export interface UpdateVehiculosNotificarDto {
  deviceIds: string[];
  notificarWhatsapp: boolean;
}

export interface TestWhatsAppResponse {
  success: boolean;
  httpStatusCode?: number;
  normalizedPhone?: string;
  messageSent?: string;
  errorMessage?: string;
  apiResponse?: any;
}

const apiClient = axios.create({
  baseURL: WHATSAPP_API_BASE,
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${WHATSAPP_STATIC_TOKEN}`,
    'X-API-KEY': WHATSAPP_STATIC_TOKEN,
  },
  timeout: 15000,
});

/**
 * A. Obtener toda la configuración de WhatsApp de una geocerca
 * GET /api/geocercas/{geofenceID}/whatsapp
 */
export async function getGeocercaWhatsAppConfig(
  geofenceID: number,
): Promise<GeocercaWhatsAppDetailDto> {
  const res = await apiClient.get<GeocercaWhatsAppDetailDto>(
    `/api/geocercas/${geofenceID}/whatsapp`,
  );
  return res.data;
}

/**
 * B. Guardar configuración general de WhatsApp de la geocerca
 * PUT /api/geocercas/{geofenceID}/whatsapp/config
 */
export async function updateGeocercaWhatsAppConfig(
  geofenceID: number,
  config: UpdateWhatsAppConfigDto,
): Promise<void> {
  await apiClient.put(`/api/geocercas/${geofenceID}/whatsapp/config`, config);
}

/**
 * C. Agregar nuevo número de destino
 * POST /api/geocercas/{geofenceID}/whatsapp/destinos
 */
export async function addDestinoWhatsApp(
  geofenceID: number,
  payload: CreateDestinoDto,
): Promise<DestinoWhatsAppDto> {
  const res = await apiClient.post<DestinoWhatsAppDto>(
    `/api/geocercas/${geofenceID}/whatsapp/destinos`,
    payload,
  );
  return res.data;
}

/**
 * D. Editar un número de destino existente
 * PUT /api/geocercas/{geofenceID}/whatsapp/destinos/{destinoId}
 */
export async function updateDestinoWhatsApp(
  geofenceID: number,
  destinoId: number,
  payload: UpdateDestinoDto,
): Promise<DestinoWhatsAppDto> {
  const res = await apiClient.put<DestinoWhatsAppDto>(
    `/api/geocercas/${geofenceID}/whatsapp/destinos/${destinoId}`,
    payload,
  );
  return res.data;
}

/**
 * E. Eliminar un número de destino
 * DELETE /api/geocercas/{geofenceID}/whatsapp/destinos/{destinoId}
 */
export async function deleteDestinoWhatsApp(
  geofenceID: number,
  destinoId: number,
): Promise<void> {
  await apiClient.delete(`/api/geocercas/${geofenceID}/whatsapp/destinos/${destinoId}`);
}

/**
 * F. Marcar vehículos autorizados en modo 'seleccionados'
 * PUT /api/geocercas/{geofenceID}/whatsapp/vehiculos/notificar
 * (con fallback a /api/geocercas/{geofenceID}/vehiculos/notificar si es necesario)
 */
export async function updateVehiculosNotificar(
  geofenceID: number,
  payload: UpdateVehiculosNotificarDto,
): Promise<void> {
  try {
    await apiClient.put(
      `/api/geocercas/${geofenceID}/whatsapp/vehiculos/notificar`,
      payload,
    );
  } catch (err: any) {
    if (err?.response?.status === 404) {
      await apiClient.put(`/api/geocercas/${geofenceID}/vehiculos/notificar`, payload);
    } else {
      throw err;
    }
  }
}

/**
 * G. Disparar mensaje de prueba en vivo
 * POST /api/whatsapp/test-send
 */
export async function sendWhatsAppTest(
  phone: string,
  message?: string,
): Promise<TestWhatsAppResponse> {
  const res = await apiClient.post<TestWhatsAppResponse>('/api/whatsapp/test-send', {
    phone,
    message: message || '',
  });
  return res.data;
}
