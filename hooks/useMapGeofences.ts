import { useEffect, useRef, useState, useCallback } from 'react';
import {
  getGeocercasApi,
  parseGeocercaGeometry,
  ApiGeocerca,
} from '@/app/trackvelnew/geocercas/geocercasApi';

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case "'":
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
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

function computePolygonCenter(
  path: { lat: number; lng: number }[],
): { lat: number; lng: number } | null {
  if (!path || path.length === 0) return null;
  const sum = path.reduce(
    (acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }),
    { lat: 0, lng: 0 },
  );
  return { lat: sum.lat / path.length, lng: sum.lng / path.length };
}

function computeCircleBounds(
  center: { lat: number; lng: number },
  radiusMeters: number,
): google.maps.LatLngBounds {
  const latDelta = (radiusMeters / 6378137) * (180 / Math.PI);
  const cosLat = Math.cos((center.lat * Math.PI) / 180);
  const lngDelta =
    (radiusMeters / (6378137 * (cosLat === 0 ? 0.0001 : cosLat))) * (180 / Math.PI);
  return new google.maps.LatLngBounds(
    { lat: center.lat - latDelta, lng: center.lng - lngDelta },
    { lat: center.lat + latDelta, lng: center.lng + lngDelta },
  );
}

function computePolygonBounds(
  path: { lat: number; lng: number }[],
): google.maps.LatLngBounds {
  const bounds = new google.maps.LatLngBounds();
  path.forEach((p) => bounds.extend(p));
  return bounds;
}

export interface GeofenceListItem {
  id: number;
  nombre: string;
  tipo: 'circle' | 'polygon';
  color: string;
  descripcion?: string;
  center: { lat: number; lng: number } | null;
  radius?: number;
  pointCount?: number;
}

interface RegisteredGeofence {
  item: GeofenceListItem;
  overlay: google.maps.Circle | google.maps.Polygon;
  labelMarker: google.maps.Marker | null;
  bounds: google.maps.LatLngBounds | null;
  showInfo: (latLng?: google.maps.LatLng | null) => void;
  highlight: () => void;
}

export function useMapGeofences(
  map: google.maps.Map | null,
  active: boolean,
) {
  const [loading, setLoading] = useState(false);
  const [geofenceCount, setGeofenceCount] = useState(0);
  const [geofencesList, setGeofencesList] = useState<GeofenceListItem[]>([]);
  const [selectedGeofenceId, setSelectedGeofenceId] = useState<number | null>(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  const registeredMapRef = useRef<Map<number, RegisteredGeofence>>(new Map());
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const clearOverlays = useCallback(() => {
    registeredMapRef.current.forEach((reg) => {
      reg.overlay.setMap(null);
      if (reg.labelMarker) {
        reg.labelMarker.setMap(null);
      }
    });
    registeredMapRef.current.clear();
    if (infoWindowRef.current) {
      infoWindowRef.current.close();
      infoWindowRef.current = null;
    }
    setGeofenceCount(0);
    setGeofencesList([]);
    setSelectedGeofenceId(null);
  }, []);

  const refetch = useCallback(() => {
    setReloadTrigger((prev) => prev + 1);
  }, []);

  const focusGeofence = useCallback(
    (id: number) => {
      if (!map) return;
      const reg = registeredMapRef.current.get(id);
      if (!reg) return;

      setSelectedGeofenceId(id);

      if (reg.bounds) {
        map.fitBounds(reg.bounds, 60);
        google.maps.event.addListenerOnce(map, 'idle', () => {
          const zoom = map.getZoom();
          if (zoom !== undefined && zoom > 16) {
            map.setZoom(16);
          }
        });
      } else if (reg.item.center) {
        map.panTo(reg.item.center);
        map.setZoom(15);
      }

      reg.highlight();
      reg.showInfo();
    },
    [map],
  );

  const fitAllGeofences = useCallback(() => {
    if (!map || registeredMapRef.current.size === 0) return;
    const allBounds = new google.maps.LatLngBounds();
    registeredMapRef.current.forEach((reg) => {
      if (reg.bounds) {
        allBounds.union(reg.bounds);
      } else if (reg.item.center) {
        allBounds.extend(reg.item.center);
      }
    });

    if (!allBounds.isEmpty()) {
      map.fitBounds(allBounds, 70);
      google.maps.event.addListenerOnce(map, 'idle', () => {
        const zoom = map.getZoom();
        if (zoom !== undefined && zoom > 16) {
          map.setZoom(16);
        }
      });
    }
  }, [map]);

  useEffect(() => {
    if (!map || !active) {
      clearOverlays();
      return;
    }

    let isCancelled = false;
    setLoading(true);

    const loadAndRender = async () => {
      try {
        let username = 'movilbus';
        let baseUrl = 'https://do.velsat.pe:2083';

        if (typeof window !== 'undefined') {
          const storedUser = localStorage.getItem('currentUser');
          if (storedUser && storedUser.trim()) {
            username = storedUser.trim();
          }
          const storedUrl = localStorage.getItem('servidorUrl');
          if (storedUrl && storedUrl.trim()) {
            baseUrl = storedUrl.trim();
          }
        }

        const apiGeos = await getGeocercasApi(baseUrl, username);

        if (isCancelled || !map) return;

        clearOverlays();

        const newRegistered = new Map<number, RegisteredGeofence>();
        const newList: GeofenceListItem[] = [];

        apiGeos.forEach((geo: ApiGeocerca) => {
          if (geo.activo === false) return;

          const geom = parseGeocercaGeometry(geo);
          const color = geo.color || '#3B82F6';

          let center: { lat: number; lng: number } | null = null;
          let overlay: google.maps.Circle | google.maps.Polygon | null = null;
          let bounds: google.maps.LatLngBounds | null = null;
          let radius: number | undefined = undefined;
          let pointCount: number | undefined = undefined;

          if (geo.tipo === 'circle' && geom.center && geom.radius) {
            center = geom.center;
            radius = geom.radius;
            bounds = computeCircleBounds(geom.center, geom.radius);
            overlay = new google.maps.Circle({
              map,
              center: geom.center,
              radius: geom.radius,
              strokeColor: color,
              strokeOpacity: 0.9,
              strokeWeight: 2,
              fillColor: color,
              fillOpacity: 0.18,
              zIndex: 15,
              clickable: true,
            });
          } else if (geom.path && geom.path.length >= 3) {
            center = computePolygonCenter(geom.path);
            pointCount = geom.path.length;
            bounds = computePolygonBounds(geom.path);
            overlay = new google.maps.Polygon({
              map,
              paths: geom.path,
              strokeColor: color,
              strokeOpacity: 0.9,
              strokeWeight: 2,
              fillColor: color,
              fillOpacity: 0.18,
              zIndex: 15,
              clickable: true,
            });
          }

          if (overlay) {
            const targetOverlay = overlay;
            let labelMarker: google.maps.Marker | null = null;
            if (center && geo.nombre) {
              const labelIcon = makeGeofenceLabelIcon(geo.nombre, color);
              labelMarker = new google.maps.Marker({
                map,
                position: center,
                icon: labelIcon,
                zIndex: 16,
              });
            }

            const showInfo = (customPos?: google.maps.LatLng | null) => {
              if (!map) return;
              if (!infoWindowRef.current) {
                infoWindowRef.current = new google.maps.InfoWindow({
                  zIndex: 999999,
                });
              }
              const pos =
                customPos ||
                (center ? new google.maps.LatLng(center.lat, center.lng) : null);
              if (pos) {
                infoWindowRef.current.setPosition(pos);
                infoWindowRef.current.setContent(`
                  <div style="font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 6px 8px; min-width: 160px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span style="display: inline-block; width: 11px; height: 11px; border-radius: 50%; background: ${color}; border: 2px solid #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.25);"></span>
                      <strong style="font-size: 13px; font-weight: 700; color: #0F172A;">${escapeXml(geo.nombre)}</strong>
                    </div>
                    <div style="font-size: 11px; color: #64748B; margin-top: 4px; display: flex; align-items: center; gap: 6px;">
                      <span style="display: inline-block; padding: 1px 5px; border-radius: 4px; background: #F1F5F9; color: #334155; font-weight: 600; font-size: 10px;">
                        ${geo.tipo === 'circle' ? 'Círculo' : 'Polígono'}
                      </span>
                      ${
                        geo.tipo === 'circle' && radius
                          ? `<span>Radio: ${
                              radius >= 1000
                                ? (radius / 1000).toFixed(1) + ' km'
                                : Math.round(radius) + ' m'
                            }</span>`
                          : ''
                      }
                      ${
                        geo.tipo === 'polygon' && pointCount
                          ? `<span>${pointCount} vértices</span>`
                          : ''
                      }
                    </div>
                    ${
                      geo.descripcion
                        ? `<div style="font-size: 11px; color: #475569; margin-top: 5px; line-height: 1.35;">${escapeXml(
                            geo.descripcion,
                          )}</div>`
                        : ''
                    }
                  </div>
                `);
                infoWindowRef.current.open(map);
              }
            };

            const highlight = () => {
              const originalStrokeWeight = 2;
              const originalFillOpacity = 0.18;
              targetOverlay.setOptions({
                strokeWeight: 4.5,
                fillOpacity: 0.38,
              });
              setTimeout(() => {
                targetOverlay.setOptions({
                  strokeWeight: originalStrokeWeight,
                  fillOpacity: originalFillOpacity,
                });
              }, 1800);
            };

            overlay.addListener('click', (e: google.maps.MapMouseEvent) => {
              setSelectedGeofenceId(geo.id);
              showInfo(e.latLng);
            });

            if (labelMarker) {
              labelMarker.addListener('click', () => {
                setSelectedGeofenceId(geo.id);
                showInfo();
              });
            }

            const itemData: GeofenceListItem = {
              id: geo.id,
              nombre: geo.nombre,
              tipo: geo.tipo === 'circle' ? 'circle' : 'polygon',
              color,
              descripcion: geo.descripcion,
              center,
              radius,
              pointCount,
            };

            newRegistered.set(geo.id, {
              item: itemData,
              overlay,
              labelMarker,
              bounds,
              showInfo,
              highlight,
            });

            newList.push(itemData);
          }
        });

        registeredMapRef.current = newRegistered;
        setGeofencesList(newList);
        setGeofenceCount(newList.length);
      } catch (err) {
        console.error('Error al cargar geocercas en el mapa:', err);
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    loadAndRender();

    return () => {
      isCancelled = true;
      clearOverlays();
    };
  }, [map, active, reloadTrigger, clearOverlays]);

  return {
    loading,
    geofenceCount,
    geofencesList,
    selectedGeofenceId,
    focusGeofence,
    fitAllGeofences,
    refetch,
    clearOverlays,
  };
}
