'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Loader2,
  Minus,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Search,
  X,
} from 'lucide-react';
import type { UnitIconsSettings, VehicleIconId } from '../types';
import { VEHICLE_ICON_LABELS, VEHICLE_ICON_OPTIONS } from '../mockData';
import { SaveBar, inputClass, useDraft } from '../ui';
import { PLATE_CLASS, plexSans } from '../fonts';
import { useAccountUnits } from '../useAccountUnits';
import {
  getAutoSideSvgDataUrl,
  getAutoSvgDataUrl,
  getCisternaSideSvgDataUrl,
  getCisternaSvgDataUrl,
  getVanSideSvgDataUrl,
  getVanSvgDataUrl,
} from '../vanSvgIcon';

interface Props {
  value: UnitIconsSettings;
  onSave: (v: UnitIconsSettings) => Promise<void>;
}

const PREVIEW_BY_ICON: Record<VehicleIconId, string> = {
  auto: getAutoSvgDataUrl(135),
  cisterna: getCisternaSvgDataUrl(135),
  van: getVanSvgDataUrl(135),
};

/** Vista de perfil (SVG lateral, mirando a la izquierda) para la lista de unidades */
const PROFILE_BY_ICON: Record<VehicleIconId, string> = {
  auto: getAutoSideSvgDataUrl(),
  cisterna: getCisternaSideSvgDataUrl(),
  van: getVanSideSvgDataUrl(),
};

const CARDINAL_ANGLES: { label: string; angle: number }[] = [
  { label: 'N', angle: 0 },
  { label: 'E', angle: 90 },
  { label: 'S', angle: 180 },
  { label: 'O', angle: 270 },
];

export default function UnitIconsSection({ value, onSave }: Props) {
  const { draft, setDraft, dirty, saving, saved, save, reset } = useDraft(value, onSave);
  const { units, loading, error, reload } = useAccountUnits();

  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<VehicleIconId | 'all'>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hoveredIcon, setHoveredIcon] = useState<VehicleIconId | null>(null);
  const [previewOnlyIcon, setPreviewOnlyIcon] = useState<VehicleIconId>('auto');
  const [previewAngle, setPreviewAngle] = useState(0);
  const [autoSpin, setAutoSpin] = useState(false);
  const lastClickedRef = useRef<string | null>(null);

  // Animación continua al activar "Girar 360°"
  useEffect(() => {
    if (!autoSpin) return;
    const id = window.setInterval(() => {
      setPreviewAngle((a) => (a + 4) % 360);
    }, 45);
    return () => window.clearInterval(id);
  }, [autoSpin]);

  const getIcon = (plate: string, source: UnitIconsSettings = draft): VehicleIconId =>
    source.byUnit?.[plate] ?? 'auto';

  /** Conteo real de unidades por cada tipo de ícono */
  const counts = useMemo(() => {
    const acc: Record<VehicleIconId, number> = { auto: 0, cisterna: 0, van: 0 };
    for (const plate of units) {
      acc[getIcon(plate)] += 1;
    }
    return acc;
  }, [units, draft]);

  const customCount = useMemo(
    () => units.filter((plate) => getIcon(plate) !== 'auto').length,
    [units, draft],
  );

  /** Unidades visibles tras búsqueda y filtro por tipo */
  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    return units.filter((plate) => {
      if (q && !plate.includes(q)) return false;
      if (filterType !== 'all' && getIcon(plate) !== filterType) return false;
      return true;
    });
  }, [units, query, filterType, draft]);

  const toggleUnit = (plate: string, shiftKey: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (shiftKey && lastClickedRef.current && filtered.includes(lastClickedRef.current)) {
        const startIdx = filtered.indexOf(lastClickedRef.current);
        const endIdx = filtered.indexOf(plate);
        if (startIdx !== -1 && endIdx !== -1) {
          const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
          for (let i = from; i <= to; i++) {
            next.add(filtered[i]);
          }
          return next;
        }
      }
      if (next.has(plate)) next.delete(plate);
      else next.add(plate);
      return next;
    });
    lastClickedRef.current = plate;
  };

  const visibleSelectedCount = useMemo(
    () => filtered.filter((p) => selected.has(p)).length,
    [filtered, selected],
  );

  const allVisibleSelected = filtered.length > 0 && visibleSelectedCount === filtered.length;
  const someVisibleSelected = visibleSelectedCount > 0 && !allVisibleSelected;

  const toggleAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected || someVisibleSelected) {
        filtered.forEach((p) => next.delete(p));
      } else {
        filtered.forEach((p) => next.add(p));
      }
      return next;
    });
  };

  const applyToPlates = (plates: Iterable<string>, icon: VehicleIconId) => {
    setDraft((prev) => {
      const byUnit = { ...prev.byUnit };
      for (const plate of plates) {
        if (icon === 'auto') delete byUnit[plate];
        else byUnit[plate] = icon;
      }
      return { byUnit };
    });
  };

  const applyToSelected = (icon: VehicleIconId) => {
    if (selected.size === 0) return;
    applyToPlates(selected, icon);
  };

  const selectedList = useMemo(
    () => units.filter((u) => selected.has(u)),
    [units, selected],
  );

  const selectedIconCounts = useMemo(() => {
    const acc: Record<VehicleIconId, number> = { auto: 0, cisterna: 0, van: 0 };
    for (const plate of selectedList) {
      acc[getIcon(plate)] += 1;
    }
    return acc;
  }, [selectedList, draft]);

  // Ícono mostrado en la vista previa del mapa (hover tiene prioridad para previsualizar)
  const previewIconType: VehicleIconId =
    hoveredIcon ?? (selectedList.length > 0 ? getIcon(selectedList[0]) : previewOnlyIcon);

  const previewPlate =
    selectedList.length === 1
      ? selectedList[0]
      : selectedList.length > 1
        ? `${selectedList[0]} (+${selectedList.length - 1})`
        : VEHICLE_ICON_LABELS[previewIconType].toUpperCase();

  const previewMapSrc = useMemo(() => {
    if (previewIconType === 'van') return getVanSvgDataUrl(previewAngle, true);
    if (previewIconType === 'cisterna') return getCisternaSvgDataUrl(previewAngle, true);
    return getAutoSvgDataUrl(previewAngle, true);
  }, [previewIconType, previewAngle]);

  return (
    <div>
      {/* Cabecera con la misma tipografía que Odómetro + acción de restablecer */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-[15px] font-bold text-slate-800">Íconos de unidades</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Elige cómo se verá cada vehículo en el mapa. Selecciona una o varias unidades y
            asígnales un ícono.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setDraft({ byUnit: {} })}
          disabled={customCount === 0}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11.5px] font-semibold text-[#113EB9] transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <RotateCcw size={13} /> Restablecer todas a Auto
        </button>
      </div>

      {/* Buscador + filtros segmentados por tipo */}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            className={`${inputClass} pl-8 pr-8`}
            placeholder="Buscar por placa"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              title="Limpiar búsqueda"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex shrink-0 items-center rounded-lg border border-slate-200 bg-slate-50/80 p-0.5 text-[11.5px]">
          {(
            [
              { id: 'all', label: 'Todas', count: units.length },
              { id: 'auto', label: 'Auto', count: counts.auto },
              { id: 'cisterna', label: 'Cisterna', count: counts.cisterna },
              { id: 'van', label: 'Van', count: counts.van },
            ] as const
          ).map((tab) => {
            const active = filterType === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterType(tab.id)}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-semibold transition ${
                  active
                    ? 'bg-white text-slate-800 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`font-bold ${
                    active ? 'text-[#113EB9]' : 'text-slate-400'
                  }`}
                >
                  {loading ? '—' : tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Layout principal: Tabla de unidades (izquierda) + Panel de cambio y vista previa (derecha) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_290px] lg:items-start">
        {/* Columna izquierda: Tabla estilo Odómetro */}
        {/* En escritorio la lista ocupa todo el alto que queda hasta el pie del panel */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white lg:h-[max(360px,calc(100vh-330px))]">
          {loading ? (
            <div className="flex min-h-[320px] flex-1 flex-col items-center justify-center gap-2 text-xs text-slate-400">
              <Loader2 size={20} className="animate-spin text-[#113EB9]" />
              <span>Cargando unidades de la cuenta...</span>
            </div>
          ) : error ? (
            <div className="flex min-h-[320px] flex-1 flex-col items-center justify-center gap-2.5 p-4 text-center">
              <p className="text-xs font-medium text-red-600">{error}</p>
              <button
                type="button"
                onClick={reload}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-[11.5px] font-semibold text-red-600 hover:bg-red-50"
              >
                <RefreshCw size={12} /> Reintentar
              </button>
            </div>
          ) : (
            <div className="max-h-[430px] min-h-0 flex-1 overflow-y-auto lg:max-h-none">
              <table className="w-full text-left text-[12px]">
                <thead className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50 text-[11px] uppercase text-slate-500">
                  <tr>
                    <th className="w-10 px-3 py-2.5">
                      <button
                        type="button"
                        onClick={toggleAllVisible}
                        disabled={filtered.length === 0}
                        title={
                          allVisibleSelected || someVisibleSelected
                            ? 'Deseleccionar visibles'
                            : 'Seleccionar todas las visibles'
                        }
                        className={`flex h-4 w-4 items-center justify-center rounded border transition disabled:opacity-40 ${
                          allVisibleSelected || someVisibleSelected
                            ? 'border-[#113EB9] bg-[#113EB9] text-white'
                            : 'border-slate-300 bg-white text-transparent hover:border-[#113EB9]'
                        }`}
                      >
                        {allVisibleSelected ? (
                          <Check size={11} className="stroke-[3]" />
                        ) : someVisibleSelected ? (
                          <Minus size={11} className="stroke-[3]" />
                        ) : null}
                      </button>
                    </th>
                    <th className="px-2 py-2.5 font-semibold">Unidad</th>
                    <th className="w-28 px-3 py-2.5 font-semibold">Ícono</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filtered.map((plate) => {
                    const iconId = getIcon(plate);
                    const savedIconId = getIcon(plate, value);
                    const isModified = iconId !== savedIconId;
                    const isSel = selected.has(plate);

                    return (
                      <tr
                        key={plate}
                        onClick={(e) => toggleUnit(plate, e.shiftKey)}
                        className={`cursor-pointer select-none transition ${
                          isSel
                            ? 'bg-blue-50/75'
                            : isModified
                              ? 'bg-amber-50/40 hover:bg-amber-50/70'
                              : 'hover:bg-slate-50'
                        }`}
                      >
                        <td
                          className={`px-3 py-2 ${
                            isSel ? 'border-l-[3px] border-l-[#113EB9] pl-[9px]' : ''
                          }`}
                        >
                          <span
                            className={`flex h-4 w-4 items-center justify-center rounded border transition ${
                              isSel
                                ? 'border-[#113EB9] bg-[#113EB9] text-white'
                                : 'border-slate-300 bg-white text-transparent'
                            }`}
                          >
                            <Check size={11} className="stroke-[3]" />
                          </span>
                        </td>

                        <td className="px-2 py-2">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-14 shrink-0 items-center justify-center">
                              <img
                                src={PROFILE_BY_ICON[iconId]}
                                alt={VEHICLE_ICON_LABELS[iconId]}
                                loading="lazy"
                                className="max-h-8 w-14 object-contain"
                              />
                            </div>
                            <span className={`${plexSans.className} ${PLATE_CLASS}`}>{plate}</span>
                          </div>
                        </td>

                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-slate-600">
                              {VEHICLE_ICON_LABELS[iconId]}
                            </span>
                            {isModified && (
                              <span
                                className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"
                                title="Cambio sin guardar"
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-3 py-12 text-center text-xs text-slate-400">
                        {query || filterType !== 'all' ? (
                          <div className="flex flex-col items-center gap-1.5">
                            <span>No se encontraron unidades con los filtros actuales</span>
                            <button
                              type="button"
                              onClick={() => {
                                setQuery('');
                                setFilterType('all');
                              }}
                              className="text-[11.5px] font-semibold text-[#113EB9] hover:underline"
                            >
                              Limpiar filtros
                            </button>
                          </div>
                        ) : (
                          'La cuenta no tiene unidades registradas'
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Columna derecha: Panel Cambiar ícono + Vista en mapa 360° */}
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3.5">
          {/* Cabecera del panel */}
          <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500">
                Cambiar ícono
              </p>
              <p className="mt-0.5 text-[13px] font-bold text-[#113EB9]">
                {selectedList.length === 0
                  ? 'Ninguna seleccionada'
                  : `${selectedList.length} unidad${selectedList.length > 1 ? 'es' : ''} seleccionada${selectedList.length > 1 ? 's' : ''}`}
              </p>
            </div>
            {selectedList.length > 0 && (
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="text-[11.5px] font-semibold text-slate-500 transition hover:text-slate-800"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Vista en mapa con brújula, placa y botón Girar 360° */}
          <div className="relative h-[156px] overflow-hidden rounded-xl border border-slate-200 bg-[#f3f5f1]">
            {/* Grilla de mapa + avenida diagonal */}
            <div
              className="pointer-events-none absolute inset-[-20%]"
              style={{
                backgroundImage:
                  'linear-gradient(to right, rgba(255,255,255,0.85) 1.5px, transparent 1.5px), linear-gradient(to bottom, rgba(255,255,255,0.85) 1.5px, transparent 1.5px)',
                backgroundSize: '28px 28px',
                transform: 'rotate(-14deg)',
              }}
            >
              <div className="absolute left-[46%] top-[-15%] h-[130%] w-9 rotate-[28deg] bg-[#d6dce5]" />
              <div className="absolute right-[10%] top-[12%] h-14 w-16 rounded-xl bg-[#dcecd8]" />
              <div className="absolute bottom-[10%] left-[8%] h-12 w-20 rounded-xl bg-[#dcecd8]" />
            </div>

            {/* Badge de ángulo (arriba derecha) */}
            <span className="absolute right-2.5 top-2.5 z-20 rounded-md bg-[#113EB9] px-2 py-0.5 font-mono text-[10.5px] font-bold text-white shadow-xs">
              {previewAngle}°
            </span>

            {/* Círculo punteado + placa verde + ícono del vehículo */}
            <div className="relative z-10 flex h-full w-full items-center justify-center">
              <div className="relative flex h-[106px] w-[106px] items-center justify-center rounded-full border border-dashed border-[#113EB9]/35 bg-white/25">
                {/* Placa flotante */}
                <div className="absolute -top-3.5 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#16a34a] px-2.5 py-0.5 text-[10.5px] font-bold text-white shadow-sm">
                  {previewPlate}
                  <span className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-[#16a34a]" />
                </div>

                {/* Vehículo */}
                <img
                  src={previewMapSrc}
                  alt={VEHICLE_ICON_LABELS[previewIconType]}
                  className="mt-2 h-[62px] w-[62px] object-contain drop-shadow-md"
                />
              </div>
            </div>

            {/* Etiqueta inferior izquierda */}
            <span className="absolute bottom-2 left-2.5 z-20 rounded bg-white/90 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-slate-600 shadow-xs">
              Vista en mapa
            </span>

            {/* Botón Girar 360° (abajo derecha) */}
            <button
              type="button"
              onClick={() => setAutoSpin((s) => !s)}
              className={`absolute bottom-2 right-2.5 z-20 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10.5px] font-semibold shadow-xs transition ${
                autoSpin
                  ? 'border-[#113EB9] bg-[#113EB9] text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-[#113EB9] hover:text-[#113EB9]'
              }`}
            >
              <RotateCw size={11} className={autoSpin ? 'animate-spin' : ''} />
              {autoSpin ? 'Detener' : 'Girar 360°'}
            </button>
          </div>

          {/* Control deslizante de ángulo */}
          <input
            type="range"
            min={0}
            max={358}
            step={2}
            value={previewAngle}
            onChange={(e) => {
              setAutoSpin(false);
              setPreviewAngle(Number(e.target.value));
            }}
            className="h-1.5 w-full cursor-pointer accent-[#113EB9]"
            title="Ajustar ángulo de vista previa"
          />

          {/* Accesos rápidos N / E / S / O */}
          <div className="grid grid-cols-4 rounded-lg border border-slate-200 bg-slate-50/70 p-0.5 text-[11px]">
            {CARDINAL_ANGLES.map((c) => {
              const active = Math.abs(previewAngle - c.angle) <= 4;
              return (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => {
                    setAutoSpin(false);
                    setPreviewAngle(c.angle);
                  }}
                  className={`rounded-md py-1 font-bold transition ${
                    active
                      ? 'bg-white text-[#113EB9] shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>

          {/* Selector de los 3 tipos de ícono */}
          <div>
            <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-wide text-slate-500">
              Tipo de ícono
            </p>
            <div className="grid grid-cols-3 gap-2">
              {VEHICLE_ICON_OPTIONS.map((opt) => {
                const matched = selectedIconCounts[opt.id];
                const isAll = selectedList.length > 0 && matched === selectedList.length;
                const isPartial =
                  selectedList.length > 0 && matched > 0 && matched < selectedList.length;
                const isPreviewActive =
                  selectedList.length === 0 && previewOnlyIcon === opt.id;

                return (
                  <button
                    key={opt.id}
                    type="button"
                    onMouseEnter={() => setHoveredIcon(opt.id)}
                    onMouseLeave={() => setHoveredIcon(null)}
                    onClick={() => {
                      if (selectedList.length > 0) {
                        applyToSelected(opt.id);
                      } else {
                        setPreviewOnlyIcon(opt.id);
                      }
                    }}
                    title={
                      selectedList.length === 0
                        ? `Previsualizar ${opt.label} en el mapa`
                        : `Asignar ${opt.label} a ${selectedList.length} unidad(es)`
                    }
                    className={`relative flex flex-col items-center rounded-xl border px-1.5 py-2.5 text-center transition ${
                      isAll || isPreviewActive
                        ? 'border-[#113EB9] bg-blue-50/40 ring-1 ring-[#113EB9]/20'
                        : 'border-slate-200 bg-white hover:border-[#113EB9]/60 hover:bg-slate-50/60'
                    }`}
                  >
                    {isAll && (
                      <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#113EB9] text-white">
                        <Check size={10} className="stroke-[3]" />
                      </span>
                    )}
                    {isPartial && (
                      <span className="absolute right-1 top-1 rounded-full bg-amber-100 px-1 text-[9px] font-bold text-amber-700">
                        {matched}
                      </span>
                    )}

                    <div className="mb-1.5 flex h-10 w-12 items-center justify-center">
                      <img
                        src={PREVIEW_BY_ICON[opt.id]}
                        alt={opt.label}
                        className="h-10 w-10 object-contain"
                      />
                    </div>
                    <span className="text-[12px] font-bold text-slate-800">{opt.label}</span>
                    <span className="text-[10.5px] text-slate-500">
                      {loading ? '—' : `${counts[opt.id]} unid.`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <p className="text-[10.5px] leading-relaxed text-slate-400">
            {selectedList.length === 0
              ? 'Haz clic o pasa el mouse para previsualizar · selecciona unidades para aplicar.'
              : 'Pasa el mouse para previsualizar · clic para aplicar.'}
            <br />
            Shift + clic en la lista selecciona un rango.
          </p>
        </div>
      </div>

      <SaveBar dirty={dirty} saving={saving} saved={saved} onSave={save} onCancel={reset} />
    </div>
  );
}
