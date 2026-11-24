'use client';

import React, { useState } from 'react';
import { Check, Eye, EyeOff, X } from 'lucide-react';
import { inputClass } from './ui';

/** Largo permitido por el backend: usuarios.password es varchar(32). */
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 32;

export const RULES = [
  { id: 'len', label: `Entre ${PASSWORD_MIN} y ${PASSWORD_MAX} caracteres`, test: (p: string) => p.length >= PASSWORD_MIN && p.length <= PASSWORD_MAX },
  { id: 'upper', label: 'Una mayúscula', test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lower', label: 'Una minúscula', test: (p: string) => /[a-z]/.test(p) },
  { id: 'num', label: 'Un número', test: (p: string) => /\d/.test(p) },
  { id: 'sym', label: 'Un símbolo', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export const STRENGTH = [
  { label: 'Muy débil', color: 'bg-red-500' },
  { label: 'Débil', color: 'bg-orange-500' },
  { label: 'Regular', color: 'bg-amber-500' },
  { label: 'Buena', color: 'bg-lime-500' },
  { label: 'Fuerte', color: 'bg-emerald-500' },
];

/** Una contraseña es aceptable si cumple el largo y al menos 4 de las 5 reglas. */
export function isPasswordAcceptable(p: string): boolean {
  return RULES[0].test(p) && RULES.filter((r) => r.test(p)).length >= 4;
}

export function PasswordInput({
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

/** Barra de fortaleza + lista de reglas de la contraseña nueva. */
export function PasswordStrength({ value }: { value: string }) {
  const passed = RULES.filter((r) => r.test(value)).length;
  const strength = STRENGTH[Math.max(0, passed - 1)];
  return (
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
          const ok = r.test(value);
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
  );
}
