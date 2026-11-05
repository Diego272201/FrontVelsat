'use client';

import React, { useEffect, useState } from 'react';
import { MessageSquareText } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/app/components/ui/alert-dialog';

const ModalReporteObservaciones: React.FC<{
  abierto: boolean;
  fechaInicial: string;
  onCancelar: () => void;
  onConfirmar: (fecha: string) => void;
}> = ({ abierto, fechaInicial, onCancelar, onConfirmar }) => {
  const [fecha, setFecha] = useState(fechaInicial);

  useEffect(() => {
    if (abierto) setFecha(fechaInicial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  return (
    <AlertDialog
      open={abierto}
      onOpenChange={(open) => {
        if (!open) onCancelar();
      }}
    >
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 sm:mx-0">
            <MessageSquareText className="h-6 w-6 text-[#113EB9]" />
          </div>
          <AlertDialogTitle className="text-center sm:text-left">
            Reporte de observaciones
            <br />
            <span className="text-sm font-normal text-gray-500">
              Observaciones y solicitudes enviadas por los conductores en el día elegido
              (00:00 - 23:59).
            </span>
          </AlertDialogTitle>
        </AlertDialogHeader>

        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="h-9 w-full rounded-md border border-gray-300 px-3 text-[13px] text-gray-700 focus:border-[#113EB9] focus:outline-none focus:ring-1 focus:ring-[#113EB9]"
        />

        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={onCancelar}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onConfirmar(fecha)}
            disabled={!fecha}
            className="rounded-md bg-[#113EB9] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-800 disabled:opacity-50"
          >
            Ver reporte
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ModalReporteObservaciones;
