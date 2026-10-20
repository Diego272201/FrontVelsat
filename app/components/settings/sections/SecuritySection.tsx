'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, Check, X, Loader2, ShieldCheck } from 'lucide-react';
import { Field, SectionHeader, inputClass } from '../ui';

interface Props {
  onChangePassword: (current: string, next: string) => Promise<boolean>;
}

const RULES = [
  { id: 'len', label: 'Mínimo 8 caracteres', test: (p: string) => p.length >= 8 },
  { id: 'upper', label: 'Una mayúscula', test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lower', label: 'Una minúscula', test: (p: string) => /[a-z]/.test(p) },
  { id: 'num', label: 'Un número', test: (p: string) => /\d/.test(p) },
  { id: 'sym', label: 'Un símbolo', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

const STRENGTH = [
  { label: 'Muy débil', color: 'bg-red-500' },
  { label: 'Débil', color: 'bg-orange-500' },
  { label: 'Regular', color: 'bg-amber-500' },
  { label: 'Buena', color: 'bg-lime-500' },
  { label: 'Fuerte', color: 'bg-emerald-500' },
];

function PasswordInput({
  value,
  onChange,
  autoComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        className={`${inputClass} pr-9`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
        tabIndex={-1}
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}

export default function SecuritySection({ onChangePassword }: Props) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<'ok' | 'error' | null>(null);

  const passed = RULES.filter((r) => r.test(next)).length;
  const strength = STRENGTH[Math.max(0, passed - 1)];
  const mismatch = confirm.length > 0 && confirm !== next;
  const sameAsCurrent = next.length > 0 && next === current;
  const canSubmit =
    current.length > 0 && passed >= 4 && next === confirm && !sameAsCurrent && !saving;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setResult(null);
    try {
      await onChangePassword(current, next);
      setResult('ok');
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch {
      setResult('error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <SectionHeader
        title="Seguridad"
        description="Cambia tu contraseña periódicamente para proteger tu cuenta"
      />

      <div className="grid max-w-md grid-cols-1 gap-4">
        <Field label="Contraseña actual">
          <PasswordInput value={current} onChange={setCurrent} autoComplete="current-password" />
        </Field>

        <Field
          label="Nueva contraseña"
          error={sameAsCurrent ? 'Debe ser distinta a la actual' : undefined}
        >
          <PasswordInput value={next} onChange={setNext} autoComplete="new-password" />
        </Field>

        {next && (
          <div>
            <div className="mb-1 flex gap-1">
              {STRENGTH.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full ${i < passed ? strength.color : 'bg-slate-200'}`}
                />
              ))}
            </div>
            <p className="text-[11px] text-slate-500">
              Seguridad: <strong>{strength.label}</strong>
            </p>
            <ul className="mt-2 grid grid-cols-2 gap-1">
              {RULES.map((r) => {
                const ok = r.test(next);
                return (
                  <li
                    key={r.id}
                    className={`flex items-center gap-1 text-[11px] ${ok ? 'text-emerald-600' : 'text-slate-400'}`}
                  >
                    {ok ? <Check size={12} /> : <X size={12} />} {r.label}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <Field
          label="Confirmar nueva contraseña"
          error={mismatch ? 'Las contraseñas no coinciden' : undefined}
        >
          <PasswordInput value={confirm} onChange={setConfirm} autoComplete="new-password" />
        </Field>

        {result === 'ok' && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-xs font-medium text-emerald-700">
            <ShieldCheck size={16} /> Contraseña actualizada correctamente
          </div>
        )}
        {result === 'error' && (
          <div className="rounded-lg bg-red-50 p-3 text-xs font-medium text-red-700">
            No se pudo cambiar la contraseña. Verifica tu contraseña actual.
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="flex w-fit items-center gap-1.5 rounded-lg bg-[#113EB9] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#0d32a0] disabled:opacity-40"
        >
          {saving && <Loader2 size={13} className="animate-spin" />}
          Actualizar contraseña
        </button>
      </div>
    </form>
  );
}
