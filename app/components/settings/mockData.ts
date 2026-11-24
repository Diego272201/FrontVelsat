// Valores por defecto y opciones fijas de Configuración.
import { getAlertCatalogItem } from './alertCatalog';
import { soundFromApi } from './settingsApi';
import type {
  AlertSoundConfig,
  AlertTypeId,
  QuietHoursSettings,
  SoundId,
  UserSettings,
  VehicleIconId,
} from './types';

export const SOUND_OPTIONS: { id: SoundId; label: string }[] = [
  { id: 'none', label: 'Sin sonido' },
  { id: 'classic', label: 'Clásico (actual)' },
  { id: 'beep', label: 'Beep' },
  { id: 'ding', label: 'Ding' },
  { id: 'chime', label: 'Campana' },
  { id: 'pulse', label: 'Pulso' },
  { id: 'alarm', label: 'Alarma' },
  { id: 'siren', label: 'Sirena' },
];

export interface VehicleIconMeta {
  id: VehicleIconId;
  label: string;
  description: string;
  preview: string;
}

export const VEHICLE_ICON_OPTIONS: VehicleIconMeta[] = [
  {
    id: 'auto',
    label: 'Auto',
    description: 'Sedán / Vehículo liviano',
    preview: '/auto/downright.webp',
  },
  {
    id: 'cisterna',
    label: 'Cisterna',
    description: 'Camión cisterna',
    preview: '/cisterna/cisterna_sureste.webp',
  },
  {
    id: 'van',
    label: 'Van',
    description: 'Sprinter / Furgón',
    preview: '/sprinter/van_sureste.webp',
  },
];

export const VEHICLE_ICON_LABELS: Record<VehicleIconId, string> = {
  auto: 'Auto',
  cisterna: 'Cisterna',
  van: 'Van',
};

const UNITS = [
  { deviceId: 'ABC-123', placa: 'ABC-123', descripcion: 'Toyota Hiace' },
  { deviceId: 'BXR-456', placa: 'BXR-456', descripcion: 'Mercedes Sprinter' },
  { deviceId: 'C7K-789', placa: 'C7K-789', descripcion: 'Hyundai County' },
  { deviceId: 'D2M-321', placa: 'D2M-321', descripcion: 'Volvo FH' },
  { deviceId: 'EFG-654', placa: 'EFG-654', descripcion: 'Toyota Hilux' },
  { deviceId: 'F9P-987', placa: 'F9P-987', descripcion: 'Honda XR150' },
  { deviceId: 'GHT-741', placa: 'GHT-741', descripcion: 'Kia Rio' },
  { deviceId: 'HJK-852', placa: 'HJK-852', descripcion: 'Scania Irizar' },
];

/** Notificaciones con las que arranca la cuenta mientras no llegue su configuración del servidor. */
export const DEFAULT_ALERT_TYPES: AlertTypeId[] = ['geofenceEnter', 'geofenceExit', 'deviceOverspeed'];

/** Configuración con la que se agrega una notificación nueva a "Mis notificaciones". */
export function defaultAlertConfig(type: AlertTypeId): AlertSoundConfig {
  const item = getAlertCatalogItem(type);
  const isOverspeed = type === 'deviceOverspeed';
  const critical = item?.severidad === 'critical';
  return {
    type,
    enabled: true,
    sound: soundFromApi(item?.sonidoDefault, 'beep'),
    // Exceso de velocidad: 40% = volumen que tenía antes
    volume: isOverspeed ? 40 : critical ? 100 : 80,
    popup: true,
    loop: isOverspeed || critical,
    available: true,
  };
}

/** Determina si una hora dada está dentro del horario de silencio configurado */
export function isCurrentlyQuietHours(quiet?: QuietHoursSettings): boolean {
  if (!quiet || !quiet.enabled) return false;
  if (!quiet.startTime || !quiet.endTime) return false;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startH, startM] = quiet.startTime.split(':').map(Number);
  const [endH, endM] = quiet.endTime.split(':').map(Number);
  const startMinutes = (startH || 0) * 60 + (startM || 0);
  const endMinutes = (endH || 0) * 60 + (endM || 0);

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } else {
    // Rango que cruza la medianoche (ej. 22:00 a 06:00)
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
}

export function buildDefaultSettings(username: string): UserSettings {
  return {
    account: {
      username,
      displayName: username ? username.toUpperCase() : 'Usuario',
      email: `${username || 'usuario'}@empresa.com`,
      phone: '',
      company: username ? username.toUpperCase() : '',
    },
    icons: {
      byUnit: {},
    },
    alerts: {
      muteAll: false,
      masterVolume: 100,
      quietHours: {
        enabled: false,
        startTime: '22:00',
        endTime: '06:00',
      },
      speedLimits: {
        mode: 'general',
        generalLimit: 90,
        byUnit: {},
      },
      // Hasta que responda el servidor (luego manda lo que tenga guardado la cuenta)
      items: DEFAULT_ALERT_TYPES.map(defaultAlertConfig),
    },
    preferences: {
      mapType: 'roadmap',
      showPlateLabels: true,
      clusterMarkers: false,
      followSelectedUnit: true,
    },
  };
}
