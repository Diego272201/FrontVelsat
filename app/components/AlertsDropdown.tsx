'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell,
  ChevronLeft,
  Search,
  Menu,
  MapPin,
  X,
  Check,
  RefreshCw,
  Trash2,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
} from 'lucide-react';
import {
  useGeofenceSignalR,
  RealtimeGeofenceAlert,
} from '@/app/trackvelnew/geocercas/useGeofenceSignalR';

function formatDateTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr || '-';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const time = d.toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
    return `${day}-${month}-${year} ${time}`;
  } catch {
    return dateStr || '-';
  }
}

function formatShortTime(dateStr: string): string {
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

export default function AlertsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'geofenceEnter' | 'geofenceExit'>('all');
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);

  // Modal completo "Ver todas"
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState('');
  const [modalFilterType, setModalFilterType] = useState<'all' | 'geofenceEnter' | 'geofenceExit'>('all');

  const [mounted, setMounted] = useState(false);
  const [effectiveUsername, setEffectiveUsername] = useState<string>('movilbus');

  // Marcador y popup de alerta en el mapa de Trackvel
  const alertMarkerRef = useRef<google.maps.Marker | null>(null);
  const alertInfoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const alertTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);

  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);

  // Resolver usuario desde localStorage
  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('currentUser');
      if (stored && stored.trim()) {
        setEffectiveUsername(stored.trim());
      }
    }
  }, []);

  // Hook SignalR para Alertas en Tiempo Real de Geocercas
  const {
    status: signalRStatus,
    alerts: rawAlerts,
    unreadCount,
    markAllAsRead: markSignalRAsRead,
    loadingAlerts,
    refreshAlerts,
    clearAlerts,
  } = useGeofenceSignalR({
    accountID: effectiveUsername,
    enabled: Boolean(effectiveUsername),
    isDrawerOpen: isOpen,
  });

  // Notificar al toolbar el unreadCount actualizado para sincronizar badges
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('trackvel:alerts-unread-count', {
          detail: unreadCount,
        }),
      );
    }
  }, [unreadCount]);

  // Escuchar eventos globales para abrir/alternar el panel desde el toolbar (botón junto a Reportes)
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    const handleToggle = () => setIsOpen((prev) => !prev);

    window.addEventListener('trackvel:open-alerts', handleOpen);
    window.addEventListener('trackvel:toggle-alerts', handleToggle);

    return () => {
      window.removeEventListener('trackvel:open-alerts', handleOpen);
      window.removeEventListener('trackvel:toggle-alerts', handleToggle);
    };
  }, []);

  // Limpiar marcador y popup de alerta del mapa
  const handleClearAlertMarker = useCallback(() => {
    if (alertTimeoutRef.current) {
      clearTimeout(alertTimeoutRef.current);
      alertTimeoutRef.current = null;
    }
    if (alertMarkerRef.current) {
      alertMarkerRef.current.setMap(null);
      alertMarkerRef.current = null;
    }
    if (alertInfoWindowRef.current) {
      alertInfoWindowRef.current.close();
      alertInfoWindowRef.current = null;
    }
    setSelectedAlertId(null);
  }, []);

  // Centrar mapa de Trackvel en alerta en tiempo real con icono /UnidadK.webp y popup detallado
  const handleLocateAlert = useCallback(
    (alert: RealtimeGeofenceAlert) => {
      if (typeof window === 'undefined') return;
      const map = (window as any).__trackvelMap as google.maps.Map | undefined;

      if (!map || typeof google === 'undefined' || !google.maps) {
        console.warn('[Alerts] El mapa de Trackvel aún no está listo');
        return;
      }

      handleClearAlertMarker();

      const lat = Number(alert.latitude);
      const lng = Number(alert.longitude);
      if (!lat || !lng) return;

      map.setCenter({ lat, lng });
      map.setZoom(17);

      const isEnter = alert.eventType === 'geofenceEnter';
      const deviceID = alert.deviceID || 'Vehículo';
      const geofenceName = alert.geofenceName || 'Geocerca';
      const speed = alert.speed != null ? Math.round(alert.speed) : 0;

      let formattedTime = '00:00';
      let formattedDate = '-';
      try {
        const d = new Date(alert.serverTime);
        if (!isNaN(d.getTime())) {
          formattedTime = d.toLocaleTimeString('es-PE', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          });
          const day = d.getDate();
          const month = d
            .toLocaleString('es-PE', { month: 'short' })
            .replace('.', '')
            .replace(/set/i, 'sep')
            .toLowerCase();
          formattedDate = `${day} ${month}`;
        }
      } catch {
        formattedTime = alert.serverTime;
      }

      const marker = new google.maps.Marker({
        position: { lat, lng },
        map,
        title: `${deviceID} (${isEnter ? 'Entrada' : 'Salida'})`,
        animation: google.maps.Animation.DROP,
        zIndex: 9999999,
        icon: {
          url: '/UnidadK.webp',
          scaledSize: new google.maps.Size(60, 34),
          anchor: new google.maps.Point(30, 17),
        },
      });

      alertMarkerRef.current = marker;

      const enterSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>`;
      const exitSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`;

      const infoWindowContent = `
        <div style="font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-width: 220px; padding: 2px 2px 0 0; position: relative; z-index: 99999999;">
          <div style="display: flex; align-items: center; gap: 10px; padding-bottom: 8px;">
            <div style="width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: ${isEnter ? '#ECFDF5' : '#FEF2F2'};">
              ${isEnter ? enterSvg : exitSvg}
            </div>
            <div style="min-width: 0; flex: 1;">
              <div style="font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14.5px; font-weight: 700; color: #0F172A; line-height: 1.2; letter-spacing: 0.01em;">
                ${deviceID}
              </div>
              <div style="font-size: 12px; margin-top: 2px; line-height: 1.2;">
                <strong style="color: ${isEnter ? '#059669' : '#DC2626'}; font-weight: 700;">${isEnter ? 'Entrada' : 'Salida'}</strong><span style="color: #64748B;"> · geocerca ${geofenceName}</span>
              </div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; border-top: 1px solid #F1F5F9; padding-top: 8px;">
            <div style="padding-right: 6px;">
              <div style="font-size: 9px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em;">VELOCIDAD</div>
              <div style="font-size: 13px; font-weight: 800; color: #0F172A; margin-top: 3px; font-variant-numeric: tabular-nums;">
                ${speed} <span style="font-size: 11px; font-weight: 600; color: #475569;">km/h</span>
              </div>
            </div>
            <div style="padding: 0 6px; border-left: 1px solid #F1F5F9;">
              <div style="font-size: 9px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em;">HORA</div>
              <div style="font-size: 13px; font-weight: 800; color: #0F172A; margin-top: 3px; font-variant-numeric: tabular-nums;">
                ${formattedTime}
              </div>
            </div>
            <div style="padding-left: 6px; border-left: 1px solid #F1F5F9;">
              <div style="font-size: 9px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em;">FECHA</div>
              <div style="font-size: 13px; font-weight: 800; color: #0F172A; margin-top: 3px; font-variant-numeric: tabular-nums;">
                ${formattedDate}
              </div>
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; margin-top: 8px; padding-top: 6px; border-top: 1px solid #F1F5F9;">
            <button id="btn-quitar-alerta-popup" type="button" style="border: none; background: #F8FAFC; color: #DC2626; font-size: 11px; font-weight: 600; padding: 4px 8px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; transition: background 0.15s ease; font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              <span>Quitar del mapa</span>
            </button>
          </div>
        </div>
      `;

      const info = new google.maps.InfoWindow({
        content: infoWindowContent,
        pixelOffset: new google.maps.Size(0, -18),
        zIndex: 99999999,
      });

      info.open(map, marker);
      alertInfoWindowRef.current = info;
      setSelectedAlertId(alert.id);

      marker.addListener('click', () => {
        info.open(map, marker);
      });

      marker.addListener('rightclick', () => {
        handleClearAlertMarker();
      });

      info.addListener('closeclick', () => {
        handleClearAlertMarker();
      });

      google.maps.event.addListenerOnce(info, 'domready', () => {
        const btnQuitar = document.getElementById('btn-quitar-alerta-popup');
        if (btnQuitar) {
          btnQuitar.onclick = () => {
            handleClearAlertMarker();
          };

          // Elevar el contenedor de la InfoWindow y todos sus contenedores padres en floatPane
          let el: HTMLElement | null = btnQuitar;
          while (el && !el.classList.contains('gm-style')) {
            el.style.setProperty('z-index', '99999999', 'important');
            el = el.parentElement;
          }
        }
      });

      alertTimeoutRef.current = setTimeout(() => {
        handleClearAlertMarker();
      }, 60000);
    },
    [handleClearAlertMarker],
  );

  const handleToggleAlertLocation = (alert: RealtimeGeofenceAlert) => {
    if (selectedAlertId === alert.id) {
      handleClearAlertMarker();
    } else {
      handleLocateAlert(alert);
    }
  };

  // Cerrar panel al hacer clic fuera (si el modal no está abierto)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (isModalOpen) return;
      const target = event.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setIsOpen(false);
        setIsFilterMenuOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, isModalOpen]);

  // Cerrar menú de filtros al hacer clic fuera
  useEffect(() => {
    function handleClickOutsideFilter(event: MouseEvent) {
      const target = event.target as Node;
      if (
        filterMenuRef.current &&
        !filterMenuRef.current.contains(target)
      ) {
        setIsFilterMenuOpen(false);
      }
    }
    if (isFilterMenuOpen) {
      document.addEventListener('mousedown', handleClickOutsideFilter);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutsideFilter);
    };
  }, [isFilterMenuOpen]);

  // Cerrar con tecla Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (isModalOpen) {
          setIsModalOpen(false);
        } else if (isFilterMenuOpen) {
          setIsFilterMenuOpen(false);
        } else {
          setIsOpen(false);
        }
      }
    }
    if (isOpen || isModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isModalOpen, isFilterMenuOpen]);

  // Limpiar marcadores al desmontar
  useEffect(() => {
    return () => {
      handleClearAlertMarker();
    };
  }, [handleClearAlertMarker]);

  // Filtrado de alertas en el panel lateral
  const filteredAlerts = useMemo(() => {
    return rawAlerts.filter((a) => {
      if (filterType !== 'all' && a.eventType !== filterType) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const dev = (a.deviceID || '').toLowerCase();
      const geo = (a.geofenceName || '').toLowerCase();
      const typeStr = a.eventType === 'geofenceEnter' ? 'entrada' : 'salida';
      return dev.includes(q) || geo.includes(q) || typeStr.includes(q);
    });
  }, [rawAlerts, searchQuery, filterType]);

  // Filtrado de alertas en el modal completo
  const modalFilteredAlerts = useMemo(() => {
    return rawAlerts.filter((a) => {
      if (modalFilterType !== 'all' && a.eventType !== modalFilterType) return false;
      if (!modalSearch.trim()) return true;
      const q = modalSearch.toLowerCase();
      const dev = (a.deviceID || '').toLowerCase();
      const geo = (a.geofenceName || '').toLowerCase();
      const typeStr = a.eventType === 'geofenceEnter' ? 'entrada' : 'salida';
      return dev.includes(q) || geo.includes(q) || typeStr.includes(q);
    });
  }, [rawAlerts, modalSearch, modalFilterType]);

  const enterCount = useMemo(
    () => rawAlerts.filter((a) => a.eventType === 'geofenceEnter').length,
    [rawAlerts],
  );
  const exitCount = useMemo(
    () => rawAlerts.filter((a) => a.eventType === 'geofenceExit').length,
    [rawAlerts],
  );

  return (
    <div className="relative inline-flex items-center text-left">
      {/* Botón de la Campana en el Toolbar */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          const next = !isOpen;
          setIsOpen(next);
          if (next) {
            markSignalRAsRead();
            if (rawAlerts.length === 0) {
              refreshAlerts();
            }
          }
        }}
        title={`Alertas en tiempo real (SignalR: ${signalRStatus})`}
        className={`relative flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ${
          isOpen
            ? 'bg-white/25 text-white shadow-inner'
            : 'text-white hover:bg-white/10'
        }`}
      >
        <Bell size={18} className="transition-transform duration-200 hover:scale-105" />

        {/* Indicador numérico de alertas no leídas */}
        {unreadCount > 0 && (
          <span className="absolute right-0 top-1 flex h-3.5 min-w-[15px] items-center justify-center rounded-full bg-red-600 px-1 text-[9.5px] font-bold leading-none text-white shadow-sm ring-1 ring-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel Desplegable de Alertas montado en el body */}
      {isOpen &&
        mounted &&
        createPortal(
          <div
            ref={panelRef}
            className="fixed right-0 top-[36px] bottom-0 z-[99999] flex w-[360px] max-w-full flex-col border-l border-gray-200 bg-white shadow-2xl transition-all duration-200 animate-in fade-in slide-in-from-right-2 sm:w-[380px]"
            style={{ height: 'calc(100vh - 36px)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-white px-3.5 py-3">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  title="Cerrar"
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 active:scale-95"
                >
                  <ChevronLeft size={17} />
                </button>

                <div className="flex items-center gap-2">
                  <Bell size={17} className="text-[#113EB9]" />
                  <h3 className="text-sm font-bold tracking-tight text-slate-800">
                    Alertas
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <button
                  type="button"
                  onClick={() => refreshAlerts()}
                  disabled={loadingAlerts}
                  title="Actualizar alertas"
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50"
                >
                  <RefreshCw
                    size={13}
                    className={loadingAlerts ? 'animate-spin text-[#113EB9]' : ''}
                  />
                </button>

                {rawAlerts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      handleClearAlertMarker();
                      clearAlerts();
                    }}
                    title="Limpiar todas las alertas"
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={13} />
                  </button>
                )}

                <span className="ml-1 text-xs font-semibold text-slate-400">
                  {rawAlerts.length} hoy
                </span>
              </div>
            </div>

            {/* Barra de Búsqueda y Filtros */}
            <div className="relative flex items-center gap-2 border-b border-gray-100 bg-white px-3.5 py-2.5">
              <div className="relative flex-1">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por placa o geocerca"
                  className="w-full rounded-full border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-700 placeholder-gray-400 transition focus:border-[#113EB9] focus:outline-none focus:ring-1 focus:ring-[#113EB9]"
                />
              </div>

              {/* Botón de tres líneas (Menú de filtros funcional) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsFilterMenuOpen((prev) => !prev)}
                  title="Opciones de filtrado"
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition active:scale-95 ${
                    isFilterMenuOpen || filterType !== 'all'
                      ? 'border-[#113EB9] bg-blue-50 text-[#113EB9]'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Menu size={16} />
                </button>

                {/* Popover del menú de filtros */}
                {isFilterMenuOpen && (
                  <div
                    ref={filterMenuRef}
                    className="absolute right-0 top-10 z-30 w-56 rounded-xl border border-gray-200 bg-white p-2 shadow-2xl animate-in fade-in zoom-in-95"
                  >
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      Filtrar por tipo
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFilterType('all');
                        setIsFilterMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                        filterType === 'all'
                          ? 'bg-blue-50 font-bold text-[#113EB9]'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span>Todas ({rawAlerts.length})</span>
                      {filterType === 'all' && <Check size={14} className="text-[#113EB9]" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFilterType('geofenceEnter');
                        setIsFilterMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                        filterType === 'geofenceEnter'
                          ? 'bg-blue-50 font-bold text-[#113EB9]'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <ArrowRight size={13} className="text-emerald-600" />
                        Entrada a geocerca ({enterCount})
                      </span>
                      {filterType === 'geofenceEnter' && (
                        <Check size={14} className="text-[#113EB9]" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFilterType('geofenceExit');
                        setIsFilterMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                        filterType === 'geofenceExit'
                          ? 'bg-blue-50 font-bold text-[#113EB9]'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <ArrowLeft size={13} className="text-red-600" />
                        Salida de geocerca ({exitCount})
                      </span>
                      {filterType === 'geofenceExit' && (
                        <Check size={14} className="text-[#113EB9]" />
                      )}
                    </button>

                    <div className="my-1 border-t border-gray-100" />

                    <button
                      type="button"
                      onClick={() => {
                        setFilterType('all');
                        setSearchQuery('');
                        setIsFilterMenuOpen(false);
                      }}
                      className="flex w-full items-center justify-center rounded-lg bg-gray-50 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
                    >
                      Restablecer filtros
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Badge de filtro activo si aplica */}
            {filterType !== 'all' && (
              <div className="flex items-center justify-between bg-blue-50/70 px-4 py-1.5 text-[11px] text-[#113EB9]">
                <span>
                  Filtro activo:{' '}
                  <strong>
                    {filterType === 'geofenceEnter' && 'Entrada a geocerca'}
                    {filterType === 'geofenceExit' && 'Salida de geocerca'}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={() => setFilterType('all')}
                  className="rounded p-0.5 hover:bg-blue-100"
                >
                  <X size={12} />
                </button>
              </div>
            )}

            {/* Lista de Alertas con Scroll */}
            <div
              className="flex-1 divide-y divide-gray-100 overflow-y-auto bg-white"
              style={{ scrollbarWidth: 'thin' }}
            >
              {loadingAlerts && rawAlerts.length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center px-4 text-center text-gray-400">
                  <RefreshCw size={24} className="mb-2 animate-spin text-[#113EB9]" />
                  <p className="text-xs font-medium">Cargando alertas en tiempo real...</p>
                </div>
              ) : filteredAlerts.length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center px-4 text-center text-gray-400">
                  <Bell size={28} className="mb-2 text-gray-300" />
                  <p className="text-xs font-medium">No se encontraron alertas</p>
                  {(searchQuery || filterType !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setFilterType('all');
                      }}
                      className="mt-2 text-[11px] font-semibold text-[#113EB9] hover:underline"
                    >
                      Limpiar filtros
                    </button>
                  )}
                </div>
              ) : (
                filteredAlerts.map((alert) => {
                  const isEnter = alert.eventType === 'geofenceEnter';
                  const isSelected = selectedAlertId === alert.id;

                  return (
                    <div
                      key={alert.id}
                      onClick={() => handleToggleAlertLocation(alert)}
                      className={`group relative flex cursor-pointer items-start gap-3 px-4 py-3 transition hover:bg-slate-50 ${
                        isSelected ? 'bg-blue-50/60' : 'bg-white'
                      }`}
                    >
                      {/* Barra indicadora cuando está seleccionada en el mapa */}
                      {isSelected && (
                        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#113EB9]" />
                      )}

                      {/* Icono circular con Entrada o Salida */}
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-xs transition-transform group-hover:scale-105 ${
                          isEnter
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-red-50 text-red-600'
                        }`}
                      >
                        {isEnter ? (
                          <ArrowRight size={17} strokeWidth={2.3} />
                        ) : (
                          <ArrowLeft size={17} strokeWidth={2.3} />
                        )}
                      </div>

                      {/* Contenido de la alerta */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-[12.5px] font-bold leading-snug text-slate-900">
                            {alert.deviceID}
                          </p>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold leading-none ${
                              isEnter
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {isEnter ? 'Entrada' : 'Salida'}
                          </span>
                        </div>

                        <p className="mt-0.5 text-[11.5px] font-medium leading-tight text-slate-700">
                          {alert.geofenceName || 'Geocerca'}
                          {alert.speed != null && (
                            <span className="font-normal text-slate-500">
                              {' '}
                              · {Math.round(alert.speed)} km/h
                            </span>
                          )}
                        </p>

                        <p className="mt-1 text-[10.5px] font-normal text-gray-400">
                          {formatDateTime(alert.serverTime)}
                        </p>
                      </div>

                      {/* Botón de ubicación en el mapa */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleAlertLocation(alert);
                        }}
                        title={isSelected ? 'Quitar del mapa' : 'Ubicar en el mapa'}
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition ${
                          isSelected
                            ? 'bg-[#113EB9] text-white shadow-xs'
                            : 'border border-gray-200 bg-white text-gray-500 hover:border-[#113EB9] hover:text-[#113EB9]'
                        }`}
                      >
                        <MapPin size={14} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer con Acciones */}
            <div className="flex items-center gap-2 border-t border-gray-200 bg-white p-3">
              <button
                type="button"
                onClick={markSignalRAsRead}
                className="flex-1 rounded-lg bg-[#FB7B0F] px-4 py-2.5 text-center text-xs font-bold text-white shadow-sm transition hover:bg-[#ea6f08] active:scale-[0.99]"
              >
                Marcar todas como leídas
              </button>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-center text-xs font-semibold text-slate-700 transition hover:bg-gray-50 active:scale-[0.99]"
              >
                Ver todas
              </button>
            </div>
          </div>,
          document.body,
        )}

      {/* Modal Completo: "Ver todas las alertas" */}
      {isModalOpen &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in">
            <div
              className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl animate-in zoom-in-95"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-[#FB7B0F]">
                    <Bell size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Registro de Alertas de Geocercas
                    </h3>
                    <p className="text-xs text-slate-500">
                      Eventos de entrada y salida registrados en tiempo real hoy
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Filtros dentro del modal */}
              <div className="border-b border-gray-100 bg-gray-50/70 px-6 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {/* Pestañas de categorías: Todas, Entradas, Salidas */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      { id: 'all', label: `Todas (${rawAlerts.length})` },
                      { id: 'geofenceEnter', label: `Entradas (${enterCount})` },
                      { id: 'geofenceExit', label: `Salidas (${exitCount})` },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() =>
                          setModalFilterType(
                            cat.id as 'all' | 'geofenceEnter' | 'geofenceExit',
                          )
                        }
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                          modalFilterType === cat.id
                            ? 'bg-[#FB7B0F] text-white shadow-xs'
                            : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {/* Input de búsqueda */}
                  <div className="relative w-64 max-w-full">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      value={modalSearch}
                      onChange={(e) => setModalSearch(e.target.value)}
                      placeholder="Buscar por placa, geocerca..."
                      className="w-full rounded-lg border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-700 placeholder-gray-400 focus:border-[#FB7B0F] focus:outline-none focus:ring-1 focus:ring-[#FB7B0F]"
                    />
                  </div>
                </div>
              </div>

              {/* Lista de alertas del modal */}
              <div className="flex-1 divide-y divide-gray-100 overflow-y-auto px-6 py-2">
                {modalFilteredAlerts.length === 0 ? (
                  <div className="flex h-48 flex-col items-center justify-center text-center text-gray-400">
                    <Bell size={32} className="mb-2 text-gray-300" />
                    <p className="text-sm font-medium">
                      No se encontraron alertas con estos criterios
                    </p>
                  </div>
                ) : (
                  modalFilteredAlerts.map((alert) => {
                    const isEnter = alert.eventType === 'geofenceEnter';
                    const isSelected = selectedAlertId === alert.id;

                    return (
                      <div
                        key={alert.id}
                        className="flex items-center justify-between py-3 transition hover:bg-slate-50/80"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                              isEnter
                                ? 'bg-emerald-50 text-emerald-600'
                                : 'bg-red-50 text-red-600'
                            }`}
                          >
                            {isEnter ? (
                              <ArrowRight size={18} strokeWidth={2.3} />
                            ) : (
                              <ArrowLeft size={18} strokeWidth={2.3} />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold text-slate-900">
                                {alert.deviceID}
                              </p>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                  isEnter
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {isEnter ? 'Entrada' : 'Salida'}
                              </span>
                            </div>
                            <p className="text-[12px] font-medium text-slate-600">
                              {alert.geofenceName || 'Geocerca'}
                              {alert.speed != null && (
                                <span className="font-semibold text-slate-800">
                                  {' '}
                                  · {Math.round(alert.speed)} km/h
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-gray-400">
                              {formatDateTime(alert.serverTime)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              handleToggleAlertLocation(alert);
                              setIsModalOpen(false);
                            }}
                            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                              isSelected
                                ? 'bg-[#113EB9] text-white shadow-xs'
                                : 'border border-gray-200 text-slate-700 hover:border-[#113EB9] hover:text-[#113EB9]'
                            }`}
                          >
                            <MapPin size={13} />
                            <span>{isSelected ? 'Ubicado' : 'Ubicar en mapa'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3.5 bg-gray-50">
                <span className="text-xs text-gray-500">
                  Total: <strong>{modalFilteredAlerts.length}</strong> alertas
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={markSignalRAsRead}
                    className="rounded-lg bg-[#FB7B0F] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#ea6f08]"
                  >
                    Marcar todas como leídas
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
