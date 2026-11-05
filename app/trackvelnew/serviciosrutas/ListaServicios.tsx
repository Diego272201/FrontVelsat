'use client';

import React from 'react';
import { Ban, CalendarClock, Pencil } from 'lucide-react';
import { Servicio } from './types';
import { ESTADO_SERVICIO_CLASE, ESTADO_SERVICIO_LABEL } from './utils';

interface ListaServiciosProps {
  servicios: Servicio[];
  /** Solo se ofrece en servicios PROGRAMADO. */
  onEditar: (servicio: Servicio) => void;
  /** Solo se ofrece en servicios EN_CURSO (los PROGRAMADO se cambian con Editar). */
  onReprogramar: (servicio: Servicio) => void;
  /** Se ofrece en servicios PROGRAMADO y EN_CURSO. */
  onCancelar: (servicio: Servicio) => void;
}

// Iniciar y finalizar un servicio, y marcar las geocercas, lo hace la app móvil: aquí no hay botones.
const ListaServicios: React.FC<ListaServiciosProps> = ({
  servicios,
  onEditar,
  onReprogramar,
  onCancelar,
}) => {
  if (servicios.length === 0) {
    return (
      <div className="flex h-full min-h-[200px] items-center justify-center rounded-md border border-dashed border-gray-300 bg-white text-sm text-gray-400">
        No hay servicios con los filtros seleccionados
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto rounded-md border border-gray-300 bg-white">
      <table className="w-full border-collapse text-[12px]">
        <thead className="sticky top-0 bg-slate-100 text-left text-gray-600">
          <tr>
            <th className="px-2 py-2 font-semibold">Hora</th>
            <th className="px-2 py-2 font-semibold">Ruta</th>
            <th className="px-2 py-2 font-semibold">Unidad</th>
            <th className="px-2 py-2 font-semibold">Conductor</th>
            <th className="px-2 py-2 font-semibold">Avance</th>
            <th className="px-2 py-2 font-semibold">Estado</th>
            <th className="px-2 py-2" />
          </tr>
        </thead>
        <tbody>
          {servicios.map((s) => (
            <tr key={s.id} className="border-t border-gray-100 hover:bg-slate-50">
              <td className="px-2 py-1.5 font-medium text-gray-800">{s.horaSalida}</td>
              <td className="px-2 py-1.5 text-gray-700">{s.rutaNombre}</td>
              <td className="px-2 py-1.5 font-medium text-gray-800">{s.deviceID}</td>
              <td className="px-2 py-1.5 text-gray-700">
                <div>{s.conductorNombre}</div>
                <div className="text-[11px] text-gray-400">
                  {s.conductorBrevete} · {s.conductorCelular}
                </div>
              </td>
              <td className="px-2 py-1.5 text-gray-700">
                {s.paraderosCompletados}/{s.totalParaderos}
              </td>
              <td className="px-2 py-1.5">
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${ESTADO_SERVICIO_CLASE[s.estado]}`}
                >
                  {ESTADO_SERVICIO_LABEL[s.estado]}
                </span>
              </td>
              <td className="px-2 py-1.5 text-right">
                <div className="flex items-center justify-end gap-1">
                  {s.estado === 'PROGRAMADO' && (
                    <button
                      type="button"
                      onClick={() => onEditar(s)}
                      title="Editar servicio"
                      className="rounded-md border border-gray-300 p-1 text-gray-600 hover:bg-gray-100"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {s.estado === 'EN_CURSO' && (
                    <button
                      type="button"
                      onClick={() => onReprogramar(s)}
                      title="Reprogramar servicio"
                      className="rounded-md border border-gray-300 p-1 text-gray-600 hover:bg-gray-100"
                    >
                      <CalendarClock className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {(s.estado === 'PROGRAMADO' || s.estado === 'EN_CURSO') && (
                    <button
                      type="button"
                      onClick={() => onCancelar(s)}
                      title="Cancelar servicio"
                      className="rounded-md border border-red-200 p-1 text-red-600 hover:bg-red-50"
                    >
                      <Ban className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ListaServicios;
