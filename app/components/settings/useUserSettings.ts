'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AlertTypeId, UserSettings } from './types';
import { buildDefaultSettings, isCurrentlyQuietHours } from './mockData';

/**
 * Hook de configuración del usuario.
 *
 * Usa localStorage para que los cambios persistan en el navegador.
 * Cuando la API esté lista, reemplazar las funciones de persistencia
 * por llamadas HTTP a los endpoints respectivos.
 */

const storageKey = (user: string) => `trackvel_settings_v3_${user || 'default'}`;
const SIMULATED_DELAY_MS = 600;

export function getCurrentUser(): string {
  if (typeof window === 'undefined') return '';
  return (localStorage.getItem('currentUser') || '').trim();
}

export function loadSettings(user: string): UserSettings {
  const defaults = buildDefaultSettings(user);
  try {
    const raw = localStorage.getItem(storageKey(user));
    if (!raw) return defaults;
    const saved = JSON.parse(raw) as Partial<UserSettings>;
    const savedItems = saved.alerts?.items ?? [];
    return {
      ...defaults,
      ...saved,
      account: { ...defaults.account, ...saved.account },
      alerts: {
        ...defaults.alerts,
        ...saved.alerts,
        speedLimits: {
          ...defaults.alerts.speedLimits,
          ...saved.alerts?.speedLimits,
          byType: {
            ...defaults.alerts.speedLimits.byType,
            ...saved.alerts?.speedLimits?.byType,
          },
        },
        quietHours: {
          ...defaults.alerts.quietHours,
          ...saved.alerts?.quietHours,
        },
        // Merge por tipo de alerta: preserva lo elegido por el usuario
        items: defaults.alerts.items.map((def) => {
          const s = savedItems.find((i) => i.type === def.type);
          return s ? { ...def, ...s, available: def.available } : def;
        }),
      },
      preferences: { ...defaults.preferences, ...saved.preferences },
    };
  } catch {
    return defaults;
  }
}

export function useUserSettings() {
  const [user, setUser] = useState('');
  const [settings, setSettings] = useState<UserSettings | null>(null);

  useEffect(() => {
    const u = getCurrentUser();
    setUser(u);
    setSettings(loadSettings(u));
  }, []);

  const saveSection = useCallback(
    async <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
      // TODO(API): reemplazar por PUT /api/usuarios/{user}/configuracion/{key}
      await new Promise((r) => setTimeout(r, SIMULATED_DELAY_MS));
      const targetUser = getCurrentUser() || user || 'default';
      setSettings((prev) => {
        if (!prev) return prev;
        const next = { ...prev, [key]: value };
        try {
          localStorage.setItem(storageKey(targetUser), JSON.stringify(next));
        } catch {
          /* almacenamiento lleno o bloqueado */
        }
        return next;
      });
      // Notificar al resto de la app (mapa, alertas) que cambió la configuración
      window.dispatchEvent(
        new CustomEvent('trackvel:settings-updated', { detail: { key, value } }),
      );
    },
    [user],
  );

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      // TODO(API): POST /api/usuarios/{user}/cambiar-password
      await new Promise((r) => setTimeout(r, SIMULATED_DELAY_MS));
      if (!currentPassword || !newPassword) {
        throw new Error('Datos incompletos');
      }
      return true;
    },
    [],
  );

  const resetAll = useCallback(() => {
    const targetUser = getCurrentUser() || user || 'default';
    localStorage.removeItem(storageKey(targetUser));
    const defaults = buildDefaultSettings(targetUser);
    setSettings(defaults);
    window.dispatchEvent(
      new CustomEvent('trackvel:settings-updated', {
        detail: { key: 'preferences', value: defaults.preferences },
      }),
    );
  }, [user]);

  return { user, settings, saveSection, changePassword, resetAll };
}

/**
 * Lee la configuración efectiva de un tipo de alerta directamente de localStorage.
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
    muteAll: s.alerts.muteAll || isQuietNow,
    isQuietHoursActive: isQuietNow,
    masterVolume: s.alerts.masterVolume,
  };
}

/**
 * Obtiene el límite de velocidad aplicable a una unidad según su placa o tipo configurado.
 */
export function getSpeedLimitForUnit(deviceId: string): number {
  const s = loadSettings(getCurrentUser());
  const { speedLimits } = s.alerts;
  if (!speedLimits || speedLimits.mode === 'general') {
    return speedLimits?.generalLimit ?? 90;
  }
  const unit = s.icons.find((i) => i.deviceId.toUpperCase() === deviceId.toUpperCase());
  const vehicleType = unit?.icon ?? 'car';
  return speedLimits.byType[vehicleType] ?? speedLimits.generalLimit ?? 90;
}
