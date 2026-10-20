// Datos estáticos de ejemplo. Reemplazar por llamadas a la API más adelante.
import type {
  AlertTypeId,
  QuietHoursSettings,
  SoundId,
  UserSettings,
  VehicleIconId,
} from './types';

export const ALERT_LABELS: Record<AlertTypeId, { title: string; description: string }> = {
  geofenceEnter: { title: 'Entrada a geocerca', description: 'Cuando una unidad ingresa a una geocerca' },
  geofenceExit: { title: 'Salida de geocerca', description: 'Cuando una unidad sale de una geocerca' },
  overspeed: { title: 'Exceso de velocidad', description: 'Cuando una unidad supera el límite de velocidad configurado' },
  ignitionOn: { title: 'Encendido de motor', description: 'Cuando la unidad enciende el motor' },
  ignitionOff: { title: 'Apagado de motor', description: 'Cuando la unidad apaga el motor' },
  panic: { title: 'Botón de pánico', description: 'Cuando el conductor presiona el botón SOS' },
  lowBattery: { title: 'Batería baja', description: 'Cuando el GPS reporta batería baja' },
  disconnect: { title: 'Desconexión de GPS', description: 'Cuando la unidad deja de reportar' },
};

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

export const VEHICLE_ICON_LABELS: Record<VehicleIconId, string> = {
  car: 'Auto / Sedán',
  pickup: 'Camioneta / Pickup',
  van: 'Van / Minivan',
  bus: 'Bus / Microbús',
  truck: 'Camión / Carga',
  moto: 'Motocicleta',
  taxi: 'Taxi',
  ambulance: 'Ambulancia / Emergencia',
};

export const ICON_COLORS = [
  '#113EB9',
  '#0EA5E9',
  '#10B981',
  '#84CC16',
  '#F59E0B',
  '#FB7B0F',
  '#EF4444',
  '#EC4899',
  '#8B5CF6',
  '#334155',
];

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

const DEFAULT_ICON: Record<string, VehicleIconId> = {
  'ABC-123': 'van',
  'BXR-456': 'van',
  'C7K-789': 'bus',
  'D2M-321': 'truck',
  'EFG-654': 'pickup',
  'F9P-987': 'moto',
  'GHT-741': 'car',
  'HJK-852': 'bus',
};

export const ALERT_TYPES_ORDER: AlertTypeId[] = [
  'geofenceEnter',
  'geofenceExit',
  'overspeed',
  'ignitionOn',
  'ignitionOff',
  'panic',
  'lowBattery',
  'disconnect',
];

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
    odometers: UNITS.map((u, i) => ({
      ...u,
      odometroActual: 45230 + i * 12873.4,
      odometroInicial: null,
      fechaAjuste: null,
    })),
    icons: UNITS.map((u) => ({
      deviceId: u.deviceId,
      placa: u.placa,
      icon: DEFAULT_ICON[u.deviceId] ?? 'car',
      color: '#113EB9',
    })),
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
        byType: {
          car: 90,
          pickup: 85,
          van: 90,
          bus: 85,
          truck: 70,
          moto: 60,
          taxi: 80,
          ambulance: 100,
        },
      },
      items: ALERT_TYPES_ORDER.map((type) => {
        const isGeofence = type === 'geofenceEnter' || type === 'geofenceExit';
        const isOverspeed = type === 'overspeed';
        return {
          type,
          enabled: isGeofence || isOverspeed,
          sound:
            type === 'geofenceEnter'
              ? 'ding'
              : type === 'geofenceExit'
                ? 'chime'
                : type === 'panic'
                  ? 'siren'
                  : isOverspeed
                    ? 'classic' // mismo /alert.mp3 que se usaba antes
                    : 'beep',
          // Exceso de velocidad: 40% = volumen que tenía antes
          volume: isOverspeed ? 40 : 80,
          popup: true,
          loop: isOverspeed,
          // Alertas activas hoy en el sistema (requieren soporte en telemetría de backend)
          available: isGeofence || isOverspeed,
        };
      }),
    },
    preferences: {
      mapType: 'roadmap',
      distanceUnit: 'km',
      refreshSeconds: 10,
      timezone: 'America/Lima',
      dateFormat: 'DD-MM-YYYY',
      showPlateLabels: true,
      clusterMarkers: false,
      followSelectedUnit: true,
    },
  };
}
