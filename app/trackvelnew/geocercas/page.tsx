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
}

interface DrawDraft {
  center: LatLng | null;
  points: LatLng[];
  preview: google.maps.Circle | google.maps.Polygon | null;
  vertexMarkers: google.maps.Marker[];
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
  const visitMarkersRef = useRef<google.maps.Marker[]>([]);

  // Centrar mapa en alerta en tiempo real con icono de auto (/UnidadK.webp) y popup detallado
  const handleLocateAlert = useCallback(
    (
      alertOrLat: RealtimeGeofenceAlert | number,
      maybeLng?: number,
      maybeTitle?: string,
    ) => {
      const map = mapRef.current;
      if (!map || typeof google === 'undefined' || !google.maps) return;

      let lat = 0;
      let lng = 0;
      let deviceID = 'Vehículo';
      let eventType = 'geofenceEnter';
      let geofenceName = 'Geocerca';
      let speed = 0;
      let serverTimeStr = new Date().toISOString();

      if (typeof alertOrLat === 'object' && alertOrLat !== null) {
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

      if (alertMarkerRef.current) {
        alertMarkerRef.current.setMap(null);
      }
      if (alertInfoWindowRef.current) {
        alertInfoWindowRef.current.close();
      }

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
        <div style="font-family: system-ui, -apple-system, sans-serif; min-width: 220px; padding: 2px 2px 2px 0;">
          <!-- Encabezado con Icono, Placa y Geocerca -->
          <div style="display: flex; align-items: center; gap: 10px; padding-bottom: 10px;">
            <div style="width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: ${isEnter ? '#ECFDF5' : '#FEF2F2'};">
              ${isEnter ? enterSvg : exitSvg}
            </div>
            <div style="min-width: 0; flex: 1;">
              <div style="font-family: monospace; font-size: 14px; font-weight: 700; color: #0F172A; line-height: 1.2; letter-spacing: -0.01em;">
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
              <div style="font-size: 13px; font-weight: 800; color: #0F172A; margin-top: 3px;">
                ${speed} <span style="font-size: 11px; font-weight: 600; color: #475569;">km/h</span>
              </div>
            </div>
            <div style="padding: 0 6px; border-left: 1px solid #F1F5F9;">
              <div style="font-size: 9px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em;">HORA</div>
              <div style="font-size: 13px; font-weight: 800; color: #0F172A; margin-top: 3px;">
                ${formattedTime}
              </div>
            </div>
            <div style="padding-left: 6px; border-left: 1px solid #F1F5F9;">
              <div style="font-size: 9px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em;">FECHA</div>
              <div style="font-size: 13px; font-weight: 800; color: #0F172A; margin-top: 3px;">
                ${formattedDate}
              </div>
            </div>
          </div>
        </div>
      `;

      const info = new google.maps.InfoWindow({
        content: infoWindowContent,
        pixelOffset: new google.maps.Size(0, -18),
      });

      info.open(map, marker);
      alertInfoWindowRef.current = info;

      marker.addListener('click', () => {
        info.open(map, marker);
      });

      setTimeout(() => {
        marker.setMap(null);
        info.close();
      }, 45000);
    },
    [],
  );

  // Marcar puntos de entrada y salida de visita en el mapa
  const handleViewVisitOnMap = useCallback((visit: VisitaItem) => {
    const map = mapRef.current;
    if (!map || typeof google === 'undefined' || !google.maps) return;

    visitMarkersRef.current.forEach((m) => m.setMap(null));
    visitMarkersRef.current = [];

    const bounds = new google.maps.LatLngBounds();
    let hasCoords = false;

    if (visit.latitudEntrada != null && visit.longitudEntrada != null) {
      const pos = { lat: Number(visit.latitudEntrada), lng: Number(visit.longitudEntrada) };
      const entryMarker = new google.maps.Marker({
        position: pos,
        map,
        title: `Entrada: ${visit.deviceID} en ${visit.geofenceName}`,
        label: {
          text: 'E',
          color: '#ffffff',
          fontWeight: 'bold',
          fontSize: '11px',
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 11,
          fillColor: '#10B981',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
        },
      });

      const entryInfo = new google.maps.InfoWindow({
        content: `
          <div style="font-size:11px; padding:2px;">
            <strong style="color:#059669;">ENTRADA</strong><br/>
            <strong>Vehículo:</strong> ${visit.deviceID}<br/>
            <strong>Geocerca:</strong> ${visit.geofenceName}<br/>
            <strong>Hora:</strong> ${visit.fechaEntrada ? new Date(visit.fechaEntrada).toLocaleString('es-PE') : '-'}
          </div>
        `,
      });
      entryMarker.addListener('click', () => entryInfo.open(map, entryMarker));
      visitMarkersRef.current.push(entryMarker);
      bounds.extend(pos);
      hasCoords = true;
    }

    if (visit.latitudSalida != null && visit.longitudSalida != null) {
      const pos = { lat: Number(visit.latitudSalida), lng: Number(visit.longitudSalida) };
      const exitMarker = new google.maps.Marker({
        position: pos,
        map,
        title: `Salida: ${visit.deviceID} de ${visit.geofenceName}`,
        label: {
          text: 'S',
          color: '#ffffff',
          fontWeight: 'bold',
          fontSize: '11px',
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 11,
          fillColor: '#EF4444',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
        },
      });

      const exitInfo = new google.maps.InfoWindow({
        content: `
          <div style="font-size:11px; padding:2px;">
            <strong style="color:#DC2626;">SALIDA</strong><br/>
            <strong>Vehículo:</strong> ${visit.deviceID}<br/>
            <strong>Geocerca:</strong> ${visit.geofenceName}<br/>
            <strong>Hora:</strong> ${visit.fechaSalida ? new Date(visit.fechaSalida).toLocaleString('es-PE') : '-'}<br/>
            <strong>Permanencia:</strong> ${visit.duracionMinutos != null ? `${visit.duracionMinutos} min` : '-'}
          </div>
        `,
      });
      exitMarker.addListener('click', () => exitInfo.open(map, exitMarker));
      visitMarkersRef.current.push(exitMarker);
      bounds.extend(pos);
      hasCoords = true;
    }

    if (hasCoords) {
      if (visitMarkersRef.current.length > 1) {
        map.fitBounds(bounds);
      } else {
        map.setCenter(visitMarkersRef.current[0].getPosition()!);
        map.setZoom(16);
      }
      toast.info(`Puntos de visita de ${visit.deviceID} marcados en el mapa`);
    } else {
      toast.warning('Esta visita no contiene coordenadas registradas de entrada o salida');
    }
  }, []);

  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapType, setMapType] = useState<'roadmap' | 'hybrid'>('roadmap');

  const [geofences, setGeofences] = useState<Geofence[]>([]);
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
    const toastId = toast.loading('Probando conexión con Traccar (https://do.velsat.pe:2087)...');
    try {
      const auth = getTraccarAuthHeader();
      if (!auth) {
        toast.error('No se encontró NEXT_PUBLIC_TRACCAR_EMAIL / PASSWORD en .env.local', { id: toastId });
        return;
      }
      const result = await testTraccarAuth(DEFAULT_TRACCAR_URL, auth);
      if (result.ok) {
        console.log('✅ Conexión con Traccar (:2087) exitosa:', result);
        toast.success(`Traccar DO (:2087): ${result.message}`, {
          id: toastId,
          duration: 5000,
        });
      } else {
        console.error('❌ Error de conexión con Traccar:', result.message);
        toast.error(`Traccar DO (:2087): ${result.message}`, {
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
  }, []);

  const shapesRef = useRef<Record<string, ShapeEntry>>({});
  const drawRef = useRef<DrawDraft>({
    center: null,
    points: [],
    preview: null,
    vertexMarkers: [],
  });
  const finishPolygonRef = useRef<() => void>(() => {});
  const undoPointRef = useRef<() => void>(() => {});
  const originalShapeRef = useRef<{ center?: LatLng; radius?: number; path?: LatLng[] } | null>(
    null,
  );

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
  const runBackgroundSyncCheck = useCallback(
    async (
      currentGeofences: Geofence[],
      authHeader?: string,
      serverDevices?: ServerDevicesResult[],
    ) => {
      if (!authHeader || !serverDevices || serverDevices.length === 0 || currentGeofences.length === 0) {
        return;
      }

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

        for (const geo of currentGeofences) {
          if (!geo.geofenceID) continue;

          // 1. Dirección 1: En BD interna pero no confirmado en Traccar
          const unconfirmedVehicleIds: string[] = [];
          if (geo.vehicleIds.length > 0) {
            await Promise.all(
              geo.vehicleIds.map(async (plate) => {
                const dev = resolveTraccarDevice(serverDevices, plate, DEFAULT_TRACCAR_URL);
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
              DEFAULT_TRACCAR_URL,
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

          if (unconfirmedVehicleIds.length > 0 || traccarOnlyVehicleIds.length > 0) {
            setGeofences((prev) =>
              prev.map((g) =>
                g.id === geo.id
                  ? {
                      ...g,
                      unconfirmedVehicleIds,
                      traccarOnlyVehicleIds,
                    }
                  : g,
              ),
            );
          }
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
        try {
          apiGeos = await getGeocercasApi(effectiveBaseUrl, effectiveUsername);
        } catch (err) {
          console.warn('Error al consultar geocercas de la API interna:', err);
          apiGeos = [];
        }

        // 2. Respaldo y Sincronización Automática con Traccar (:2087)
        try {
          const authHeader = getTraccarAuthHeader();
          const traccarGeos = await getTraccarGeofences(DEFAULT_TRACCAR_URL, authHeader);

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

        // 3. Mapeo a modelo de vista Geofence (Carga Rápida en <200ms)
        const authHeader = getTraccarAuthHeader();
        const serverDevices = authHeader ? await getCachedOrFreshTraccarDevices(authHeader) : [];

        const parsedList = await Promise.all(
          apiGeos.map(async (geo) => {
            let vehicleIds: string[] = [];
            try {
              const assignedVehs = await getGeocercaVehiculosApi(effectiveBaseUrl, geo.id);
              vehicleIds = assignedVehs.map((v) => v.deviceID);
            } catch (e) {
              console.error(`Error al cargar vehículos vinculados a la geocerca ${geo.id}:`, e);
            }

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
              vehicleIds,
              createdAt: geo.fechaCreacion ? new Date(geo.fechaCreacion).getTime() : Date.now(),
            } as Geofence;
          }),
        );

        setGeofences(parsedList);
        if (showFeedback) {
          toast.success(`Se cargaron ${parsedList.length} geocercas`);
        }

        // 4. Disparar verificación bidireccional en SEGUNDO PLANO (No bloqueante)
        setTimeout(() => {
          runBackgroundSyncCheck(parsedList, authHeader, serverDevices);
        }, 100);
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
    // Safety fallback: Asegurar que el loader NUNCA se quede pegado más de 2 segundos bajo ninguna condición
    const safetyTimer = setTimeout(() => {
      window.trackvelLoader?.hide();
    }, 2000);

    if (hydrated) {
      if (mapReady) {
        window.trackvelLoader?.hide();
      } else {
        const timer = setTimeout(() => {
          window.trackvelLoader?.hide();
        }, 150);
        return () => {
          clearTimeout(timer);
          clearTimeout(safetyTimer);
        };
      }
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
      map.setCenter(LIMA_CENTER);
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
      Object.values(shapes).forEach((entry) => entry.overlay.setMap(null));
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
      draft.center = null;
      draft.points = [];
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

    const undoPoint = () => {
      if (!draft.points.length) return;
      draft.points.pop();
      draft.vertexMarkers.pop()?.setMap(null);
      if (draft.points.length) {
        (draft.preview as google.maps.Polygon | null)?.setPath(draft.points);
      } else {
        draft.preview?.setMap(null);
        draft.preview = null;
      }
      setDrawInfo({ points: draft.points.length, radius: 0 });
    };

    finishPolygonRef.current = finishPolygon;
    undoPointRef.current = undoPoint;

    const clickListener = map.addListener('click', (event: google.maps.MapMouseEvent) => {
      if (!event.latLng) return;
      const point = { lat: event.latLng.lat(), lng: event.latLng.lng() };

      if (drawMode === 'circle') {
        if (!draft.center) {
          draft.center = point;
          draft.preview = new google.maps.Circle({
            ...previewStyle,
            map,
            center: point,
            radius: 1,
          });
          setDrawInfo({ points: 1, radius: 0 });
          return;
        }

        const radius = distanceMeters(draft.center, point);
        if (radius < MIN_RADIUS_M) return;
        const center = draft.center;
        clearDraft();
        setDrawMode(null);
        setPendingShape({ type: 'circle', center, radius });
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

      draft.points.push(point);
      if (!draft.preview) {
        draft.preview = new google.maps.Polygon({ ...previewStyle, map, paths: [point] });
      } else {
        (draft.preview as google.maps.Polygon).setPath(draft.points);
      }
      draft.vertexMarkers.push(
        new google.maps.Marker({ map, position: point, clickable: false, icon: vertexIcon, zIndex: 60 }),
      );
      setDrawInfo({ points: draft.points.length, radius: 0 });
    });

    const moveListener = map.addListener('mousemove', (event: google.maps.MapMouseEvent) => {
      if (!event.latLng) return;
      const point = { lat: event.latLng.lat(), lng: event.latLng.lng() };

      if (drawMode === 'circle' && draft.center && draft.preview) {
        const radius = distanceMeters(draft.center, point);
        (draft.preview as google.maps.Circle).setRadius(radius);
        setDrawInfo((prev) =>
          Math.abs(prev.radius - radius) < 2 ? prev : { points: 1, radius },
        );
        return;
      }

      if (drawMode === 'polygon' && draft.points.length && draft.preview) {
        (draft.preview as google.maps.Polygon).setPath([...draft.points, point]);
      }
    });

    const dblClickListener = map.addListener('dblclick', () => {
      if (drawMode === 'polygon') finishPolygon();
    });

    return () => {
      google.maps.event.removeListener(clickListener);
      google.maps.event.removeListener(moveListener);
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

      if (!entry) {
        if (geofence.type === 'circle' && geofence.center && geofence.radius != null) {
          const overlay = new google.maps.Circle({
            ...style,
            map,
            center: geofence.center,
            radius: geofence.radius,
          });
          overlay.addListener('click', () => setSelectedId(geofence.id));
          store[geofence.id] = { type: 'circle', overlay };
        } else if (geofence.type === 'polygon' && geofence.path && geofence.path.length >= 3) {
          const overlay = new google.maps.Polygon({ ...style, map, paths: geofence.path });
          overlay.addListener('click', () => setSelectedId(geofence.id));
          store[geofence.id] = { type: 'polygon', overlay };
        }
        return;
      }

      entry.overlay.setOptions(style);

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
  }, []);

  const saveGeofence = useCallback(
    async (data: GeofenceFormData) => {
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
          const prevVehicles = editingDetails.vehicleIds || [];
          const newVehicles = data.vehicleIds || [];
          const toAdd = newVehicles.filter((v) => !prevVehicles.includes(v));
          const toRemove = prevVehicles.filter((v) => !newVehicles.includes(v));

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
          const finalVehicleIds = prevVehicles
            .filter((v) => !successfulToRemove.includes(v))
            .concat(successfulToAdd);

          setGeofences((prev) =>
            prev.map((geofence) =>
              geofence.id === editingDetails.id
                ? { ...geofence, ...data, vehicleIds: finalVehicleIds }
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

  const fitAllGeofences = useCallback(() => {
    const map = mapRef.current;
    if (!map || !geofences.length) return;

    const bounds = new google.maps.LatLngBounds();
    geofences.forEach((geofence) => {
      if (geofence.type === 'circle') {
        const circle = shapesRef.current[geofence.id]?.overlay as google.maps.Circle | undefined;
        const circleBounds = circle?.getBounds();
        if (circleBounds) bounds.union(circleBounds);
        else if (geofence.center) bounds.extend(geofence.center);
      } else {
        geofence.path?.forEach((point) => bounds.extend(point));
      }
    });

    if (!bounds.isEmpty()) map.fitBounds(bounds, 90);
  }, [geofences]);

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
            vehicleIds: editingDetails.vehicleIds,
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
        <div className="shrink-0 border-b border-gray-200 bg-slate-50 p-2.5 space-y-2">
          {/* Botón Nueva Geocerca */}
          <div className="relative">
            <button
              type="button"
              disabled={!mapReady}
              onClick={() => setShapeMenuOpen((open) => !open)}
              className="flex w-full items-center justify-center gap-1.5 rounded bg-[#FB7B0F] py-2 px-3 text-[12px] font-semibold text-white shadow-xs transition hover:bg-[#e56d09] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={14} /> Nueva geocerca
            </button>

            {shapeMenuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShapeMenuOpen(false)} />
                <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-40 overflow-hidden rounded border border-gray-200 bg-white shadow-lg">
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

          {/* Buscador */}
          <div className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre..."
              className="h-8 w-full rounded border border-gray-300 bg-white pl-8 pr-7 text-[11.5px] text-gray-800 placeholder-gray-400 outline-none transition focus:border-[#113EB9] focus:ring-1 focus:ring-[#113EB9]/20 shadow-xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                title="Limpiar búsqueda"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Filtros rápidos */}
          <div className="flex items-center gap-1 text-[10.5px] font-semibold">
            <button
              type="button"
              onClick={() => setStatusFilter('todos')}
              className={`flex-1 rounded py-1 px-1 text-center transition-all ${
                statusFilter === 'todos'
                  ? 'bg-[#113EB9] text-white shadow-xs font-bold'
                  : 'bg-gray-200/80 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todas ({geofences.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('asignadas')}
              className={`flex-1 rounded py-1 px-1 text-center transition-all ${
                statusFilter === 'asignadas'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'bg-gray-200/80 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Asignadas ({assignedCount})
            </button>
          </div>
        </div>

        {/* Lista con scroll de Geocercas */}
        <div className="geocercas-scroll flex-1 space-y-1.5 overflow-y-auto p-2 bg-slate-50/40">
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
                onEditDetails={setEditingDetails}
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
                <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-white/25 px-1 text-[10px] font-bold text-white leading-none">
                  {signalRUnreadCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={testTraccarConnection}
              disabled={testingTraccar}
              title="Probar conexión con servidores Traccar (:2087)"
              className="flex h-full items-center gap-1.5 rounded-lg px-2.5 text-[11.5px] font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all disabled:opacity-50"
            >
              <Radio size={13} className={testingTraccar ? 'animate-spin text-[#FB7B0F]' : 'text-slate-600'} />
              <span>Traccar</span>
            </button>
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
                onClick={fitAllGeofences}
                title="Ver todas las geocercas"
                className="mt-0.5 flex items-center justify-center rounded-md border-t border-gray-100 p-2 text-gray-700 transition hover:bg-blue-50 hover:text-[#113EB9]"
              >
                <Crosshair size={17} />
              </button>
            </div>
          </div>
        )}

        {/* Barra de dibujo */}
        {drawMode && (
          <div className="absolute left-1/2 top-4 z-20 flex -translate-x-1/2 items-center gap-3 rounded-full border border-gray-200/80 bg-white/95 py-2 pl-4 pr-2 text-[12px] font-medium text-gray-700 shadow-lg backdrop-blur-md">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#FB7B0F]" />

            {drawMode === 'circle' ? (
              <span>
                {drawInfo.points === 0
                  ? 'Haz clic para marcar el centro del círculo'
                  : `Clic para fijar el radio · ${formatDistance(drawInfo.radius)}`}
              </span>
            ) : (
              <span>
                {drawInfo.points === 0
                  ? 'Haz clic en el mapa para marcar cada vértice'
                  : `${drawInfo.points} ${drawInfo.points === 1 ? 'vértice' : 'vértices'} · pulsa Enter o “Finalizar” para cerrar`}
              </span>
            )}

            {drawMode === 'polygon' && drawInfo.points > 0 && (
              <button
                type="button"
                onClick={() => undoPointRef.current()}
                title="Deshacer último punto"
                className="flex items-center justify-center rounded-full bg-gray-100 p-1.5 text-gray-600 transition hover:bg-gray-200"
              >
                <Undo2 size={13} />
              </button>
            )}

            {drawMode === 'polygon' && (
              <button
                type="button"
                disabled={drawInfo.points < 3}
                onClick={() => finishPolygonRef.current()}
                className="rounded-full bg-green-600 px-3 py-1 text-[11px] font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Finalizar (Enter)
              </button>
            )}

            <button
              type="button"
              onClick={cancelDrawing}
              className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold text-gray-500 transition hover:bg-gray-200"
            >
              Cancelar
            </button>
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
        onClear={clearSignalRAlerts}
        onLocateAlert={handleLocateAlert}
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
