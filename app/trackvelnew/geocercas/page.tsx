'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import { toast, Toaster } from 'sonner';
import {
  BarChart2,
  Bell,
  ChevronLeft,
  ChevronRight,
  Circle as CircleIcon,
  Crosshair,
  FileSpreadsheet,
  Hexagon,
  Layers,
  Map as MapIcon,
  MapPin,
  Menu,
  Minus,
  Move,
  Plus,
  Search,
  Undo2,
  X,
  Check,
  Copy,
  RefreshCw,
  Radio,
} from 'lucide-react';

import ConfirmDialog from './ConfirmDialog';
import GeofenceCard from './GeofenceCard';
import GeofenceModal, { GeofenceFormData } from './GeofenceModal';
import RealtimeAlertsDrawer from './RealtimeAlertsDrawer';
import GeocercasReportsModal from './GeocercasReportsModal';
import { useGeofenceSignalR, RealtimeGeofenceAlert } from './useGeofenceSignalR';
import { VisitaItem } from './reportsApi';
import { useMapsReady } from './useMapsReady';
import TrackvelLoader from '@/components/TrackvelLoader';
import { useApi } from '@/context/ApiContext';
import { useUsername } from '@/hooks/useUsername';
import './geocercas.css';
import {
  GEOFENCE_COLORS,
  Geofence,
  LIMA_CENTER,
  LatLng,
  ShapeType,
  Vehicle,
  describeShape,
  distanceMeters,
  formatDistance,
  geofenceCenter,
} from './types';
import {
  DEFAULT_API_BASE_URL,
  cleanBaseUrl,
  createGeocercaApi,
  getGeocercasApi,
  updateGeocercaApi,
  deleteGeocercaApi,
  assignVehiculosToGeocercaApi,
  removeVehiculoFromGeocercaApi,
  getGeocercaVehiculosApi,
  formatCircleWkt,
  formatPolygonWkt,
  formatCoordenadasJson,
  parseGeocercaGeometry,
  ApiGeocerca,
} from './geocercasApi';
import {
  TRACCAR_SERVERS,
  DEFAULT_TRACCAR_URL,
  getTraccarAuthHeader,
  getTraccarServerForUrl,
  getTraccarDevices,
  getDevicesFromAllTraccarServers,
  testTraccarAuthMultiServer,
  testTraccarAuth,
  findTraccarDeviceId,
  resolveTraccarDevice,
  resolveAccountTraccarServer,
  createTraccarGeofence,
  updateTraccarGeofence,
  deleteTraccarGeofence,
  linkDeviceToGeofenceTraccar,
  unlinkDeviceFromGeofenceTraccar,
  getTraccarGeofences,
  getTraccarGeofenceDevices,
  isDeviceLinkedToGeofenceInTraccar,
  findDevicesLinkedToTraccarGeofence,
  clearDeviceGeofencesCache,
  ServerDevicesResult,
} from './traccarApi';

const MIN_RADIUS_M = 25;

interface PendingShape {
  type: ShapeType;
  center?: LatLng;
  radius?: number;
  path?: LatLng[];
}

interface ShapeEntry {
  type: ShapeType;
  overlay: google.maps.Circle | google.maps.Polygon;
  labelMarker?: google.maps.Marker | null;
}

interface DrawDraft {
  center: LatLng | null;
  points: LatLng[];
  preview: google.maps.Circle | google.maps.Polygon | null;
  vertexMarkers: google.maps.Marker[];
  radiusLine?: google.maps.Polyline | null;
  radiusHandle?: google.maps.Marker | null;
  distanceMarker?: google.maps.Marker | null;
  isRadiusFixed?: boolean;
}

export default function GeocercasPage() {
  const mapsReady = useMapsReady();
  const { baseUrl } = useApi();
  const { username } = useUsername();
  const { data: session } = useSession();

  // Token JWT para las APIs autenticadas de reportes
  const sessionToken = session?.user?.token;

  // Resolución segura de baseUrl y accountID/username apuntando a do.velsat.pe:2083 por defecto
  const effectiveBaseUrl = useMemo(() => {
    if (baseUrl && baseUrl.trim()) return baseUrl.trim();
    if (session?.user?.serverUrl) return session.user.serverUrl.trim();
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('servidorUrl');
      if (stored && stored.trim()) return stored.trim();
    }
    return DEFAULT_API_BASE_URL;
  }, [baseUrl, session]);

  const effectiveUsername = useMemo(() => {
    if (session?.user?.username) return session.user.username.trim();
    if (session?.user?.login) return session.user.login.trim();
    if (username && username.trim()) return username.trim();
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('currentUser');
      if (stored && stored.trim()) return stored.trim();
    }
    return 'movilbus';
  }, [session, username]);

  const [alertsDrawerOpen, setAlertsDrawerOpen] = useState(false);
  const [reportsModalOpen, setReportsModalOpen] = useState(false);

  // Hook SignalR para Alertas en Tiempo Real
  const {
    status: signalRStatus,
    alerts: signalRAlerts,
    unreadCount: signalRUnreadCount,
    markAllAsRead: markSignalRAsRead,
    loadingAlerts: signalRLoading,
    refreshAlerts: refreshSignalRAlerts,
    clearAlerts: clearSignalRAlerts,
  } = useGeofenceSignalR({
    accountID: effectiveUsername,
    enabled: Boolean(effectiveUsername),
    isDrawerOpen: alertsDrawerOpen,
  });

  const alertMarkerRef = useRef<google.maps.Marker | null>(null);
  const alertInfoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const alertTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [activeAlertOnMap, setActiveAlertOnMap] = useState<RealtimeGeofenceAlert | null>(null);
  const visitMarkersRef = useRef<google.maps.Marker[]>([]);
  const visitOverlaysRef = useRef<google.maps.OverlayView[]>([]);
  const visitPolylineRef = useRef<google.maps.Polyline | null>(null);

  // Limpiar marcador de auto y popup de alerta del mapa
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
    setActiveAlertOnMap(null);
  }, []);

  // Centrar mapa en alerta en tiempo real con icono de auto (/UnidadK.webp) y popup detallado
  const handleLocateAlert = useCallback(
    (
      alertOrLat: RealtimeGeofenceAlert | number,
      maybeLng?: number,
      maybeTitle?: string,
    ) => {
      const map = mapRef.current;
      if (!map || typeof google === 'undefined' || !google.maps) return;

      // Limpiar marcas previas de alerta
      handleClearAlertMarker();

      // Limpiar marcas previas de visitas si las hubiera
      visitMarkersRef.current.forEach((m) => m.setMap(null));
      visitMarkersRef.current = [];
      visitOverlaysRef.current.forEach((o) => o.setMap(null));
      visitOverlaysRef.current = [];
      if (visitPolylineRef.current) {
        visitPolylineRef.current.setMap(null);
        visitPolylineRef.current = null;
      }

      let lat = 0;
      let lng = 0;
      let deviceID = 'Vehículo';
      let eventType = 'geofenceEnter';
      let geofenceName = 'Geocerca';
      let speed = 0;
      let serverTimeStr = new Date().toISOString();
      let alertObj: RealtimeGeofenceAlert | null = null;

      if (typeof alertOrLat === 'object' && alertOrLat !== null) {
        alertObj = alertOrLat;
        lat = Number(alertOrLat.latitude);
        lng = Number(alertOrLat.longitude);
        deviceID = alertOrLat.deviceID || 'Vehículo';
        eventType = alertOrLat.eventType || 'geofenceEnter';
        geofenceName = alertOrLat.geofenceName || 'Geocerca';
        speed = alertOrLat.speed ?? 0;
        serverTimeStr = alertOrLat.serverTime || new Date().toISOString();
      } else {
        lat = Number(alertOrLat);
        lng = Number(maybeLng || 0);
        deviceID = maybeTitle || 'Alerta';
      }

      if (!lat || !lng) return;

      map.setCenter({ lat, lng });
      map.setZoom(17);

      const isEnter = eventType === 'geofenceEnter';
      let formattedTime = '00:00';
      let formattedDate = '-';
      try {
        const d = new Date(serverTimeStr);
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
        formattedTime = serverTimeStr;
      }

      const marker = new google.maps.Marker({
        position: { lat, lng },
        map,
        title: `${deviceID} (${isEnter ? 'Entrada' : 'Salida'})`,
        animation: google.maps.Animation.DROP,
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
        <div style="font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-width: 220px; padding: 2px 2px 0 0;">
          <!-- Encabezado con Icono, Placa y Geocerca -->
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

          <!-- Fila de Estadísticas en 3 Columnas: Velocidad, Hora, Fecha -->
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

          <!-- Botón de Quitar Marcador y Popup del Mapa -->
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
      });

      info.open(map, marker);
      alertInfoWindowRef.current = info;

      if (alertObj) {
        setActiveAlertOnMap(alertObj);
      } else {
        setActiveAlertOnMap({
          id: `custom-${Date.now()}`,
          accountID: effectiveUsername || '',
          deviceID,
          geofenceID: 0,
          eventType: eventType === 'geofenceExit' ? 'geofenceExit' : 'geofenceEnter',
          geofenceName,
          speed,
          serverTime: serverTimeStr,
          latitude: lat,
          longitude: lng,
          durationMinutes: null,
          receivedAt: Date.now(),
        });
      }

      // Reabrir popup al hacer clic en el auto
      marker.addListener('click', () => {
        info.open(map, marker);
      });

      // Clic derecho en el auto para quitarlo inmediatamente
      marker.addListener('rightclick', () => {
        handleClearAlertMarker();
      });

      // ¡IMPORTANTE! Al cerrar la InfoWindow (X), quitar también el auto del mapa
      info.addListener('closeclick', () => {
        handleClearAlertMarker();
      });

      // Escuchar clic en botón dentro del contenido HTML
      google.maps.event.addListenerOnce(info, 'domready', () => {
        const btnQuitar = document.getElementById('btn-quitar-alerta-popup');
        if (btnQuitar) {
          btnQuitar.onclick = () => {
            handleClearAlertMarker();
          };
        }
      });

      // Auto-limpieza tras 60s
      alertTimeoutRef.current = setTimeout(() => {
        handleClearAlertMarker();
      }, 60000);
    },
    [handleClearAlertMarker],
  );

  function makeDistanceBadgeIcon(text: string): google.maps.Icon {
    const width = Math.max(72, text.length * 9 + 24);
    const height = 26;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="13" fill="#ffffff" stroke="#93c5fd" stroke-width="1.3" />
      <text x="${width / 2}" y="17" font-family="'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif" font-size="11.5" font-weight="700" fill="#1447C0" text-anchor="middle">${text}</text>
    </svg>`;
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new google.maps.Size(width, height),
      anchor: new google.maps.Point(width / 2, height / 2),
    };
  }

  function escapeXml(str: string): string {
    return str.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  }

  function makeGeofenceLabelIcon(name: string, color?: string): google.maps.Icon {
    const text = escapeXml(name.trim().toUpperCase());
    const width = Math.max(70, text.length * 9.5 + 24);
    const height = 26;
    const textColor = color || '#0f172a';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <style>
        .geo-lbl {
          font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.06em;
          paint-order: stroke fill;
          stroke: #ffffff;
          stroke-width: 3.5px;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
      </style>
      <text x="${width / 2}" y="17" class="geo-lbl" fill="${textColor}" text-anchor="middle">${text}</text>
    </svg>`;
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new google.maps.Size(width, height),
      anchor: new google.maps.Point(width / 2, height / 2),
    };
  }

  // =========================================================================
  // Helpers para Visualización de Visita en Mapa (Entrada/Salida/Distancia)
  // =========================================================================

  // Cache de clase OverlayView para tarjetas y cápsula de visita
  let CustomVisitOverlayClass: any = null;

  function getCustomVisitOverlayClass() {
    if (CustomVisitOverlayClass) return CustomVisitOverlayClass;
    if (typeof google === 'undefined' || !google.maps || !google.maps.OverlayView) return null;

    CustomVisitOverlayClass = class CustomVisitOverlay extends google.maps.OverlayView {
      private position: google.maps.LatLng;
      private containerDiv: HTMLDivElement;
      private offset: { x: number; y: number };

      constructor(
        position: google.maps.LatLngLiteral,
        htmlContent: string,
        offset: { x: number; y: number } = { x: 0, y: 0 },
        alignCenter: boolean = false,
      ) {
        super();
        this.position = new google.maps.LatLng(position.lat, position.lng);
        this.offset = offset;

        this.containerDiv = document.createElement('div');
        this.containerDiv.style.position = 'absolute';
        this.containerDiv.style.cursor = 'default';
        this.containerDiv.style.zIndex = alignCenter ? '90' : '100';
        this.containerDiv.style.transform = alignCenter
          ? 'translate(-50%, -50%)'
          : 'translate(-50%, -100%)';
        this.containerDiv.style.pointerEvents = 'auto';
        this.containerDiv.innerHTML = htmlContent;

        if ((google.maps.OverlayView as any).preventMapHitsAndGesturesFrom) {
          (google.maps.OverlayView as any).preventMapHitsAndGesturesFrom(this.containerDiv);
        }
      }

      onAdd() {
        const panes = this.getPanes();
        if (panes) {
          panes.floatPane.appendChild(this.containerDiv);
        }
      }

      onRemove() {
        if (this.containerDiv.parentElement) {
          this.containerDiv.parentElement.removeChild(this.containerDiv);
        }
      }

      draw() {
        const projection = this.getProjection();
        if (!projection || !this.position || !this.containerDiv) return;
        const pixel = projection.fromLatLngToDivPixel(this.position);
        if (pixel) {
          this.containerDiv.style.left = `${pixel.x + this.offset.x}px`;
          this.containerDiv.style.top = `${pixel.y + this.offset.y}px`;
        }
      }
    };

    return CustomVisitOverlayClass;
  }

  // Calcular distancia Haversine en kilómetros entre dos coordenadas
  function calculateDistanceBetweenKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Radio terrestre en km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function formatVisitDistanceText(km: number): string {
    if (km < 1) {
      return `${Math.round(km * 1000)} m`;
    }
    return `${km.toFixed(1)} km`;
  }

  function formatVisitCardDate(dateStr?: string | null): string {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      const secs = String(d.getSeconds()).padStart(2, '0');
      return `${day}/${month}/${year} · ${hours}:${mins}:${secs}`;
    } catch {
      return dateStr;
    }
  }

  function getVisitDurationBadgeText(
    duracionMinutos?: number | null,
    fechaEntrada?: string | null,
    fechaSalida?: string | null,
  ): string {
    if (fechaEntrada && fechaSalida) {
      const tEntrada = new Date(fechaEntrada).getTime();
      const tSalida = new Date(fechaSalida).getTime();
      if (!isNaN(tEntrada) && !isNaN(tSalida) && tSalida >= tEntrada) {
        const diffSec = Math.floor((tSalida - tEntrada) / 1000);
        if (diffSec < 60) return `${diffSec} s`;
        if (diffSec < 3600) {
          const m = Math.floor(diffSec / 60);
          const s = diffSec % 60;
          return s > 0 ? `${m} min ${s} s` : `${m} min`;
        }
        const h = Math.floor(diffSec / 3600);
        const remSec = diffSec % 3600;
        const m = Math.floor(remSec / 60);
        return m > 0 ? `${h} h ${m} min` : `${h} h`;
      }
    }
    if (duracionMinutos != null && duracionMinutos > 0) {
      const m = Math.round(duracionMinutos);
      if (m < 60) return `${m} min`;
      const h = Math.floor(m / 60);
      const rem = m % 60;
      return rem > 0 ? `${h} h ${rem} min` : `${h} h`;
    }
    return 'En curso';
  }

  // Marcar puntos de entrada y salida de visita en el mapa con auto (/UnidadK.webp), tarjetas y cápsula de distancia/duración
  const handleViewVisitOnMap = useCallback((visit: VisitaItem) => {
    setReportsModalOpen(false);
    const map = mapRef.current;
    if (!map || typeof google === 'undefined' || !google.maps) return;

    // 1. Limpiar marcas previas
    handleClearAlertMarker();
    visitMarkersRef.current.forEach((m) => m.setMap(null));
    visitMarkersRef.current = [];
    visitOverlaysRef.current.forEach((o) => o.setMap(null));
    visitOverlaysRef.current = [];
    if (visitPolylineRef.current) {
      visitPolylineRef.current.setMap(null);
      visitPolylineRef.current = null;
    }

    const bounds = new google.maps.LatLngBounds();
    let posEntrada: google.maps.LatLngLiteral | null = null;
    let posSalida: google.maps.LatLngLiteral | null = null;

    const OverlayClass = getCustomVisitOverlayClass();

    // 2. Punto de Entrada
    if (visit.latitudEntrada != null && visit.longitudEntrada != null) {
      posEntrada = { lat: Number(visit.latitudEntrada), lng: Number(visit.longitudEntrada) };

      // Halo verde detrás del auto
      const entryHalo = new google.maps.Marker({
        position: posEntrada,
        map,
        zIndex: 10,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 18,
          fillColor: '#10B981',
          fillOpacity: 0.25,
          strokeColor: '#059669',
          strokeOpacity: 0.65,
          strokeWeight: 2,
        },
      });
      visitMarkersRef.current.push(entryHalo);

      // Icono del auto (/UnidadK.webp) igual que en alertas
      const entryMarker = new google.maps.Marker({
        position: posEntrada,
        map,
        zIndex: 20,
        title: `Entrada: ${visit.deviceID} en ${visit.geofenceName || 'Geocerca'}`,
        animation: google.maps.Animation.DROP,
        icon: {
          url: '/UnidadK.webp',
          scaledSize: new google.maps.Size(56, 32),
          anchor: new google.maps.Point(28, 16),
        },
      });
      visitMarkersRef.current.push(entryMarker);

      // Tarjeta detallada de Entrada (exacta a la referencia)
      if (OverlayClass) {
        const entryCardHtml = `
          <div style="
            position: relative;
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 10px 25px -3px rgba(15, 23, 42, 0.18), 0 4px 6px -2px rgba(15, 23, 42, 0.08);
            border: 1px solid #E2E8F0;
            width: 240px;
            font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            user-select: none;
          ">
            <div style="
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 8px 12px;
              background: #F0FDF4;
              border-top-left-radius: 11px;
              border-top-right-radius: 11px;
              border-bottom: 1px solid #DCFCE7;
            ">
              <div style="display: flex; align-items: center; gap: 6px;">
                <div style="
                  width: 18px;
                  height: 18px;
                  border-radius: 4px;
                  background: #16A34A;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                ">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                    <polyline points="10 17 15 12 10 7"/>
                    <line x1="15" y1="12" x2="3" y2="12"/>
                  </svg>
                </div>
                <span style="font-size: 11px; font-weight: 800; letter-spacing: 0.05em; color: #15803D;">ENTRADA</span>
              </div>
              <span style="font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13.5px; font-weight: 700; color: #0F172A; letter-spacing: 0.01em;">
                ${visit.deviceID}
              </span>
            </div>
            <div style="padding: 10px 12px; display: flex; flex-direction: column; gap: 6px;">
              <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px;">
                <span style="color: #64748B; font-weight: 500;">Geocerca</span>
                <div style="display: flex; align-items: center; gap: 5px;">
                  <span style="width: 7px; height: 7px; border-radius: 9999px; background: #2563EB;"></span>
                  <span style="font-weight: 700; color: #1E293B;">${visit.geofenceName || 'Geocerca'}</span>
                </div>
              </div>
              <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px;">
                <span style="color: #64748B; font-weight: 500;">Fecha</span>
                <span style="font-weight: 600; color: #1E293B; font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-variant-numeric: tabular-nums;">
                  ${formatVisitCardDate(visit.fechaEntrada)}
                </span>
              </div>
            </div>
            <div style="
              position: absolute;
              bottom: -7px;
              left: 50%;
              transform: translateX(-50%);
              width: 0;
              height: 0;
              border-left: 7px solid transparent;
              border-right: 7px solid transparent;
              border-top: 7px solid #ffffff;
              filter: drop-shadow(0 2px 1px rgba(0,0,0,0.06));
            "></div>
          </div>
        `;
        const entryOverlay = new OverlayClass(posEntrada, entryCardHtml, { x: 0, y: -24 }, false);
        entryOverlay.setMap(map);
        visitOverlaysRef.current.push(entryOverlay);
      }

      bounds.extend(posEntrada);
    }

    // 3. Punto de Salida
    if (visit.latitudSalida != null && visit.longitudSalida != null) {
      posSalida = { lat: Number(visit.latitudSalida), lng: Number(visit.longitudSalida) };

      // Halo rojo detrás del auto
      const exitHalo = new google.maps.Marker({
        position: posSalida,
        map,
        zIndex: 10,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 18,
          fillColor: '#EF4444',
          fillOpacity: 0.25,
          strokeColor: '#DC2626',
          strokeOpacity: 0.65,
          strokeWeight: 2,
        },
      });
      visitMarkersRef.current.push(exitHalo);

      // Icono del auto (/UnidadK.webp) igual que en alertas
      const exitMarker = new google.maps.Marker({
        position: posSalida,
        map,
        zIndex: 20,
        title: `Salida: ${visit.deviceID} de ${visit.geofenceName || 'Geocerca'}`,
        animation: google.maps.Animation.DROP,
        icon: {
          url: '/UnidadK.webp',
          scaledSize: new google.maps.Size(56, 32),
          anchor: new google.maps.Point(28, 16),
        },
      });
      visitMarkersRef.current.push(exitMarker);

      // Tarjeta detallada de Salida (exacta a la referencia)
      if (OverlayClass) {
        const exitCardHtml = `
          <div style="
            position: relative;
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 10px 25px -3px rgba(15, 23, 42, 0.18), 0 4px 6px -2px rgba(15, 23, 42, 0.08);
            border: 1px solid #E2E8F0;
            width: 240px;
            font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            user-select: none;
          ">
            <div style="
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 8px 12px;
              background: #FEF2F2;
              border-top-left-radius: 11px;
              border-top-right-radius: 11px;
              border-bottom: 1px solid #FEE2E2;
            ">
              <div style="display: flex; align-items: center; gap: 6px;">
                <div style="
                  width: 18px;
                  height: 18px;
                  border-radius: 4px;
                  background: #DC2626;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                ">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                </div>
                <span style="font-size: 11px; font-weight: 800; letter-spacing: 0.05em; color: #B91C1C;">SALIDA</span>
              </div>
              <span style="font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13.5px; font-weight: 700; color: #0F172A; letter-spacing: 0.01em;">
                ${visit.deviceID}
              </span>
            </div>
            <div style="padding: 10px 12px; display: flex; flex-direction: column; gap: 6px;">
              <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px;">
                <span style="color: #64748B; font-weight: 500;">Geocerca</span>
                <div style="display: flex; align-items: center; gap: 5px;">
                  <span style="width: 7px; height: 7px; border-radius: 9999px; background: #2563EB;"></span>
                  <span style="font-weight: 700; color: #1E293B;">${visit.geofenceName || 'Geocerca'}</span>
                </div>
              </div>
              <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px;">
                <span style="color: #64748B; font-weight: 500;">Fecha</span>
                <span style="font-weight: 600; color: #1E293B; font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-variant-numeric: tabular-nums;">
                  ${formatVisitCardDate(visit.fechaSalida)}
                </span>
              </div>
            </div>
            <div style="
              position: absolute;
              bottom: -7px;
              left: 50%;
              transform: translateX(-50%);
              width: 0;
              height: 0;
              border-left: 7px solid transparent;
              border-right: 7px solid transparent;
              border-top: 7px solid #ffffff;
              filter: drop-shadow(0 2px 1px rgba(0,0,0,0.06));
            "></div>
          </div>
        `;
        const exitOverlay = new OverlayClass(posSalida, exitCardHtml, { x: 0, y: -24 }, false);
        exitOverlay.setMap(map);
        visitOverlaysRef.current.push(exitOverlay);
      }

      bounds.extend(posSalida);
    }

    // 4. Si existen ambos puntos: Línea discontinua y Cápsula de Distancia/Duración
    if (posEntrada && posSalida) {
      // Línea punteada/discontinua entre Entrada y Salida
      const lineSymbol = {
        path: 'M 0,-1 0,1',
        strokeOpacity: 1,
        scale: 2.5,
        strokeColor: '#334155',
      };
      const polyline = new google.maps.Polyline({
        path: [posEntrada, posSalida],
        strokeOpacity: 0,
        icons: [
          {
            icon: lineSymbol,
            offset: '0',
            repeat: '12px',
          },
        ],
        map,
      });
      visitPolylineRef.current = polyline;

      // Calcular distancia y duración
      const distanceKm = calculateDistanceBetweenKm(
        posEntrada.lat,
        posEntrada.lng,
        posSalida.lat,
        posSalida.lng,
      );
      const distanceText = formatVisitDistanceText(distanceKm);
      const durationText = getVisitDurationBadgeText(
        visit.duracionMinutos,
        visit.fechaEntrada,
        visit.fechaSalida,
      );

      // Posición del punto medio de la línea
      const midPos = {
        lat: (posEntrada.lat + posSalida.lat) / 2,
        lng: (posEntrada.lng + posSalida.lng) / 2,
      };

      if (OverlayClass) {
        const pillHtml = `
          <div style="
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: #0B1120;
            color: #FFFFFF;
            padding: 6px 14px;
            border-radius: 9999px;
            font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 11.5px;
            font-weight: 700;
            box-shadow: 0 4px 14px rgba(11, 17, 32, 0.45);
            border: 1px solid #1E293B;
            white-space: nowrap;
            user-select: none;
          ">
            <div style="display: flex; align-items: center; gap: 5px;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <span>${durationText}</span>
            </div>
            <span style="color: #475569; font-weight: 300;">|</span>
            <span style="font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #F8FAFC; font-variant-numeric: tabular-nums;">${distanceText}</span>
          </div>
        `;

        const pillOverlay = new OverlayClass(midPos, pillHtml, { x: 0, y: 0 }, true);
        pillOverlay.setMap(map);
        visitOverlaysRef.current.push(pillOverlay);
      }

      try {
        map.fitBounds(bounds, 120);
      } catch {
        map.fitBounds(bounds);
      }
      toast.info(`Visita de ${visit.deviceID}: ${durationText} · ${distanceText}`);
    } else if (posEntrada) {
      map.setCenter(posEntrada);
      map.setZoom(16);
      toast.info(`Punto de entrada de ${visit.deviceID} marcado en el mapa`);
    } else if (posSalida) {
      map.setCenter(posSalida);
      map.setZoom(16);
      toast.info(`Punto de salida de ${visit.deviceID} marcado en el mapa`);
    } else {
      toast.warning('Esta visita no contiene coordenadas registradas de entrada o salida');
    }
  }, []);

  // Limpiar marcadores, overlays de visita y alertas al desmontar el componente
  useEffect(() => {
    return () => {
      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current);
      }
      if (alertMarkerRef.current) {
        alertMarkerRef.current.setMap(null);
      }
      if (alertInfoWindowRef.current) {
        alertInfoWindowRef.current.close();
      }
      visitMarkersRef.current.forEach((m) => m.setMap(null));
      visitMarkersRef.current = [];
      visitOverlaysRef.current.forEach((o) => o.setMap(null));
      visitOverlaysRef.current = [];
      if (visitPolylineRef.current) {
        visitPolylineRef.current.setMap(null);
        visitPolylineRef.current = null;
      }
    };
  }, []);

  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapType, setMapType] = useState<'roadmap' | 'hybrid'>('roadmap');

  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const geofencesRef = useRef<Geofence[]>([]);
  geofencesRef.current = geofences;
  const [loadingGeofences, setLoadingGeofences] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const vehiclesRef = useRef<Vehicle[]>([]);

  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingShapeId, setEditingShapeId] = useState<string | null>(null);
  const [shapeMenuOpen, setShapeMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'todos' | 'asignadas'>('todos');

  const [drawMode, setDrawMode] = useState<ShapeType | null>(null);
  const [drawInfo, setDrawInfo] = useState<{ points: number; radius: number }>({
    points: 0,
    radius: 0,
  });

  const [pendingShape, setPendingShape] = useState<PendingShape | null>(null);
  const [editingDetails, setEditingDetails] = useState<Geofence | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Geofence | null>(null);
  const [modalInitialTab, setModalInitialTab] = useState<'general' | 'whatsapp'>('general');

  const [testingTraccar, setTestingTraccar] = useState(false);
  const traccarDevicesRef = useRef<ServerDevicesResult[] | null>(null);

  const getCachedOrFreshTraccarDevices = useCallback(
    async (auth: string, forceRefresh = false): Promise<ServerDevicesResult[]> => {
      if (!forceRefresh && traccarDevicesRef.current && traccarDevicesRef.current.length > 0) {
        return traccarDevicesRef.current;
      }
      const results = await getDevicesFromAllTraccarServers(auth);
      traccarDevicesRef.current = results;
      return results;
    },
    [],
  );

  const testTraccarConnection = useCallback(async () => {
    setTestingTraccar(true);
    const targetTraccarUrl = getTraccarServerForUrl(effectiveBaseUrl);
    const toastId = toast.loading(`Probando conexión con Traccar (${targetTraccarUrl})...`);
    try {
      const auth = getTraccarAuthHeader();
      if (!auth) {
        toast.error('No se encontró NEXT_PUBLIC_TRACCAR_EMAIL / PASSWORD en .env.local', { id: toastId });
        return;
      }
      const result = await testTraccarAuth(targetTraccarUrl, auth);
      if (result.ok) {
        console.log(`✅ Conexión con Traccar (${targetTraccarUrl}) exitosa:`, result);
        toast.success(`Traccar (${targetTraccarUrl}): ${result.message}`, {
          id: toastId,
          duration: 5000,
        });
      } else {
        console.error(`❌ Error de conexión con Traccar (${targetTraccarUrl}):`, result.message);
        toast.error(`Traccar (${targetTraccarUrl}): ${result.message}`, {
          id: toastId,
          duration: 6000,
        });
      }
    } catch (error: any) {
      console.error('❌ Error al consultar Traccar:', error);
      const msg = error?.response?.data?.message || error?.message || 'Error de conexión';
      toast.error(`Error Traccar: ${msg}`, {
        id: toastId,
        duration: 6000,
      });
    } finally {
      setTestingTraccar(false);
    }
  }, [effectiveBaseUrl]);

  const shapesRef = useRef<Record<string, ShapeEntry>>({});
  const drawRef = useRef<DrawDraft>({
    center: null,
    points: [],
    preview: null,
    vertexMarkers: [],
  });
  const finishPolygonRef = useRef<() => void>(() => {});
  const finishCircleRef = useRef<() => void>(() => {});
  const undoPointRef = useRef<() => void>(() => {});
  const addPointRef = useRef<(point: LatLng) => void>(() => {});
  const originalShapeRef = useRef<{ center?: LatLng; radius?: number; path?: LatLng[] } | null>(
    null,
  );

  const [manualInputOpen, setManualInputOpen] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [manualRadiusKm, setManualRadiusKm] = useState('');
  const [circleCenter, setCircleCenter] = useState<LatLng | null>(null);
  const [circleRadius, setCircleRadius] = useState<number>(0);
  const applyCircleToMapRef = useRef<(center: LatLng, radius: number) => void>(() => {});
  const initialFitDoneRef = useRef(false);
  const [drawVertices, setDrawVertices] = useState<LatLng[]>([]);
  const [cursorCoord, setCursorCoord] = useState<{ lat: number; lng: number; x: number; y: number } | null>(null);

  const copyCoord = useCallback((lat: number, lng: number) => {
    const text = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      toast.success(`Coordenada copiada: ${text}`);
    }
  }, []);

  const copyAllCoords = useCallback(() => {
    if (!drawVertices.length) {
      toast.info('No hay coordenadas para copiar');
      return;
    }
    const text = drawVertices
      .map((v, i) => `${i + 1}\t${v.lat.toFixed(6)}\t${v.lng.toFixed(6)}`)
      .join('\n');
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      toast.success('Todas las coordenadas copiadas al portapapeles');
    }
  }, [drawVertices]);

  // Métricas en vivo del polígono en dibujo: perímetro (desde 2 vértices), área (desde 3) y vértices
  const polygonStats = useMemo(() => {
    const pts = drawVertices;
    if (pts.length < 2) return null;
    const R = 6378137;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const closed = pts.length >= 3;
    let area = 0;
    let perimeter = 0;
    const edges = closed ? pts.length : pts.length - 1;
    for (let i = 0; i < edges; i++) {
      const p1 = pts[i];
      const p2 = pts[(i + 1) % pts.length];
      perimeter += distanceMeters(p1, p2);
      if (closed) {
        area += toRad(p2.lng - p1.lng) * (2 + Math.sin(toRad(p1.lat)) + Math.sin(toRad(p2.lat)));
      }
    }
    area = Math.abs((area * R * R) / 2);
    const areaText = !closed
      ? null
      : area >= 100000
        ? `${(area / 1_000_000).toLocaleString('es-PE', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} km²`
        : `${Math.round(area).toLocaleString('es-PE')} m²`;
    const perimeterText =
      perimeter >= 1000
        ? `${(perimeter / 1000).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km`
        : `${perimeter.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`;
    return { areaText, perimeterText, vertices: pts.length };
  }, [drawVertices]);

  // Métricas en vivo del círculo en dibujo: radio, área y perímetro
  const circleStats = useMemo(() => {
    if (drawMode !== 'circle' || !circleCenter || circleRadius < MIN_RADIUS_M) return null;
    const r = circleRadius;
    const area = Math.PI * r * r;
    const perimeter = 2 * Math.PI * r;

    const radioText =
      r >= 1000
        ? `${(r / 1000).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km`
        : `${Math.round(r).toLocaleString('es-PE')} m`;
    const areaText =
      area >= 100000
        ? `${(area / 1_000_000).toLocaleString('es-PE', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} km²`
        : `${Math.round(area).toLocaleString('es-PE')} m²`;
    const perimeterText =
      perimeter >= 1000
        ? `${(perimeter / 1000).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km`
        : `${perimeter.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`;

    return { radioText, areaText, perimeterText };
  }, [drawMode, circleCenter, circleRadius]);

  const handleLatChange = useCallback((val: string) => {
    if (val.includes(',') || val.trim().includes(' ')) {
      const parts = val.includes(',') ? val.split(',') : val.trim().split(/\s+/);
      if (parts.length >= 2) {
        const latPart = parts[0].trim();
        const lngPart = parts.slice(1).join(' ').trim();
        setManualLat(latPart);
        setManualLng(lngPart);
        return;
      }
    }
    setManualLat(val);
  }, []);

  const handleAddManualCoordinate = useCallback(() => {
    let lat = parseFloat(manualLat.trim());
    let lng = parseFloat(manualLng.trim());

    if (isNaN(lat) && isNaN(lng) && cursorCoord) {
      lat = cursorCoord.lat;
      lng = cursorCoord.lng;
    }

    if (isNaN(lat) || isNaN(lng)) {
      toast.error('Ingresa una latitud y longitud válidas');
      return;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      toast.error('Coordenadas fuera de rango válido (-90 a 90, -180 a 180)');
      return;
    }

    addPointRef.current({ lat, lng });
    setManualLat('');
    setManualLng('');
  }, [manualLat, manualLng, cursorCoord]);

  const handleApplyManualCircle = useCallback(() => {
    let lat = parseFloat(manualLat.trim());
    let lng = parseFloat(manualLng.trim());

    if (isNaN(lat) || isNaN(lng)) {
      if (circleCenter) {
        lat = circleCenter.lat;
        lng = circleCenter.lng;
      } else if (cursorCoord) {
        lat = cursorCoord.lat;
        lng = cursorCoord.lng;
      }
    }

    if (isNaN(lat) || isNaN(lng)) {
      toast.error('Ingresa una latitud y longitud válidas para el centro');
      return;
    }

    let radiusKm = parseFloat(manualRadiusKm.trim().replace(',', '.'));
    if (isNaN(radiusKm) || radiusKm <= 0) {
      if (circleRadius >= MIN_RADIUS_M) {
        radiusKm = circleRadius / 1000;
      } else {
        toast.error('Ingresa un radio válido en km (ej. 0.77)');
        return;
      }
    }

    // Si el usuario ingresó más de 50, se asume metros (ej. 500 ó 750); si es menor, km (ej. 0.77)
    const radiusMeters = radiusKm > 50 ? radiusKm : radiusKm * 1000;

    if (radiusMeters < MIN_RADIUS_M) {
      toast.error(`El radio mínimo es de ${MIN_RADIUS_M} metros`);
      return;
    }

    const centerPoint = { lat, lng };
    setCircleCenter(centerPoint);
    setCircleRadius(radiusMeters);
    setDrawInfo({ points: 1, radius: radiusMeters });

    applyCircleToMapRef.current(centerPoint, radiusMeters);
    toast.success(`Círculo fijado: radio de ${(radiusMeters / 1000).toFixed(2)} km`);
  }, [manualLat, manualLng, manualRadiusKm, circleCenter, circleRadius, cursorCoord]);

  /* ------------------------------------------------------------------ */
  /* Carga de Vehículos en Vivo (desde la API real)                     */
  /* ------------------------------------------------------------------ */
  const fetchVehicles = useCallback(async () => {
    if (!effectiveBaseUrl || !effectiveUsername) return;
    try {
      const cleanUrl = cleanBaseUrl(effectiveBaseUrl);
      const response = await axios.get(`${cleanUrl}/api/DeviceList/simplified/${effectiveUsername}`);
      if (response.data && Array.isArray(response.data)) {
        const parsedVehicles: Vehicle[] = response.data
          .map((item: any) => {
            const id = item.deviceId || item.DeviceId || '';
            const lat = Number(item.lastValidLatitude || item.LastValidLatitude || 0);
            const lng = Number(item.lastValidLongitude || item.LastValidLongitude || 0);
            const speed = Number(item.lastValidSpeed || item.LastValidSpeed || 0);
            return {
              id,
              label: id,
              position: { lat, lng },
              speed,
            };
          })
          .filter((v: Vehicle) => v.id);

        setVehicles(parsedVehicles);
        vehiclesRef.current = parsedVehicles;
      }
    } catch (error) {
      console.warn('Error al obtener vehículos en vivo del backend:', error);
    }
  }, [effectiveBaseUrl, effectiveUsername]);

  /* ------------------------------------------------------------------ */
  /* Verificación de Auto-Sync Bidireccional en Segundo Plano (No Bloqueante) */
  /* ------------------------------------------------------------------ */
  const syncGenerationRef = useRef(0);
  const runBackgroundSyncCheck = useCallback(
    async (
      currentGeofences: Geofence[],
      authHeader?: string,
      serverDevices?: ServerDevicesResult[],
    ) => {
      if (!authHeader || !serverDevices || serverDevices.length === 0 || currentGeofences.length === 0) {
        return;
      }

      // Cada verificación recibe un número de generación. Si mientras corre se dispara otra
      // (p. ej. tras guardar), esta queda obsoleta y NO debe escribir su resultado viejo.
      const generation = ++syncGenerationRef.current;
      const isStale = () => generation !== syncGenerationRef.current;

      try {
        const allTraccarDevices = serverDevices[0]?.devices || [];
        if (allTraccarDevices.length === 0) return;

        // Dispositivos de la flota del cliente para priorizar
        let fleetPlates = vehiclesRef.current.map((v) => v.id);
        if (fleetPlates.length === 0 && effectiveBaseUrl && effectiveUsername) {
          try {
            const cleanUrl = cleanBaseUrl(effectiveBaseUrl);
            const devListRes = await axios.get(`${cleanUrl}/api/DeviceList/simplified/${effectiveUsername}`);
            if (Array.isArray(devListRes.data)) {
              fleetPlates = devListRes.data.map((d: any) => d.deviceId || d.DeviceId || '').filter(Boolean);
            }
          } catch {}
        }

        const fleetPlateSet = new Set(fleetPlates.map((p) => p.trim().toLowerCase()));
        const candidateDevices = allTraccarDevices.filter((d) => {
          const name = (d.name || '').trim().toLowerCase();
          const uniqueId = (d.uniqueId || '').trim().toLowerCase();
          return fleetPlateSet.size === 0 || fleetPlateSet.has(name) || fleetPlateSet.has(uniqueId);
        });

        const effectiveTraccarUrl = getTraccarServerForUrl(effectiveBaseUrl);

        for (const geo of currentGeofences) {
          if (!geo.geofenceID) continue;

          // 1. Dirección 1: En BD interna pero no confirmado en Traccar
          const unconfirmedVehicleIds: string[] = [];
          if (geo.vehicleIds.length > 0) {
            await Promise.all(
              geo.vehicleIds.map(async (plate) => {
                const dev = resolveTraccarDevice(serverDevices, plate, effectiveTraccarUrl);
                if (!dev) {
                  unconfirmedVehicleIds.push(plate);
                  return;
                }
                try {
                  const isLinked = await isDeviceLinkedToGeofenceInTraccar(
                    dev.serverUrl,
                    dev.deviceId,
                    geo.geofenceID!,
                    authHeader,
                  );
                  if (!isLinked) {
                    unconfirmedVehicleIds.push(plate);
                  }
                } catch {
                  unconfirmedVehicleIds.push(plate);
                }
              }),
            );

            if (unconfirmedVehicleIds.length > 0) {
              console.warn(
                `⚠️ [Auto-Sync Advertencia] Geocerca "${geo.name}" (ID Traccar: ${geo.geofenceID}) tiene ${unconfirmedVehicleIds.length} vehículo(s) en BD interna que NO están confirmados en Traccar:`,
                unconfirmedVehicleIds,
              );
            }
          }

          // 2. Dirección 2: En Traccar pero no en BD interna
          const traccarOnlyVehicleIds: string[] = [];
          try {
            const traccarMatched = await findDevicesLinkedToTraccarGeofence(
              effectiveTraccarUrl,
              geo.geofenceID,
              candidateDevices.length > 0 ? candidateDevices : allTraccarDevices,
              authHeader,
            );

            const currentDbPlates = new Set(geo.vehicleIds.map((v) => v.trim().toLowerCase()));
            for (const matchedDev of traccarMatched) {
              const plateOrName = matchedDev.name || matchedDev.uniqueId;
              const clean = plateOrName.trim().toLowerCase();
              const cleanUnique = (matchedDev.uniqueId || '').trim().toLowerCase();
              if (!currentDbPlates.has(clean) && !currentDbPlates.has(cleanUnique)) {
                traccarOnlyVehicleIds.push(plateOrName);
              }
            }

            if (traccarOnlyVehicleIds.length > 0) {
              console.warn(
                `⚠️ [Auto-Sync Bidireccional] Geocerca "${geo.name}" (ID Traccar: ${geo.geofenceID}) tiene ${traccarOnlyVehicleIds.length} vehículo(s) en Traccar pero NO en BD interna:`,
                traccarOnlyVehicleIds,
              );
            }
          } catch (e) {
            console.warn('[Auto-Sync Bidireccional] Error al escanear dispositivos de Traccar:', e);
          }

          // Si ya hay una verificación más reciente en curso, descartar este resultado viejo.
          if (isStale()) return;

          // Actualizar estado de la geocerca para reflejar con precisión el estado actual,
          // asegurando que se limpien advertencias y listas de huérfanos cuando ya no apliquen.
          setGeofences((prev) =>
            prev.map((g) => {
              if (g.id !== geo.id) return g;
              // Solo advertir sobre unidades que SIGUEN asignadas en este momento en BD
              const currentAssigned = new Set(g.vehicleIds);
              const nextUnc = unconfirmedVehicleIds.filter((v) => currentAssigned.has(v));
              const nextTrac = traccarOnlyVehicleIds.filter((v) => !currentAssigned.has(v));
              const prevUnc = g.unconfirmedVehicleIds || [];
              const prevTrac = g.traccarOnlyVehicleIds || [];
              if (
                prevUnc.length === nextUnc.length &&
                prevTrac.length === nextTrac.length &&
                prevUnc.every((v) => nextUnc.includes(v)) &&
                prevTrac.every((v) => nextTrac.includes(v))
              ) {
                return g;
              }
              return {
                ...g,
                unconfirmedVehicleIds: nextUnc,
                traccarOnlyVehicleIds: nextTrac,
              };
            }),
          );
        }
      } catch (err) {
        console.warn('[Auto-Sync Background] Error durante la sincronización en segundo plano:', err);
      }
    },
    [effectiveBaseUrl, effectiveUsername],
  );

  /* ------------------------------------------------------------------ */
  /* Carga de Geocercas desde el Backend                                */
  /* ------------------------------------------------------------------ */
  const fetchGeocercas = useCallback(
    async (showFeedback = false) => {
      if (!effectiveBaseUrl || !effectiveUsername) {
        setGeofences([]);
        setHydrated(true);
        return;
      }

      setLoadingGeofences(true);
      try {
        // 1. Consultar geocercas en la BD interna (:2083)
        let apiGeos: ApiGeocerca[] = [];
        let apiFailed = false;
        try {
          apiGeos = await getGeocercasApi(effectiveBaseUrl, effectiveUsername);
        } catch (err) {
          console.warn('Error al consultar geocercas de la API interna:', err);
          apiGeos = [];
          apiFailed = true;
        }

        // Si la API interna falló de forma transitoria y ya hay geocercas en pantalla,
        // conservarlas en lugar de vaciar el sidebar (evita que "desaparezcan").
        if (apiFailed && geofencesRef.current.length > 0) {
          setLoadingGeofences(false);
          setHydrated(true);
          return;
        }

        // 2. Respaldo y Sincronización Automática con Traccar
        try {
          const authHeader = getTraccarAuthHeader();
          const targetTraccarUrl = getTraccarServerForUrl(effectiveBaseUrl);
          const traccarGeos = await getTraccarGeofences(targetTraccarUrl, authHeader);

          if (traccarGeos.length > 0) {
            const knownGeofenceIds = new Set(
              apiGeos.map((g) => g.geofenceID).filter(Boolean),
            );
            const knownNames = new Set(
              apiGeos.map((g) => g.nombre.trim().toLowerCase()),
            );

            for (const tGeo of traccarGeos) {
              if (
                !knownGeofenceIds.has(tGeo.id) &&
                !knownNames.has(tGeo.name.trim().toLowerCase())
              ) {
                console.log(
                  `[Sync] Geocerca "${tGeo.name}" (ID ${tGeo.id}) hallada en Traccar pero no en BD interna. Sincronizando...`,
                );

                const isCircle = tGeo.area.toUpperCase().startsWith('CIRCLE');
                const tipo: 'circle' | 'polygon' = isCircle ? 'circle' : 'polygon';

                let coordsJson = '[]';
                if (isCircle) {
                  const matchCircle = tGeo.area.match(
                    /CIRCLE\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*,\s*([-\d.]+)\s*\)/i,
                  );
                  if (matchCircle) {
                    coordsJson = JSON.stringify([
                      {
                        lat: parseFloat(matchCircle[1]),
                        lng: parseFloat(matchCircle[2]),
                        radius: Math.round(parseFloat(matchCircle[3])),
                      },
                    ]);
                  }
                }

                try {
                  const saved = await createGeocercaApi(effectiveBaseUrl, {
                    accountID: effectiveUsername,
                    geofenceID: tGeo.id,
                    nombre: tGeo.name,
                    descripcion: tGeo.description || '',
                    tipo,
                    areaWkt: tGeo.area,
                    coordenadasJson: coordsJson,
                    color: '#113EB9',
                  });

                  apiGeos.push({
                    id: saved.id,
                    accountID: effectiveUsername,
                    geofenceID: tGeo.id,
                    nombre: tGeo.name,
                    descripcion: tGeo.description || '',
                    tipo,
                    areaWkt: tGeo.area,
                    coordenadasJson: coordsJson,
                    color: '#113EB9',
                    activo: true,
                  });
                } catch (syncErr) {
                  console.warn(
                    `[Sync] No se pudo guardar en BD interna, mostrando directamente desde Traccar:`,
                    syncErr,
                  );
                  apiGeos.push({
                    id: tGeo.id,
                    accountID: effectiveUsername,
                    geofenceID: tGeo.id,
                    nombre: tGeo.name,
                    descripcion: tGeo.description || '',
                    tipo,
                    areaWkt: tGeo.area,
                    coordenadasJson: coordsJson,
                    color: '#113EB9',
                    activo: true,
                  });
                }
              }
            }
          }
        } catch (traccarErr) {
          console.warn('[Traccar] No se pudieron sincronizar geocercas desde Traccar:', traccarErr);
        }

        // 3. Mapeo RÁPIDO a modelo de vista (SIN esperar vehículos asignados)
        const authHeader = getTraccarAuthHeader();

        const parsedList: Geofence[] = apiGeos.map((geo) => {
          const geometry = parseGeocercaGeometry(geo);
          const tipo: ShapeType = geo.tipo?.toLowerCase() === 'polygon' ? 'polygon' : 'circle';

          return {
            id: `gf-${geo.id}`,
            numericId: geo.id,
            geofenceID: geo.geofenceID,
            name: geo.nombre,
            description: geo.descripcion || '',
            color: geo.color || '#113EB9',
            type: tipo,
            active: geo.activo !== false,
            ...geometry,
            vehicleIds: [],
            createdAt: geo.fechaCreacion ? new Date(geo.fechaCreacion).getTime() : Date.now(),
          } as Geofence;
        });

        // Mostrar geocercas INMEDIATAMENTE en el sidebar conservando las unidades que ya
        // se ven en pantalla (evita el parpadeo: antes se vaciaban a [] y luego reaparecían).
        const mergeWithPrev = (prevList: Geofence[]): Geofence[] => {
          const prevById = new Map(prevList.map((g) => [g.id, g]));
          return parsedList.map((g) => {
            const prev = prevById.get(g.id);
            return prev
              ? {
                  ...g,
                  vehicleIds: prev.vehicleIds,
                  unconfirmedVehicleIds: prev.unconfirmedVehicleIds,
                  traccarOnlyVehicleIds: prev.traccarOnlyVehicleIds,
                }
              : g;
          });
        };
        setGeofences((prevList) => {
          const merged = mergeWithPrev(prevList);
          geofencesRef.current = merged;
          return merged;
        });
        if (showFeedback) {
          toast.success(`Se cargaron ${parsedList.length} geocercas`);
        }

        // Marcar como cargado INMEDIATAMENTE → el splash se oculta
        setLoadingGeofences(false);
        setHydrated(true);

        // 4. Cargar vehículos asignados EN SEGUNDO PLANO (no bloquea la UI)
        const serverDevicesPromise = authHeader ? getCachedOrFreshTraccarDevices(authHeader) : Promise.resolve([]);

        Promise.all(
          apiGeos.map(async (geo) => {
            try {
              const assignedVehs = await getGeocercaVehiculosApi(effectiveBaseUrl, geo.id);
              return { geoId: geo.id, vehicleIds: assignedVehs.map((v) => v.deviceID) };
            } catch {
              // null = no se pudo consultar; se conservan las unidades actuales en pantalla
              return { geoId: geo.id, vehicleIds: null as string[] | null };
            }
          }),
        ).then((rawResults) => {
          setGeofences((prev) =>
            prev.map((g) => {
              const match = rawResults.find((r) => `gf-${r.geoId}` === g.id);
              if (!match || match.vehicleIds === null) return g;
              const assigned = new Set(match.vehicleIds);
              return {
                ...g,
                vehicleIds: match.vehicleIds,
                // Quitar advertencias de unidades que ya no están asignadas
                unconfirmedVehicleIds: (g.unconfirmedVehicleIds || []).filter((v) => assigned.has(v)),
                traccarOnlyVehicleIds: (g.traccarOnlyVehicleIds || []).filter((v) => !assigned.has(v)),
              };
            }),
          );

          const results = rawResults.map((r) => ({
            geoId: r.geoId,
            vehicleIds:
              r.vehicleIds ??
              (geofencesRef.current.find((g) => g.id === `gf-${r.geoId}`)?.vehicleIds || []),
          }));

          // 5. Disparar verificación bidireccional en SEGUNDO PLANO
          serverDevicesPromise.then((serverDevices) => {
            setTimeout(() => {
              runBackgroundSyncCheck(
                parsedList.map((g) => {
                  const match = results.find((r) => `gf-${r.geoId}` === g.id);
                  return match ? { ...g, vehicleIds: match.vehicleIds } : g;
                }),
                authHeader,
                serverDevices,
              );
            }, 100);
          });
        });
      } catch (error: any) {
        console.error('Error al cargar geocercas del servidor:', error);
        if (showFeedback) {
          toast.error('No se pudieron sincronizar las geocercas con el servidor');
        }
        setGeofences([]);
      } finally {
        setLoadingGeofences(false);
        setHydrated(true);
      }
    },
    [effectiveBaseUrl, effectiveUsername, runBackgroundSyncCheck, getCachedOrFreshTraccarDevices],
  );

  useEffect(() => {
    fetchVehicles();
    fetchGeocercas(false);
  }, [fetchVehicles, fetchGeocercas]);

  // Polling periódico de posiciones de vehículos cada 15 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      fetchVehicles();
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchVehicles]);

  /* ------------------------------------------------------------------ */
  /* Pantalla de carga (Loader / Splash)                                 */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    // Safety fallback: máximo absoluto 10 s por si algo falla catastróficamente
    const safetyTimer = setTimeout(() => {
      console.warn('[Loader] Safety fallback: ocultando loader tras 10 s');
      window.trackvelLoader?.hide();
    }, 10000);

    // Solo ocultar cuando AMBOS estén listos: datos cargados + mapa renderizado
    if (hydrated && mapReady) {
      window.trackvelLoader?.hide();
      clearTimeout(safetyTimer);
    }

    return () => clearTimeout(safetyTimer);
  }, [hydrated, mapReady]);

  /* ------------------------------------------------------------------ */
  /* Mapa                                                                */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (!mapsReady || mapRef.current || !mapDivRef.current) return;

    const map = new google.maps.Map(mapDivRef.current, {
      center: LIMA_CENTER,
      zoom: 13,
      mapTypeId: 'roadmap',
      disableDefaultUI: true,
      clickableIcons: false,
      gestureHandling: 'greedy',
    });
    mapRef.current = map;
    setMapReady(true);

    setTimeout(() => {
      google.maps.event.trigger(map, 'resize');
    }, 150);
  }, [mapsReady]);

  // Reajustar viewport del mapa cuando se abre/cierra el sidebar
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const timer = setTimeout(() => {
      google.maps.event.trigger(map, 'resize');
    }, 310);
    return () => clearTimeout(timer);
  }, [sidebarOpen]);

  useEffect(() => {
    const shapes = shapesRef.current;
    return () => {
      Object.values(shapes).forEach((entry) => {
        entry.overlay.setMap(null);
        entry.labelMarker?.setMap(null);
      });
    };
  }, []);

  /* ------------------------------------------------------------------ */
  /* Dibujo de geocercas (clic a clic, sin DrawingManager)               */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    if (!drawMode) {
      map.setOptions({ draggableCursor: null, disableDoubleClickZoom: false });
      return;
    }

    map.setOptions({ draggableCursor: 'crosshair', disableDoubleClickZoom: true });

    const draft = drawRef.current;
    draft.center = null;
    draft.points = [];
    setDrawInfo({ points: 0, radius: 0 });

    const previewStyle = {
      fillColor: '#113EB9',
      fillOpacity: 0.15,
      strokeColor: '#113EB9',
      strokeWeight: 2,
      clickable: false,
      zIndex: 50,
    };

    const vertexIcon: google.maps.Symbol = {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 4.5,
      fillColor: '#ffffff',
      fillOpacity: 1,
      strokeColor: '#113EB9',
      strokeWeight: 2,
    };

    const clearDraft = () => {
      draft.preview?.setMap(null);
      draft.preview = null;
      draft.vertexMarkers.forEach((marker) => marker.setMap(null));
      draft.vertexMarkers = [];
      draft.radiusLine?.setMap(null);
      draft.radiusLine = null;
      draft.radiusHandle?.setMap(null);
      draft.radiusHandle = null;
      draft.distanceMarker?.setMap(null);
      draft.distanceMarker = null;
      draft.center = null;
      draft.points = [];
      draft.isRadiusFixed = false;
      setCircleCenter(null);
      setCircleRadius(0);
      setDrawVertices([]);
      setCursorCoord(null);
    };

    const finishPolygon = () => {
      const points = [...draft.points];
      while (points.length > 3 && distanceMeters(points[points.length - 1], points[points.length - 2]) < 5) {
        points.pop();
      }
      // Si el último punto se colocó encima o muy cerca del primero, quitarlo para evitar duplicado
      if (points.length > 3 && distanceMeters(points[points.length - 1], points[0]) < 35) {
        points.pop();
      }
      if (points.length < 3) return;
      clearDraft();
      setDrawMode(null);
      setPendingShape({ type: 'polygon', path: points });
    };

    /**
     * Vista previa estática del polígono (no sigue al cursor):
     *  - 2 vértices → línea segmentada entre ambos
     *  - 3+ vértices → polígono cerrado y relleno
     * (Para polígonos reutilizamos draft.radiusLine como línea segmentada).
     */
    const renderPolygonPreview = () => {
      const pts = draft.points;
      if (pts.length === 2) {
        if (!draft.radiusLine) {
          draft.radiusLine = new google.maps.Polyline({
            map,
            path: pts,
            strokeOpacity: 0,
            clickable: false,
            icons: [
              {
                icon: {
                  path: 'M 0,-1 0,1',
                  strokeOpacity: 1,
                  scale: 2.5,
                  strokeColor: '#1447C0',
                },
                offset: '0',
                repeat: '10px',
              },
            ],
            zIndex: 55,
          });
        } else {
          draft.radiusLine.setPath(pts);
        }
      } else if (draft.radiusLine) {
        draft.radiusLine.setMap(null);
        draft.radiusLine = null;
      }

      if (pts.length >= 3) {
        if (!draft.preview) {
          draft.preview = new google.maps.Polygon({ ...previewStyle, map, paths: pts });
        } else {
          (draft.preview as google.maps.Polygon).setPath(pts);
        }
      } else if (draft.preview) {
        draft.preview.setMap(null);
        draft.preview = null;
      }
    };

    const refreshVertexMarkers = () => {
      draft.vertexMarkers.forEach((m) => m.setMap(null));
      draft.vertexMarkers = [];
      draft.points.forEach((pt, index) => {
        const isLast = index === draft.points.length - 1;
        const marker = new google.maps.Marker({
          map,
          position: pt,
          clickable: true,
          draggable: true,
          cursor: index === 0 && draft.points.length >= 3 ? 'pointer' : 'move',
          title:
            index === 0 && draft.points.length >= 3
              ? 'Clic para cerrar la geocerca · Arrastra para mover'
              : 'Arrastra para mover el vértice',
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: isLast ? '#FB7B0F' : '#ffffff',
            fillOpacity: 1,
            strokeColor: isLast ? '#FB7B0F' : '#1447C0',
            strokeWeight: 2,
          },
          label: {
            text: String(index + 1),
            color: isLast ? '#ffffff' : '#1447C0',
            fontSize: '11px',
            fontWeight: 'bold',
          },
          zIndex: 60 + index,
        });

        // Arrastrar un vértice para ajustar la forma
        marker.addListener('drag', (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return;
          draft.points[index] = { lat: e.latLng.lat(), lng: e.latLng.lng() };
          renderPolygonPreview();
        });
        marker.addListener('dragend', () => {
          setDrawVertices([...draft.points]);
        });

        // Clic sobre el vértice 1 (con 3+ vértices) cierra la geocerca
        marker.addListener('click', () => {
          if (index === 0 && draft.points.length >= 3) finishPolygon();
        });

        draft.vertexMarkers.push(marker);
      });
    };

    const fixCircleRadius = (radius: number, perimeterPoint: LatLng) => {
      draft.isRadiusFixed = true;
      updateCircleRadius(radius, perimeterPoint);
      setManualLat(draft.center!.lat.toFixed(5));
      setManualLng(draft.center!.lng.toFixed(5));
      setManualRadiusKm((radius / 1000).toFixed(2));
      setCursorCoord(null);
      map.setOptions({ draggableCursor: null });

      if (draft.radiusHandle) {
        draft.radiusHandle.setOptions({
          clickable: true,
          draggable: true,
          cursor: 'ew-resize',
        });
      }
      if (draft.vertexMarkers[0]) {
        draft.vertexMarkers[0].setOptions({
          clickable: true,
          draggable: true,
          cursor: 'move',
        });
      }
    };

    const updateCircleRadius = (radius: number, perimeterPoint: LatLng) => {
      if (!draft.center || !draft.preview) return;
      (draft.preview as google.maps.Circle).setRadius(radius);
      setCircleRadius(radius);
      setDrawInfo({ points: 1, radius });
      setManualRadiusKm((radius / 1000).toFixed(2));

      if (draft.radiusLine) {
        draft.radiusLine.setPath([draft.center, perimeterPoint]);
      }
      const midpoint = {
        lat: (draft.center.lat + perimeterPoint.lat) / 2,
        lng: (draft.center.lng + perimeterPoint.lng) / 2,
      };
      if (draft.distanceMarker) {
        draft.distanceMarker.setPosition(midpoint);
        draft.distanceMarker.setIcon(makeDistanceBadgeIcon(formatDistance(radius)));
      }
      if (draft.radiusHandle) {
        draft.radiusHandle.setPosition(perimeterPoint);
      }
    };

    const updateCircleCenter = (newCenter: LatLng) => {
      draft.center = newCenter;
      setCircleCenter(newCenter);
      setManualLat(newCenter.lat.toFixed(5));
      setManualLng(newCenter.lng.toFixed(5));

      if (draft.preview) {
        (draft.preview as google.maps.Circle).setCenter(newCenter);
        const radius = (draft.preview as google.maps.Circle).getRadius();
        const lngOffset = radius / (111320 * Math.cos((newCenter.lat * Math.PI) / 180));
        const perimeterPoint = { lat: newCenter.lat, lng: newCenter.lng + lngOffset };

        if (draft.radiusLine) {
          draft.radiusLine.setPath([newCenter, perimeterPoint]);
        }
        const midpoint = {
          lat: (newCenter.lat + perimeterPoint.lat) / 2,
          lng: (newCenter.lng + perimeterPoint.lng) / 2,
        };
        if (draft.distanceMarker) {
          draft.distanceMarker.setPosition(midpoint);
        }
        if (draft.radiusHandle) {
          draft.radiusHandle.setPosition(perimeterPoint);
        }
      }
      if (draft.vertexMarkers[0]) {
        draft.vertexMarkers[0].setPosition(newCenter);
      }
    };

    const createRadiusHandle = (pos: LatLng) => {
      const handle = new google.maps.Marker({
        map,
        position: pos,
        clickable: true,
        draggable: true,
        cursor: 'ew-resize',
        title: 'Arrastra para cambiar el radio del círculo · Clic para finalizar',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: '#ffffff',
          fillOpacity: 1,
          strokeColor: '#1447C0',
          strokeWeight: 2.5,
        },
        zIndex: 75,
      });

      handle.addListener('drag', (e: google.maps.MapMouseEvent) => {
        if (!e.latLng || !draft.center) return;
        const pt = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        const newRadius = Math.max(MIN_RADIUS_M, Math.round(distanceMeters(draft.center, pt)));
        updateCircleRadius(newRadius, pt);
      });
      handle.addListener('dragend', (e: google.maps.MapMouseEvent) => {
        if (!e.latLng || !draft.center) return;
        const pt = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        const newRadius = Math.max(MIN_RADIUS_M, Math.round(distanceMeters(draft.center, pt)));
        updateCircleRadius(newRadius, pt);
        draft.isRadiusFixed = true;
      });
      handle.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (!draft.isRadiusFixed && draft.center) {
          const pt = e.latLng
            ? { lat: e.latLng.lat(), lng: e.latLng.lng() }
            : (handle.getPosition()?.toJSON() || null);
          if (pt) {
            const radius = Math.max(MIN_RADIUS_M, Math.round(distanceMeters(draft.center, pt)));
            fixCircleRadius(radius, pt);
          }
        } else if (draft.isRadiusFixed && (draft.preview as google.maps.Circle)?.getRadius() >= MIN_RADIUS_M) {
          finishCircle();
        }
      });
      return handle;
    };

    const createCenterMarker = (pos: LatLng) => {
      const marker = new google.maps.Marker({
        map,
        position: pos,
        clickable: true,
        draggable: true,
        cursor: 'move',
        title: 'Arrastra para mover el centro del círculo',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 6.5,
          fillColor: '#FB7B0F',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2.5,
        },
        zIndex: 70,
      });
      marker.addListener('drag', (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        updateCircleCenter({ lat: e.latLng.lat(), lng: e.latLng.lng() });
      });
      return marker;
    };

    const applyCircleToMap = (center: LatLng, radius: number) => {
      draft.center = center;
      draft.isRadiusFixed = true;

      if (!draft.preview) {
        draft.preview = new google.maps.Circle({
          ...previewStyle,
          map,
          center,
          radius,
        });
      } else {
        const circle = draft.preview as google.maps.Circle;
        circle.setCenter(center);
        circle.setRadius(radius);
      }

      // Marcador del centro (arrastrable)
      if (!draft.vertexMarkers.length) {
        draft.vertexMarkers.push(createCenterMarker(center));
      } else {
        draft.vertexMarkers[0].setPosition(center);
        draft.vertexMarkers[0].setDraggable(true);
      }

      // Punto del perímetro (hacia el Este)
      const lngOffset = radius / (111320 * Math.cos((center.lat * Math.PI) / 180));
      const perimeterPoint = { lat: center.lat, lng: center.lng + lngOffset };

      // Línea segmentada de radio
      if (!draft.radiusLine) {
        draft.radiusLine = new google.maps.Polyline({
          map,
          path: [center, perimeterPoint],
          strokeOpacity: 0,
          icons: [
            {
              icon: {
                path: 'M 0,-1 0,1',
                strokeOpacity: 1,
                scale: 2,
                strokeColor: '#1447C0',
              },
              offset: '0',
              repeat: '10px',
            },
          ],
          zIndex: 55,
        });
      } else {
        draft.radiusLine.setPath([center, perimeterPoint]);
      }

      // Badge con distancia en el punto medio
      const midpoint = {
        lat: (center.lat + perimeterPoint.lat) / 2,
        lng: (center.lng + perimeterPoint.lng) / 2,
      };
      const distText = formatDistance(radius);
      if (!draft.distanceMarker) {
        draft.distanceMarker = new google.maps.Marker({
          map,
          position: midpoint,
          clickable: false,
          icon: makeDistanceBadgeIcon(distText),
          zIndex: 70,
        });
      } else {
        draft.distanceMarker.setPosition(midpoint);
        draft.distanceMarker.setIcon(makeDistanceBadgeIcon(distText));
      }

      // Asa circular en el perímetro (arrastrable)
      if (!draft.radiusHandle) {
        draft.radiusHandle = createRadiusHandle(perimeterPoint);
      } else {
        draft.radiusHandle.setPosition(perimeterPoint);
        draft.radiusHandle.setDraggable(true);
      }
    };
    applyCircleToMapRef.current = applyCircleToMap;

    const addPoint = (point: LatLng) => {
      if (drawMode === 'circle') {
        if (!draft.center) {
          draft.center = point;
          draft.isRadiusFixed = false;
          setCircleCenter(point);
          setManualLat(point.lat.toFixed(5));
          setManualLng(point.lng.toFixed(5));
          draft.preview = new google.maps.Circle({
            ...previewStyle,
            map,
            center: point,
            radius: 1,
          });

          // Marcador del centro (arrastrable)
          draft.vertexMarkers.push(createCenterMarker(point));

          // Línea segmentada de radio
          draft.radiusLine = new google.maps.Polyline({
            map,
            path: [point, point],
            strokeOpacity: 0,
            icons: [
              {
                icon: {
                  path: 'M 0,-1 0,1',
                  strokeOpacity: 1,
                  scale: 2,
                  strokeColor: '#1447C0',
                },
                offset: '0',
                repeat: '10px',
              },
            ],
            zIndex: 55,
          });

          // Badge de distancia
          draft.distanceMarker = new google.maps.Marker({
            map,
            position: point,
            clickable: false,
            icon: makeDistanceBadgeIcon('0 m'),
            zIndex: 70,
          });

          // Asa en el perímetro (arrastrable)
          draft.radiusHandle = createRadiusHandle(point);

          setDrawInfo({ points: 1, radius: 0 });
          setCircleRadius(0);
        }
        return;
      }

      draft.points.push(point);
      renderPolygonPreview();
      refreshVertexMarkers();
      setDrawInfo({ points: draft.points.length, radius: 0 });
      setDrawVertices([...draft.points]);
    };

    const undoPoint = () => {
      if (drawMode === 'circle') {
        if (draft.center) {
          clearDraft();
          map.setOptions({ draggableCursor: 'crosshair' });
          setDrawInfo({ points: 0, radius: 0 });
        }
        return;
      }
      if (!draft.points.length) return;
      draft.points.pop();
      renderPolygonPreview();
      refreshVertexMarkers();
      setDrawInfo({ points: draft.points.length, radius: 0 });
      setDrawVertices([...draft.points]);
    };

    const finishCircle = () => {
      if (drawMode !== 'circle' || !draft.center || !draft.preview) return;
      const radius = (draft.preview as google.maps.Circle).getRadius();
      if (radius < MIN_RADIUS_M) return;
      const center = draft.center;
      clearDraft();
      setDrawMode(null);
      setPendingShape({ type: 'circle', center, radius });
    };

    addPointRef.current = addPoint;
    finishPolygonRef.current = finishPolygon;
    finishCircleRef.current = finishCircle;
    undoPointRef.current = undoPoint;

    const clickListener = map.addListener('click', (event: google.maps.MapMouseEvent) => {
      if (!event.latLng) return;
      const point = { lat: event.latLng.lat(), lng: event.latLng.lng() };

      if (drawMode === 'circle') {
        if (!draft.center) {
          addPoint(point);
          return;
        }

        // Si el radio aún no estaba fijo: este clic FIJA el radio
        if (!draft.isRadiusFixed) {
          const radius = Math.max(MIN_RADIUS_M, Math.round(distanceMeters(draft.center, point)));
          fixCircleRadius(radius, point);
          return;
        }

        // Si ya estaba fijo y vuelve a hacer clic en el mapa, finaliza el dibujo
        if ((draft.preview as google.maps.Circle)?.getRadius() >= MIN_RADIUS_M) {
          finishCircle();
        }
        return;
      }

      // Si es polígono y ya hay al menos 3 vértices, hacer clic cerca del punto inicial cierra el polígono
      if (drawMode === 'polygon' && draft.points.length >= 3) {
        const first = draft.points[0];
        if (distanceMeters(first, point) < 40) {
          finishPolygon();
          return;
        }
      }

      addPoint(point);
    });

    const moveListener = map.addListener('mousemove', (event: google.maps.MapMouseEvent) => {
      if (!event.latLng) return;
      const point = { lat: event.latLng.lat(), lng: event.latLng.lng() };

      // Si el círculo ya está fijado, el mouse se mueve libremente sin alterar el radio ni mostrar tooltip
      if (drawMode === 'circle' && draft.isRadiusFixed) {
        setCursorCoord(null);
        return;
      }

      const domEvent = event.domEvent as MouseEvent | undefined;
      if (domEvent && mapDivRef.current) {
        const rect = mapDivRef.current.getBoundingClientRect();
        setCursorCoord({
          lat: point.lat,
          lng: point.lng,
          x: domEvent.clientX - rect.left,
          y: domEvent.clientY - rect.top,
        });
      }

      if (drawMode === 'circle' && draft.center && draft.preview && !draft.isRadiusFixed) {
        const radius = Math.max(MIN_RADIUS_M, Math.round(distanceMeters(draft.center, point)));
        updateCircleRadius(radius, point);
        return;
      }

      // Polígono: la vista previa es estática (no sigue al cursor) para que la forma no "se deforme"
    });

    const mouseOutListener = map.addListener('mouseout', () => {
      setCursorCoord(null);
    });

    const dblClickListener = map.addListener('dblclick', () => {
      if (drawMode === 'polygon') finishPolygon();
      if (drawMode === 'circle' && draft.center && (draft.preview as google.maps.Circle)?.getRadius() >= MIN_RADIUS_M) {
        finishCircle();
      }
    });

    return () => {
      google.maps.event.removeListener(clickListener);
      google.maps.event.removeListener(moveListener);
      google.maps.event.removeListener(mouseOutListener);
      google.maps.event.removeListener(dblClickListener);
      clearDraft();
      map.setOptions({ draggableCursor: null, disableDoubleClickZoom: false });
    };
  }, [drawMode, mapReady]);

  /* ------------------------------------------------------------------ */
  /* Sincronizar geocercas del estado con las figuras del mapa           */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const store = shapesRef.current;

    Object.keys(store).forEach((id) => {
      const geofence = geofences.find((g) => g.id === id);
      if (!geofence || geofence.type !== store[id].type) {
        store[id].overlay.setMap(null);
        store[id].labelMarker?.setMap(null);
        delete store[id];
      }
    });

    geofences.forEach((geofence) => {
      const isEditing = editingShapeId === geofence.id;
      const isSelected = selectedId === geofence.id;
      const style = {
        fillColor: geofence.color,
        fillOpacity: isSelected ? 0.3 : 0.15,
        strokeColor: geofence.color,
        strokeOpacity: 1,
        strokeWeight: isSelected || isEditing ? 3 : 2,
        editable: isEditing,
        draggable: isEditing,
        clickable: !drawMode,
        zIndex: isEditing ? 30 : isSelected ? 20 : 10,
      };

      const entry = store[geofence.id];
      const center = geofenceCenter(geofence);
      const labelIcon = geofence.name ? makeGeofenceLabelIcon(geofence.name, geofence.color) : null;

      if (!entry) {
        let overlay: google.maps.Circle | google.maps.Polygon | null = null;
        if (geofence.type === 'circle' && geofence.center && geofence.radius != null) {
          overlay = new google.maps.Circle({
            ...style,
            map,
            center: geofence.center,
            radius: geofence.radius,
          });
          overlay.addListener('click', () => setSelectedId(geofence.id));
        } else if (geofence.type === 'polygon' && geofence.path && geofence.path.length >= 3) {
          overlay = new google.maps.Polygon({ ...style, map, paths: geofence.path });
          overlay.addListener('click', () => setSelectedId(geofence.id));
        }

        if (overlay) {
          let labelMarker: google.maps.Marker | null = null;
          if (center && labelIcon) {
            labelMarker = new google.maps.Marker({
              map,
              position: center,
              clickable: !drawMode,
              icon: labelIcon,
              zIndex: isSelected ? 26 : 16,
            });
            labelMarker.addListener('click', () => setSelectedId(geofence.id));
          }
          store[geofence.id] = { type: geofence.type, overlay, labelMarker };
        }
        return;
      }

      entry.overlay.setOptions(style);

      // Sincronizar etiqueta del nombre en el centro de la geocerca
      if (center && labelIcon) {
        if (!entry.labelMarker) {
          entry.labelMarker = new google.maps.Marker({
            map,
            position: center,
            clickable: !drawMode,
            icon: labelIcon,
            zIndex: isSelected ? 26 : 16,
          });
          entry.labelMarker.addListener('click', () => setSelectedId(geofence.id));
        } else {
          entry.labelMarker.setPosition(center);
          entry.labelMarker.setIcon(labelIcon);
          entry.labelMarker.setZIndex(isSelected ? 26 : 16);
          entry.labelMarker.setOptions({ clickable: !drawMode });
        }
      } else if (entry.labelMarker) {
        entry.labelMarker.setMap(null);
        entry.labelMarker = null;
      }

      if (isEditing) return;

      if (geofence.type === 'circle' && geofence.center && geofence.radius != null) {
        const circle = entry.overlay as google.maps.Circle;
        circle.setCenter(geofence.center);
        circle.setRadius(geofence.radius);
      } else if (geofence.type === 'polygon' && geofence.path) {
        (entry.overlay as google.maps.Polygon).setPath(geofence.path);
      }
    });
  }, [geofences, selectedId, editingShapeId, drawMode, mapReady]);



  /* ------------------------------------------------------------------ */
  /* Acciones y Operaciones Backend                                      */
  /* ------------------------------------------------------------------ */
  const startDrawing = useCallback((type: ShapeType) => {
    setShapeMenuOpen(false);
    setEditingShapeId(null);
    setCircleCenter(null);
    setCircleRadius(0);
    setManualLat('');
    setManualLng('');
    setManualRadiusKm('');
    setDrawMode(type);
  }, []);

  const cancelDrawing = useCallback(() => setDrawMode(null), []);

  const startEditShape = useCallback((geofence: Geofence) => {
    originalShapeRef.current =
      geofence.type === 'circle'
        ? { center: geofence.center, radius: geofence.radius }
        : { path: geofence.path };
    setDrawMode(null);
    setSelectedId(geofence.id);
    setEditingShapeId(geofence.id);
  }, []);

  const saveShapeEdit = useCallback(async () => {
    const id = editingShapeId;
    const entry = id ? shapesRef.current[id] : null;
    const geofence = geofences.find((g) => g.id === id);
    if (!id || !entry || !geofence) return;

    let newCenter: LatLng | undefined;
    let newRadius: number | undefined;
    let newPath: LatLng[] | undefined;

    if (entry.type === 'circle') {
      const circle = entry.overlay as google.maps.Circle;
      const center = circle.getCenter();
      if (!center) return;
      newCenter = { lat: center.lat(), lng: center.lng() };
      newRadius = circle.getRadius();
    } else {
      const polygon = entry.overlay as google.maps.Polygon;
      newPath = polygon
        .getPath()
        .getArray()
        .map((point) => ({ lat: point.lat(), lng: point.lng() }));
    }

    const areaWkt =
      geofence.type === 'circle' && newCenter && newRadius != null
        ? formatCircleWkt(newCenter, newRadius)
        : geofence.type === 'polygon' && newPath
        ? formatPolygonWkt(newPath)
        : '';

    const coordenadasJson = formatCoordenadasJson(
      geofence.type,
      newCenter,
      newRadius,
      newPath,
    );

    const toastId = toast.loading('Guardando ajuste de forma...');

    try {
      // 1. Traccar Core: Actualizar geometría en Traccar si tiene geofenceID
      const authHeader = getTraccarAuthHeader();
      if (geofence.geofenceID && areaWkt && authHeader) {
        try {
          const serverDevices = await getCachedOrFreshTraccarDevices(authHeader);
          const targetServer = resolveAccountTraccarServer(
            effectiveUsername,
            serverDevices,
            effectiveBaseUrl,
          );
          await updateTraccarGeofence(
            targetServer,
            geofence.geofenceID,
            geofence.name,
            areaWkt,
            geofence.description,
            authHeader,
          );
        } catch (traccarErr) {
          console.warn('Error al actualizar geometría en Traccar:', traccarErr);
        }
      }

      // 2. Base de datos propia Velsat (:2083)
      if (geofence.numericId && effectiveBaseUrl) {
        await updateGeocercaApi(effectiveBaseUrl, geofence.numericId, {
          nombre: geofence.name,
          descripcion: geofence.description,
          tipo: geofence.type,
          areaWkt,
          coordenadasJson,
          color: geofence.color,
        });
      }

      setGeofences((prev) =>
        prev.map((g) => {
          if (g.id !== id) return g;
          return {
            ...g,
            center: newCenter,
            radius: newRadius,
            path: newPath,
          };
        }),
      );

      toast.success('Geometría actualizada correctamente', { id: toastId });
    } catch (error: any) {
      console.error('Error al actualizar geometría:', error);
      toast.error(error?.response?.data?.message || 'Error al guardar ajuste de forma', { id: toastId });
    } finally {
      setEditingShapeId(null);
      originalShapeRef.current = null;
    }
  }, [editingShapeId, geofences, effectiveBaseUrl, effectiveUsername, getCachedOrFreshTraccarDevices]);

  const cancelShapeEdit = useCallback(() => {
    const id = editingShapeId;
    const entry = id ? shapesRef.current[id] : null;
    const original = originalShapeRef.current;

    if (entry && original) {
      if (entry.type === 'circle' && original.center && original.radius != null) {
        const circle = entry.overlay as google.maps.Circle;
        circle.setCenter(original.center);
        circle.setRadius(original.radius);
      } else if (entry.type === 'polygon' && original.path) {
        (entry.overlay as google.maps.Polygon).setPath(original.path);
      }
    }

    setEditingShapeId(null);
    originalShapeRef.current = null;
  }, [editingShapeId]);

  const closeModal = useCallback(() => {
    setPendingShape(null);
    setEditingDetails(null);
    setModalInitialTab('general');
  }, []);

  const handleEditDetails = useCallback((geofence: Geofence) => {
    setModalInitialTab('general');
    setEditingDetails(geofence);
  }, []);

  const handleConfigureWhatsApp = useCallback((geofence: Geofence) => {
    setModalInitialTab('whatsapp');
    setEditingDetails(geofence);
  }, []);

  const saveGeofence = useCallback(
    async (data: GeofenceFormData) => {
      // Invalidar cualquier verificación en segundo plano en curso: su resultado sería anterior
      // a este guardado y podría mostrar advertencias falsas ("sin confirmar en Traccar").
      syncGenerationRef.current++;
      const toastId = toast.loading(
        editingDetails ? 'Actualizando geocerca...' : 'Creando geocerca...',
      );

      try {
        const authHeader = getTraccarAuthHeader();
        const serverDevices = authHeader ? await getCachedOrFreshTraccarDevices(authHeader) : [];

        if (editingDetails) {
          const tipo = editingDetails.type;
          const areaWkt =
            tipo === 'circle' && editingDetails.center && editingDetails.radius != null
              ? formatCircleWkt(editingDetails.center, editingDetails.radius)
              : tipo === 'polygon' && editingDetails.path
              ? formatPolygonWkt(editingDetails.path)
              : '';
          const coordenadasJson = formatCoordenadasJson(
            tipo,
            editingDetails.center,
            editingDetails.radius,
            editingDetails.path,
          );

          // Determinar servidor Traccar para esta geocerca
          let targetServer = resolveAccountTraccarServer(
            effectiveUsername,
            serverDevices,
            effectiveBaseUrl,
          );
          const allReferencedPlates = [...(data.vehicleIds || []), ...(editingDetails.vehicleIds || [])];
          for (const plate of allReferencedPlates) {
            const dev = resolveTraccarDevice(serverDevices, plate, targetServer);
            if (dev) {
              targetServer = dev.serverUrl;
              break;
            }
          }

          // 1. Traccar Core: Actualizar geocerca en Traccar
          if (editingDetails.geofenceID && authHeader) {
            try {
              await updateTraccarGeofence(
                targetServer,
                editingDetails.geofenceID,
                data.name,
                areaWkt,
                data.description,
                authHeader,
              );
            } catch (traccarErr) {
              console.warn('Error al actualizar geocerca en Traccar:', traccarErr);
            }
          }

          // 2. Traccar Core: Sincronizar permisos de vehículos
          const allPrevVehicles = Array.from(
            new Set([
              ...(editingDetails.vehicleIds || []),
              ...(editingDetails.traccarOnlyVehicleIds || []),
            ]),
          );
          const newVehicles = data.vehicleIds || [];
          const toAdd = newVehicles.filter((v) => !allPrevVehicles.includes(v));
          const toRemove = allPrevVehicles.filter((v) => !newVehicles.includes(v));

          const successfulToAdd: string[] = [];
          const failedToAdd: { plate: string; reason: string }[] = [];
          const successfulToRemove: string[] = [];

          if (editingDetails.geofenceID && authHeader) {
            // Desvincular removidos en Traccar
            for (const vehiclePlate of toRemove) {
              const resolved = resolveTraccarDevice(serverDevices, vehiclePlate, targetServer);
              if (resolved) {
                try {
                  await unlinkDeviceFromGeofenceTraccar(
                    resolved.serverUrl,
                    resolved.deviceId,
                    editingDetails.geofenceID,
                    authHeader,
                  );
                  successfulToRemove.push(vehiclePlate);
                } catch (e: any) {
                  console.warn(`Error al desvincular ${vehiclePlate} en Traccar:`, e);
                }
              } else {
                // Si ya no existe en Traccar, permitimos limpiarlo de la base de datos interna
                successfulToRemove.push(vehiclePlate);
              }
            }

            // Vincular agregados en Traccar
            for (const vehiclePlate of toAdd) {
              const resolved = resolveTraccarDevice(serverDevices, vehiclePlate, targetServer);
              if (!resolved) {
                console.warn(`[Traccar] Vehículo "${vehiclePlate}" no hallado en ningún servidor Traccar`);
                failedToAdd.push({ plate: vehiclePlate, reason: 'No encontrado en Traccar' });
                continue;
              }

              try {
                await linkDeviceToGeofenceTraccar(
                  resolved.serverUrl,
                  resolved.deviceId,
                  editingDetails.geofenceID,
                  authHeader,
                );
                successfulToAdd.push(vehiclePlate);
                console.log(
                  `[Traccar] Vehículo ${vehiclePlate} vinculado a geocerca Traccar ${editingDetails.geofenceID} en ${resolved.serverUrl}`,
                );
              } catch (e: any) {
                console.warn(`Error al vincular ${vehiclePlate} en Traccar:`, e);
                failedToAdd.push({ plate: vehiclePlate, reason: e.message || 'Error en Traccar' });
              }
            }
          }

          // 3. Base de datos interna Velsat (:2083)
          if (editingDetails.numericId && effectiveBaseUrl) {
            await updateGeocercaApi(effectiveBaseUrl, editingDetails.numericId, {
              nombre: data.name,
              descripcion: data.description,
              tipo,
              areaWkt,
              coordenadasJson,
              color: data.color,
            });

            // PERSISTENCIA CONDICIONAL: Solo asignar los que tuvieron éxito en Traccar
            if (successfulToAdd.length > 0) {
              await assignVehiculosToGeocercaApi(effectiveBaseUrl, editingDetails.numericId, successfulToAdd);
            }
            for (const devId of successfulToRemove) {
              await removeVehiculoFromGeocercaApi(effectiveBaseUrl, editingDetails.numericId, devId);
            }
          }

          // Vehículos finales efectivos en memoria
          const finalVehicleIds = (editingDetails.vehicleIds || [])
            .filter((v) => !successfulToRemove.includes(v))
            .concat(successfulToAdd);

          const finalTraccarOnly = (editingDetails.traccarOnlyVehicleIds || [])
            .filter((v) => !successfulToRemove.includes(v) && !successfulToAdd.includes(v));

          const finalUnconfirmed = (editingDetails.unconfirmedVehicleIds || []).filter(
            (v) => finalVehicleIds.includes(v) && !successfulToAdd.includes(v),
          );

          setGeofences((prev) =>
            prev.map((geofence) =>
              geofence.id === editingDetails.id
                ? {
                    ...geofence,
                    ...data,
                    vehicleIds: finalVehicleIds,
                    traccarOnlyVehicleIds: finalTraccarOnly,
                    unconfirmedVehicleIds: finalUnconfirmed,
                  }
                : geofence,
            ),
          );

          if (failedToAdd.length > 0 && successfulToAdd.length > 0) {
            const failedMsg = failedToAdd.map((f) => `${f.plate} (${f.reason})`).join(', ');
            toast.warning(
              `Geocerca actualizada. Se vincularon ${successfulToAdd.length} vehículo(s), pero fallaron ${failedToAdd.length}: ${failedMsg}`,
              { id: toastId, duration: 8000 },
            );
          } else if (failedToAdd.length > 0 && successfulToAdd.length === 0) {
            const failedMsg = failedToAdd.map((f) => `${f.plate} (${f.reason})`).join(', ');
            toast.error(
              `Geocerca actualizada, pero no se pudo vincular los vehículos en Traccar: ${failedMsg}`,
              { id: toastId, duration: 8000 },
            );
          } else {
            toast.success('Geocerca actualizada exitosamente', { id: toastId });
          }

          clearDeviceGeofencesCache();
          closeModal();
          fetchGeocercas();
        } else if (pendingShape) {
          const tipo = pendingShape.type;
          const areaWkt =
            tipo === 'circle' && pendingShape.center && pendingShape.radius != null
              ? formatCircleWkt(pendingShape.center, pendingShape.radius)
              : tipo === 'polygon' && pendingShape.path
              ? formatPolygonWkt(pendingShape.path)
              : '';
          const coordenadasJson = formatCoordenadasJson(
            tipo,
            pendingShape.center,
            pendingShape.radius,
            pendingShape.path,
          );

          // Determinar servidor Traccar objetivo
          let targetServer = resolveAccountTraccarServer(
            effectiveUsername,
            serverDevices,
            effectiveBaseUrl,
          );
          if (data.vehicleIds && data.vehicleIds.length > 0) {
            for (const plate of data.vehicleIds) {
              const dev = resolveTraccarDevice(serverDevices, plate, targetServer);
              if (dev) {
                targetServer = dev.serverUrl;
                break;
              }
            }
          }

          let traccarGeofenceId: number | undefined;

          // 1. Traccar Core: Crear geocerca en Traccar
          if (authHeader) {
            try {
              const traccarGeo = await createTraccarGeofence(
                targetServer,
                data.name,
                areaWkt,
                data.description,
                authHeader,
              );
              traccarGeofenceId = traccarGeo.id;
              console.log(`[Traccar] Geocerca creada en ${targetServer} con ID:`, traccarGeofenceId);
            } catch (traccarErr: any) {
              console.warn('No se pudo crear en Traccar:', traccarErr);
              const msg = traccarErr.response?.data?.message || traccarErr.message || 'Error en Traccar';
              toast.error(`Aviso Traccar: ${msg}`);
            }
          }

          // Usar el ID devuelto por Traccar; si no hubo conexión, usar identificador único de respaldo
          const generatedGeofenceId = traccarGeofenceId || Math.floor(Date.now() / 1000);

          // 2. Traccar Core: Vincular vehículos a la geocerca en Traccar
          const successfulPlates: string[] = [];
          const failedPlates: { plate: string; reason: string }[] = [];

          if (traccarGeofenceId && data.vehicleIds && data.vehicleIds.length > 0 && authHeader) {
            for (const vehiclePlate of data.vehicleIds) {
              const resolved = resolveTraccarDevice(serverDevices, vehiclePlate, targetServer);
              if (!resolved) {
                console.warn(`[Traccar] Dispositivo "${vehiclePlate}" no hallado en Traccar /api/devices`);
                failedPlates.push({ plate: vehiclePlate, reason: 'No encontrado en Traccar' });
                continue;
              }

              try {
                await linkDeviceToGeofenceTraccar(
                  resolved.serverUrl,
                  resolved.deviceId,
                  traccarGeofenceId,
                  authHeader,
                );
                successfulPlates.push(vehiclePlate);
                console.log(
                  `[Traccar] Vehículo ${vehiclePlate} (${resolved.deviceId}) vinculado a geocerca Traccar ${traccarGeofenceId} en ${resolved.serverUrl}`,
                );
              } catch (linkErr: any) {
                console.warn(`Error al vincular vehículo ${vehiclePlate} en Traccar:`, linkErr);
                failedPlates.push({
                  plate: vehiclePlate,
                  reason: linkErr.message || 'Fallo de vinculación',
                });
              }
            }
          }

          // 3. Base de Datos Interna Velsat (:2083)
          let createdNumericId: number | undefined;
          if (effectiveBaseUrl) {
            const result = await createGeocercaApi(effectiveBaseUrl, {
              accountID: effectiveUsername,
              geofenceID: generatedGeofenceId,
              nombre: data.name,
              descripcion: data.description,
              tipo,
              areaWkt,
              coordenadasJson,
              color: data.color,
            });

            createdNumericId = result.id;

            // PERSISTENCIA CONDICIONAL EN BD INTERNA: Solo los vehículos que tuvieron éxito en Traccar
            if (createdNumericId && successfulPlates.length > 0) {
              await assignVehiculosToGeocercaApi(effectiveBaseUrl, createdNumericId, successfulPlates);
            }
          }

          const localId = createdNumericId ? `gf-${createdNumericId}` : `gf-${Date.now()}`;
          const geofence: Geofence = {
            id: localId,
            numericId: createdNumericId,
            geofenceID: generatedGeofenceId,
            ...data,
            vehicleIds: successfulPlates,
            active: true,
            type: pendingShape.type,
            center: pendingShape.center,
            radius: pendingShape.radius,
            path: pendingShape.path,
            createdAt: Date.now(),
          };

          setGeofences((prev) => [...prev, geofence]);
          setSelectedId(geofence.id);

          if (failedPlates.length > 0 && successfulPlates.length > 0) {
            const failedSummary = failedPlates.map((f) => `${f.plate} (${f.reason})`).join(', ');
            toast.warning(
              `Geocerca creada. Se vincularon ${successfulPlates.length} vehículo(s), pero fallaron ${failedPlates.length}: ${failedSummary}`,
              { id: toastId, duration: 8000 },
            );
          } else if (
            failedPlates.length > 0 &&
            successfulPlates.length === 0 &&
            data.vehicleIds &&
            data.vehicleIds.length > 0
          ) {
            const failedSummary = failedPlates.map((f) => `${f.plate} (${f.reason})`).join(', ');
            toast.error(
              `Geocerca creada, pero ningún vehículo pudo vincularse en Traccar: ${failedSummary}`,
              { id: toastId, duration: 8000 },
            );
          } else {
            toast.success('Geocerca creada y sincronizada exitosamente con Traccar', { id: toastId });
          }

          clearDeviceGeofencesCache();
          closeModal();
          fetchGeocercas();
        }
      } catch (error: any) {
        console.error('Error al guardar geocerca:', error);
        const serverMsg =
          error?.response?.data?.error ||
          error?.response?.data?.message ||
          error.message ||
          'Error al guardar la geocerca';
        toast.error(serverMsg, { id: toastId });
      }
    },
    [
      editingDetails,
      pendingShape,
      effectiveBaseUrl,
      effectiveUsername,
      closeModal,
      fetchGeocercas,
      getCachedOrFreshTraccarDevices,
    ],
  );

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    const numericId = pendingDelete.numericId;
    const traccarId = pendingDelete.geofenceID;

    const toastId = toast.loading('Eliminando geocerca...');

    try {
      // 1. Traccar Core: Eliminar de Traccar si tiene geofenceID
      const authHeader = getTraccarAuthHeader();
      if (traccarId && authHeader) {
        try {
          const serverDevices = await getCachedOrFreshTraccarDevices(authHeader);
          const targetServer = resolveAccountTraccarServer(
            effectiveUsername,
            serverDevices,
            effectiveBaseUrl,
          );
          await deleteTraccarGeofence(targetServer, traccarId, authHeader);
          clearDeviceGeofencesCache();
        } catch (traccarErr) {
          console.warn('Error al eliminar geocerca en Traccar:', traccarErr);
        }
      }

      // 2. Base de datos interna Velsat (:2083)
      if (numericId && effectiveBaseUrl) {
        await deleteGeocercaApi(effectiveBaseUrl, numericId);
      }

      const entry = shapesRef.current[id];
      if (entry) {
        entry.overlay.setMap(null);
        entry.labelMarker?.setMap(null);
        delete shapesRef.current[id];
      }

      setGeofences((prev) => prev.filter((geofence) => geofence.id !== id));
      setSelectedId((prev) => (prev === id ? null : prev));
      if (editingShapeId === id) setEditingShapeId(null);
      setPendingDelete(null);

      toast.success('Geocerca eliminada exitosamente', { id: toastId });
    } catch (error: any) {
      console.error('Error al eliminar geocerca:', error);
      toast.error(error?.response?.data?.message || 'Error al eliminar la geocerca', { id: toastId });
    }
  }, [
    pendingDelete,
    editingShapeId,
    effectiveBaseUrl,
    effectiveUsername,
    getCachedOrFreshTraccarDevices,
  ]);

  const handleSyncVehiclesToTraccar = useCallback(
    async (geofence: Geofence) => {
      if (!geofence.geofenceID || !geofence.unconfirmedVehicleIds || geofence.unconfirmedVehicleIds.length === 0) {
        return;
      }

      const count = geofence.unconfirmedVehicleIds.length;
      const toastId = toast.loading(`Sincronizando ${count} vehículo(s) con Traccar...`);

      try {
        const authHeader = getTraccarAuthHeader();
        if (!authHeader) {
          toast.error('No se configuraron credenciales de Traccar', { id: toastId });
          return;
        }

        const serverDevices = await getCachedOrFreshTraccarDevices(authHeader, true);
        const targetServer = resolveAccountTraccarServer(
          effectiveUsername,
          serverDevices,
          effectiveBaseUrl,
        );

        let successCount = 0;
        const failed: string[] = [];

        for (const plate of geofence.unconfirmedVehicleIds) {
          const resolved = resolveTraccarDevice(serverDevices, plate, targetServer);
          if (!resolved) {
            failed.push(`${plate} (No encontrado en Traccar)`);
            continue;
          }

          try {
            await linkDeviceToGeofenceTraccar(
              resolved.serverUrl,
              resolved.deviceId,
              geofence.geofenceID,
              authHeader,
            );
            successCount++;
          } catch (e: any) {
            failed.push(`${plate} (${e.message || 'Error'})`);
          }
        }

        if (successCount > 0) {
          clearDeviceGeofencesCache();
          toast.success(`Se sincronizaron ${successCount} de ${count} vehículo(s) en Traccar exitosamente`, {
            id: toastId,
            duration: 6000,
          });
          await fetchGeocercas();
        } else {
          toast.error(`No se pudo sincronizar en Traccar: ${failed.join(', ')}`, {
            id: toastId,
            duration: 8000,
          });
        }
      } catch (err: any) {
        console.error('Error al sincronizar vehículos con Traccar:', err);
        toast.error('Error inesperado al sincronizar con Traccar', { id: toastId });
      }
    },
    [effectiveUsername, effectiveBaseUrl, getCachedOrFreshTraccarDevices, fetchGeocercas],
  );

  const handleImportTraccarVehicles = useCallback(
    async (geofence: Geofence) => {
      if (!geofence.numericId || !geofence.traccarOnlyVehicleIds || geofence.traccarOnlyVehicleIds.length === 0) {
        return;
      }

      const count = geofence.traccarOnlyVehicleIds.length;
      const toastId = toast.loading(`Importando ${count} vehículo(s) desde Traccar a la base de datos...`);

      try {
        // Directamente a la BD interna. NO llamar a Traccar permissions porque ya están vinculados en Traccar.
        await assignVehiculosToGeocercaApi(effectiveBaseUrl, geofence.numericId, geofence.traccarOnlyVehicleIds);

        clearDeviceGeofencesCache();
        toast.success(`Se importaron ${count} vehículo(s) a la BD interna exitosamente`, {
          id: toastId,
          duration: 6000,
        });

        await fetchGeocercas();
      } catch (err: any) {
        console.error('Error al importar vehículos desde Traccar:', err);
        const msg = err?.response?.data?.message || err?.message || 'Error al importar';
        toast.error(`Error al importar: ${msg}`, { id: toastId });
      }
    },
    [effectiveBaseUrl, fetchGeocercas],
  );

  const centerOnGeofence = useCallback((geofence: Geofence) => {
    const map = mapRef.current;
    setSelectedId(geofence.id);
    if (!map) return;

    if (geofence.type === 'circle') {
      const circle = shapesRef.current[geofence.id]?.overlay as google.maps.Circle | undefined;
      const bounds = circle?.getBounds();
      if (bounds) {
        map.fitBounds(bounds, 80);
        return;
      }
      const center = geofenceCenter(geofence);
      if (center) {
        map.panTo(center);
        map.setZoom(15);
      }
      return;
    }

    if (geofence.path?.length) {
      const bounds = new google.maps.LatLngBounds();
      geofence.path.forEach((point) => bounds.extend(point));
      map.fitBounds(bounds, 80);
    }
  }, []);

  const fitAllGeofences = useCallback(
    (customList?: Geofence[]) => {
      const map = mapRef.current;
      const list =
        Array.isArray(customList) && customList.length > 0
          ? customList
          : geofencesRef.current.length > 0
            ? geofencesRef.current
            : geofences;
      if (!map || !list.length) return;

      // Asegurar dimensiones actualizadas del mapa
      google.maps.event.trigger(map, 'resize');

      const bounds = new google.maps.LatLngBounds();
      list.forEach((geofence) => {
        if (geofence.type === 'circle') {
          const circle = shapesRef.current[geofence.id]?.overlay as google.maps.Circle | undefined;
          const circleBounds = circle?.getBounds();
          if (circleBounds) {
            bounds.union(circleBounds);
          } else if (geofence.center) {
            if (geofence.radius != null) {
              const latOffset = geofence.radius / 111320;
              const lngOffset = geofence.radius / (111320 * Math.cos((geofence.center.lat * Math.PI) / 180));
              bounds.extend({ lat: geofence.center.lat + latOffset, lng: geofence.center.lng + lngOffset });
              bounds.extend({ lat: geofence.center.lat - latOffset, lng: geofence.center.lng - lngOffset });
            } else {
              bounds.extend(geofence.center);
            }
          }
        } else {
          geofence.path?.forEach((point) => bounds.extend(point));
        }
      });

      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, 90);
        google.maps.event.addListenerOnce(map, 'idle', () => {
          if ((map.getZoom() || 13) > 16) {
            map.setZoom(16);
          }
        });
      }
    },
    [geofences],
  );

  const fitAllGeofencesRef = useRef(fitAllGeofences);
  fitAllGeofencesRef.current = fitAllGeofences;

  // Auto-ajustar automáticamente la vista para encuadrar todas las geocercas al entrar a la página (idéntico a la segunda imagen)
  useEffect(() => {
    if (!mapReady || !geofences.length) return;
    if (initialFitDoneRef.current) return;

    // Primer ajuste rápido en cuanto los datos y el mapa estén listos
    const timer1 = setTimeout(() => {
      fitAllGeofencesRef.current();
    }, 150);

    // Segundo ajuste para asegurar el encuadre exacto cuando el splash termine su animación
    const timer2 = setTimeout(() => {
      fitAllGeofencesRef.current();
      initialFitDoneRef.current = true;
    }, 550);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [mapReady, geofences.length]);

  const zoomBy = useCallback((delta: number) => {
    const map = mapRef.current;
    if (!map) return;
    map.setZoom(Math.max(3, Math.min(21, (map.getZoom() || 13) + delta)));
  }, []);

  const changeMapType = useCallback((type: 'roadmap' | 'hybrid') => {
    mapRef.current?.setMapTypeId(type);
    setMapType(type);
  }, []);

  // Esc cancela; Enter finaliza el dibujo del polígono o guarda el ajuste de forma
  useEffect(() => {
    if (!drawMode && !editingShapeId) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (drawMode) cancelDrawing();
        else cancelShapeEdit();
      } else if (event.key === 'Enter') {
        if (drawMode === 'polygon') {
          event.preventDefault();
          finishPolygonRef.current();
        } else if (drawMode === 'circle') {
          event.preventDefault();
          finishCircleRef.current();
        } else if (editingShapeId) {
          event.preventDefault();
          saveShapeEdit();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawMode, editingShapeId, cancelDrawing, cancelShapeEdit, saveShapeEdit]);

  /* ------------------------------------------------------------------ */
  /* Derivados de UI                                                     */
  /* ------------------------------------------------------------------ */
  const filteredGeofences = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = geofences;

    if (statusFilter === 'asignadas') {
      list = list.filter((g) => g.vehicleIds.length > 0);
    }

    if (term) {
      list = list.filter((g) => g.name.toLowerCase().includes(term));
    }

    return [...list].sort((a, b) => b.createdAt - a.createdAt);
  }, [geofences, search, statusFilter]);

  const assignedCount = useMemo(
    () => geofences.filter((geofence) => geofence.vehicleIds.length > 0).length,
    [geofences],
  );

  const modalOpen = Boolean(pendingShape || editingDetails);

  const modalInitial = useMemo<GeofenceFormData>(
    () =>
      editingDetails
        ? {
            name: editingDetails.name,
            description: editingDetails.description || '',
            color: editingDetails.color,
            vehicleIds: Array.from(
              new Set([
                ...(editingDetails.vehicleIds || []),
                ...(editingDetails.traccarOnlyVehicleIds || []),
              ]),
            ),
            active: editingDetails.active,
          }
        : {
            name: '',
            description: '',
            color: GEOFENCE_COLORS[geofences.length % GEOFENCE_COLORS.length],
            vehicleIds: [],
            active: true,
          },
    [editingDetails, geofences.length],
  );

  const modalShapeSummary = useMemo(() => {
    if (editingDetails) return describeShape(editingDetails);
    if (!pendingShape) return '';
    return pendingShape.type === 'circle'
      ? `Círculo · ${formatDistance(pendingShape.radius || 0)} de radio`
      : `Polígono · ${pendingShape.path?.length || 0} vértices`;
  }, [editingDetails, pendingShape]);

  const editingGeofence = editingShapeId
    ? geofences.find((geofence) => geofence.id === editingShapeId)
    : null;

  return (
    <div className="relative flex h-screen w-full flex-row overflow-hidden bg-slate-100">
      <Toaster richColors position="bottom-right" />
      <TrackvelLoader spinner="ring" />

      {/* Sidebar de Geocercas */}
      <aside
        className={`relative z-20 flex h-full shrink-0 flex-col border-r border-gray-200 bg-white shadow-xl transition-all duration-300 ${
          sidebarOpen ? 'w-[315px] lg:w-[330px]' : 'w-0 -translate-x-full overflow-hidden'
        }`}
      >
        {/* Cabecera del Sidebar estilo gestionconductores */}
        <div className="flex h-12 shrink-0 items-stretch justify-between bg-[#113EB9]">
          <div className="flex h-full items-stretch gap-2.5 min-w-0">
            <div className="flex h-full items-center bg-gradient-to-r from-orange-500 to-red-500 px-3.5">
              <Image
                src="/LogoWeb.png"
                alt="Velsat"
                width={36}
                height={36}
                className="h-8 w-8 object-contain"
              />
            </div>
            <div className="h-6 w-[2px] rounded-full bg-white/40 self-center" />
            <div className="flex flex-col justify-center min-w-0 pr-1 py-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-blue-200 leading-none mb-0.5">
                SERVICIOS / GEOCERCAS
              </span>
              <h1 className="text-[13px] font-bold leading-none tracking-[0.01em] text-white uppercase truncate">
                GESTIÓN DE GEOCERCAS
              </h1>
            </div>
          </div>

          <div className="flex items-center pr-2">
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              title="Ocultar panel"
              className="flex h-7 w-7 items-center justify-center rounded text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            >
              <ChevronLeft size={19} />
            </button>
          </div>
        </div>

        {/* Controles de Búsqueda, Acción y Filtros Rápidos */}
        <div
          className="shrink-0 bg-white"
          style={{ fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif" }}
        >
          <div className="flex items-center gap-2 px-3 pt-3">
          {/* Buscador */}
          <div className="relative min-w-0 flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar geocerca"
              className="h-9 w-full rounded-[6px] border border-slate-300 bg-white pl-9 pr-7 text-[13px] text-slate-800 placeholder-slate-400 outline-none transition focus:border-[#113EB9] focus:ring-1 focus:ring-[#113EB9]/20"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                title="Limpiar búsqueda"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Botón Nueva Geocerca */}
          <div className="relative shrink-0">
            <button
              type="button"
              disabled={!mapReady}
              onClick={() => setShapeMenuOpen((open) => !open)}
              title="Nueva geocerca"
              className="flex h-9 items-center justify-center gap-1.5 rounded-[6px] bg-[#FB7B0F] px-3.5 text-[13px] font-semibold text-white transition hover:bg-[#e56d09] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={16} strokeWidth={2.5} /> Nueva
            </button>

            {shapeMenuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShapeMenuOpen(false)} />
                <div className="absolute right-0 top-[calc(100%+4px)] z-40 w-44 overflow-hidden rounded-[6px] border border-gray-200 bg-white shadow-lg">
                  <button
                    type="button"
                    onClick={() => startDrawing('circle')}
                    className="flex w-full items-center gap-2 px-3 py-2 text-[11.5px] font-medium text-gray-700 transition hover:bg-blue-50 hover:text-[#113EB9]"
                  >
                    <CircleIcon size={14} /> Círculo radial
                  </button>
                  <button
                    type="button"
                    onClick={() => startDrawing('polygon')}
                    className="flex w-full items-center gap-2 border-t border-gray-100 px-3 py-2 text-[11.5px] font-medium text-gray-700 transition hover:bg-blue-50 hover:text-[#113EB9]"
                  >
                    <Hexagon size={14} /> Polígono libre
                  </button>
                </div>
              </>
            )}
          </div>
          </div>

          {/* Filtros rápidos */}
          <div className="mt-2 flex gap-5 border-b border-slate-200 px-3">
            {(
              [
                { key: 'todos', label: 'Todas', count: geofences.length },
                { key: 'asignadas', label: 'Asignadas', count: assignedCount },
              ] as const
            ).map((tab) => {
              const active = statusFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  className={`relative flex items-center gap-1.5 pb-2 pt-1.5 text-[12.5px] transition-colors ${
                    active
                      ? 'font-bold text-[#113EB9]'
                      : 'font-semibold text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab.label}
                  <span
                    className={`font-medium tabular-nums ${active ? 'text-[#113EB9]/70' : 'text-slate-400'}`}
                  >
                    {tab.count}
                  </span>
                  {active && (
                    <span className="absolute inset-x-0 -bottom-px h-[2px] rounded-t bg-[#113EB9]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Lista con scroll de Geocercas */}
        <div
          className="geocercas-scroll flex-1 space-y-[3px] overflow-y-auto bg-white pb-2 pr-1.5 pt-1.5"
          style={{ fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif" }}
        >
          {filteredGeofences.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MapPin size={24} className="mb-2 text-gray-300" />
              <p className="text-[12px] font-semibold text-gray-600">
                {geofences.length ? 'Sin resultados' : 'Aún no hay geocercas'}
              </p>
              <p className="mt-0.5 text-[10.5px] text-gray-400">
                {geofences.length
                  ? 'Prueba con otro filtro o término'
                  : 'Crea una con el botón “Nueva geocerca”'}
              </p>
            </div>
          ) : (
            filteredGeofences.map((geofence) => (
              <GeofenceCard
                key={geofence.id}
                geofence={geofence}
                vehicles={vehicles}
                selected={selectedId === geofence.id}
                editingShape={editingShapeId === geofence.id}
                onSelect={setSelectedId}
                onCenter={centerOnGeofence}
                onEditDetails={handleEditDetails}
                onConfigureWhatsApp={handleConfigureWhatsApp}
                onEditShape={startEditShape}
                onSaveShape={saveShapeEdit}
                onCancelShape={cancelShapeEdit}
                onDelete={setPendingDelete}
                onSyncVehiclesToTraccar={handleSyncVehiclesToTraccar}
                onImportTraccarVehicles={handleImportTraccarVehicles}
              />
            ))
          )}
        </div>
      </aside>

      {/* Contenedor del Mapa */}
      <div className="relative h-full min-w-0 flex-1">
        <div ref={mapDivRef} className="absolute inset-0 w-full h-full" style={{ width: '100%', height: '100%' }} />

        {/* Coordenadas en tiempo real junto al cursor del mouse al dibujar */}
        {drawMode && cursorCoord && (
          <div
            style={{
              position: 'absolute',
              left: `${cursorCoord.x + 14}px`,
              top: `${cursorCoord.y + 16}px`,
              pointerEvents: 'none',
              zIndex: 25,
              fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            }}
            className="rounded-xl bg-white px-3 py-1.5 shadow-xl border border-slate-200/90 select-none -translate-y-1/2 animate-fadeIn"
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 w-6">LAT</span>
              <span className="text-[11.5px] font-bold text-slate-800 tabular-nums">{cursorCoord.lat.toFixed(5)}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-bold text-slate-400 w-6">LNG</span>
              <span className="text-[11.5px] font-bold text-slate-800 tabular-nums">{cursorCoord.lng.toFixed(5)}</span>
            </div>
          </div>
        )}

        {/* Barra flotante sobre el mapa (Acceso a Sidebar, Reportes, Alertas y Traccar) */}
        <div className="absolute left-4 top-4 z-20 flex items-center gap-2">
          {!sidebarOpen && (
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              title="Abrir panel de geocercas"
              className="flex h-[40px] items-stretch overflow-hidden rounded-[10px] shadow-md transition-all hover:opacity-95 hover:shadow-lg"
              style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
            >
              {/* Bloque naranja: 42px de ancho, degradado de #f97316 a #ef4444, icono de 18px */}
              <div
                className="flex w-[42px] shrink-0 items-center justify-center"
                style={{ background: 'linear-gradient(to right, #f97316, #ef4444)' }}
              >
                <Image
                  src="/LogoWeb.png"
                  alt="Velsat"
                  width={18}
                  height={18}
                  className="h-[18px] w-[18px] object-contain"
                />
              </div>

              {/* Línea divisoria: 2px × 20px, blanco al 45% */}
              <div
                className="self-center shrink-0"
                style={{
                  width: '2px',
                  height: '20px',
                  backgroundColor: 'rgba(255, 255, 255, 0.45)',
                }}
              />

              {/* Bloque azul: degradado de #1447c0 a #1a3fae, separación de 8px entre elementos, relleno lateral de 10px */}
              <div
                className="flex items-center h-full text-white"
                style={{
                  background: 'linear-gradient(to right, #1447c0, #1a3fae)',
                  paddingLeft: '10px',
                  paddingRight: '10px',
                  gap: '8px',
                }}
              >
                {/* "GEOCERCAS": 12.5px, bold (700), en mayúsculas, espaciado de letras 0.02em, color #fff */}
                <span
                  style={{
                    fontSize: '12.5px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.02em',
                    color: '#ffffff',
                    lineHeight: 1,
                  }}
                >
                  GEOCERCAS
                </span>

                {/* Contador "1": 11px, bold (700), cápsula de 18px de alto y 20px de ancho mínimo, fondo blanco al 20% */}
                <span
                  style={{
                    height: '18px',
                    minWidth: '20px',
                    paddingLeft: '4px',
                    paddingRight: '4px',
                    borderRadius: '9999px',
                    backgroundColor: 'rgba(255, 255, 255, 0.20)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxSizing: 'border-box',
                  }}
                >
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#ffffff',
                      lineHeight: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontVariantNumeric: 'tabular-nums',
                      transform: 'translateY(-0.5px)',
                    }}
                  >
                    {geofences.length}
                  </span>
                </span>

                {/* Flecha: 15px, grosor de trazo 2.4 */}
                <ChevronRight size={15} strokeWidth={2.4} color="#ffffff" className="shrink-0" />
              </div>
            </button>
          )}

          {/* Contenedor Compacto de Herramientas: Alto 40px, esquinas 10px */}
          <div
            className="flex h-[40px] items-center rounded-[10px] border border-slate-200/80 bg-white p-1 shadow-md gap-1"
            style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
          >
            <button
              type="button"
              onClick={() => {
                setReportsModalOpen((prev) => !prev);
                if (!reportsModalOpen) setAlertsDrawerOpen(false);
              }}
              title="Reportes de geocercas"
              className={`flex h-full items-center gap-1.5 rounded-lg px-2.5 text-[11.5px] font-semibold transition-all ${
                reportsModalOpen
                  ? 'bg-[#113EB9] text-white shadow-2xs font-bold'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <BarChart2 size={13} className={reportsModalOpen ? 'text-white' : 'text-slate-600'} />
              <span>Reportes</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const nextOpen = !alertsDrawerOpen;
                setAlertsDrawerOpen(nextOpen);
                if (nextOpen) {
                  setReportsModalOpen(false);
                  markSignalRAsRead();
                  if (signalRAlerts.length === 0) {
                    refreshSignalRAlerts();
                  }
                }
              }}
              title={`Alertas en tiempo real (SignalR: ${signalRStatus})`}
              className={`flex h-full items-center gap-1.5 rounded-lg px-2.5 text-[11.5px] transition-all ${
                alertsDrawerOpen || signalRUnreadCount > 0
                  ? 'bg-[#113EB9] text-white shadow-2xs font-bold'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-semibold'
              }`}
            >
              <Bell size={13} className={alertsDrawerOpen || signalRUnreadCount > 0 ? 'text-white' : 'text-slate-600'} />
              <span>Alertas</span>
              {signalRUnreadCount > 0 && (
                <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white leading-none shadow-xs">
                  {signalRUnreadCount}
                </span>
              )}
            </button>

            {/* Botón Traccar ocultado temporalmente por solicitud del usuario */}
            {/*
            <button
              type="button"
              onClick={testTraccarConnection}
              disabled={testingTraccar}
              title="Probar conexión con servidores Traccar"
              className="flex h-full items-center gap-1.5 rounded-lg px-2.5 text-[11.5px] font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all disabled:opacity-50"
            >
              <Radio size={13} className={testingTraccar ? 'animate-spin text-[#FB7B0F]' : 'text-slate-600'} />
              <span>Traccar</span>
            </button>
            */}
          </div>
        </div>

        {!mapReady && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100">
            <div className="flex flex-col items-center gap-2">
              <MapPin size={26} className="animate-pulse text-[#113EB9]" />
              <p className="text-[12px] font-medium text-slate-500">Cargando mapa…</p>
            </div>
          </div>
        )}

        {/* Controles del mapa */}
        {mapReady && (
          <div className="absolute right-4 top-4 z-20 flex flex-col items-end gap-2">
            <div className="flex overflow-hidden rounded-lg border border-gray-200/80 bg-white/95 p-0.5 shadow-md backdrop-blur-md">
              <button
                type="button"
                onClick={() => changeMapType('roadmap')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11.5px] font-semibold transition ${
                  mapType === 'roadmap'
                    ? 'bg-[#113EB9] text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <MapIcon size={13} /> Mapa
              </button>
              <button
                type="button"
                onClick={() => changeMapType('hybrid')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11.5px] font-semibold transition ${
                  mapType === 'hybrid'
                    ? 'bg-[#113EB9] text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Layers size={13} /> Satélite
              </button>
            </div>

            <div className="flex flex-col rounded-lg border border-gray-200/80 bg-white/95 p-1 shadow-md backdrop-blur-md">
              <button
                type="button"
                onClick={() => zoomBy(1)}
                title="Acercar"
                className="flex items-center justify-center rounded-md p-2 text-gray-700 transition hover:bg-blue-50 hover:text-[#113EB9]"
              >
                <Plus size={17} />
              </button>
              <button
                type="button"
                onClick={() => zoomBy(-1)}
                title="Alejar"
                className="flex items-center justify-center rounded-md p-2 text-gray-700 transition hover:bg-blue-50 hover:text-[#113EB9]"
              >
                <Minus size={17} />
              </button>
              <button
                type="button"
                onClick={() => fitAllGeofences()}
                title="Ver todas las geocercas"
                className="mt-0.5 flex items-center justify-center rounded-md border-t border-gray-100 p-2 text-gray-700 transition hover:bg-blue-50 hover:text-[#113EB9]"
              >
                <Crosshair size={17} />
              </button>
            </div>
          </div>
        )}

        {/* Tarjeta de dibujo en la parte inferior derecha (Estilo moderno idéntico a la referencia) */}
        {drawMode && (
          <div
            style={{ fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
            className="absolute bottom-6 right-6 z-30 w-[360px] sm:w-[380px] rounded-2xl bg-white shadow-2xl border border-slate-200/80 overflow-hidden select-none animate-fadeIn"
          >
            {/* Cabecera azul (#1447C0) */}
            <div className="bg-[#1447C0] px-4 py-3.5 flex items-center justify-between gap-3 text-white">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-[38px] h-[38px] rounded-xl bg-gradient-to-br from-[#FB7B0F] to-[#E26500] flex items-center justify-center shrink-0 shadow-sm">
                  {drawMode === 'circle' ? (
                    <svg
                      width="19"
                      height="19"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-white"
                    >
                      <circle cx="12" cy="12" r="8" />
                      <circle cx="12" cy="12" r="2" fill="currentColor" />
                    </svg>
                  ) : (
                    <svg
                      width="19"
                      height="19"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-white"
                    >
                      <polygon points="12 2 22 8.5 18 20 6 20 2 8.5" />
                      <circle cx="12" cy="2" r="1.5" fill="currentColor" />
                      <circle cx="22" cy="8.5" r="1.5" fill="currentColor" />
                      <circle cx="18" cy="20" r="1.5" fill="currentColor" />
                      <circle cx="6" cy="20" r="1.5" fill="currentColor" />
                      <circle cx="2" cy="8.5" r="1.5" fill="currentColor" />
                    </svg>
                  )}
                </div>

                <div className="min-w-0">
                  <h4 className="text-[14.5px] font-bold text-white leading-tight">
                    {drawMode === 'circle' ? 'Nueva geocerca' : 'Nueva geocerca'}
                  </h4>
                  <p className="text-[11.5px] text-blue-100/90 leading-tight mt-0.5 truncate">
                    {drawMode === 'circle'
                      ? !circleCenter
                        ? 'Haz clic en el mapa para marcar el centro'
                        : circleRadius >= MIN_RADIUS_M
                        ? 'Listo para guardar'
                        : 'Haz clic en el mapa para fijar el radio'
                      : drawInfo.points < 3
                      ? 'Haz clic en el mapa para agregar vértices'
                      : 'Pulsa Enter o Finalizar para cerrar'}
                  </p>
                </div>
              </div>

              {/* Badge naranja en cabecera */}
              <div className="px-3 py-1 rounded-full bg-[#FB7B0F] text-white text-[12px] font-bold shrink-0 tabular-nums shadow-xs flex items-center justify-center">
                {drawMode === 'circle'
                  ? circleRadius >= MIN_RADIUS_M
                    ? circleRadius >= 1000
                      ? `${(circleRadius / 1000).toFixed(2)} km`
                      : `${Math.round(circleRadius)} m`
                    : circleRadius > 0
                    ? `${Math.round(circleRadius)} m`
                    : 'Sin radio'
                  : `${drawInfo.points} ${drawInfo.points === 1 ? 'vértice' : 'vértices'}`}
              </div>
            </div>

            {/* Cuerpo de la tarjeta */}
            <div className="p-3.5 bg-white flex flex-col">
              {/* Selector de tipo (Polígono / Círculo) */}
              <div className="grid grid-cols-2 p-1 bg-slate-100/90 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setDrawMode('polygon')}
                  className={`py-1.5 flex items-center justify-center gap-1.5 rounded-lg text-[12px] font-bold transition cursor-pointer ${
                    drawMode === 'polygon'
                      ? 'bg-white text-[#1447C0] shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="12 2 22 8.5 18 20 6 20 2 8.5" />
                  </svg>
                  <span>Polígono</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDrawMode('circle')}
                  className={`py-1.5 flex items-center justify-center gap-1.5 rounded-lg text-[12px] font-bold transition cursor-pointer ${
                    drawMode === 'circle'
                      ? 'bg-white text-[#1447C0] shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="8" />
                    <circle cx="12" cy="12" r="2" fill="currentColor" />
                  </svg>
                  <span>Círculo</span>
                </button>
              </div>

              {drawMode === 'circle' ? (
                /* Vista de Círculo: Radio, Área y Perímetro */
                circleStats ? (
                  <div className="rounded-lg border border-slate-200/90 bg-slate-50/70 px-3 py-2 mt-3 mb-2.5 space-y-1 text-[12px] animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Radio</span>
                      <span className="font-semibold text-slate-800 tabular-nums">{circleStats.radioText}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Área</span>
                      <span className="font-semibold text-slate-800 tabular-nums">{circleStats.areaText}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Perímetro</span>
                      <span className="font-semibold text-slate-800 tabular-nums">{circleStats.perimeterText}</span>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200/90 p-3 bg-white mt-3 mb-2.5 space-y-1.5 shadow-2xs">
                    <p className="text-[12px] font-semibold text-slate-700">
                      {!circleCenter
                        ? '1. Haz clic en el mapa para fijar el centro'
                        : '2. Mueve el mouse y haz clic para fijar el radio'}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Podrás arrastrar el asa del borde para ajustar el tamaño o mover el centro.
                    </p>
                  </div>
                )
              ) : (
                /* Vista de Polígono: Barra de progreso y Tabla de vértices */
                <>
                  {/* Barra de progreso segmentada */}
                  <div className="grid grid-cols-3 gap-1.5 mt-3 mb-2.5">
                    <div
                      className={`h-[3px] rounded-full transition-all duration-300 ${
                        drawInfo.points >= 1 ? 'bg-[#FB7B0F]' : 'bg-slate-200'
                      }`}
                    />
                    <div
                      className={`h-[3px] rounded-full transition-all duration-300 ${
                        drawInfo.points >= 2 ? 'bg-[#FB7B0F]' : 'bg-slate-200'
                      }`}
                    />
                    <div
                      className={`h-[3px] rounded-full transition-all duration-300 ${
                        drawInfo.points >= 3 ? 'bg-[#FB7B0F]' : 'bg-slate-200'
                      }`}
                    />
                  </div>

                  {/* Tabla de coordenadas de vértices */}
                  <div className="rounded-lg border border-slate-200/90 overflow-hidden mb-2.5">
                    <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-500 px-3 py-1.5 border-b border-slate-100 bg-slate-50">
                      <div className="flex items-center gap-2">
                        <span className="w-5 text-center">#</span>
                        <span className="w-[105px]">LATITUD</span>
                        <span>LONGITUD</span>
                      </div>
                      <button
                        type="button"
                        onClick={copyAllCoords}
                        title="Copiar todas las coordenadas"
                        className="p-1 rounded text-slate-400 hover:text-[#1447C0] hover:bg-white transition cursor-pointer"
                      >
                        <Copy size={13} />
                      </button>
                    </div>

                    <div className="max-h-[110px] overflow-y-auto divide-y divide-slate-100 text-[11.5px] bg-white">
                      {drawVertices.length === 0 ? (
                        <div className="py-3 text-center text-slate-400 text-[11.5px] italic">
                          Sin vértices marcados aún
                        </div>
                      ) : (
                        drawVertices.map((v, idx) => {
                          const isLast = idx === drawVertices.length - 1;
                          return (
                            <div
                              key={idx}
                              className={`group flex items-center justify-between px-3 py-1.5 transition ${
                                isLast
                                  ? 'bg-blue-50/50 border-l-[3px] border-[#FB7B0F]'
                                  : 'hover:bg-slate-50 border-l-[3px] border-transparent'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                    isLast
                                      ? 'bg-[#1447C0] text-white'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {idx + 1}
                                </span>
                                <span className={`w-[105px] tabular-nums ${isLast ? 'font-bold text-slate-800' : 'text-slate-600'}`}>
                                  {v.lat.toFixed(6)}
                                </span>
                                <span className={`tabular-nums ${isLast ? 'font-bold text-slate-800' : 'text-slate-600'}`}>
                                  {v.lng.toFixed(6)}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => copyCoord(v.lat, v.lng)}
                                title="Copiar coordenada"
                                className="p-1 rounded text-slate-400 opacity-60 group-hover:opacity-100 hover:text-[#1447C0] transition cursor-pointer"
                              >
                                <Copy size={12} />
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Métricas del polígono: Área (3+), Perímetro (2+), Vértices */}
                  {polygonStats && (
                    <div className="rounded-lg border border-slate-200/90 bg-slate-50/70 px-3 py-2 mb-2.5 space-y-1 text-[12px] animate-fadeIn">
                      {polygonStats.areaText && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Área</span>
                          <span className="font-semibold text-slate-800 tabular-nums">{polygonStats.areaText}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Perímetro</span>
                        <span className="font-semibold text-slate-800 tabular-nums">{polygonStats.perimeterText}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Vértices</span>
                        <span className="font-semibold text-slate-800 tabular-nums">{polygonStats.vertices}</span>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Switch: INGRESAR COORDENADAS MANUALMENTE */}
              <div className="flex items-center justify-between py-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-700 tracking-wide uppercase">
                  Ingresar coordenadas manualmente
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={manualInputOpen}
                  onClick={() => setManualInputOpen((prev) => !prev)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    manualInputOpen ? 'bg-[#1447C0]' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      manualInputOpen ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Sección desplegable al activar el switch */}
              {manualInputOpen && (
                <div className="pb-2 space-y-1.5 animate-fadeIn">
                  {drawMode === 'circle' ? (
                    /* Entradas para Círculo: Latitud, Longitud, Radio km y botón Aplicar */
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={manualLat}
                        onChange={(e) => handleLatChange(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleApplyManualCircle();
                          }
                        }}
                        placeholder="Latitud"
                        className="flex-1 min-w-0 h-9 px-2.5 rounded-lg border border-slate-200 bg-slate-50 text-[12px] text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-[#1447C0] focus:ring-1 focus:ring-[#1447C0] outline-none font-medium tabular-nums transition"
                      />
                      <input
                        type="text"
                        value={manualLng}
                        onChange={(e) => setManualLng(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleApplyManualCircle();
                          }
                        }}
                        placeholder="Longitud"
                        className="flex-1 min-w-0 h-9 px-2.5 rounded-lg border border-slate-200 bg-slate-50 text-[12px] text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-[#1447C0] focus:ring-1 focus:ring-[#1447C0] outline-none font-medium tabular-nums transition"
                      />
                      <input
                        type="text"
                        value={manualRadiusKm}
                        onChange={(e) => setManualRadiusKm(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleApplyManualCircle();
                          }
                        }}
                        placeholder="Radio km"
                        className="w-[85px] shrink-0 h-9 px-2.5 rounded-lg border border-slate-200 bg-slate-50 text-[12px] text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-[#1447C0] focus:ring-1 focus:ring-[#1447C0] outline-none font-medium tabular-nums transition"
                      />
                      <button
                        type="button"
                        onClick={handleApplyManualCircle}
                        title="Aplicar centro y radio"
                        className="h-9 px-3.5 shrink-0 rounded-lg bg-[#1447C0] hover:bg-[#113EB9] active:bg-[#0d2f8e] text-white flex items-center justify-center font-bold text-[12px] shadow-xs transition cursor-pointer"
                      >
                        Aplicar
                      </button>
                    </div>
                  ) : (
                    /* Entradas para Polígono: Latitud, Longitud, botón + y texto de ayuda */
                    <>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={manualLat}
                          onChange={(e) => handleLatChange(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddManualCoordinate();
                            }
                          }}
                          placeholder={cursorCoord ? `Latitud ${cursorCoord.lat.toFixed(5)}` : 'Latitud -12.08712'}
                          className="flex-1 min-w-0 h-9 px-2.5 rounded-lg border border-slate-200 bg-slate-50 text-[12px] text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-[#1447C0] focus:ring-1 focus:ring-[#1447C0] outline-none font-medium tabular-nums transition"
                        />
                        <input
                          type="text"
                          value={manualLng}
                          onChange={(e) => setManualLng(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddManualCoordinate();
                            }
                          }}
                          placeholder={cursorCoord ? `Longitud ${cursorCoord.lng.toFixed(5)}` : 'Longitud -76.97834'}
                          className="flex-1 min-w-0 h-9 px-2.5 rounded-lg border border-slate-200 bg-slate-50 text-[12px] text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-[#1447C0] focus:ring-1 focus:ring-[#1447C0] outline-none font-medium tabular-nums transition"
                        />
                        <button
                          type="button"
                          onClick={handleAddManualCoordinate}
                          title="Agregar coordenada"
                          className="h-9 w-9 shrink-0 rounded-lg bg-[#1447C0] hover:bg-[#113EB9] active:bg-[#0d2f8e] text-white flex items-center justify-center font-bold shadow-xs transition cursor-pointer"
                        >
                          <Plus size={16} strokeWidth={2.5} />
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400 italic">
                        También puedes pegar "lat, lng" en el primer campo
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* Fila de Botones: Deshacer, Cancelar y Finalizar */}
              <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={drawMode === 'circle' ? !circleCenter : drawInfo.points === 0}
                    onClick={() => undoPointRef.current()}
                    title={drawMode === 'circle' ? 'Limpiar centro' : 'Deshacer último vértice'}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-semibold text-[12px] transition disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                  >
                    <Undo2 size={13} className="text-slate-600 stroke-[2.2]" />
                    <span>Deshacer</span>
                  </button>

                  <button
                    type="button"
                    onClick={cancelDrawing}
                    className="px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold text-[12px] transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>

                {drawMode === 'polygon' ? (
                  drawInfo.points >= 3 ? (
                    <button
                      type="button"
                      onClick={() => finishPolygonRef.current()}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#FB7B0F] hover:bg-[#e26a05] active:bg-[#c95d03] text-white font-bold text-[12px] shadow-sm transition cursor-pointer"
                    >
                      <Check size={14} className="stroke-[2.5]" />
                      <span>Finalizar</span>
                      <span className="bg-black/15 text-white text-[10px] font-bold px-1.5 py-0.5 rounded leading-none">
                        Enter
                      </span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-100 text-slate-400 font-semibold text-[12px] cursor-not-allowed select-none">
                      <Check size={14} className="text-slate-400 stroke-[2.5]" />
                      <span>Finalizar</span>
                      <span className="bg-slate-200/90 text-slate-500 text-[10px] font-bold px-1.5 py-0.5 rounded leading-none">
                        Enter
                      </span>
                    </div>
                  )
                ) : circleCenter && circleRadius >= MIN_RADIUS_M ? (
                  <button
                    type="button"
                    onClick={() => finishCircleRef.current()}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#FB7B0F] hover:bg-[#e26a05] active:bg-[#c95d03] text-white font-bold text-[12px] shadow-sm transition cursor-pointer"
                  >
                    <Check size={14} className="stroke-[2.5]" />
                    <span>Finalizar</span>
                    <span className="bg-black/15 text-white text-[10px] font-bold px-1.5 py-0.5 rounded leading-none">
                      Enter
                    </span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-100 text-slate-400 font-semibold text-[12px] cursor-not-allowed select-none">
                    <Check size={14} className="text-slate-400 stroke-[2.5]" />
                    <span>Finalizar</span>
                    <span className="bg-slate-200/90 text-slate-500 text-[10px] font-bold px-1.5 py-0.5 rounded leading-none">
                      Enter
                    </span>
                  </div>
                )}
              </div>

              {/* Texto de ayuda al pie */}
              <div className="text-right text-[11px] text-slate-500 font-medium mt-2">
                {drawMode === 'polygon'
                  ? drawInfo.points < 3
                    ? 'Mínimo 3 vértices · Puedes mover el mapa libremente'
                    : 'Arrastra los vértices para ajustar · Enter o Finalizar'
                  : !circleCenter
                  ? 'Marca el centro del círculo en el mapa'
                  : circleRadius >= MIN_RADIUS_M
                  ? 'Arrastra el asa para ajustar el radio · Enter o Finalizar'
                  : 'Mueve el mouse y haz clic para fijar el radio'}
              </div>
            </div>
          </div>
        )}

        {/* Barra de edición de forma */}
        {editingGeofence && (
          <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-full border border-gray-200/80 bg-white/95 py-2 pl-4 pr-2 text-[12px] font-medium text-gray-700 shadow-lg backdrop-blur-md">
            <Move size={14} className="text-[#113EB9]" />
            <span>
              Ajustando <strong className="font-bold">{editingGeofence.name}</strong> · arrastra los
              puntos en el mapa
            </span>
            <button
              type="button"
              onClick={saveShapeEdit}
              className="rounded-full bg-green-600 px-3 py-1 text-[11px] font-bold text-white transition hover:bg-green-700"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={cancelShapeEdit}
              className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold text-gray-500 transition hover:bg-gray-200"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      <GeofenceModal
        open={modalOpen}
        mode={editingDetails ? 'edit' : 'create'}
        initial={modalInitial}
        shapeSummary={modalShapeSummary}
        vehicles={vehicles}
        geofenceID={editingDetails?.geofenceID ?? editingDetails?.numericId}
        initialTab={modalInitialTab}
        onCancel={closeModal}
        onSave={saveGeofence}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Eliminar geocerca"
        message={`Se eliminará “${pendingDelete?.name}” y sus vinculaciones de vehículos. Esta acción no se puede deshacer.`}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      {/* Drawer de Alertas en Tiempo Real (SignalR) */}
      <RealtimeAlertsDrawer
        open={alertsDrawerOpen}
        onClose={() => setAlertsDrawerOpen(false)}
        alerts={signalRAlerts}
        unreadCount={signalRUnreadCount}
        status={signalRStatus}
        loading={signalRLoading}
        onRefresh={refreshSignalRAlerts}
        onClear={() => {
          clearSignalRAlerts();
          handleClearAlertMarker();
        }}
        onLocateAlert={handleLocateAlert}
        selectedAlertId={activeAlertOnMap?.id || null}
        onClearAlertMarker={handleClearAlertMarker}
      />

      {/* Modal de Reportes de Visitas y Resumen Estadístico */}
      <GeocercasReportsModal
        open={reportsModalOpen}
        onClose={() => setReportsModalOpen(false)}
        token={sessionToken}
        accountID={effectiveUsername}
        geofences={geofences}
        vehicles={vehicles}
        onViewVisitOnMap={handleViewVisitOnMap}
      />
    </div>
  );
}
