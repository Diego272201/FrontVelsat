'use client';
import React from 'react';
import { Check, Trash2, Undo2, X } from 'lucide-react';
import { formatDistance } from '@/lib/geoDistance';

interface RulerPanelProps {
  /** Distancia acumulada de la medición, en metros. */
  totalMeters: number;
  /** Cantidad de puntos marcados; con 0 no hay nada que deshacer ni limpiar. */
  pointCount: number;
  onUndo: () => void;
  onClear: () => void;
  /** Deja de medir. La medición se queda dibujada en el mapa. */
  onFinish: () => void;
}

/**
 * Tarjeta flotante de la regla: muestra el total medido y las acciones para
 * deshacer el último punto, borrar todo o terminar la medición.
 */
export default function RulerPanel({
  totalMeters,
  pointCount,
  onUndo,
  onClear,
  onFinish,
}: RulerPanelProps) {
  const isEmpty = pointCount === 0;

  return (
    <div className="w-56 overflow-hidden rounded-lg border border-gray-200/80 bg-white/95 shadow-md backdrop-blur-md">
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-3 py-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800">
          <span>Medir distancia</span>
        </div>
        <button
          type="button"
          onClick={onFinish}
          className="rounded p-0.5 text-gray-400 transition-colors hover:text-gray-700"
          title="Cerrar la regla (la medición queda en el mapa)"
        >
          <X size={14} />
        </button>
      </div>

      <div className="px-3 py-2.5">
        <div className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
          Distancia total
        </div>
        <div className="text-lg font-bold leading-tight text-[#113EB9]">
          {formatDistance(totalMeters)}
        </div>
        <p className="mt-1.5 text-[10px] leading-snug text-gray-500">
          {isEmpty
            ? 'Haz clic en el mapa para marcar el punto de inicio.'
            : 'Sigue marcando puntos, o pulsa Terminar: lo medido queda en el mapa hasta que lo limpies.'}
        </p>
      </div>

      <div className="flex divide-x divide-gray-100 border-t border-gray-100">
        <button
          type="button"
          onClick={onUndo}
          disabled={isEmpty}
          className="flex flex-1 items-center justify-center gap-1.5 py-2 text-[11px] font-semibold text-gray-700 transition-colors hover:bg-gray-50 hover:text-[#113EB9] disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent"
          title="Quitar el último punto marcado"
        >
          <Undo2 size={13} />
          <span>Deshacer</span>
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={isEmpty}
          className="flex flex-1 items-center justify-center gap-1.5 py-2 text-[11px] font-semibold text-gray-700 transition-colors hover:bg-gray-50 hover:text-red-600 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent"
          title="Borrar toda la medición"
        >
          <Trash2 size={13} />
          <span>Limpiar</span>
        </button>
      </div>

      <button
        type="button"
        onClick={onFinish}
        className="flex w-full items-center justify-center gap-1.5 border-t border-gray-100 bg-[#113EB9] py-2 text-[11px] font-semibold text-white transition-colors hover:bg-[#0d3195]"
        title="Dejar de medir (la medición queda en el mapa)"
      >
        <Check size={13} />
        <span>Terminar medición</span>
      </button>
    </div>
  );
}
