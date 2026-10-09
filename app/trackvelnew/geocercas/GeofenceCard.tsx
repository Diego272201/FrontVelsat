'use client';
import React from 'react';
import {
  AlertTriangle,
  Check,
  Crosshair,
  Move,
  Pencil,
  Radio,
  Trash2,
  X,
} from 'lucide-react';
import { WhatsAppIcon } from './WhatsAppIcon';
import { Geofence, Vehicle, formatDistance } from './types';

interface GeofenceCardProps {
  geofence: Geofence;
  vehicles: Vehicle[];
  selected: boolean;
  editingShape: boolean;
  onSelect: (id: string) => void;
  onCenter: (geofence: Geofence) => void;
  onEditDetails: (geofence: Geofence) => void;
  onConfigureWhatsApp?: (geofence: Geofence) => void;
  onEditShape: (geofence: Geofence) => void;
  onSaveShape: () => void;
  onCancelShape: () => void;
  onDelete: (geofence: Geofence) => void;
  onSyncVehiclesToTraccar?: (geofence: Geofence) => void;
  onImportTraccarVehicles?: (geofence: Geofence) => void;
}

const actionBtn =
  'flex h-7 w-7 items-center justify-center rounded-[5px] text-slate-600 transition-colors hover:bg-white/70 hover:text-[#1447c0]';

export default function GeofenceCard({
  geofence,
  vehicles,
  selected,
  editingShape,
  onSelect,
  onCenter,
  onEditDetails,
  onConfigureWhatsApp,
  onEditShape,
  onSaveShape,
  onCancelShape,
  onDelete,
  onSyncVehiclesToTraccar,
  onImportTraccarVehicles,
}: GeofenceCardProps) {
  const assigned = geofence.vehicleIds.map(
    (id) => vehicles.find((v) => v.id === id) || { id, label: id, position: { lat: 0, lng: 0 } },
  );
  const traccarOnly = geofence.traccarOnlyVehicleIds ?? [];
  const unconfirmed = (geofence.unconfirmedVehicleIds ?? []).filter((id) =>
    geofence.vehicleIds.includes(id),
  );
  const totalUnits = assigned.length + traccarOnly.length;

  const shapeLabel =
    geofence.type === 'circle'
      ? `Círculo · ${formatDistance(geofence.radius || 0)}`
      : `Polígono · ${geofence.path?.length || 0} vértices`;

  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };

  return (
    <div
      onClick={() => onSelect(geofence.id)}
      className={`cursor-pointer rounded-r-[6px] px-3 pb-3 pt-2.5 transition-colors ${
        selected
          ? 'bg-[#dbe6fb] shadow-[inset_3px_0_0_#1447c0]'
          : 'bg-[#e2e6ec] hover:bg-[#d5dae2]'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <span
          className="h-3.5 w-3.5 shrink-0 rounded-full"
          style={{
            backgroundColor: geofence.color,
            boxShadow: '0 0 0 2px #ffffff, 0 0 0 3px rgba(15,23,42,0.12)',
          }}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-bold leading-tight text-slate-900">
            {geofence.name}
          </p>
          <p className="truncate text-[12px] leading-tight text-slate-500">{shapeLabel}</p>
        </div>

        {!editingShape && (
          <div className="flex shrink-0 items-center gap-0.5">
            <button type="button" onClick={stop(() => onCenter(geofence))} title="Centrar en el mapa" className={actionBtn}>
              <Crosshair size={15} />
            </button>
            <button type="button" onClick={stop(() => onEditShape(geofence))} title="Ajustar forma en el mapa" className={actionBtn}>
              <Move size={15} />
            </button>
            <button type="button" onClick={stop(() => onEditDetails(geofence))} title="Editar nombre, color y unidades" className={actionBtn}>
              <Pencil size={14} />
            </button>
            {onConfigureWhatsApp && (
              <button
                type="button"
                onClick={stop(() => onConfigureWhatsApp(geofence))}
                title="Configurar Alertas por WhatsApp"
                className="flex h-7 w-7 items-center justify-center rounded-[5px] text-slate-600 transition-colors hover:bg-emerald-50 hover:text-emerald-600"
              >
                <WhatsAppIcon size={14} />
              </button>
            )}
            <button
              type="button"
              onClick={stop(() => onDelete(geofence))}
              title="Eliminar geocerca"
              className="flex h-7 w-7 items-center justify-center rounded-[5px] text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      <div className="mt-2.5 border-t border-slate-900/10 pt-2">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
            Unidades asignadas
          </span>
          <span className="text-[11px] font-semibold tabular-nums text-slate-500">{totalUnits}</span>
        </div>

        {totalUnits === 0 ? (
          <span className="text-[11.5px] italic text-slate-400">Sin unidades asignadas</span>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {assigned.map((v) => {
              const isUnconfirmed = geofence.unconfirmedVehicleIds?.includes(v.id);
              return (
                <span
                  key={v.id}
                  title={
                    isUnconfirmed
                      ? `${v.id}: Registrado en BD interna pero NO confirmado en Traccar`
                      : `${v.id}: Confirmado en Traccar`
                  }
                  className={`flex h-[26px] min-w-0 items-center gap-1 rounded-[4px] px-1.5 text-[12px] font-semibold ${
                    isUnconfirmed
                      ? 'bg-amber-100 text-amber-900 ring-1 ring-inset ring-amber-300'
                      : 'bg-white text-[#1e3a8a]'
                  }`}
                >
                  {isUnconfirmed && (
                    <AlertTriangle size={11} className="shrink-0 animate-pulse text-amber-700" />
                  )}
                  <span className="truncate">{v.id}</span>
                </span>
              );
            })}

            {traccarOnly.map((plate) => (
              <span
                key={`traccar-${plate}`}
                title={`${plate}: Vinculado en Traccar pero no registrado en BD interna (Haz clic en Importar)`}
                className="flex h-[26px] min-w-0 items-center gap-1 rounded-[4px] border border-dashed border-blue-400 bg-blue-50 px-1.5 text-[12px] font-semibold text-blue-800"
              >
                <Radio size={11} className="shrink-0 animate-pulse text-[#113EB9]" />
                <span className="truncate">{plate}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {unconfirmed.length > 0 && (
        <div className="mt-2 flex items-center justify-between gap-1.5 rounded-[5px] border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-800">
          <div className="flex min-w-0 items-center gap-1.5">
            <AlertTriangle size={12} className="shrink-0 text-amber-600" />
            <span className="truncate">
              {unconfirmed.length} vehículo(s) sin confirmar en Traccar
            </span>
          </div>
          {onSyncVehiclesToTraccar && (
            <button
              type="button"
              onClick={stop(() => onSyncVehiclesToTraccar(geofence))}
              title="Vincular permisos en Traccar ahora"
              className="shrink-0 rounded bg-amber-600 px-1.5 py-0.5 text-[10px] font-bold text-white transition hover:bg-amber-700"
            >
              Sincronizar
            </button>
          )}
        </div>
      )}

      {traccarOnly.length > 0 && (
        <div className="mt-2 flex items-center justify-between gap-1.5 rounded-[5px] border border-blue-200 bg-blue-50/90 px-2 py-1 text-[11px] text-blue-900">
          <div className="flex min-w-0 items-center gap-1.5">
            <Radio size={12} className="shrink-0 animate-pulse text-[#113EB9]" />
            <span className="truncate">{traccarOnly.length} vehículo(s) en Traccar pero no en BD</span>
          </div>
          {onImportTraccarVehicles && (
            <button
              type="button"
              onClick={stop(() => onImportTraccarVehicles(geofence))}
              title="Importar a BD interna con un clic (sin llamar a Traccar)"
              className="shrink-0 rounded bg-[#113EB9] px-2 py-0.5 text-[10px] font-bold text-white transition hover:bg-blue-800"
            >
              Importar
            </button>
          )}
        </div>
      )}

      {editingShape && (
        <div className="mt-2.5 flex items-center gap-1.5">
          <button
            type="button"
            onClick={stop(onSaveShape)}
            className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[5px] bg-green-600 text-[12px] font-semibold text-white transition hover:bg-green-700"
          >
            <Check size={14} /> Guardar forma
          </button>
          <button
            type="button"
            onClick={stop(onCancelShape)}
            title="Descartar cambios de forma"
            className="flex h-8 w-8 items-center justify-center rounded-[5px] bg-white text-slate-600 transition hover:bg-slate-100"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
