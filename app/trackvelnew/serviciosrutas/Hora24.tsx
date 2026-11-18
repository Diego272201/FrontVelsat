'use client';

import React from 'react';

const HORAS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTOS = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

interface Hora24Props {
  /** "HH:mm" (24 horas) o '' si no hay hora. */
  value: string;
  onChange: (valor: string) => void;
  className?: string;
  disabled?: boolean;
}

// Selector de hora SIEMPRE en formato 24 horas (el <input type="time"> muestra AM/PM según el idioma del equipo).
const Hora24: React.FC<Hora24Props> = ({ value, onChange, className = '', disabled }) => {
  const [hh = '', mm = ''] = /^\d{2}:\d{2}/.test(value) ? value.slice(0, 5).split(':') : [];

  const cambiar = (nuevaHora: string, nuevoMin: string) => {
    if (!nuevaHora && !nuevoMin) return onChange('');
    onChange(`${nuevaHora || '00'}:${nuevoMin || '00'}`);
  };

  const base =
    'rounded-md border border-gray-300 bg-white px-1.5 text-[12px] focus:border-[#113EB9] focus:outline-none disabled:bg-gray-100';

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <select
        aria-label="Hora (00-23)"
        value={hh}
        disabled={disabled}
        onChange={(e) => cambiar(e.target.value, mm)}
        className={`${base} h-8 min-w-[56px] flex-1`}
      >
        <option value="">--</option>
        {HORAS.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <span className="text-gray-500">:</span>
      <select
        aria-label="Minutos (00-59)"
        value={mm}
        disabled={disabled}
        onChange={(e) => cambiar(hh, e.target.value)}
        className={`${base} h-8 min-w-[56px] flex-1`}
      >
        <option value="">--</option>
        {MINUTOS.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </div>
  );
};

export default Hora24;
