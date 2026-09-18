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

  const ruler = useMapRuler(map, rulerActive);
  const { clear: clearRuler } = ruler;
  const rulerPointCount = ruler.points.length;

  const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null);
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

  if (!map) return null;

  return (
    <div
      className={`absolute ${positionClassName} pointer-events-auto z-20 flex select-none flex-col items-end gap-2`}
    >
      {/* Selector de Tipo de Mapa */}
      <div className="flex items-center overflow-hidden rounded-lg border border-gray-200/80 bg-white/95 p-0.5 shadow-md backdrop-blur-md">
        <button
          type="button"
          onClick={() => handleSetMapType('roadmap')}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
            mapType === 'roadmap'
              ? 'shadow-xs bg-[#113EB9] text-white'
              : 'text-gray-700 hover:bg-gray-100 hover:text-black'
          }`}
          title="Mapa vectorial con calles y carreteras"
        >
          <Map size={14} />
          <span>Mapa</span>
        </button>
        <button
          type="button"
          onClick={() => handleSetMapType('hybrid')}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
            mapType === 'hybrid'
              ? 'shadow-xs bg-[#113EB9] text-white'
              : 'text-gray-700 hover:bg-gray-100 hover:text-black'
          }`}
          title="Imagen satelital con relieve y nombres de vías"
        >
          <Layers size={14} />
          <span>Satélite</span>
        </button>
      </div>

      {/* Botonera de Herramientas */}
      <div className="flex flex-col divide-y divide-gray-100 rounded-lg border border-gray-200/80 bg-white/95 p-1 shadow-md backdrop-blur-md">
        {/* Controles de Zoom */}
        <div className="flex flex-col">
          <button
            type="button"
            onClick={handleZoomIn}
            className="flex items-center justify-center rounded-md p-2 text-gray-700 transition-colors hover:bg-blue-50 hover:text-[#113EB9]"
            title="Acercar mapa (+)"
          >
            <Plus size={18} />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="flex items-center justify-center rounded-md p-2 text-gray-700 transition-colors hover:bg-blue-50 hover:text-[#113EB9]"
            title="Alejar mapa (-)"
          >
            <Minus size={18} />
          </button>
        </div>

        {/* Centrar Flota */}
        <div className="flex flex-col pt-1">
          <button
            type="button"
            onClick={handleCenter}
            className="flex items-center justify-center rounded-md p-2 text-gray-700 transition-colors hover:bg-blue-50 hover:text-[#113EB9]"
            title="Centrar vista general de la flota"
          >
            <LocateFixed size={18} />
          </button>
        </div>

        {/* Personita Pegman (Street View arrastrable) y Tráfico */}
        <div className="flex flex-col items-center gap-0.5 pt-1">
          {/* Contenedor relativo del Pegman */}
          <div className="relative flex h-9 w-9 items-center justify-center">
            {/* Marcador de posición: evita el hueco en blanco mientras Google
                inyecta su control nativo (visible apenas un instante tras un F5) */}
            {!pegmanReady && !isStreetViewActive && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 flex items-center justify-center text-gray-800"
              >
                <PersonStanding size={20} className="stroke-[2.2]" />
              </div>
            )}

            {/* Slot nativo de Google */}
            <div
              id="pegman-slot"
              ref={pegmanSlotRef}
              className={`gm-style ${isStreetViewActive ? 'pointer-events-none opacity-0' : ''}`}
              title="Arrastra la personita al mapa para ver la calle (Street View)"
            />

            {/* Botón activo gris opaco cuando Street View está abierto: al hacer clic sale de Street View (igual que Esc) */}
            {isStreetViewActive && (
              <button
                type="button"
                onClick={exitStreetView}
                className="shadow-xs absolute inset-0 z-10 flex cursor-pointer items-center justify-center rounded-md border border-gray-400/80 bg-gray-300 text-gray-900 transition-all hover:bg-gray-400"
                title="Salir de Street View y volver al mapa (o presiona Esc)"
              >
                <PersonStanding
                  size={20}
                  className="stroke-[2.2] text-gray-900"
                />
              </button>
            )}
          </div>

          {/* Botón de Tráfico */}
          <button
            type="button"
            onClick={toggleTraffic}
            className={`relative flex items-center justify-center rounded-md p-2 transition-colors ${
              trafficActive
                ? 'shadow-xs bg-green-700 text-white'
                : 'text-gray-700 hover:bg-blue-50 hover:text-[#113EB9]'
            }`}
            title={
              trafficActive
                ? 'Desactivar tráfico en vivo'
                : 'Activar tráfico en tiempo real (Google Traffic)'
            }
          >
            <FaTrafficLight size={16} />
            {trafficActive && (
              <span className="absolute right-1 top-1 h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
            )}
          </button>
        </div>

        {/* Pantalla Completa */}
        <div className="flex flex-col pt-1">
          <button
            type="button"
            onClick={toggleFullscreen}
            className="flex items-center justify-center rounded-md p-2 text-gray-700 transition-colors hover:bg-blue-50 hover:text-[#113EB9]"
            title={
              isFullscreen
                ? 'Salir de pantalla completa'
                : 'Modo Pantalla Completa'
            }
          >
            {isFullscreen ? <Minimize size={17} /> : <Maximize size={17} />}
          </button>
        </div>
      </div>

      {/* Regla de Medición (sección aparte) */}
      <div className="flex flex-col rounded-lg border border-gray-200/80 bg-white/95 p-1 shadow-md backdrop-blur-md">
        <button
          type="button"
          onClick={toggleRuler}
          className={`relative flex items-center justify-center rounded-md p-2 transition-colors ${
            rulerActive
              ? 'shadow-xs bg-[#113EB9] text-white'
              : 'text-gray-700 hover:bg-blue-50 hover:text-[#113EB9]'
          }`}
          title={
            rulerActive
              ? 'Cerrar la regla (la medición queda en el mapa)'
              : ruler.points.length > 0
                ? 'Abrir la regla para seguir midiendo o borrar la medición'
                : 'Medir distancias sobre el mapa (regla)'
          }
        >
          <Ruler size={17} />
          {!rulerActive && ruler.points.length > 0 && (
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#113EB9]" />
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
