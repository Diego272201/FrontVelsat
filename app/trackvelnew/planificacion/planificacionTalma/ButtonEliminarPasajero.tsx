import React from 'react';
import { Trash2 } from 'lucide-react';
import { Pasajero } from './types';

interface ButtonEliminarPasajeroProps {
  pasajero: Pasajero;
  grupoId: string;
  onEliminar: (pasajero: Pasajero, grupoId: string) => void;
}

const ButtonEliminarPasajero: React.FC<ButtonEliminarPasajeroProps> = ({
  pasajero,
  grupoId,
  onEliminar
}) => {
  return (
    <button
      onClick={() => onEliminar(pasajero, grupoId)}
      className="p-2 bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
      title="Eliminar"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
};

export default ButtonEliminarPasajero;