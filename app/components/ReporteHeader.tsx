import React from 'react';
import Image from 'next/image';
import { Calendar, Search } from 'lucide-react';
import { IoSpeedometer } from 'react-icons/io5';

interface ReporteHeaderProps {
  title: string;
  deviceId: string;
  startDate: string;
  endDate: string;
  umbral?: string;
  extraInfo?: string;
  formatDate: (date: string) => string;
  icon?: React.ReactNode;
  subtitle?: string;
  registros?: number | string;
  periodo?: string;
  velocidadMaxima?: string;
  enMovimiento?: number | string;
  detenido?: number | string;
  promedioVelocidad?: string;
  excesosContador?: number | string;
  tramoPrincipal?: string;
  ultimaUbicacion?: string;
  searchTerm?: string;
  onSearchChange?: (val: string) => void;
  showSubHeader?: boolean;
  showStatusFilters?: boolean;
  filterStatus?: 'all' | 'moving' | 'stopped';
  onFilterStatusChange?: (status: 'all' | 'moving' | 'stopped') => void;
  speedReportMode?: boolean;
  hasta25Count?: number;
  entre26y40Count?: number;
  masDe40Count?: number;
  speedFilterRange?: 'all' | 'hasta25' | 'entre26y40' | 'masDe40';
  onSpeedFilterRangeChange?: (range: 'all' | 'hasta25' | 'entre26y40' | 'masDe40') => void;
  stopsReportMode?: boolean;
  tiempoDetenido?: string;
  paradaMasLarga?: string;
  zonaMasParadas?: string;
  onVerParadaMasLarga?: () => void;
  alertasSpeedMode?: boolean;
  unidadesInvolucradas?: number | string;
  unidadMasAlertas?: string;
  rango91a95Count?: number;
  rango96a100Count?: number;
  masDe100Count?: number;
  alertSpeedFilterRange?: 'all' | '91a95' | '96a100' | 'masDe100';
  onAlertSpeedFilterRangeChange?: (range: 'all' | '91a95' | '96a100' | 'masDe100') => void;
}

export default function ReporteHeader({
  title,
  deviceId,
  startDate,
  endDate,
  umbral,
  extraInfo,
  formatDate,
  subtitle = 'FLOTA / REPORTES',
  registros,
  periodo,
  velocidadMaxima,
  enMovimiento,
  detenido,
  promedioVelocidad,
  excesosContador,
  tramoPrincipal,
  ultimaUbicacion,
  searchTerm,
  onSearchChange,
  showSubHeader = true,
  showStatusFilters = true,
  filterStatus = 'all',
  onFilterStatusChange,
  speedReportMode = false,
  hasta25Count,
  entre26y40Count,
  masDe40Count,
  speedFilterRange = 'all',
  onSpeedFilterRangeChange,
  stopsReportMode = false,
  tiempoDetenido,
  paradaMasLarga,
  zonaMasParadas,
  onVerParadaMasLarga,
  alertasSpeedMode = false,
  unidadesInvolucradas,
  unidadMasAlertas,
  rango91a95Count,
  rango96a100Count,
  masDe100Count,
  alertSpeedFilterRange = 'all',
  onAlertSpeedFilterRangeChange,
}: ReporteHeaderProps) {
  return (
    <div className="sticky top-0 z-50 flex flex-col flex-shrink-0">
      {/* Header corporativo superior azul con logo naranja */}
      <header className="bg-[#113EB9] shadow-sm">
        <div className="flex h-12 items-stretch justify-between">
          {/* Lado izquierdo: Logo naranja, separador, subtítulo/título */}
          <div className="flex items-center gap-3">
            <div className="flex h-full items-center bg-gradient-to-r from-orange-500 to-red-500 px-4">
              <Image
                src="/LogoWeb.png"
                alt="Velsat"
                width={44}
                height={44}
                className="h-9 w-9 object-contain"
                priority
              />
            </div>

            <div className="h-7 w-[2px] rounded-full bg-white/40 self-center" />

            <div className="flex flex-col justify-center">
              <span className="text-[9.5px] font-bold uppercase tracking-wider text-blue-200 leading-none mb-0.5">
                {subtitle}
              </span>
              <h1 className="text-[14px] font-bold leading-none tracking-[0.01em] text-white flex items-center gap-1.5 uppercase">
                <span>{title}</span>
                {deviceId && (
                  <>
                    <span className="text-white/80 font-normal">:</span>
                    <span className="text-[#ffbe0b] font-bold">
                      {deviceId}
                    </span>
                  </>
                )}
              </h1>
            </div>
          </div>

          {/* Lado derecho: Indicador UMBRAL y Fechas */}
          <div className="flex items-center gap-2 pr-4">
            {umbral && (
              <div className="flex items-center gap-2 rounded-full bg-white/20 px-3.5 py-1 text-[11px] text-white">
                <IoSpeedometer className="h-3.5 w-3.5 text-blue-100 shrink-0" />
                <span className="text-blue-100 font-medium text-[10px] tracking-wider uppercase">UMBRAL</span>
                <span className="font-bold text-white tracking-wide">{umbral}</span>
              </div>
            )}

            {startDate && (
              <div className="flex items-center gap-2 rounded-full bg-white/20 px-3.5 py-1 text-[11px] text-white">
                <Calendar className="h-3.5 w-3.5 text-blue-100 shrink-0" />
                <span className="text-blue-100 font-medium text-[10px] tracking-wider uppercase">DESDE</span>
                <span className="font-bold text-white tracking-wide">{formatDate(startDate)}</span>
              </div>
            )}

            {endDate && (
              <div className="flex items-center gap-2 rounded-full bg-white/20 px-3.5 py-1 text-[11px] text-white">
                <Calendar className="h-3.5 w-3.5 text-blue-100 shrink-0" />
                <span className="text-blue-100 font-medium text-[10px] tracking-wider uppercase">HASTA</span>
                <span className="font-bold text-white tracking-wide">{formatDate(endDate)}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Sub-header / Barra de Métricas y Búsqueda */}
      {showSubHeader && (
        <div className="border-b border-slate-200 bg-[#f0f4fd] px-4 py-1.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Métricas del reporte */}
            {alertasSpeedMode ? (
              <div className="flex items-center gap-4 divide-x divide-slate-200 text-xs">
                <div className="flex flex-col">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500 leading-tight">
                    ALERTAS
                  </span>
                  <span className="text-[12px] font-bold text-slate-900 leading-tight">
                    {registros ?? '0'}
                  </span>
                </div>

                <div className="flex flex-col pl-4">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500 leading-tight">
                    PERIODO
                  </span>
                  <span className="text-[12px] font-bold text-slate-900 leading-tight">
                    {periodo || extraInfo || '1 día - 0 h - 1 min'}
                  </span>
                </div>

                <div className="flex flex-col pl-4">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500 leading-tight">
                    UNIDADES INVOLUCRADAS
                  </span>
                  <span className="text-[12px] font-bold text-slate-900 leading-tight">
                    {unidadesInvolucradas ?? '0'}
                  </span>
                </div>

                <div className="flex flex-col pl-4">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500 leading-tight">
                    VELOCIDAD MÁXIMA
                  </span>
                  <span className="text-[12px] font-bold text-[#b91c1c] leading-tight">
                    {velocidadMaxima ?? '0 km/h'}
                  </span>
                </div>

                <div className="flex flex-col pl-4 max-w-[280px]">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500 leading-tight">
                    UNIDAD CON MÁS ALERTAS
                  </span>
                  <span className="text-[11px] font-semibold text-slate-800 truncate leading-tight" title={unidadMasAlertas || '-'}>
                    {unidadMasAlertas || '-'}
                  </span>
                </div>
              </div>
            ) : stopsReportMode ? (
              <div className="flex items-center gap-4 divide-x divide-slate-200 text-xs">
                <div className="flex flex-col">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-600 leading-tight">
                    REGISTROS
                  </span>
                  <span className="text-[12px] font-bold text-slate-900 leading-tight">
                    {registros ?? '0'}
                  </span>
                </div>

                <div className="flex flex-col pl-4">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-600 leading-tight">
                    PERIODO
                  </span>
                  <span className="text-[12px] font-bold text-slate-900 leading-tight">
                    {periodo || extraInfo || '0 días, 0 horas, 0 minutos'}
                  </span>
                </div>

                <div className="flex flex-col pl-4">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-600 leading-tight">
                    TIEMPO DETENIDO
                  </span>
                  <span className="text-[12px] font-bold text-slate-900 leading-tight">
                    {tiempoDetenido ?? '00h 00m 00s'}
                  </span>
                </div>

                <div className="flex flex-col pl-4">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-600 leading-tight">
                    PARADA MÁS LARGA
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[12px] font-bold text-slate-900 leading-tight">
                      {paradaMasLarga ?? '00h 00m 00s'}
                    </span>
                    {onVerParadaMasLarga && (
                      <button
                        type="button"
                        onClick={onVerParadaMasLarga}
                        className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[9.5px] font-bold text-[#113EB9] border border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition-colors cursor-pointer shrink-0"
                        title="Ver y resaltar el registro de la parada más larga en la tabla"
                      >
                        <Search className="h-2.5 w-2.5" />
                        Ver registro
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-col pl-4 max-w-[280px]">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-600 leading-tight">
                    ZONA CON MÁS PARADAS
                  </span>
                  <span className="text-[11px] font-semibold text-slate-800 truncate leading-tight" title={zonaMasParadas || 'Sin datos'}>
                    {zonaMasParadas || 'Sin datos'}
                  </span>
                </div>
              </div>
            ) : speedReportMode ? (
              <div className="flex items-center gap-4 divide-x divide-slate-200 text-xs">
                <div className="flex flex-col">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-600 leading-tight">
                    REGISTROS
                  </span>
                  <span className="text-[12px] font-bold text-slate-900 leading-tight">
                    {registros ?? 0}
                  </span>
                </div>

                <div className="flex flex-col pl-4">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-600 leading-tight">
                    VELOCIDAD MÁXIMA
                  </span>
                  <span className="text-[12px] font-bold text-rose-700 leading-tight">
                    {velocidadMaxima ?? '0 km/h'}
                  </span>
                </div>

                <div className="flex flex-col pl-4">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-600 leading-tight">
                    PROMEDIO
                  </span>
                  <span className="text-[12px] font-bold text-slate-900 leading-tight">
                    {promedioVelocidad ?? '0 km/h'}
                  </span>
                </div>

                <div className="flex flex-col pl-4">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-600 leading-tight">
                    EXCESOS &gt; 100 KM/H
                  </span>
                  <span className="text-[12px] font-bold text-slate-900 leading-tight">
                    {typeof excesosContador === 'number' ? `${excesosContador} registros` : (excesosContador ?? '0 registros')}
                  </span>
                </div>

                <div className="flex flex-col pl-4 max-w-[280px]">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-600 leading-tight">
                    TRAMO PRINCIPAL
                  </span>
                  <span className="text-[11px] font-semibold text-slate-800 truncate leading-tight" title={tramoPrincipal || 'Sin datos'}>
                    {tramoPrincipal || 'Sin datos'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4 divide-x divide-slate-200 text-xs">
                <div className="flex flex-col">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-600 leading-tight">
                    REGISTROS
                  </span>
                  <span className="text-[12px] font-bold text-slate-900 leading-tight">
                    {registros ?? 0}
                  </span>
                </div>

                <div className="flex flex-col pl-4">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-600 leading-tight">
                    PERIODO
                  </span>
                  <span className="text-[12px] font-bold text-slate-900 leading-tight">
                    {periodo || extraInfo || '1 día · 0 h · 0 min'}
                  </span>
                </div>

                <div className="flex flex-col pl-4">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-600 leading-tight">
                    VELOCIDAD MÁXIMA
                  </span>
                  <span className="text-[12px] font-bold text-[#113EB9] leading-tight">
                    {velocidadMaxima ?? '0 km/h'}
                  </span>
                </div>

                <div className="flex flex-col pl-4 max-w-[280px]">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-600 leading-tight">
                    ÚLTIMA UBICACIÓN
                  </span>
                  <span className="text-[11px] font-semibold text-slate-800 truncate leading-tight" title={typeof ultimaUbicacion === 'string' && ultimaUbicacion ? ultimaUbicacion : 'Sin datos'}>
                    {ultimaUbicacion || 'Sin datos'}
                  </span>
                </div>
              </div>
            )}

            {/* Lado derecho: Buscador + Botones de Filtro */}
            <div className="flex items-center gap-2">
              <div className="relative w-56">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={alertasSpeedMode ? "Buscar por unidad, hora o ubicación..." : "Buscar por hora o ubicación..."}
                  value={searchTerm ?? ''}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  className="h-7 w-full rounded-md border border-slate-200 bg-white pl-8 pr-3 text-[11px] placeholder-slate-400 focus:border-[#113EB9] focus:outline-none focus:ring-1 focus:ring-[#113EB9] transition-colors"
                />
              </div>

              {!alertasSpeedMode && !speedReportMode && showStatusFilters && (
                <>
                  {filterStatus !== 'all' && (
                    <button
                      type="button"
                      onClick={() => onFilterStatusChange?.('all')}
                      className="inline-flex items-center gap-1.5 rounded-full border border-blue-600 bg-blue-600 px-2.5 py-1 text-[10.5px] font-semibold text-white shadow-sm ring-2 ring-blue-300 transition-all duration-150 cursor-pointer"
                      title="Mostrar todos los registros"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                      Ver todos
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onFilterStatusChange?.(filterStatus === 'moving' ? 'all' : 'moving')}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-semibold transition-all duration-150 cursor-pointer ${
                      filterStatus === 'moving'
                        ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300'
                    }`}
                    title={filterStatus === 'moving' ? 'Haz clic para ver todos los registros' : 'Filtrar registros en movimiento'}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${filterStatus === 'moving' ? 'bg-white' : 'bg-emerald-500'}`} />
                    En movimiento {enMovimiento ?? 0}
                  </button>

                  <button
                    type="button"
                    onClick={() => onFilterStatusChange?.(filterStatus === 'stopped' ? 'all' : 'stopped')}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-semibold transition-all duration-150 cursor-pointer ${
                      filterStatus === 'stopped'
                        ? 'border-slate-700 bg-slate-700 text-white shadow-sm ring-2 ring-slate-400'
                        : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200 hover:border-slate-300'
                    }`}
                    title={filterStatus === 'stopped' ? 'Haz clic para ver todos los registros' : 'Filtrar registros detenidos'}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${filterStatus === 'stopped' ? 'bg-white' : 'bg-slate-400'}`} />
                    Detenido {detenido ?? 0}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
