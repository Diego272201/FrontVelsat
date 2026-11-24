'use client';

import { toast } from 'sonner';
import type { SoundId } from './types';
import type { SeveridadAlerta } from './settingsApi';
import { getAlertSoundConfig } from './useUserSettings';
import { isAudioBlocked, startSound, type SoundHandle } from './soundPlayer';

/*
 * Aviso en pantalla + sonido de una alerta, según Configuración > Alertas y sonidos.
 * Lo usan las alertas de SignalR (geocercas y del equipo) y el exceso de velocidad del mapa.
 */

const claimed = new Map<string, number>();
const loopingSounds = new Map<string, SoundHandle>();
let audioHintShown = false;

/**
 * true solo la primera vez que se reclama `key` dentro de `windowMs` (en toda la página).
 * Sirve para no avisar dos veces de la misma alerta: la campana se monta varias veces,
 * el servidor puede repetir el evento y el exceso de velocidad puede llegar por dos vías.
 */
export function claimOnce(key: string, windowMs: number, timeMs: number = Date.now()): boolean {
  const previous = claimed.get(key);
  if (previous !== undefined && Math.abs(timeMs - previous) < windowMs) return false;
  claimed.set(key, timeMs);
  if (claimed.size > 500) {
    const oldest = claimed.keys().next().value;
    if (oldest !== undefined) claimed.delete(oldest);
  }
  return true;
}

export function stopLoopingAlertSound(id: string) {
  loopingSounds.get(id)?.stop();
  loopingSounds.delete(id);
}

export interface NotifyAlertOptions {
  /** Id único del aviso (también evita avisos duplicados en sonner) */
  id: string;
  eventKey: string;
  title: string;
  description?: string;
  severity?: SeveridadAlerta | null;
  /** Sonido que mandó el servidor con la alerta (tiene prioridad sobre la caché local) */
  sound?: SoundId | null;
  volume?: number | null;
  loop?: boolean | null;
  /**
   * El servidor ya filtró la alerta por la configuración de la cuenta: se avisa aunque la
   * caché local todavía no tenga ese tipo agregado.
   */
  trustServer?: boolean;
}

/** Muestra el aviso y reproduce el sonido. Devuelve false si el tipo no está en "Mis notificaciones". */
export function notifyAlert(opts: NotifyAlertOptions): boolean {
  const cfg = getAlertSoundConfig(opts.eventKey);
  if (!cfg.enabled && !opts.trustServer) {
    console.info('[Alertas] Notificación no agregada en Configuración, sin aviso ni sonido:', opts.id);
    return false;
  }

  const sound: SoundId = opts.sound ?? (cfg.enabled ? cfg.sound : 'beep');
  const volume = opts.volume ?? (cfg.enabled ? cfg.volume : 80);
  const loop = Boolean(opts.loop ?? (cfg.enabled ? cfg.loop : false));

  // 1. Aviso en pantalla primero: si el audio fallara, el aviso ya salió
  const toastOptions = {
    id: opts.id,
    description: opts.description,
    duration: opts.severity === 'critical' ? 12000 : 7000,
    ...(loop
      ? {
          duration: Infinity,
          action: { label: 'OK', onClick: () => stopLoopingAlertSound(opts.id) },
          onDismiss: () => stopLoopingAlertSound(opts.id),
        }
      : {}),
  };
  if (opts.eventKey === 'geofenceEnter') toast.success(opts.title, toastOptions);
  else if (opts.eventKey === 'geofenceExit') toast.warning(opts.title, toastOptions);
  else if (opts.severity === 'critical') toast.error(opts.title, toastOptions);
  else if (opts.severity === 'warning') toast.warning(opts.title, toastOptions);
  else toast.info(opts.title, toastOptions);

  // 2. Sonido, protegido para que un error de audio no afecte a nada más
  let soundNote = 'sin sonido (silenciado u horario de silencio)';
  if (!cfg.muteAll && sound !== 'none') {
    try {
      stopLoopingAlertSound(opts.id);
      const handle = startSound(sound, volume, cfg.masterVolume, loop);
      if (loop) loopingSounds.set(opts.id, handle);
      soundNote = `sonido ${sound}${loop ? ' (repite hasta OK)' : ''}`;

      // Sin ningún clic en la página el navegador no deja sonar: se avisa una vez
      if (isAudioBlocked()) {
        soundNote += ' — bloqueado por el navegador hasta un clic';
        if (!audioHintShown) {
          audioHintShown = true;
          toast.info('Haz clic en cualquier parte de la página para activar el sonido de las alertas', {
            id: 'alerts-audio-blocked',
            duration: 10000,
          });
        }
      }
    } catch (err) {
      soundNote = 'error al reproducir sonido';
      console.warn('[Alertas] No se pudo reproducir el sonido:', err);
    }
  }
  console.info(`[Alertas] Aviso mostrado: ${opts.title} · ${soundNote}`);
  return true;
}
