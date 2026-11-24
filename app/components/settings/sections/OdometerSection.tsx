'use client';

import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Check, Loader2, Pencil, RefreshCw, Search, X } from 'lucide-react';
import type { UnitOdometer } from '../types';
import { SettingsFooterContext } from '../ui';
import { PLATE_CLASS, plexSans } from '../fonts';
import { useAccountUnits } from '../useAccountUnits';
import { getCurrentUser } from '../useUserSettings';
import { useApi } from '@/context/ApiContext';
import {
  buildTraccarDeviceIndex,
  getTraccarAuthHeader,
  getTraccarDevices,
  getTraccarLatestPositions,
  getTraccarServerForUrl,
  updateTraccarAccumulators,
} from '@/app/trackvelnew/geocercas/traccarApi';

type ReportFilter = 'todas' | 'con' | 'sin';

const GRID_COLS = 'minmax(140px,1.4fr) minmax(130px,1fr) 170px 92px';
const NUM: React.CSSProperties = { fontVariantNumeric: 'tabular-nums' };

const MAX_KM = 10_000_000;
const SAVE_CONCURRENCY = 4;

const fmtKm = (n: number) =>
  n.toLocaleString('es-PE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const pad2 = (n: number) => String(n).padStart(2, '0');

/** dd/mm/aa · HH:mm */
const fmtDate = (iso: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${pad2(d.getFullYear() % 100)} · ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

/* Fecha del último ajuste hecho desde aquí (Traccar no la guarda) */
const adjustKey = (user: string) => `trackvel_odometer_adjust_${user || 'default'}`;

function loadAdjustDates(user: string): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(adjustKey(user)) || '{}') || {};
  } catch {
    return {};
  }
}

function saveAdjustDates(user: string, dates: Record<string, string>) {
  try {
    localStorage.setItem(adjustKey(user), JSON.stringify(dates));
  } catch {
    /* almacenamiento lleno o bloqueado */
  }
}

const errorMessage = (err: any, action: 'read' | 'save'): string => {
  const status = err?.response?.status;
  if (status === 401) return 'Credenciales de Traccar inválidas';
  if (status === 403) return 'Sin permiso sobre este dispositivo';
  if (status === 400) {
    // Traccar devuelve el stack de Java como texto: no se muestra al usuario
    console.warn('[Odómetro] Traccar 400:', err?.response?.data);
    return action === 'save'
      ? 'Traccar rechazó el ajuste (la unidad debe tener una posición reciente)'
      : 'Traccar rechazó la consulta (400)';
  }
  if (status) return `Traccar respondió ${status}`;
  return err?.message || 'Error de conexión';
};

/**
 * Odómetro por unidad, leído y ajustado directamente en Traccar
 * (PUT /api/devices/{id}/accumulators). Solo se listan las placas de la cuenta
 * en sesión y se buscan únicamente en el servidor Traccar que le corresponde.
 */
export default function OdometerSection() {
  const { baseUrl } = useApi();
  const { units, loading: unitsLoading, error: unitsError, reload: reloadUnits } = useAccountUnits();
  const traccarUrl = useMemo(() => getTraccarServerForUrl(baseUrl), [baseUrl]);

  const [rows, setRows] = useState<UnitOdometer[]>([]);
  const [traccarLoading, setTraccarLoading] = useState(false);
  const [traccarError, setTraccarError] = useState<string | null>(null);

  const [edits, setEdits] = useState<Record<string, number>>({});
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ReportFilter>('todas');
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  /* ---------------- Carga desde Traccar ---------------- */
  const loadFromTraccar = useCallback(async () => {
    if (units.length === 0) {
      setRows([]);
      return;
    }
    const auth = getTraccarAuthHeader();
    if (!auth) {
      setTraccarError('Las credenciales de Traccar no están configuradas');
      return;
    }
    setTraccarLoading(true);
    setTraccarError(null);
    try {
      const [devices, positions] = await Promise.all([
        getTraccarDevices(traccarUrl, auth),
        getTraccarLatestPositions(traccarUrl, auth),
      ]);
      const findDevice = buildTraccarDeviceIndex(devices);
      const matches = units.map((placa) => ({ placa, device: findDevice(placa) }));
      // Por deviceId: device.positionId puede apuntar a una posición ya depurada o desfasada
      const byDeviceId = new Map(positions.map((p) => [p.deviceId, p]));

      const dates = loadAdjustDates(getCurrentUser());
      setRows(
        matches.map(({ placa, device }) => {
          const pos = device ? byDeviceId.get(device.id) : undefined;
          const meters = Number(pos?.attributes?.totalDistance);
          const hours = Number(pos?.attributes?.hours);
          return {
            placa,
            traccarId: device?.id ?? null,
            traccarName: device?.name ?? null,
            hasPosition: !!pos,
            odometroKm: pos && Number.isFinite(meters) ? meters / 1000 : pos ? 0 : null,
            hoursMs: pos && Number.isFinite(hours) ? hours : null,
            ultimoReporte: pos?.fixTime || device?.lastUpdate || null,
            fechaAjuste: dates[placa] ?? null,
          };
        }),
      );
    } catch (err) {
      setTraccarError(`No se pudo consultar Traccar: ${errorMessage(err, 'read')}`);
    } finally {
      setTraccarLoading(false);
    }
  }, [units, traccarUrl]);

  useEffect(() => {
    if (!unitsLoading) loadFromTraccar();
  }, [unitsLoading, loadFromTraccar]);

  const refresh = () => {
    setEdits({});
    setRowErrors({});
    setEditing(null);
    reloadUnits();
    // Si la lista de placas no cambia, el efecto no se vuelve a disparar
    loadFromTraccar();
  };

  /* ---------------- Edición ---------------- */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (u) =>
        u.placa.toLowerCase().includes(q) || (u.traccarName || '').toLowerCase().includes(q),
    );
  }, [rows, query]);

  const dirty = Object.keys(edits).length > 0;

  const parsed = Number(editValue.replace(',', '.'));
  const validEdit =
    editValue.trim() !== '' && Number.isFinite(parsed) && parsed >= 0 && parsed < MAX_KM;

  const startEdit = (u: UnitOdometer) => {
    setEditing(u.placa);
    const current = edits[u.placa] ?? u.odometroKm ?? 0;
    setEditValue(String(Math.round(current * 10) / 10));
  };

  const applyEdit = (u: UnitOdometer) => {
    if (!validEdit) return;
    const km = Math.round(parsed * 10) / 10;
    setEdits((prev) => {
      const next = { ...prev };
      // Mismo valor que ya tiene en Traccar: no hay nada que guardar
      if (u.odometroKm != null && Math.abs(km - u.odometroKm) < 0.05) delete next[u.placa];
      else next[u.placa] = km;
      return next;
    });
    setRowErrors(({ [u.placa]: _drop, ...rest }) => rest);
    setEditing(null);
  };

  const discard = () => {
    setEdits({});
    setRowErrors({});
    setEditing(null);
  };

  /* ---------------- Guardado en Traccar ---------------- */
  const save = async () => {
    const auth = getTraccarAuthHeader();
    if (!auth) {
      setTraccarError('Las credenciales de Traccar no están configuradas');
      return;
    }
    const pending = rows.filter((r) => edits[r.placa] != null && r.traccarId != null);
    if (pending.length === 0) return;

    setSaving(true);
    setRowErrors({});
    const failures: Record<string, string> = {};
    const succeeded: string[] = [];

    for (let i = 0; i < pending.length; i += SAVE_CONCURRENCY) {
      const batch = pending.slice(i, i + SAVE_CONCURRENCY);
      const results = await Promise.allSettled(
        batch.map((r) =>
          updateTraccarAccumulators(
            traccarUrl,
            r.traccarId as number,
            edits[r.placa] * 1000,
            r.hoursMs,
            auth,
          ),
        ),
      );
      results.forEach((res, idx) => {
        const placa = batch[idx].placa;
        if (res.status === 'fulfilled') succeeded.push(placa);
        else failures[placa] = errorMessage(res.reason, 'save');
      });
    }

    if (succeeded.length > 0) {
      const user = getCurrentUser();
      const now = new Date().toISOString();
      const dates = loadAdjustDates(user);
      succeeded.forEach((p) => (dates[p] = now));
      saveAdjustDates(user, dates);
    }

    // Las que fallaron quedan pendientes para reintentar
    setEdits((prev) => {
      const next: Record<string, number> = {};
      Object.keys(failures).forEach((p) => {
        if (prev[p] != null) next[p] = prev[p];
      });
      return next;
    });
    setRowErrors(failures);
    setSaving(false);

    if (Object.keys(failures).length === 0) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
    // Se vuelve a leer de Traccar para mostrar el valor real que quedó
    await loadFromTraccar();
  };

  /* ---------------- Render ---------------- */
  const footerEl = useContext(SettingsFooterContext);
  const loading = unitsLoading || traccarLoading;
  const error = unitsError || traccarError;
  const failedCount = Object.keys(rowErrors).length;
  const pendingCount = Object.keys(edits).length;

  const linkedCount = rows.filter((r) => r.traccarId != null).length;
  const withReport = rows.filter((r) => r.hasPosition).length;
  const withoutReport = rows.length - withReport;

  const visible = filtered.filter((u) =>
    filter === 'con' ? u.hasPosition : filter === 'sin' ? !u.hasPosition : true,
  );

  const segments: { id: ReportFilter; label: string; count: number }[] = [
    { id: 'todas', label: 'Todas', count: rows.length },
    { id: 'con', label: 'Con reporte', count: withReport },
    { id: 'sin', label: 'Sin reporte', count: withoutReport },
  ];

  const footer = (
    <div className="-mx-5 -my-3 flex items-center gap-2 bg-[#f8fafc] px-[18px] py-3 sm:-mx-6">
      <span
        className="h-[7px] w-[7px] shrink-0 rounded-full"
        style={{ background: dirty ? '#f97316' : '#cbd5e1' }}
      />
      <span className="mr-auto text-[12px] text-[#64748b]" style={NUM}>
        {saving
          ? 'Guardando en el servidor de odómetro...'
          : saved && !dirty
            ? 'Cambios guardados'
            : pendingCount === 0
              ? 'Sin cambios pendientes'
              : pendingCount === 1
                ? '1 unidad ajustada sin guardar'
                : `${pendingCount} unidades ajustadas sin guardar`}
      </span>
      <button
        type="button"
        onClick={discard}
        disabled={!dirty || saving}
        className="h-[34px] rounded-[6px] border border-[#cbd5e1] bg-white px-[14px] text-[12.5px] font-semibold text-[#475569] transition hover:bg-[#f1f5f9] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
      >
        Descartar
      </button>
      <button
        type="button"
        onClick={save}
        disabled={!dirty || saving}
        className="flex h-[34px] items-center gap-1.5 rounded-[6px] bg-[#1447c0] px-4 text-[12.5px] font-semibold text-white transition hover:bg-[#0e3494] disabled:cursor-not-allowed disabled:bg-[#e2e8f0] disabled:text-[#94a3b8]"
      >
        {saving && <Loader2 size={13} className="animate-spin" />}
        Guardar cambios
      </button>
    </div>
  );

  return (
    <div className={`${plexSans.className} text-[#0f172a]`}>
      {/* Encabezado + contadores */}
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-[15px] font-bold text-[#0f172a]">Odómetro de unidades</h3>
          <p className="mt-0.5 text-[12.5px] leading-[1.45] text-[#64748b]">
            Ingresa el valor que marca el tablero. Desde ese momento el sistema suma la distancia
            recorrida por GPS.
          </p>
        </div>
        <div className="flex shrink-0 items-stretch gap-4" style={NUM}>
          <div className="text-right">
            <p className="text-[18px] font-bold leading-tight text-[#0f172a]">
              {linkedCount}
              <span className="text-[12px] font-semibold text-[#94a3b8]"> / {rows.length}</span>
            </p>
            <p className="text-[10px] font-bold uppercase tracking-[.06em] text-[#64748b]">
              Vinculadas
            </p>
          </div>
          <div className="w-px bg-[#e2e8f0]" />
          <div className="text-right">
            <p className="text-[18px] font-bold leading-tight text-[#b45309]">{withoutReport}</p>
            <p className="text-[10px] font-bold uppercase tracking-[.06em] text-[#64748b]">
              Sin reporte
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-3 flex items-start gap-2 rounded-[8px] border border-[#fecaca] bg-[#fef2f2] px-3 py-2.5 text-[12px] text-[#b91c1c]">
          <AlertTriangle size={14} strokeWidth={2.2} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {failedCount > 0 && (
        <div className="mb-3 flex items-start gap-2 rounded-[8px] border border-[#fde68a] bg-[#fffbeb] px-3 py-2.5 text-[12px] text-[#b45309]">
          <AlertTriangle size={14} strokeWidth={2.2} className="mt-0.5 shrink-0" />
          <span>
            {failedCount === 1
              ? 'No se pudo ajustar 1 unidad. Revisa el detalle en la tabla y vuelve a guardar.'
              : `No se pudieron ajustar ${failedCount} unidades. Revisa el detalle en la tabla y vuelve a guardar.`}
          </span>
        </div>
      )}

      {/* Filtros */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="flex h-[34px] min-w-[180px] flex-1 items-center gap-2 rounded-[6px] border border-[#cbd5e1] bg-white px-[10px] focus-within:border-[#1447c0] focus-within:shadow-[0_0_0_3px_rgba(20,71,192,.12)]">
          <Search size={14} strokeWidth={2.2} className="shrink-0 text-[#94a3b8]" />
          <input
            className="h-full w-full bg-transparent text-[12.5px] font-medium text-[#0f172a] outline-none placeholder:text-[#94a3b8]"
            placeholder="Buscar por placa"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>

        <div className="flex rounded-[7px] bg-[#f1f5f9] p-[2px]" style={NUM}>
          {segments.map((s) => {
            const active = filter === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setFilter(s.id)}
                className={`h-[30px] rounded-[5px] px-[10px] text-[12px] font-semibold transition ${
                  active
                    ? 'bg-white text-[#1447c0] shadow-[0_1px_2px_rgba(15,23,42,.12)]'
                    : 'text-[#64748b] hover:text-[#0f172a]'
                }`}
              >
                {s.label} <span className="ml-1 font-bold">{s.count}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={refresh}
          disabled={loading || saving}
          title="Volver a leer del servidor de odómetro"
          className="flex h-[34px] w-[34px] items-center justify-center rounded-[6px] border border-[#cbd5e1] bg-white text-[#475569] transition hover:border-[#1447c0] hover:text-[#1447c0] disabled:opacity-50"
        >
          <RefreshCw size={15} strokeWidth={2.2} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-[8px] border border-[#e2e8f0]">
        <div className="max-h-[max(260px,calc(100vh-330px))] overflow-y-auto">
          <div
            className="sticky top-0 z-10 grid h-8 items-center gap-x-3 bg-[#f8fafc] pl-[14px] pr-3 text-[10px] font-bold uppercase tracking-[.06em] text-[#64748b] shadow-[inset_0_-1px_0_#e2e8f0]"
            style={{ gridTemplateColumns: GRID_COLS }}
          >
            <span>Unidad</span>
            <span>Último reporte</span>
            <span className="text-right">Odómetro</span>
            <span />
          </div>

          {loading && rows.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-[12px] text-[#94a3b8]">
              <Loader2 size={18} className="animate-spin" />
              Cargando unidades y odómetros...
            </div>
          )}

          {visible.map((u) => {
            const isEditing = editing === u.placa;
            const pendingKm = edits[u.placa];
            const changed = pendingKm != null;
            const rowError = rowErrors[u.placa];
            const linked = u.traccarId != null;
            const canAdjust = linked && u.hasPosition;
            const shownKm = changed ? pendingKm : u.odometroKm;

            const rowStyle = isEditing
              ? 'bg-[#eef3fd] shadow-[inset_3px_0_0_#1447c0]'
              : changed || rowError
                ? 'bg-[#fffaf5] shadow-[inset_3px_0_0_#f97316]'
                : 'hover:bg-[#f8fafc]';

            return (
              <div
                key={u.placa}
                className={`grid min-h-[44px] items-center gap-x-3 border-b border-[#f1f5f9] py-1.5 pl-[14px] pr-3 last:border-b-0 ${rowStyle}`}
                style={{ gridTemplateColumns: GRID_COLS }}
              >
                {/* Unidad */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`truncate ${PLATE_CLASS}`}>
                      {u.placa}
                    </span>
                    {changed && (
                      <span className="inline-flex h-[18px] shrink-0 items-center rounded-[4px] bg-[#fff4ea] px-1.5 text-[10px] font-bold uppercase text-[#c2410c]">
                        Editado
                      </span>
                    )}
                  </div>
                  {rowError && (
                    <p className="mt-0.5 truncate text-[11px] text-[#b91c1c]" title={rowError}>
                      {rowError}
                    </p>
                  )}
                </div>

                {/* Último reporte */}
                <div className="min-w-0 truncate text-[12px]" style={NUM}>
                  {!linked ? (
                    <span className="text-[#94a3b8]">Sin vincular en Traccar</span>
                  ) : !u.hasPosition ? (
                    <span className="text-[#94a3b8]">Sin posiciones reportadas</span>
                  ) : (
                    <span className="text-[#475569]">{fmtDate(u.ultimoReporte)}</span>
                  )}
                </div>

                {/* Odómetro */}
                <div className="flex justify-end" style={NUM}>
                  {isEditing ? (
                    <div
                      className={`flex h-[30px] w-[150px] overflow-hidden rounded-[6px] border bg-white shadow-[0_0_0_3px_rgba(20,71,192,.12)] ${
                        validEdit ? 'border-[#1447c0]' : 'border-[#dc2626]'
                      }`}
                    >
                      <input
                        autoFocus
                        inputMode="decimal"
                        className="w-full min-w-0 bg-transparent px-2 text-right text-[12.5px] font-bold text-[#0f172a] outline-none"
                        style={NUM}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value.replace(/[^\d.,]/g, ''))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') applyEdit(u);
                          if (e.key === 'Escape') setEditing(null);
                        }}
                      />
                      <span className="flex items-center border-l border-[#e2e8f0] bg-[#f8fafc] px-2 text-[11px] font-medium text-[#94a3b8]">
                        km
                      </span>
                    </div>
                  ) : shownKm != null ? (
                    <span
                      className={`text-[13px] font-bold ${changed ? 'text-[#c2410c]' : 'text-[#0f172a]'}`}
                    >
                      {fmtKm(shownKm)}
                      <span className="ml-[3px] text-[11px] font-medium text-[#94a3b8]">km</span>
                    </span>
                  ) : (
                    <span className="text-[13px] font-medium text-[#cbd5e1]">—</span>
                  )}
                </div>

                {/* Acción */}
                <div className="flex justify-end gap-1">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={() => applyEdit(u)}
                        disabled={!validEdit}
                        title="Aplicar (Enter)"
                        className="flex h-[30px] w-[30px] items-center justify-center rounded-[6px] bg-[#1447c0] text-white transition hover:bg-[#0e3494] disabled:opacity-40"
                      >
                        <Check size={15} strokeWidth={2.2} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(null)}
                        title="Cancelar (Esc)"
                        className="flex h-[30px] w-[30px] items-center justify-center rounded-[6px] text-[#64748b] transition hover:bg-[#e2e8f0] hover:text-[#0f172a]"
                      >
                        <X size={15} strokeWidth={2.2} />
                      </button>
                    </>
                  ) : (
                    canAdjust && (
                      <button
                        type="button"
                        onClick={() => startEdit(u)}
                        disabled={saving}
                        className="flex h-[30px] items-center gap-1.5 rounded-[6px] px-[10px] text-[12px] font-semibold text-[#1447c0] transition hover:bg-[#eef3fd] disabled:opacity-40"
                      >
                        <Pencil size={13} strokeWidth={2.2} /> Ajustar
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}

          {!loading && visible.length === 0 && (
            <div className="py-10 text-center text-[12px] text-[#94a3b8]">
              {rows.length === 0 ? 'La cuenta no tiene unidades' : 'No se encontraron unidades'}
            </div>
          )}
        </div>
      </div>

      {footerEl ? (
        createPortal(footer, footerEl)
      ) : (
        <div className="mt-3 border-t border-[#e2e8f0] px-5 py-3 sm:px-6">{footer}</div>
      )}
     </div>
  );
}
