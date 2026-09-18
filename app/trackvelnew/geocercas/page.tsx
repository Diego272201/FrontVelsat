'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import axios from 'axios';
import { toast, Toaster } from 'sonner';
import {
  ChevronLeft,
  Circle as CircleIcon,
  Crosshair,
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

  // Resolución segura de baseUrl y accountID/username apuntando a do.velsat.pe:2083 por defecto
  const effectiveBaseUrl = useMemo(() => {
    if (baseUrl && baseUrl.trim()) return baseUrl.trim();
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('servidorUrl');
      if (stored && stored.trim()) return stored.trim();
    }
    return DEFAULT_API_BASE_URL;
  }, [baseUrl]);

  const effectiveUsername = useMemo(() => {
    if (username && username.trim()) return username.trim();
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('currentUser');
      if (stored && stored.trim()) return stored.trim();
    }
    return 'movilbus';
  }, [username]);

  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapType, setMapType] = useState<'roadmap' | 'hybrid'>('roadmap');

  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [loadingGeofences, setLoadingGeofences] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

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
      }
    } catch (error) {
      console.warn('Error al obtener vehículos en vivo del backend:', error);
    }
  }, [effectiveBaseUrl, effectiveUsername]);

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
        const apiGeos = await getGeocercasApi(effectiveBaseUrl, effectiveUsername);

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
    [effectiveBaseUrl, effectiveUsername],
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
    if (!hydrated) return;

    if (mapReady) {
      window.trackvelLoader?.hide();
      return;
    }

    const timer = setTimeout(() => {
      window.trackvelLoader?.hide();
    }, 300);

    return () => clearTimeout(timer);
  }, [hydrated, mapReady]);

  /* ------------------------------------------------------------------ */
  /* Mapa                                                                */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (!mapsReady || mapRef.current || !mapDivRef.current) return;

    mapRef.current = new google.maps.Map(mapDivRef.current, {
      center: LIMA_CENTER,
      zoom: 13,
      mapTypeId: 'roadmap',
      disableDefaultUI: true,
      clickableIcons: false,
      gestureHandling: 'greedy',
    });
    setMapReady(true);
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
      <Toaster richColors position="top-right" />
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

          <div className="flex items-center gap-1.5 pr-2">
            <button
              type="button"
              onClick={testTraccarConnection}
              disabled={testingTraccar}
              title="Probar conexión con servidores Traccar (:2087)"
              className="flex items-center gap-1 rounded bg-orange-500/90 px-2 py-1 text-[11px] font-bold text-white shadow-xs hover:bg-orange-600 transition-colors disabled:opacity-50"
            >
              <Radio size={12} className={testingTraccar ? 'animate-spin' : ''} />
              <span>Probar Traccar</span>
            </button>
            <button
              type="button"
              onClick={() => fetchGeocercas(true)}
              title="Recargar geocercas"
              className={`flex h-7 w-7 items-center justify-center rounded text-white/80 hover:bg-white/10 hover:text-white transition-colors ${
                loadingGeofences ? 'animate-spin' : ''
              }`}
            >
              <RefreshCw size={14} />
            </button>
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
              />
            ))
          )}
        </div>
      </aside>

      {/* Contenedor del Mapa */}
      <div className="relative h-full min-w-0 flex-1">
        <div ref={mapDivRef} className="absolute inset-0" />

        {/* Botón flotante para abrir sidebar si está colapsado */}
        {!sidebarOpen && (
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            title="Abrir panel de geocercas"
            className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-lg border border-gray-200/80 bg-white/95 px-3 py-2 text-[12px] font-bold text-[#113EB9] shadow-md backdrop-blur-md transition hover:bg-blue-50"
          >
            <Menu size={16} />
            <span>Geocercas ({geofences.length})</span>
          </button>
        )}

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
    </div>
  );
}
