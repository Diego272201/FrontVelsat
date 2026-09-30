'use client';

import React, { useState } from 'react';
import {
  Bell,
  Crosshair,
  LogIn,
  LogOut,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
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
}

function getDayLabel(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Alertas Recientes';

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
    return 'Alertas Recientes';
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
  unreadCount = 0,
  status,
  loading = false,
  onRefresh,
  onClear,
  onLocateAlert,
}: RealtimeAlertsDrawerProps) {
  const [filterType, setFilterType] = useState<'all' | 'enter' | 'exit'>('all');

  if (!open) return null;

  const isConnected = status === 'connected';
  const isReconnecting = status === 'reconnecting';

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
    <div className="fixed inset-y-0 right-0 z-40 flex w-full max-w-[360px] flex-col bg-white shadow-2xl transition-transform duration-300 border-l border-slate-100">
      {/* Cabecera */}
      <div className="flex h-14 shrink-0 items-center justify-between px-4 border-b border-slate-100 bg-white">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Alertas</h2>
        </div>

        <div className="flex items-center gap-0.5 text-slate-400">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              title="Actualizar / Recargar alertas"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin text-[#113EB9]' : ''} />
            </button>
          )}

          {alerts.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              title="Limpiar todas las alertas"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 size={16} />
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            title="Cerrar panel"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Segmented Control / Tabs */}
      <div className="px-3 pt-2.5 pb-1 bg-white">
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100/90 p-1 text-xs">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`flex items-center justify-center gap-1 rounded-lg py-1.5 text-center text-xs font-semibold transition ${
              filterType === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Todas</span>
            <span className="text-slate-400 text-[11px] font-normal">{totalCount}</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterType('enter')}
            className={`flex items-center justify-center gap-1 rounded-lg py-1.5 text-center text-xs font-semibold transition ${
              filterType === 'enter'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Entradas</span>
            <span className="text-slate-400 text-[11px] font-normal">{enterCount}</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterType('exit')}
            className={`flex items-center justify-center gap-1 rounded-lg py-1.5 text-center text-xs font-semibold transition ${
              filterType === 'exit'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Salidas</span>
            <span className="text-slate-400 text-[11px] font-normal">{exitCount}</span>
          </button>
        </div>
      </div>

      {/* Lista de alertas agrupadas */}
      <div className="flex-1 overflow-y-auto pb-3 bg-white">
        {loading && alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <RefreshCw size={26} className="animate-spin text-[#113EB9] mb-3" />
            <p className="text-[13px] font-bold text-gray-700">Cargando alertas...</p>
            <p className="mt-1 text-[11px] text-gray-400">Consultando visitas recientes y conectando a SignalR</p>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-gray-400 mb-3">
              <Bell size={20} />
            </div>
            <p className="text-[13px] font-bold text-gray-700">Sin alertas</p>
            <p className="mt-1 max-w-[240px] text-[11px] text-gray-400">
              {filterType === 'all'
                ? 'Las notificaciones de entrada y salida de geocercas se registrarán aquí en vivo.'
                : filterType === 'enter'
                ? 'No hay registros de entradas para mostrar.'
                : 'No hay registros de salidas para mostrar.'}
            </p>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.dayLabel} className="mb-2">
              {/* Header de Día */}
              <div className="px-4 pt-3 pb-1.5 flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                  {group.dayLabel}
                </span>
                <span className="text-[11px] font-semibold text-slate-400">
                  {group.items.length}
                </span>
              </div>

              {/* Items del Día */}
              <div className="space-y-1.5 px-3">
                {group.items.map((alert) => {
                  const isEnter = alert.eventType === 'geofenceEnter';
                  return (
                    <div
                      key={alert.id}
                      className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-white p-2.5 shadow-2xs hover:border-slate-200 hover:shadow-xs transition"
                    >
                      {/* Icono Entrada / Salida */}
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                          isEnter
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-rose-50 text-rose-600'
                        }`}
                      >
                        {isEnter ? (
                          <LogIn size={17} strokeWidth={2.2} />
                        ) : (
                          <LogOut size={17} strokeWidth={2.2} />
                        )}
                      </div>

                      {/* Detalles Vehículo y Geocerca */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[12.5px] font-bold text-slate-900 tracking-tight truncate">
                            {alert.deviceID}
                          </span>
                          <span
                            className={`text-[11px] font-bold ${
                              isEnter ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {isEnter ? 'Entrada' : 'Salida'}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11.5px] font-medium text-slate-500 truncate">
                          {alert.geofenceName} · {alert.speed ?? 0} km/h
                        </p>
                      </div>

                      {/* Hora y Botón Ubicar */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11.5px] font-medium text-slate-400 font-mono">
                          {formatTimeShort(alert.serverTime)}
                        </span>

                        {Boolean(alert.latitude && alert.longitude && onLocateAlert) && (
                          <button
                            type="button"
                            onClick={() => onLocateAlert?.(alert)}
                            title="Ubicar en el mapa"
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-[#113EB9] hover:bg-blue-50 hover:border-blue-300 transition"
                          >
                            <Crosshair size={14} strokeWidth={2} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pie informativo */}
      <div className="shrink-0 border-t border-slate-100 bg-white px-4 py-3 flex items-center justify-between text-xs text-slate-500">
        <span>
          Cuenta <strong className="font-bold text-slate-800">{alerts[0]?.accountID || 'movilbus'}</strong>
        </span>
        <span>
          <strong className="font-bold text-slate-800">{alerts.length}</strong> {alerts.length === 1 ? 'alerta' : 'alertas'}
        </span>
      </div>
    </div>
  );
}
