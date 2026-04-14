'use client';
import React, {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
  memo,
} from 'react';
import { GoogleMap } from '@react-google-maps/api';
import { useGoogleMaps } from '@/context/GoogleMapsContext';

// ─────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────
interface Coordenada {
  wx: string;
  wy: string;
  nombre?: string;
  direccion?: string;
}

interface ModalMapaProps {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  grupo: number;
  coordenadas?: Coordenada[];
  selectedMarker: Coordenada | null;
  setSelectedMarker: (marker: Coordenada | null) => void;
  getMarkerSVG: (index: number) => string;
}

// ─────────────────────────────────────────────
// Constantes fuera del componente (objetos estables)
// ─────────────────────────────────────────────
const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };

const MAP_CENTER = {
  lat: -12.061171148647077,
  lng: -77.03599608048779,
};

const MAP_OPTIONS: google.maps.MapOptions = {
  gestureHandling: 'cooperative',
  disableDefaultUI: true,
  streetViewControl: true,
  fullscreenControl: true,
  zoomControl: true,
};

// ─────────────────────────────────────────────
// Subcomponente: mapa con markers nativos
// (sin componentes React por marker → sin lag)
// ─────────────────────────────────────────────
const NativeMarkersMap = memo(function NativeMarkersMap({
  coordenadas,
  iconUrls,
  setSelectedMarker,
  onMapReady,
}: {
  coordenadas: Coordenada[];
  iconUrls: string[];
  setSelectedMarker: (m: Coordenada | null) => void;
  onMapReady?: () => void;
}) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const activeMarkerRef = useRef<google.maps.Marker | null>(null);

  // Crear markers nativos cuando el mapa esté listo
  const buildMarkers = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    // Limpiar markers anteriores
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    // Una sola InfoWindow reutilizable
    if (!infoWindowRef.current) {
      infoWindowRef.current = new window.google.maps.InfoWindow();
    }

    infoWindowRef.current.addListener('closeclick', () => {
      activeMarkerRef.current = null;
      setSelectedMarker(null);
    });

    coordenadas.forEach((coord, index) => {
      const marker = new window.google.maps.Marker({
        position: {
          lat: parseFloat(coord.wy),
          lng: parseFloat(coord.wx),
        },
        map,
        icon: {
          url: iconUrls[index],
          scaledSize: new window.google.maps.Size(40, 50),
          anchor: new window.google.maps.Point(20, 45),
        },
        optimized: true, // ← dibuja en canvas, no en DOM: clave para el rendimiento
      });

      marker.addListener('click', () => {
        const iw = infoWindowRef.current!;

        // Toggle: si ya está abierto para este marker, cerrar
        if (activeMarkerRef.current === marker) {
          iw.close();
          activeMarkerRef.current = null;
          setSelectedMarker(null);
          return;
        }

        const nombre = coord.nombre ?? 'Sin nombre';
        const direccion = coord.direccion ?? 'Sin dirección';
        const nombreCorto =
          nombre.length > 36 ? `${nombre.slice(0, 36)}...` : nombre;
        const direccionCorta =
          direccion.length > 36 ? `${direccion.slice(0, 36)}...` : direccion;

        iw.setContent(`
          <div style="padding:8px;max-width:250px;font-family:sans-serif">
            <h3 style="font-size:11px;font-weight:700;margin:0 0 6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#111827" title="${nombre}">
              ${nombreCorto}
            </h3>
            <p style="display:flex;align-items:flex-start;gap:4px;font-size:11px;color:#374151;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${direccion}">
              <svg style="width:14px;height:14px;flex-shrink:0;margin-top:1px" fill="none" stroke="#9ca3af" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              <span>${direccionCorta}</span>
            </p>
          </div>
        `);

        iw.open(map, marker);
        activeMarkerRef.current = marker;
        setSelectedMarker(coord);
      });

      markersRef.current.push(marker);
    });

    // Click en el mapa → cerrar InfoWindow
    map.addListener('click', () => {
      infoWindowRef.current?.close();
      activeMarkerRef.current = null;
      setSelectedMarker(null);
    });
  }, [coordenadas, iconUrls, setSelectedMarker]);

  const handleMapLoad = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;

      // Forzar resize por si el contenedor animó al abrir
      window.google.maps.event.trigger(map, 'resize');

      buildMarkers();
      onMapReady?.();
    },
    [buildMarkers, onMapReady]
  );

  // Si cambian coordenadas/iconos después del montaje, reconstruir
  useEffect(() => {
    if (mapRef.current) buildMarkers();
  }, [buildMarkers]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      infoWindowRef.current?.close();
      infoWindowRef.current = null;
      activeMarkerRef.current = null;
    };
  }, []);

  return (
    <GoogleMap
      mapContainerStyle={MAP_CONTAINER_STYLE}
      center={MAP_CENTER}
      zoom={11}
      options={MAP_OPTIONS}
      onLoad={handleMapLoad}
    />
  );
});

// ─────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────
export default function ModalMapa({
  isOpen,
  setIsOpen,
  grupo,
  coordenadas,
  selectedMarker,
  setSelectedMarker,
  getMarkerSVG,
}: ModalMapaProps) {
  const { isLoaded, loadError } = useGoogleMaps();

  // Delay para esperar que la animación del modal termine antes de montar el mapa
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => setMapReady(true), 150);
      return () => clearTimeout(t);
    } else {
      setMapReady(false);
      setSelectedMarker(null);
    }
  }, [isOpen, setSelectedMarker]);

  // Pre-calcular todos los iconos una sola vez (encodeURIComponent es costoso)
  const iconUrls = useMemo(() => {
    if (!coordenadas || !isLoaded) return [];
    return coordenadas.map((_, i) => {
      const svg = getMarkerSVG(i + 1);
      return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
    });
  }, [coordenadas, getMarkerSVG, isLoaded]);

  const handleClose = useCallback(() => setIsOpen(false), [setIsOpen]);

  if (!isOpen) return null;

  // ── Error al cargar Maps ──
  if (loadError) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={handleClose}
      >
        <div
          className="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl animate-in fade-in zoom-in duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="mb-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Error al cargar el mapa</h2>
            <p className="mt-2 text-sm text-gray-600">{loadError.message}</p>
          </div>
          <button
            onClick={handleClose}
            className="w-full rounded-lg bg-[#d62828] px-4 py-3 font-medium text-white transition-all hover:bg-[#c02222] focus:outline-none focus:ring-2 focus:ring-[#d62828] focus:ring-offset-2"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  // ── Modal principal ──
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón cerrar */}
        <button
          onClick={handleClose}
          aria-label="Cerrar"
          className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 backdrop-blur text-gray-500 shadow-md transition-all duration-200 hover:bg-red-50 hover:text-red-600 hover:shadow-lg hover:scale-105 active:scale-95"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="border-b border-gray-200 px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#d62828]/10">
              <svg className="h-6 w-6 text-[#d62828]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Ruta Programada</h2>
              <p className="text-sm text-gray-500">Grupo {grupo}</p>
            </div>
          </div>
        </div>

        {/* Mapa */}
        <div className="p-6">
          <div className="h-[550px] w-full overflow-hidden rounded-xl shadow-inner ring-1 ring-gray-200">
            {isLoaded && mapReady && coordenadas && iconUrls.length > 0 ? (
              <NativeMarkersMap
                coordenadas={coordenadas}
                iconUrls={iconUrls}
                setSelectedMarker={setSelectedMarker}
              />
            ) : (
              <div className="flex h-full items-center justify-center rounded-xl bg-gray-50">
                <div className="text-center">
                  <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-[#d62828]" />
                  <p className="text-sm font-medium text-gray-600">Cargando mapa...</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-gray-200 px-8 py-5">
          <button
            onClick={handleClose}
            className="rounded-lg bg-[#d62828] px-6 py-3 font-medium text-white transition-all hover:bg-[#c02222] focus:outline-none focus:ring-2 focus:ring-[#d62828] focus:ring-offset-2"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}