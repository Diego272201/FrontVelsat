'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

export type TrackvelLoaderSpinner = 'ring' | 'dots' | 'bar';

export interface TrackvelLoaderProps {
  /**
   * Variante visual del indicador de carga: 'ring' (por defecto), 'dots' o 'bar'
   */
  spinner?: TrackvelLoaderSpinner;
  /**
   * Porcentaje de carga controlado (0-100). Si no se provee, simula la carga con la fórmula de easing solicitada.
   */
  percent?: number;
  /**
   * Callback invocado una vez terminado el fade-out de salida (400ms).
   */
  onHidden?: () => void;
  /**
   * Clase CSS opcional para extender el contenedor raíz
   */
  className?: string;
}

declare global {
  interface Window {
    trackvelLoader?: {
      hide: () => void;
    };
  }
}

const FONT_LINK_ID = 'trackvel-outfit-font';
const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap';
const FADE_MS = 250;
const STEP_MS = 90;

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');

.tvl-root {
  position: fixed;
  inset: 0;
  z-index: 99999;
  width: 100vw;
  height: 100vh;
  min-height: 100vh;
  overflow: hidden;
  display: grid;
  place-items: center;
  background: radial-gradient(120% 90% at 22% 42%, #FFFFFF 0%, #EFF7FD 42%, #DCEBF8 100%);
  font-family: 'Outfit', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #0E4C86;
  opacity: 1;
  visibility: visible;
  transition: opacity ${FADE_MS}ms ease, visibility ${FADE_MS}ms ease;
  user-select: none;
}

.tvl-root.tvl-leaving {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

/* Capa decorativa de líneas radiales */
.tvl-rays {
  position: absolute;
  left: -18%;
  top: -30%;
  width: 92vw;
  height: 160vh;
  opacity: 0.5;
  pointer-events: none;
  transform-origin: 50% 50%;
  background: repeating-conic-gradient(
    from 0deg at 50% 50%,
    rgba(22, 104, 179, 0.14) 0deg,
    rgba(22, 104, 179, 0) 1.1deg,
    rgba(22, 104, 179, 0) 2.2deg
  );
  -webkit-mask-image: radial-gradient(closest-side, #000 18%, rgba(0, 0, 0, 0.45) 52%, transparent 78%);
  mask-image: radial-gradient(closest-side, #000 18%, rgba(0, 0, 0, 0.45) 52%, transparent 78%);
  animation: tvl-drift 90s linear infinite;
}

@keyframes tvl-drift {
  0% {
    transform: rotate(0deg) scale(1);
  }
  50% {
    transform: rotate(180deg) scale(1.06);
  }
  100% {
    transform: rotate(360deg) scale(1);
  }
}

/* Mancha orgánica suave */
.tvl-blob {
  position: absolute;
  left: 14%;
  top: 36%;
  width: 22vw;
  height: 22vw;
  border-radius: 60% 40% 55% 45% / 55% 55% 45% 45%;
  filter: blur(2px);
  background: radial-gradient(circle at 35% 30%, rgba(22, 104, 179, 0.12), rgba(22, 104, 179, 0.04) 70%, transparent);
  pointer-events: none;
}

/* Bloque central */
.tvl-content {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 34px;
  padding: 24px;
  animation: tvl-fadeInUp 0.7s ease both;
  z-index: 2;
}

@keyframes tvl-fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Fila de logo + textos */
.tvl-brand {
  display: flex;
  align-items: center;
  gap: 18px;
}

.tvl-mark-container {
  position: relative;
  width: 62px;
  height: 62px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
}

.tvl-pulse {
  position: absolute;
  inset: 0;
  border-radius: 18px;
  border: 2px solid rgba(232, 80, 42, 0.38);
  animation: tvl-pulse 2.4s ease-out infinite;
  pointer-events: none;
  z-index: 0;
}

@keyframes tvl-pulse {
  0% {
    transform: scale(0.55);
    opacity: 0.55;
  }
  70% {
    opacity: 0;
  }
  100% {
    transform: scale(1.6);
    opacity: 0;
  }
}

.tvl-mark {
  position: relative;
  width: 62px;
  height: 62px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  background: linear-gradient(160deg, #F4602F 0%, #E8502A 55%, #D9421F 100%);
  box-shadow: 0 10px 26px rgba(216, 66, 31, 0.28);
  z-index: 1;
}

.tvl-words {
  text-align: left;
}

.tvl-wordmark {
  margin: 0;
  font-size: 34px;
  font-weight: 700;
  line-height: 1.1;
  color: #0E4C86;
  letter-spacing: -0.01em;
}

.tvl-wordmark-alt {
  font-weight: 400;
  color: #E8502A;
}

.tvl-tagline {
  margin: 6px 0 0;
  font-size: 14px;
  font-weight: 400;
  letter-spacing: 0.05em;
  color: #3C5F80;
}

/* Spinner variante 'ring' */
.tvl-spinner {
  width: 34px;
  height: 34px;
  border: 3px solid rgba(22, 104, 179, 0.18);
  border-top-color: #1668B3;
  border-radius: 50%;
  animation: tvl-spin 0.85s linear infinite;
}

@keyframes tvl-spin {
  to {
    transform: rotate(360deg);
  }
}

/* Spinner variante 'dots' */
.tvl-dots {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 34px;
}

.tvl-dots span {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #1668B3;
  animation: tvl-dot 1.2s ease-in-out infinite;
}

.tvl-dots span:nth-child(2) {
  animation-delay: 0.15s;
}

.tvl-dots span:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes tvl-dot {
  0%, 100% {
    transform: translateY(0);
    opacity: 0.35;
  }
  50% {
    transform: translateY(-9px);
    opacity: 1;
  }
}

/* Spinner variante 'bar' */
.tvl-bar {
  position: relative;
  width: 220px;
  height: 4px;
  border-radius: 99px;
  background: rgba(22, 104, 179, 0.16);
  overflow: hidden;
  margin: 15px 0;
}

.tvl-bar-fill {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 32%;
  border-radius: 99px;
  background: linear-gradient(90deg, #1F7AC8, #0E4C86);
  animation: tvl-bar-slide 1.4s cubic-bezier(0.5, 0.05, 0.45, 0.95) infinite;
}

@keyframes tvl-bar-slide {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(320%);
  }
}

/* Estado de porcentaje */
.tvl-status {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #345677;
}

/* Footer fijo */
.tvl-footer {
  position: absolute;
  bottom: 30px;
  left: 0;
  right: 0;
  margin: 0;
  text-align: center;
  font-size: 12px;
  letter-spacing: 0.08em;
  color: #345677;
  z-index: 2;
}

@media (max-width: 480px) {
  .tvl-brand {
    gap: 14px;
  }
  .tvl-mark-container {
    width: 54px;
    height: 54px;
  }
  .tvl-mark {
    width: 54px;
    height: 54px;
    border-radius: 16px;
  }
  .tvl-pulse {
    border-radius: 16px;
  }
  .tvl-wordmark {
    font-size: 26px;
  }
  .tvl-tagline {
    font-size: 12px;
  }
  .tvl-blob {
    width: 46vw;
    height: 46vw;
  }
  .tvl-content {
    gap: 28px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .tvl-rays,
  .tvl-pulse,
  .tvl-content {
    animation: none;
  }
}
`;

export default function TrackvelLoader({
  spinner = 'ring',
  percent: controlledPercent,
  onHidden,
  className = '',
}: TrackvelLoaderProps) {
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [simulatedPercent, setSimulatedPercent] = useState(0);

  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onHiddenRef = useRef(onHidden);
  onHiddenRef.current = onHidden;

  const activePercent =
    typeof controlledPercent === 'number' ? Math.round(controlledPercent) : simulatedPercent;

  // Carga de la fuente Outfit de Google Fonts
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (document.getElementById(FONT_LINK_ID)) return;

    const link = document.createElement('link');
    link.id = FONT_LINK_ID;
    link.rel = 'stylesheet';
    link.href = FONT_HREF;
    document.head.appendChild(link);
  }, []);

  // Función para ocultar con fade-out rápido (250ms) y remover del DOM
  const hide = useCallback(() => {
    if (hideTimerRef.current) return;
    setSimulatedPercent(100);
    setLeaving(true);
    hideTimerRef.current = setTimeout(() => {
      setVisible(false);
      onHiddenRef.current?.();
    }, FADE_MS);
  }, []);

  // Exponer window.trackvelLoader.hide()
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.trackvelLoader = { hide };
    return () => {
      if (window.trackvelLoader?.hide === hide) {
        delete window.trackvelLoader;
      }
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, [hide]);

  // Simulación de carga automática cada 260ms con easing
  useEffect(() => {
    if (!visible || typeof controlledPercent === 'number') return;

    const interval = setInterval(() => {
      setSimulatedPercent((curr) => {
        if (curr > 99) return 8;
        const step = Math.max(1, Math.round((100 - curr) / 9));
        return Math.min(100, curr + step);
      });
    }, STEP_MS);

    return () => clearInterval(interval);
  }, [visible, controlledPercent]);

  if (!visible) return null;

  return (
    <div
      className={`tvl-root ${leaving ? 'tvl-leaving' : ''} ${className}`.trim()}
      data-spinner={spinner}
      role="status"
      aria-live="polite"
      aria-label="Cargando TRACKVEL SYSTEM"
    >
      {/* dangerouslySetInnerHTML: como hijo de texto, React escapa las comillas del CSS en SSR y lo invalida */}
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* Capa decorativa de líneas radiales */}
      <div className="tvl-rays" aria-hidden="true" />

      {/* Mancha orgánica suave */}
      <div className="tvl-blob" aria-hidden="true" />

      {/* Bloque central */}
      <div className="tvl-content">
        <div className="tvl-brand">
          <div className="tvl-mark-container">
            <span className="tvl-pulse" aria-hidden="true" />
            <div className="tvl-mark">
              <svg width="30" height="34" viewBox="0 0 30 34" fill="none" aria-hidden="true">
                <path
                  d="M15 2.6c-5.3 0-9.6 4.2-9.6 9.4 0 3.9 2.6 7.2 6.2 8.6l2.3 8.4c.3 1.1 1.9 1.1 2.2 0l2.3-8.4c3.6-1.4 6.2-4.7 6.2-8.6 0-5.2-4.3-9.4-9.6-9.4Z"
                  fill="#FFFFFF"
                />
                <circle cx="15" cy="11.8" r="3.5" fill="#E8502A" />
              </svg>
            </div>
          </div>

          <div className="tvl-words">
            <p className="tvl-wordmark">
              TRACKVEL <span className="tvl-wordmark-alt">SYSTEM</span>
            </p>
            <p className="tvl-tagline">Plataforma de rastreo vehicular</p>
          </div>
        </div>

        {/* Variantes de spinner */}
        {spinner === 'ring' && <div className="tvl-spinner" aria-hidden="true" />}

        {spinner === 'dots' && (
          <div className="tvl-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        )}

        {spinner === 'bar' && (
          <div className="tvl-bar" aria-hidden="true">
            <span className="tvl-bar-fill" />
          </div>
        )}

        {/* Porcentaje de estado */}
        <p className="tvl-status" aria-hidden="true">
          CARGANDO {activePercent}%
        </p>
      </div>

      {/* Footer fijo inferior */}
      <p className="tvl-footer">© TRACKVEL SYSTEM</p>
    </div>
  );
}
