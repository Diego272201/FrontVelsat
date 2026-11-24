'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';

export function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-4 border-b border-slate-100 pb-3">
      <h3 className="text-[15px] font-bold text-slate-800">{title}</h3>
      {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
    </div>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11.5px] font-semibold text-slate-600">{label}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-[11px] text-red-600">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>
      ) : null}
    </label>
  );
}

export const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#113EB9] focus:ring-2 focus:ring-[#113EB9]/15 disabled:bg-slate-50 disabled:text-slate-400';

export function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        checked ? 'bg-[#113EB9]' : 'bg-slate-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-[18px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

/**
 * Contenedor del pie del panel de Configuración (fuera de la zona con scroll).
 * Si existe, SaveBar se dibuja ahí: así queda siempre abajo del todo, aunque
 * la pestaña tenga poco contenido.
 */
export const SettingsFooterContext = React.createContext<HTMLElement | null>(null);

export function SaveBar({
  dirty,
  saving,
  saved,
  onSave,
  onCancel,
  saveLabel = 'Guardar cambios',
}: {
  dirty: boolean;
  saving: boolean;
  saved?: boolean;
  onSave: () => void;
  onCancel?: () => void;
  saveLabel?: string;
}) {
  const footer = React.useContext(SettingsFooterContext);

  const bar = (
    <div className="flex items-center justify-end gap-2">
      {saved && !dirty && (
        <span className="mr-auto flex items-center gap-1 text-xs font-medium text-emerald-600">
          <Check size={14} /> Cambios guardados
        </span>
      )}
      {dirty && !saving && (
        <span className="mr-auto text-xs text-amber-600">Tienes cambios sin guardar</span>
      )}
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          disabled={!dirty || saving}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
        >
          Descartar
        </button>
      )}
      <button
        type="button"
        onClick={onSave}
        disabled={!dirty || saving}
        className="flex items-center gap-1.5 rounded-lg bg-[#113EB9] px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#0d32a0] disabled:opacity-40"
      >
        {saving && <Loader2 size={13} className="animate-spin" />}
        {saveLabel}
      </button>
    </div>
  );

  if (footer) return createPortal(bar, footer);

  // Sin panel (uso suelto): barra al final del contenido
  return <div className="mt-6 border-t border-slate-200 pt-3">{bar}</div>;
}

/** Hook genérico de borrador para cada sección (estado local + dirty + guardar). */
export function useDraft<T>(initial: T, onSave: (v: T) => Promise<void>) {
  const [draft, setDraft] = React.useState<T>(initial);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    setDraft(initial);
  }, [initial]);

  const dirty = React.useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(initial),
    [draft, initial],
  );

  const save = async () => {
    setSaving(true);
    try {
      await onSave(draft);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      // Los cambios quedan en pantalla (sin guardar) para volver a intentarlo
      console.error('[Configuración] No se pudo guardar:', err);
      toast.error('No se pudieron guardar los cambios', {
        description:
          err instanceof Error && err.message
            ? `El servidor respondió: ${err.message}`
            : 'Revisa tu conexión e inténtalo de nuevo.',
      });
    } finally {
      setSaving(false);
    }
  };

  const reset = () => setDraft(initial);

  return { draft, setDraft, dirty, saving, saved, save, reset };
}
