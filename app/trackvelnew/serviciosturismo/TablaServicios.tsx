'use client';

import React from 'react';
import { Spinner } from '@nextui-org/react';
import { EditFormServicio, ServicioTurismoVista } from './types';
import { Conductor } from './SelectBuscable';
import FilaServicio from './FilaServicio';

const TablaServicios: React.FC<{
  cargando: boolean;
  cargandoUnidades: boolean;
  error: string | null;
  servicios: ServicioTurismoVista[];
  totalSinFiltrar: number;
  unidades: string[];
  conductores: Conductor[];
  expandidos: Set<number>;
  onToggleExpandido: (idservicio: number) => void;
  editandoId: number | null;
  formEdicion: EditFormServicio | null;
  guardandoEdicion: boolean;
  onCambioCampo: (campo: keyof EditFormServicio, valor: string) => void;
  onIniciarEdicion: (servicio: ServicioTurismoVista) => void;
  onCancelarEdicion: () => void;
  onGuardarEdicion: () => void;
  onSolicitarCancelar: (servicio: ServicioTurismoVista) => void;
  onPonerEnStandby: (servicio: ServicioTurismoVista) => void;
  onReanudar: (servicio: ServicioTurismoVista) => void;
  procesandoStandbyId: number | null;
}> = ({
  cargando,
  cargandoUnidades,
  error,
  servicios,
  totalSinFiltrar,
  unidades,
  conductores,
  expandidos,
  onToggleExpandido,
  editandoId,
  formEdicion,
  guardandoEdicion,
  onCambioCampo,
  onIniciarEdicion,
  onCancelarEdicion,
  onGuardarEdicion,
  onSolicitarCancelar,
  onPonerEnStandby,
  onReanudar,
  procesandoStandbyId,
}) => {
  if (cargando || cargandoUnidades) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Spinner color="primary" size="md" />
        <span className="mt-3 text-[12px] text-gray-500">
          {cargandoUnidades && !cargando
            ? 'Cargando unidades registradas...'
            : 'Cargando servicios...'}
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center bg-white py-12">
        <p className="text-sm font-medium text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="max-h-[calc(100vh-80px)] overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 z-10 bg-[#113eb9]">
            <tr>
              <th className="w-6 px-1.5 py-1.5"></th>
              <th className="px-1.5 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-50">
                Fecha
              </th>
              <th className="px-1.5 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-50">
                Hora Inicio
              </th>
              <th className="px-1.5 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-50">
                Tipo Unidad
              </th>
              <th className="px-1.5 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-50">
                Placa
              </th>
              <th className="px-1.5 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-50">
                Piloto
              </th>
              <th className="px-1.5 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-50">
                Cliente
              </th>
              <th className="px-1.5 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-50">
                Grupo
              </th>
              <th className="px-1.5 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-50">
                Origen
              </th>
              <th className="px-1.5 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-50">
                Destino
              </th>
              <th className="px-1.5 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-50">
                Acciones
              </th>
              <th className="w-20 px-1.5 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-50">
                Estado
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {servicios.map((servicio) => (
              <FilaServicio
                key={servicio.idservicio}
                servicio={servicio}
                unidades={unidades}
                conductores={conductores}
                expandido={expandidos.has(servicio.idservicio)}
                onToggle={() => onToggleExpandido(servicio.idservicio)}
                editando={editandoId === servicio.idservicio}
                bloqueado={editandoId !== null && editandoId !== servicio.idservicio}
                guardando={guardandoEdicion && editandoId === servicio.idservicio}
                formEdicion={editandoId === servicio.idservicio ? formEdicion : null}
                onCambioCampo={onCambioCampo}
                onIniciarEdicion={() => onIniciarEdicion(servicio)}
                onCancelarEdicion={onCancelarEdicion}
                onGuardarEdicion={onGuardarEdicion}
                onSolicitarCancelar={() => onSolicitarCancelar(servicio)}
                onPonerEnStandby={() => onPonerEnStandby(servicio)}
                onReanudar={() => onReanudar(servicio)}
                procesandoStandby={procesandoStandbyId === servicio.idservicio}
              />
            ))}
          </tbody>
        </table>

        {servicios.length === 0 && (
          <div className="flex items-center justify-center bg-white py-12">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500">
                {totalSinFiltrar === 0
                  ? 'No se encontraron servicios de turismo con placa registrada en el sistema'
                  : 'Ningún servicio coincide con el piloto u hora seleccionados'}
              </p>
              <p className="mt-1 text-[12px] text-gray-400">
                {totalSinFiltrar === 0
                  ? 'Prueba seleccionando otra fecha, o verifica que el bus/placa del servicio coincida con una unidad registrada'
                  : 'Prueba con otro nombre de piloto o cambia el filtro de hora'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TablaServicios;
