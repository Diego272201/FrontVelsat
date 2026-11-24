'use client';

import { getCurrentUser } from './useUserSettings';

/**
 * Preferencias que solo viven en este navegador (localStorage), por usuario.
 * No van a la API de configuración.
 */
export interface LocalPrefs {
  /** Al abrir el popup de una unidad se cierra el que estaba abierto */
  singlePopup: boolean;
}

const DEFAULTS: LocalPrefs = { singlePopup: false };

const storageKey = () => `trackvel_local_prefs_${getCurrentUser() || 'anon'}`;

export function getLocalPrefs(): LocalPrefs {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const raw = localStorage.getItem(storageKey());
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export function setLocalPref<K extends keyof LocalPrefs>(key: K, value: LocalPrefs[K]) {
  const next = { ...getLocalPrefs(), [key]: value };
  try {
    localStorage.setItem(storageKey(), JSON.stringify(next));
  } catch {
    // Almacenamiento bloqueado (modo privado): se ignora
  }
  window.dispatchEvent(
    new CustomEvent('trackvel:settings-updated', { detail: { key: 'localPrefs', value: next } }),
  );
}

/** Se lee en el momento de abrir un popup: siempre el valor actual */
export const isSinglePopupMode = () => getLocalPrefs().singlePopup;
