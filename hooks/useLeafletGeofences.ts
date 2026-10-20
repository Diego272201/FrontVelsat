'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import type { GeofenceListItem } from './useMapGeofences';
import {
  getGeocercasApi,
  parseGeocercaGeometry,
  ApiGeocerca,
} from '@/app/trackvelnew/geocercas/geocercasApi';

const COLOR_CYCLE = ['#3b82f6', '#22c55e', '#ef4444', '#f97316', '#a855f7', '#eab308'];

const BASE_STYLE = { weight: 2, opacity: 0.9, fillOpacity: 0.18 };

function labelIcon(name: string, color: string): L.DivIcon {
  const span = document.createElement('span');
  span.textContent = name.trim().toUpperCase();
  span.setAttribute(
    'style',
    [
      'position:absolute',
      'transform:translate(-50%,-50%)',
      'white-space:nowrap',
      "font-family:'IBM Plex Sans',-apple-system,'Segoe UI',Roboto,sans-serif",
      'font-size:11px',
      'font-weight:800',
      'letter-spacing:0.06em',
      `color:${color}`,
      '-webkit-text-stroke:3.5px #ffffff',
      'paint-order:stroke fill',
      'cursor:pointer',
    ].join(';'),
  );
  return L.divIcon({ className: '', html: span.outerHTML, iconSize: [0, 0], iconAnchor: [0, 0] });
}

interface RegisteredGeofence {
  item: GeofenceListItem;
  overlay: L.Circle | L.Polygon;
}

/**
 * Versión Leaflet de `useMapGeofences` para el servidor SUB (`/subtrackvelnew`):
 * consume `GET {baseUrl}/api/geocercas?accountID={username}` (p.ej. https://sub.velsat.pe:2096/api/geocercas)
 * y dibuja las geocercas circulares y poligonales con la misma interfaz del panel lateral.
 */
export function useLeafletGeofences(
  map: L.Map | null,
  active: boolean,
  baseUrl: string,
  username: string,
) {
  const [loading, setLoading] = useState(false);
  const [geofencesList, setGeofencesList] = useState<GeofenceListItem[]>([]);
  const [selectedGeofenceId, setSelectedGeofenceId] = useState<number | null>(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  const groupRef = useRef<L.LayerGroup | null>(null);
  const registeredRef = useRef<Map<number, RegisteredGeofence>>(new Map());

  const clearOverlays = useCallback(() => {
    groupRef.current?.remove();
    groupRef.current = null;
    registeredRef.current.clear();
    setGeofencesList([]);
    setSelectedGeofenceId(null);
  }, []);

  const refetch = useCallback(() => setReloadTrigger((prev) => prev + 1), []);

  const focusGeofence = useCallback(
    (id: number) => {
      if (!map) return;
      const reg = registeredRef.current.get(id);
      if (!reg) return;

      setSelectedGeofenceId(id);
      map.fitBounds(reg.overlay.getBounds(), { padding: [60, 60], maxZoom: 16 });

      reg.overlay.setStyle({ weight: 4.5, fillOpacity: 0.38 });
      setTimeout(() => reg.overlay.setStyle(BASE_STYLE), 1800);
    },
    [map],
  );

  const fitAllGeofences = useCallback(() => {
    if (!map || registeredRef.current.size === 0) return;
    const bounds = L.latLngBounds([]);
    registeredRef.current.forEach((reg) => bounds.extend(reg.overlay.getBounds()));
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [70, 70], maxZoom: 16 });
    }
  }, [map]);

  useEffect(() => {
    if (!map || !active) {
      clearOverlays();
      return;
    }

    let effectiveBaseUrl = (baseUrl || '').trim();
    let effectiveUsername = (username || '').trim();

    if (typeof window !== 'undefined') {
      if (!effectiveBaseUrl) {
        effectiveBaseUrl = (localStorage.getItem('servidorUrl') || '').trim();
      }
      if (!effectiveUsername) {
        effectiveUsername = (localStorage.getItem('currentUser') || '').trim();
      }
    }

    if (!effectiveBaseUrl) {
      effectiveBaseUrl = 'https://sub.velsat.pe:2096';
    }

    if (!effectiveUsername) {
      clearOverlays();
      return;
    }

    let isCancelled = false;
    setLoading(true);

    const loadAndRender = async () => {
      try {
        const apiGeos = await getGeocercasApi(effectiveBaseUrl, effectiveUsername);
        if (isCancelled || !map) return;

        clearOverlays();
        const group = L.layerGroup().addTo(map);
        groupRef.current = group;

        const list: GeofenceListItem[] = [];

        (Array.isArray(apiGeos) ? apiGeos : []).forEach((geo: ApiGeocerca, index: number) => {
          if (geo.activo === false) return;

          const geom = parseGeocercaGeometry(geo);
          const color = geo.color || COLOR_CYCLE[index % COLOR_CYCLE.length];
          const nombre = geo.nombre?.trim() || `Geocerca #${geo.id}`;
          const style = { ...BASE_STYLE, color, fillColor: color };
          const isCircle = geo.tipo?.toLowerCase() === 'circle';

          let overlay: L.Circle | L.Polygon | null = null;
          let item: GeofenceListItem | null = null;

          if (isCircle && geom.center && geom.radius) {
            overlay = L.circle([geom.center.lat, geom.center.lng], {
              ...style,
              radius: geom.radius,
            });
            item = {
              id: geo.id,
              nombre,
              tipo: 'circle',
              color,
              descripcion: geo.descripcion,
              center: geom.center,
              radius: geom.radius,
            };
          } else if (geom.path && geom.path.length >= 3) {
            const latLngPath = geom.path.map(
              (p) => [p.lat, p.lng] as [number, number],
            );
            overlay = L.polygon(latLngPath, style);
            const c = overlay.getBounds().getCenter();
            item = {
              id: geo.id,
              nombre,
              tipo: 'polygon',
              color,
              descripcion: geo.descripcion,
              center: { lat: c.lat, lng: c.lng },
              pointCount: geom.path.length,
            };
          }

          if (!overlay || !item) return;

          const select = () => setSelectedGeofenceId(geo.id);
          overlay.on('click', select).addTo(group);
          if (item.center) {
            L.marker([item.center.lat, item.center.lng], {
              icon: labelIcon(nombre, color),
            })
              .on('click', select)
              .addTo(group);
          }

          registeredRef.current.set(geo.id, { item, overlay });
          list.push(item);
        });

        setGeofencesList(list);
      } catch (err) {
        console.error('Error al cargar geocercas en el mapa:', err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    loadAndRender();

    return () => {
      isCancelled = true;
      clearOverlays();
    };
  }, [map, active, baseUrl, username, reloadTrigger, clearOverlays]);

  return {
    loading,
    geofenceCount: geofencesList.length,
    geofencesList,
    selectedGeofenceId,
    focusGeofence,
    fitAllGeofences,
    refetch,
  };
}
