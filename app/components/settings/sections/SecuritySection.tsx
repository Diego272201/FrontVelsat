'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, Mail, ShieldCheck } from 'lucide-react';
import { SectionHeader } from '../ui';
import type { SolicitudResetResponse } from '../accountApi';

interface Props {
  onRequestPasswordReset: () => Promise<SolicitudResetResponse>;
}

/** Espera mínima entre solicitudes (el backend rechaza otra antes de 60 s). */
const COOLDOWN_SECONDS = 60;

export default function SecuritySection({ onRequestPasswordReset }: Props) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<SolicitudResetResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const send = async () => {
    setSending(true);
    setError(null);
    try {
      const res = await onRequestPasswordReset();
      setSent(res);
      setCooldown(COOLDOWN_SECONDS);
    } catch (err) {
      setSent(null);
      setError(err instanceof Error ? err.message : 'No se pudo enviar el correo.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <SectionHeader
        title="Seguridad"
        description="Cambia tu contraseña periódicamente para proteger tu cuenta"
      />

      <div className="max-w-md space-y-4">
        <p className="text-[13px] text-slate-600">
          Para cambiar tu contraseña te enviaremos un enlace al correo registrado en tu cuenta. El
          enlace es de un solo uso y vence en 30 minutos.
        </p>

        {sent && (
          <div className="flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-xs font-medium text-emerald-700">
            <ShieldCheck size={16} className="mt-0.5 shrink-0" />
            <span>
              Enviamos el enlace a <strong>{sent.email}</strong>. Revisa tu bandeja de entrada (y la
              carpeta de spam).
            </span>
          </div>
        )}
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-xs font-medium text-red-700">{error}</div>
        )}

        <button
          type="button"
          onClick={send}
          disabled={sending || cooldown > 0}
          className="flex w-fit items-center gap-1.5 rounded-lg bg-[#113EB9] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#0d32a0] disabled:opacity-40"
        >
          {sending ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
          {cooldown > 0
            ? `Reenviar en ${cooldown} s`
            : sent
              ? 'Reenviar enlace'
              : 'Enviar enlace a mi correo'}
        </button>

        <p className="text-[11px] text-slate-400">
          ¿No tienes un correo registrado? Agrégalo primero en <strong>Mi cuenta</strong>.
        </p>
      </div>
    </div>
  );
}
