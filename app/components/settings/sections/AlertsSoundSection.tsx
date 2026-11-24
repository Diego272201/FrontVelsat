'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Volume2, VolumeX, Play, Moon, Plus, Trash2, BellOff, Loader2 } from 'lucide-react';
import type {
  AlertsSettings,
  AlertSoundConfig,
  AlertTypeId,
  SoundId,
} from '../types';
import { SOUND_OPTIONS, defaultAlertConfig } from '../mockData';
import { useAlertCatalog } from '../alertCatalog';
import { getAlertVisual, SEVERITY_LABEL } from '../alertVisuals';
import { playSound } from '../soundPlayer';
import { SaveBar, SectionHeader, Toggle, useDraft } from '../ui';

interface Props {
  value: AlertsSettings;
  onSave: (v: AlertsSettings) => Promise<void>;
}

export default function AlertsSoundSection({ value, onSave }: Props) {
  const { draft, setDraft, dirty, saving, saved, save, reset } = useDraft(
    value,
    onSave,
  );
  const updateItem = (type: AlertTypeId, patch: Partial<AlertSoundConfig>) =>
    setDraft((d) => ({
      ...d,
      items: d.items.map((it) => (it.type === type ? { ...it, ...patch } : it)),
    }));

  const preview = (sound: SoundId, volume: number) =>
    playSound(sound, volume, draft.masterVolume);

  // ---- Mis notificaciones: agregar y quitar
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const addedTypes = useMemo(
    () => new Set(draft.items.map((i) => i.type)),
    [draft.items],
  );
  // Catálogo del servidor: todo lo que la cuenta puede agregar
  const { catalog, loading: catalogLoading } = useAlertCatalog();
  const catalogByKey = useMemo(
    () => new Map(catalog.map((c) => [c.eventKey, c])),
    [catalog],
  );
  const notAdded = catalog.filter((c) => !addedTypes.has(c.eventKey));

  // Cerrar el catálogo al hacer clic fuera o con Escape
  useEffect(() => {
    if (!pickerOpen) return;
    const onDown = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node))
        setPickerOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [pickerOpen]);

  const addNotification = (type: AlertTypeId) => {
    setDraft((d) =>
      d.items.some((i) => i.type === type)
        ? d
        : { ...d, items: [...d.items, defaultAlertConfig(type)] },
    );
    setPickerOpen(false);
  };

  const removeNotification = (type: AlertTypeId) =>
    setDraft((d) => ({ ...d, items: d.items.filter((i) => i.type !== type) }));

  // Renderizador de cada fila de alerta
  const renderRow = (it: AlertSoundConfig) => {
    const item = catalogByKey.get(it.type);
    const meta = { title: item?.nombre ?? it.type, description: item?.descripcion ?? '' };
    const visual = getAlertVisual(it.type, item?.severidad);
    const Icon = visual.icon;
    const disabled = draft.muteAll;

    // Sub-descripción dinámica para velocidad
    let dynamicSubtitle = meta.description;
    if (it.type === 'deviceOverspeed') {
      dynamicSubtitle =
        draft.speedLimits.mode === 'general'
          ? `Se activa desde ${draft.speedLimits.generalLimit} km/h (pestaña Límites de velocidad)`
          : 'Se activa según el límite de cada vehículo (pestaña Límites de velocidad)';
    }

    return (
      <div
        key={it.type}
        className="rounded-xl border border-slate-200 bg-white p-3 transition"
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${visual.chip}`}
          >
            <Icon size={15} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[12.5px] font-bold text-slate-800">
              {meta.title}
              {item?.severidad === 'critical' && (
                <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-rose-700">
                  {SEVERITY_LABEL.critical}
                </span>
              )}
            </p>
            <p className="text-[11px] text-slate-500">{dynamicSubtitle}</p>
          </div>
          <button
            type="button"
            onClick={() => removeNotification(it.type)}
            title={`Quitar ${meta.title} de mis notificaciones`}
            className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 size={13} />
            Quitar
          </button>
        </div>

        {/* Sonido propio de esta notificación */}
        <div className="mt-3 grid grid-cols-1 items-center gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2">
          <div className="flex items-center gap-1.5">
            <select
              value={it.sound}
              disabled={disabled}
              onChange={(e) => {
                const s = e.target.value as SoundId;
                updateItem(it.type, { sound: s });
                preview(s, it.volume);
              }}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[12px] outline-none focus:border-[#113EB9]"
            >
              {SOUND_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              title="Probar sonido"
              disabled={disabled || it.sound === 'none'}
              onClick={() => preview(it.sound, it.volume)}
              className="rounded-lg border border-slate-200 p-1.5 text-[#113EB9] hover:bg-blue-50 disabled:opacity-40"
            >
              <Play size={14} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Volume2 size={14} className="shrink-0 text-slate-400" />
            <input
              type="range"
              min={0}
              max={100}
              value={it.volume}
              disabled={disabled || it.sound === 'none'}
              onChange={(e) =>
                updateItem(it.type, { volume: Number(e.target.value) })
              }
              className="w-full accent-[#113EB9]"
            />
            <span className="w-8 text-right text-[11px] text-slate-500">
              {it.volume}%
            </span>
          </div>

          {/* El aviso en pantalla siempre aparece; aquí solo se elige si el sonido se repite */}
          <label className="flex items-center gap-2 text-[11.5px] text-slate-600 sm:col-span-2">
            <Toggle
              checked={it.loop}
              disabled={disabled || it.sound === 'none'}
              onChange={(v) => updateItem(it.type, { loop: v })}
              label="Repetir el sonido hasta presionar OK"
            />
            <span>
              Repetir el sonido hasta presionar <strong>OK</strong> en el aviso
              <span className="text-slate-400">
                {' '}
                (si está apagado, suena una sola vez)
              </span>
            </span>
          </label>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Alertas y sonidos"
        description="Agrega las notificaciones que quieres recibir y elige el sonido de cada una"
      />

      {/* ============================================================== */}
      {/* 1. CONTROLES GENERALES DE AUDIO Y MODO NO MOLESTAR */}
      {/* ============================================================== */}
      <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => setDraft((d) => ({ ...d, muteAll: !d.muteAll }))}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
              draft.muteAll
                ? 'bg-red-100 text-red-700'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            {draft.muteAll ? <VolumeX size={15} /> : <Volume2 size={15} />}
            {draft.muteAll ? 'Sonidos silenciados' : 'Silenciar todo'}
          </button>

          <div className="flex flex-1 items-center gap-2">
            <span className="whitespace-nowrap text-[11.5px] font-semibold text-slate-600">
              Volumen general
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={draft.masterVolume}
              disabled={draft.muteAll}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  masterVolume: Number(e.target.value),
                }))
              }
              className="w-full accent-[#113EB9]"
            />
            <span className="w-9 text-right text-[11px] text-slate-500">
              {draft.masterVolume}%
            </span>
          </div>
        </div>

        {/* Horario de silencio / Modo "No molestar" */}
        <div className="border-t border-slate-200/80 pt-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <Moon size={15} />
              </div>
              <div>
                <p className="text-[12.5px] font-bold text-slate-800">
                  Modo &ldquo;No molestar&rdquo; (Horario de silencio)
                </p>
                <p className="text-[11px] text-slate-500">
                  Silencia automáticamente los sonidos durante la noche o tu
                  guardia para no saturar
                </p>
              </div>
            </div>
            <Toggle
              checked={draft.quietHours.enabled}
              onChange={(v) =>
                setDraft((d) => ({
                  ...d,
                  quietHours: { ...d.quietHours, enabled: v },
                }))
              }
              label="Activar horario de silencio"
            />
          </div>

          {draft.quietHours.enabled && (
            <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-2.5 text-xs">
              <span className="font-semibold text-slate-700">
                Silenciar automáticamente desde:
              </span>
              <input
                type="time"
                value={draft.quietHours.startTime}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    quietHours: { ...d.quietHours, startTime: e.target.value },
                  }))
                }
                className="rounded border border-slate-200 px-2 py-1 text-xs font-bold text-slate-800 outline-none focus:border-[#113EB9]"
              />
              <span className="font-semibold text-slate-700">hasta las:</span>
              <input
                type="time"
                value={draft.quietHours.endTime}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    quietHours: { ...d.quietHours, endTime: e.target.value },
                  }))
                }
                className="rounded border border-slate-200 px-2 py-1 text-xs font-bold text-slate-800 outline-none focus:border-[#113EB9]"
              />
              <span className="text-[11px] text-slate-400">
                (Las alertas visuales seguirán apareciendo en pantalla)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. MIS NOTIFICACIONES: agregar, quitar y configurar el sonido  */}
      {/* ============================================================== */}
      <div>
        <div className="mb-2 flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Mis notificaciones
              <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                {draft.items.length}
              </span>
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Solo te llegarán las alertas que agregues aquí (se guarda en tu cuenta)
            </p>
          </div>

          <div className="relative" ref={pickerRef}>
            <button
              type="button"
              onClick={() => setPickerOpen((o) => !o)}
              disabled={notAdded.length === 0}
              title={
                notAdded.length === 0
                  ? 'Ya agregaste todas las notificaciones'
                  : undefined
              }
              className="flex items-center gap-1.5 rounded-lg bg-[#113EB9] px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#0d32a0] disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Plus size={14} />
              Agregar notificación
            </button>

            {pickerOpen && (
              <div className="absolute right-0 top-full z-30 mt-1.5 w-[300px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                <p className="border-b border-slate-100 px-3 py-2 text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                  Elige qué quieres que te notifique
                </p>
                {catalogLoading && (
                  <p className="flex items-center gap-1.5 border-b border-slate-100 px-3 py-2 text-[11px] text-slate-500">
                    <Loader2 size={12} className="animate-spin" /> Actualizando catálogo…
                  </p>
                )}
                <div className="max-h-[340px] overflow-y-auto py-1">
                  {notAdded.map((c) => {
                    const visual = getAlertVisual(c.eventKey, c.severidad);
                    const Icon = visual.icon;
                    return (
                      <button
                        key={c.eventKey}
                        type="button"
                        onClick={() => addNotification(c.eventKey)}
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition hover:bg-blue-50/60"
                      >
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${visual.chip}`}
                        >
                          <Icon size={14} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span className="text-[12px] font-bold text-slate-800">
                              {c.nombre}
                            </span>
                            {c.severidad === 'critical' && (
                              <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-rose-700">
                                {SEVERITY_LABEL.critical}
                              </span>
                            )}
                          </span>
                          <span className="block truncate text-[10.5px] text-slate-500">
                            {c.descripcion}
                          </span>
                        </span>
                        <Plus size={14} className="shrink-0 text-[#113EB9]" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {draft.items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-8 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-[#113EB9]">
              <BellOff size={18} />
            </div>
            <p className="text-[12.5px] font-bold text-slate-700">
              No tienes notificaciones
            </p>
            <p className="max-w-[320px] text-[11.5px] text-slate-500">
              No te llegará ninguna alerta. Agrega las que quieras recibir, por
              ejemplo entrada o salida de geocerca, exceso de velocidad o botón
              de pánico. Luego podrás elegir el sonido de cada una.
            </p>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="mt-1 flex items-center gap-1.5 rounded-lg border border-[#113EB9] px-3 py-1.5 text-[12px] font-semibold text-[#113EB9] hover:bg-blue-50"
            >
              <Plus size={14} /> Agregar notificación
            </button>
          </div>
        ) : (
          <div className="space-y-2">{draft.items.map(renderRow)}</div>
        )}
      </div>

      <SaveBar
        dirty={dirty}
        saving={saving}
        saved={saved}
        onSave={save}
        onCancel={reset}
      />
    </div>
  );
}
