import React, { useEffect, useState } from 'react';
import { Trash2, RotateCcw, RefreshCw } from 'lucide-react';
import { Pasajero } from './types';
import { Spinner } from '@nextui-org/react';
import { toast } from 'sonner';

interface PapeleraGruposProps {
  fecha: string;
  hora: string;
  tipo: 'S' | 'I';
  triggerRecarga?: number;
  pasajerosRestaurados?: Set<string>; 
  onRestaurar: (pasajero: Pasajero & { grupoOriginalId?: string }) => void;
  onEliminarPermanentemente: (pasajeroId: string) => void;
}

export const PapeleraGrupos: React.FC<PapeleraGruposProps> = ({
  fecha,
  hora,
  tipo,
  triggerRecarga,
  pasajerosRestaurados = new Set(),
  onRestaurar,
  onEliminarPermanentemente
}) => {
  const [pasajerosEliminados, setPasajerosEliminados] = useState<(Pasajero & { grupoOriginalId?: string })[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargarEliminados = async () => {
    if (!fecha || !hora) {
      return;
    }

    setCargando(true);
    setError(null);

    try {
      const fechaFormateada = encodeURIComponent(fecha);
      const horaFormateada = encodeURIComponent(hora);
      
      const url = `https://do.velsat.pe:2083/api/Talma/PreplanTalmaEliminados?tipo=${tipo}&fecha=${fechaFormateada}&hora=${horaFormateada}`;
      
      console.log('Cargando eliminados desde:', url);

      const response = await fetch(url);

      
      if (response.status === 404) {
        console.log('ℹNo hay pasajeros eliminados (404)');
        setPasajerosEliminados([]);
        setCargando(false);
        return;
      }

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Eliminados cargados:', data);

      const pasajerosMapeados = data.map((item: any) => ({
        id: item.codigo || item.id || item.ID,
        nombre: item.nombre || item.Nombre || '',
        distrito: item.direccionPasajero?.distrito || item.distrito || item.Distrito || '',
        direccion: item.direccionPasajero?.direccion || item.direccion || item.Direccion || '',
        fecha: `${item.fecha || item.Fecha || ''} ${item.hora || ''}`.trim(),
        area: item.empresa || item.area || item.Area || '',
        grupoOriginalId: item.grupo, 
        _apiData: item 
      }));

      setPasajerosEliminados(pasajerosMapeados);

    } catch (error: any) {
      console.error('❌ Error al cargar eliminados:', error);
      setError(error.message);
      toast.error(`Error al cargar papelera: ${error.message}`);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarEliminados();
  }, [fecha, hora, tipo, triggerRecarga]); 

  // Si no hay parámetros, no mostrar nada
  if (!fecha || !hora) {
    return null;
  }

  // Estado de carga
  if (cargando) {
    return (
      <div className="mt-3 mb-2 bg-red-50 rounded-lg shadow-md border-2 border-red-300 p-8">
        <div className="flex items-center justify-center gap-3">
          <Spinner size="sm" color="danger" />
          <span className="text-sm text-red-800">Cargando papelera...</span>
        </div>
      </div>
    );
  }

  // Estado de error
  if (error) {
    return (
      <div className="mt-3 mb-2 bg-red-50 rounded-lg shadow-md border-2 border-red-300 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trash2 className="w-5 h-5 text-red-800" />
            <span className="text-sm font-bold text-red-900">Error al cargar papelera</span>
          </div>
          <button
            onClick={cargarEliminados}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded transition-colors text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Reintentar
          </button>
        </div>
        <p className="text-xs text-red-700 mt-2">{error}</p>
      </div>
    );
  }

  const pasajerosVisibles = pasajerosEliminados.filter(p => !pasajerosRestaurados.has(p.id));

  if (pasajerosVisibles.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 mb-2 bg-red-50 rounded-lg shadow-md border-2 border-red-300 overflow-hidden">
      <div className="bg-gradient-to-r from-red-200 to-red-300 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trash2 className="w-5 h-5 text-red-800" />
          <span className="text-sm font-bold text-red-900">
            Papelera ({pasajerosVisibles.length} pasajero{pasajerosVisibles.length !== 1 ? 's' : ''})
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-red-800">
            Puedes restaurar pasajeros a su grupo original
          </span>
          <button
            onClick={cargarEliminados}
            className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
            title="Recargar papelera"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-red-100 border-b-2 border-red-300">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-700">N°</th>
              <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-700">Nombre</th>
              <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-700">Distrito</th>
              <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-700">Dirección</th>
              <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-700">Fecha</th>
              <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-700">Área</th>
              <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-700">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-red-200">
            {pasajerosVisibles.map((pasajero, index) => (
              <tr key={pasajero.id} className="hover:bg-red-100 transition-colors">
                <td className="px-4 py-2 text-[12px] text-gray-900 font-medium">{index + 1}</td>
                <td className="px-4 py-2 text-[12px] text-gray-900">{pasajero.nombre}</td>
                <td className="px-4 py-2 text-[12px] text-gray-700">{pasajero.distrito}</td>
                <td className="px-4 py-2 text-[12px] text-gray-700 max-w-md">{pasajero.direccion}</td>
                <td className="px-4 py-2 text-[12px] text-gray-700">{pasajero.fecha}</td>
                <td className="px-4 py-2 text-[12px]">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                    {pasajero.area}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => onRestaurar(pasajero)}
                    className="p-2 bg-green-500 hover:bg-green-600 text-white rounded transition-colors"
                    title="Restaurar al grupo original"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};