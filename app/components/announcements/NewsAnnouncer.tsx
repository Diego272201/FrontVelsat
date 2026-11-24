'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { Bell, CarFront, ChevronLeft, ChevronRight, CircleGauge, Gauge, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { plexSans } from '@/app/components/settings/fonts';
import { getCurrentUser, loadSettings } from '@/app/components/settings/useUserSettings';
import type { SettingsSectionId } from '@/app/components/settings/types';
import TrackvelAvatar from './TrackvelAvatar';
import { getActiveAnnouncements, type AnnouncementIcon } from './announcements';

const ICONS: Record<AnnouncementIcon, React.ElementType> = {
  car: CarFront,
  gauge: CircleGauge,
  bell: Bell,
  route: Gauge,
  sliders: SlidersHorizontal,
  sparkles: Sparkles,
};

/** Al entrar, la tarjeta se recoge sola en el botón pasado este tiempo */
const AUTO_CLOSE_SECONDS = 13;

/** Separación del botón respecto al borde y al visor de cámara fija */
const EDGE = 20;
const GAP_OVER_CAMERA = 12;

interface Props {
  /** Abre la Configuración del sistema (lo maneja el menú de usuario) */
  onOpenSettings: (section: SettingsSectionId) => void;
  /** No abrir la tarjeta sola mientras la Configuración está abierta */
  settingsOpen: boolean;
}

type Mode = 'hidden' | 'card' | 'launcher';

/**
 * Una sola instancia por página. El menú de usuario se monta dos veces en la barra
 * (versión móvil oculta por CSS + versión de escritorio) y, como el asistente se
 * dibuja en <body>, se veían dos: al cerrar una, la otra seguía en pantalla.
 * La primera instancia que se monta es la dueña; si se desmonta, otra toma el relevo.
 */
let ownerId: number | null = null;
let nextId = 1;
const ownerListeners = new Set<() => void>();
const notifyOwners = () => ownerListeners.forEach((fn) => fn());

function useIsAnnouncerOwner(): boolean {
  const idRef = useRef(0);
  if (idRef.current === 0) idRef.current = nextId++;
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    const id = idRef.current;
    const sync = () => {
      if (ownerId === null) ownerId = id;
      setIsOwner(ownerId === id);
    };
    ownerListeners.add(sync);
    sync();
    return () => {
      ownerListeners.delete(sync);
      if (ownerId === id) {
        ownerId = null;
        notifyOwners();
      }
    };
  }, []);

  return isOwner;
}

/**
 * Asistente de novedades.
 * - Cada vez que el usuario entra al mapa aparece la tarjeta con el avatar, de inmediato.
 * - Al cerrarla (X, "Cerrar", Esc o "Muéstrame") queda un botón redondo con el
 *   avatar abajo a la derecha para volver a abrirla cuando quiera.
 */
export default function NewsAnnouncer({ onOpenSettings, settingsOpen }: Props) {
  const isOwner = useIsAnnouncerOwner();
  // Solo las novedades que no han vencido (se evalúa al entrar a la página)
  const [announcements] = useState(() => getActiveAnnouncements());
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<Mode>('hidden');
  /** true = apareció sola al entrar: se recoge a los 13 s (si la abre el usuario, no) */
  const [autoClose, setAutoClose] = useState(false);
  const [index, setIndex] = useState(0);
  const [name, setName] = useState('');
  const [launcherBottom, setLauncherBottom] = useState(EDGE);
  const settingsOpenRef = useRef(settingsOpen);
  settingsOpenRef.current = settingsOpen;

  useEffect(() => setMounted(true), []);

  // Al entrar: la tarjeta aparece de inmediato, junto con el mapa
  // (si la Configuración ya estuviera abierta, queda solo el botón)
  useEffect(() => {
    if (!isOwner || announcements.length === 0) return;
    setIndex(0);
    setAutoClose(true);
    setMode(settingsOpenRef.current ? 'launcher' : 'card');
  }, [isOwner, announcements.length]);

  // Si se abre la Configuración por otro lado, la tarjeta se recoge
  useEffect(() => {
    if (settingsOpen) setMode((m) => (m === 'card' ? 'launcher' : m));
  }, [settingsOpen]);

  // Nombre para el saludo
  useEffect(() => {
    if (mode !== 'card') return;
    const u = getCurrentUser();
    let display = '';
    try {
      display = loadSettings(u).account?.displayName || '';
    } catch {
      display = '';
    }
    setName(display || u);
  }, [mode]);

  // El botón se sube sobre el visor de cámara fija (abajo a la derecha). El visor
  // avisa al instante al abrirse, cambiar de tamaño o cerrarse.
  useEffect(() => {
    const place = (top: number | null) =>
      setLauncherBottom(top == null ? EDGE : Math.round(window.innerHeight - top) + GAP_OVER_CAMERA);
    // Por si el visor ya estaba abierto al montar
    const cam = document.querySelector('aside[aria-label="Cámara fija de unidad"]');
    place(cam ? cam.getBoundingClientRect().top : null);
    const onViewer = (e: Event) => {
      const detail = (e as CustomEvent<{ top: number } | null>).detail;
      place(detail ? detail.top : null);
      // Si se abre el visor con la tarjeta a la vista, la tarjeta se recoge en el
      // botón (que queda sobre el visor) para no taparlo
      if (detail) setMode((m) => (m === 'card' ? 'launcher' : m));
    };
    window.addEventListener('trackvel:camera-viewer', onViewer);
    return () => window.removeEventListener('trackvel:camera-viewer', onViewer);
  }, []);

  const collapse = useCallback(() => setMode('launcher'), []);

  const current = announcements[index];

  const showMe = useCallback(() => {
    setMode('launcher');
    onOpenSettings(current?.cta.openSettings ?? 'cuenta');
  }, [current, onOpenSettings]);

  // Esc = cerrar la tarjeta
  useEffect(() => {
    if (mode !== 'card') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') collapse();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, collapse]);

  if (!isOwner || !mounted || mode === 'hidden' || !current) return null;

  // ---------- Botón para volver a abrir ----------
  if (mode === 'launcher') {
    return createPortal(
      <button
        type="button"
        onClick={() => {
          setIndex(0);
          setAutoClose(false);
          setMode('card');
        }}
        title="Novedades de Trackvel"
        aria-label="Abrir novedades de Trackvel"
        className={`${plexSans.className} tva-launcher group fixed right-5 z-[995] flex items-center`}
        style={{ bottom: launcherBottom, transition: 'bottom 0.25s cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        {/* Etiqueta que aparece al pasar el mouse */}
        <span className="pointer-events-none mr-2 translate-x-1 whitespace-nowrap rounded-full bg-[#0f172a] px-2.5 py-1 text-[11.5px] font-semibold text-white opacity-0 shadow transition group-hover:translate-x-0 group-hover:opacity-100">
          Novedades
        </span>
        <span className="relative block h-14 w-14 rounded-full bg-gradient-to-b from-[#EAF1FF] to-[#cfdcfb] shadow-[0_4px_14px_rgba(15,23,42,0.25)] ring-2 ring-white transition group-hover:scale-105">
          <span className="absolute inset-0 overflow-hidden rounded-full">
            {/* Avatar más alejado: se ven cabeza y hombros dentro del círculo */}
            <Image
              src="/avatar.webp"
              alt=""
              width={88}
              height={113}
              sizes="88px"
              className="absolute left-[-15px] top-[3px] h-[113px] w-[88px] max-w-none"
            />
          </span>
          <span className="tva-ping absolute -right-0.5 -top-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#FB7B0F] text-white ring-2 ring-white">
            <Bell size={10} strokeWidth={2.8} />
          </span>
        </span>

        <style>{`
          .tva-launcher { animation: tva-pop 0.35s cubic-bezier(0.16, 1, 0.3, 1); }
          .tva-ping::after {
            content: ''; position: absolute; inset: 0; border-radius: 9999px;
            background: #FB7B0F; animation: tva-ping 1.8s ease-out 3; z-index: -1;
          }
          @keyframes tva-pop { from { opacity: 0; transform: scale(0.6); } to { opacity: 1; transform: none; } }
          @keyframes tva-ping { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(2.4); opacity: 0; } }
          @media (prefers-reduced-motion: reduce) {
            .tva-launcher, .tva-ping::after { animation: none; }
          }
        `}</style>
      </button>,
      document.body,
    );
  }

  // ---------- Tarjeta con el avatar ----------
  const total = announcements.length;

  return createPortal(
    <div
      role="dialog"
      aria-label="Novedades de Trackvel"
      className={`${plexSans.className} tva-enter fixed bottom-0 right-5 z-[995] flex max-w-[calc(100vw-24px)] items-end gap-6`}
    >
      {/* El avatar sale desde el borde inferior de la pantalla */}
      <div className="hidden shrink-0 sm:block">
        <TrackvelAvatar height={170} />
      </div>

      {/* Tarjeta a 15 px del borde inferior, con las 4 esquinas redondeadas */}
      <div className="tva-card relative mb-[15px] w-[340px] max-w-full overflow-hidden rounded-[12px] border border-[#e2e8f0] bg-white text-[#0f172a] shadow-[0_4px_10px_rgba(15,23,42,0.08),0_18px_40px_rgba(15,23,42,0.18)]">
        {/* Cuenta regresiva: la barra se vacía en 13 s y la tarjeta se recoge sola.
            Se pausa mientras el mouse está encima, para poder leer con calma. */}
        {autoClose && (
          <div
            className="tva-timer absolute inset-x-0 bottom-0 h-[3px] bg-[#113EB9]"
            style={{ animationDuration: `${AUTO_CLOSE_SECONDS}s` }}
            onAnimationEnd={collapse}
            aria-hidden
          />
        )}
        <button
          type="button"
          onClick={collapse}
          title="Cerrar"
          className="absolute right-2 top-2.5 flex h-7 w-7 items-center justify-center rounded-[6px] text-[#94a3b8] transition hover:bg-[#f1f5f9] hover:text-[#0f172a]"
        >
          <X size={15} />
        </button>

        <div className="px-4 pb-3.5 pt-3">
          <div className="mb-1.5 flex items-center gap-2 pr-7">
            <span className="rounded-full bg-[#FFF1E6] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[.06em] text-[#C2570A]">
              Nuevo
            </span>
            <span className="text-[11px] font-medium text-[#94a3b8]">{current.date}</span>
          </div>

          <p className="text-[13px] font-semibold text-[#334155]">
            ¡Hola{name ? `, ${name}` : ''}!
          </p>
          <h3 className="mt-0.5 text-[16px] font-bold leading-tight text-[#0f172a]">{current.title}</h3>
          <p className="mt-1.5 text-[12.5px] text-[#475569]">{current.intro}</p>

          <ul className="mt-2 space-y-1.5">
            {current.items.map((it) => {
              const Icon = ICONS[it.icon] ?? Sparkles;
              return (
                <li key={it.text} className="flex items-start gap-2 text-[12.5px] leading-snug text-[#1e293b]">
                  <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] bg-[#EEF3FF] text-[#113EB9]">
                    <Icon size={12} strokeWidth={2.4} />
                  </span>
                  {it.text}
                </li>
              );
            })}
          </ul>

          {current.whereToFind && (
            <p className="mt-2.5 rounded-[6px] bg-[#f8fafc] px-2.5 py-1.5 text-[11.5px] text-[#64748b]">
              {current.whereToFind}
            </p>
          )}

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={showMe}
              className="h-[34px] rounded-[6px] bg-[#113EB9] px-4 text-[12.5px] font-semibold text-white transition hover:bg-[#0d3196]"
            >
              {current.cta.label}
            </button>
            <button
              type="button"
              onClick={collapse}
              className="h-[34px] rounded-[6px] border border-[#cbd5e1] bg-white px-3.5 text-[12.5px] font-semibold text-[#475569] transition hover:bg-[#f1f5f9]"
            >
              Cerrar
            </button>

            {total > 1 && (
              <div className="ml-auto flex items-center gap-0.5 text-[11px] font-semibold text-[#64748b]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => setIndex((i) => i - 1)}
                  title="Más reciente"
                  className="flex h-6 w-6 items-center justify-center rounded-[5px] hover:bg-[#f1f5f9] disabled:opacity-30"
                >
                  <ChevronLeft size={14} />
                </button>
                {index + 1}/{total}
                <button
                  type="button"
                  disabled={index === total - 1}
                  onClick={() => setIndex((i) => i + 1)}
                  title="Anterior"
                  className="flex h-6 w-6 items-center justify-center rounded-[5px] hover:bg-[#f1f5f9] disabled:opacity-30"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .tva-enter { animation: tva-enter 0.45s cubic-bezier(0.16, 1, 0.3, 1); }
        .tva-timer {
          transform-origin: left center;
          animation-name: tva-timer;
          animation-timing-function: linear;
          animation-fill-mode: forwards;
        }
        .tva-card:hover .tva-timer { animation-play-state: paused; }
        @keyframes tva-timer { from { transform: scaleX(1); } to { transform: scaleX(0); } }
        @keyframes tva-enter {
          from { opacity: 0; transform: translateY(16px) scale(0.98); }
          to { opacity: 1; transform: none; }
        }
        @media (prefers-reduced-motion: reduce) { .tva-enter { animation: none; } }
      `}</style>
    </div>,
    document.body,
  );
}
