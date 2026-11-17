'use client';

import React, { useEffect, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import BaseModal from '@/app/components/ui/BaseModal';
import { useUsername } from '@/hooks/useUsername';
import { Conductor, SelectConductorBuscable } from '../../serviciosturismo/SelectBuscable';
import { Plantilla, PlantillaForm, Ruta } from '../types';

export const DIAS_SEMANA: { valor: number; corto: string }[] = [
  { valor: 1, corto: 'Lun' },
  { valor: 2, corto: 'Mar' },
  { valor: 3, corto: 'Mié' },
  { valor: 4, corto: 'Jue' },
  { valor: 5, corto: 'Vie' },
  { valor: 6, corto: 'Sáb' },
  { valor: 7, corto: 'Dom' },
];

const formVacio = (): PlantillaForm => ({
  rutaId: null,
  hora: '',
  deviceID: '',
  conductorNombre: '',
  conductorBrevete: '',
  conductorCelular: '',
  dias: [1, 2, 3, 4, 5, 6, 7],
  activo: true,
});

const formDesdePlantilla = (p: Plantilla): PlantillaForm => ({
  rutaId: p.rutaId,
  hora: p.hora,
  deviceID: p.deviceID,
  conductorNombre: p.conductorNombre,
  conductorBrevete: p.conductorBrevete,
  conductorCelular: p.conductorCelular,
  dias: p.dias,
  activo: p.activo,
});

const inputClase =
  'h-9 w-full rounded-md border border-gray-300 px-2 text-[13px] text-gray-800 focus:border-blue-500 focus:outline-none';
const labelClase = 'mb-1 block text-[12px] font-medium text-gray-600';

interface ModalPlantillaProps {
  isOpen: boolean;
  onClose: () => void;
  rutas: Ruta[];
  grupos: readonly string[];
  unidades: string[];
  /** Plantilla a editar; null = nueva. */
  plantilla: Plantilla | null;
  guardando?: boolean;
  onGuardar: (form: PlantillaForm) => void;
}

const ModalPlantilla: React.FC<ModalPlantillaProps> = ({
  isOpen,
  onClose,
  rutas,
  grupos,
  unidades,
  plantilla,
  guardando = false,
  onGuardar,
}) => {
  const [form, setForm] = useState<PlantillaForm>(formVacio);
  const [conductores, setConductores] = useState<Conductor[]>([]);
  const { username, isReady } = useUsername();

  useEffect(() => {
    if (isOpen) setForm(plantilla ? formDesdePlantilla(plantilla) : formVacio());
  }, [isOpen, plantilla]);

  // Conductores de Servicios Rutas (ruta = '1'), igual que en "Nuevo servicio".
  useEffect(() => {
    if (!isOpen || !isReady || !username) return;
    let activo = true;
    fetch(`https://do.velsat.pe:2083/api/Preplan/conductores/${encodeURIComponent(username)}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Array<{ codigo: number; apellidos: string | null; telefono: string | null; brevete: string | null; ruta?: string | null }>) => {
        if (!activo) return;
        setConductores(
          (Array.isArray(data) ? data : [])
            .filter((c) => c.ruta === '1')
            .map((c) => ({ codtaxi: c.codigo, apellidos: c.apellidos, telefono: c.telefono, brevete: c.brevete })),
        );
      })
      .catch(() => activo && setConductores([]));
    return () => {
      activo = false;
    };
  }, [isOpen, isReady, username]);

  const set = <K extends keyof PlantillaForm>(campo: K, valor: PlantillaForm[K]) =>
    setForm((prev) => ({ ...prev, [campo]: valor }));

  const toggleDia = (dia: number) =>
    setForm((prev) => ({
      ...prev,
      dias: prev.dias.includes(dia) ? prev.dias.filter((d) => d !== dia) : [...prev.dias, dia].sort(),
    }));

  const seleccionarConductor = (c: Conductor) =>
    setForm((prev) => ({
      ...prev,
      conductorNombre: (c.apellidos || '').trim(),
      conductorBrevete: c.brevete || '',
      conductorCelular: c.telefono || '',
    }));

  // La unidad guardada se conserva aunque ya no figure en la lista de la cuenta.
  const opcionesUnidad =
    form.deviceID && !unidades.includes(form.deviceID) ? [form.deviceID, ...unidades] : unidades;

  const puedeGuardar = form.rutaId !== null && form.dias.length > 0;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={plantilla ? 'Editar servicio automático' : 'Nuevo servicio automático'}
      subtitle="Hora, unidad y conductor pueden quedar vacíos; hasta completarlos no se generan servicios. El conductor se guarda por su brevete"
      icon={<CalendarClock className="h-4 w-4 text-blue-600" />}
      size="2xl"
      confirmText="Guardar"
      onConfirm={() => onGuardar(form)}
      isLoading={guardando}
      isConfirmDisabled={!puedeGuardar}
      isDismissable={false}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClase}>Ruta</label>
          <select
            className={inputClase}
            value={form.rutaId ?? ''}
            onChange={(e) => set('rutaId', e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Selecciona una ruta</option>
            {grupos.map((grupo) => (
              <optgroup key={grupo} label={grupo}>
                {rutas
                  .filter((r) => r.activo && r.grupo === grupo)
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nombre} ({r.codigo})
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClase}>Hora de salida</label>
          <input
            type="time"
            className={inputClase}
            value={form.hora}
            onChange={(e) => set('hora', e.target.value)}
          />
        </div>

        <div className="sm:col-span-2">
          <label className={labelClase}>Días en que se genera</label>
          <div className="flex flex-wrap gap-1.5">
            {DIAS_SEMANA.map((d) => {
              const activo = form.dias.includes(d.valor);
              return (
                <button
                  key={d.valor}
                  type="button"
                  onClick={() => toggleDia(d.valor)}
                  className={`h-8 min-w-[44px] rounded-md border px-2 text-[12px] font-semibold transition-colors ${
                    activo
                      ? 'border-[#113EB9] bg-[#113EB9] text-white'
                      : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {d.corto}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className={labelClase}>Unidad (placa)</label>
          <select
            className={inputClase}
            value={form.deviceID}
            onChange={(e) => set('deviceID', e.target.value)}
          >
            <option value="">Sin asignar</option>
            {opcionesUnidad.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClase}>Conductor</label>
          <SelectConductorBuscable
            fondoBlanco
            enFlujo
            value={form.conductorNombre}
            conductores={conductores}
            onSeleccionar={seleccionarConductor}
            onChangeTexto={(valor) =>
              setForm((prev) => ({ ...prev, conductorNombre: valor, conductorBrevete: '', conductorCelular: '' }))
            }
          />
        </div>

        <div>
          <label className={labelClase}>Brevete</label>
          <input
            type="text"
            className={`${inputClase} bg-gray-50 text-gray-600`}
            value={form.conductorBrevete}
            readOnly
            placeholder="Se completa al elegir el conductor"
            tabIndex={-1}
          />
        </div>

        <div>
          <label className={labelClase}>Celular</label>
          <input
            type="tel"
            className={`${inputClase} bg-gray-50 text-gray-600`}
            value={form.conductorCelular}
            readOnly
            placeholder="Se completa al elegir el conductor"
            tabIndex={-1}
          />
        </div>

        <label className="flex items-center gap-2 text-[12px] font-medium text-gray-700 sm:col-span-2">
          <input
            type="checkbox"
            checked={form.activo}
            onChange={(e) => set('activo', e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          Activo (si se desactiva, deja de generar servicios)
        </label>
      </div>
    </BaseModal>
  );
};

export default ModalPlantilla;
