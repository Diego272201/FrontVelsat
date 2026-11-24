'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2, ShieldAlert } from 'lucide-react';
import { Field } from '../components/settings/ui';
import {
  PasswordInput,
  PasswordStrength,
  isPasswordAcceptable,
} from '../components/settings/passwordRules';
import { BACKEND_BY_ORIGEN, resetPassword } from '../components/settings/accountApi';

/**
 * Página pública a la que lleva el enlace del correo de "Cambiar contraseña"
 * (/reset-password?token=...&origen=trackvel|subtrackvel). No requiere sesión:
 * el token del enlace es lo que autoriza el cambio.
 */
function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const origen = params.get('origen') ?? '';
  const linkInvalid = !token || !(origen in BACKEND_BY_ORIGEN);

  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mismatch = confirm.length > 0 && confirm !== next;
  const canSubmit = isPasswordAcceptable(next) && next === confirm && !saving;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      await resetPassword(origen, token, next);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar la contraseña.');
    } finally {
      setSaving(false);
    }
  };

  if (linkInvalid) {
    return (
      <Card>
        <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <ShieldAlert size={18} className="mt-0.5 shrink-0" />
          <span>El enlace no es válido. Solicita uno nuevo desde Configuración &gt; Seguridad.</span>
        </div>
        <BackToLogin />
      </Card>
    );
  }

  if (done) {
    return (
      <Card>
        <div className="flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          <span>Tu contraseña se actualizó correctamente. Ya puedes iniciar sesión con la nueva.</span>
        </div>
        <BackToLogin />
      </Card>
    );
  }

  return (
    <Card>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nueva contraseña">
          <PasswordInput value={next} onChange={setNext} autoComplete="new-password" />
        </Field>

        {next && <PasswordStrength value={next} />}

        <Field
          label="Confirmar nueva contraseña"
          error={mismatch ? 'Las contraseñas no coinciden' : undefined}
        >
          <PasswordInput value={confirm} onChange={setConfirm} autoComplete="new-password" />
        </Field>

        {error && <div className="rounded-lg bg-red-50 p-3 text-xs font-medium text-red-700">{error}</div>}

        <button
          type="submit"
          disabled={!canSubmit}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#113EB9] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0d32a0] disabled:opacity-40"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          Cambiar contraseña
        </button>
      </form>
      <BackToLogin />
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 px-4">
      <div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Cambiar contraseña</h1>
          <p className="mt-0.5 text-xs text-slate-500">Elige una contraseña nueva para tu cuenta</p>
        </div>
        {children}
      </div>
    </div>
  );
}

function BackToLogin() {
  return (
    <p className="text-center text-xs text-slate-500">
      <Link href="/" className="font-semibold text-[#113EB9] hover:underline">
        Ir al inicio de sesión
      </Link>
    </p>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
