'use client';

import React from 'react';
import { FileSpreadsheet, PlusCircle, RefreshCw, Search } from 'lucide-react';

const BarraFiltros: React.FC<{
  totalServicios: number;
  fecha: string;
  onCambiarFecha: (valor: string) => void;
  busquedaPiloto: string;
  onCambiarBusquedaPiloto: (valor: string) => void;
  horaFiltro: string;
  onCambiarHoraFiltro: (valor: string) => void;
  horasDisponibles: string[];
  deshabilitado: boolean;
  onConsultar: () => void;
  onAgregarServicio: () => void;
  onCargarExcel: () => void;
}> = ({
  totalServicios,
  fecha,
  onCambiarFecha,
  busquedaPiloto,
  onCambiarBusquedaPiloto,
  horaFiltro,
  onCambiarHoraFiltro,
  horasDisponibles,
  deshabilitado,
  onConsultar,
  onAgregarServicio,
  onCargarExcel,
}) => (
  <div className="border-b border-gray-200 bg-[#efeff0] px-4 py-2">
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2 border-r border-gray-200 pr-4">
        <div className="h-5 w-1 bg-[#113EB9]"></div>
        <h1 className="text-[13px] font-bold uppercase tracking-wide text-gray-800">
          Servicios Turismo
        </h1>
        <span className="rounded-md bg-[#113EB9] px-1.5 py-0.5 text-[10px] font-semibold text-white">
          {totalServicios}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <label
          className="text-[12px] font-medium text-gray-600"
          htmlFor="fecha-servicio"
        >
          Fecha:
        </label>
        <input
          id="fecha-servicio"
          type="date"
          value={fecha}
          disabled={deshabilitado}
          onChange={(e) => onCambiarFecha(e.target.value)}
          className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 text-[12px] focus:border-[#113EB9] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#113EB9] disabled:cursor-not-allowed disabled:opacity-50"
        />
        {/* Cambiar la fecha ya dispara la consulta; este botón permite además recargar
            la misma fecha, útil para ver si el conductor ya vio o confirmó sus servicios. */}
        <button
          onClick={onConsultar}
          disabled={deshabilitado}
          title="Consultar los servicios de la fecha seleccionada"
          className="inline-flex items-center gap-1.5 rounded-md bg-[#113EB9] px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Consultar
        </button>
      </div>

      <div className="relative flex items-center">
        <Search className="pointer-events-none absolute left-2 h-3.5 w-3.5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar piloto..."
          value={busquedaPiloto}
          disabled={deshabilitado}
          onChange={(e) => onCambiarBusquedaPiloto(e.target.value)}
          className="w-40 rounded-md border border-gray-200 bg-gray-50 py-1.5 pl-7 pr-2 text-[12px] placeholder-gray-400 focus:border-[#113EB9] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#113EB9] disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <div className="flex items-center gap-2">
        <label
          className="text-[12px] font-medium text-gray-600"
          htmlFor="hora-servicio"
        >
          Hora:
        </label>
        <select
          id="hora-servicio"
          value={horaFiltro}
          disabled={deshabilitado}
          onChange={(e) => onCambiarHoraFiltro(e.target.value)}
          className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 text-[12px] focus:border-[#113EB9] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#113EB9] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">Todas</option>
          {horasDisponibles.map((hora) => (
            <option key={hora} value={hora}>
              {hora}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={onAgregarServicio}
        disabled={deshabilitado}
        className="inline-flex items-center gap-1.5 rounded-md bg-brandSecondary px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-brandSecondary-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        <PlusCircle className="h-3.5 w-3.5" />
        Agregar Servicio
      </button>

      <button
        onClick={onCargarExcel}
        disabled={deshabilitado}
        className="inline-flex items-center gap-1.5 rounded-md bg-[#113EB9] px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <FileSpreadsheet className="h-3.5 w-3.5" />
        Cargar Excel
      </button>
    </div>
  </div>
);

export default BarraFiltros;
