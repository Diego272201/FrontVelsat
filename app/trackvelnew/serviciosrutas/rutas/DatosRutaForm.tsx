'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { Ruta, Sentido } from '../types';
import { RutaForm } from './formRuta';

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

const inputCompacto =
  'h-7 w-full rounded border border-slate-300 bg-white px-2 text-[11.5px] text-slate-800 transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-400';
const labelCompacto =
  'mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate';

// Sección compacta y plegable con los datos generales de la ruta
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
    <div className="border-b border-slate-200 bg-white">
      {/* Barra de cabecera compacta tipo acordeón */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-3 py-2 text-left transition hover:bg-slate-50"
      >
        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden pr-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 shrink-0">
            Datos de la ruta
          </span>
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-800 shrink-0">
            {form.codigo || 'Sin código'}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0 ${
              form.sentido === 'IDA'
                ? 'bg-sky-100 text-sky-700'
                : 'bg-amber-100 text-amber-700'
            }`}
          >
            {form.sentido === 'IDA' ? 'Ida' : 'Regreso'}
          </span>
          {form.nombre && (
            <span
              className="hidden truncate text-[11px] text-slate-500 sm:inline-block"
              title={form.nombre}
            >
              · {form.nombre}
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-blue-600">
          <span>{abierto ? 'Ocultar' : 'Editar'}</span>
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${abierto ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Formulario compacto al desplegar */}
      {abierto && (
        <div className="border-t border-slate-100 bg-slate-50/70 px-3 py-2.5">
          <div className="grid grid-cols-2 gap-2 text-[11.5px]">
            {/* Fila 1: Código y Sentido */}
            <div>
              <label className={labelCompacto}>Código</label>
              <input
                className={inputCompacto}
                placeholder="RT-001"
                value={form.codigo}
                onChange={(e) => onCampo('codigo', e.target.value)}
              />
            </div>
            <div>
              <label className={labelCompacto}>Sentido</label>
              <select
                className={inputCompacto}
                value={form.sentido}
                onChange={(e) => onCambiarSentido(e.target.value as Sentido)}
              >
                <option value="IDA">Ida</option>
                <option value="REGRESO">Regreso</option>
              </select>
            </div>

            {/* Fila 2: Nombre de la ruta */}
            <div className="col-span-2">
              <label className={labelCompacto}>Nombre</label>
              <input
                className={inputCompacto}
                placeholder="Nombre de la ruta"
                value={form.nombre}
                onChange={(e) => onCampo('nombre', e.target.value)}
              />
            </div>

            {/* Fila 3: Grupo y Distancia */}
            <div>
              <label className={labelCompacto}>Grupo</label>
              <select
                className={inputCompacto}
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
                  className={`${inputCompacto} mt-1`}
                  placeholder="Nombre del nuevo grupo"
                  maxLength={50}
                  value={form.grupo}
                  onChange={(e) => onCampo('grupo', e.target.value)}
                />
              )}
            </div>
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <label className={labelCompacto} style={{ marginBottom: 0 }}>
                  Distancia (km)
                </label>
                <span
                  className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1 py-0.5 rounded"
                  title="Calculada automáticamente a partir del trazado"
                >
                  Auto trazado
                </span>
              </div>
              <input
                className={`${inputCompacto} bg-slate-100 font-semibold text-slate-700 cursor-not-allowed`}
                readOnly
                title="Calculada automáticamente a partir del trazado de la ruta (no de los paraderos)"
                placeholder="0.00 km"
                value={
                  form.distanciaKm
                    ? `${form.distanciaKm} km`
                    : '0.00 km'
                }
              />
            </div>

            {/* Fila 4: Ruta Pareja y Descripción */}
            <div>
              <label
                className={labelCompacto}
                title={`Ruta de ${form.sentido === 'IDA' ? 'regreso' : 'ida'} (pareja)`}
              >
                Pareja ({form.sentido === 'IDA' ? 'Regreso' : 'Ida'})
              </label>
              <select
                className={inputCompacto}
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
            <div>
              <label className={labelCompacto}>Descripción</label>
              <input
                className={inputCompacto}
                placeholder="Opcional"
                value={form.descripcion}
                onChange={(e) => onCampo('descripcion', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatosRutaForm;
