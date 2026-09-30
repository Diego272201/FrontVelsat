'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Map,
  Layers,
  Plus,
  Minus,
  LocateFixed,
  Maximize,
  Minimize,
  PersonStanding,
  Ruler,
  Search,
  X,
  MapPin,
} from 'lucide-react';
import { FaTrafficLight } from 'react-icons/fa';
import { useMapRuler } from '@/hooks/useMapRuler';
import RulerPanel from './RulerPanel';

interface MapFloatingControlsProps {
  map: google.maps.Map | null;
  onCenterMap?: () => void;
  positionClassName?: string;
  /**
   * Elemento que se pone en pantalla completa. Sin él se usa la página
   * entera; los mapas embebidos (p. ej. dentro de un modal) pasan su propio
   * contenedor para que solo el mapa ocupe la pantalla.
   */
  fullscreenTargetRef?: React.RefObject<HTMLElement>;
}

export default function MapFloatingControls({
  map,
  onCenterMap,
  positionClassName = 'top-16 right-4',
  fullscreenTargetRef,
}: MapFloatingControlsProps) {
  const [mapType, setMapType] = useState<'roadmap' | 'hybrid'>('roadmap');
  const [trafficActive, setTrafficActive] = useState(true);
  const [isStreetViewActive, setIsStreetViewActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pegmanReady, setPegmanReady] = useState(false);
  const [rulerActive, setRulerActive] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);

  const ruler = useMapRuler(map, rulerActive);
  const { clear: clearRuler } = ruler;
  const rulerPointCount = ruler.points.length;

  const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pegmanSlotRef = useRef<HTMLDivElement>(null);

  // Sincronizar estado inicial del tipo de mapa y escuchar cambios
  useEffect(() => {
    if (!map) return;

    const currentType = map.getMapTypeId() || 'roadmap';
    setMapType(
      currentType === 'satellite' || currentType === 'hybrid'
        ? 'hybrid'
        : 'roadmap',
    );

    const typeListener = map.addListener('maptypeid_changed', () => {
      const updated = map.getMapTypeId() || 'roadmap';
      setMapType(
        updated === 'satellite' || updated === 'hybrid' ? 'hybrid' : 'roadmap',
      );
    });

    return () => {
      google.maps.event.removeListener(typeListener);
    };
  }, [map]);

  // Escuchar si Street View está activo o cerrado y asegurar que los controles que chocan con el navbar permanezcan deshabilitados
  useEffect(() => {
    if (!map) return;
    const panorama = map.getStreetView();
    if (!panorama) return;

    const configurePanorama = () => {
      panorama.setOptions({
        addressControl: false,
        fullscreenControl: false,
        enableCloseButton: false,
        motionTracking: false,
        motionTrackingControl: false,
        panControl: false,
      });
    };

    configurePanorama();
    setIsStreetViewActive(panorama.getVisible());

    const visibleListener = panorama.addListener('visible_changed', () => {
      const isVisible = panorama.getVisible();
      setIsStreetViewActive(isVisible);
      if (isVisible) {
        configurePanorama();
      }
    });

    const panoListener = panorama.addListener('pano_changed', () => {
      configurePanorama();
    });

    const statusListener = panorama.addListener('status_changed', () => {
      configurePanorama();
    });

    return () => {
      google.maps.event.removeListener(visibleListener);
      google.maps.event.removeListener(panoListener);
      google.maps.event.removeListener(statusListener);
    };
  }, [map]);

  const exitStreetView = useCallback(() => {
    if (!map) return;
    const panorama = map.getStreetView();
    if (panorama) {
      panorama.setVisible(false);
    }
  }, [map]);

  // Montar y enlazar el Pegman nativo arrastrable de Google Maps en nuestro slot personalizado
  useEffect(() => {
    if (!map) return;
    const mapDiv = map.getDiv();
    if (!mapDiv) return;

    let observer: MutationObserver | null = null;
    let timers: number[] = [];

    const findPegman = () =>
      (mapDiv.querySelector('.gm-svpc') as HTMLElement | null) ||
      (mapDiv.querySelector('button[aria-label*="Pegman"]')
        ?.parentElement as HTMLElement | null) ||
      (mapDiv.querySelector('button[title*="Pegman"]')
        ?.parentElement as HTMLElement | null) ||
      (mapDiv.querySelector('button[aria-label*="Street View"]')
        ?.parentElement as HTMLElement | null);

    const mountPegman = () => {
      const slot = pegmanSlotRef.current;
      if (!slot) return false;

      const pegman = findPegman();
      if (!pegman) return false;

      if (pegman.parentElement !== slot) {
        slot.appendChild(pegman);
      }
      setPegmanReady(true);
      return true;
    };

    const stopWatching = () => {
      observer?.disconnect();
      observer = null;
      timers.forEach(clearTimeout);
      timers = [];
    };

    const tryMount = () => {
      if (!mountPegman()) return;
      stopWatching();
    };

    if (!mountPegman()) {
      // Google inyecta el control de Street View de forma asíncrona: en vez de
      // esperar a un temporizador fijo (que dejaba el hueco en blanco tras un F5),
      // lo tomamos en el mismo instante en que aparece en el DOM del mapa.
      observer = new MutationObserver(tryMount);
      observer.observe(mapDiv, { childList: true, subtree: true });

      // Red de seguridad por si el observer no llega a dispararse, y corte
      // definitivo para no dejar un observer vivo sobre el DOM del mapa
      timers = [300, 800, 1500].map((ms) => window.setTimeout(tryMount, ms));
      timers.push(window.setTimeout(stopWatching, 8000));
    }

    const idleListener = google.maps.event.addListenerOnce(
      map,
      'idle',
      tryMount,
    );

    return () => {
      google.maps.event.removeListener(idleListener);
      stopWatching();
    };
  }, [map]);

  // Escuchar cambios de Fullscreen del navegador
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Sincronizar la capa de tráfico con el estado (arranca activa al cargar el mapa)
  useEffect(() => {
    if (!map) return;

    if (!trafficLayerRef.current) {
      trafficLayerRef.current = new google.maps.TrafficLayer();
    }
    trafficLayerRef.current.setMap(trafficActive ? map : null);
  }, [map, trafficActive]);

  // Cleanup de la capa de tráfico al desmontar
  useEffect(() => {
    return () => {
      if (trafficLayerRef.current) {
        trafficLayerRef.current.setMap(null);
        trafficLayerRef.current = null;
      }
    };
  }, []);

  const handleSetMapType = useCallback(
    (type: 'roadmap' | 'hybrid') => {
      if (!map) return;
      map.setMapTypeId(type);
      setMapType(type);
    },
    [map],
  );

  const handleZoomIn = useCallback(() => {
    if (!map) return;
    const current = map.getZoom() || 6;
    map.setZoom(current + 1);
  }, [map]);

  const handleZoomOut = useCallback(() => {
    if (!map) return;
    const current = map.getZoom() || 6;
    map.setZoom(Math.max(1, current - 1));
  }, [map]);

  const handleCenter = useCallback(() => {
    if (onCenterMap) {
      onCenterMap();
    } else if (map) {
      map.setCenter({ lat: -9.22812, lng: -75.78894 });
      map.setZoom(6);
    }
  }, [map, onCenterMap]);

  const toggleTraffic = useCallback(() => {
    if (!map) return;
    setTrafficActive((prev) => !prev);
  }, [map]);

  const toggleRuler = useCallback(() => {
    setRulerActive((prev) => !prev);
  }, []);

  // Atajos de la regla:
  //   Esc   cancela y descarta lo medido, como si no se hubiera marcado nada
  //   Enter termina la medición y la deja dibujada (igual que "Terminar")
  useEffect(() => {
    if (!rulerActive) return;

    const isTypingTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false;
      return (
        target.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
      );
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      // Con Street View abierto, Esc le corresponde a Google para salir de él
      if (isStreetViewActive) return;
      if (isTypingTarget(event.target)) return;

      if (event.key === 'Escape') {
        clearRuler();
        setRulerActive(false);
        return;
      }

      // Sin nada marcado no hay medición que terminar
      if (event.key === 'Enter' && rulerPointCount > 0) {
        setRulerActive(false);
      }
    };

    // En captura porque, con el foco sobre el mapa, Google consume el Enter
    // antes de que el evento llegue a burbujear hasta el documento.
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [rulerActive, isStreetViewActive, clearRuler, rulerPointCount]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      const target = fullscreenTargetRef?.current ?? document.documentElement;
      target.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen().catch(console.error);
    }
  }, [fullscreenTargetRef]);

  const searchNominatim = useCallback(async (query: string) => {
    if (!query.trim() || query.trim().length < 3) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=pe`
      );
      const data = await res.json();
      setSearchResults(data);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchInput = useCallback((value: string) => {
    setSearchQuery(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      searchNominatim(value);
    }, 400);
  }, [searchNominatim]);

  const handleSearchSelect = useCallback((lat: string, lon: string) => {
    if (!map) return;
    map.panTo({ lat: parseFloat(lat), lng: parseFloat(lon) });
    map.setZoom(18);
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  }, [map]);

  const toggleSearch = useCallback(() => {
    setSearchOpen((prev) => {
      if (!prev) {
        setTimeout(() => searchInputRef.current?.focus(), 100);
      } else {
        setSearchQuery('');
        setSearchResults([]);
      }
      return !prev;
    });
  }, []);

  if (!map) return null;

  return (
    <div
      className={`absolute ${positionClassName} pointer-events-auto z-20 flex select-none flex-col items-end gap-1.5`}
    >
      {/* Selector de Tipo de Mapa */}
      <div className="flex items-center overflow-hidden rounded-lg border border-slate-200/90 bg-white/95 p-0.5 shadow-sm backdrop-blur-md">
        <button
          type="button"
          onClick={() => handleSetMapType('roadmap')}
          className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${
            mapType === 'roadmap'
              ? 'bg-[#113EB9] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
          title="Mapa vectorial con calles y carreteras"
        >
          <Map size={13} strokeWidth={2.5} />
          <span>Mapa</span>
        </button>
        <button
          type="button"
          onClick={() => handleSetMapType('hybrid')}
          className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${
            mapType === 'hybrid'
              ? 'bg-[#113EB9] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
          title="Imagen satelital con relieve y nombres de vías"
        >
          <Layers size={13} strokeWidth={2.5} />
          <span>Satélite</span>
        </button>
      </div>

      {/* Botonera de Herramientas */}
      <div className="flex flex-col rounded-lg border border-slate-200/90 bg-white/95 shadow-sm backdrop-blur-md">
        {/* Zoom In */}
        <button
          type="button"
          onClick={handleZoomIn}
          className="flex h-8 w-8 items-center justify-center rounded-t-lg text-slate-700 transition-colors hover:bg-blue-50 hover:text-[#113EB9]"
          title="Acercar mapa (+)"
        >
          <Plus size={16} strokeWidth={3.8} />
        </button>

        {/* Separador */}
        <div className="mx-1.5 border-t border-slate-200/80" />

        {/* Zoom Out */}
        <button
          type="button"
          onClick={handleZoomOut}
          className="flex h-8 w-8 items-center justify-center text-slate-700 transition-colors hover:bg-blue-50 hover:text-[#113EB9]"
          title="Alejar mapa (-)"
        >
          <Minus size={16} strokeWidth={3.8} />
        </button>

        {/* Separador */}
        <div className="mx-1.5 border-t border-slate-200/80" />

        {/* Centrar Flota */}
        <button
          type="button"
          onClick={handleCenter}
          className="flex h-8 w-8 items-center justify-center text-slate-700 transition-colors hover:bg-blue-50 hover:text-[#113EB9]"
          title="Centrar vista general de la flota"
        >
          <LocateFixed size={16} strokeWidth={3} />
        </button>

        {/* Separador */}
        <div className="mx-1.5 border-t border-slate-200/80" />

        {/* Personita Pegman (Street View) */}
        <div className="relative flex h-8 w-8 items-center justify-center">
          {!pegmanReady && !isStreetViewActive && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 flex items-center justify-center text-slate-700"
            >
              <PersonStanding size={16} className="stroke-[3.5]" />
            </div>
          )}

          <div
            id="pegman-slot"
            ref={pegmanSlotRef}
            className={`absolute inset-0 flex items-center justify-center gm-style ${isStreetViewActive ? 'pointer-events-none opacity-0' : ''}`}
            title="Arrastra la personita al mapa para ver la calle (Street View)"
          />

          {isStreetViewActive && (
            <button
              type="button"
              onClick={exitStreetView}
              className="absolute inset-0 z-10 flex cursor-pointer items-center justify-center rounded-md bg-slate-300 text-slate-800 shadow-sm transition-all hover:bg-slate-400"
              title="Salir de Street View y volver al mapa (o presiona Esc)"
            >
              <PersonStanding size={16} className="stroke-[3.5]" />
            </button>
          )}
        </div>

        {/* Separador */}
        <div className="mx-1.5 border-t border-slate-200/80" />

        {/* Botón de Tráfico */}
        <button
          type="button"
          onClick={toggleTraffic}
          className={`relative flex h-8 w-8 items-center justify-center transition-colors ${
            trafficActive
              ? 'bg-green-600 text-white'
              : 'text-slate-700 hover:bg-blue-50 hover:text-[#113EB9]'
          }`}
          title={
            trafficActive
              ? 'Desactivar tráfico en vivo'
              : 'Activar tráfico en tiempo real (Google Traffic)'
          }
        >
          <FaTrafficLight size={14} />
          {trafficActive && (
            <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
          )}
        </button>

        {/* Separador */}
        <div className="mx-1.5 border-t border-slate-200/80" />

        {/* Pantalla Completa */}
        <button
          type="button"
          onClick={toggleFullscreen}
          className="flex h-8 w-8 items-center justify-center rounded-b-lg text-slate-700 transition-colors hover:bg-blue-50 hover:text-[#113EB9]"
          title={
            isFullscreen
              ? 'Salir de pantalla completa'
              : 'Modo Pantalla Completa'
          }
        >
          {isFullscreen ? <Minimize size={15} strokeWidth={3} /> : <Maximize size={15} strokeWidth={3} />}
        </button>
      </div>

      {/* Buscador de Lugares (Nominatim) */}
      <div className="relative flex flex-col items-end">
        <div className="flex flex-col rounded-lg border border-slate-200/90 bg-white/95 shadow-sm backdrop-blur-md">
          <button
            type="button"
            onClick={toggleSearch}
            className={`relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
              searchOpen
                ? 'bg-[#113EB9] text-white shadow-sm'
                : 'text-slate-700 hover:bg-blue-50 hover:text-[#113EB9]'
            }`}
            title="Buscar lugar en el mapa"
          >
            {searchOpen ? <X size={15} strokeWidth={3} /> : <Search size={15} strokeWidth={3.2} />}
          </button>
        </div>

        {searchOpen && (
          <div className="absolute right-10 top-0 w-72 rounded-lg border border-slate-200/90 bg-white/95 shadow-lg backdrop-blur-md overflow-hidden">
            <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
              <Search size={13} className="shrink-0 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    toggleSearch();
                  }
                }}
                placeholder="Buscar lugar..."
                className="flex-1 bg-transparent text-[12px] text-slate-800 placeholder-slate-400 outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setSearchResults([]); searchInputRef.current?.focus(); }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {isSearching && (
              <div className="px-3 py-3 text-center text-[11px] text-slate-400">
                Buscando...
              </div>
            )}

            {!isSearching && searchResults.length > 0 && (
              <ul className="max-h-52 overflow-y-auto">
                {searchResults.map((result, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => handleSearchSelect(result.lat, result.lon)}
                      className="flex w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-blue-50"
                    >
                      <MapPin size={13} className="mt-0.5 shrink-0 text-[#113EB9]" />
                      <span className="text-[11px] leading-tight text-slate-700">
                        {result.display_name}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {!isSearching && searchQuery.length >= 3 && searchResults.length === 0 && (
              <div className="px-3 py-3 text-center text-[11px] text-slate-400">
                No se encontraron resultados
              </div>
            )}

            {!isSearching && searchQuery.length > 0 && searchQuery.length < 3 && (
              <div className="px-3 py-3 text-center text-[11px] text-slate-400">
                Escribe al menos 3 caracteres
              </div>
            )}
          </div>
        )}
      </div>

      {/* Regla de Medición */}
      <div className="flex flex-col rounded-lg border border-slate-200/90 bg-white/95 shadow-sm backdrop-blur-md">
        <button
          type="button"
          onClick={toggleRuler}
          className={`relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
            rulerActive
              ? 'bg-[#113EB9] text-white shadow-sm'
              : 'text-slate-700 hover:bg-blue-50 hover:text-[#113EB9]'
          }`}
          title={
            rulerActive
              ? 'Cerrar la regla (la medición queda en el mapa)'
              : ruler.points.length > 0
                ? 'Abrir la regla para seguir midiendo o borrar la medición'
                : 'Medir distancias sobre el mapa (regla)'
          }
        >
          <Ruler size={15} strokeWidth={3} />
          {!rulerActive && ruler.points.length > 0 && (
            <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-[#113EB9]" />
          )}
        </button>
      </div>

      {/* Panel de la Regla */}
      {rulerActive && (
        <RulerPanel
          totalMeters={ruler.totalMeters}
          pointCount={ruler.points.length}
          onUndo={ruler.undo}
          onClear={ruler.clear}
          onFinish={() => setRulerActive(false)}
        />
      )}
    </div>
  );
}
