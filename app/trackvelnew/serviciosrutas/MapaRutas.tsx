'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './serviciosrutas.css';
import { Crosshair, MapPin, Minus, Plus } from 'lucide-react';
import {
  MAP_TYPES,
  readDefaultMapType,
  toMapTypeId,
  type MapTypeId,
} from '@/app/components/MapTypeSelector';
import { GOOGLE_TILES_MAX_ZOOM, googleTileLayer } from '@/lib/googleTiles';
import { LIMA_CENTER } from '../geocercas/types';
import { PosicionConductor, RutaVista } from './types';
import { agruparDestinos } from './utils';

const MIN_ZOOM = 3;

const ICONO_BANDERA =
  '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#FBBF24" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>';

const escapar = (texto: string) =>
  texto.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ] ?? c,
  );

/**
 * Línea de la ruta: el trazado guardado, tal cual (se edita en Administrar rutas). Si la ruta aún no
 * tiene trazado se unen los paraderos con líneas rectas y se dibuja punteado.
 */
const lineaDe = (r: RutaVista): L.LatLngExpression[] =>
  r.trazado && r.trazado.length >= 2
    ? r.trazado
    : r.paraderos.map((p) => [p.latitud, p.longitud] as [number, number]);

/** Van tipo Mercedes-Benz Sprinter vista desde arriba, frente hacia el norte (rumbo 0°): carrocería blanca/gris con detalles negros. */
const ICONO_CARRO =
  '<svg viewBox="0 0 28 74" width="26" height="68" xmlns="http://www.w3.org/2000/svg">' +
  // llantas
  '<rect x="0.8" y="11" width="4" height="10" rx="1.6" fill="#0f172a"/><rect x="23.2" y="11" width="4" height="10" rx="1.6" fill="#0f172a"/>' +
  '<rect x="0.8" y="53" width="4" height="10" rx="1.6" fill="#0f172a"/><rect x="23.2" y="53" width="4" height="10" rx="1.6" fill="#0f172a"/>' +
  // espejos retrovisores
  '<path d="M3.6 19.5 .6 18.6c-.5 1.6-.2 3 .8 3.6l2.4.2Z" fill="#111827" stroke="#e5e7eb" stroke-width=".5"/><path d="M24.4 19.5l3-.9c.5 1.6.2 3-.8 3.6l-2.4.2Z" fill="#111827" stroke="#e5e7eb" stroke-width=".5"/>' +
  // carrocería
  '<path d="M9 1.8h10c3.6 0 5.5 1.7 5.7 5.2l.8 54.5c.1 3.9-1.9 6.7-5.4 6.7H7.9c-3.5 0-5.5-2.8-5.4-6.7L3.3 7C3.5 3.5 5.4 1.8 9 1.8Z" fill="#e5e7eb" stroke="#374151" stroke-width="1.2"/>' +
  // capó y líneas
  '<path d="M4.6 12.6c6-2.2 12.8-2.2 18.8 0" fill="none" stroke="#9ca3af" stroke-width=".8"/><path d="M14 3.8v7.2" stroke="#9ca3af" stroke-width=".7"/>' +
  // faros delanteros
  '<rect x="5.2" y="3.3" width="4.6" height="2" rx="1" fill="#fef9c3" stroke="#a16207" stroke-width=".3"/><rect x="18.2" y="3.3" width="4.6" height="2" rx="1" fill="#fef9c3" stroke="#a16207" stroke-width=".3"/>' +
  // parabrisas
  '<path d="M5.4 14.6c5.4-1.8 12.8-1.8 17.2 0l-1.1 8.2H6.5Z" fill="#0b0f19"/><path d="M8 16.2c3.2-.8 8.8-.8 12 0" stroke="#64748b" stroke-width=".6" fill="none" opacity=".7"/>' +
  // techo blanco
  '<rect x="5.3" y="25.2" width="17.4" height="38" rx="2.4" fill="#f9fafb"/>' +
  '<rect x="8.6" y="29" width="10.8" height="5.6" rx="1.2" fill="#e2e8f0" stroke="#cbd5e1" stroke-width=".5"/>' +
  '<path d="M5.3 40h17.4M5.3 46h17.4M5.3 52h17.4" stroke="#e2e8f0" stroke-width=".8"/>' +
  '<path d="M7.6 25.5v37.5M20.4 25.5v37.5" stroke="#cbd5e1" stroke-width=".6"/>' +
  // puerta trasera y luces
  '<path d="M6.8 65.4h14.4" stroke="#374151" stroke-width=".7"/>' +
  '<rect x="4.4" y="68.2" width="4" height="2.2" rx="1" fill="#ef4444"/><rect x="19.6" y="68.2" width="4" height="2.2" rx="1" fill="#ef4444"/>' +
  '</svg>';

/** Velocidad (km/h) bajo la cual el GPS no da un rumbo confiable: se conserva el último. */
const VELOCIDAD_MIN_RUMBO = 3;

/** Ángulo acumulado más cercano a `previo` que equivale a `objetivo` (gira por el lado corto, sin dar vueltas). */
const anguloCorto = (previo: number, objetivo: number): number => {
  const delta = ((((objetivo - previo) % 360) + 540) % 360) - 180;
  return previo + delta;
};

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
  /** IDs de rutas a enfocar específicamente al encuadrar (por ejemplo al hacer clic en un grupo). */
  encuadreIds?: number[] | null;
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
  encuadreIds,
  claveEncuadre,
  accesosIzquierda,
}) => {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const vehiculosRef = useRef<Map<string, L.Marker>>(new Map());
  /** Último ángulo acumulado por vehículo (evita vueltas de 340° al cruzar 360°→0°). */
  const angulosRef = useRef<Map<string, number>>(new Map());
  const [mapReady, setMapReady] = useState(false);
  const [mapType, setMapType] = useState<MapTypeId>(readDefaultMapType);

  // Los handlers de Leaflet se crean una vez por dibujo: leen siempre la última versión.
  const onSeleccionarRef = useRef(onSeleccionar);
  onSeleccionarRef.current = onSeleccionar;
  const datosRef = useRef({ rutas, seleccionadaId, margenDerecho, encuadreIds });
  datosRef.current = { rutas, seleccionadaId, margenDerecho, encuadreIds };

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
    return () =>
      window.removeEventListener(
        'trackvel:settings-updated',
        handleSettingsUpdate,
      );
  }, []);

  /* ------------------------------------------------------------------ */
  /* Dibujo de rutas, paraderos y destinos                               */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const capa = L.layerGroup().addTo(map);
    const haySeleccion =
      seleccionadaId !== null && rutas.some((r) => r.id === seleccionadaId);
    // La seleccionada y la resaltada se dibujan al final para quedar encima.
    const peso = (r: RutaVista) =>
      r.id === seleccionadaId ? 2 : r.id === resaltadaId ? 1 : 0;
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
        const porCalles = !!r.trazado && r.trazado.length >= 2;
        L.polyline(linea, {
          color: r.color,
          weight: activa ? 6 : resaltada ? 5 : 4,
          opacity: atenuada ? 0.3 : porCalles ? 0.92 : 0.6,
          // Punteado = la ruta aún no tiene trazado: son los paraderos unidos en línea recta.
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

      // 1. Geocercas de cada paradero (círculo con radio en metros del API, por defecto 25 m)
      r.paraderos.forEach((p, i) => {
        if (!p.latitud || !p.longitud) return;
        const posicion: L.LatLngExpression = [p.latitud, p.longitud];
        const radio = p.radioMetros && p.radioMetros > 0 ? p.radioMetros : 25;

        const geocerca = L.circle(posicion, {
          radius: radio,
          color: r.color,
          weight: activa ? 1.8 : resaltada ? 1.5 : 1.2,
          dashArray: activa ? '4 4' : undefined,
          fillColor: r.color,
          fillOpacity: atenuada ? 0.04 : activa ? 0.22 : 0.12,
          interactive: true,
        }).addTo(capa);

        geocerca
          .bindTooltip(
            `<b>${i + 1}. ${escapar(p.nombre)}</b><br/><span style="font-weight:600;color:${r.color}">${escapar(r.codigo)}</span> · <span style="color:#0284c7;font-weight:600">Geocerca: ${radio} m</span>`,
            { direction: 'top', className: 'sr-tip' },
          )
          .on('click', seleccionar)
          .on('mouseover', () => {
            geocerca.setStyle({
              fillOpacity: activa ? 0.35 : 0.25,
              weight: activa ? 2.5 : 2,
            });
          })
          .on('mouseout', () => {
            geocerca.setStyle({
              fillOpacity: atenuada ? 0.04 : activa ? 0.22 : 0.12,
              weight: activa ? 1.8 : resaltada ? 1.5 : 1.2,
            });
          });
      });

      // 2. Marcadores de paraderos (el destino se dibuja aparte, compartido entre rutas)
      const ultimo = r.paraderos.length - 1;
      r.paraderos.forEach((p, i) => {
        if (!p.latitud || !p.longitud) return;
        if (i === ultimo && ultimo > 0) return;
        const posicion: L.LatLngExpression = [p.latitud, p.longitud];
        const radio = p.radioMetros && p.radioMetros > 0 ? p.radioMetros : 25;
        const textoTip = `<b>${i + 1}. ${escapar(p.nombre)}</b><br/><span style="font-weight:500;color:#64748b">${escapar(r.codigo)} · ${
          i === 0 ? 'Inicio de ruta' : `+${p.minutosAcumulados} min`
        } · Radio ${radio} m</span>`;

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
            .bindTooltip(textoTip, {
              direction: 'top',
              offset: [0, -8],
              className: 'sr-tip',
            })
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
            .bindTooltip(textoTip, {
              direction: 'top',
              offset: [0, -10],
              className: 'sr-tip',
            })
            .addTo(capa);
        } else if (!atenuada) {
          L.circleMarker(posicion, {
            radius: resaltada ? 4.5 : 3.5,
            color: r.color,
            weight: 2,
            fillColor: '#ffffff',
            fillOpacity: 1,
          })
            .bindTooltip(textoTip, {
              direction: 'top',
              offset: [0, -4],
              className: 'sr-tip',
            })
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
          {
            permanent: true,
            direction: 'right',
            offset: [18, 0],
            className: 'sr-tip-destino',
          },
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
      const previo = angulosRef.current.get(p.clave);
      const parado = p.velocidad !== null && p.velocidad < VELOCIDAD_MIN_RUMBO;
      const angulo =
        previo === undefined
          ? p.rumbo
          : parado
            ? previo
            : anguloCorto(previo, p.rumbo);
      angulosRef.current.set(p.clave, angulo);
      const html = `<div class="sr-vehiculo"><div class="sr-vehiculo__flecha" style="transform:rotate(${angulo}deg)">${ICONO_CARRO}</div></div>`;
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
          window.setTimeout(
            () => el.classList.remove('sr-vehiculo-mover'),
            1300,
          );
        }
        existente.setLatLng([p.lat, p.lng]);
        const flecha = existente
          .getElement()
          ?.querySelector<HTMLElement>('.sr-vehiculo__flecha');
        if (flecha) flecha.style.transform = `rotate(${angulo}deg)`;
        existente.setTooltipContent(tip);
      } else {
        const marcador = L.marker([p.lat, p.lng], {
          icon: L.divIcon({
            className: 'sr-icono sr-vehiculo-icono',
            html,
            iconSize: [80, 80],
            iconAnchor: [40, 40],
          }),
          zIndexOffset: 2000,
        })
          .bindTooltip(tip, {
            direction: 'top',
            offset: [0, -30],
            className: 'sr-tip',
          })
          .addTo(map);
        marcadores.set(p.clave, marcador);
      }
    }

    marcadores.forEach((m, clave) => {
      if (!vigentes.has(clave)) {
        m.remove();
        marcadores.delete(clave);
        angulosRef.current.delete(clave);
      }
    });
  }, [posiciones, colorPorRuta, mapReady]);

  // Tamaño del vehículo según el zoom: pequeño al ver toda la ciudad, completo al acercarse.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const ajustar = () => {
      const esc = Math.min(1, Math.max(0.65, 2 **((map.getZoom() - 17) * 0.25)));
      map.getContainer().style.setProperty('--sr-esc', esc.toFixed(3));
    };
    ajustar();
    map.on('zoom', ajustar);
    return () => {
      map.off('zoom', ajustar);
    };
  }, [mapReady]);

  /* ------------------------------------------------------------------ */
  /* Encuadre                                                            */
  /* ------------------------------------------------------------------ */
  const encuadrar = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const {
      rutas: todas,
      seleccionadaId: sel,
      encuadreIds: encIds,
      margenDerecho: margen,
    } = datosRef.current;
    const objetivo =
      sel !== null && todas.some((r) => r.id === sel)
        ? todas.filter((r) => r.id === sel)
        : encIds && encIds.length > 0 && todas.some((r) => encIds.includes(r.id))
          ? todas.filter((r) => encIds.includes(r.id))
          : todas;
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
                title={
                  seleccionadaId !== null
                    ? 'Encuadrar la ruta'
                    : 'Ver todas las rutas'
                }
                className={`${botonZoom} border-t border-slate-100`}
              >
                <Crosshair size={16} />
              </button>
            </div>
          </div>

          {/* Leyenda */}
          <div className="absolute bottom-3 left-3 z-10 hidden items-center gap-4 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11.5px] font-medium text-slate-600 shadow-md sm:flex">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[2px] bg-[#0f1f4b]" />{' '}
              Destino
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[2px] bg-slate-500" /> Inicio
              de ruta
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full border-2 border-slate-500 bg-white" />{' '}
              Parada
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full border border-blue-500 border-dashed bg-blue-500/20" />{' '}
              Geocerca
            </span>
          </div>
        </>
      )}
    </div>
  );
};

export default MapaRutas;
