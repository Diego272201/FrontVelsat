import L from 'leaflet';
import { distanceMeters, LatLng, ShapeType } from './types';

/*
 * Utilidades Leaflet del mapa de geocercas. Reemplazan a las piezas de la
 * Maps JavaScript API (de pago) que usaba la página: marcadores, InfoWindow,
 * OverlayView y círculos/polígonos editables.
 */

export const toLatLng = (p: L.LatLng): LatLng => ({ lat: p.lat, lng: p.lng });

/** Icono de imagen centrado en el punto (equivale a scaledSize + anchor al centro). */
export function imageIcon(url: string, width: number, height: number): L.Icon {
  return L.icon({ iconUrl: url, iconSize: [width, height], iconAnchor: [width / 2, height / 2] });
}

/** Icono a partir de un SVG en texto, centrado en el punto. */
export function svgIcon(svg: string, width: number, height: number): L.Icon {
  return imageIcon(`data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`, width, height);
}

interface DotOptions {
  /** Radio en px (equivale a `scale` de google.maps.SymbolPath.CIRCLE). */
  radius: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  label?: string;
  labelColor?: string;
  cursor?: string;
}

/** Punto circular (vértices, centro y asas de las figuras). */
export function dotIcon({ radius, fill, stroke, strokeWidth, label, labelColor, cursor }: DotOptions): L.DivIcon {
  const size = radius * 2;
  const html = `<div style="width:${size}px;height:${size}px;box-sizing:border-box;border-radius:50%;background:${fill};border:${strokeWidth}px solid ${stroke};display:flex;align-items:center;justify-content:center;font:bold 11px 'IBM Plex Sans',-apple-system,sans-serif;color:${labelColor ?? stroke};cursor:${cursor ?? 'pointer'};">${label ?? ''}</div>`;
  return L.divIcon({ className: '', html, iconSize: [size, size], iconAnchor: [radius, radius] });
}

/** Deja que los clics atraviesen (o no) un marcador, como `clickable` en Google. */
export function setMarkerClickable(marker: L.Marker, clickable: boolean) {
  const el = marker.getElement();
  if (el) el.style.pointerEvents = clickable ? '' : 'none';
}

/** Cursor del mapa (equivale a `draggableCursor`). */
export function setMapCursor(map: L.Map, cursor: string | null) {
  map.getContainer().style.cursor = cursor ?? '';
}

/** Línea segmentada (equivale a la Polyline con el símbolo 'M 0,-1 0,1'). */
export function dashedLine(path: LatLng[], color: string, weight = 2.5): L.Polyline {
  return L.polyline(path, { color, weight, opacity: 1, dashArray: '6 6', interactive: false });
}

/**
 * Contenido HTML fijo a una coordenada (reemplaza a OverlayView).
 * `alignCenter` lo centra en el punto; si no, queda encima del punto.
 * Los botones con `data-visit-close` llaman a `onClose`.
 */
export function htmlOverlay(
  map: L.Map,
  position: LatLng,
  html: string,
  { offsetY = 0, alignCenter = false, onClose }: { offsetY?: number; alignCenter?: boolean; onClose?: () => void } = {},
): L.Marker {
  const transform = alignCenter ? 'translate(-50%,-50%)' : 'translate(-50%,-100%)';
  const marker = L.marker(position, {
    icon: L.divIcon({
      className: '',
      iconSize: [0, 0],
      iconAnchor: [0, 0],
      html: `<div style="position:absolute;left:0;top:${offsetY}px;transform:${transform};cursor:default;">${html}</div>`,
    }),
    zIndexOffset: alignCenter ? 900 : 1000,
    keyboard: false,
  }).addTo(map);

  const el = marker.getElement();
  if (el) {
    L.DomEvent.disableClickPropagation(el);
    L.DomEvent.disableScrollPropagation(el);
    if (onClose) {
      el.querySelectorAll('[data-visit-close]').forEach((btn) =>
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          onClose();
        }),
      );
    }
  }
  return marker;
}

/** Límites de un círculo sin depender de que esté proyectado en el mapa. */
export function circleBounds(center: LatLng, radius: number): L.LatLngBounds {
  const latDelta = (radius / 6378137) * (180 / Math.PI);
  const cosLat = Math.cos((center.lat * Math.PI) / 180) || 0.0001;
  const lngDelta = latDelta / cosLat;
  return L.latLngBounds(
    [center.lat - latDelta, center.lng - lngDelta],
    [center.lat + latDelta, center.lng + lngDelta],
  );
}

/** Punto al Este del centro, sobre el perímetro (donde va el asa del radio). */
export function eastPoint(center: LatLng, radius: number): LatLng {
  return {
    lat: center.lat,
    lng: center.lng + radius / (111320 * Math.cos((center.lat * Math.PI) / 180)),
  };
}

export interface ShapeStyle {
  color: string;
  fillOpacity: number;
  weight: number;
  /** false = los clics pasan al mapa (mientras se dibuja otra geocerca). */
  clickable: boolean;
}

const HANDLE_STYLE = { fill: '#ffffff', stroke: '#1447C0', strokeWidth: 2 };

/**
 * Círculo o polígono de geocerca que se puede ajustar en el mapa, como las
 * figuras `editable` + `draggable` de Google: asas en los vértices, puntos
 * medios para agregar vértices, asa de radio, y arrastrar la figura entera.
 */
export class GeoShape {
  readonly type: ShapeType;
  readonly layer: L.Circle | L.Polygon;
  private readonly map: L.Map;
  private readonly changeListeners = new Set<() => void>();
  private handles: L.LayerGroup | null = null;
  private editable = false;
  private dragging = false;

  constructor(
    map: L.Map,
    type: ShapeType,
    geometry: { center?: LatLng; radius?: number; path?: LatLng[] },
    style: ShapeStyle,
  ) {
    this.map = map;
    this.type = type;
    const pathOptions = GeoShape.pathOptions(style);
    this.layer =
      type === 'circle'
        ? L.circle(geometry.center!, { ...pathOptions, radius: geometry.radius! })
        : L.polygon(geometry.path!, pathOptions);
    this.layer.addTo(map);
    this.setClickable(style.clickable);
    this.layer.on('mousedown', this.startBodyDrag);
  }

  private static pathOptions(style: ShapeStyle): L.PathOptions {
    return {
      color: style.color,
      fillColor: style.color,
      fillOpacity: style.fillOpacity,
      weight: style.weight,
      opacity: 1,
    };
  }

  setStyle(style: ShapeStyle) {
    this.layer.setStyle(GeoShape.pathOptions(style));
    this.setClickable(style.clickable);
  }

  private setClickable(clickable: boolean) {
    const el = (this.layer as unknown as { _path?: SVGElement })._path;
    if (el) el.classList.toggle('leaflet-interactive', clickable);
  }

  onClick(handler: () => void) {
    this.layer.on('click', handler);
  }

  /** Se llama en cada cambio de la figura (arrastre, asas o valores). */
  onChange(listener: () => void): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  private emitChange() {
    this.changeListeners.forEach((listener) => listener());
  }

  /* ---------------------------- Geometría ---------------------------- */

  getCenter(): LatLng {
    return this.layer instanceof L.Circle
      ? toLatLng(this.layer.getLatLng())
      : toLatLng(L.latLngBounds(this.getPath()).getCenter());
  }

  getRadius(): number {
    return this.layer instanceof L.Circle ? this.layer.getRadius() : 0;
  }

  getPath(): LatLng[] {
    if (!(this.layer instanceof L.Polygon)) return [];
    const rings = this.layer.getLatLngs() as L.LatLng[][];
    return (rings[0] ?? []).map(toLatLng);
  }

  getBounds(): L.LatLngBounds {
    return this.layer instanceof L.Circle
      ? circleBounds(this.getCenter(), this.getRadius())
      : L.latLngBounds(this.getPath());
  }

  setCenter(center: LatLng) {
    if (!(this.layer instanceof L.Circle)) return;
    this.layer.setLatLng(center);
    this.afterGeometryChange();
  }

  setRadius(radius: number) {
    if (!(this.layer instanceof L.Circle)) return;
    this.layer.setRadius(radius);
    this.afterGeometryChange();
  }

  setPath(path: LatLng[]) {
    if (!(this.layer instanceof L.Polygon)) return;
    this.layer.setLatLngs(path);
    this.afterGeometryChange();
  }

  setVertex(index: number, point: LatLng) {
    const path = this.getPath();
    if (index < 0 || index >= path.length) return;
    path[index] = point;
    this.setPath(path);
  }

  removeVertex(index: number) {
    const path = this.getPath();
    path.splice(index, 1);
    this.setPath(path);
  }

  private afterGeometryChange() {
    if (this.editable) this.renderHandles();
    this.emitChange();
  }

  /* ----------------------------- Edición ----------------------------- */

  setEditable(editable: boolean) {
    if (this.editable === editable) return;
    this.editable = editable;
    if (editable) {
      this.renderHandles();
    } else {
      this.handles?.remove();
      this.handles = null;
    }
  }

  private handleMarker(position: LatLng, icon: L.DivIcon, title: string): L.Marker {
    return L.marker(position, { icon, draggable: true, title, zIndexOffset: 2000, keyboard: false });
  }

  private renderHandles() {
    this.handles?.remove();
    const group = L.layerGroup().addTo(this.map);
    this.handles = group;

    if (this.layer instanceof L.Circle) {
      const circle = this.layer;
      const center = this.getCenter();
      const radius = this.getRadius();

      const centerHandle = this.handleMarker(
        center,
        dotIcon({ radius: 6, ...HANDLE_STYLE, cursor: 'move' }),
        'Arrastra para mover el círculo',
      ).addTo(group);
      const radiusHandle = this.handleMarker(
        eastPoint(center, radius),
        dotIcon({ radius: 6, ...HANDLE_STYLE, cursor: 'ew-resize' }),
        'Arrastra para cambiar el radio',
      ).addTo(group);

      centerHandle.on('drag', () => {
        const c = toLatLng(centerHandle.getLatLng());
        circle.setLatLng(c);
        radiusHandle.setLatLng(eastPoint(c, circle.getRadius()));
        this.emitChange();
      });
      radiusHandle.on('drag', () => {
        const r = Math.max(1, distanceMeters(this.getCenter(), toLatLng(radiusHandle.getLatLng())));
        circle.setRadius(r);
        this.emitChange();
      });
      radiusHandle.on('dragend', () => this.renderHandles());
      return;
    }

    const polygon = this.layer;
    const path = this.getPath();

    // Vértices: arrastrar para mover
    path.forEach((point, index) => {
      const vertex = this.handleMarker(
        point,
        dotIcon({ radius: 6, ...HANDLE_STYLE, cursor: 'move' }),
        'Arrastra para mover el vértice',
      ).addTo(group);
      vertex.on('drag', () => {
        const current = this.getPath();
        current[index] = toLatLng(vertex.getLatLng());
        polygon.setLatLngs(current);
        this.emitChange();
      });
      vertex.on('dragend', () => this.renderHandles());
    });

    // Puntos medios: arrastrar para agregar un vértice entre dos existentes
    path.forEach((point, index) => {
      const next = path[(index + 1) % path.length];
      const mid = { lat: (point.lat + next.lat) / 2, lng: (point.lng + next.lng) / 2 };
      const midHandle = this.handleMarker(
        mid,
        dotIcon({ radius: 5, fill: 'rgba(255,255,255,0.65)', stroke: '#1447C0', strokeWidth: 1.5, cursor: 'copy' }),
        'Arrastra para agregar un vértice',
      ).addTo(group);
      let inserted = false;
      midHandle.on('drag', () => {
        const current = this.getPath();
        const p = toLatLng(midHandle.getLatLng());
        if (!inserted) {
          current.splice(index + 1, 0, p);
          inserted = true;
        } else {
          current[index + 1] = p;
        }
        polygon.setLatLngs(current);
        this.emitChange();
      });
      midHandle.on('dragend', () => this.renderHandles());
    });
  }

  // Arrastrar la figura entera (equivale a `draggable: true` de Google)
  private startBodyDrag = (event: L.LeafletMouseEvent) => {
    if (!this.editable || this.dragging) return;
    L.DomEvent.stop(event);
    this.dragging = true;
    this.map.dragging.disable();

    const start = event.latlng;
    const originalCenter = this.getCenter();
    const originalPath = this.getPath();

    const onMove = (e: L.LeafletMouseEvent) => {
      const dLat = e.latlng.lat - start.lat;
      const dLng = e.latlng.lng - start.lng;
      if (this.layer instanceof L.Circle) {
        this.layer.setLatLng({ lat: originalCenter.lat + dLat, lng: originalCenter.lng + dLng });
      } else {
        this.layer.setLatLngs(originalPath.map((p) => ({ lat: p.lat + dLat, lng: p.lng + dLng })));
      }
      this.handles?.remove();
      this.handles = null;
      this.emitChange();
    };

    const onUp = () => {
      this.map.off('mousemove', onMove);
      this.map.off('mouseup', onUp);
      document.removeEventListener('mouseup', onUp);
      this.map.dragging.enable();
      this.dragging = false;
      if (this.editable) this.renderHandles();
      this.emitChange();
    };

    this.map.on('mousemove', onMove);
    this.map.on('mouseup', onUp);
    document.addEventListener('mouseup', onUp);
  };

  remove() {
    this.setEditable(false);
    this.layer.off('mousedown', this.startBodyDrag);
    this.layer.remove();
    this.changeListeners.clear();
  }
}
