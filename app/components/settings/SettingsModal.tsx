'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  X,
  User,
  Lock,
  Gauge,
  Car,
  BellRing,
  SlidersHorizontal,
  Loader2,
} from 'lucide-react';
import type { SettingsSectionId } from './types';
import { useUserSettings } from './useUserSettings';
import AccountSection from './sections/AccountSection';
import SecuritySection from './sections/SecuritySection';
import OdometerSection from './sections/OdometerSection';
import UnitIconsSection from './sections/UnitIconsSection';
import AlertsSoundSection from './sections/AlertsSoundSection';
import PreferencesSection from './sections/PreferencesSection';

const NAV: { id: SettingsSectionId; label: string; icon: React.ElementType }[] = [
  { id: 'cuenta', label: 'Mi cuenta', icon: User },
  { id: 'seguridad', label: 'Seguridad', icon: Lock },
  { id: 'odometro', label: 'Odómetro', icon: Gauge },
  { id: 'iconos', label: 'Íconos', icon: Car },
  { id: 'alertas', label: 'Alertas y sonidos', icon: BellRing },
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
  const { settings, saveSection, changePassword } = useUserSettings();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) setSection(initialSection);
  }, [isOpen, initialSection]);

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
    if (!settings) {
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
        return <SecuritySection onChangePassword={changePassword} />;
      case 'odometro':
        return (
          <OdometerSection value={settings.odometers} onSave={(v) => saveSection('odometers', v)} />
        );
      case 'iconos':
        return <UnitIconsSection value={settings.icons} onSave={(v) => saveSection('icons', v)} />;
      case 'alertas':
        return (
          <AlertsSoundSection value={settings.alerts} onSave={(v) => saveSection('alerts', v)} />
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
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[740px] lg:max-w-[820px] xl:max-w-[880px] flex-col bg-white shadow-2xl border-l border-gray-200 overflow-hidden pointer-events-auto"
          >
            {/* Cabecera estilo drawer con botón regresar y título */}
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 px-4 sm:px-6 bg-white">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  title="Regresar"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition active:scale-95"
                >
                  <ArrowLeft size={20} className="stroke-[2.2]" />
                </button>
                <div>
                  <h2 className="text-[15px] font-bold text-gray-900 leading-tight">
                    Configuración del sistema
                  </h2>
                  <p className="text-[11px] text-gray-500 leading-normal">
                    Personaliza tu cuenta, unidades, alertas y preferencias
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                title="Cerrar (Esc)"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Pestañas de navegación superiores estilo segmented bar */}
            <div
              className="flex shrink-0 items-center gap-1.5 border-b border-gray-200 bg-slate-50/70 px-4 sm:px-6 py-2 overflow-x-auto"
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
                    className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition ${
                      active
                        ? 'bg-[#113EB9] text-white shadow-xs'
                        : 'text-slate-600 hover:bg-white hover:text-slate-900 border border-transparent hover:border-slate-200'
                    }`}
                  >
                    <Icon size={14} />
                    {n.label}
                  </button>
                );
              })}
            </div>

            {/* Contenido scrolleable de la sección activa */}
            <main className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              {renderSection()}
            </main>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
