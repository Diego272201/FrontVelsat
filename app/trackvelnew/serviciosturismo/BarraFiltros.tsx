'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  Calendar,
  FileSpreadsheet,
  ListFilter,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { getIsoToday } from './utils';

interface BarraFiltrosProps {
  totalServicios: number;
  totalPilotos: number;
  fecha: string;
  onCambiarFecha: (valor: string) => void;
  busquedaTexto: string;
  onCambiarBusquedaTexto: (valor: string) => void;
  horaFiltro: string;
  onCambiarHoraFiltro: (valor: string) => void;
  horasDisponibles: string[];
  tipoUnidadFiltro: string;
  onCambiarTipoUnidadFiltro: (valor: string) => void;
  tiposUnidadDisponibles: string[];
  estadoFiltro: string | null;
  onToggleEstadoFiltro: (sigla: string) => void;
  conteosEstado: { F: number; VC: number; CC: number; PLACA_DESCONOCIDA: number };
  isVisible: boolean;
  onToggleVisible: () => void;
  deshabilitado: boolean;
  onConsultar: () => void;
  onDescargarResumen: () => void;
  onAgregarServicio: () => void;
  onCargarExcel: () => void;
  claveOpcionesAvanzadas: string;
  onCambiarClaveOpcionesAvanzadas: (valor: string) => void;
  opcionesAvanzadasDesbloqueado: boolean;
  onVerificarClaveOpcionesAvanzadas: () => void;
  onEliminarCarga: () => void;
  eliminandoCarga: boolean;
}

const BarraFiltros: React.FC<BarraFiltrosProps> = ({
  totalServicios,
  totalPilotos,
  fecha,
  onCambiarFecha,
  busquedaTexto,
  onCambiarBusquedaTexto,
  horaFiltro,
  onCambiarHoraFiltro,
  horasDisponibles,
  tipoUnidadFiltro,
  onCambiarTipoUnidadFiltro,
  tiposUnidadDisponibles,
  estadoFiltro,
  onToggleEstadoFiltro,
  conteosEstado,
  isVisible,
  onToggleVisible,
  deshabilitado,
  onConsultar,
  onDescargarResumen,
  onAgregarServicio,
  onCargarExcel,
  claveOpcionesAvanzadas,
  onCambiarClaveOpcionesAvanzadas,
  opcionesAvanzadasDesbloqueado,
  onVerificarClaveOpcionesAvanzadas,
  onEliminarCarga,
  eliminandoCarga,
}) => {
  const [tabActivo, setTabActivo] = useState<'consulta' | 'avanzadas'>('consulta');

  return (
    <div className="w-full">
      <div className="sticky top-0 z-50 bg-[#113EB9]">
        <div className="flex h-12 items-stretch justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-full items-center bg-gradient-to-r from-orange-500 to-red-500 px-4">
              <Image
                src="/LogoWeb.png"
                alt="Velsat"
                width={44}
                height={44}
                className="h-9 w-9 object-contain"
              />
            </div>

            <div className="h-7 w-[2px] rounded-full bg-white/40 self-center" />

            <div className="flex flex-col justify-center">
              <span className="text-[9.5px] font-bold uppercase tracking-wider text-blue-200 leading-none mb-0.5">
                OPERACIONES / PROGRAMACIÓN
              </span>
              <h1 className="text-[14px] font-bold leading-none tracking-[0.01em] text-white flex items-center gap-1.5 uppercase">
                <span>SERVICIOS TURISMO</span>
              </h1>
            </div>

            <button
              type="button"
              onClick={onAgregarServicio}
              disabled={deshabilitado}
              className="ml-2 flex items-center gap-1.5 rounded-md bg-white px-3.5 py-1.5 text-[12px] font-bold text-[#113EB9] transition-colors hover:bg-blue-50 disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
              <span>Agregar servicio</span>
            </button>

            <button
              type="button"
              onClick={onCargarExcel}
              disabled={deshabilitado}
              className="flex items-center gap-1.5 rounded-md border border-white/30 px-3.5 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-50"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Cargar Excel</span>
            </button>
          </div>

          <div className="flex items-center gap-2 pr-4">
            <div className="flex items-center gap-1.5 rounded-full bg-white/20 px-3.5 py-1 text-[11px]">
              <span className="font-semibold tracking-wider text-blue-100">SERVICIOS</span>
              <span className="font-bold text-white">{totalServicios}</span>
            </div>

            <div className="flex items-center gap-1.5 rounded-full bg-white/20 px-3.5 py-1 text-[11px]">
              <span className="font-semibold tracking-wider text-blue-100">PILOTOS</span>
              <span className="font-bold text-white">{totalPilotos}</span>
            </div>

            <button
              type="button"
              onClick={onToggleVisible}
              className="flex items-center gap-2 rounded-md border border-white/40 px-2.5 py-1 text-[12px] font-semibold text-white transition-colors hover:bg-white/10"
            >
              <ListFilter className="h-3.5 w-3.5 text-white" />
              <span>Filtros</span>
              <span
                className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out ${
                  isVisible ? 'bg-white' : 'bg-white/35'
                }`}
              >
                <span
                  className={`h-3 w-3 rounded-full transition-all duration-200 ease-in-out ${
                    isVisible
                      ? 'translate-x-3 bg-[#113EB9]'
                      : 'translate-x-0 bg-white'
                  }`}
                />
              </span>
            </button>
          </div>
        </div>
      </div>

      {isVisible && (
        <div className="border-b border-gray-200 bg-white">
          <div className="flex items-center gap-1 border-b border-gray-200 bg-[#f8fafc] px-3 pt-2">
            <button
              type="button"
              onClick={() => setTabActivo('consulta')}
              className={`flex items-center gap-2 border-b-2 px-3.5 py-1.5 text-[12px] transition-colors ${
                tabActivo === 'consulta'
                  ? 'border-[#113EB9] font-bold text-[#113EB9] bg-white rounded-t-md'
                  : 'border-transparent font-medium text-gray-500 hover:text-gray-800'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Consulta del día</span>
            </button>

            <button
              type="button"
              onClick={() => setTabActivo('avanzadas')}
              className={`flex items-center gap-2 border-b-2 px-3.5 py-1.5 text-[12px] transition-colors ${
                tabActivo === 'avanzadas'
                  ? 'border-[#113EB9] font-bold text-[#113EB9] bg-white rounded-t-md'
                  : 'border-transparent font-medium text-gray-500 hover:text-gray-800'
              }`}
            >
              <ShieldCheck
                className={`h-3.5 w-3.5 ${
                  opcionesAvanzadasDesbloqueado ? 'text-emerald-600' : 'text-gray-400'
                }`}
              />
              <span>Opciones avanzadas</span>
            </button>
          </div>

          <div className="border-b border-gray-200 bg-white px-4 py-2.5">
            {tabActivo === 'consulta' ? (
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="date"
                  value={fecha}
                  disabled={deshabilitado}
                  onChange={(e) => onCambiarFecha(e.target.value)}
                  className="h-8 rounded-md border border-gray-200 bg-white px-2.5 text-[12px] text-gray-700 focus:border-[#113EB9] focus:outline-none focus:ring-1 focus:ring-[#113EB9] disabled:cursor-not-allowed disabled:opacity-50"
                />

                <select
                  value={horaFiltro}
                  disabled={deshabilitado}
                  onChange={(e) => onCambiarHoraFiltro(e.target.value)}
                  className="h-8 rounded-md border border-gray-200 bg-white px-2.5 text-[12px] text-gray-700 focus:border-[#113EB9] focus:outline-none focus:ring-1 focus:ring-[#113EB9] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Hora: todas</option>
                  {horasDisponibles.map((h) => (
                    <option key={h} value={h}>
                      Hora: {h}
                    </option>
                  ))}
                </select>

                <select
                  value={tipoUnidadFiltro}
                  disabled={deshabilitado}
                  onChange={(e) => onCambiarTipoUnidadFiltro(e.target.value)}
                  className="h-8 rounded-md border border-gray-200 bg-white px-2.5 text-[12px] text-gray-700 focus:border-[#113EB9] focus:outline-none focus:ring-1 focus:ring-[#113EB9] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Tipo unidad: todos</option>
                  {tiposUnidadDisponibles.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={onConsultar}
                  disabled={deshabilitado}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#113EB9] px-3.5 text-[11px] font-semibold text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Consultar</span>
                </button>

                <button
                  type="button"
                  onClick={() => onCambiarFecha(getIsoToday())}
                  disabled={deshabilitado}
                  className="inline-flex h-8 items-center rounded-md border border-gray-300 bg-white px-3 text-[11px] font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Hoy
                </button>

                <button
                  type="button"
                  onClick={onDescargarResumen}
                  disabled={deshabilitado}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 text-[11px] font-semibold text-[#113EB9] transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-[#113EB9]" />
                  <span>Resumen del día</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <label
                  htmlFor="clave-opciones-avanzadas"
                  className="text-[12px] font-medium text-gray-700"
                >
                  Clave de autorización:
                </label>
                <input
                  id="clave-opciones-avanzadas"
                  type="password"
                  autoComplete="off"
                  placeholder="Ingrese clave"
                  value={claveOpcionesAvanzadas}
                  disabled={deshabilitado}
                  onChange={(e) => onCambiarClaveOpcionesAvanzadas(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onVerificarClaveOpcionesAvanzadas();
                  }}
                  className="h-8 w-36 rounded-md border border-gray-200 bg-white px-2.5 text-[12px] text-gray-700 focus:border-[#113EB9] focus:outline-none focus:ring-1 focus:ring-[#113EB9] disabled:cursor-not-allowed disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={onVerificarClaveOpcionesAvanzadas}
                  disabled={deshabilitado}
                  className="inline-flex h-8 items-center rounded-md bg-[#113EB9] px-3.5 text-[11px] font-semibold text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Aceptar
                </button>

                {opcionesAvanzadasDesbloqueado && (
                  <>
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Opciones avanzadas habilitadas (Historial disponible)
                    </span>
                    <button
                      type="button"
                      onClick={onEliminarCarga}
                      disabled={deshabilitado || eliminandoCarga}
                      title="Elimina TODOS los servicios de la fecha seleccionada"
                      className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-md bg-red-600 px-3.5 text-[11px] font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>{eliminandoCarga ? 'Eliminando...' : 'Eliminar carga'}</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-[#f8fafc] px-4 py-2">
        <div className="flex items-center gap-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
            BÚSQUEDA
          </span>
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Unidad, piloto, cliente, grupo u origen"
              value={busquedaTexto}
              disabled={deshabilitado}
              onChange={(e) => onCambiarBusquedaTexto(e.target.value)}
              className="h-8 w-72 sm:w-80 rounded-md border border-gray-300 bg-white py-1 pl-8 pr-2 text-[12px] text-gray-700 placeholder-gray-400 focus:border-[#113EB9] focus:outline-none focus:ring-1 focus:ring-[#113EB9] disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          {busquedaTexto && (
            <button
              type="button"
              onClick={() => onCambiarBusquedaTexto('')}
              className="h-8 rounded-md border border-gray-300 bg-white px-2.5 text-[11px] font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              Limpiar
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onToggleEstadoFiltro('F')}
            title="Filtrar por Finalizado por conductor"
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition-all ${
              estadoFiltro === 'F'
                ? 'bg-rose-100 text-rose-800 ring-2 ring-rose-500'
                : 'bg-rose-50 text-rose-700 border border-rose-200/80 hover:bg-rose-100/70'
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            <span>F · Finalizado por conductor</span>
            <span className="ml-1 rounded-full bg-white/80 px-1.5 py-0.2 text-[10px] font-bold">
              {conteosEstado.F}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onToggleEstadoFiltro('VC')}
            title="Filtrar por Visto por conductor"
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition-all ${
              estadoFiltro === 'VC'
                ? 'bg-amber-100 text-amber-800 ring-2 ring-amber-500'
                : 'bg-amber-50 text-amber-700 border border-amber-200/80 hover:bg-amber-100/70'
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            <span>VC · Visto por conductor</span>
            <span className="ml-1 rounded-full bg-white/80 px-1.5 py-0.2 text-[10px] font-bold">
              {conteosEstado.VC}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onToggleEstadoFiltro('CC')}
            title="Filtrar por Cerrado y conforme"
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition-all ${
              estadoFiltro === 'CC'
                ? 'bg-emerald-100 text-emerald-800 ring-2 ring-emerald-500'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 hover:bg-emerald-100/70'
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>CC · Cerrado y conforme</span>
            <span className="ml-1 rounded-full bg-white/80 px-1.5 py-0.2 text-[10px] font-bold">
              {conteosEstado.CC}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onToggleEstadoFiltro('PLACA_DESCONOCIDA')}
            title="Filtrar por placa no registrada en el sistema (el conductor no ve estos servicios en su app)"
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition-all ${
              estadoFiltro === 'PLACA_DESCONOCIDA'
                ? 'bg-orange-100 text-orange-800 ring-2 ring-orange-500'
                : 'bg-orange-50 text-orange-700 border border-orange-200/80 hover:bg-orange-100/70'
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
            <span>Placa desconocida</span>
            <span className="ml-1 rounded-full bg-white/80 px-1.5 py-0.2 text-[10px] font-bold">
              {conteosEstado.PLACA_DESCONOCIDA}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BarraFiltros;
