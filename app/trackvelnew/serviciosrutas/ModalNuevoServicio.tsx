'use client';

import React, { useEffect, useState } from 'react';
import { PlusCircle } from 'lucide-react';
import BaseModal from '@/app/components/ui/BaseModal';
import { NuevoServicioForm, Ruta, Servicio } from './types';
import { ddMmYyyyToIso, getIsoToday } from './utils';
import { useUsername } from '@/hooks/useUsername';
import { Conductor, SelectConductorBuscable } from '../serviciosturismo/SelectBuscable';

const formDesdeServicio = (s: Servicio): NuevoServicioForm => ({
  deviceID: s.deviceID,
  rutaId: s.rutaId,
  fechaIso: ddMmYyyyToIso(s.fechaSalida),
  hora: s.horaSalida,
  conductorNombre: s.conductorNombre,
  conductorBrevete: s.conductorBrevete,
  conductorCelular: s.conductorCelular,
});

interface ModalNuevoServicioProps {
  isOpen: boolean;
  onClose: () => void;
  rutas: Ruta[];
  grupos: readonly string[];
  unidades: string[];
  /** Servicio a editar; null/undefined = servicio nuevo. */
  servicio?: Servicio | null;
  /** Ruta ya elegida al crear un servicio desde el detalle de una ruta. */
  rutaInicial?: number | null;
  guardando?: boolean;
  onGuardar: (form: NuevoServicioForm) => void;
}

const formVacio = (): NuevoServicioForm => ({
  deviceID: '',
  rutaId: null,
  fechaIso: getIsoToday(),
  hora: '',
  conductorNombre: '',
  conductorBrevete: '',
  conductorCelular: '',
});

const inputClase =
  'h-9 w-full rounded-md border border-gray-300 px-2 text-[13px] text-gray-800 focus:border-blue-500 focus:outline-none';
const labelClase = 'mb-1 block text-[12px] font-medium text-gray-600';

const ModalNuevoServicio: React.FC<ModalNuevoServicioProps> = ({
  isOpen,
  onClose,
  rutas,
  grupos,
  unidades,
  servicio = null,
  rutaInicial = null,
  guardando = false,
  onGuardar,
}) => {
  const [form, setForm] = useState<NuevoServicioForm>(formVacio);
  const [conductores, setConductores] = useState<Conductor[]>([]);
  const { username, isReady } = useUsername();

  // Conductores de Servicios Rutas (ruta = '1') para sugerirlos al escribir el nombre.
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

  const seleccionarConductor = (c: Conductor) =>
    setForm((prev) => ({
      ...prev,
      conductorNombre: (c.apellidos || '').trim(),
      conductorBrevete: c.brevete || '',
      conductorCelular: c.telefono || '',
    }));

  useEffect(() => {
    if (isOpen) setForm(servicio ? formDesdeServicio(servicio) : { ...formVacio(), rutaId: rutaInicial });
  }, [isOpen, servicio, rutaInicial]);

  // Si la unidad del servicio ya no está en la lista de la cuenta, se conserva igual.
  const opcionesUnidad =
    form.deviceID && !unidades.includes(form.deviceID) ? [form.deviceID, ...unidades] : unidades;

  const set = <K extends keyof NuevoServicioForm>(campo: K, valor: NuevoServicioForm[K]) =>
    setForm((prev) => ({ ...prev, [campo]: valor }));

  const completo =
    form.deviceID !== '' &&
    form.rutaId !== null &&
    form.fechaIso !== '' &&
    form.hora !== '' &&
    form.conductorNombre.trim() !== '' &&
    form.conductorBrevete.trim() !== '' &&
    form.conductorCelular.trim() !== '';

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={servicio ? 'Editar servicio' : 'Nuevo servicio'}
      subtitle={
        servicio
          ? 'Al guardar se recalculan las horas esperadas de cada paradero'
          : 'Programa una unidad sobre una ruta'
      }
      icon={<PlusCircle className="h-4 w-4 text-blue-600" />}
      size="2xl"
      confirmText={servicio ? 'Guardar cambios' : 'Guardar servicio'}
      onConfirm={() => onGuardar(form)}
      isLoading={guardando}
      isConfirmDisabled={!completo}
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
          <label className={labelClase}>Unidad (placa)</label>
          <select
            className={inputClase}
            value={form.deviceID}
            onChange={(e) => set('deviceID', e.target.value)}
          >
            <option value="">Selecciona una unidad</option>
            {opcionesUnidad.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClase}>Fecha de salida</label>
          <input
            type="date"
            className={inputClase}
            value={form.fechaIso}
            onChange={(e) => set('fechaIso', e.target.value)}
          />
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
            placeholder="Brevete"
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
            placeholder="Celular"
            tabIndex={-1}
          />
        </div>
      </div>
    </BaseModal>
  );
};

export default ModalNuevoServicio;
