'use client';

import React, { useEffect, useState } from 'react';
import type { PreferenceSettings } from '../types';
import { SaveBar, SectionHeader, Toggle, useDraft } from '../ui';
import { getLocalPrefs, setLocalPref } from '../localPrefs';

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
  const [singlePopup, setSinglePopup] = useState(false);
  useEffect(() => setSinglePopup(getLocalPrefs().singlePopup), []);
  const set = <K extends keyof PreferenceSettings>(k: K, v: PreferenceSettings[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const switches: { key: keyof PreferenceSettings; title: string; desc: string }[] = [
    { key: 'showPlateLabels', title: 'Mostrar placas en el mapa', desc: 'Etiqueta con la placa sobre cada unidad' },
    { key: 'clusterMarkers', title: 'Agrupar unidades cercanas', desc: 'Agrupa marcadores al alejar el mapa' },
    {
      key: 'followSelectedUnit',
      title: 'Seguir unidad seleccionada (cámara fija)',
      desc: 'Centra el mapa en la unidad al moverse y muestra su vista de calle abajo a la derecha',
    },
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

      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
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

      {/* Ajustes que se guardan solo en este navegador y se aplican al instante */}
      <p className="mb-2 mt-5 text-[11.5px] font-semibold text-slate-600">En este navegador</p>
      <div className="rounded-xl border border-slate-200">
        <div className="flex items-center justify-between gap-3 px-3 py-2.5">
          <div>
            <p className="text-[12.5px] font-semibold text-slate-700">Un solo popup abierto</p>
            <p className="text-[11px] text-slate-500">
              Al abrir el popup de otra unidad se cierra el anterior · se aplica al instante
            </p>
          </div>
          <Toggle
            checked={singlePopup}
            onChange={(v) => {
              setSinglePopup(v);
              setLocalPref('singlePopup', v);
            }}
            label="Un solo popup abierto"
          />
        </div>
      </div>

      <SaveBar dirty={dirty} saving={saving} saved={saved} onSave={save} onCancel={reset} />
    </div>
  );
}
