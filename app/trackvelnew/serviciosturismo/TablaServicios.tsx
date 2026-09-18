'use client';

import React from 'react';
import { Spinner } from '@nextui-org/react';
import { X } from 'lucide-react';
import {
  AuditoriaCampo,
  ColumnaFiltrable,
  EditFormServicio,
  ServicioTurismoVista,
} from './types';
import { Conductor } from './SelectBuscable';
import FilaServicio from './FilaServicio';
import FiltroColumna from './FiltroColumna';

// Encabezados con filtro tipo Excel, en el mismo orden en que aparecen en la tabla.
const COLUMNAS_FILTRABLES: { key: ColumnaFiltrable; titulo: string }[] = [
  { key: 'fechainicio', titulo: 'Fecha' },
  { key: 'horainicio', titulo: 'Hora Inicio' },
  { key: 'tipounidad', titulo: 'Tipo Unidad' },
  { key: 'placaCombinada', titulo: 'Placa' },
  { key: 'piloto', titulo: 'Piloto' },
  { key: 'cliente', titulo: 'Cliente' },
  { key: 'grupo', titulo: 'Grupo' },
  { key: 'origen', titulo: 'Origen' },
  { key: 'destino', titulo: 'Destino' },
];

const TablaServicios: React.FC<{
  cargando: boolean;
  cargandoUnidades: boolean;
  error: string | null;
  servicios: ServicioTurismoVista[];
  totalSinFiltrar: number;
  unidades: string[];
  conductores: Conductor[];
  valoresPorColumna: Record<ColumnaFiltrable, string[]>;
  filtrosColumna: Partial<Record<ColumnaFiltrable, string[] | null>>;
  onCambiarFiltroColumna: (
    columna: ColumnaFiltrable,
    valores: string[] | null,
  ) => void;
  onLimpiarFiltrosColumna: () => void;
  hayFiltrosColumnaActivos: boolean;
  expandidos: Set<number>;
  onToggleExpandido: (idservicio: number) => void;
  editandoId: number | null;
  formEdicion: EditFormServicio | null;
  motivoEdicion: string;
  onCambiarMotivoEdicion: (valor: string) => void;
  guardandoEdicion: boolean;
  onCambioCampo: (campo: keyof EditFormServicio, valor: string) => void;
  onIniciarEdicion: (servicio: ServicioTurismoVista) => void;
  onCancelarEdicion: () => void;
  onGuardarEdicion: () => void;
  onSolicitarCancelar: (servicio: ServicioTurismoVista) => void;
  onPonerEnStandby: (servicio: ServicioTurismoVista) => void;
  onReanudar: (servicio: ServicioTurismoVista) => void;
  procesandoStandbyId: number | null;
  auditoriaPorServicio: Record<number, AuditoriaCampo[]>;
  cargandoAuditoriaId: number | null;
  opcionesAvanzadasDesbloqueado: boolean;
}> = ({
  cargando,
  cargandoUnidades,
  error,
  servicios,
  totalSinFiltrar,
  unidades,
  conductores,
  valoresPorColumna,
  filtrosColumna,
  onCambiarFiltroColumna,
  onLimpiarFiltrosColumna,
  hayFiltrosColumnaActivos,
  expandidos,
  onToggleExpandido,
  editandoId,
  formEdicion,
  motivoEdicion,
  onCambiarMotivoEdicion,
  guardandoEdicion,
  onCambioCampo,
  onIniciarEdicion,
  onCancelarEdicion,
  onGuardarEdicion,
  onSolicitarCancelar,
  onPonerEnStandby,
  onReanudar,
  procesandoStandbyId,
  auditoriaPorServicio,
  cargandoAuditoriaId,
  opcionesAvanzadasDesbloqueado,
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
              <th className="w-6 px-1.5 py-1.5">
                {hayFiltrosColumnaActivos && (
                  <button
                    type="button"
                    onClick={onLimpiarFiltrosColumna}
                    title="Quitar todos los filtros de columna"
                    className="rounded p-0.5 text-amber-300 hover:bg-white/15"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </th>
              {COLUMNAS_FILTRABLES.map((columna) => (
                <th key={columna.key} className="px-1.5 py-1.5">
                  <FiltroColumna
                    titulo={columna.titulo}
                    valores={valoresPorColumna[columna.key] || []}
                    seleccionados={filtrosColumna[columna.key] ?? null}
                    onAplicar={(valores) =>
                      onCambiarFiltroColumna(columna.key, valores)
                    }
                  />
                </th>
              ))}
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
                motivoEdicion={motivoEdicion}
                onCambiarMotivoEdicion={onCambiarMotivoEdicion}
                onCambioCampo={onCambioCampo}
                onIniciarEdicion={() => onIniciarEdicion(servicio)}
                onCancelarEdicion={onCancelarEdicion}
                onGuardarEdicion={onGuardarEdicion}
                onSolicitarCancelar={() => onSolicitarCancelar(servicio)}
                onPonerEnStandby={() => onPonerEnStandby(servicio)}
                onReanudar={() => onReanudar(servicio)}
                procesandoStandby={procesandoStandbyId === servicio.idservicio}
                auditoria={auditoriaPorServicio[servicio.idservicio]}
                cargandoAuditoria={cargandoAuditoriaId === servicio.idservicio}
                puedeVerHistorial={opcionesAvanzadasDesbloqueado}
              />
            ))}
          </tbody>
        </table>

        {servicios.length === 0 && (
          <div className="flex items-center justify-center bg-white py-12">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500">
                {totalSinFiltrar === 0
                  ? 'No se encontraron servicios de turismo'
                  : 'Ningún servicio coincide con el piloto u hora seleccionados'}
              </p>
              <p className="mt-1 text-[12px] text-gray-400">
                {totalSinFiltrar === 0
                  ? 'Prueba seleccionando otra fecha'
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
