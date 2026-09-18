'use client';
import React from 'react';
import {
  Check,
  Circle as CircleIcon,
  Crosshair,
  Hexagon,
  Move,
  Pencil,
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
}: GeofenceCardProps) {
  const assigned = geofence.vehicleIds
    .map((id) => vehicles.find((v) => v.id === id))
    .filter((v): v is Vehicle => Boolean(v));

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
        {assigned.length === 0 ? (
          <span className="text-[10.5px] italic text-gray-400">Sin unidades asignadas</span>
        ) : (
          assigned.map((v) => (
            <span
              key={v.id}
              className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600"
            >
              <Truck size={9} />
              {v.id}
            </span>
          ))
        )}
      </div>

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
