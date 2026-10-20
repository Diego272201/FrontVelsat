// Tipos del módulo de Configuración de usuario (Trackvel).
// Cuando exista la API, estos tipos deberían coincidir con los DTOs del backend.

export type SettingsSectionId =
  | 'cuenta'
  | 'seguridad'
  | 'odometro'
  | 'iconos'
  | 'alertas'
  | 'preferencias';

export interface AccountSettings {
  username: string;
  displayName: string;
  email: string;
  phone: string;
  company: string;
}

export interface UnitOdometer {
  deviceId: string;
  placa: string;
  descripcion: string;
  /** Odómetro actual calculado por el sistema (km) */
  odometroActual: number;
  /** Último valor inicial definido manualmente por el usuario (km) */
  odometroInicial: number | null;
  /** Fecha ISO del último ajuste manual */
  fechaAjuste: string | null;
}

export type VehicleIconId =
  | 'car'
  | 'pickup'
  | 'van'
  | 'bus'
  | 'truck'
  | 'moto'
  | 'taxi'
  | 'ambulance';

export interface UnitIcon {
  deviceId: string;
  placa: string;
  icon: VehicleIconId;
  color: string;
}

export type AlertTypeId =
  | 'geofenceEnter'
  | 'geofenceExit'
  | 'overspeed'
  | 'ignitionOn'
  | 'ignitionOff'
  | 'panic'
  | 'lowBattery'
  | 'disconnect';

export type SoundId = 'none' | 'classic' | 'beep' | 'ding' | 'chime' | 'pulse' | 'alarm' | 'siren';

export interface AlertSoundConfig {
  type: AlertTypeId;
  enabled: boolean;
  sound: SoundId;
  /** 0 - 100 */
  volume: number;
  /** Mostrar notificación emergente en pantalla */
  popup: boolean;
  /** Repetir el sonido hasta que el usuario confirme la alerta */
  loop: boolean;
  /** Si el backend ya genera este tipo de alerta */
  available: boolean;
}

export type SpeedLimitMode = 'general' | 'byType';

export interface SpeedLimitSettings {
  mode: SpeedLimitMode;
  /** Límite único para toda la flota (km/h) */
  generalLimit: number;
  /** Límites diferenciados por tipo de vehículo (km/h) */
  byType: Record<VehicleIconId, number>;
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
  items: AlertSoundConfig[];
}

export interface PreferenceSettings {
  mapType: 'roadmap' | 'satellite' | 'hybrid' | 'terrain';
  distanceUnit: 'km' | 'mi';
  refreshSeconds: number;
  timezone: string;
  dateFormat: 'DD-MM-YYYY' | 'MM-DD-YYYY' | 'YYYY-MM-DD';
  showPlateLabels: boolean;
  clusterMarkers: boolean;
  followSelectedUnit: boolean;
}

export interface UserSettings {
  account: AccountSettings;
  odometers: UnitOdometer[];
  icons: UnitIcon[];
  alerts: AlertsSettings;
  preferences: PreferenceSettings;
}
