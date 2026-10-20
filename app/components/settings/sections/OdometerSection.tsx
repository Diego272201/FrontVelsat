'use client';

import React, { useMemo, useState } from 'react';
import { Search, Gauge, Pencil, Check, X, RotateCcw, Info } from 'lucide-react';
import type { UnitOdometer } from '../types';
import { SaveBar, SectionHeader, inputClass, useDraft } from '../ui';

interface Props {
  value: UnitOdometer[];
  onSave: (v: UnitOdometer[]) => Promise<void>;
}

const fmtKm = (n: number) =>
  n.toLocaleString('es-PE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const fmtDate = (iso: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' });
};

export default function OdometerSection({ value, onSave }: Props) {
  const { draft, setDraft, dirty, saving, saved, save, reset } = useDraft(value, onSave);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return draft;
    return draft.filter(
      (u) => u.placa.toLowerCase().includes(q) || u.descripcion.toLowerCase().includes(q),
    );
  }, [draft, query]);

  const startEdit = (u: UnitOdometer) => {
    setEditing(u.deviceId);
    setEditValue(String(Math.round(u.odometroActual)));
  };

  const parsed = Number(editValue.replace(',', '.'));
  const validEdit = editValue.trim() !== '' && Number.isFinite(parsed) && parsed >= 0 && parsed < 10_000_000;

  const applyEdit = (deviceId: string) => {
    if (!validEdit) return;
    setDraft((list) =>
      list.map((u) =>
        u.deviceId === deviceId
          ? { ...u, odometroInicial: parsed, odometroActual: parsed, fechaAjuste: new Date().toISOString() }
          : u,
      ),
    );
    setEditing(null);
  };

  const original = (id: string) => value.find((v) => v.deviceId === id);

  return (
    <div>
      <SectionHeader
        title="Odómetro de unidades"
        description="Define el kilometraje desde el cual el sistema empezará a contar para cada unidad"
      />

      <div className="mb-3 flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 p-3 text-[11.5px] text-blue-800">
        <Info size={15} className="mt-0.5 shrink-0" />
        <span>
          Ingresa el valor que marca el tablero del vehículo. A partir de ese momento, el sistema
          sumará la distancia recorrida según el GPS.
        </span>
      </div>

      <div className="relative mb-3">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className={`${inputClass} pl-8`}
          placeholder="Buscar por placa o descripción..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-left text-[12px]">
          <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2 font-semibold">Unidad</th>
              <th className="px-3 py-2 text-right font-semibold">Odómetro (km)</th>
              <th className="hidden px-3 py-2 font-semibold md:table-cell">Último ajuste</th>
              <th className="w-28 px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((u) => {
              const isEditing = editing === u.deviceId;
              const changed = original(u.deviceId)?.odometroActual !== u.odometroActual;
              return (
                <tr key={u.deviceId} className={changed ? 'bg-amber-50/50' : 'hover:bg-slate-50'}>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-[#113EB9]">
                        <Gauge size={14} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{u.placa}</p>
                        <p className="text-[11px] text-slate-500">{u.descripcion}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {isEditing ? (
                      <input
                        autoFocus
                        inputMode="decimal"
                        className={`${inputClass} w-32 py-1 text-right ${!validEdit ? 'border-red-300' : ''}`}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value.replace(/[^\d.,]/g, ''))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') applyEdit(u.deviceId);
                          if (e.key === 'Escape') setEditing(null);
                        }}
                      />
                    ) : (
                      <span className="font-mono font-semibold text-slate-700">
                        {fmtKm(u.odometroActual)}
                      </span>
                    )}
                  </td>
                  <td className="hidden px-3 py-2 text-slate-500 md:table-cell">
                    {fmtDate(u.fechaAjuste)}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => applyEdit(u.deviceId)}
                            disabled={!validEdit}
                            title="Aplicar"
                            className="rounded-md bg-[#113EB9] p-1.5 text-white disabled:opacity-40"
                          >
                            <Check size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditing(null)}
                            title="Cancelar"
                            className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
                          >
                            <X size={13} />
                          </button>
                        </>
                      ) : (
                        <>
                          {changed && (
                            <button
                              type="button"
                              title="Deshacer"
                              onClick={() =>
                                setDraft((list) =>
                                  list.map((x) => (x.deviceId === u.deviceId ? original(u.deviceId)! : x)),
                                )
                              }
                              className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
                            >
                              <RotateCcw size={13} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => startEdit(u)}
                            className="flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:border-[#113EB9] hover:text-[#113EB9]"
                          >
                            <Pencil size={12} /> Ajustar
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-xs text-slate-400">
                  No se encontraron unidades
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <SaveBar dirty={dirty} saving={saving} saved={saved} onSave={save} onCancel={reset} />
    </div>
  );
}
