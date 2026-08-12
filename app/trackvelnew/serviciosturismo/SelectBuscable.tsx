'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export const TIPOS_UNIDAD = [
  'STARIA',
  'TAUD',
  'TBUS',
  'TBUS JUNIOR',
  'TH01',
  'TMNB',
  'TSPC',
  'TSPL',
];

export interface Conductor {
  codtaxi: number;
  apellidos: string | null;
  telefono: string | null;
  brevete: string | null;
}

export const SelectPlacaBuscable: React.FC<{
  value: string;
  opciones: string[];
  onChange: (valor: string) => void;
}> = ({ value, opciones, onChange }) => {
  const [query, setQuery] = useState(value);
  const [abierto, setAbierto] = useState(false);
  const cerrandoPorClickRef = useRef(false);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const opcionesFiltradas = useMemo(() => {
    const texto = query.trim().toLowerCase();
    if (texto === '') return opciones;
    return opciones.filter((op) => op.toLowerCase().includes(texto));
  }, [opciones, query]);

  const seleccionar = (opcion: string) => {
    setQuery(opcion);
    onChange(opcion);
    setAbierto(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onFocus={() => setAbierto(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(''); // hasta que no seleccione una opción de la lista, no hay placa válida
            setAbierto(true);
          }}
          onBlur={() => {
            // pequeño delay para que el click en una opción se registre antes de cerrar
            setTimeout(() => {
              if (!cerrandoPorClickRef.current) {
                setAbierto(false);
                // si lo que quedó escrito no coincide con la selección, se limpia
                if (query !== value) {
                  setQuery(value);
                }
              }
              cerrandoPorClickRef.current = false;
            }, 120);
          }}
          placeholder="Buscar unidad (bus-placa)..."
          className="w-full rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 pr-7 text-[12px] focus:border-[#113EB9] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#113EB9]"
        />
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
      </div>

      {abierto && (
        <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
          {opcionesFiltradas.length === 0 ? (
            <div className="px-3 py-2 text-[12px] text-gray-400">
              Sin coincidencias
            </div>
          ) : (
            opcionesFiltradas.map((opcion) => (
              <div
                key={opcion}
                onMouseDown={() => {
                  cerrandoPorClickRef.current = true;
                  seleccionar(opcion);
                }}
                className={`cursor-pointer px-3 py-1.5 text-[12px] hover:bg-blue-50 ${
                  opcion === value ? 'bg-blue-50 font-semibold text-[#113EB9]' : 'text-gray-700'
                }`}
              >
                {opcion}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export const SelectConductorBuscable: React.FC<{
  value: string;
  conductores: Conductor[];
  onSeleccionar: (conductor: Conductor) => void;
  onChangeTexto: (valor: string) => void;
}> = ({ value, conductores, onSeleccionar, onChangeTexto }) => {
  const [query, setQuery] = useState(value);
  const [abierto, setAbierto] = useState(false);
  const cerrandoPorClickRef = useRef(false);

  // El value puede cambiar desde fuera (ej. al resetear el formulario); mantener el input sincronizado.
  useEffect(() => {
    setQuery(value);
  }, [value]);

  const opcionesFiltradas = useMemo(() => {
    const texto = query.trim().toLowerCase();
    if (texto === '') return conductores;
    return conductores.filter((c) =>
      (c.apellidos || '').toLowerCase().includes(texto),
    );
  }, [conductores, query]);

  const seleccionar = (conductor: Conductor) => {
    setQuery(conductor.apellidos || '');
    onSeleccionar(conductor);
    setAbierto(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onFocus={() => setAbierto(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            onChangeTexto(e.target.value);
            setAbierto(true);
          }}
          onBlur={() => {
            setTimeout(() => {
              if (!cerrandoPorClickRef.current) {
                setAbierto(false);
              }
              cerrandoPorClickRef.current = false;
            }, 120);
          }}
          placeholder="Buscar conductor..."
          className="w-full rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 pr-7 text-[12px] focus:border-[#113EB9] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#113EB9]"
        />
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
      </div>

      {abierto && (
        <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
          {opcionesFiltradas.length === 0 ? (
            <div className="px-3 py-2 text-[12px] text-gray-400">
              Sin coincidencias
            </div>
          ) : (
            opcionesFiltradas.map((conductor) => (
              <div
                key={conductor.codtaxi}
                onMouseDown={() => {
                  cerrandoPorClickRef.current = true;
                  seleccionar(conductor);
                }}
                className={`cursor-pointer px-3 py-1.5 text-[12px] hover:bg-blue-50 ${
                  conductor.apellidos === value
                    ? 'bg-blue-50 font-semibold text-[#113EB9]'
                    : 'text-gray-700'
                }`}
              >
                {conductor.apellidos}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export const SelectTipoUnidad: React.FC<{
  value: string;
  onChange: (valor: string) => void;
  className?: string;
}> = ({ value, onChange, className }) => {
  // Si el servicio ya trae un tipounidad que no calza exacto con la lista fija (mayúsculas/espacios
  // distintos, o un valor histórico que ya no está en la lista), se agrega como opción extra para que
  // el select muestre el valor real en vez de caer en el placeholder "Seleccionar...".
  const coincideExacto = TIPOS_UNIDAD.some((tipo) => tipo === value);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={
        className ||
        'w-full rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 text-[12px] focus:border-[#113EB9] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#113EB9]'
      }
    >
      <option value="">Seleccionar...</option>
      {value && !coincideExacto && <option value={value}>{value}</option>}
      {TIPOS_UNIDAD.map((tipo) => (
        <option key={tipo} value={tipo}>
          {tipo}
        </option>
      ))}
    </select>
  );
};
