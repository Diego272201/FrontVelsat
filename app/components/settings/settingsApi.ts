/**
 * API de configuración por cuenta del microservicio de notificaciones
 * (https://do.velsat.pe:8443/notificaciones-trackbell, o SR según el servidor de la sesión).
 *
 * Aquí viven los DTOs del backend, las llamadas REST y la conversión entre
 * esos DTOs y el modelo que usa la pantalla de Configuración (`UserSettings`).
 */
import { getNotificationsBaseUrl } from '@/app/trackvelnew/geocercas/notificationsConfig';
import type {
  AlertSoundConfig,
  AlertsSettings,
  PreferenceSettings,
  SoundId,
  SpeedLimitSettings,
  UnitIconsSettings,
  UserSettings,
  VehicleIconId,
} from './types';

const STATIC_TOKEN =
  process.env.NEXT_PUBLIC_TRACKVEL_STATIC_TOKEN || 'trackvel-static-token-2026';
const REQUEST_TIMEOUT_MS = 15000;
/** Guardar límites espera a que el backend sincronice con Traccar (cuentas con 100+ unidades) */
const SPEED_LIMITS_TIMEOUT_MS = 60000;

// ---------------------------------------------------------------- DTOs del backend

export type TipoMapa = 'mapa' | 'satelite' | 'hibrido' | 'relieve';
export type SeveridadAlerta = 'critical' | 'warning' | 'info';

export interface AlertCatalogItem {
  eventKey: string;
  eventType: string;
  alarmType: string | null;
  nombre: string;
  descripcion: string;
  severidad: SeveridadAlerta;
  sonidoDefault: string;
}

export interface PreferenciasVisualizacion {
  tipoMapa: TipoMapa;
  mostrarPlacas: boolean;
  agruparUnidades: boolean;
  seguirUnidad: boolean;
}

export interface SonidoGlobal {
  silenciarTodo: boolean;
  volumenGeneral: number;
  noMolestarActivo: boolean;
  noMolestarInicio: string; // "HH:mm"
  noMolestarFin: string; // "HH:mm"
}

export interface AlertaNotificacionConfig {
  eventKey: string;
  sonido: string;
  volumen: number;
  repetirHastaOk: boolean;
}

export interface LimitesVelocidad {
  modo: 'flota' | 'vehiculo';
  limiteFlotaKmh: number;
  porVehiculo: Record<string, number>;
}

export interface ConfiguracionCuenta {
  accountID: string;
  preferencias: PreferenciasVisualizacion;
  sonidoGlobal: SonidoGlobal;
  notificaciones: AlertaNotificacionConfig[];
  limitesVelocidad: LimitesVelocidad;
  iconos: Record<string, string>;
  updatedAt: string | null;
}

/** Alerta del historial (GET /api/alertas) y del evento SignalR "DeviceAlert". */
export interface DeviceAlertPayload {
  id: number;
  accountID: string;
  deviceID: string;
  eventType: string;
  alarmType: string | null;
  eventKey: string;
  severity: SeveridadAlerta;
  serverTime: number;
  serverTimeUtc: string;
  latitude: number;
  longitude: number;
  speed: number;
  ignition: boolean;
  sonido: string | null;
  volumen: number | null;
  repetirHastaOk: boolean | null;
}

// ---------------------------------------------------------------- HTTP

const apiBase = () => `${getNotificationsBaseUrl()}/api`;

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  timeoutMs: number = REQUEST_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${apiBase()}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${STATIC_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}${text ? `: ${text.slice(0, 200)}` : ''}`);
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') throw new Error('El servidor no respondió a tiempo');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

const account = (accountID: string) => `accountID=${encodeURIComponent(accountID)}`;

export const fetchAccountConfig = (accountID: string) =>
  request<ConfiguracionCuenta>('GET', `/configuracion?${account(accountID)}`);

export const fetchAlertCatalog = () =>
  request<AlertCatalogItem[]>('GET', '/configuracion/alertas/catalogo');

export const putPreferencias = (accountID: string, body: PreferenciasVisualizacion) =>
  request<unknown>('PUT', `/configuracion/preferencias?${account(accountID)}`, body);

export const putAlertas = (
  accountID: string,
  body: { sonidoGlobal: SonidoGlobal; notificaciones: AlertaNotificacionConfig[] },
) => request<unknown>('PUT', `/configuracion/alertas?${account(accountID)}`, body);

/**
 * Resultado de copiar los límites a Traccar (attributes.speedLimit, en nudos). Lo hace el
 * backend al guardar: el frontend no llama a Traccar para los límites de velocidad.
 */
export interface TraccarSpeedLimitSync {
  habilitado: boolean;
  totalUnidadesCuenta: number;
  actualizadas: number;
  sinCambios: number;
  /** Cantidad de unidades con error (o la lista de errores, según la versión del backend) */
  errores: number | unknown[];
  mensaje?: string | null;
}

export interface LimitesVelocidadResponse {
  traccarSync?: TraccarSpeedLimitSync | null;
  [key: string]: unknown;
}

export const putLimitesVelocidad = (accountID: string, body: LimitesVelocidad) =>
  request<LimitesVelocidadResponse | undefined>(
    'PUT',
    `/configuracion/limites-velocidad?${account(accountID)}`,
    body,
    SPEED_LIMITS_TIMEOUT_MS,
  );

/** Cantidad de errores de traccarSync, venga como número o como lista. */
export const countSyncErrors = (s: TraccarSpeedLimitSync) =>
  Array.isArray(s.errores) ? s.errores.length : Number(s.errores) || 0;

export const putIconos = (
  accountID: string,
  body: { iconos: Record<string, string>; reemplazarTodo: boolean },
) => request<unknown>('PUT', `/configuracion/iconos?${account(accountID)}`, body);

export const deleteIconos = (accountID: string) =>
  request<void>('DELETE', `/configuracion/iconos?${account(accountID)}`);

/** Historial de alertas. Con soloActivas=true solo vienen las que la cuenta tiene agregadas. */
export const fetchAlertHistory = (
  accountID: string,
  opts: { soloActivas?: boolean; limit?: number; eventKey?: string; deviceID?: string } = {},
) => {
  const q = new URLSearchParams({
    accountID,
    soloActivas: String(opts.soloActivas ?? true),
    limit: String(opts.limit ?? 50),
  });
  if (opts.eventKey) q.set('eventKey', opts.eventKey);
  if (opts.deviceID) q.set('deviceID', opts.deviceID);
  return request<DeviceAlertPayload[]>('GET', `/alertas?${q.toString()}`);
};

// ---------------------------------------------------------------- Conversión

const MAP_FROM_API: Record<string, PreferenceSettings['mapType']> = {
  mapa: 'roadmap',
  satelite: 'satellite',
  hibrido: 'hybrid',
  relieve: 'terrain',
};
const MAP_TO_API: Record<PreferenceSettings['mapType'], TipoMapa> = {
  roadmap: 'mapa',
  satellite: 'satelite',
  hybrid: 'hibrido',
  terrain: 'relieve',
};

/** Nombres de sonido del backend (en español) ↔ ids del reproductor. */
const SOUND_TO_API: Record<SoundId, string> = {
  none: 'ninguno',
  classic: 'clasico',
  beep: 'beep',
  ding: 'ding',
  chime: 'campana',
  pulse: 'pulso',
  alarm: 'alarma',
  siren: 'sirena',
};
const SOUND_FROM_API: Record<string, SoundId> = {
  ...Object.fromEntries(Object.entries(SOUND_TO_API).map(([id, api]) => [api, id as SoundId])),
  // También se aceptan los ids del reproductor y algunas variantes
  ...Object.fromEntries(Object.keys(SOUND_TO_API).map((id) => [id, id as SoundId])),
  clásico: 'classic',
  sin: 'none',
  'sin sonido': 'none',
  silencio: 'none',
};

export function soundFromApi(name: string | null | undefined, fallback: SoundId = 'beep'): SoundId {
  if (!name) return fallback;
  return SOUND_FROM_API[name.trim().toLowerCase()] ?? fallback;
}

export const soundToApi = (sound: SoundId) => SOUND_TO_API[sound] ?? sound;

const VALID_ICONS = new Set<VehicleIconId>(['auto', 'cisterna', 'van']);
const clampVolume = (v: unknown, fallback: number) =>
  Math.max(0, Math.min(100, Number.isFinite(Number(v)) ? Math.round(Number(v)) : fallback));

/** Aplica la configuración del backend sobre la local (la cuenta del usuario no viene de esta API). */
export function applyApiConfig(base: UserSettings, cfg: ConfiguracionCuenta): UserSettings {
  const p = cfg.preferencias;
  const s = cfg.sonidoGlobal;
  const l = cfg.limitesVelocidad;

  const byUnitIcons: Record<string, VehicleIconId> = {};
  for (const [plate, icon] of Object.entries(cfg.iconos ?? {})) {
    if (VALID_ICONS.has(icon as VehicleIconId) && icon !== 'auto') {
      byUnitIcons[plate.toUpperCase()] = icon as VehicleIconId;
    }
  }

  // En modo "flota" los límites por vehículo no aplican: se ignoran para que, al
  // pasar a "Por vehículo", todas las unidades arranquen con el límite general.
  const byUnitLimits: Record<string, number> = {};
  const porVehiculo = l?.modo === 'vehiculo' ? l.porVehiculo : undefined;
  for (const [plate, kmh] of Object.entries(porVehiculo ?? {})) {
    const n = Number(kmh);
    if (Number.isFinite(n) && n > 0) byUnitLimits[plate.toUpperCase()] = Math.round(n);
  }

  const seen = new Set<string>();
  const items: AlertSoundConfig[] = [];
  for (const n of cfg.notificaciones ?? []) {
    if (!n?.eventKey || seen.has(n.eventKey)) continue;
    seen.add(n.eventKey);
    items.push({
      type: n.eventKey,
      enabled: true,
      sound: soundFromApi(n.sonido),
      volume: clampVolume(n.volumen, 80),
      popup: true,
      loop: Boolean(n.repetirHastaOk),
      available: true,
    });
  }

  return {
    ...base,
    icons: { byUnit: byUnitIcons },
    preferences: p
      ? {
          mapType: MAP_FROM_API[p.tipoMapa] ?? base.preferences.mapType,
          showPlateLabels: p.mostrarPlacas !== false,
          clusterMarkers: Boolean(p.agruparUnidades),
          followSelectedUnit: p.seguirUnidad !== false,
        }
      : base.preferences,
    alerts: {
      ...base.alerts,
      ...(s
        ? {
            muteAll: Boolean(s.silenciarTodo),
            masterVolume: clampVolume(s.volumenGeneral, 100),
            quietHours: {
              enabled: Boolean(s.noMolestarActivo),
              startTime: s.noMolestarInicio || base.alerts.quietHours.startTime,
              endTime: s.noMolestarFin || base.alerts.quietHours.endTime,
            },
          }
        : {}),
      speedLimits: l
        ? {
            mode: l.modo === 'vehiculo' ? 'byUnit' : 'general',
            generalLimit: Number(l.limiteFlotaKmh) || base.alerts.speedLimits.generalLimit,
            byUnit: byUnitLimits,
          }
        : base.alerts.speedLimits,
      items,
    },
  };
}

export const preferencesToApi = (p: PreferenceSettings): PreferenciasVisualizacion => ({
  tipoMapa: MAP_TO_API[p.mapType] ?? 'mapa',
  mostrarPlacas: p.showPlateLabels,
  agruparUnidades: p.clusterMarkers,
  seguirUnidad: p.followSelectedUnit,
});

export const alertsToApi = (a: AlertsSettings) => ({
  sonidoGlobal: {
    silenciarTodo: a.muteAll,
    volumenGeneral: a.masterVolume,
    noMolestarActivo: a.quietHours.enabled,
    noMolestarInicio: a.quietHours.startTime,
    noMolestarFin: a.quietHours.endTime,
  },
  notificaciones: a.items.map((it) => ({
    eventKey: it.type,
    sonido: soundToApi(it.sound),
    volumen: it.volume,
    repetirHastaOk: it.loop,
  })),
});

export const speedLimitsToApi = (l: SpeedLimitSettings): LimitesVelocidad => ({
  modo: l.mode === 'byUnit' ? 'vehiculo' : 'flota',
  limiteFlotaKmh: l.generalLimit,
  // En modo flota no se guardan límites por vehículo (limpia los que hubiera)
  porVehiculo: l.mode === 'byUnit' ? { ...l.byUnit } : {},
});

/** Solo se envían las placas distintas de "auto" (las que no están se asumen "auto"). */
export const iconsToApi = (i: UnitIconsSettings): Record<string, string> =>
  Object.fromEntries(Object.entries(i.byUnit).filter(([, icon]) => icon && icon !== 'auto'));
