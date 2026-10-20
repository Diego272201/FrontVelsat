'use client';

import React, { useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  ArrowRight,
  ArrowLeft,
  Gauge,
  Power,
  PowerOff,
  Siren,
  BatteryLow,
  WifiOff,
  Moon,
  Clock,
  Sliders,
} from 'lucide-react';
import type {
  AlertsSettings,
  AlertSoundConfig,
  AlertTypeId,
  SoundId,
  VehicleIconId,
} from '../types';
import { ALERT_LABELS, SOUND_OPTIONS, VEHICLE_ICON_LABELS, isCurrentlyQuietHours } from '../mockData';
import { playSound } from '../soundPlayer';
import { SaveBar, SectionHeader, Toggle, inputClass, useDraft } from '../ui';
import { VEHICLE_ICONS } from './UnitIconsSection';

const ALERT_ICONS: Record<AlertTypeId, { icon: React.ElementType; cls: string }> = {
  geofenceEnter: { icon: ArrowRight, cls: 'bg-emerald-50 text-emerald-600' },
  geofenceExit: { icon: ArrowLeft, cls: 'bg-red-50 text-red-600' },
  overspeed: { icon: Gauge, cls: 'bg-orange-50 text-orange-600' },
  ignitionOn: { icon: Power, cls: 'bg-lime-50 text-lime-600' },
  ignitionOff: { icon: PowerOff, cls: 'bg-slate-100 text-slate-600' },
  panic: { icon: Siren, cls: 'bg-rose-50 text-rose-600' },
  lowBattery: { icon: BatteryLow, cls: 'bg-amber-50 text-amber-600' },
  disconnect: { icon: WifiOff, cls: 'bg-violet-50 text-violet-600' },
};

interface Props {
  value: AlertsSettings;
  onSave: (v: AlertsSettings) => Promise<void>;
}

export default function AlertsSoundSection({ value, onSave }: Props) {
  const { draft, setDraft, dirty, saving, saved, save, reset } = useDraft(value, onSave);
  const [isQuietNow, setIsQuietNow] = useState(false);

  // Comprobar periódicamente si el horario de silencio está activo ahora
  useEffect(() => {
    const check = () => setIsQuietNow(isCurrentlyQuietHours(draft.quietHours));
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [draft.quietHours]);

  const updateItem = (type: AlertTypeId, patch: Partial<AlertSoundConfig>) =>
    setDraft((d) => ({
      ...d,
      items: d.items.map((it) => (it.type === type ? { ...it, ...patch } : it)),
    }));

  const preview = (sound: SoundId, volume: number) =>
    playSound(sound, volume, draft.masterVolume);

  const available = draft.items.filter((i) => i.available);
  const upcoming = draft.items.filter((i) => !i.available);

  // Renderizador de cada fila de alerta
  const renderRow = (it: AlertSoundConfig) => {
    const meta = ALERT_LABELS[it.type] || { title: it.type, description: '' };
    const iconData = ALERT_ICONS[it.type] || { icon: Gauge, cls: 'bg-slate-50 text-slate-600' };
    const Icon = iconData.icon;
    const disabled = !it.available || draft.muteAll;

    // Sub-descripción dinámica para velocidad
    let dynamicSubtitle = meta.description;
    if (it.type === 'overspeed') {
      dynamicSubtitle =
        draft.speedLimits.mode === 'general'
          ? `Límite general actual: ${draft.speedLimits.generalLimit} km/h`
          : 'Límites diferenciados configurados por tipo de vehículo';
    }

    return (
      <div
        key={it.type}
        className={`rounded-xl border border-slate-200 p-3 transition ${
          !it.available ? 'opacity-60' : 'bg-white'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconData.cls}`}>
            <Icon size={15} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-[12.5px] font-bold text-slate-800">{meta.title}</p>
              {!it.available && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9.5px] font-bold uppercase text-slate-500">
                  Próximamente
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">{dynamicSubtitle}</p>
          </div>
          <Toggle
            checked={it.enabled}
            disabled={!it.available}
            onChange={(v) => updateItem(it.type, { enabled: v })}
            label={`Activar ${meta.title}`}
          />
        </div>

        {it.enabled && it.available && (
          <div className="mt-3 grid grid-cols-1 items-center gap-3 border-t border-slate-100 pt-3 sm:grid-cols-[1fr_1fr_auto]">
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
                onChange={(e) => updateItem(it.type, { volume: Number(e.target.value) })}
                className="w-full accent-[#113EB9]"
              />
              <span className="w-8 text-right text-[11px] text-slate-500">{it.volume}%</span>
            </div>

            <label className="flex items-center gap-2 text-[11.5px] text-slate-600">
              <Toggle
                checked={it.popup}
                onChange={(v) => updateItem(it.type, { popup: v, loop: v ? it.loop : false })}
                label="Notificación emergente"
              />
              Emergente
            </label>

            <label
              className={`flex items-center gap-2 text-[11.5px] text-slate-600 sm:col-span-3 ${
                !it.popup ? 'opacity-50' : ''
              }`}
            >
              <Toggle
                checked={it.loop && it.popup}
                disabled={!it.popup || it.sound === 'none'}
                onChange={(v) => updateItem(it.type, { loop: v })}
                label="Repetir hasta confirmar"
              />
              <span>
                Repetir el sonido hasta presionar <strong>OK</strong> en la notificación
                {!it.popup && ' (requiere notificación emergente)'}
              </span>
            </label>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Alertas y sonidos"
        description="Configura los umbrales de velocidad, horarios de silencio y sonidos de alertas del sistema"
      />

      {/* ============================================================== */}
      {/* 1. CONTROLES GENERALES DE AUDIO Y MODO NO MOLESTAR */}
      {/* ============================================================== */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
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
              onChange={(e) => setDraft((d) => ({ ...d, masterVolume: Number(e.target.value) }))}
              className="w-full accent-[#113EB9]"
            />
            <span className="w-9 text-right text-[11px] text-slate-500">{draft.masterVolume}%</span>
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
                <div className="flex items-center gap-2">
                  <p className="text-[12.5px] font-bold text-slate-800">
                    Modo "No molestar" (Horario de silencio)
                  </p>
                  {draft.quietHours.enabled && (
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9.5px] font-bold ${
                        isQuietNow
                          ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {isQuietNow ? '● Silencio activo ahora' : 'Programado'}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  Silencia automáticamente los sonidos durante la noche o tu guardia para no saturar
                </p>
              </div>
            </div>
            <Toggle
              checked={draft.quietHours.enabled}
              onChange={(v) =>
                setDraft((d) => ({ ...d, quietHours: { ...d.quietHours, enabled: v } }))
              }
              label="Activar horario de silencio"
            />
          </div>

          {draft.quietHours.enabled && (
            <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg bg-white p-2.5 border border-slate-200 text-xs">
              <span className="font-semibold text-slate-700">Silenciar automáticamente desde:</span>
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
      {/* 2. CONFIGURACIÓN DE LÍMITES DE VELOCIDAD */}
      {/* ============================================================== */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
              <Gauge size={16} />
            </div>
            <div>
              <p className="text-[13px] font-bold text-slate-800">
                Límites de velocidad para alertas
              </p>
              <p className="text-[11px] text-slate-500">
                Define cuándo una unidad activa la alerta de exceso de velocidad
              </p>
            </div>
          </div>

          {/* Selector de modo: General vs Por tipo */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[11.5px] font-semibold">
            <button
              type="button"
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  speedLimits: { ...d.speedLimits, mode: 'general' },
                }))
              }
              className={`rounded-md px-3 py-1 transition ${
                draft.speedLimits.mode === 'general'
                  ? 'bg-white text-[#113EB9] font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              General (toda la flota)
            </button>
            <button
              type="button"
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  speedLimits: { ...d.speedLimits, mode: 'byType' },
                }))
              }
              className={`rounded-md px-3 py-1 transition ${
                draft.speedLimits.mode === 'byType'
                  ? 'bg-white text-[#113EB9] font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Por tipo de vehículo
            </button>
          </div>
        </div>

        {/* Vista: Modo General */}
        {draft.speedLimits.mode === 'general' ? (
          <div className="mt-3.5 flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg bg-slate-50/70 p-3">
            <div className="flex-1">
              <p className="text-[12px] font-semibold text-slate-700">
                Límite único de velocidad:
              </p>
              <p className="text-[10.5px] text-slate-400">
                Cualquier unidad que alcance o supere este valor disparará la alerta
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={40}
                max={120}
                step={5}
                value={draft.speedLimits.generalLimit}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    speedLimits: {
                      ...d.speedLimits,
                      generalLimit: Number(e.target.value),
                    },
                  }))
                }
                className="w-36 accent-[#113EB9]"
              />
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={30}
                  max={150}
                  value={draft.speedLimits.generalLimit}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      speedLimits: {
                        ...d.speedLimits,
                        generalLimit: Math.max(30, Math.min(160, Number(e.target.value) || 30)),
                      },
                    }))
                  }
                  className="w-16 rounded-md border border-slate-200 bg-white px-2 py-1 text-center font-bold text-slate-800 text-xs"
                />
                <span className="text-xs font-semibold text-slate-500">km/h</span>
              </div>
            </div>
          </div>
        ) : (
          /* Vista: Modo por Tipo de Vehículo */
          <div className="mt-3.5 space-y-2">
            <p className="text-[11px] text-slate-500">
              Define umbrales diferenciados según el tipo de unidad configurado en la pestaña "Íconos":
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {(Object.keys(VEHICLE_ICONS) as VehicleIconId[]).map((typeId) => {
                const IconComponent = VEHICLE_ICONS[typeId];
                const currentLimit = draft.speedLimits.byType[typeId] ?? 90;
                return (
                  <div
                    key={typeId}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/60 p-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white border border-slate-200 text-slate-700 shadow-2xs">
                        <IconComponent size={14} />
                      </div>
                      <span className="truncate text-[11.5px] font-semibold text-slate-700">
                        {VEHICLE_ICON_LABELS[typeId]}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <input
                        type="number"
                        min={30}
                        max={160}
                        step={5}
                        value={currentLimit}
                        onChange={(e) => {
                          const val = Math.max(30, Math.min(160, Number(e.target.value) || 30));
                          setDraft((d) => ({
                            ...d,
                            speedLimits: {
                              ...d.speedLimits,
                              byType: {
                                ...d.speedLimits.byType,
                                [typeId]: val,
                              },
                            },
                          }));
                        }}
                        className="w-14 rounded border border-slate-200 bg-white px-1.5 py-1 text-center text-xs font-bold text-slate-800 outline-none focus:border-[#113EB9]"
                      />
                      <span className="text-[10px] text-slate-400">km/h</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 3. LISTADO DE ALERTAS ACTIVAS Y PRÓXIMAS */}
      {/* ============================================================== */}
      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Tipos de alerta disponibles
        </p>
        <div className="space-y-2">{available.map(renderRow)}</div>
      </div>

      {upcoming.length > 0 && (
        <div>
          <p className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Próximas alertas en desarrollo
          </p>
          <div className="space-y-2">{upcoming.map(renderRow)}</div>
        </div>
      )}

      <SaveBar dirty={dirty} saving={saving} saved={saved} onSave={save} onCancel={reset} />
    </div>
  );
}
