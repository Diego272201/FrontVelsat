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

const ModalConfirmarEliminarServicio: React.FC<{
  servicio: ServicioTurismoVista | null;
  eliminando: boolean;
  onCancelar: () => void;
  onConfirmar: () => void;
}> = ({ servicio, eliminando, onCancelar, onConfirmar }) => (
  <AlertDialog
    open={!!servicio}
    onOpenChange={(open) => {
      if (!open && !eliminando) onCancelar();
    }}
  >
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>
          ¿Eliminar el servicio de <strong>{servicio?.cliente || 'este servicio'}</strong>?
          <br />
          <span className="text-sm font-normal text-red-600">
            Esta acción no se puede deshacer.
          </span>
        </AlertDialogTitle>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel
          disabled={eliminando}
          onClick={onCancelar}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          Cancelar
        </AlertDialogCancel>
        <AlertDialogAction
          onClick={onConfirmar}
          disabled={eliminando}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
        >
          {eliminando ? 'Eliminando...' : 'Eliminar'}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export default ModalConfirmarEliminarServicio;
