'use client';

import React, { useMemo, useState } from 'react';
import {
  FaCarSide,
  FaTruckPickup,
  FaShuttleVan,
  FaBus,
  FaTruck,
  FaMotorcycle,
  FaTaxi,
  FaAmbulance,
} from 'react-icons/fa';
import type { IconType } from 'react-icons';
import { Search, CheckSquare, Square } from 'lucide-react';
import type { UnitIcon, VehicleIconId } from '../types';
import { ICON_COLORS, VEHICLE_ICON_LABELS } from '../mockData';
import { SaveBar, SectionHeader, inputClass, useDraft } from '../ui';

export const VEHICLE_ICONS: Record<VehicleIconId, IconType> = {
  car: FaCarSide,
  pickup: FaTruckPickup,
  van: FaShuttleVan,
  bus: FaBus,
  truck: FaTruck,
  moto: FaMotorcycle,
  taxi: FaTaxi,
  ambulance: FaAmbulance,
};

interface Props {
  value: UnitIcon[];
  onSave: (v: UnitIcon[]) => Promise<void>;
}

export default function UnitIconsSection({ value, onSave }: Props) {
  const { draft, setDraft, dirty, saving, saved, save, reset } = useDraft(value, onSave);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? draft.filter((u) => u.placa.toLowerCase().includes(q)) : draft;
  }, [draft, query]);

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const allSelected = filtered.length > 0 && filtered.every((u) => selected.has(u.deviceId));
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(filtered.map((u) => u.deviceId)));

  const apply = (patch: Partial<Pick<UnitIcon, 'icon' | 'color'>>) =>
    setDraft((list) => list.map((u) => (selected.has(u.deviceId) ? { ...u, ...patch } : u)));

  const first = draft.find((u) => selected.has(u.deviceId));

  return (
    <div>
      <SectionHeader
        title="Íconos de unidades"
        description="Personaliza cómo se ve cada unidad en el mapa. Selecciona una o varias y elige ícono y color."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_260px]">
        {/* Lista de unidades */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className={`${inputClass} pl-8`}
                placeholder="Buscar placa..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={toggleAll}
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
            >
              {allSelected ? <CheckSquare size={14} /> : <Square size={14} />} Todas
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {filtered.map((u) => {
              const Icon = VEHICLE_ICONS[u.icon];
              const isSel = selected.has(u.deviceId);
              return (
                <button
                  type="button"
                  key={u.deviceId}
                  onClick={() => toggle(u.deviceId)}
                  className={`flex items-center gap-2 rounded-xl border p-2.5 text-left transition ${
                    isSel
                      ? 'border-[#113EB9] bg-blue-50 ring-2 ring-[#113EB9]/15'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white shadow"
                    style={{ backgroundColor: u.color }}
                  >
                    <Icon size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-bold text-slate-800">{u.placa}</p>
                    <p className="truncate text-[10.5px] text-slate-500">
                      {VEHICLE_ICON_LABELS[u.icon]}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Panel de edición */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          {selected.size === 0 ? (
            <div className="flex h-full min-h-[180px] items-center justify-center text-center text-xs text-slate-400">
              Selecciona una o más unidades para cambiar su ícono
            </div>
          ) : (
            <>
              <p className="mb-2 text-[11px] font-semibold text-slate-500">
                {selected.size} unidad{selected.size > 1 ? 'es' : ''} seleccionada
                {selected.size > 1 ? 's' : ''}
              </p>

              <p className="mb-1.5 text-[11px] font-semibold uppercase text-slate-500">Ícono</p>
              <div className="mb-4 grid grid-cols-4 gap-1.5">
                {(Object.keys(VEHICLE_ICONS) as VehicleIconId[]).map((id) => {
                  const Icon = VEHICLE_ICONS[id];
                  const active = first?.icon === id;
                  return (
                    <button
                      type="button"
                      key={id}
                      title={VEHICLE_ICON_LABELS[id]}
                      onClick={() => apply({ icon: id })}
                      className={`flex aspect-square items-center justify-center rounded-lg border transition ${
                        active
                          ? 'border-[#113EB9] bg-white text-[#113EB9] shadow-sm'
                          : 'border-transparent bg-white text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Icon size={18} />
                    </button>
                  );
                })}
              </div>

              <p className="mb-1.5 text-[11px] font-semibold uppercase text-slate-500">Color</p>
              <div className="flex flex-wrap gap-1.5">
                {ICON_COLORS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => apply({ color: c })}
                    className={`h-7 w-7 rounded-full border-2 transition ${
                      first?.color === c ? 'scale-110 border-slate-800' : 'border-white'
                    }`}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
                <label
                  className="relative h-7 w-7 cursor-pointer overflow-hidden rounded-full border-2 border-white bg-[conic-gradient(red,yellow,lime,aqua,blue,magenta,red)]"
                  title="Color personalizado"
                >
                  <input
                    type="color"
                    className="absolute inset-0 cursor-pointer opacity-0"
                    value={first?.color ?? '#113EB9'}
                    onChange={(e) => apply({ color: e.target.value })}
                  />
                </label>
              </div>
            </>
          )}
        </div>
      </div>

      <SaveBar dirty={dirty} saving={saving} saved={saved} onSave={save} onCancel={reset} />
    </div>
  );
}
