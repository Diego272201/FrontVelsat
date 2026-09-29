'use client';

import React from 'react';

const DetalleCampo: React.FC<{
  label: string;
  value: string | null;
  resaltado?: boolean;
}> = ({ label, value, resaltado }) => (
  <div>
    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
      {label}
    </p>
    <p
      className={`text-[12px] ${
        resaltado && value
          ? 'font-semibold text-red-600'
          : value
            ? 'text-slate-700'
            : 'text-slate-300'
      }`}
    >
      {value || '—'}
    </p>
  </div>
);

export default DetalleCampo;
