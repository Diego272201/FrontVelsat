'use client';

import { getVehicleSidebarImage } from '@/app/components/settings/vehicleIcons';
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell,
  ChevronLeft,
  ChevronDown,
  Search,
  MapPin,
  Check,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import {
  useGeofenceSignalR,
  RealtimeGeofenceAlert,
  getAlertKey,
  isGeofenceAlert,
} from '@/app/trackvelnew/geocercas/useGeofenceSignalR';
import { getAlertVisual } from '@/app/components/settings/alertVisuals';
import { getAlertName } from '@/app/components/settings/alertCatalog';
import { plexSans } from '@/app/components/settings/fonts';
import { getCurrentUser, loadSettings } from '@/app/components/settings/useUserSettings';
import { useSession } from 'next-auth/react';
import { useApi } from '@/context/ApiContext';

// Colores del sistema usados en el panel
const PRIMARY = '#113EB9';
const PRIMARY_SOFT = '#EEF3FF';
const NUM: React.CSSProperties = { fontVariantNumeric: 'tabular-nums' };
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function parseDate(dateStr: string): Date | null {
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

/** "02:59" + "p. m." (sin segundos) */
function formatRowTime(dateStr: string): { time: string; period: string } {
  const d = parseDate(dateStr);
  if (!d) return { time: '--:--', period: '' };
  const h = d.getHours();
  return {
    time: `${String(h % 12 || 12).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
    period: h < 12 ? 'a. m.' : 'p. m.',
  };
}

const dayKeyOf = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/** Franja de fecha: "Hoy · 23 nov 2026", "Ayer · 22 nov 2026" o "21 nov 2026" */
function formatDayLabel(d: Date): string {
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  if (dayKeyOf(d) === dayKeyOf(today)) return `Hoy · ${base}`;
  if (dayKeyOf(d) === dayKeyOf(yesterday)) return `Ayer · ${base}`;
  return base;
}

export default function AlertsDropdown() {
  const { data: session } = useSession();
  const { baseUrl } = useApi();

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // 'all' o el eventKey de un tipo (geofenceEnter, alarm:sos, ignitionOn…)
  const [filterType, setFilterType] = useState<string>('all');
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);

  const [mounted, setMounted] = useState(false);
  const [storedUsername, setStoredUsername] = useState<string>('');
  const [storedBaseUrl, setStoredBaseUrl] = useState<string>('');

  // Marcador y popup de alerta en el mapa de Trackvel (Google Maps o Leaflet)
  const alertMarkerRef = useRef<google.maps.Marker | null>(null);
  const alertInfoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const leafletAlertMarkerRef = useRef<any>(null);
  const alertTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);

  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);

  // Resolver usuario y servidorUrl desde localStorage y sesión
  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser && storedUser.trim()) {
        setStoredUsername(storedUser.trim());
      }
      const storedUrl = localStorage.getItem('servidorUrl');
      if (storedUrl && storedUrl.trim()) {
        setStoredBaseUrl(storedUrl.trim());
      }
    }
  }, [session?.user?.username, baseUrl]);

  const effectiveUsername = (
    session?.user?.username ||
    storedUsername ||
    ''
  ).trim();

  const effectiveBaseUrl = (
    baseUrl ||
    (session?.user as any)?.servidorUrl ||
    storedBaseUrl ||
    ''
  ).trim();

  // Hook SignalR para Alertas en Tiempo Real de Geocercas (DO y SUB)
  const {
    status: signalRStatus,
    alerts: rawAlerts,
    unreadCount,
    markAllAsRead: markSignalRAsRead,
    loadingAlerts,
    refreshAlerts,
  } = useGeofenceSignalR({
    accountID: effectiveUsername,
    baseUrl: effectiveBaseUrl,
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

  // Limpiar marcador y popup de alerta del mapa (Google Maps y Leaflet)
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
    if (leafletAlertMarkerRef.current) {
      try {
        leafletAlertMarkerRef.current.remove();
      } catch {}
      leafletAlertMarkerRef.current = null;
    }
    setSelectedAlertId(null);
  }, []);

  // Centrar mapa de Trackvel (/trackvelnew o /subtrackvelnew) en alerta en tiempo real con el ícono del tipo de unidad y popup detallado
  const handleLocateAlert = useCallback(
    (alert: RealtimeGeofenceAlert) => {
      if (typeof window === 'undefined') return;
      const gMap = (window as any).__trackvelMap as google.maps.Map | undefined;
      const lMap = (window as any).__leafletMap as any;
      const LRef = (window as any).__leafletL as any;

      const lat = Number(alert.latitude);
      const lng = Number(alert.longitude);
      if (!lat || !lng) return;

      const eventKey = getAlertKey(alert);
      const isGeofence = isGeofenceAlert(alert);
      const isEnter = eventKey === 'geofenceEnter';
      const visual = getAlertVisual(eventKey, alert.severity);
      const deviceID = (alert.deviceID || 'Vehículo').toUpperCase();
      const geofenceName = alert.geofenceName || 'Geocerca';
      const detailText = isGeofence ? `geocerca ${geofenceName}` : getAlertName(eventKey);
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

      const enterSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>`;
      const exitSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`;
      // Resto de tipos: campana con el color del tipo
      const otherSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${visual.hex.fg}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`;
      const typeSvg = isGeofence ? (isEnter ? enterSvg : exitSvg) : otherSvg;

      const infoWindowContent = `
        <div style="font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-width: 220px; padding: 2px 2px 0 0; position: relative; z-index: 99999999;">
          <div style="display: flex; align-items: center; gap: 10px; padding-bottom: 8px;">
            <div style="width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: ${visual.hex.bg};">
              ${typeSvg}
            </div>
            <div style="min-width: 0; flex: 1;">
              <div style="font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14.5px; font-weight: 700; color: #0F172A; line-height: 1.2; letter-spacing: 0.01em;">
                ${deviceID}
              </div>
              <div style="font-size: 12px; margin-top: 2px; line-height: 1.2;">
                <strong style="color: ${visual.hex.fg}; font-weight: 700;">${visual.short}</strong><span style="color: #64748B;"> · ${detailText}</span>
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

      // Caso 1: Google Maps (/trackvelnew)
      if (gMap && typeof google !== 'undefined' && google.maps) {
        handleClearAlertMarker();

        gMap.setCenter({ lat, lng });
        gMap.setZoom(17);

        const marker = new google.maps.Marker({
          position: { lat, lng },
          map: gMap,
          title: `${deviceID} (${visual.short})`,
          animation: google.maps.Animation.DROP,
          zIndex: 9999999,
          icon: {
            url: getVehicleSidebarImage(deviceID),
            scaledSize: new google.maps.Size(60, 30),
            anchor: new google.maps.Point(30, 15),
          },
        });

        alertMarkerRef.current = marker;

        const info = new google.maps.InfoWindow({
          content: infoWindowContent,
          pixelOffset: new google.maps.Size(0, -18),
          zIndex: 99999999,
        });

        info.open(gMap, marker);
        alertInfoWindowRef.current = info;
        setSelectedAlertId(alert.id);

        marker.addListener('click', () => {
          info.open(gMap, marker);
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
        return;
      }

      // Caso 2: Leaflet (/subtrackvelnew)
      if (lMap && LRef) {
        handleClearAlertMarker();

        lMap.setView([lat, lng], 17);

        const icon = LRef.icon({
          iconUrl: getVehicleSidebarImage(deviceID),
          iconSize: [60, 30],
          iconAnchor: [30, 15],
          popupAnchor: [0, -16],
        });

        const lMarker = LRef.marker([lat, lng], {
          icon,
          zIndexOffset: 99999,
        }).addTo(lMap);

        lMarker.bindPopup(infoWindowContent, {
          minWidth: 220,
          closeButton: true,
        });
        lMarker.openPopup();

        lMarker.on('popupopen', () => {
          const btnQuitar = document.getElementById('btn-quitar-alerta-popup');
          if (btnQuitar) {
            btnQuitar.onclick = () => {
              handleClearAlertMarker();
            };
          }
        });

        lMarker.on('popupclose', () => {
          handleClearAlertMarker();
        });

        leafletAlertMarkerRef.current = lMarker;
        setSelectedAlertId(alert.id);

        alertTimeoutRef.current = setTimeout(() => {
          handleClearAlertMarker();
        }, 60000);
        return;
      }

      console.warn('[Alerts] El mapa aún no está listo');
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
  }, [isOpen]);

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
        if (isFilterMenuOpen) {
          setIsFilterMenuOpen(false);
        } else {
          setIsOpen(false);
        }
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isFilterMenuOpen]);

  // Limpiar marcadores al desmontar
  useEffect(() => {
    return () => {
      handleClearAlertMarker();
    };
  }, [handleClearAlertMarker]);

  // Filtrado de alertas en el panel lateral
  const filteredAlerts = useMemo(() => {
    return rawAlerts.filter((a) => {
      const key = getAlertKey(a);
      if (filterType !== 'all' && key !== filterType) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const dev = (a.deviceID || '').toLowerCase();
      const geo = (a.geofenceName || '').toLowerCase();
      const typeStr = `${getAlertVisual(key, a.severity).short} ${getAlertName(key)}`.toLowerCase();
      return dev.includes(q) || geo.includes(q) || typeStr.includes(q);
    });
  }, [rawAlerts, searchQuery, filterType]);

  // Tipos que el usuario tiene en "Mis notificaciones" (Configuración → Alertas y sonidos)
  const [configuredTypes, setConfiguredTypes] = useState<string[]>([]);
  useEffect(() => {
    const read = () =>
      setConfiguredTypes((loadSettings(getCurrentUser()).alerts?.items ?? []).map((i) => i.type));
    read();
    const onSettings = (e: Event) => {
      if ((e as CustomEvent).detail?.key === 'alerts') read();
    };
    window.addEventListener('trackvel:settings-updated', onSettings);
    return () => window.removeEventListener('trackvel:settings-updated', onSettings);
  }, [effectiveUsername]);

  // Menú de filtros: primero los tipos configurados (aunque aún no tengan alertas,
  // con 0) en el mismo orden que "Mis notificaciones"; luego cualquier otro tipo
  // que haya llegado, de más a menos frecuente.
  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    rawAlerts.forEach((a) => {
      const key = getAlertKey(a);
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    const configured: [string, number][] = configuredTypes.map((k) => [k, counts.get(k) ?? 0]);
    const others = Array.from(counts.entries())
      .filter(([k]) => !configuredTypes.includes(k))
      .sort((x, y) => y[1] - x[1]);
    return [...configured, ...others];
  }, [rawAlerts, configuredTypes]);

  // Alertas agrupadas por día (una franja de fecha por día)
  const alertsByDay = useMemo(() => {
    const groups: { key: string; label: string; items: RealtimeGeofenceAlert[] }[] = [];
    const byKey = new Map<string, (typeof groups)[number]>();
    for (const a of filteredAlerts) {
      const d = parseDate(a.serverTime);
      const key = d ? dayKeyOf(d) : 'sin-fecha';
      let g = byKey.get(key);
      if (!g) {
        g = { key, label: d ? formatDayLabel(d) : 'Sin fecha', items: [] };
        byKey.set(key, g);
        groups.push(g);
      }
      g.items.push(a);
    }
    return groups;
  }, [filteredAlerts]);

  const todayCount = useMemo(() => {
    const today = dayKeyOf(new Date());
    return rawAlerts.filter((a) => {
      const d = parseDate(a.serverTime);
      return d ? dayKeyOf(d) === today : false;
    }).length;
  }, [rawAlerts]);

  const activeFilterVisual = filterType === 'all' ? null : getAlertVisual(filterType);
  const ActiveFilterIcon = activeFilterVisual?.icon ?? SlidersHorizontal;
  const activeFilterCount =
    filterType === 'all' ? rawAlerts.length : typeCounts.find(([k]) => k === filterType)?.[1] ?? 0;

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
            className={`${plexSans.className} fixed right-0 top-[36px] bottom-0 z-[99999] flex w-[360px] max-w-full flex-col border-l border-[#e2e8f0] bg-white text-[#0f172a] shadow-2xl transition-all duration-200 animate-in fade-in slide-in-from-right-2 sm:w-[380px]`}
            style={{ height: 'calc(100vh - 36px)' }}
          >
            {/* Header */}
            <div className="flex h-[52px] shrink-0 items-center gap-1.5 pl-2 pr-2.5">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Cerrar"
                className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[#475569] transition hover:bg-[#f1f5f9] hover:text-[#0f172a]"
              >
                <ChevronLeft size={16} strokeWidth={2.4} />
              </button>
              <h3 className="mr-auto text-[15px] font-bold">Alertas</h3>
              <span className="px-1 text-[11.5px] font-semibold" style={{ ...NUM, color: PRIMARY }}>
                {todayCount} hoy
              </span>
            </div>

            {/* Buscador + filtro por tipo */}
            <div className="flex shrink-0 items-center gap-2 border-b border-[#e2e8f0] px-3 pb-2.5">
              <label className="flex h-[34px] min-w-0 flex-1 items-center gap-2 rounded-[6px] border border-[#e2e8f0] px-2.5 transition focus-within:border-[#113EB9]">
                <Search size={14} className="shrink-0 text-[#94a3b8]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar placa o geocerca"
                  className="min-w-0 flex-1 bg-transparent text-[12.5px] font-medium text-[#0f172a] outline-none placeholder:font-normal placeholder:text-[#94a3b8]"
                />
              </label>

              {/* Dropdown de tipos: crece con los tipos que agregue el usuario */}
              <div ref={filterMenuRef} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setIsFilterMenuOpen((prev) => !prev)}
                  title="Filtrar por tipo de alerta"
                  className="flex h-[34px] max-w-[160px] items-center gap-1.5 rounded-[6px] border px-2.5 text-[12px] font-semibold transition"
                  style={
                    filterType !== 'all' || isFilterMenuOpen
                      ? { borderColor: PRIMARY, background: PRIMARY_SOFT, color: PRIMARY }
                      : { borderColor: '#e2e8f0', color: '#475569' }
                  }
                >
                  <ActiveFilterIcon
                    size={13}
                    strokeWidth={2.4}
                    className="shrink-0"
                    style={activeFilterVisual ? { color: activeFilterVisual.hex.fg } : undefined}
                  />
                  <span className="truncate">
                    {filterType === 'all' ? 'Todas' : activeFilterVisual?.short}
                  </span>
                  <span className="font-bold" style={NUM}>
                    {activeFilterCount}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`shrink-0 transition-transform ${isFilterMenuOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {isFilterMenuOpen && (
                  <div className="absolute right-0 top-[38px] z-30 w-[250px] rounded-[8px] border border-[#e2e8f0] bg-white p-1 shadow-[0_10px_30px_rgba(15,23,42,.14)] animate-in fade-in zoom-in-95">
                    <p className="px-2 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-[.06em] text-[#94a3b8]">
                      Tipo de alerta
                    </p>
                    <div className="max-h-[320px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                      {([['all', rawAlerts.length]] as [string, number][]).concat(typeCounts).map(([key, count]) => {
                        const isAll = key === 'all';
                        const visual = isAll ? null : getAlertVisual(key);
                        const Icon = visual?.icon ?? Bell;
                        const active = filterType === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => {
                              setFilterType(key);
                              setIsFilterMenuOpen(false);
                            }}
                            className={`grid h-8 w-full grid-cols-[16px_minmax(0,1fr)_auto_14px] items-center gap-2 rounded-[5px] px-2 text-left text-[12.5px] transition ${
                              active ? 'font-semibold' : 'font-medium text-[#334155] hover:bg-[#f8fafc]'
                            }`}
                            style={active ? { background: PRIMARY_SOFT, color: PRIMARY } : undefined}
                          >
                            <Icon
                              size={14}
                              strokeWidth={2.3}
                              style={{ color: visual ? visual.hex.fg : '#64748b' }}
                            />
                            <span className="truncate">{isAll ? 'Todas las alertas' : getAlertName(key)}</span>
                            <span
                              className={`text-[11.5px] font-semibold ${active ? '' : 'text-[#94a3b8]'}`}
                              style={NUM}
                            >
                              {count}
                            </span>
                            {active ? <Check size={14} strokeWidth={2.6} /> : <span />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Lista de alertas (solo esta zona hace scroll) */}
            <div className="flex-1 overflow-y-auto bg-white" style={{ scrollbarWidth: 'thin' }}>
              {loadingAlerts && rawAlerts.length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center gap-2 text-[#94a3b8]">
                  <RefreshCw size={20} className="animate-spin" style={{ color: PRIMARY }} />
                  <p className="text-[12.5px]">Cargando alertas...</p>
                </div>
              ) : filteredAlerts.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center gap-1.5 px-4 text-center">
                  <p className="text-[12.5px] text-[#94a3b8]">
                    {rawAlerts.length === 0 ? 'No hay alertas por ahora.' : 'No hay alertas que coincidan.'}
                  </p>
                  {(searchQuery || filterType !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setFilterType('all');
                      }}
                      className="text-[12px] font-semibold hover:underline"
                      style={{ color: PRIMARY }}
                    >
                      Limpiar filtros
                    </button>
                  )}
                </div>
              ) : (
                alertsByDay.map((group) => (
                  <section key={group.key}>
                    <div className="sticky top-0 z-[1] flex h-7 items-center border-b border-[#e2e8f0] bg-[#f8fafc] px-3.5 text-[10px] font-bold uppercase tracking-[.06em] text-[#64748b]">
                      {group.label}
                    </div>

                    {group.items.map((alert) => {
                      const eventKey = getAlertKey(alert);
                      const isGeofence = isGeofenceAlert(alert);
                      const visual = getAlertVisual(eventKey, alert.severity);
                      const TypeIcon = visual.icon;
                      const isSelected = selectedAlertId === alert.id;
                      const { time, period } = formatRowTime(alert.serverTime);
                      const speed = alert.speed != null ? Math.round(alert.speed) : null;

                      return (
                        <div
                          key={alert.id}
                          onClick={() => handleToggleAlertLocation(alert)}
                          className={`grid min-h-[54px] cursor-pointer grid-cols-[44px_minmax(0,1fr)_auto_28px] items-center gap-x-2.5 border-b border-[#f1f5f9] py-1.5 pl-3.5 pr-2.5 transition ${
                            isSelected ? '' : 'hover:bg-[#f8fafc]'
                          }`}
                          style={
                            isSelected
                              ? { background: PRIMARY_SOFT, boxShadow: `inset 3px 0 0 ${PRIMARY}` }
                              : undefined
                          }
                        >
                          {/* Hora */}
                          <div className="leading-[1.2]" style={NUM}>
                            <p className="text-[12.5px] font-semibold">{time}</p>
                            <p className="text-[10px] font-medium text-[#94a3b8]">{period}</p>
                          </div>

                          {/* Placa + tipo / geocerca */}
                          <div className="min-w-0">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="truncate text-[12.5px] font-semibold uppercase tracking-[.02em] text-[#1e3a8a]">
                                {alert.deviceID}
                              </span>
                              <span
                                className="flex shrink-0 items-center gap-0.5 text-[11px] font-semibold"
                                style={{ color: visual.hex.fg }}
                              >
                                <TypeIcon size={11} strokeWidth={2.6} />
                                {visual.short}
                              </span>
                            </div>
                            <p className="truncate text-[12px] text-[#64748b]">
                              {isGeofence ? alert.geofenceName || 'Geocerca' : getAlertName(eventKey)}
                            </p>
                          </div>

                          {/* Velocidad */}
                          <div className="whitespace-nowrap text-right" style={NUM}>
                            {speed != null && (
                              <>
                                <span className={`text-[13px] font-bold ${speed === 0 ? 'text-[#94a3b8]' : ''}`}>
                                  {speed}
                                </span>
                                <span className="ml-0.5 text-[10.5px] font-medium text-[#94a3b8]">km/h</span>
                              </>
                            )}
                          </div>

                          {/* Ubicar en el mapa */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleAlertLocation(alert);
                            }}
                            title={isSelected ? 'Quitar del mapa' : 'Ubicar en el mapa'}
                            className={`flex h-7 w-7 items-center justify-center rounded-[6px] transition ${
                              isSelected
                                ? 'text-[#113EB9]'
                                : 'text-[#94a3b8] hover:bg-[#EEF3FF] hover:text-[#113EB9]'
                            }`}
                          >
                            <MapPin size={15} strokeWidth={2.2} />
                          </button>
                        </div>
                      );
                    })}
                  </section>
                ))
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
