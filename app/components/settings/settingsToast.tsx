'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { toast as sonnerToast } from 'sonner';

/**
 * Avisos de la pantalla de Configuración.
 *
 * El panel de Configuración se dibuja en un portal con z-index 10000, por encima de todo
 * (incluido el <Toaster> de sonner de cada página, que queda dentro de un contexto de apilado
 * más bajo y se ve DETRÁS del panel). Por eso estos avisos se pintan dentro del propio portal,
 * con un z-index mayor que el del panel. Si no hay un <SettingsToaster> montado, se usa sonner.
 */

type Kind = 'success' | 'error' | 'warning' | 'info';

interface ToastOptions {
  description?: string;
  /** Milisegundos en pantalla (por defecto 4000) */
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: number;
  kind: Kind;
  title: string;
}

const listeners = new Set<(item: ToastItem) => void>();
let seq = 0;

function emit(kind: Kind, title: string, opts: ToastOptions = {}) {
  if (listeners.size === 0) {
    sonnerToast[kind](title, { description: opts.description, duration: opts.duration });
    return;
  }
  const item: ToastItem = { id: ++seq, kind, title, ...opts };
  listeners.forEach((l) => l(item));
}

export const settingsToast = {
  success: (title: string, opts?: ToastOptions) => emit('success', title, opts),
  error: (title: string, opts?: ToastOptions) => emit('error', title, opts),
  warning: (title: string, opts?: ToastOptions) => emit('warning', title, opts),
  info: (title: string, opts?: ToastOptions) => emit('info', title, opts),
};

const STYLES: Record<Kind, { box: string; icon: React.ElementType; iconColor: string }> = {
  success: { box: 'border-emerald-200 bg-emerald-50 text-emerald-900', icon: CheckCircle2, iconColor: 'text-emerald-600' },
  error: { box: 'border-red-200 bg-red-50 text-red-900', icon: XCircle, iconColor: 'text-red-600' },
  warning: { box: 'border-amber-200 bg-amber-50 text-amber-900', icon: AlertTriangle, iconColor: 'text-amber-600' },
  info: { box: 'border-blue-200 bg-blue-50 text-blue-900', icon: Info, iconColor: 'text-blue-600' },
};

export function SettingsToaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const onToast = (item: ToastItem) => {
      setItems((prev) => [...prev, item]);
      setTimeout(
        () => setItems((prev) => prev.filter((i) => i.id !== item.id)),
        item.duration ?? 4000,
      );
    };
    listeners.add(onToast);
    return () => {
      listeners.delete(onToast);
    };
  }, []);

  const dismiss = (id: number) => setItems((prev) => prev.filter((i) => i.id !== id));

  return (
    // Por encima del panel de Configuración (z-[10000]); no bloquea los clics fuera de los avisos
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[10001] flex flex-col items-center gap-2 px-4">
      <AnimatePresence initial={false}>
        {items.map((t) => {
          const { box, icon: Icon, iconColor } = STYLES[t.kind];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              role="status"
              className={`pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border p-3 shadow-lg ${box}`}
            >
              <Icon size={18} className={`mt-0.5 shrink-0 ${iconColor}`} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold leading-snug">{t.title}</p>
                {t.description && <p className="mt-0.5 text-[12px] leading-snug opacity-80">{t.description}</p>}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="shrink-0 rounded p-0.5 opacity-50 transition hover:opacity-100"
                aria-label="Cerrar aviso"
              >
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
