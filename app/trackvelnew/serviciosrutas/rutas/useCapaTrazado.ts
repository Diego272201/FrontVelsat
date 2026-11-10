'use client';

import { MutableRefObject, useEffect, useRef } from 'react';
import L from 'leaflet';
import type { Punto } from './trazado';

const COLOR = '#e11d48';
/** Con más puntos visibles que esto no se dibujan los tiradores (hay que acercar el mapa). */
export const MAX_TIRADORES = 600;

export interface AccionesTrazado {
  /** Clic sobre la línea: nuevo punto entre `indice` e `indice + 1`. */
  onInsertar: (indice: number, lat: number, lng: number) => void;
  onMover: (indice: number, lat: number, lng: number) => void;
  onSeleccionar: (indice: number) => void;
  /** Clic derecho sobre un punto. */
  onEliminar: (indice: number) => void;
}

interface Opciones {
  mapRef: MutableRefObject<L.Map | null>;
  mapReady: boolean;
  trazado: readonly Punto[];
  /** true = se puede editar (modo trazado); false = solo se ve de referencia. */
  editable: boolean;
  seleccionado: number | null;
  acciones: AccionesTrazado;
  /** Avisa si hay demasiados puntos en pantalla para mostrar los tiradores. */
  onDemasiados: (demasiados: boolean) => void;
}

/** Índice del segmento del trazado más cercano al punto del mapa (en píxeles). */
function segmentoMasCercano(
  map: L.Map,
  trazado: readonly Punto[],
  latlng: L.LatLng,
): number {
  const p = map.latLngToLayerPoint(latlng);
  let mejor = 0;
  let menor = Infinity;
  for (let i = 0; i < trazado.length - 1; i++) {
    const a = map.latLngToLayerPoint(trazado[i]);
    const b = map.latLngToLayerPoint(trazado[i + 1]);
    const d = L.LineUtil.pointToSegmentDistance(p, a, b);
    if (d < menor) {
      menor = d;
      mejor = i;
    }
  }
  return mejor;
}

/**
 * Dibuja el trazado de la ruta sobre el mapa. En modo editable la línea acepta clics (insertar un
 * punto) y cada punto es un tirador que se arrastra, se selecciona o se borra con clic derecho.
 */
export function useCapaTrazado({
  mapRef,
  mapReady,
  trazado,
  editable,
  seleccionado,
  acciones,
  onDemasiados,
}: Opciones) {
  // Los handlers de Leaflet se crean en cada dibujo: leen siempre la última versión.
  const accionesRef = useRef(acciones);
  accionesRef.current = acciones;
  const demasiadosRef = useRef(onDemasiados);
  demasiadosRef.current = onDemasiados;

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const capaLinea = L.layerGroup().addTo(map);
    const capaTiradores = L.layerGroup().addTo(map);

    if (trazado.length >= 2) {
      const linea = L.polyline(trazado as Punto[], {
        color: COLOR,
        weight: editable ? 5 : 3,
        opacity: editable ? 0.9 : 0.55,
        interactive: editable,
        bubblingMouseEvents: false,
      }).addTo(capaLinea);
      if (editable) {
        linea.on('click', (e: L.LeafletMouseEvent) => {
          const i = segmentoMasCercano(map, trazado, e.latlng);
          accionesRef.current.onInsertar(i, e.latlng.lat, e.latlng.lng);
        });
      }
    }

    const dibujarTiradores = () => {
      capaTiradores.clearLayers();
      if (!editable) return;
      const visibles = map.getBounds().pad(0.1);
      const indices: number[] = [];
      for (let i = 0; i < trazado.length; i++) {
        // El inicio, el final y el punto elegido se muestran siempre.
        const siempre =
          i === 0 || i === trazado.length - 1 || i === seleccionado;
        if (siempre || visibles.contains(trazado[i])) indices.push(i);
      }
      const demasiados = indices.length > MAX_TIRADORES;
      demasiadosRef.current(demasiados);
      if (demasiados) return;

      for (const i of indices) {
        const esInicio = i === 0;
        const esFin = i === trazado.length - 1 && trazado.length > 1;
        const elegido = i === seleccionado;
        const lado = elegido ? 16 : esInicio || esFin ? 14 : 10;
        const clase = `sr-tir${esInicio ? ' sr-tir--inicio' : esFin ? ' sr-tir--fin' : ''}${elegido ? ' sr-tir--sel' : ''}`;
        L.marker(trazado[i], {
          draggable: true,
          bubblingMouseEvents: false,
          icon: L.divIcon({
            className: 'sr-icono',
            html: `<div class="${clase}"></div>`,
            iconSize: [lado, lado],
            iconAnchor: [lado / 2, lado / 2],
          }),
          zIndexOffset: elegido ? 900 : esInicio || esFin ? 500 : 0,
          title: esInicio
            ? 'Inicio del trazado'
            : esFin
              ? 'Fin del trazado'
              : `Punto ${i + 1}`,
        })
          .on('click', () => accionesRef.current.onSeleccionar(i))
          .on('contextmenu', () => accionesRef.current.onEliminar(i))
          .on('dragend', (e) => {
            const { lat, lng } = (e.target as L.Marker).getLatLng();
            accionesRef.current.onMover(i, lat, lng);
          })
          .addTo(capaTiradores);
      }
    };

    dibujarTiradores();
    map.on('moveend', dibujarTiradores);

    return () => {
      map.off('moveend', dibujarTiradores);
      capaLinea.remove();
      capaTiradores.remove();
    };
  }, [mapRef, mapReady, trazado, editable, seleccionado]);
}
