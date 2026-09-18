'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  distanceMeters,
  formatDistance,
  pathLengthMeters,
  type LatLngPoint,
} from '@/lib/geoDistance';

const LINE_COLOR = '#113EB9';

type RulerLabel = google.maps.OverlayView & {
  update: (position: LatLngPoint, text: string) => void;
};

type RulerLabelCtor = new (
  position: LatLngPoint,
  text: string,
  variant: 'segment' | 'total',
) => RulerLabel;

let labelCtor: RulerLabelCtor | null = null;

/**
 * La clase se define en tiempo de ejecución porque `google.maps.OverlayView`
 * solo existe una vez que el script de Maps terminó de cargar.
 */
function getLabelCtor(): RulerLabelCtor {
  if (labelCtor) return labelCtor;

  class Label extends google.maps.OverlayView {
    private position: LatLngPoint;
    private text: string;
    private readonly variant: 'segment' | 'total';
    private div: HTMLDivElement | null = null;

    constructor(
      position: LatLngPoint,
      text: string,
      variant: 'segment' | 'total',
    ) {
      super();
      this.position = position;
      this.text = text;
      this.variant = variant;
    }

    onAdd(): void {
      const div = document.createElement('div');
      div.textContent = this.text;
      div.style.cssText = [
        'position:absolute',
        // El total se levanta para no taparse con el marcador del último punto
        this.variant === 'total'
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
        this.variant === 'total'
          ? `background:${LINE_COLOR};color:#fff;border:1px solid ${LINE_COLOR}`
          : 'background:#fff;color:#1f2937;border:1px solid #d1d5db',
      ].join(';');

      this.div = div;
      // floatPane queda por encima del resto y, al no recibir eventos, no
      // interfiere con los clics de medición sobre el mapa.
      this.getPanes()?.floatPane.appendChild(div);
    }

    draw(): void {
      if (!this.div) return;
      const projection = this.getProjection();
      if (!projection) return;

      const pixel = projection.fromLatLngToDivPixel(
        new google.maps.LatLng(this.position),
      );
      if (!pixel) return;

      this.div.style.left = `${pixel.x}px`;
      this.div.style.top = `${pixel.y}px`;
    }

    onRemove(): void {
      this.div?.remove();
      this.div = null;
    }

    update(position: LatLngPoint, text: string): void {
      this.position = position;
      this.text = text;
      if (this.div) this.div.textContent = text;
      this.draw();
    }
  }

  labelCtor = Label as unknown as RulerLabelCtor;
  return labelCtor;
}

/** Punto medio aproximado de un tramo, solo para ubicar la etiqueta. */
function midpoint(a: LatLngPoint, b: LatLngPoint): LatLngPoint {
  return { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
}

export interface MapRuler {
  points: LatLngPoint[];
  totalMeters: number;
  clear: () => void;
  undo: () => void;
}

/**
 * Regla para medir distancias sobre el mapa: clic para ir agregando puntos,
 * clic derecho para deshacer el último. Dibuja la ruta, los vértices y las
 * etiquetas de cada tramo, y devuelve el total acumulado.
 *
 * Al apagar la regla solo se deja de capturar clics: lo medido se queda
 * dibujado en el mapa hasta que se llame a `clear`.
 */
export function useMapRuler(
  map: google.maps.Map | null,
  active: boolean,
): MapRuler {
  const [points, setPoints] = useState<LatLngPoint[]>([]);

  const pathLineRef = useRef<google.maps.Polyline | null>(null);
  const guideLineRef = useRef<google.maps.Polyline | null>(null);
  const vertexRef = useRef<google.maps.Marker[]>([]);
  const labelsRef = useRef<RulerLabel[]>([]);
  const guideLabelRef = useRef<RulerLabel | null>(null);

  const clear = useCallback(() => {
    setPoints([]);
  }, []);

  const undo = useCallback(() => {
    setPoints((prev) => prev.slice(0, -1));
  }, []);

  // Escuchar los clics sobre el mapa mientras la regla está encendida
  useEffect(() => {
    if (!map || !active) return;

    const previousCursor = map.get('draggableCursor') as string | undefined;
    map.setOptions({
      draggableCursor: 'crosshair',
      disableDoubleClickZoom: true,
    });

    const clickListener = map.addListener(
      'click',
      (event: google.maps.MapMouseEvent) => {
        if (!event.latLng) return;
        const point = { lat: event.latLng.lat(), lng: event.latLng.lng() };

        setPoints((prev) => {
          const last = prev[prev.length - 1];
          // Evita el punto duplicado que deja un doble clic accidental
          if (last && distanceMeters(last, point) < 0.5) return prev;
          return [...prev, point];
        });
      },
    );

    const rightClickListener = map.addListener('contextmenu', () => {
      setPoints((prev) => prev.slice(0, -1));
    });

    return () => {
      google.maps.event.removeListener(clickListener);
      google.maps.event.removeListener(rightClickListener);
      map.setOptions({
        draggableCursor: previousCursor ?? null,
        disableDoubleClickZoom: false,
      });
    };
  }, [map, active]);

  // Línea elástica desde el último punto hasta el cursor
  useEffect(() => {
    if (!map || !active || points.length === 0) return;

    const guide = new google.maps.Polyline({
      map,
      clickable: false,
      strokeOpacity: 0,
      zIndex: 9,
      icons: [
        {
          icon: {
            path: 'M 0,-1 0,1',
            strokeOpacity: 0.9,
            strokeColor: LINE_COLOR,
            strokeWeight: 2,
            scale: 3,
          },
          offset: '0',
          repeat: '10px',
        },
      ],
    });
    guideLineRef.current = guide;

    const guideLabel = new (getLabelCtor())(
      points[points.length - 1],
      '',
      'segment',
    );
    guideLabelRef.current = guideLabel;

    const moveListener = map.addListener(
      'mousemove',
      (event: google.maps.MapMouseEvent) => {
        if (!event.latLng) return;
        const from = points[points.length - 1];
        const to = { lat: event.latLng.lat(), lng: event.latLng.lng() };

        guide.setPath([from, to]);

        if (!guideLabel.getMap()) guideLabel.setMap(map);
        guideLabel.update(
          midpoint(from, to),
          formatDistance(distanceMeters(from, to)),
        );
      },
    );

    return () => {
      google.maps.event.removeListener(moveListener);
      guide.setMap(null);
      guideLineRef.current = null;
      guideLabel.setMap(null);
      guideLabelRef.current = null;
    };
  }, [map, active, points]);

  // Dibujar la ruta medida: línea, vértices y etiqueta por tramo.
  // No depende de `active`: al cerrar la regla la medición queda en el mapa.
  useEffect(() => {
    if (!map) return;

    pathLineRef.current?.setMap(null);
    pathLineRef.current = null;
    vertexRef.current.forEach((marker) => marker.setMap(null));
    vertexRef.current = [];
    labelsRef.current.forEach((label) => label.setMap(null));
    labelsRef.current = [];

    if (points.length === 0) return;

    pathLineRef.current = new google.maps.Polyline({
      map,
      path: points,
      clickable: false,
      strokeColor: LINE_COLOR,
      strokeOpacity: 0.9,
      strokeWeight: 3,
      zIndex: 10,
    });

    vertexRef.current = points.map(
      (point, index) =>
        new google.maps.Marker({
          map,
          position: point,
          clickable: false,
          zIndex: 11,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: index === 0 ? 5.5 : 4.5,
            fillColor: index === 0 ? LINE_COLOR : '#ffffff',
            fillOpacity: 1,
            strokeColor: LINE_COLOR,
            strokeWeight: 2,
          },
        }),
    );

    const LabelCtor = getLabelCtor();

    for (let i = 1; i < points.length; i += 1) {
      const from = points[i - 1];
      const to = points[i];

      const segment = new LabelCtor(
        midpoint(from, to),
        formatDistance(distanceMeters(from, to)),
        'segment',
      );
      segment.setMap(map);
      labelsRef.current.push(segment);
    }

    // Total acumulado junto al último punto
    if (points.length > 1) {
      const total = new LabelCtor(
        points[points.length - 1],
        `Total ${formatDistance(pathLengthMeters(points))}`,
        'total',
      );
      total.setMap(map);
      labelsRef.current.push(total);
    }
  }, [map, points]);

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      pathLineRef.current?.setMap(null);
      guideLineRef.current?.setMap(null);
      guideLabelRef.current?.setMap(null);
      vertexRef.current.forEach((marker) => marker.setMap(null));
      labelsRef.current.forEach((label) => label.setMap(null));
    };
  }, []);

  return { points, totalMeters: pathLengthMeters(points), clear, undo };
}
