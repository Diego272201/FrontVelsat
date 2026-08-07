'use client';

import React from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/app/components/ui/alert-dialog';
import { ServicioTurismoVista } from './types';

const ModalConfirmarCancelarServicio: React.FC<{
  servicio: ServicioTurismoVista | null;
  cancelando: boolean;
  onCancelar: () => void;
  onConfirmar: () => void;
}> = ({ servicio, cancelando, onCancelar, onConfirmar }) => (
  <AlertDialog
    open={!!servicio}
    onOpenChange={(open) => {
      if (!open && !cancelando) onCancelar();
    }}
  >
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>
          ¿Cancelar el servicio de <strong>{servicio?.cliente || 'este servicio'}</strong>?
          <br />
          <span className="text-sm font-normal text-gray-500">
            El servicio quedará marcado como Cancelado.
          </span>
        </AlertDialogTitle>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel
          disabled={cancelando}
          onClick={onCancelar}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          Volver
        </AlertDialogCancel>
        <AlertDialogAction
          onClick={onConfirmar}
          disabled={cancelando}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
        >
          {cancelando ? 'Cancelando...' : 'Cancelar Servicio'}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export default ModalConfirmarCancelarServicio;
