'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  MapPin,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { RealtimeGeofenceAlert, SignalRConnectionStatus } from './useGeofenceSignalR';

interface RealtimeAlertsDrawerProps {
  open: boolean;
  onClose: () => void;
  alerts: RealtimeGeofenceAlert[];
  unreadCount?: number;
  status: SignalRConnectionStatus;
  loading?: boolean;
  onRefresh?: () => void;
  onClear: () => void;
  onLocateAlert?: (alert: RealtimeGeofenceAlert) => void;
  selectedAlertId?: string | null;
  onClearAlertMarker?: () => void;
}

function getDayLabel(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'ALERTAS RECIENTES';

    const now = new Date();
    const isToday =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      d.getFullYear() === yesterday.getFullYear() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getDate() === yesterday.getDate();

    const day = d.getDate();
    const month = d
      .toLocaleString('es-PE', { month: 'short' })
      .replace('.', '')
      .replace('SET', 'SEP')
      .toUpperCase();

    if (isToday) {
      return `HOY · ${day} ${month}`;
    }
    if (isYesterday) {
      return `AYER · ${day} ${month}`;
    }

    return `${day} ${month}`;
  } catch {
    return 'ALERTAS RECIENTES';
  }
}

function formatTimeShort(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return '-';
  }
}

export default function RealtimeAlertsDrawer({
  open,
  onClose,
  alerts,
  loading = false,
  onRefresh,
  onClear,
  onLocateAlert,
  selectedAlertId: externalSelectedAlertId,
  onClearAlertMarker,
}: RealtimeAlertsDrawerProps) {
  const [filterType, setFilterType] = useState<'all' | 'enter' | 'exit'>('all');
  const [internalSelectedAlertId, setInternalSelectedAlertId] = useState<string | null>(null);

  const selectedAlertId =
    externalSelectedAlertId !== undefined
      ? externalSelectedAlertId
      : internalSelectedAlertId;

  const handleToggleAlert = (alert: RealtimeGeofenceAlert) => {
    if (selectedAlertId === alert.id) {
      // Si ya está seleccionada, deseleccionar y quitar del mapa
      setInternalSelectedAlertId(null);
      onClearAlertMarker?.();
    } else {
      // Seleccionar y ubicar en el mapa
      setInternalSelectedAlertId(alert.id);
      onLocateAlert?.(alert);
    }
  };

  const totalCount = alerts.length;
  const enterCount = alerts.filter((a) => a.eventType === 'geofenceEnter').length;
  const exitCount = alerts.filter((a) => a.eventType === 'geofenceExit').length;

  const filteredAlerts = alerts.filter((a) => {
    if (filterType === 'enter') return a.eventType === 'geofenceEnter';
    if (filterType === 'exit') return a.eventType === 'geofenceExit';
    return true;
  });

  // Agrupación por días
  const groups: { dayLabel: string; items: RealtimeGeofenceAlert[] }[] = [];
  filteredAlerts.forEach((alert) => {
    const label = getDayLabel(alert.serverTime);
    const existing = groups.find((g) => g.dayLabel === label);
    if (existing) {
      existing.items.push(alert);
    } else {
      groups.push({ dayLabel: label, items: [alert] });
    }
  });

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-40 overflow-hidden pointer-events-none">
          {/* Backdrop sutil */}
          <motion.div
            key="alerts-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-[0.5px] pointer-events-auto"
          />

          {/* Panel deslizante */}
          <motion.div
            key="alerts-drawer-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{ fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[340px] sm:max-w-[365px] flex-col bg-white shadow-2xl border-l border-gray-200 pointer-events-auto select-none"
          >
            {/* Header (48px de alto, fondo blanco) */}
            <div className="h-[48px] shrink-0 border-b border-gray-100 bg-white px-4 flex items-center justify-between">
              <h2 className="text-[15px] font-[700] text-[#0f172a] leading-none">Alertas</h2>

              <div className="flex items-center gap-1 text-[#64748b]">
                {onRefresh && (
                  <button
                    type="button"
                    onClick={onRefresh}
                    disabled={loading}
                    title="Actualizar alertas"
                    className="w-[28px] h-[28px] rounded-[6px] text-[#64748b] hover:bg-slate-100 hover:text-slate-800 flex items-center justify-center transition disabled:opacity-50"
                  >
                    <RefreshCw size={15} className={loading ? 'animate-spin text-[#1447c0]' : ''} />
                  </button>
                )}

                {alerts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setInternalSelectedAlertId(null);
                      onClearAlertMarker?.();
                      onClear();
                    }}
                    title="Limpiar todas las alertas"
                    className="w-[28px] h-[28px] rounded-[6px] text-[#64748b] hover:bg-red-50 hover:text-red-600 flex items-center justify-center transition"
                  >
                    <Trash2 size={15} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  title="Cerrar panel"
                  className="w-[28px] h-[28px] rounded-[6px] text-[#64748b] hover:bg-slate-100 hover:text-slate-800 flex items-center justify-center transition"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Pestañas (36px de alto) */}
            <div className="h-[36px] shrink-0 border-b border-gray-200 px-4 bg-white flex items-center gap-5">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`h-full flex items-center gap-1 border-b-[2px] transition ${
                  filterType === 'all'
                    ? 'border-[#1447c0] text-[#1447c0]'
                    : 'border-transparent text-[#64748b] hover:text-slate-800'
                }`}
              >
                <span className="text-[12px] font-[600]">Todas</span>
                <span
                  className={`text-[12px] tabular-nums ${
                    filterType === 'all' ? 'font-[700] text-[#1447c0]' : 'font-[700] text-[#94a3b8]'
                  }`}
                >
                  {totalCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterType('enter')}
                className={`h-full flex items-center gap-1 border-b-[2px] transition ${
                  filterType === 'enter'
                    ? 'border-[#1447c0] text-[#1447c0]'
                    : 'border-transparent text-[#64748b] hover:text-slate-800'
                }`}
              >
                <span className="text-[12px] font-[600]">Entradas</span>
                <span
                  className={`text-[12px] tabular-nums ${
                    filterType === 'enter' ? 'font-[700] text-[#1447c0]' : 'font-[700] text-[#94a3b8]'
                  }`}
                >
                  {enterCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterType('exit')}
                className={`h-full flex items-center gap-1 border-b-[2px] transition ${
                  filterType === 'exit'
                    ? 'border-[#1447c0] text-[#1447c0]'
                    : 'border-transparent text-[#64748b] hover:text-slate-800'
                }`}
              >
                <span className="text-[12px] font-[600]">Salidas</span>
                <span
                  className={`text-[12px] tabular-nums ${
                    filterType === 'exit' ? 'font-[700] text-[#1447c0]' : 'font-[700] text-[#94a3b8]'
                  }`}
                >
                  {exitCount}
                </span>
              </button>
            </div>

            {/* Lista con scroll */}
            <div className="flex-1 overflow-y-auto bg-white custom-scrollbar-servicios">
              {loading && alerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                  <RefreshCw size={22} className="animate-spin text-[#1447c0] mb-2.5" />
                  <p className="text-[13px] font-[600] text-gray-700">Cargando alertas...</p>
                  <p className="mt-0.5 text-[11px] text-gray-400">Consultando registros recientes</p>
                </div>
              ) : filteredAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-gray-400 mb-2.5">
                    <Bell size={18} />
                  </div>
                  <p className="text-[13px] font-[600] text-gray-700">Sin alertas</p>
                  <p className="mt-0.5 max-w-[240px] text-[11px] text-gray-400">
                    {filterType === 'all'
                      ? 'Las notificaciones de entrada y salida de geocercas se registrarán aquí.'
                      : filterType === 'enter'
                      ? 'No hay registros de entradas para mostrar.'
                      : 'No hay registros de salidas para mostrar.'}
                  </p>
                </div>
              ) : (
                groups.map((group) => (
                  <div key={group.dayLabel}>
                    {/* Separador de día ("HOY · 30 SEP", 26px alto, fondo #f8fafc) */}
                    <div className="h-[26px] shrink-0 bg-[#f8fafc] border-y border-gray-100 px-4 flex items-center justify-between">
                      <span className="text-[10px] font-[700] uppercase tracking-[0.06em] text-[#64748b]">
                        {group.dayLabel}
                      </span>
                      <span className="text-[10px] font-[700] text-[#64748b] tabular-nums">
                        {group.items.length}
                      </span>
                    </div>

                    {/* Filas de alertas (46px de alto) */}
                    <div>
                      {group.items.map((alert) => {
                        const isEnter = alert.eventType === 'geofenceEnter';
                        const isSelected = selectedAlertId === alert.id;

                        return (
                          <div
                            key={alert.id}
                            onClick={() => handleToggleAlert(alert)}
                            className={`h-[46px] min-h-[46px] relative px-3.5 flex items-center justify-between cursor-pointer border-b border-gray-100 transition-colors ${
                              isSelected ? 'bg-[#eef3fd]' : 'bg-white hover:bg-slate-50/80'
                            }`}
                          >
                            {/* Barra izquierda de 3px azul cuando está seleccionada */}
                            {isSelected && (
                              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#1447c0]" />
                            )}

                            {/* Hora a la izquierda (12px, font-semibold 600, #475569) */}
                            <div className="w-[42px] shrink-0 text-[12px] font-[600] text-[#475569] tabular-nums leading-none">
                              {formatTimeShort(alert.serverTime)}
                            </div>

                            {/* Columna Central */}
                            <div className="flex-1 min-w-0 pr-2 flex flex-col justify-center">
                              {/* Fila superior: Placa + Etiqueta */}
                              <div className="flex items-center gap-1.5 leading-none">
                                <span className="text-[12.5px] font-[600] text-[#1e3a8a] tracking-[0.02em] truncate">
                                  {alert.deviceID}
                                </span>
                                {isEnter ? (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 h-[17px] rounded-full text-[10.5px] font-[600] bg-[#ecfdf3] text-[#15803d] leading-none shrink-0">
                                    <ArrowRight size={10} className="stroke-[2.5]" />
                                    <span>Entrada</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 h-[17px] rounded-full text-[10.5px] font-[600] bg-[#fef2f2] text-[#b91c1c] leading-none shrink-0">
                                    <ArrowLeft size={10} className="stroke-[2.5]" />
                                    <span>Salida</span>
                                  </span>
                                )}
                              </div>

                              {/* Fila inferior: Geocerca · velocidad (11.5px, 400, #64748b) */}
                              <span className="text-[11.5px] font-[400] text-[#64748b] truncate leading-tight mt-1">
                                {alert.geofenceName || 'Geocerca'} ·{' '}
                                <span className="tabular-nums">
                                  {alert.speed != null ? Math.round(alert.speed) : 0} km/h
                                </span>
                              </span>
                            </div>

                            {/* Botón de ver en el mapa (28×28px, icono de 14px) */}
                            <div className="shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleAlert(alert);
                                }}
                                title={isSelected ? 'Quitar del mapa' : 'Ver en el mapa'}
                                className={`w-[28px] h-[28px] rounded-[7px] flex items-center justify-center transition shrink-0 ${
                                  isSelected
                                    ? 'bg-[#1447c0] text-white shadow-xs hover:bg-[#0f3899]'
                                    : 'text-[#94a3b8] hover:text-[#1447c0] hover:bg-slate-100'
                                }`}
                              >
                                <MapPin size={14} className={isSelected ? 'stroke-[2]' : 'stroke-[1.75]'} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
