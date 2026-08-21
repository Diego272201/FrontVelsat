'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/app/components/ui/alert-dialog';

const ModalConfirmarEliminarCarga: React.FC<{
  abierto: boolean;
  fecha: string;
  eliminando: boolean;
  onCancelar: () => void;
  onConfirmar: () => void;
}> = ({ abierto, fecha, eliminando, onCancelar, onConfirmar }) => (
  <AlertDialog
    open={abierto}
    onOpenChange={(open) => {
      if (!open && !eliminando) onCancelar();
    }}
  >
    <AlertDialogContent>
      <AlertDialogHeader>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 sm:mx-0">
          <AlertTriangle className="h-6 w-6 text-red-600" />
        </div>
        <AlertDialogTitle className="text-center sm:text-left">
          ¿Eliminar TODOS los servicios del <strong>{fecha}</strong>?
          <br />
          <span className="text-sm font-normal text-gray-500">
            Se borrarán físicamente de la base de datos. Esta acción no se puede deshacer.
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
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 active:bg-red-800 disabled:opacity-50"
        >
          {eliminando ? 'Eliminando...' : 'Eliminar carga'}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export default ModalConfirmarEliminarCarga;
