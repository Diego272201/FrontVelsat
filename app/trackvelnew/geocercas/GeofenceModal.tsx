'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { MapPin, Search, Truck, X, Check } from 'lucide-react';
import { GEOFENCE_COLORS, Vehicle } from './types';

export interface GeofenceFormData {
  name: string;
  description?: string;
  color: string;
  vehicleIds: string[];
  active?: boolean;
}

interface GeofenceModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  initial: GeofenceFormData;
  shapeSummary: string;
  vehicles: Vehicle[];
  onCancel: () => void;
  onSave: (data: GeofenceFormData) => void;
}

export default function GeofenceModal({
  open,
  mode,
  initial,
  shapeSummary,
  vehicles,
  onCancel,
  onSave,
}: GeofenceModalProps) {
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description || '');
  const [color, setColor] = useState(initial.color);
  const [active, setActive] = useState(initial.active);
  const [vehicleIds, setVehicleIds] = useState<string[]>(initial.vehicleIds);
  const [vehicleSearch, setVehicleSearch] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(initial.name);
    setDescription(initial.description || '');
    setColor(initial.color);
    setActive(initial.active);
    setVehicleIds(initial.vehicleIds);
    setVehicleSearch('');
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  const filtered = useMemo(() => {
    const term = vehicleSearch.trim().toLowerCase();
    if (!term) return vehicles;
    return vehicles.filter((v) => v.label.toLowerCase().includes(term));
  }, [vehicles, vehicleSearch]);

  if (!open) return null;

  const toggleVehicle = (id: string) =>
    setVehicleIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );

  const canSave = name.trim().length > 0;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]">
      <div
        className="absolute inset-0"
        onClick={onCancel}
        aria-hidden
      />

      <div className="relative flex max-h-[86vh] w-full max-w-[520px] flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center gap-3 bg-gradient-to-r from-[#113EB9] to-[#1a4fd6] px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
            <MapPin size={18} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[13.5px] font-bold text-white">
              {mode === 'create' ? 'Nueva geocerca' : 'Editar geocerca'}
            </h2>
            <p className="truncate text-[11px] text-white/70">{shapeSummary}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            title="Cerrar"
            className="flex h-7 w-7 items-center justify-center rounded-md text-white/80 transition hover:bg-white/15 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <div className="geocercas-scroll flex-1 space-y-3.5 overflow-y-auto px-4 py-3.5">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Nombre *
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Terminal Norte"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-[13px] text-gray-800 outline-none transition focus:border-[#113EB9] focus:ring-1 focus:ring-[#113EB9]"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Descripción (opcional)
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej. Zona de parqueo y mantenimiento"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-[13px] text-gray-800 outline-none transition focus:border-[#113EB9] focus:ring-1 focus:ring-[#113EB9]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {GEOFENCE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  title={c}
                  className={`flex h-7 w-7 items-center justify-center rounded-full transition ${
                    color === c ? 'scale-110 ring-2 ring-gray-400 ring-offset-2' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check size={13} className="text-white" />}
                </button>
              ))}
            </div>
          </div>


          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Unidades asignadas
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setVehicleIds(vehicles.map((v) => v.id))}
                  className="text-[10px] font-bold text-[#113EB9] hover:underline"
                >
                  Todas
                </button>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  onClick={() => setVehicleIds([])}
                  className="text-[10px] font-bold text-gray-500 hover:underline"
                >
                  Ninguna
                </button>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-[#113EB9]">
                  {vehicleIds.length}
                </span>
              </div>
            </div>

            <div className="relative mb-1.5">
              <Search
                size={13}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={vehicleSearch}
                onChange={(e) => setVehicleSearch(e.target.value)}
                placeholder="Buscar unidad..."
                className="w-full rounded-md border border-gray-200 py-1.5 pl-7 pr-2 text-[12px] outline-none transition focus:border-[#113EB9]"
              />
            </div>

            <div className="geocercas-scroll max-h-[170px] space-y-1 overflow-y-auto rounded-md border border-gray-200 p-1.5">
              {filtered.length === 0 ? (
                <p className="p-3 text-center text-[11px] text-gray-400">
                  Sin unidades encontradas
                </p>
              ) : (
                filtered.map((v) => {
                  const checked = vehicleIds.includes(v.id);
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => toggleVehicle(v.id)}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] transition ${
                        checked
                          ? 'bg-blue-50 font-semibold text-[#113EB9]'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                          checked
                            ? 'border-[#113EB9] bg-[#113EB9] text-white'
                            : 'border-gray-300 bg-white'
                        }`}
                      >
                        {checked && <Check size={11} />}
                      </span>
                      <Truck size={13} className={checked ? 'text-[#113EB9]' : 'text-gray-400'} />
                      <span className="truncate">{v.label}</span>
                    </button>
                  );
                })
              )}
            </div>

            {vehicleIds.length === 0 && (
              <p className="mt-1 text-[10.5px] italic text-gray-400">
                Sin unidades asignadas esta geocerca no generará alertas de ingreso/salida.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-200 bg-slate-50 px-4 py-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-3 py-1.5 text-[12px] font-semibold text-gray-600 transition hover:bg-gray-200"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!canSave}
            onClick={() =>
              onSave({
                name: name.trim(),
                description: description.trim(),
                color,
                vehicleIds,
                active,
              })
            }
            className="flex items-center gap-1.5 rounded-md bg-[#113EB9] px-4 py-1.5 text-[12px] font-bold text-white transition hover:bg-[#0d3396] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Check size={14} /> Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
