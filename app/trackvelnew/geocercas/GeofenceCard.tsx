'use client';
import React from 'react';
import {
  AlertTriangle,
  Check,
  Circle as CircleIcon,
  Crosshair,
  Hexagon,
  Move,
  Pencil,
  Radio,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import { Geofence, Vehicle, describeShape } from './types';

interface GeofenceCardProps {
  geofence: Geofence;
  vehicles: Vehicle[];
  selected: boolean;
  editingShape: boolean;
  onSelect: (id: string) => void;
  onCenter: (geofence: Geofence) => void;
  onEditDetails: (geofence: Geofence) => void;
  onEditShape: (geofence: Geofence) => void;
  onSaveShape: () => void;
  onCancelShape: () => void;
  onDelete: (geofence: Geofence) => void;
  onSyncVehiclesToTraccar?: (geofence: Geofence) => void;
  onImportTraccarVehicles?: (geofence: Geofence) => void;
}

export default function GeofenceCard({
  geofence,
  vehicles,
  selected,
  editingShape,
  onSelect,
  onCenter,
  onEditDetails,
  onEditShape,
  onSaveShape,
  onCancelShape,
  onDelete,
  onSyncVehiclesToTraccar,
  onImportTraccarVehicles,
}: GeofenceCardProps) {
  const assigned = geofence.vehicleIds
    .map((id) => vehicles.find((v) => v.id === id) || { id, label: id, position: { lat: 0, lng: 0 } })
    .filter((v): v is Vehicle => Boolean(v));

  const hasTraccarOnly = Boolean(geofence.traccarOnlyVehicleIds && geofence.traccarOnlyVehicleIds.length > 0);

  return (
    <div
      onClick={() => onSelect(geofence.id)}
      className={`cursor-pointer rounded-lg border p-2.5 transition ${
        selected
          ? 'border-[#113EB9] bg-blue-50/60 shadow-sm'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start gap-2">
        <span
          className="mt-1 h-3 w-3 shrink-0 rounded-full ring-2 ring-white"
          style={{ backgroundColor: geofence.color, boxShadow: '0 0 0 1px #e5e7eb' }}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-bold text-gray-800">{geofence.name}</p>
          <div className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-gray-400">
            {geofence.type === 'circle' ? <CircleIcon size={10} /> : <Hexagon size={10} />}
            <span>{describeShape(geofence)}</span>
          </div>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {assigned.length === 0 && !hasTraccarOnly ? (
          <span className="text-[10.5px] italic text-gray-400">Sin unidades asignadas</span>
        ) : (
          <>
            {assigned.map((v) => {
              const isUnconfirmed = geofence.unconfirmedVehicleIds?.includes(v.id);
              return (
                <span
                  key={v.id}
                  title={
                    isUnconfirmed
                      ? `⚠️ ${v.id}: Registrado en BD interna pero NO confirmado en Traccar`
                      : `✓ ${v.id}: Confirmado en Traccar`
                  }
                  className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium transition ${
                    isUnconfirmed
                      ? 'bg-amber-100 text-amber-900 border border-amber-300 ring-1 ring-amber-300/60'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {isUnconfirmed ? (
                    <AlertTriangle size={9} className="text-amber-700 animate-pulse" />
                  ) : (
                    <Truck size={9} />
                  )}
                  <span>{v.id}</span>
                  {isUnconfirmed && (
                    <span className="text-[9px] font-bold text-amber-700">!</span>
                  )}
                </span>
              );
            })}

            {geofence.traccarOnlyVehicleIds?.map((plate) => (
              <span
                key={`traccar-${plate}`}
                title={`📡 ${plate}: Vinculado en Traccar pero no registrado en BD interna (Haz clic en Importar)`}
                className="inline-flex items-center gap-1 rounded-full border border-dashed border-blue-400 bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-800 ring-1 ring-blue-300/40"
              >
                <Radio size={9} className="text-[#113EB9] animate-pulse" />
                <span>{plate}</span>
                <span className="text-[9px] font-bold text-[#113EB9]">+</span>
              </span>
            ))}
          </>
        )}
      </div>

      {Boolean(geofence.unconfirmedVehicleIds && geofence.unconfirmedVehicleIds.length > 0) && (
        <div className="mt-2 flex items-center justify-between gap-1.5 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[10.5px] text-amber-800">
          <div className="flex items-center gap-1.5 min-w-0">
            <AlertTriangle size={12} className="shrink-0 text-amber-600" />
            <span className="truncate">
              {geofence.unconfirmedVehicleIds!.length} vehículo(s) sin confirmar en Traccar
            </span>
          </div>
          {onSyncVehiclesToTraccar && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSyncVehiclesToTraccar(geofence);
              }}
              title="Vincular permisos en Traccar ahora"
              className="shrink-0 rounded bg-amber-600 px-1.5 py-0.5 text-[9.5px] font-bold text-white hover:bg-amber-700 transition"
            >
              Sincronizar
            </button>
          )}
        </div>
      )}

      {hasTraccarOnly && (
        <div className="mt-2 flex items-center justify-between gap-1.5 rounded border border-blue-200 bg-blue-50/90 px-2 py-1 text-[10.5px] text-blue-900">
          <div className="flex items-center gap-1.5 min-w-0">
            <Radio size={12} className="shrink-0 text-[#113EB9] animate-pulse" />
            <span className="truncate">
              {geofence.traccarOnlyVehicleIds!.length} vehículo(s) en Traccar pero no en BD
            </span>
          </div>
          {onImportTraccarVehicles && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onImportTraccarVehicles(geofence);
              }}
              title="Importar a BD interna con un clic (sin llamar a Traccar)"
              className="shrink-0 rounded bg-[#113EB9] px-2 py-0.5 text-[9.5px] font-bold text-white hover:bg-blue-800 transition shadow-xs"
            >
              Importar
            </button>
          )}
        </div>
      )}

      <div className="mt-2 flex items-center gap-1 border-t border-gray-100 pt-2">
        {editingShape ? (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSaveShape();
              }}
              className="flex flex-1 items-center justify-center gap-1 rounded-md bg-green-600 px-2 py-1 text-[10.5px] font-bold text-white transition hover:bg-green-700"
            >
              <Check size={12} /> Guardar forma
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCancelShape();
              }}
              title="Descartar cambios de forma"
              className="flex items-center justify-center rounded-md bg-gray-100 px-2 py-1 text-gray-600 transition hover:bg-gray-200"
            >
              <X size={12} />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCenter(geofence);
              }}
              title="Centrar en el mapa"
              className="flex items-center justify-center rounded-md p-1.5 text-gray-500 transition hover:bg-blue-50 hover:text-[#113EB9]"
            >
              <Crosshair size={13} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEditShape(geofence);
              }}
              title="Ajustar forma en el mapa"
              className="flex items-center justify-center rounded-md p-1.5 text-gray-500 transition hover:bg-blue-50 hover:text-[#113EB9]"
            >
              <Move size={13} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEditDetails(geofence);
              }}
              title="Editar nombre, color y unidades"
              className="flex items-center justify-center rounded-md p-1.5 text-gray-500 transition hover:bg-blue-50 hover:text-[#113EB9]"
            >
              <Pencil size={13} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(geofence);
              }}
              title="Eliminar geocerca"
              className="flex items-center justify-center rounded-md p-1.5 text-gray-500 transition hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 size={13} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
