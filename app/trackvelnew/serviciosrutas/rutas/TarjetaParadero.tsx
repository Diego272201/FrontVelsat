'use client';

import React from 'react';
import {
  ArrowDown,
  ArrowUp,
  CornerDownRight,
  MapPin,
  Trash2,
} from 'lucide-react';
import {
  ParaderoForm,
  colorTipo,
  coordenadasValidas,
  inputClase,
  tipoDe,
} from './formRuta';

interface TarjetaParaderoProps {
  paradero: ParaderoForm;
  indice: number;
  total: number;
  /** Es el paradero que recibe el próximo clic del mapa. */
  activo: boolean;
  registrarFila: (el: HTMLDivElement | null) => void;
  onSeleccionar: () => void;
  onCambio: (cambios: Partial<ParaderoForm>) => void;
  onMover: (delta: -1 | 1) => void;
  onInsertarDespues: () => void;
  onQuitar: () => void;
}

const botonAccion = 'rounded p-1 hover:bg-slate-100 disabled:opacity-30';

// Un paradero de la lista: nombre, ubicación (se llena con el mapa), radio y minutos.
const TarjetaParadero: React.FC<TarjetaParaderoProps> = ({
  paradero: p,
  indice: i,
  total,
  activo,
  registrarFila,
  onSeleccionar,
  onCambio,
  onMover,
  onInsertarDespues,
  onQuitar,
}) => {
  const ubicado = coordenadasValidas(p);
  const alEnfocar = onSeleccionar;

  return (
    <div
      ref={registrarFila}
      onClick={onSeleccionar}
      className={`rounded-lg border p-2.5 transition ${
        activo
          ? 'border-blue-500 bg-blue-50/60 shadow-sm ring-2 ring-blue-100'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${colorTipo(i, total)}`}
        >
          {i + 1}
        </span>
        <input
          className={inputClase}
          placeholder={`Nombre del paradero (${tipoDe(i, total).toLowerCase()})`}
          value={p.nombre}
          onChange={(e) => onCambio({ nombre: e.target.value })}
          onFocus={alEnfocar}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
            ubicado ? 'text-green-600' : 'text-amber-600'
          }`}
        >
          <MapPin className="h-3 w-3" />
          {ubicado
            ? tipoDe(i, total)
            : activo
              ? 'Haz clic en el mapa'
              : 'Sin ubicar'}
        </span>
        <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => onMover(-1)}
            disabled={i === 0}
            title="Subir"
            className={`${botonAccion} text-slate-500`}
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onMover(1)}
            disabled={i === total - 1}
            title="Bajar"
            className={`${botonAccion} text-slate-500`}
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onInsertarDespues}
            disabled={i === total - 1}
            title="Insertar un paradero después de este"
            className={`${botonAccion} text-blue-600 hover:bg-blue-50`}
          >
            <CornerDownRight className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onQuitar}
            disabled={total <= 2}
            title="Quitar"
            className={`${botonAccion} text-red-500 hover:bg-red-50`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div
        className="mt-2 grid grid-cols-2 gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <Campo etiqueta="Latitud">
          <input
            className={inputClase}
            inputMode="decimal"
            value={p.latitud}
            onChange={(e) => onCambio({ latitud: e.target.value })}
            onFocus={alEnfocar}
          />
        </Campo>
        <Campo etiqueta="Longitud">
          <input
            className={inputClase}
            inputMode="decimal"
            value={p.longitud}
            onChange={(e) => onCambio({ longitud: e.target.value })}
            onFocus={alEnfocar}
          />
        </Campo>
        <Campo etiqueta="Radio de la geocerca (m)">
          <input
            className={inputClase}
            inputMode="numeric"
            value={p.radioMetros}
            onChange={(e) => onCambio({ radioMetros: e.target.value })}
            onFocus={alEnfocar}
          />
        </Campo>
        <Campo etiqueta="Min. desde el anterior">
          <input
            className={inputClase}
            inputMode="numeric"
            disabled={i === 0}
            value={i === 0 ? '0' : p.minutosDesdeAnterior}
            onChange={(e) => onCambio({ minutosDesdeAnterior: e.target.value })}
          />
        </Campo>
      </div>
    </div>
  );
};

const Campo: React.FC<{ etiqueta: string; children: React.ReactNode }> = ({
  etiqueta,
  children,
}) => (
  <div>
    <label className="mb-0.5 block text-[10.5px] font-medium text-slate-500">
      {etiqueta}
    </label>
    {children}
  </div>
);

export default TarjetaParadero;
