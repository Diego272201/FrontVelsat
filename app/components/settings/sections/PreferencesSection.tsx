'use client';

import React from 'react';
import type { PreferenceSettings } from '../types';
import { Field, SaveBar, SectionHeader, Toggle, inputClass, useDraft } from '../ui';

interface Props {
  value: PreferenceSettings;
  onSave: (v: PreferenceSettings) => Promise<void>;
}

const MAP_TYPES: { id: PreferenceSettings['mapType']; label: string }[] = [
  { id: 'roadmap', label: 'Mapa' },
  { id: 'satellite', label: 'Satélite' },
  { id: 'hybrid', label: 'Híbrido' },
  { id: 'terrain', label: 'Relieve' },
];

export default function PreferencesSection({ value, onSave }: Props) {
  const { draft, setDraft, dirty, saving, saved, save, reset } = useDraft(value, onSave);
  const set = <K extends keyof PreferenceSettings>(k: K, v: PreferenceSettings[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const switches: { key: keyof PreferenceSettings; title: string; desc: string }[] = [
    { key: 'showPlateLabels', title: 'Mostrar placas en el mapa', desc: 'Etiqueta con la placa sobre cada unidad' },
    { key: 'clusterMarkers', title: 'Agrupar unidades cercanas', desc: 'Agrupa marcadores al alejar el mapa' },
    { key: 'followSelectedUnit', title: 'Seguir unidad seleccionada', desc: 'Centra el mapa en la unidad al moverse' },
  ];

  return (
    <div>
      <SectionHeader title="Preferencias" description="Ajustes generales de visualización del sistema" />

      <p className="mb-2 text-[11.5px] font-semibold text-slate-600">Tipo de mapa por defecto</p>
      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {MAP_TYPES.map((m) => (
          <button
            type="button"
            key={m.id}
            onClick={() => set('mapType', m.id)}
            className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
              draft.mapType === m.id
                ? 'border-[#113EB9] bg-blue-50 text-[#113EB9]'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Unidad de distancia">
          <select
            className={inputClass}
            value={draft.distanceUnit}
            onChange={(e) => set('distanceUnit', e.target.value as PreferenceSettings['distanceUnit'])}
          >
            <option value="km">Kilómetros (km)</option>
            <option value="mi">Millas (mi)</option>
          </select>
        </Field>
        <Field label="Actualización del mapa" hint="Cada cuánto se refrescan las posiciones">
          <select
            className={inputClass}
            value={draft.refreshSeconds}
            onChange={(e) => set('refreshSeconds', Number(e.target.value))}
          >
            {[5, 10, 15, 30, 60].map((s) => (
              <option key={s} value={s}>
                Cada {s} segundos
              </option>
            ))}
          </select>
        </Field>
        <Field label="Zona horaria">
          <select
            className={inputClass}
            value={draft.timezone}
            onChange={(e) => set('timezone', e.target.value)}
          >
            <option value="America/Lima">Lima (GMT-5)</option>
            <option value="America/Bogota">Bogotá (GMT-5)</option>
            <option value="America/Santiago">Santiago (GMT-4/-3)</option>
            <option value="America/Mexico_City">Ciudad de México (GMT-6)</option>
          </select>
        </Field>
        <Field label="Formato de fecha">
          <select
            className={inputClass}
            value={draft.dateFormat}
            onChange={(e) => set('dateFormat', e.target.value as PreferenceSettings['dateFormat'])}
          >
            <option value="DD-MM-YYYY">DD-MM-AAAA</option>
            <option value="MM-DD-YYYY">MM-DD-AAAA</option>
            <option value="YYYY-MM-DD">AAAA-MM-DD</option>
          </select>
        </Field>
      </div>

      <div className="mt-5 divide-y divide-slate-100 rounded-xl border border-slate-200">
        {switches.map((s) => (
          <div key={s.key} className="flex items-center justify-between gap-3 px-3 py-2.5">
            <div>
              <p className="text-[12.5px] font-semibold text-slate-700">{s.title}</p>
              <p className="text-[11px] text-slate-500">{s.desc}</p>
            </div>
            <Toggle
              checked={Boolean(draft[s.key])}
              onChange={(v) => set(s.key, v as never)}
              label={s.title}
            />
          </div>
        ))}
      </div>

      <SaveBar dirty={dirty} saving={saving} saved={saved} onSave={save} onCancel={reset} />
    </div>
  );
}
