'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X,
  User,
  Lock,
  Gauge,
  CircleGauge,
  CarFront,
  Bell,
  SlidersHorizontal,
  Loader2,
  CloudOff,
  RefreshCw,
} from 'lucide-react';
import type { SettingsSectionId } from './types';
import { useUserSettings } from './useUserSettings';
import { SettingsFooterContext } from './ui';
import { SettingsToaster } from './settingsToast';
import { plexSans } from './fonts';
import AccountSection from './sections/AccountSection';
import SecuritySection from './sections/SecuritySection';
import OdometerSection from './sections/OdometerSection';
import UnitIconsSection from './sections/UnitIconsSection';
import AlertsSoundSection from './sections/AlertsSoundSection';
import SpeedLimitsSection from './sections/SpeedLimitsSection';
import PreferencesSection from './sections/PreferencesSection';

const NAV: { id: SettingsSectionId; label: string; icon: React.ElementType }[] = [
  { id: 'cuenta', label: 'Mi cuenta', icon: User },
  { id: 'seguridad', label: 'Seguridad', icon: Lock },
  { id: 'odometro', label: 'Odómetro', icon: Gauge },
  { id: 'iconos', label: 'Íconos', icon: CarFront },
  { id: 'velocidad', label: 'Límites de velocidad', icon: CircleGauge },
  { id: 'alertas', label: 'Alertas y sonidos', icon: Bell },
  { id: 'preferencias', label: 'Preferencias', icon: SlidersHorizontal },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialSection?: SettingsSectionId;
}

export default function SettingsModal({ isOpen, onClose, initialSection = 'cuenta' }: Props) {
  const [section, setSection] = useState<SettingsSectionId>(initialSection);
  const [mounted, setMounted] = useState(false);
  const { settings, syncStatus, reload, saveSection, requestPasswordReset } = useUserSettings();
  const [footerEl, setFooterEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) setSection(initialSection);
  }, [isOpen, initialSection]);

  // Al abrir, traer la configuración vigente de la cuenta desde el servidor
  useEffect(() => {
    if (isOpen) reload();
  }, [isOpen, reload]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!mounted) return null;

  const renderSection = () => {
    // Las pestañas que vienen de la API esperan a que responda el servidor
    // "Mi cuenta" también espera al servidor: así no se ven datos provisionales antes de los reales
    const fromApi = section === 'cuenta' || section === 'iconos' || section === 'velocidad' || section === 'alertas' || section === 'preferencias';
    if (!settings || (fromApi && (syncStatus === 'loading' || syncStatus === 'idle'))) {
      return (
        <div className="flex h-64 items-center justify-center text-slate-400">
          <Loader2 className="animate-spin" size={24} />
        </div>
      );
    }
    switch (section) {
      case 'cuenta':
        return <AccountSection value={settings.account} onSave={(v) => saveSection('account', v)} />;
      case 'seguridad':
        return <SecuritySection onRequestPasswordReset={requestPasswordReset} />;
      case 'odometro':
        // Se lee y ajusta directamente en Traccar, no en la configuración local
        return <OdometerSection />;
      case 'iconos':
        return <UnitIconsSection value={settings.icons} onSave={(v) => saveSection('icons', v)} />;
      // Los límites viven dentro de `alerts`: cada pestaña guarda solo su parte
      case 'velocidad':
        return (
          <SpeedLimitsSection
            value={settings.alerts.speedLimits}
            onSave={(v) => saveSection('speedLimits', v)}
          />
        );
      case 'alertas':
        return (
          <AlertsSoundSection
            value={settings.alerts}
            onSave={(v) => saveSection('alerts', v)}
          />
        );
      case 'preferencias':
        return (
          <PreferencesSection
            value={settings.preferences}
            onSave={(v) => saveSection('preferences', v)}
          />
        );
    }
  };

  return createPortal(
    <>
    {/* Avisos por encima del panel (los de sonner de la página quedarían detrás) */}
    <SettingsToaster />
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10000] overflow-hidden pointer-events-none">
          {/* Backdrop con blur sutil para dejar el mapa visible al fondo */}
          <motion.div
            key="settings-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/25 backdrop-blur-[0.5px] pointer-events-auto"
          />

          {/* Panel deslizante de derecha a izquierda estilo drawer */}
          <motion.div
            key="settings-drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className={`${plexSans.className} fixed inset-y-0 right-0 z-50 flex w-full max-w-[740px] lg:max-w-[820px] xl:max-w-[880px] flex-col bg-white text-[#0f172a] shadow-2xl border-l border-gray-200 overflow-hidden pointer-events-auto`}
          >
            {/* Cabecera: título y cerrar */}
            <div className="flex h-[62px] shrink-0 items-center justify-between border-b border-[#e2e8f0] bg-white pl-6 pr-4">
              <div className="min-w-0">
                <h2 className="text-[16px] font-bold leading-tight text-[#0f172a]">
                  Configuración del sistema
                </h2>
                <p className="mt-0.5 text-[12px] leading-normal text-[#64748b]">
                  Cuenta, unidades, alertas y preferencias
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                title="Cerrar (Esc)"
                className="flex h-8 w-8 items-center justify-center rounded-[6px] text-[#64748b] transition hover:bg-[#f1f5f9] hover:text-[#0f172a]"
              >
                <X size={18} />
              </button>
            </div>

            {/* Pestañas: texto con ícono y subrayado en la activa */}
            <nav
              className="flex shrink-0 items-stretch gap-1 overflow-x-auto border-b border-[#e2e8f0] bg-white px-3.5"
              style={{ scrollbarWidth: 'none' }}
            >
              {NAV.map((n) => {
                const Icon = n.icon;
                const active = section === n.id;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => setSection(n.id)}
                    aria-current={active ? 'page' : undefined}
                    className={`-mb-px flex h-11 shrink-0 items-center gap-1.5 border-b-2 px-2.5 text-[13px] font-semibold transition ${
                      active
                        ? 'border-[#113EB9] text-[#113EB9]'
                        : 'border-transparent text-[#334155] hover:text-[#0f172a]'
                    }`}
                  >
                    <Icon size={15} strokeWidth={2} className={active ? '' : 'text-[#475569]'} />
                    {n.label}
                  </button>
                );
              })}
            </nav>

            {/* Contenido scrolleable de la sección activa */}
            <main className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              {syncStatus === 'offline' && ['iconos', 'velocidad', 'alertas', 'preferencias'].includes(section) && (
                <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11.5px] text-amber-800">
                  <CloudOff size={16} className="shrink-0" />
                  <span className="flex-1">
                    No se pudo conectar con el servidor de configuración. Se muestran los últimos datos
                    guardados en este navegador.
                  </span>
                  <button
                    type="button"
                    onClick={reload}
                    className="flex shrink-0 items-center gap-1 rounded-lg border border-amber-300 bg-white px-2 py-1 font-semibold hover:bg-amber-100"
                  >
                    <RefreshCw size={12} /> Reintentar
                  </button>
                </div>
              )}
              <SettingsFooterContext.Provider value={footerEl}>
                {renderSection()}
              </SettingsFooterContext.Provider>
            </main>

            {/* Pie fijo al fondo del panel: aquí se dibujan Descartar / Guardar cambios.
                Se oculta en pestañas sin botones de guardar (p. ej. Seguridad). */}
            <footer
              ref={setFooterEl}
              className="shrink-0 border-t border-slate-200 bg-white px-5 py-3 empty:hidden sm:px-6"
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </>,
    document.body,
  );
}
