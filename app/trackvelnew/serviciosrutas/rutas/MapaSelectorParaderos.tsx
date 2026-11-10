'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../serviciosrutas.css';
import { Crosshair, Loader2, MapPin, Minus, Plus, Search } from 'lucide-react';
import {
  MAP_TYPES,
  readDefaultMapType,
  toMapTypeId,
  type MapTypeId,
} from '@/app/components/MapTypeSelector';
import { GOOGLE_TILES_MAX_ZOOM, googleTileLayer } from '@/lib/googleTiles';
import { LIMA_CENTER } from '../../geocercas/types';
import type { Punto } from './trazado';
import { AccionesTrazado, useCapaTrazado } from './useCapaTrazado';

const MIN_ZOOM = 3;
const COLOR = '#1E40AF';

/** Paradero ya con coordenadas válidas; `indice` es su posición en la lista completa del formulario. */
export interface PuntoParadero {
  indice: number;
  nombre: string;
  lat: number;
  lng: number;
  radio: number;
}

export interface FocoSelector {
  lat: number;
  lng: number;
  /** Cambia en cada pedido para volver a centrar aunque sea el mismo punto. */
  clave: number;
}

interface MapaSelectorParaderosProps {
  puntos: PuntoParadero[];
  /** Total de paraderos del formulario (para saber cuál es origen y destino). */
  total: number;
  /** Paradero seleccionado en la lista / mapa. */
  activo: number | null;
  /** Paradero esperando clic en el mapa para ubicar sus coordenadas. */
  colocando?: number | null;
  /** Clic en un lugar vacío del mapa. */
  onClickMapa: (lat: number, lng: number) => void;
  /** Se arrastró un marcador a otro lugar. */
  onMover: (indice: number, lat: number, lng: number) => void;
  onSeleccionar: (indice: number) => void;
  foco: FocoSelector | null;
  /** Al cambiar, el mapa vuelve a encuadrar todos los paraderos. */
  claveEncuadre: string;
  /** 'paraderos': se ubican paraderos. 'trazado': se edita la línea (los paraderos quedan de referencia). */
  modo: 'paraderos' | 'trazado';
  trazado: readonly Punto[];
  puntoSeleccionado: number | null;
  accionesTrazado: AccionesTrazado;
  /** Avisa si hay demasiados puntos a la vista para mostrar los tiradores. */
  onDemasiadosPuntos: (demasiados: boolean) => void;
}

const escapar = (texto: string) =>
  texto.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ] ?? c,
  );

/**
 * Mapa para colocar paraderos con un clic. Usa la misma estrategia que el monitoreo de rutas:
 * Leaflet + tiles públicos de Google y el mismo tipo de mapa preferido del usuario.
 * Se carga solo en el navegador (dynamic import con ssr: false).
 */
const MapaSelectorParaderos: React.FC<MapaSelectorParaderosProps> = ({
  puntos,
  total,
  activo,
  colocando = null,
  onClickMapa,
  onMover,
  onSeleccionar,
  foco,
  claveEncuadre,
  modo,
  trazado,
  puntoSeleccionado,
  accionesTrazado,
  onDemasiadosPuntos,
}) => {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapType, setMapType] = useState<MapTypeId>(readDefaultMapType);

  const [busqueda, setBusqueda] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [sinResultado, setSinResultado] = useState(false);

  // Los handlers de Leaflet se crean una vez: leen siempre la última versión.
  const handlers = useRef({ onClickMapa, onMover, onSeleccionar });
  handlers.current = { onClickMapa, onMover, onSeleccionar };
  const puntosRef = useRef(puntos);
  puntosRef.current = puntos;

  useEffect(() => {
    if (mapRef.current || !mapDivRef.current) return;

    const map = L.map(mapDivRef.current, {
      center: LIMA_CENTER,
      zoom: 12,
      minZoom: MIN_ZOOM,
      maxZoom: GOOGLE_TILES_MAX_ZOOM,
      zoomControl: false,
      attributionControl: false,
    });
    mapRef.current = map;
    map.on('click', (e: L.LeafletMouseEvent) =>
      handlers.current.onClickMapa(e.latlng.lat, e.latlng.lng),
    );
    setMapReady(true);

    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(mapDivRef.current);

    return () => {
      observer.disconnect();
      tileLayerRef.current = null;
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  // Capa base según el tipo de mapa elegido
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const next = googleTileLayer(mapType).addTo(map);
    next.bringToBack();
    const previous = tileLayerRef.current;
    tileLayerRef.current = next;
    if (previous) {
      const removePrevious = () => previous.remove();
      next.once('load', removePrevious);
      const fallback = window.setTimeout(removePrevious, 3000);
      return () => window.clearTimeout(fallback);
    }
  }, [mapType, mapReady]);

  useEffect(() => {
    const handleSettingsUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.key === 'preferences' && detail.value?.mapType) {
        setMapType(toMapTypeId(detail.value.mapType));
      }
    };
    window.addEventListener('trackvel:settings-updated', handleSettingsUpdate);
    return () =>
      window.removeEventListener(
        'trackvel:settings-updated',
        handleSettingsUpdate,
      );
  }, []);

  // Cursor tipo cruz solo cuando hay un paradero pendiente de ubicar o trazando
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    map
      .getContainer()
      .classList.toggle(
        'sr-mapa-colocando',
        modo === 'trazado' ||
          (modo === 'paraderos' && colocando !== null && colocando !== undefined),
      );
  }, [modo, colocando, mapReady]);

  useCapaTrazado({
    mapRef,
    mapReady,
    trazado,
    editable: modo === 'trazado',
    seleccionado: puntoSeleccionado,
    acciones: accionesTrazado,
    onDemasiados: onDemasiadosPuntos,
  });

  /* ------------------------------------------------------------------ */
  /* Dibujo de paraderos                                                 */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const capa = L.layerGroup().addTo(map);

    const editandoParaderos = modo === 'paraderos';

    for (const p of puntos) {
      const esActivo = p.indice === activo;
      const esOrigen = p.indice === 0;
      const esDestino = p.indice === total - 1 && total > 1;
      const radio = p.radio > 0 ? p.radio : 25;

      // Color de la geocerca según tipo de paradero
      const colorBorde = esOrigen
        ? '#059669'
        : esDestino
          ? '#1E3A8A'
          : '#2563EB';
      const colorRelleno = esOrigen
        ? '#10B981'
        : esDestino
          ? '#3B82F6'
          : '#60A5FA';

      // Geocerca de cada paradero (siempre dibujada en el mapa, interactiva y reactiva)
      const circulo = L.circle([p.lat, p.lng], {
        radius: radio,
        color: esActivo ? (esOrigen ? '#047857' : '#1D4ED8') : colorBorde,
        weight: esActivo ? 2.5 : 1.5,
        dashArray: esActivo ? '5 5' : undefined,
        fillColor: colorRelleno,
        fillOpacity: editandoParaderos ? (esActivo ? 0.3 : 0.16) : 0.08,
        interactive: editandoParaderos,
      }).addTo(capa);

      if (editandoParaderos) {
        circulo
          .bindTooltip(
            `<b>${p.indice + 1}. ${escapar(p.nombre || 'Sin nombre')}</b><br/><span style="color:#0284c7;font-weight:600">Geocerca: radio ${radio} m</span>`,
            { direction: 'top', className: 'sr-tip' },
          )
          .on('click', () => handlers.current.onSeleccionar(p.indice))
          .on('mouseover', () => {
            circulo.setStyle({
              fillOpacity: esActivo ? 0.42 : 0.28,
              weight: esActivo ? 3 : 2,
            });
          })
          .on('mouseout', () => {
            circulo.setStyle({
              fillOpacity: esActivo ? 0.3 : 0.16,
              weight: esActivo ? 2.5 : 1.5,
            });
          });
      }

      const clase = esOrigen
        ? 'sr-sel sr-sel--origen'
        : esDestino
          ? 'sr-sel sr-sel--destino'
          : 'sr-sel';
      const lado = esActivo ? 30 : 24;
      const marcador = L.marker([p.lat, p.lng], {
        draggable: editandoParaderos,
        // En modo trazado son solo referencia: no tapan los clics sobre la línea.
        interactive: editandoParaderos,
        opacity: editandoParaderos ? 1 : 0.75,
        icon: L.divIcon({
          className: 'sr-icono',
          html: `<div class="${clase}${esActivo ? ' sr-sel--activo' : ''}">${p.indice + 1}</div>`,
          iconSize: [lado, lado],
          iconAnchor: [lado / 2, lado / 2],
        }),
        zIndexOffset: esActivo ? 1000 : 0,
      })
        .bindTooltip(
          `<b>${p.indice + 1}. ${escapar(p.nombre || 'Sin nombre')}</b><br/><span style="font-weight:500;color:#64748b">${
            esOrigen ? 'Origen' : esDestino ? 'Destino' : 'Intermedio'
          } · radio ${radio} m</span>`,
          { direction: 'top', offset: [0, -lado / 2], className: 'sr-tip' },
        )
        .on('click', () => handlers.current.onSeleccionar(p.indice))
        .on('drag', (e) => {
          const pos = (e.target as L.Marker).getLatLng();
          circulo.setLatLng(pos);
        })
        .on('dragend', (e) => {
          const { lat, lng } = (e.target as L.Marker).getLatLng();
          handlers.current.onMover(p.indice, lat, lng);
        })
        .addTo(capa);
      void marcador;
    }

    return () => {
      capa.remove();
    };
  }, [puntos, activo, total, mapReady, modo]);

  /* ------------------------------------------------------------------ */
  /* Encuadre                                                            */
  /* ------------------------------------------------------------------ */
  const trazadoRef = useRef(trazado);
  trazadoRef.current = trazado;

  const encuadrar = useCallback(() => {
    const map = mapRef.current;
    const lista: Array<[number, number]> = [
      ...puntosRef.current.map((p) => [p.lat, p.lng] as [number, number]),
      ...trazadoRef.current,
    ];
    if (!map || lista.length === 0) return;
    map.fitBounds(L.latLngBounds(lista), {
      padding: [60, 60],
      maxZoom: 17,
    });
  }, []);

  useEffect(() => {
    if (!mapReady) return;
    encuadrar();
  }, [claveEncuadre, mapReady, encuadrar]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !foco) return;
    map.setView([foco.lat, foco.lng], Math.max(map.getZoom(), 17), {
      animate: true,
    });
  }, [foco, mapReady]);

  const zoomBy = useCallback((delta: number) => {
    const map = mapRef.current;
    if (!map) return;
    map.setZoom(
      Math.max(
        MIN_ZOOM,
        Math.min(GOOGLE_TILES_MAX_ZOOM, map.getZoom() + delta),
      ),
    );
  }, []);

  /* ------------------------------------------------------------------ */
  /* Búsqueda de direcciones (Nominatim / OpenStreetMap)                 */
  /* ------------------------------------------------------------------ */
  const buscar = async (e: React.FormEvent) => {
    e.preventDefault();
    const texto = busqueda.trim();
    const map = mapRef.current;
    if (!texto || !map) return;
    setBuscando(true);
    setSinResultado(false);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=pe&q=${encodeURIComponent(texto)}`,
        { headers: { 'Accept-Language': 'es' } },
      );
      const datos: Array<{ lat: string; lon: string }> = await res.json();
      if (datos.length === 0) {
        setSinResultado(true);
      } else {
        map.setView(
          [Number(datos[0].lat), Number(datos[0].lon)],
          Math.max(map.getZoom(), 17),
          { animate: true },
        );
      }
    } catch {
      setSinResultado(true);
    } finally {
      setBuscando(false);
    }
  };

  const botonZoom =
    'flex h-8 w-8 items-center justify-center text-slate-700 transition hover:bg-blue-50 hover:text-[#1E40AF]';

  return (
    <div className="absolute inset-0">
      <div ref={mapDivRef} className="absolute inset-0 z-0 bg-slate-100" />

      {!mapReady && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100">
          <div className="flex flex-col items-center gap-2">
            <MapPin size={26} className="animate-pulse text-[#1E40AF]" />
            <p className="text-[12px] font-medium text-slate-500">
              Cargando mapa…
            </p>
          </div>
        </div>
      )}

      {mapReady && (
        <>
          <div className="absolute left-3 top-3 z-10 flex flex-col items-start gap-2">
            <form
              onSubmit={buscar}
              className="flex h-9 w-72 max-w-[calc(100vw-2rem)] items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 shadow-md"
            >
              {buscando ? (
                <Loader2 size={15} className="animate-spin text-slate-400" />
              ) : (
                <Search size={15} className="text-slate-400" />
              )}
              <input
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  setSinResultado(false);
                }}
                placeholder="Buscar dirección o lugar…"
                className="min-w-0 flex-1 bg-transparent text-[12.5px] text-slate-800 outline-none placeholder:text-slate-400"
              />
            </form>
            {sinResultado && (
              <p className="rounded-md bg-white px-2.5 py-1 text-[11.5px] font-medium text-red-600 shadow-md">
                No se encontró ese lugar
              </p>
            )}

            <div className="flex rounded-lg border border-slate-200 bg-white p-1 shadow-md">
              {MAP_TYPES.map(({ id, label, Icon, title }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setMapType(id)}
                  title={title}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-semibold transition-colors ${
                    mapType === id
                      ? 'bg-[#1E40AF] text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon size={13} strokeWidth={2.4} />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>

            <div className="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-md">
              <button
                type="button"
                onClick={() => zoomBy(1)}
                title="Acercar"
                className={botonZoom}
              >
                <Plus size={17} />
              </button>
              <button
                type="button"
                onClick={() => zoomBy(-1)}
                title="Alejar"
                className={`${botonZoom} border-t border-slate-100`}
              >
                <Minus size={17} />
              </button>
              <button
                type="button"
                onClick={encuadrar}
                title="Ver todos los paraderos"
                className={`${botonZoom} border-t border-slate-100`}
              >
                <Crosshair size={16} />
              </button>
            </div>
          </div>

          {/* Indicación de qué hará el próximo clic */}
          {modo === 'trazado' && (
            <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 w-max max-w-[92%] -translate-x-1/2 rounded-full bg-[#0f1f4b]/90 px-4 py-1.5 text-center text-[12px] font-semibold text-white shadow-lg">
              Clic en el mapa: agrega un punto · clic sobre la línea: lo inserta · arrastra para mover · clic derecho: borra
            </div>
          )}
          {modo === 'paraderos' &&
            colocando !== null &&
            colocando !== undefined && (
              <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 w-max max-w-[92%] -translate-x-1/2 rounded-full bg-[#0f1f4b]/90 px-4 py-1.5 text-center text-[12px] font-semibold text-white shadow-lg">
                Haz clic en el mapa para ubicar el paradero {colocando + 1}
              </div>
            )}
        </>
      )}
    </div>
  );
};

export default MapaSelectorParaderos;
