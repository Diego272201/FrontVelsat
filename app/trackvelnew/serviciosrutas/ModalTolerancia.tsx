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

  // Cálculo para el ejemplo visual (08:00 como hora esperada de referencia)
  const tolEjemplo = valido ? valor : 5;
  const baseMinutos = 480; // 08:00 en minutos
  const formatearHoraMin = (minutos: number) => {
    const mod = (minutos + 1440) % 1440;
    const h = Math.floor(mod / 60);
    const m = mod % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const horaInicio = formatearHoraMin(baseMinutos - tolEjemplo);
  const horaFin = formatearHoraMin(baseMinutos + tolEjemplo);
  const horaRango = tolEjemplo === 0 ? 'exacto 08:00' : `${horaInicio} – ${horaFin}`;

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

        {/* Visualización gráfica de clasificación de llegada según la tolerancia */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
              Así se clasificará una llegada
            </span>
            <span className="text-[11.5px] text-slate-600">
              Ej. hora esperada <strong className="font-bold text-slate-900">08:00</strong>
            </span>
          </div>

          {/* Barra continua con tres segmentos de color */}
          <div className="mt-3 flex overflow-hidden rounded-lg shadow-2xs">
            <div className="flex-1 bg-[#113EB9] py-2 text-center text-[12.5px] font-bold text-white">
              Adelantado
            </div>
            <div className="flex-1 border-x border-white/20 bg-[#16a34a] py-2 text-center text-[12.5px] font-bold text-white">
              A tiempo
            </div>
            <div className="flex-1 bg-[#dc2626] py-2 text-center text-[12.5px] font-bold text-white">
              Retrasado
            </div>
          </div>

          {/* Rangos horarios debajo de cada segmento */}
          <div className="mt-2 grid grid-cols-3 text-center text-[11.5px]">
            <div className="font-semibold text-slate-600">
              antes de {horaInicio}
            </div>
            <div className="font-bold text-[#16a34a]">
              {horaRango}
            </div>
            <div className="font-semibold text-slate-600">
              después de {horaFin}
            </div>
          </div>

          <p className="mt-3.5 text-[11px] text-slate-400">
            Aplica a las llegadas que se registren desde ahora. Las ya registradas conservan su estado.
          </p>
        </div>
      </div>
    </BaseModal>
  );
};

export default ModalTolerancia;
