// Tipos del módulo de Configuración de usuario (Trackvel).
// Los DTOs del backend y su conversión a estos tipos están en settingsApi.ts.

export type SettingsSectionId =
  | 'cuenta'
  | 'seguridad'
  | 'odometro'
  | 'iconos'
  | 'velocidad'
  | 'alertas'
  | 'preferencias';

export interface AccountSettings {
  username: string;
  displayName: string;
  email: string;
  phone: string;
  company: string;
}

/**
 * Odómetro de una unidad de la cuenta, leído desde Traccar (que es quien acumula
 * la distancia recorrida). No se guarda en la configuración local.
 */
export interface UnitOdometer {
  /** Placa de la cuenta (DeviceList), en mayúsculas */
  placa: string;
  /** Id numérico del dispositivo en Traccar (null si no se encontró en el servidor) */
  traccarId: number | null;
  /** Nombre del dispositivo en Traccar */
  traccarName: string | null;
  /** Traccar solo permite ajustar dispositivos que ya reportaron una posición */
  hasPosition: boolean;
  /** Odómetro actual en km (totalDistance / 1000) */
  odometroKm: number | null;
  /** Horas de motor actuales en ms (se reenvían al ajustar para no reiniciarlas) */
  hoursMs: number | null;
  /** Fecha ISO de la última posición reportada */
  ultimoReporte: string | null;
  /** Fecha ISO del último ajuste hecho desde esta pantalla (guardada en este navegador) */
  fechaAjuste: string | null;
}

export type VehicleIconId = 'auto' | 'cisterna' | 'van';

export interface UnitIconsSettings {
  /** Ícono asignado por unidad: placa en mayúsculas → tipo de ícono (por defecto 'auto') */
  byUnit: Record<string, VehicleIconId>;
}

/**
 * Tipo de notificación: el `eventKey` del catálogo del backend
 * (geofenceEnter, geofenceExit, deviceOverspeed, alarm:sos, ignitionOn, deviceOffline…).
 */
export type AlertTypeId = string;

export type SoundId = 'none' | 'classic' | 'beep' | 'ding' | 'chime' | 'pulse' | 'alarm' | 'siren';

/**
 * Una notificación que el usuario agregó a "Mis notificaciones", con su sonido.
 * Los tipos que no están en la lista no generan aviso ni sonido.
 */
export interface AlertSoundConfig {
  type: AlertTypeId;
  /** Siempre true para las notificaciones agregadas (se mantiene por compatibilidad) */
  enabled: boolean;
  sound: SoundId;
  /** 0 - 100 */
  volume: number;
  /** Mostrar notificación emergente en pantalla */
  popup: boolean;
  /** Repetir el sonido hasta que el usuario confirme la alerta */
  loop: boolean;
  /** Se mantiene por compatibilidad: todas las del catálogo están disponibles */
  available: boolean;
}

export type SpeedLimitMode = 'general' | 'byUnit';

export interface SpeedLimitSettings {
  mode: SpeedLimitMode;
  /** Límite para toda la flota, y para las unidades sin límite propio (km/h) */
  generalLimit: number;
  /** Límite propio por unidad: placa en mayúsculas → km/h (solo en modo 'byUnit') */
  byUnit: Record<string, number>;
}

export interface QuietHoursSettings {
  enabled: boolean;
  /** Hora de inicio en formato HH:mm (ej. "22:00") */
  startTime: string;
  /** Hora de fin en formato HH:mm (ej. "06:00") */
  endTime: string;
}

export interface AlertsSettings {
  muteAll: boolean;
  /** 0 - 100 */
  masterVolume: number;
  quietHours: QuietHoursSettings;
  speedLimits: SpeedLimitSettings;
  /** Mis notificaciones: solo las que el usuario agregó, en el orden en que las agregó */
  items: AlertSoundConfig[];
}

export interface PreferenceSettings {
  mapType: 'roadmap' | 'satellite' | 'hybrid' | 'terrain';
  showPlateLabels: boolean;
  clusterMarkers: boolean;
  followSelectedUnit: boolean;
}

export interface UserSettings {
  account: AccountSettings;
  icons: UnitIconsSettings;
  alerts: AlertsSettings;
  preferences: PreferenceSettings;
}
