'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { Ruta, Sentido } from '../types';
import { RutaForm, inputClase, labelClase } from './formRuta';

const NUEVO_GRUPO = '__nuevo_grupo__';

interface DatosRutaFormProps {
  form: RutaForm;
  /** Ruta que se edita (null = nueva): se excluye de las candidatas a pareja. */
  ruta: Ruta | null;
  grupos: readonly string[];
  rutas: readonly Ruta[];
  abierto: boolean;
  onToggle: () => void;
  nuevoGrupo: boolean;
  onNuevoGrupo: (valor: boolean) => void;
  onCampo: <K extends keyof RutaForm>(campo: K, valor: RutaForm[K]) => void;
  onCambiarSentido: (sentido: Sentido) => void;
}

// Sección plegable con los datos generales de la ruta (código, nombre, grupo, sentido, pareja…).
const DatosRutaForm: React.FC<DatosRutaFormProps> = ({
  form,
  ruta,
  grupos,
  rutas,
  abierto,
  onToggle,
  nuevoGrupo,
  onNuevoGrupo,
  onCampo,
  onCambiarSentido,
}) => {
  // Candidatas a pareja: rutas del sentido contrario (nunca la propia).
  const sentidoContrario: Sentido = form.sentido === 'IDA' ? 'REGRESO' : 'IDA';
  const candidatasPareja = rutas.filter(
    (r) => r.sentido === sentidoContrario && r.id !== ruta?.id,
  );

  return (
    <div className="border-b border-slate-200">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left transition hover:bg-slate-50"
      >
        <span className="text-[12px] font-bold uppercase tracking-wide text-slate-700">
          Datos de la ruta
          {!abierto && (
            <span className="ml-2 font-medium normal-case tracking-normal text-slate-400">
              {form.codigo || 'sin código'} ·{' '}
              {form.sentido === 'IDA' ? 'Ida' : 'Regreso'}
            </span>
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition-transform ${abierto ? 'rotate-180' : ''}`}
        />
      </button>

      {abierto && (
        <div className="grid grid-cols-2 gap-3 px-4 pb-4">
          <div>
            <label className={labelClase}>Código</label>
            <input
              className={inputClase}
              placeholder="RT-001"
              value={form.codigo}
              onChange={(e) => onCampo('codigo', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClase}>Sentido</label>
            <select
              className={inputClase}
              value={form.sentido}
              onChange={(e) => onCambiarSentido(e.target.value as Sentido)}
            >
              <option value="IDA">Ida</option>
              <option value="REGRESO">Regreso</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className={labelClase}>Nombre</label>
            <input
              className={inputClase}
              value={form.nombre}
              onChange={(e) => onCampo('nombre', e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <label className={labelClase}>Grupo</label>
            <select
              className={inputClase}
              value={nuevoGrupo ? NUEVO_GRUPO : form.grupo}
              onChange={(e) => {
                if (e.target.value === NUEVO_GRUPO) {
                  onNuevoGrupo(true);
                  onCampo('grupo', '');
                } else {
                  onNuevoGrupo(false);
                  onCampo('grupo', e.target.value);
                }
              }}
            >
              {grupos.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
              <option value={NUEVO_GRUPO}>+ Nuevo grupo…</option>
            </select>
            {nuevoGrupo && (
              <input
                className={`${inputClase} mt-1.5`}
                placeholder="Nombre del nuevo grupo"
                maxLength={50}
                value={form.grupo}
                onChange={(e) => onCampo('grupo', e.target.value)}
              />
            )}
          </div>
          <div className="col-span-2">
            <label className={labelClase}>
              Ruta de {form.sentido === 'IDA' ? 'regreso' : 'ida'} (pareja,
              opcional)
            </label>
            <select
              className={inputClase}
              value={form.rutaParejaId}
              onChange={(e) => onCampo('rutaParejaId', e.target.value)}
            >
              <option value="">Sin pareja</option>
              {candidatasPareja.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.codigo} · {r.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className={labelClase}>Descripción (opcional)</label>
            <input
              className={inputClase}
              value={form.descripcion}
              onChange={(e) => onCampo('descripcion', e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <label className={labelClase}>Distancia km (opcional)</label>
            <input
              className={inputClase}
              inputMode="decimal"
              placeholder="Se puede completar luego"
              value={form.distanciaKm}
              onChange={(e) => onCampo('distanciaKm', e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DatosRutaForm;
