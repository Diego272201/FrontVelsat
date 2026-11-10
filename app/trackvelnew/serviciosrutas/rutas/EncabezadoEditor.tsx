'use client';

import React from 'react';
import { Loader2, Route as RouteIcon, Save, X } from 'lucide-react';

interface EncabezadoEditorProps {
  titulo: string;
  /** Aviso de lo que falta para poder guardar (vacío = ya se puede guardar). */
  pendiente: string;
  guardando: boolean;
  puedeGuardar: boolean;
  onCancelar: () => void;
  onGuardar: () => void;
}

// Barra superior del editor de rutas: título, aviso de pendientes y botones Cancelar / Guardar.
const EncabezadoEditor: React.FC<EncabezadoEditorProps> = ({
  titulo,
  pendiente,
  guardando,
  puedeGuardar,
  onCancelar,
  onGuardar,
}) => (
  <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2.5">
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50">
        <RouteIcon className="h-[18px] w-[18px] text-blue-600" />
      </div>
      <div className="min-w-0">
        <h2 className="truncate text-[15px] font-bold leading-tight text-slate-800">{titulo}</h2>
        <p className="truncate text-[11.5px] text-slate-500">
          Haz clic en el mapa para ubicar los paraderos, o arrástralos para ajustarlos.
        </p>
      </div>
    </div>
    <div className="flex shrink-0 items-center gap-2">
      {pendiente && <span className="hidden text-[11.5px] font-medium text-amber-600 md:inline">{pendiente}</span>}
      <button
        type="button"
        onClick={onCancelar}
        disabled={guardando}
        className="flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-[12px] font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
      >
        <X className="h-3.5 w-3.5" />
        Cancelar
      </button>
      <button
        type="button"
        onClick={onGuardar}
        disabled={!puedeGuardar || guardando}
        className="flex h-8 items-center gap-1.5 rounded-md bg-blue-600 px-3.5 text-[12px] font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {guardando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
        {guardando ? 'Guardando…' : 'Guardar ruta'}
      </button>
    </div>
  </div>
);

export default EncabezadoEditor;
