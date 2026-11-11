'use client';

import React, { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';
import BaseModal from '@/app/components/ui/BaseModal';

interface ModalToleranciaProps {
  isOpen: boolean;
  /** Tolerancia actual de la cuenta (minutos). */
  valorActual: number;
  guardando?: boolean;
  onClose: () => void;
  onGuardar: (toleranciaMin: number) => void;
}

const MIN = 0;
const MAX = 240;

const inputClase =
  'h-9 w-28 rounded-md border border-gray-300 px-2 text-[13px] text-gray-800 focus:border-blue-500 focus:outline-none';

// Tolerancia general de Servicios Rutas: define si la llegada a un paradero cuenta como "a tiempo".
const ModalTolerancia: React.FC<ModalToleranciaProps> = ({
  isOpen,
  valorActual,
  guardando = false,
  onClose,
  onGuardar,
}) => {
  const [texto, setTexto] = useState(String(valorActual));

  useEffect(() => {
    if (isOpen) setTexto(String(valorActual));
  }, [isOpen, valorActual]);

  const valor = Number(texto);
  const valido = texto.trim() !== '' && Number.isInteger(valor) && valor >= MIN && valor <= MAX;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Tolerancia de llegada"
      subtitle="Configuración general de Servicios Rutas"
      icon={<Timer className="h-4 w-4 text-blue-600" />}
      size="lg"
      confirmText="Guardar"
      isLoading={guardando}
      isConfirmDisabled={!valido || valor === valorActual}
      isDismissable={false}
      onConfirm={() => valido && onGuardar(valor)}
    >
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-[12px] font-medium text-gray-600">Tolerancia (± minutos)</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={MIN}
              max={MAX}
              step={1}
              className={inputClase}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
            <span className="text-[12.5px] text-gray-500">minutos (0 a {MAX})</span>
          </div>
        </div>

        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-[12px] leading-relaxed text-slate-600">
          Cuando la unidad llega a un paradero se compara con su hora esperada:
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            <li>
              <b className="text-emerald-700">A tiempo</b>: dentro de ±{valido ? valor : '…'} min de la hora esperada.
            </li>
            <li>
              <b className="text-blue-700">Adelantado</b>: llega más de {valido ? valor : '…'} min antes.
            </li>
            <li>
              <b className="text-rose-700">Retrasado</b>: llega más de {valido ? valor : '…'} min después.
            </li>
          </ul>
          <p className="mt-1.5 text-slate-500">
            Aplica a las llegadas que se registren desde ahora. Las ya registradas conservan su estado.
          </p>
        </div>
      </div>
    </BaseModal>
  );
};

export default ModalTolerancia;
