'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { AccountSettings } from '../types';
import { Field, SaveBar, SectionHeader, inputClass, useDraft } from '../ui';

interface Props {
  value: AccountSettings;
  onSave: (v: AccountSettings) => Promise<void>;
}

const USERNAME_RE = /^[a-z0-9._-]{3,30}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AccountSection({ value, onSave }: Props) {
  const { draft, setDraft, dirty, saving, saved, save, reset } = useDraft(value, onSave);

  const errors = {
    username: !USERNAME_RE.test(draft.username)
      ? 'De 3 a 30 caracteres: minúsculas, números, punto, guion o guion bajo'
      : undefined,
    email: draft.email && !EMAIL_RE.test(draft.email) ? 'Correo no válido' : undefined,
    displayName: !draft.displayName.trim() ? 'Requerido' : undefined,
  };
  const hasErrors = Object.values(errors).some(Boolean);
  const usernameChanged = draft.username !== value.username;

  const set = <K extends keyof AccountSettings>(k: K, v: AccountSettings[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  return (
    <div>
      <SectionHeader title="Mi cuenta" description="Datos de tu usuario y contacto" />

      <div className="mb-5 flex items-center gap-3 rounded-xl bg-gradient-to-r from-[#113EB9] to-blue-500 p-4 text-white">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-lg font-bold">
          {(draft.displayName || draft.username || '?').slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{draft.displayName || '—'}</p>
          <p className="truncate text-xs text-white/80">@{draft.username}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Nombre de usuario" error={errors.username} hint="Se usa para iniciar sesión">
          <input
            className={inputClass}
            value={draft.username}
            onChange={(e) => set('username', e.target.value.toLowerCase().trim())}
            autoComplete="username"
          />
        </Field>
        <Field label="Nombre a mostrar" error={errors.displayName}>
          <input
            className={inputClass}
            value={draft.displayName}
            onChange={(e) => set('displayName', e.target.value)}
          />
        </Field>
        <Field label="Correo electrónico" error={errors.email} hint="Para recuperación y reportes">
          <input
            type="email"
            className={inputClass}
            value={draft.email}
            onChange={(e) => set('email', e.target.value)}
          />
        </Field>
        <Field label="Teléfono / WhatsApp" hint="Ej: +51 987 654 321">
          <input
            className={inputClass}
            value={draft.phone}
            onChange={(e) => set('phone', e.target.value)}
          />
        </Field>
        <Field label="Empresa">
          <input className={inputClass} value={draft.company} disabled />
        </Field>
      </div>

      {usernameChanged && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>
            Al cambiar el nombre de usuario deberás <strong>volver a iniciar sesión</strong> con el
            nuevo nombre.
          </span>
        </div>
      )}

      <SaveBar
        dirty={dirty && !hasErrors}
        saving={saving}
        saved={saved}
        onSave={save}
        onCancel={reset}
      />
    </div>
  );
}
