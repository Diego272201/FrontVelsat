'use client';

import React, { useEffect, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import BaseModal from '@/app/components/ui/BaseModal';
import { Servicio } from './types';
import { ddMmYyyyToIso } from './utils';

export interface ReprogramarForm {
  fechaIso: string;
  hora: string;
  motivo: string;
}

interface ModalReprogramarProps {
  servicio: Servicio | null;
  guardando?: boolean;
  onClose: () => void;
  onGuardar: (form: ReprogramarForm) => void;
}

const inputClase =
  'h-9 w-full rounded-md border border-gray-300 px-2 text-[13px] text-gray-800 focus:border-blue-500 focus:outline-none';
const labelClase = 'mb-1 block text-[12px] font-medium text-gray-600';

// Reprograma un servicio ya iniciado (EN_CURSO): cambia la fecha y hora de salida y corre las horas
// esperadas de los paraderos que aún no tienen llegada. Las llegadas ya marcadas no cambian.
const ModalReprogramar: React.FC<ModalReprogramarProps> = ({
  servicio,
  guardando = false,
  onClose,
  onGuardar,
}) => {
  const [form, setForm] = useState<ReprogramarForm>({ fechaIso: '', hora: '', motivo: '' });

  useEffect(() => {
    if (servicio) {
      setForm({
        fechaIso: ddMmYyyyToIso(servicio.fechaSalida),
        hora: servicio.horaSalida,
        motivo: '',
      });
    }
  }, [servicio]);

  const cambio =
    servicio !== null &&
    (form.fechaIso !== ddMmYyyyToIso(servicio.fechaSalida) || form.hora !== servicio.horaSalida);

  return (
    <BaseModal
      isOpen={servicio !== null}
      onClose={onClose}
      title="Reprogramar servicio"
      subtitle="Se corren las horas esperadas de los paraderos que aún no tienen llegada"
      icon={<CalendarClock className="h-4 w-4 text-blue-600" />}
      size="lg"
      confirmText="Reprogramar"
      confirmIcon={<CalendarClock className="h-3.5 w-3.5" />}
      isLoading={guardando}
      isConfirmDisabled={!form.fechaIso || !form.hora || !cambio}
      isDismissable={false}
      onConfirm={() => onGuardar(form)}
    >
      {servicio && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <p className="text-[12.5px] text-gray-600 sm:col-span-2">
            <b>{servicio.deviceID}</b> · {servicio.rutaNombre} · salida actual{' '}
            <b>
              {servicio.fechaSalida} {servicio.horaSalida}
            </b>
          </p>
          <div>
            <label className={labelClase}>Nueva fecha de salida</label>
            <input
              type="date"
              className={inputClase}
              value={form.fechaIso}
              onChange={(e) => setForm((p) => ({ ...p, fechaIso: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelClase}>Nueva hora de salida</label>
            <input
              type="time"
              className={inputClase}
              value={form.hora}
              onChange={(e) => setForm((p) => ({ ...p, hora: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClase}>Motivo (opcional)</label>
            <input
              type="text"
              maxLength={200}
              className={inputClase}
              placeholder="Ej. retraso en el abastecimiento"
              value={form.motivo}
              onChange={(e) => setForm((p) => ({ ...p, motivo: e.target.value }))}
            />
          </div>
        </div>
      )}
    </BaseModal>
  );
};

export default ModalReprogramar;
