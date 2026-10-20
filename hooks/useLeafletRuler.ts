'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  distanceMeters,
  formatDistance,
  pathLengthMeters,
  type LatLngPoint,
} from '@/lib/geoDistance';
import type { MapRuler } from './useMapRuler';

const LINE_COLOR = '#113EB9';

function labelIcon(text: string, variant: 'segment' | 'total'): L.DivIcon {
  const style = [
    'position:absolute',
    // El total se levanta para no taparse con el marcador del último punto
    variant === 'total'
      ? 'transform:translate(-50%,-165%)'
      : 'transform:translate(-50%,-50%)',
    'pointer-events:none',
    'white-space:nowrap',
    'font-family:system-ui,-apple-system,Segoe UI,sans-serif',
    'font-size:11px',
    'font-weight:600',
    'line-height:1',
    'padding:4px 7px',
    'border-radius:6px',
    'box-shadow:0 1px 4px rgba(0,0,0,0.25)',
    variant === 'total'
      ? `background:${LINE_COLOR};color:#fff;border:1px solid ${LINE_COLOR}`
      : 'background:#fff;color:#1f2937;border:1px solid #d1d5db',
  ].join(';');

  const span = document.createElement('span');
  span.textContent = text;
  span.setAttribute('style', style);

  return L.divIcon({
    className: '',
    html: span.outerHTML,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function midpoint(a: LatLngPoint, b: LatLngPoint): LatLngPoint {
  return { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
}

/**
 * Versión Leaflet de `useMapRuler` (misma API): clic para agregar puntos,
 * clic derecho para deshacer. No usa ningún servicio de Google.
 */
export function useLeafletRuler(map: L.Map | null, active: boolean): MapRuler {
  const [points, setPoints] = useState<LatLngPoint[]>([]);
  const drawnRef = useRef<L.LayerGroup | null>(null);

  const clear = useCallback(() => setPoints([]), []);
  const undo = useCallback(() => setPoints((prev) => prev.slice(0, -1)), []);

  // Capturar clics sobre el mapa mientras la regla está encendida
  useEffect(() => {
    if (!map || !active) return;

    const container = map.getContainer();
    const previousCursor = container.style.cursor;
    container.style.cursor = 'crosshair';
    map.doubleClickZoom.disable();

    const onClick = (event: L.LeafletMouseEvent) => {
      const point = { lat: event.latlng.lat, lng: event.latlng.lng };
      setPoints((prev) => {
        const last = prev[prev.length - 1];
        // Evita el punto duplicado que deja un doble clic accidental
        if (last && distanceMeters(last, point) < 0.5) return prev;
        return [...prev, point];
      });
    };
    const onContextMenu = () => setPoints((prev) => prev.slice(0, -1));

    map.on('click', onClick);
    map.on('contextmenu', onContextMenu);

    return () => {
      map.off('click', onClick);
      map.off('contextmenu', onContextMenu);
      container.style.cursor = previousCursor;
      map.doubleClickZoom.enable();
    };
  }, [map, active]);

  // Línea elástica desde el último punto hasta el cursor
  useEffect(() => {
    if (!map || !active || points.length === 0) return;

    const from = points[points.length - 1];
    const guide = L.polyline([], {
      color: LINE_COLOR,
      weight: 2,
      opacity: 0.9,
      dashArray: '6 6',
      interactive: false,
    }).addTo(map);
    const guideLabel = L.marker(from, {
      icon: labelIcon('', 'segment'),
      interactive: false,
    });

    const onMove = (event: L.LeafletMouseEvent) => {
      const to = { lat: event.latlng.lat, lng: event.latlng.lng };
      guide.setLatLngs([from, to]);
      guideLabel
        .setLatLng(midpoint(from, to))
        .setIcon(labelIcon(formatDistance(distanceMeters(from, to)), 'segment'));
      if (!map.hasLayer(guideLabel)) guideLabel.addTo(map);
    };

    map.on('mousemove', onMove);

    return () => {
      map.off('mousemove', onMove);
      guide.remove();
      guideLabel.remove();
    };
  }, [map, active, points]);

  // Dibujar lo medido. No depende de `active`: al cerrar la regla queda en el mapa.
  useEffect(() => {
    if (!map) return;

    drawnRef.current?.remove();
    drawnRef.current = null;
    if (points.length === 0) return;

    const group = L.layerGroup().addTo(map);
    drawnRef.current = group;

    L.polyline(points, {
      color: LINE_COLOR,
      weight: 3,
      opacity: 0.9,
      interactive: false,
    }).addTo(group);

    points.forEach((point, index) => {
      L.circleMarker(point, {
        radius: index === 0 ? 5.5 : 4.5,
        color: LINE_COLOR,
        weight: 2,
        fillColor: index === 0 ? LINE_COLOR : '#ffffff',
        fillOpacity: 1,
        interactive: false,
      }).addTo(group);
    });

    for (let i = 1; i < points.length; i += 1) {
      L.marker(midpoint(points[i - 1], points[i]), {
        icon: labelIcon(formatDistance(distanceMeters(points[i - 1], points[i])), 'segment'),
        interactive: false,
      }).addTo(group);
    }

    if (points.length > 1) {
      L.marker(points[points.length - 1], {
        icon: labelIcon(`Total ${formatDistance(pathLengthMeters(points))}`, 'total'),
        interactive: false,
      }).addTo(group);
    }
  }, [map, points]);

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      drawnRef.current?.remove();
    };
  }, []);

  return { points, totalMeters: pathLengthMeters(points), clear, undo };
}
