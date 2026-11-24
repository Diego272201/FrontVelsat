'use client';

import React from 'react';
import { Lock } from 'lucide-react';
import type { AccountSettings } from '../types';
import { SaveBar, useDraft } from '../ui';

interface Props {
  value: AccountSettings;
  onSave: (v: AccountSettings) => Promise<void>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Largos máximos del backend (ConfiguracionController.UpdatePerfil)
const MAX_DISPLAY_NAME = 40;
const MAX_PHONE = 32;
const MAX_EMAIL = 200;

/** Código de país que se muestra fijo delante del teléfono */
const PHONE_PREFIX = '+51';

const inputBase =
  'h-9 w-full rounded-[6px] border border-[#cbd5e1] bg-white px-3 text-[13px] text-[#0f172a] outline-none transition placeholder:text-[#94a3b8] focus:border-[#113EB9] focus:ring-2 focus:ring-[#113EB9]/15';
const inputLocked =
  'h-9 w-full rounded-[6px] border border-[#e2e8f0] bg-[#f8fafc] pl-3 pr-9 text-[13px] text-[#64748b] outline-none';

function FieldBlock({
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
    <label className="block min-w-0">
      <span className="mb-1.5 block text-[12.5px] font-semibold text-[#1e293b]">{label}</span>
      {children}
      {error ? (
        <span className="mt-1.5 block text-[11.5px] text-red-600">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-[11.5px] text-[#64748b]">{hint}</span>
      ) : null}
    </label>
  );
}

function LockedInput({ value }: { value: string }) {
  return (
    <div className="relative">
      <input className={inputLocked} value={value} disabled />
      <Lock size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
    </div>
  );
}

/** Bloque con título y descripción a la izquierda, y sus campos a la derecha */
function Group({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="grid grid-cols-1 gap-4 py-6 md:grid-cols-[200px_minmax(0,1fr)] md:gap-6">
      <div>
        <h3 className="text-[13.5px] font-bold text-[#0f172a]">{title}</h3>
        <p className="mt-1 max-w-[180px] text-[12px] leading-[1.45] text-[#64748b]">{description}</p>
      </div>
      <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

/** Teléfono guardado ("+51 987654321") → lo que va en el campo, sin el código fijo */
const phoneLocalPart = (phone: string) => phone.replace(/^\s*\+?51\s?/, '');
/** Teléfono con otro código de país (no +51): se edita tal cual, sin prefijo fijo */
const hasOtherCountryCode = (phone: string) => /^\+(?!51)/.test(phone.trim());

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

  const otherCode = hasOtherCountryCode(draft.phone);
  const initials = (draft.displayName || draft.username || '?').slice(0, 2).toUpperCase();

  return (
    <div>
      {/* Tarjeta del usuario */}
      <div className="flex items-center gap-4 rounded-[10px] border border-[#e2e8f0] bg-white px-4 py-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#EEF3FF] text-[15px] font-bold text-[#113EB9]">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold text-[#0f172a]">{draft.displayName || '—'}</p>
          <p className="truncate text-[12.5px] text-[#64748b]">
            @{draft.username}
            {draft.company ? ` · ${draft.company}` : ''}
          </p>
        </div>
      </div>

      <Group title="Perfil" description="Cómo te identificas dentro del sistema.">
        <FieldBlock label="Nombre de usuario" hint="Se usa para iniciar sesión">
          <LockedInput value={draft.username} />
        </FieldBlock>
        <FieldBlock label="Nombre a mostrar" error={errors.displayName}>
          <input
            className={inputBase}
            value={draft.displayName}
            onChange={(e) => set('displayName', e.target.value)}
          />
        </FieldBlock>
        <FieldBlock label="Empresa">
          <LockedInput value={draft.company} />
        </FieldBlock>
      </Group>

      <div className="border-t border-[#e2e8f0]" />

      <Group title="Contacto" description="Para notificaciones y recuperación de contraseña.">
        <FieldBlock
          label="Correo electrónico"
          error={errors.email}
          hint="Aquí recibirás el enlace para cambiar tu contraseña"
        >
          <input
            type="email"
            className={inputBase}
            value={draft.email}
            placeholder="nombre@empresa.com"
            onChange={(e) => set('email', e.target.value)}
          />
        </FieldBlock>
        <FieldBlock label="Teléfono / WhatsApp" error={errors.phone}>
          {otherCode ? (
            <input
              className={inputBase}
              value={draft.phone}
              onChange={(e) => set('phone', e.target.value)}
            />
          ) : (
            <div className="flex h-9 overflow-hidden rounded-[6px] border border-[#cbd5e1] transition focus-within:border-[#113EB9] focus-within:ring-2 focus-within:ring-[#113EB9]/15">
              <span className="flex items-center border-r border-[#cbd5e1] bg-[#f8fafc] px-3 text-[13px] font-semibold text-[#334155]">
                {PHONE_PREFIX}
              </span>
              <input
                type="tel"
                inputMode="tel"
                className="min-w-0 flex-1 bg-white px-3 text-[13px] text-[#0f172a] outline-none placeholder:text-[#94a3b8]"
                value={phoneLocalPart(draft.phone)}
                placeholder="987 654 321"
                onChange={(e) => {
                  const local = e.target.value;
                  // Se guarda con el código de país delante ("+51 987 654 321")
                  set('phone', local.trim() ? `${PHONE_PREFIX} ${local}` : '');
                }}
              />
            </div>
          )}
        </FieldBlock>
      </Group>

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
