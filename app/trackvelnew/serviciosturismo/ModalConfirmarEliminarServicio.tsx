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
        <AlertDialogCancel disabled={eliminando} onClick={onCancelar}>
          Cancelar
        </AlertDialogCancel>
        <AlertDialogAction
          onClick={onConfirmar}
          disabled={eliminando}
          className="bg-red-600 hover:bg-red-700"
        >
          {eliminando ? 'Eliminando...' : 'Eliminar'}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export default ModalConfirmarEliminarServicio;
