// Reproductor de sonidos de alertas.
// - 'classic' usa el audio original de exceso de velocidad (/alert.mp3),
//   embebido en base64 para funcionar siempre sin depender de la red ni del dev server.
// - El resto de sonidos se sintetizan con Web Audio API.
import type { SoundId } from './types';
import { CLASSIC_ALERT_BASE64 } from './classicAlertBase64';

let ctx: AudioContext | null = null;
let classicAudioBuffer: AudioBuffer | null = null;
let isDecodingClassic = false;
const activeAudioElements: HTMLAudioElement[] = [];

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') {
    void ctx.resume();
  }
  return ctx;
}

function base64ToArrayBuffer(base64DataUri: string): ArrayBuffer {
  const base64 = base64DataUri.includes(',')
    ? base64DataUri.split(',')[1]
    : base64DataUri;
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function ensureClassicDecoded(): Promise<AudioBuffer | null> {
  if (classicAudioBuffer) return Promise.resolve(classicAudioBuffer);
  if (typeof window === 'undefined') return Promise.resolve(null);
  const ac = getCtx();
  if (!ac) return Promise.resolve(null);
  if (isDecodingClassic) return Promise.resolve(null);
  isDecodingClassic = true;

  try {
    const arrayBuffer = base64ToArrayBuffer(CLASSIC_ALERT_BASE64);
    // Clonar el buffer porque decodeAudioData puede desacoplarlo (detach)
    return ac
      .decodeAudioData(arrayBuffer.slice(0))
      .then((decoded) => {
        classicAudioBuffer = decoded;
        return decoded;
      })
      .catch((err) => {
        console.warn('Fallo decodificando audio clásico en WebAudio:', err);
        return null;
      })
      .finally(() => {
        isDecodingClassic = false;
      });
  } catch (err) {
    isDecodingClassic = false;
    console.warn('Error al convertir base64 a ArrayBuffer:', err);
    return Promise.resolve(null);
  }
}

// Iniciar pre-decodificación en el cliente en cuanto haya cualquier interacción
if (typeof window !== 'undefined') {
  const triggerPredecode = () => {
    const ac = getCtx();
    if (ac) void ensureClassicDecoded();
  };
  window.addEventListener('click', triggerPredecode, { once: true, passive: true });
  window.addEventListener('keydown', triggerPredecode, { once: true, passive: true });
}

type Note = { freq: number; start: number; dur: number; type?: OscillatorType; slideTo?: number };
type SynthSound = Exclude<SoundId, 'none' | 'classic'>;

const PATTERNS: Record<SynthSound, Note[]> = {
  beep: [{ freq: 880, start: 0, dur: 0.15, type: 'square' }],
  ding: [{ freq: 1320, start: 0, dur: 0.6, type: 'sine' }],
  chime: [
    { freq: 784, start: 0, dur: 0.35, type: 'sine' },
    { freq: 1047, start: 0.18, dur: 0.5, type: 'sine' },
  ],
  pulse: [
    { freq: 660, start: 0, dur: 0.1, type: 'triangle' },
    { freq: 660, start: 0.18, dur: 0.1, type: 'triangle' },
    { freq: 660, start: 0.36, dur: 0.1, type: 'triangle' },
  ],
  alarm: [
    { freq: 950, start: 0, dur: 0.18, type: 'sawtooth' },
    { freq: 700, start: 0.2, dur: 0.18, type: 'sawtooth' },
    { freq: 950, start: 0.4, dur: 0.18, type: 'sawtooth' },
    { freq: 700, start: 0.6, dur: 0.18, type: 'sawtooth' },
  ],
  siren: [
    { freq: 600, start: 0, dur: 0.6, type: 'sine', slideTo: 1200 },
    { freq: 1200, start: 0.6, dur: 0.6, type: 'sine', slideTo: 600 },
  ],
};

function effectiveVolume(volume: number, master: number) {
  return Math.max(0, Math.min(1, (volume / 100) * (master / 100)));
}

function playPattern(sound: SynthSound, vol: number) {
  const ac = getCtx();
  if (!ac || vol <= 0) return;
  const gainValue = vol * 0.35;
  const now = ac.currentTime;
  for (const n of PATTERNS[sound]) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = n.type ?? 'sine';
    osc.frequency.setValueAtTime(n.freq, now + n.start);
    if (n.slideTo) osc.frequency.linearRampToValueAtTime(n.slideTo, now + n.start + n.dur);
    gain.gain.setValueAtTime(0, now + n.start);
    gain.gain.linearRampToValueAtTime(gainValue, now + n.start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + n.start + n.dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(now + n.start);
    osc.stop(now + n.start + n.dur + 0.05);
  }
}

function patternLength(sound: SynthSound) {
  return Math.max(...PATTERNS[sound].map((n) => n.start + n.dur));
}

export interface SoundHandle {
  stop: () => void;
}

const NOOP: SoundHandle = { stop: () => {} };

/**
 * Inicia un sonido. Si `loop` es true se repite hasta llamar a `handle.stop()`.
 * @param volume 0-100 (volumen del tipo de alerta)
 * @param master 0-100 (volumen general)
 */
export function startSound(sound: SoundId, volume = 80, master = 100, loop = false): SoundHandle {
  if (typeof window === 'undefined' || sound === 'none') return NOOP;
  const vol = effectiveVolume(volume, master);
  if (vol <= 0) return NOOP;

  const ac = getCtx();

  if (sound === 'classic') {
    // Método 1: Si ya tenemos el AudioBuffer en Web Audio, reproducir mediante Web Audio
    // (exactamente el mismo motor que funciona para los otros sonidos)
    if (ac && classicAudioBuffer) {
      const source = ac.createBufferSource();
      source.buffer = classicAudioBuffer;
      source.loop = loop;
      const gain = ac.createGain();
      gain.gain.setValueAtTime(vol, ac.currentTime);
      source.connect(gain).connect(ac.destination);
      source.start();

      let isStopped = false;
      return {
        stop: () => {
          if (isStopped) return;
          isStopped = true;
          try {
            source.stop();
            source.disconnect();
          } catch {}
        },
      };
    }

    // Método 2: Si aún no se decodificó en Web Audio, reproducir vía HTML5 Audio
    // con el Data URI embebido (sin red) y pedir decodificación en segundo plano.
    void ensureClassicDecoded();

    try {
      const audio = new Audio(CLASSIC_ALERT_BASE64);
      audio.volume = vol;
      audio.loop = loop;
      audio.currentTime = 0;

      activeAudioElements.push(audio);
      const cleanup = () => {
        const i = activeAudioElements.indexOf(audio);
        if (i !== -1) activeAudioElements.splice(i, 1);
      };
      audio.onended = cleanup;
      audio.onerror = cleanup;

      audio.play().catch((err) => {
        console.error('Error al reproducir audio clásico:', err);
        cleanup();
      });

      return {
        stop: () => {
          try {
            audio.pause();
            audio.currentTime = 0;
          } catch {}
          cleanup();
        },
      };
    } catch (e) {
      console.error('Error instanciando Audio clásico:', e);
      return NOOP;
    }
  }

  playPattern(sound, vol);
  if (!loop) return NOOP;

  const interval = setInterval(() => playPattern(sound, vol), (patternLength(sound) + 0.6) * 1000);
  return { stop: () => clearInterval(interval) };
}

// Control del preview en la interfaz
let previewHandle: SoundHandle | null = null;
let previewTimer: ReturnType<typeof setTimeout> | null = null;

/** Reproduce una vez un sonido como vista previa (corta el preview anterior). */
export function playSound(sound: SoundId, volume = 80, master = 100) {
  previewHandle?.stop();
  if (previewTimer) clearTimeout(previewTimer);

  // Asegurar que AudioContext esté activo
  const ac = getCtx();
  if (ac && ac.state === 'suspended') {
    void ac.resume();
  }

  previewHandle = startSound(sound, volume, master, false);
  previewTimer = setTimeout(() => {
    previewHandle?.stop();
    previewHandle = null;
  }, 4000);
}
