'use client';

import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Gauge, Loader2, RotateCcw, Search, X } from 'lucide-react';
import type { SpeedLimitSettings } from '../types';
import { SaveBar, SectionHeader, useDraft } from '../ui';
import { useAccountUnits } from '../useAccountUnits';
import { plexSans } from '../fonts';

interface Props {
  value: SpeedLimitSettings;
  onSave: (v: SpeedLimitSettings) => Promise<void>;
}

const MIN_LIMIT = 10;
const MAX_LIMIT = 160;
const clampLimit = (n: number) => Math.max(MIN_LIMIT, Math.min(MAX_LIMIT, Math.round(n)));
const inRange = (n: number) => Number.isFinite(n) && n >= MIN_LIMIT && n <= MAX_LIMIT;

interface LimitInputProps {
  value: number | null;
  /** null = campo vacío (solo si allowEmpty) */
  onChange: (v: number | null) => void;
  allowEmpty?: boolean;
  step?: number;
  placeholder?: string;
  title?: string;
  className: string;
}

/**
 * Campo numérico que deja escribir libremente (p. ej. "4" antes de "45") y
 * solo ajusta al rango permitido al salir del campo o pulsar Enter. Mientras
 * se escribe, los valores válidos se aplican en vivo para que el botón
 * "Guardar" se active.
 */
function LimitInput({ value, onChange, allowEmpty, step, placeholder, title, className }: LimitInputProps) {
  const [text, setText] = useState<string | null>(null); // null = no se está editando

  const commit = () => {
    if (text === null) return;
    const t = text.trim();
    setText(null);
    if (t === '') {
      if (allowEmpty) onChange(null);
      return;
    }
    const n = Number(t);
    if (Number.isFinite(n)) onChange(clampLimit(n));
  };

  return (
    <input
      type="number"
      inputMode="numeric"
      min={MIN_LIMIT}
      max={MAX_LIMIT}
      step={step}
      value={text ?? (value == null ? '' : String(value))}
      placeholder={placeholder}
      title={title}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        if (raw.trim() === '') {
          if (allowEmpty) onChange(null);
        } else if (inRange(Number(raw))) {
          onChange(Math.round(Number(raw)));
        }
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
      className={className}
    />
  );
}

/**
 * Umbral a partir del cual una unidad dispara la alerta de exceso de
 * velocidad. El sonido de esa alerta se configura en "Alertas y sonidos".
 */
export default function SpeedLimitsSection({ value, onSave }: Props) {
  const { draft, setDraft, dirty, saving, saved, save, reset } = useDraft(value, onSave);
  const { units, loading, error } = useAccountUnits();
  const [search, setSearch] = useState('');

  const filteredUnits = useMemo(() => {
    const q = search.trim().toUpperCase();
    return q ? units.filter((u) => u.includes(q)) : units;
  }, [units, search]);

  const customCount = units.filter((u) => draft.byUnit[u] != null).length;

  // La lista de unidades ocupa todo el alto libre del panel (sin scroll del panel)
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [listMaxH, setListMaxH] = useState(340);
  const hasList = draft.mode === 'byUnit' && !loading && !error && filteredUnits.length > 0;

  useLayoutEffect(() => {
    const root = rootRef.current;
    const list = listRef.current;
    const main = root?.closest('main') as HTMLElement | null;
    if (!hasList || !root || !list || !main) return;

    const measure = () => {
      const mainRect = main.getBoundingClientRect();
      const listRect = list.getBoundingClientRect();
      const rootRect = root.getBoundingClientRect();
      const padBottom = parseFloat(getComputedStyle(main).paddingBottom) || 0;
      const top = listRect.top - mainRect.top + main.scrollTop;
      const below = rootRect.bottom - listRect.bottom + padBottom;
      setListMaxH(Math.max(240, Math.floor(main.clientHeight - top - below)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(main);
    return () => ro.disconnect();
  }, [hasList]);

  const setUnitLimit = (unit: string, limit: number | null) =>
    setDraft((d) => {
      const byUnit = { ...d.byUnit };
      if (limit == null) delete byUnit[unit];
      else byUnit[unit] = limit;
      return { ...d, byUnit };
    });

  return (
    <div ref={rootRef} className="space-y-5">
      <SectionHeader
        title="Límites de velocidad"
        description="Define a partir de qué velocidad una unidad activa la alerta de exceso de velocidad"
      />

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col justify-between gap-2 border-b border-slate-100 pb-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
              <Gauge size={16} />
            </div>
            <div>
              <p className="text-[13px] font-bold text-slate-800">Límite para la alerta</p>
              <p className="text-[11px] text-slate-500">
                Un mismo límite para toda la flota, o uno distinto para cada vehículo
              </p>
            </div>
          </div>

          {/* Mismo estilo que el filtro Todas / Con reporte / Sin reporte de Odómetro */}
          <div className={`${plexSans.className} flex self-start rounded-[7px] bg-[#f1f5f9] p-[2px] sm:self-auto`}>
            {(
              [
                ['general', 'Toda la flota'],
                ['byUnit', 'Por vehículo'],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => setDraft((d) => ({ ...d, mode }))}
                className={`h-[30px] rounded-[5px] px-[10px] text-[12px] font-semibold transition ${
                  draft.mode === mode
                    ? 'bg-white text-[#1447c0] shadow-[0_1px_2px_rgba(15,23,42,.12)]'
                    : 'text-[#64748b] hover:text-[#0f172a]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Límite general: para toda la flota, o para las unidades sin límite propio */}
        <div className="mt-3.5 flex flex-col gap-3 rounded-lg bg-slate-50/70 p-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <p className="text-[12px] font-semibold text-slate-700">
              {draft.mode === 'general' ? 'Límite para toda la flota:' : 'Límite general:'}
            </p>
            <p className="text-[10.5px] text-slate-400">
              {draft.mode === 'general'
                ? 'Cualquier unidad que alcance o supere este valor disparará la alerta'
                : 'Lo usan las unidades a las que no les pongas un límite propio'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={20}
              max={120}
              step={5}
              value={draft.generalLimit}
              onChange={(e) => setDraft((d) => ({ ...d, generalLimit: Number(e.target.value) }))}
              className="w-36 accent-[#113EB9]"
            />
            <div className="flex items-center gap-1">
              <LimitInput
                value={draft.generalLimit}
                onChange={(v) => v != null && setDraft((d) => ({ ...d, generalLimit: v }))}
                className="w-16 rounded-md border border-slate-200 bg-white px-2 py-1 text-center text-xs font-bold text-slate-800"
              />
              <span className="text-xs font-semibold text-slate-500">km/h</span>
            </div>
          </div>
        </div>

        {draft.mode === 'byUnit' && (
          <div className="mt-4">
            <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11.5px] text-slate-500">
                <span className="font-semibold text-slate-700">{units.length} unidades</span> en la
                cuenta · <span className="font-semibold text-[#113EB9]">{customCount}</span> con límite
                propio. Deja el campo vacío para usar el general.
              </p>
              {customCount > 0 && (
                <button
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, byUnit: {} }))}
                  className="flex items-center gap-1 self-start text-[11px] font-semibold text-slate-500 hover:text-red-600"
                >
                  <RotateCcw size={12} /> Quitar todos los límites propios
                </button>
              )}
            </div>

            <div className="mb-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 focus-within:border-[#113EB9]">
              <Search size={13} className="shrink-0 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar placa..."
                className="flex-1 bg-transparent text-[12px] text-slate-800 outline-none placeholder:text-slate-400"
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600">
                  <X size={12} />
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-[12px] text-slate-400">
                <Loader2 size={15} className="animate-spin" /> Cargando unidades de la cuenta...
              </div>
            ) : error ? (
              <p className="py-6 text-center text-[12px] text-red-500">{error}</p>
            ) : filteredUnits.length === 0 ? (
              <p className="py-6 text-center text-[12px] text-slate-400">
                {search ? 'Ninguna placa coincide con la búsqueda' : 'La cuenta no tiene unidades'}
              </p>
            ) : (
              <div
                ref={listRef}
                style={{ maxHeight: listMaxH }}
                className="grid grid-cols-1 content-start gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2"
              >
                {filteredUnits.map((unit) => {
                  const own = draft.byUnit[unit];
                  const hasOwn = own != null;
                  return (
                    <div
                      key={unit}
                      className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 ${
                        hasOwn ? 'border-blue-200 bg-blue-50/50' : 'border-slate-200 bg-slate-50/60'
                      }`}
                    >
                      <span className="truncate text-[12px] font-semibold text-slate-700">{unit}</span>
                      <div className="flex shrink-0 items-center gap-1">
                        <LimitInput
                          allowEmpty
                          step={5}
                          value={hasOwn ? own : null}
                          placeholder={String(draft.generalLimit)}
                          onChange={(v) => setUnitLimit(unit, v)}
                          className="w-14 rounded border border-slate-200 bg-white px-1.5 py-1 text-center text-xs font-bold text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400 focus:border-[#113EB9]"
                          title={hasOwn ? 'Límite propio de esta unidad' : 'Usa el límite general'}
                        />
                        <span className="text-[10px] text-slate-400">km/h</span>
                        <button
                          type="button"
                          onClick={() => setUnitLimit(unit, null)}
                          disabled={!hasOwn}
                          title="Usar el límite general"
                          className="rounded p-0.5 text-slate-400 hover:text-red-600 disabled:invisible"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <p className="text-[11px] text-slate-500">
        El sonido, el volumen y el aviso de esta alerta se configuran en la pestaña &ldquo;Alertas y
        sonidos&rdquo;. Los cambios se aplican en la siguiente actualización del mapa.
      </p>

      <SaveBar dirty={dirty} saving={saving} saved={saved} onSave={save} onCancel={reset} />
    </div>
  );
}
