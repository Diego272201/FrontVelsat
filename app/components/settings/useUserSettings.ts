'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type {
  AccountSettings,
  AlertSoundConfig,
  AlertsSettings,
  AlertTypeId,
  PreferenceSettings,
  SpeedLimitSettings,
  UnitIconsSettings,
  UserSettings,
  VehicleIconId,
} from './types';
import { buildDefaultSettings, defaultAlertConfig, isCurrentlyQuietHours } from './mockData';
import {
  alertsToApi,
  applyApiConfig,
  countSyncErrors,
  type TraccarSpeedLimitSync,
  deleteIconos,
  fetchAccountConfig,
  iconsToApi,
  preferencesToApi,
  putAlertas,
  putIconos,
  putLimitesVelocidad,
  putPreferencias,
  speedLimitsToApi,
} from './settingsApi';

const VALID_ICON_IDS = new Set<VehicleIconId>(['auto', 'cisterna', 'van']);

function normalizeIcons(raw: unknown): UserSettings['icons'] {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const byUnitRaw = (raw as { byUnit?: Record<string, unknown> }).byUnit;
    if (byUnitRaw && typeof byUnitRaw === 'object') {
      const byUnit: Record<string, VehicleIconId> = {};
      for (const [k, v] of Object.entries(byUnitRaw)) {
        if (typeof v === 'string' && VALID_ICON_IDS.has(v as VehicleIconId)) {
          byUnit[k.toUpperCase()] = v as VehicleIconId;
        }
      }
      return { byUnit };
    }
  }
  return { byUnit: {} };
}

/**
 * Configuración del usuario.
 *
 * La fuente de verdad es la API de configuración por cuenta (settingsApi.ts). Lo último
 * que respondió se guarda también en localStorage para leerlo al instante y de forma
 * síncrona (mapa, sidebar, alertas) y para seguir funcionando si el servidor no responde.
 * La pestaña "Mi cuenta" no está en esa API y se guarda solo en este navegador.
 */

const storageKey = (user: string) => `trackvel_settings_v3_${user || 'default'}`;

export function getCurrentUser(): string {
  if (typeof window === 'undefined') return '';
  return (localStorage.getItem('currentUser') || '').trim();
}

/** Nombres anteriores de algunas notificaciones → eventKey del backend */
const LEGACY_ALERT_KEYS: Record<string, AlertTypeId> = {
  overspeed: 'deviceOverspeed',
  panic: 'alarm:sos',
  disconnect: 'deviceOffline',
};

/** Normaliza la lista guardada de notificaciones (incluye la migración del formato anterior). */
function migrateAlertItems(savedItems: AlertSoundConfig[]): AlertSoundConfig[] {
  const seen = new Set<AlertTypeId>();
  const out: AlertSoundConfig[] = [];
  for (const it of savedItems) {
    if (!it || typeof it.type !== 'string' || it.enabled === false) continue;
    const type = LEGACY_ALERT_KEYS[it.type] ?? it.type;
    if (type === 'lowBattery' || seen.has(type)) continue;
    seen.add(type);
    out.push({ ...defaultAlertConfig(type), ...it, type, enabled: true, popup: true, available: true });
  }
  return out;
}

function writeCache(user: string, settings: UserSettings) {
  try {
    localStorage.setItem(storageKey(user), JSON.stringify(settings));
  } catch {
    /* almacenamiento lleno o bloqueado */
  }
}

/** Aviso con el resultado de aplicar los límites de velocidad en Traccar (lo hace el backend). */
function notifyTraccarSync(sync: TraccarSpeedLimitSync | null | undefined) {
  if (!sync) return;
  if (!sync.habilitado) {
    toast.info('Límites guardados', {
      description: sync.mensaje || 'La sincronización con el GPS no está habilitada para esta cuenta.',
    });
    return;
  }
  const errores = countSyncErrors(sync);
  const detalle = `${sync.actualizadas} actualizadas · ${sync.sinCambios} sin cambios · ${sync.totalUnidadesCuenta} unidades en la cuenta`;
  if (errores > 0) {
    toast.warning(`Límites guardados, pero ${errores} unidad${errores === 1 ? '' : 'es'} no se pudo actualizar en el GPS`, {
      description: sync.mensaje ? `${sync.mensaje} (${detalle})` : detalle,
      duration: 10000,
    });
  } else {
    toast.success('Límites aplicados en el GPS', { description: detalle });
  }
}

function emitSettingsUpdated(key: keyof UserSettings, value: unknown) {
  window.dispatchEvent(new CustomEvent('trackvel:settings-updated', { detail: { key, value } }));
}

export function loadSettings(user: string): UserSettings {
  const defaults = buildDefaultSettings(user);
  try {
    const raw = localStorage.getItem(storageKey(user));
    if (!raw) return defaults;
    // `odometers` quedó de una versión anterior (datos de prueba): hoy se lee de Traccar
    const { odometers: _legacyOdometers, ...saved } = JSON.parse(raw) as Partial<UserSettings> & {
      odometers?: unknown;
    };
    const savedItems = (saved.alerts?.items ?? []) as AlertSoundConfig[];
    return {
      ...defaults,
      ...saved,
      account: { ...defaults.account, ...saved.account },
      icons: normalizeIcons(saved.icons),
      alerts: {
        ...defaults.alerts,
        ...saved.alerts,
        speedLimits: {
          generalLimit:
            saved.alerts?.speedLimits?.generalLimit ?? defaults.alerts.speedLimits.generalLimit,
          // El antiguo modo "por tipo de vehículo" ya no existe: vuelve al general
          mode: saved.alerts?.speedLimits?.mode === 'byUnit' ? 'byUnit' : 'general',
          byUnit: { ...saved.alerts?.speedLimits?.byUnit },
        },
        quietHours: {
          ...defaults.alerts.quietHours,
          ...saved.alerts?.quietHours,
        },
        // Mis notificaciones. Sin nada guardado se usan las de por defecto; si el usuario
        // quitó todas, la lista vacía se respeta.
        items: saved.alerts?.items ? migrateAlertItems(savedItems) : defaults.alerts.items,
      },
      preferences: { ...defaults.preferences, ...saved.preferences },
    };
  } catch {
    return defaults;
  }
}

// ---------------------------------------------------------------- Sincronización con la API

let syncPromise: Promise<UserSettings> | null = null;
let syncUser = '';

/**
 * Trae la configuración de la cuenta desde la API, la guarda en la caché local y avisa al
 * resto de la app (mapa, sidebar, alertas) de lo que cambió. Se pide una vez por página;
 * `force` la vuelve a pedir (al abrir Configuración).
 */
export function syncSettingsFromApi(
  user: string = getCurrentUser(),
  { force = false }: { force?: boolean } = {},
): Promise<UserSettings> {
  if (!user) return Promise.reject(new Error('Sin usuario en sesión'));
  if (!force && syncPromise && syncUser === user) return syncPromise;

  syncUser = user;
  const promise = fetchAccountConfig(user).then((cfg) => {
    const before = loadSettings(user);
    const next = applyApiConfig(before, cfg);
    writeCache(user, next);
    (['icons', 'alerts', 'preferences'] as const).forEach((key) => {
      if (JSON.stringify(before[key]) !== JSON.stringify(next[key])) {
        emitSettingsUpdated(key, next[key]);
      }
    });
    return next;
  });
  syncPromise = promise;
  // Si falla, la próxima llamada vuelve a intentarlo
  promise.catch(() => {
    if (syncPromise === promise) syncPromise = null;
  });
  return promise;
}

/** Valores que guarda cada pestaña (los límites viven dentro de `alerts`, pero tienen su propio endpoint). */
export interface SettingsSaveValues {
  account: AccountSettings;
  icons: UnitIconsSettings;
  alerts: AlertsSettings;
  speedLimits: SpeedLimitSettings;
  preferences: PreferenceSettings;
}

export type SettingsSyncStatus = 'idle' | 'loading' | 'ready' | 'offline';

export function useUserSettings() {
  const [user, setUser] = useState('');
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [syncStatus, setSyncStatus] = useState<SettingsSyncStatus>('idle');
  const settingsRef = useRef<UserSettings | null>(null);
  settingsRef.current = settings;

  useEffect(() => {
    const u = getCurrentUser();
    setUser(u);
    setSettings(loadSettings(u));
  }, []);

  /** Vuelve a pedir la configuración al servidor (si falla, se queda con la caché local). */
  const reload = useCallback(async () => {
    const u = getCurrentUser();
    setUser(u);
    setSyncStatus('loading');
    try {
      const next = await syncSettingsFromApi(u, { force: true });
      setSettings(next);
      setSyncStatus('ready');
    } catch (err) {
      console.warn('[Configuración] No se pudo leer la configuración del servidor:', err);
      setSettings(loadSettings(u));
      setSyncStatus('offline');
    }
  }, []);

  const saveSection = useCallback(
    async <K extends keyof SettingsSaveValues>(key: K, value: SettingsSaveValues[K]) => {
      const targetUser = getCurrentUser() || user || 'default';
      const prev = settingsRef.current ?? loadSettings(targetUser);
      let next: UserSettings;

      switch (key) {
        case 'account':
          // Sin endpoint: queda en este navegador
          next = { ...prev, account: value as AccountSettings };
          break;
        case 'icons': {
          const iconos = iconsToApi(value as UnitIconsSettings);
          // Sin personalizaciones = "Restablecer todas a Auto"
          if (Object.keys(iconos).length === 0) await deleteIconos(targetUser);
          else await putIconos(targetUser, { iconos, reemplazarTodo: true });
          next = { ...prev, icons: { byUnit: iconos as Record<string, VehicleIconId> } };
          break;
        }
        case 'alerts': {
          const alerts = value as AlertsSettings;
          await putAlertas(targetUser, alertsToApi(alerts));
          next = { ...prev, alerts: { ...alerts, speedLimits: prev.alerts.speedLimits } };
          break;
        }
        case 'speedLimits': {
          const speedLimits = value as SpeedLimitSettings;
          // El backend copia los límites a Traccar (para que genere "Exceso de velocidad")
          const res = await putLimitesVelocidad(targetUser, speedLimitsToApi(speedLimits));
          notifyTraccarSync(res?.traccarSync);
          next = { ...prev, alerts: { ...prev.alerts, speedLimits } };
          break;
        }
        case 'preferences': {
          const preferences = value as PreferenceSettings;
          await putPreferencias(targetUser, preferencesToApi(preferences));
          next = { ...prev, preferences };
          break;
        }
        default:
          return;
      }

      writeCache(targetUser, next);
      setSettings(next);
      // Notificar al resto de la app (mapa, alertas) que cambió la configuración
      const changed: keyof UserSettings =
        key === 'speedLimits' ? 'alerts' : (key as keyof UserSettings);
      emitSettingsUpdated(changed, next[changed]);
    },
    [user],
  );

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    // TODO(API): POST /api/usuarios/{user}/cambiar-password
    await new Promise((r) => setTimeout(r, 600));
    if (!currentPassword || !newPassword) {
      throw new Error('Datos incompletos');
    }
    return true;
  }, []);

  return { user, settings, syncStatus, reload, saveSection, changePassword };
}

/**
 * Lee la configuración efectiva de un tipo de alerta (caché de la configuración de la cuenta).
 * Aplica automáticamente el Horario de Silencio ("No molestar") si está activo.
 */
export function getAlertSoundConfig(type: AlertTypeId) {
  const s = loadSettings(getCurrentUser());
  const item = s.alerts.items.find((i) => i.type === type) || {
    type,
    enabled: false,
    sound: 'none' as const,
    volume: 50,
    popup: true,
    loop: false,
    available: false,
  };
  const isQuietNow = isCurrentlyQuietHours(s.alerts.quietHours);
  return {
    ...item,
    // El aviso en pantalla ya no es configurable: siempre se muestra
    popup: true,
    muteAll: s.alerts.muteAll || isQuietNow,
    isQuietHoursActive: isQuietNow,
    masterVolume: s.alerts.masterVolume,
  };
}

/**
 * Límite de velocidad que dispara la alerta para una unidad: el general, o
 * en modo "por vehículo" el propio de esa placa (si no tiene, el general).
 */
export function getSpeedLimitForUnit(deviceId: string): number {
  const s = loadSettings(getCurrentUser());
  const { speedLimits } = s.alerts;
  const general = speedLimits?.generalLimit ?? 90;
  if (!speedLimits || speedLimits.mode !== 'byUnit') return general;
  // Por vehículo: su límite propio, o el general si no tiene uno
  return speedLimits.byUnit?.[deviceId.toUpperCase()] ?? general;
}

/** Tipo de ícono asignado a una unidad ('auto' por defecto). */
export function getIconTypeForUnit(deviceId: string): VehicleIconId {
  const s = loadSettings(getCurrentUser());
  return s.icons?.byUnit?.[deviceId.toUpperCase()] ?? 'auto';
}
