'use client';

import React from 'react';
import type { AccountSettings } from '../types';
import { Field, SaveBar, SectionHeader, inputClass, useDraft } from '../ui';

interface Props {
  value: AccountSettings;
  onSave: (v: AccountSettings) => Promise<void>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Largos máximos del backend (ConfiguracionController.UpdatePerfil)
const MAX_DISPLAY_NAME = 40;
const MAX_PHONE = 32;
const MAX_EMAIL = 200;

export default function AccountSection({ value, onSave }: Props) {
  const { draft, setDraft, dirty, saving, saved, save, reset } = useDraft(value, onSave);

  const errors = {
    email: !draft.email.trim()
      ? undefined
      : draft.email.length > MAX_EMAIL
        ? `Máximo ${MAX_EMAIL} caracteres`
        : !EMAIL_RE.test(draft.email.trim())
          ? 'Correo no válido'
          : undefined,
    displayName: !draft.displayName.trim()
      ? 'Requerido'
      : draft.displayName.length > MAX_DISPLAY_NAME
        ? `Máximo ${MAX_DISPLAY_NAME} caracteres`
        : undefined,
    phone: draft.phone.length > MAX_PHONE ? `Máximo ${MAX_PHONE} caracteres` : undefined,
  };
  const hasErrors = Object.values(errors).some(Boolean);

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
        <Field label="Nombre de usuario" hint="Se usa para iniciar sesión y no se puede cambiar">
          <input className={inputClass} value={draft.username} disabled autoComplete="username" />
        </Field>
        <Field label="Nombre a mostrar" error={errors.displayName}>
          <input
            className={inputClass}
            value={draft.displayName}
            onChange={(e) => set('displayName', e.target.value)}
          />
        </Field>
        <Field
          label="Correo electrónico"
          error={errors.email}
          hint="A este correo te enviamos el enlace para cambiar tu contraseña"
        >
          <input
            type="email"
            className={inputClass}
            value={draft.email}
            onChange={(e) => set('email', e.target.value)}
          />
        </Field>
        <Field label="Teléfono / WhatsApp" error={errors.phone} hint="Ej: +51 987 654 321">
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
