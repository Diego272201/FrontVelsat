'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './serviciosrutas.css';
import { Crosshair, MapPin, Minus, Plus } from 'lucide-react';
import { MAP_TYPES, readDefaultMapType, toMapTypeId, type MapTypeId } from '@/app/components/MapTypeSelector';
import { GOOGLE_TILES_MAX_ZOOM, googleTileLayer } from '@/lib/googleTiles';
import { LIMA_CENTER } from '../geocercas/types';
import { PosicionConductor, RutaVista } from './types';
import { agruparDestinos } from './utils';

const MIN_ZOOM = 3;

const ICONO_BANDERA =
  '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#FBBF24" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>';

const escapar = (texto: string) =>
  texto.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);

/**
 * Línea de la ruta: el recorrido por calles (OpenRouteService). Mientras carga, o si falló, se usa
 * el trazado de la API (o los paraderos unidos) solo como respaldo y se dibuja punteado.
 */
const lineaDe = (r: RutaVista): L.LatLngExpression[] =>
  r.lineaCalles && r.lineaCalles.length >= 2
    ? r.lineaCalles
    : r.trazado && r.trazado.length >= 2
      ? r.trazado
      : r.paraderos.map((p) => [p.latitud, p.longitud] as [number, number]);

const ICONO_FLECHA =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="#fff" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"><path d="M12 3 19 20 12 16 5 20Z"/></svg>';

export interface FocoMapa {
  lat: number;
  lng: number;
  /** Cambia en cada pedido para volver a centrar aunque sea el mismo punto. */
  clave: number;
}

interface MapaRutasProps {
  /** Solo las rutas visibles (marcadas en la lista). */
  rutas: RutaVista[];
  /** Conductores en vivo (se refresca cada 5 s). */
  posiciones: PosicionConductor[];
  /** Color de cada ruta, para pintar el vehículo de la ruta que hace. */
  colorPorRuta: Record<number, string>;
  seleccionadaId: number | null;
  /** Ruta bajo el mouse en la lista: se resalta sin seleccionarla. */
  resaltadaId: number | null;
  /** Paraderos ya marcados del servicio que se está mirando en la ruta seleccionada. */
  paraderosCompletados: number;
  onSeleccionar: (id: number) => void;
  foco: FocoMapa | null;
  /** Ancho que tapa el panel flotante de la derecha, para encuadrar las rutas a su izquierda. */
  margenDerecho: number;
  /** Al cambiar, el mapa vuelve a encuadrar (selección, rutas visibles, carga de datos). */
  claveEncuadre: string;
  /** Botones extra arriba a la izquierda (p. ej. abrir la lista en móvil). */
  accesosIzquierda?: React.ReactNode;
}

// Mapa de rutas: Leaflet + tiles públicos de Google (igual que geocercas), sin la Maps
// JavaScript API de pago. Se carga solo en el navegador (dynamic import con ssr: false).
const MapaRutas: React.FC<MapaRutasProps> = ({
  rutas,
  posiciones,
  colorPorRuta,
  seleccionadaId,
  resaltadaId,
  paraderosCompletados,
  onSeleccionar,
  foco,
  margenDerecho,
  claveEncuadre,
  accesosIzquierda,
}) => {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const vehiculosRef = useRef<Map<string, L.Marker>>(new Map());
  const [mapReady, setMapReady] = useState(false);
  const [mapType, setMapType] = useState<MapTypeId>(readDefaultMapType);

  // Los handlers de Leaflet se crean una vez por dibujo: leen siempre la última versión.
  const onSeleccionarRef = useRef(onSeleccionar);
  onSeleccionarRef.current = onSeleccionar;
  const datosRef = useRef({ rutas, seleccionadaId, margenDerecho });
  datosRef.current = { rutas, seleccionadaId, margenDerecho };

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
    setMapReady(true);

    // El contenedor cambia de tamaño al ocultar la lista o redimensionar la ventana.
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(mapDivRef.current);

    const vehiculos = vehiculosRef.current;
    return () => {
      observer.disconnect();
      vehiculos.clear();
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
    // La anterior se retira cuando la nueva cargó, para no ver el mapa en blanco
    if (previous) {
      const removePrevious = () => previous.remove();
      next.once('load', removePrevious);
      const fallback = window.setTimeout(removePrevious, 3000);
      return () => window.clearTimeout(fallback);
    }
  }, [mapType, mapReady]);

  // Al guardar Configuración > Preferencias se aplica el nuevo tipo sin recargar
  useEffect(() => {
    const handleSettingsUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.key === 'preferences' && detail.value?.mapType) {
        setMapType(toMapTypeId(detail.value.mapType));
      }
    };
    window.addEventListener('trackvel:settings-updated', handleSettingsUpdate);
    return () => window.removeEventListener('trackvel:settings-updated', handleSettingsUpdate);
  }, []);

  /* ------------------------------------------------------------------ */
  /* Dibujo de rutas, paraderos y destinos                               */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const capa = L.layerGroup().addTo(map);
    const haySeleccion = seleccionadaId !== null && rutas.some((r) => r.id === seleccionadaId);
    // La seleccionada y la resaltada se dibujan al final para quedar encima.
    const peso = (r: RutaVista) => (r.id === seleccionadaId ? 2 : r.id === resaltadaId ? 1 : 0);
    const orden = [...rutas].sort((a, b) => peso(a) - peso(b));

    for (const r of orden) {
      const activa = r.id === seleccionadaId;
      const resaltada = r.id === resaltadaId;
      const atenuada = haySeleccion && !activa && !resaltada;
      const linea = lineaDe(r);
      const seleccionar = (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        onSeleccionarRef.current(r.id);
      };

      if (linea.length >= 2) {
        // Borde blanco bajo la ruta activa para que se lea sobre cualquier fondo.
        if (activa || resaltada) {
          L.polyline(linea, {
            color: '#ffffff',
            weight: activa ? 10 : 8,
            opacity: 0.95,
            interactive: false,
          }).addTo(capa);
        }
        const porCalles = !!r.lineaCalles && r.lineaCalles.length >= 2;
        L.polyline(linea, {
          color: r.color,
          weight: activa ? 6 : resaltada ? 5 : 4,
          opacity: atenuada ? 0.3 : porCalles ? 0.92 : 0.6,
          // Punteado = trazado aproximado (todavía no llegó, o falló, el recorrido por calles).
          dashArray: porCalles ? undefined : '6 8',
          lineCap: 'round',
          lineJoin: 'round',
        })
          .bindTooltip(`<b>${escapar(r.codigo)}</b> · ${escapar(r.nombre)}`, {
            sticky: true,
            className: 'sr-tip',
          })
          .on('click', seleccionar)
          .addTo(capa);
      }

      // Paraderos (el destino se dibuja aparte, compartido entre rutas)
      const ultimo = r.paraderos.length - 1;
      r.paraderos.forEach((p, i) => {
        if (i === ultimo && ultimo > 0) return;
        const posicion: L.LatLngExpression = [p.latitud, p.longitud];
        const textoTip = `<b>${i + 1}. ${escapar(p.nombre)}</b><br/><span style="font-weight:500;color:#64748b">${escapar(r.codigo)} · ${
          i === 0 ? 'Inicio de ruta' : `+${p.minutosAcumulados} min`
        }</span>`;

        if (i === 0) {
          const lado = activa ? 20 : 14;
          L.marker(posicion, {
            icon: L.divIcon({
              className: 'sr-icono',
              html: `<div class="sr-origen" style="background:${r.color};opacity:${atenuada ? 0.55 : 1}">${activa ? 1 : ''}</div>`,
              iconSize: [lado, lado],
              iconAnchor: [lado / 2, lado / 2],
            }),
            zIndexOffset: activa ? 800 : 400,
          })
            .bindTooltip(textoTip, { direction: 'top', offset: [0, -8], className: 'sr-tip' })
            .on('click', seleccionar)
            .addTo(capa);
          return;
        }

        if (activa) {
          const hecha = i < paraderosCompletados;
          L.marker(posicion, {
            icon: L.divIcon({
              className: 'sr-icono',
              html: `<div class="sr-parada${hecha ? ' sr-parada--hecha' : ''}" style="color:${r.color}"><span>${i + 1}</span></div>`,
              iconSize: [20, 20],
              iconAnchor: [10, 10],
            }),
            zIndexOffset: 700,
          })
            .bindTooltip(textoTip, { direction: 'top', offset: [0, -10], className: 'sr-tip' })
            .addTo(capa);
        } else if (!atenuada) {
          L.circleMarker(posicion, {
            radius: resaltada ? 4.5 : 3.5,
            color: r.color,
            weight: 2,
            fillColor: '#ffffff',
            fillOpacity: 1,
          })
            .bindTooltip(textoTip, { direction: 'top', offset: [0, -4], className: 'sr-tip' })
            .on('click', seleccionar)
            .addTo(capa);
        }
      });
    }

    // Destino: un solo marcador cuando varias rutas terminan en el mismo punto.
    for (const d of agruparDestinos(rutas)) {
      const compartido = d.rutaIds.length > 1;
      L.marker([d.lat, d.lng], {
        icon: L.divIcon({
          className: 'sr-icono',
          html: `<div class="sr-destino">${ICONO_BANDERA}</div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        }),
        zIndexOffset: 1000,
      })
        .bindTooltip(
          `Destino · ${escapar(d.nombre)}${compartido ? ` <span style="font-weight:500;opacity:.7">(${d.rutaIds.length} rutas)</span>` : ''}`,
          { permanent: true, direction: 'right', offset: [18, 0], className: 'sr-tip-destino' },
        )
        .addTo(capa);
    }

    return () => {
      capa.remove();
    };
  }, [rutas, seleccionadaId, resaltadaId, paraderosCompletados, mapReady]);

  /* ------------------------------------------------------------------ */
  /* Conductores en vivo                                                 */
  /* ------------------------------------------------------------------ */
  // Los marcadores se reutilizan entre refrescos: solo se mueven y giran (con transición CSS).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const marcadores = vehiculosRef.current;
    const vigentes = new Set<string>();

    for (const p of posiciones) {
      vigentes.add(p.clave);
      const color = (p.rutaId !== null && colorPorRuta[p.rutaId]) || '#0f1f4b';
      const html = `<div class="sr-vehiculo" style="background:${color}"><div class="sr-vehiculo__flecha" style="transform:rotate(${p.rumbo}deg)">${ICONO_FLECHA}</div></div>`;
      const partes = [
        p.deviceID ? `<b>${escapar(p.deviceID)}</b>` : '',
        p.conductor ? escapar(p.conductor) : '',
        p.velocidad !== null ? `${Math.round(p.velocidad)} km/h` : '',
      ].filter(Boolean);
      const tip = partes.join(' · ') || 'Conductor';

      const existente = marcadores.get(p.clave);
      if (existente) {
        const el = existente.getElement();
        const anterior = existente.getLatLng();
        if (el && (anterior.lat !== p.lat || anterior.lng !== p.lng)) {
          el.classList.add('sr-vehiculo-mover');
          window.setTimeout(() => el.classList.remove('sr-vehiculo-mover'), 1300);
        }
        existente.setLatLng([p.lat, p.lng]);
        const flecha = existente.getElement()?.querySelector<HTMLElement>('.sr-vehiculo__flecha');
        const caja = existente.getElement()?.querySelector<HTMLElement>('.sr-vehiculo');
        if (flecha) flecha.style.transform = `rotate(${p.rumbo}deg)`;
        if (caja) caja.style.background = color;
        existente.setTooltipContent(tip);
      } else {
        const marcador = L.marker([p.lat, p.lng], {
          icon: L.divIcon({ className: 'sr-icono sr-vehiculo-icono', html, iconSize: [30, 30], iconAnchor: [15, 15] }),
          zIndexOffset: 2000,
        })
          .bindTooltip(tip, { direction: 'top', offset: [0, -14], className: 'sr-tip' })
          .addTo(map);
        marcadores.set(p.clave, marcador);
      }
    }

    marcadores.forEach((m, clave) => {
      if (!vigentes.has(clave)) {
        m.remove();
        marcadores.delete(clave);
      }
    });
  }, [posiciones, colorPorRuta, mapReady]);

  /* ------------------------------------------------------------------ */
  /* Encuadre                                                            */
  /* ------------------------------------------------------------------ */
  const encuadrar = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const { rutas: todas, seleccionadaId: sel, margenDerecho: margen } = datosRef.current;
    const objetivo = sel !== null && todas.some((r) => r.id === sel) ? todas.filter((r) => r.id === sel) : todas;
    const puntos: L.LatLngExpression[] = objetivo.flatMap((r) => [
      ...lineaDe(r),
      ...r.paraderos.map((p) => [p.latitud, p.longitud] as [number, number]),
    ]);
    if (puntos.length === 0) return;
    map.fitBounds(L.latLngBounds(puntos), {
      paddingTopLeft: [60, 70],
      paddingBottomRight: [margen + 40, 60],
      maxZoom: 16,
    });
  }, []);

  useEffect(() => {
    if (!mapReady) return;
    encuadrar();
  }, [claveEncuadre, mapReady, encuadrar]);

  // Centrar en un paradero elegido en el panel
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !foco) return;
    map.setView([foco.lat, foco.lng], Math.max(map.getZoom(), 17), { animate: true });
  }, [foco, mapReady]);

  const zoomBy = useCallback((delta: number) => {
    const map = mapRef.current;
    if (!map) return;
    map.setZoom(Math.max(MIN_ZOOM, Math.min(GOOGLE_TILES_MAX_ZOOM, map.getZoom() + delta)));
  }, []);

  const botonZoom =
    'flex h-8 w-8 items-center justify-center text-slate-700 transition hover:bg-blue-50 hover:text-[#1E40AF]';

  return (
    <div className="absolute inset-0">
      <div ref={mapDivRef} className="absolute inset-0 z-0 bg-slate-100" />

      {!mapReady && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100">
          <div className="flex flex-col items-center gap-2">
            <MapPin size={26} className="animate-pulse text-[#1E40AF]" />
            <p className="text-[12px] font-medium text-slate-500">Cargando mapa…</p>
          </div>
        </div>
      )}

      {mapReady && (
        <>
          {/* Tipo de mapa + zoom */}
          <div className="absolute left-3 top-3 z-10 flex flex-col items-start gap-2">
            <div className="flex items-center gap-2">
              {accesosIzquierda}
              <div className="flex rounded-lg border border-slate-200 bg-white p-1 shadow-md">
                {MAP_TYPES.map(({ id, label, Icon, title }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setMapType(id)}
                    title={title}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-semibold transition-colors ${
                      mapType === id ? 'bg-[#1E40AF] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon size={13} strokeWidth={2.4} />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-md">
              <button type="button" onClick={() => zoomBy(1)} title="Acercar" className={botonZoom}>
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
                title={seleccionadaId !== null ? 'Encuadrar la ruta' : 'Ver todas las rutas'}
                className={`${botonZoom} border-t border-slate-100`}
              >
                <Crosshair size={16} />
              </button>
            </div>
          </div>

          {/* Leyenda */}
          <div className="absolute bottom-3 left-3 z-10 hidden items-center gap-4 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11.5px] font-medium text-slate-600 shadow-md sm:flex">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[2px] bg-[#0f1f4b]" /> Destino
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[2px] bg-slate-500" /> Inicio de ruta
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full border-2 border-slate-500 bg-white" /> Parada
            </span>
          </div>
        </>
      )}
    </div>
  );
};

export default MapaRutas;
