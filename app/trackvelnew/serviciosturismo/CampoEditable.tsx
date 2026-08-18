'use client';

import React from 'react';

const CampoEditable: React.FC<{
  label: string;
  value: string;
  onChange: (valor: string) => void;
  type?: string;
  textarea?: boolean;
  readOnly?: boolean;
}> = ({ label, value, onChange, type = 'text', textarea, readOnly }) => (
  <div>
    <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
      {label}
    </label>
    {textarea ? (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        readOnly={readOnly}
        className={`mt-0.5 w-full rounded-md border border-slate-200 px-2 py-1 text-[12px] focus:border-[#113EB9] focus:outline-none focus:ring-1 focus:ring-[#113EB9] ${
          readOnly ? 'cursor-not-allowed bg-slate-100 text-slate-500' : 'bg-white'
        }`}
      />
    ) : (
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        className={`mt-0.5 w-full rounded-md border border-slate-200 px-2 py-1 text-[12px] focus:border-[#113EB9] focus:outline-none focus:ring-1 focus:ring-[#113EB9] ${
          readOnly ? 'cursor-not-allowed bg-slate-100 text-slate-500' : 'bg-white'
        }`}
      />
    )}
  </div>
);

export default CampoEditable;
