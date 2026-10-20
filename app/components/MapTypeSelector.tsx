'use client';
import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Layers, Map, Mountain, Satellite } from 'lucide-react';
import { getCurrentUser, loadSettings } from './settings/useUserSettings';

// Mismo orden, claves y nombres que "Tipo de mapa por defecto" en Configuración
export const MAP_TYPES = [
  { id: 'roadmap', label: 'Mapa', Icon: Map, title: 'Mapa con calles y carreteras' },
  { id: 'satellite', label: 'Satélite', Icon: Satellite, title: 'Imagen satelital sin etiquetas' },
  { id: 'hybrid', label: 'Híbrido', Icon: Layers, title: 'Imagen satelital con nombres de vías' },
  { id: 'terrain', label: 'Relieve', Icon: Mountain, title: 'Mapa con relieve del terreno' },
] as const;

export type MapTypeId = (typeof MAP_TYPES)[number]['id'];

export const toMapTypeId = (value: unknown): MapTypeId =>
  MAP_TYPES.some((t) => t.id === value) ? (value as MapTypeId) : 'roadmap';

/** Tipo de mapa elegido en Configuración > Preferencias ("Mapa" si no hay). */
export function readDefaultMapType(): MapTypeId {
  try {
    return toMapTypeId(loadSettings(getCurrentUser()).preferences?.mapType);
  } catch {
    return 'roadmap';
  }
}

interface MapTypeSelectorProps {
  value: MapTypeId;
  onChange: (type: MapTypeId) => void;
}

/**
 * Botón compacto con el tipo de mapa actual; al hacer clic despliega la lista
 * para cambiarlo. Lo comparten el mapa de Google y el de Leaflet (subtrack).
 */
export default function MapTypeSelector({ value, onChange }: MapTypeSelectorProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = MAP_TYPES.find((t) => t.id === value) ?? MAP_TYPES[0];
  const CurrentIcon = current.Icon;

  // Cerrar al hacer clic fuera o con Esc
  useEffect(() => {
    if (!open) return;
    const handlePointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`flex items-center gap-1 rounded-lg border border-slate-200/90 bg-white/95 px-2.5 py-1.5 text-[11px] font-semibold shadow-sm backdrop-blur-md transition-colors ${
          open ? 'text-[#113EB9]' : 'text-slate-700 hover:text-[#113EB9]'
        }`}
        title="Cambiar tipo de mapa"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <CurrentIcon size={13} strokeWidth={2.5} />
        <span>{current.label}</span>
        <ChevronDown
          size={12}
          strokeWidth={2.8}
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 top-full z-30 mt-1 w-36 overflow-hidden rounded-lg border border-slate-200/90 bg-white/95 py-1 shadow-lg backdrop-blur-md"
        >
          {MAP_TYPES.map(({ id, label, Icon, title }) => {
            const selected = id === value;
            return (
              <li key={id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[11px] font-semibold transition-colors ${
                    selected
                      ? 'bg-blue-50 text-[#113EB9]'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                  title={title}
                >
                  <Icon size={13} strokeWidth={2.5} />
                  <span className="flex-1">{label}</span>
                  {selected && <Check size={12} strokeWidth={3} />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
