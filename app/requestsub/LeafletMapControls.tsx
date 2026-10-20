'use client';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import L from 'leaflet';
import {
  Plus,
  Minus,
  LocateFixed,
  Maximize,
  Minimize,
  Ruler,
  Search,
  X,
  MapPin,
  Hexagon,
  RefreshCw,
  Maximize2,
  CircleDot,
} from 'lucide-react';
import { FaTrafficLight } from 'react-icons/fa';
import { useLeafletRuler } from '@/hooks/useLeafletRuler';
import { useLeafletGeofences } from '@/hooks/useLeafletGeofences';
import RulerPanel from '../components/RulerPanel';
import MapTypeSelector, {
  readDefaultMapType,
  toMapTypeId,
  type MapTypeId,
} from '../components/MapTypeSelector';
import { GOOGLE_TILES_MAX_ZOOM, googleTileLayer } from '@/lib/googleTiles';

/*
 * Controles flotantes del mapa de /subtrackvelnew: mismo diseño que
 * MapFloatingControls (trackvelnew) pero sobre Leaflet y sin ninguna API de
 * pago de Google. El mapa base y el tráfico son los cuadros (tiles) públicos
 * de Google, igual que hace Traccar. No hay Street View por arrastre
 * (personita): eso requiere la Maps JavaScript API, que se cobra.
 */

export const MAP_MAX_ZOOM = GOOGLE_TILES_MAX_ZOOM;

interface LeafletMapControlsProps {
  map: L.Map | null;
  onCenterMap?: () => void;
  baseUrl: string;
  username: string;
  positionClassName?: string;
}

export default function LeafletMapControls({
  map,
  onCenterMap,
  baseUrl,
  username,
  positionClassName = 'top-16 right-4',
}: LeafletMapControlsProps) {
  const [baseLayer, setBaseLayer] = useState<MapTypeId>(readDefaultMapType);
  const [trafficActive, setTrafficActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [rulerActive, setRulerActive] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [geofencesActive, setGeofencesActive] = useState(false);
  const [geofencesPanelOpen, setGeofencesPanelOpen] = useState(false);
  const [geofenceSearch, setGeofenceSearch] = useState('');

  const {
    loading: loadingGeofences,
    geofenceCount,
    geofencesList,
    selectedGeofenceId,
    focusGeofence,
    fitAllGeofences,
    refetch: refetchGeofences,
  } = useLeafletGeofences(map, geofencesActive, baseUrl, username);

  const filteredGeofences = useMemo(() => {
    if (!geofenceSearch.trim()) return geofencesList;
    const q = geofenceSearch.toLowerCase().trim();
    return geofencesList.filter(
      (g) =>
        g.nombre.toLowerCase().includes(q) ||
        (g.descripcion && g.descripcion.toLowerCase().includes(q)),
    );
  }, [geofencesList, geofenceSearch]);

  const ruler = useLeafletRuler(map, rulerActive);
  const { clear: clearRuler } = ruler;
  const rulerPointCount = ruler.points.length;

  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Capa base de Google (con o sin tráfico). La anterior se retira cuando la
  // nueva terminó de cargar, para que no se vea el mapa en blanco al cambiar.
  useEffect(() => {
    if (!map) return;
    const next = googleTileLayer(baseLayer, trafficActive);

    const previous = tileLayerRef.current;
    tileLayerRef.current = next;
    next.addTo(map);
    next.bringToBack();

    if (previous) {
      const removePrevious = () => previous.remove();
      next.once('load', removePrevious);
      const fallback = window.setTimeout(removePrevious, 3000);
      return () => window.clearTimeout(fallback);
    }
  }, [map, baseLayer, trafficActive]);

  useEffect(() => {
    return () => {
      tileLayerRef.current?.remove();
      tileLayerRef.current = null;
    };
  }, []);

  // Al guardar Configuración > Preferencias se aplica el nuevo tipo sin recargar
  useEffect(() => {
    const handleSettingsUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.key === 'preferences' && detail.value?.mapType) {
        setBaseLayer(toMapTypeId(detail.value.mapType));
      }
    };
    window.addEventListener('trackvel:settings-updated', handleSettingsUpdate);
    return () => window.removeEventListener('trackvel:settings-updated', handleSettingsUpdate);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleZoomIn = useCallback(() => map?.zoomIn(), [map]);
  const handleZoomOut = useCallback(() => map?.zoomOut(), [map]);

  const handleCenter = useCallback(() => {
    if (onCenterMap) {
      onCenterMap();
    } else {
      map?.setView([-9.22812, -75.78894], 6);
    }
  }, [map, onCenterMap]);

  const toggleRuler = useCallback(() => {
    setRulerActive((prev) => {
      const next = !prev;
      if (next) setSearchOpen(false);
      return next;
    });
  }, []);

  const handleToggleGeofences = useCallback(() => {
    if (!geofencesActive) {
      setSearchOpen(false);
      setGeofencesActive(true);
      setGeofencesPanelOpen(true);
    } else if (!geofencesPanelOpen) {
      setSearchOpen(false);
      setGeofencesPanelOpen(true);
    } else {
      setGeofencesActive(false);
      setGeofencesPanelOpen(false);
    }
  }, [geofencesActive, geofencesPanelOpen]);

  // Atajos de la regla: Esc descarta lo medido, Enter termina y lo deja dibujado
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
      if (isTypingTarget(event.target)) return;
      if (event.key === 'Escape') {
        clearRuler();
        setRulerActive(false);
        return;
      }
      if (event.key === 'Enter' && rulerPointCount > 0) {
        setRulerActive(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [rulerActive, clearRuler, rulerPointCount]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen().catch(console.error);
    }
  }, []);

  // Buscador gratuito (OpenStreetMap Nominatim), igual que en trackvelnew
  const searchNominatim = useCallback(async (query: string) => {
    if (!query.trim() || query.trim().length < 3) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=pe`,
      );
      setSearchResults(await res.json());
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchInput = useCallback(
    (value: string) => {
      setSearchQuery(value);
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = setTimeout(() => searchNominatim(value), 400);
    },
    [searchNominatim],
  );

  const handleSearchSelect = useCallback(
    (lat: string, lon: string) => {
      if (!map) return;
      map.setView([parseFloat(lat), parseFloat(lon)], 18);
      setSearchOpen(false);
      setSearchQuery('');
      setSearchResults([]);
    },
    [map],
  );

  const toggleSearch = useCallback(() => {
    setSearchOpen((prev) => {
      if (!prev) {
        setGeofencesPanelOpen(false);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      } else {
        setSearchQuery('');
        setSearchResults([]);
      }
      return !prev;
    });
  }, []);

  // Que los clics y la rueda sobre los controles no lleguen al mapa
  const stopMapEvents = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    L.DomEvent.disableClickPropagation(el);
    L.DomEvent.disableScrollPropagation(el);
  }, []);

  if (!map) return null;

  const toolBtn =
    'flex h-8 w-8 items-center justify-center text-slate-700 transition-colors hover:bg-blue-50 hover:text-[#113EB9]';

  return (
    <div
      ref={stopMapEvents}
      className={`absolute ${positionClassName} pointer-events-auto z-20 flex select-none flex-col items-end gap-1.5`}
    >
      {/* Selector de tipo de mapa */}
      <MapTypeSelector value={baseLayer} onChange={setBaseLayer} />

      {/* Botonera de herramientas */}
      <div className="flex flex-col rounded-lg border border-slate-200/90 bg-white/95 shadow-sm backdrop-blur-md">
        <button type="button" onClick={handleZoomIn} className={`${toolBtn} rounded-t-lg`} title="Acercar mapa (+)">
          <Plus size={16} strokeWidth={3.8} />
        </button>
        <div className="mx-1.5 border-t border-slate-200/80" />
        <button type="button" onClick={handleZoomOut} className={toolBtn} title="Alejar mapa (-)">
          <Minus size={16} strokeWidth={3.8} />
        </button>
        <div className="mx-1.5 border-t border-slate-200/80" />
        <button type="button" onClick={handleCenter} className={toolBtn} title="Centrar vista general de la flota">
          <LocateFixed size={16} strokeWidth={3} />
        </button>
        <div className="mx-1.5 border-t border-slate-200/80" />
        <button
          type="button"
          onClick={() => setTrafficActive((prev) => !prev)}
          className={`relative flex h-8 w-8 items-center justify-center transition-colors ${
            trafficActive ? 'bg-green-600 text-white' : 'text-slate-700 hover:bg-blue-50 hover:text-[#113EB9]'
          }`}
          title={trafficActive ? 'Desactivar tráfico en vivo' : 'Activar tráfico en tiempo real'}
        >
          <FaTrafficLight size={14} />
          {trafficActive && (
            <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
          )}
        </button>
        <div className="mx-1.5 border-t border-slate-200/80" />
        <button
          type="button"
          onClick={toggleFullscreen}
          className={`${toolBtn} rounded-b-lg`}
          title={isFullscreen ? 'Salir de pantalla completa' : 'Modo Pantalla Completa'}
        >
          {isFullscreen ? <Minimize size={15} strokeWidth={3} /> : <Maximize size={15} strokeWidth={3} />}
        </button>
      </div>

      {/* Buscador de lugares (Nominatim) */}
      <div className="relative flex flex-col items-end">
        <div className="flex flex-col rounded-lg border border-slate-200/90 bg-white/95 shadow-sm backdrop-blur-md">
          <button
            type="button"
            onClick={toggleSearch}
            className={`relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
              searchOpen ? 'bg-[#113EB9] text-white shadow-sm' : 'text-slate-700 hover:bg-blue-50 hover:text-[#113EB9]'
            }`}
            title="Buscar lugar en el mapa"
          >
            {searchOpen ? <X size={15} strokeWidth={3} /> : <Search size={15} strokeWidth={3.2} />}
          </button>
        </div>

        {searchOpen && (
          <div className="absolute right-10 top-0 w-72 overflow-hidden rounded-lg border border-slate-200/90 bg-white/95 shadow-lg backdrop-blur-md">
            <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
              <Search size={13} className="shrink-0 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') toggleSearch();
                }}
                placeholder="Buscar lugar..."
                className="flex-1 bg-transparent text-[12px] text-slate-800 placeholder-slate-400 outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    searchInputRef.current?.focus();
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {isSearching && (
              <div className="px-3 py-3 text-center text-[11px] text-slate-400">Buscando...</div>
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
                      <span className="text-[11px] leading-tight text-slate-700">{result.display_name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {!isSearching && searchQuery.length >= 3 && searchResults.length === 0 && (
              <div className="px-3 py-3 text-center text-[11px] text-slate-400">No se encontraron resultados</div>
            )}

            {!isSearching && searchQuery.length > 0 && searchQuery.length < 3 && (
              <div className="px-3 py-3 text-center text-[11px] text-slate-400">Escribe al menos 3 caracteres</div>
            )}
          </div>
        )}
      </div>

      {/* Regla de medición */}
      <div className="flex flex-col rounded-lg border border-slate-200/90 bg-white/95 shadow-sm backdrop-blur-md">
        <button
          type="button"
          onClick={toggleRuler}
          className={`relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
            rulerActive ? 'bg-[#113EB9] text-white shadow-sm' : 'text-slate-700 hover:bg-blue-50 hover:text-[#113EB9]'
          }`}
          title={
            rulerActive
              ? 'Cerrar la regla (la medición queda en el mapa)'
              : rulerPointCount > 0
                ? 'Abrir la regla para seguir midiendo o borrar la medición'
                : 'Medir distancias sobre el mapa (regla)'
          }
        >
          <Ruler size={15} strokeWidth={3} />
          {!rulerActive && rulerPointCount > 0 && (
            <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-[#113EB9]" />
          )}
        </button>
      </div>

      {/* Geocercas */}
      <div className="relative flex flex-col items-end">
        <div className="flex flex-col rounded-lg border border-slate-200/90 bg-white/95 shadow-sm backdrop-blur-md">
          <button
            type="button"
            onClick={handleToggleGeofences}
            className={`relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
              geofencesActive ? 'bg-[#113EB9] text-white shadow-sm' : 'text-slate-700 hover:bg-blue-50 hover:text-[#113EB9]'
            }`}
            title={
              geofencesActive
                ? `Geocercas en mapa (${geofenceCount}) - Clic para ver lista u ocultar`
                : 'Mostrar geocercas en el mapa'
            }
          >
            {loadingGeofences ? (
              <RefreshCw size={14} className="animate-spin text-white" />
            ) : (
              <Hexagon size={16} strokeWidth={2.6} />
            )}
            {geofencesActive && !loadingGeofences && (
              <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400" />
            )}
          </button>
        </div>

        {geofencesPanelOpen && geofencesActive && (
          <div className="absolute bottom-0 right-10 z-30 flex max-h-[min(480px,calc(100vh-140px))] w-80 flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white/95 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-3.5 py-2.5">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-100/70 text-[#113EB9]">
                  <Hexagon size={13} className="stroke-[2.5]" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[12px] font-bold text-slate-800">Geocercas</span>
                  <span className="rounded-full bg-blue-100 px-1.5 text-[10px] font-bold text-[#113EB9]">
                    {geofenceCount}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {geofenceCount > 0 && (
                  <button
                    type="button"
                    onClick={fitAllGeofences}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-white hover:text-[#113EB9]"
                    title="Ajustar zoom para ver todas las geocercas"
                  >
                    <Maximize2 size={13} strokeWidth={2.5} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={refetchGeofences}
                  disabled={loadingGeofences}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-white hover:text-[#113EB9] disabled:opacity-50"
                  title="Recargar geocercas"
                >
                  <RefreshCw size={13} strokeWidth={2.5} className={loadingGeofences ? 'animate-spin text-[#113EB9]' : ''} />
                </button>
                <button
                  type="button"
                  onClick={() => setGeofencesPanelOpen(false)}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-white hover:text-slate-700"
                  title="Cerrar ventana (las geocercas continúan en el mapa)"
                >
                  <X size={14} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {geofenceCount > 2 && (
              <div className="border-b border-slate-100 bg-white px-3 py-2">
                <div className="flex items-center gap-2 rounded-lg border border-slate-200/80 bg-slate-50 px-2.5 py-1.5 transition-colors focus-within:border-blue-400 focus-within:bg-white">
                  <Search size={13} className="shrink-0 text-slate-400" />
                  <input
                    type="text"
                    value={geofenceSearch}
                    onChange={(e) => setGeofenceSearch(e.target.value)}
                    placeholder="Buscar geocerca..."
                    className="flex-1 bg-transparent text-[11px] text-slate-800 placeholder-slate-400 outline-none"
                  />
                  {geofenceSearch && (
                    <button type="button" onClick={() => setGeofenceSearch('')} className="text-slate-400 hover:text-slate-600">
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="max-h-[300px] flex-1 divide-y divide-slate-100 overflow-y-auto">
              {loadingGeofences && geofencesList.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-slate-400">
                  <RefreshCw size={18} className="animate-spin text-[#113EB9]" />
                  <span className="text-[11px] font-medium">Cargando geocercas...</span>
                </div>
              ) : filteredGeofences.length === 0 ? (
                <div className="px-4 py-7 text-center text-[11px] text-slate-400">
                  {geofenceSearch ? 'No se encontraron geocercas coincidentes' : 'No hay geocercas registradas'}
                </div>
              ) : (
                filteredGeofences.map((geo) => {
                  const isSelected = selectedGeofenceId === geo.id;
                  return (
                    <button
                      key={geo.id}
                      type="button"
                      onClick={() => focusGeofence(geo.id)}
                      className={`group flex w-full items-center justify-between px-3 py-2.5 text-left transition-all ${
                        isSelected
                          ? 'border-l-[3px] border-[#113EB9] bg-blue-50/90'
                          : 'border-l-[3px] border-transparent hover:bg-slate-50/90'
                      }`}
                      title={`Ir directamente a ${geo.nombre} en el mapa`}
                    >
                      <div className="flex min-w-0 items-center gap-2.5 pr-2">
                        <div
                          className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white"
                          style={{ backgroundColor: `${geo.color}18` }}
                        >
                          {geo.tipo === 'circle' ? (
                            <CircleDot size={15} style={{ color: geo.color }} />
                          ) : (
                            <Hexagon size={15} style={{ color: geo.color }} />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="block truncate text-[12px] font-semibold text-slate-800 transition-colors group-hover:text-[#113EB9]">
                            {geo.nombre}
                          </span>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                            <span>{geo.tipo === 'circle' ? 'Círculo' : 'Polígono'}</span>
                            {geo.tipo === 'circle' && geo.radius ? (
                              <>
                                <span>•</span>
                                <span>
                                  {geo.radius >= 1000 ? `${(geo.radius / 1000).toFixed(2)} km` : `${Math.round(geo.radius)} m`}
                                </span>
                              </>
                            ) : null}
                            {geo.tipo === 'polygon' && geo.pointCount ? (
                              <>
                                <span>•</span>
                                <span>{geo.pointCount} vértices</span>
                              </>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center text-slate-300 transition-colors group-hover:text-[#113EB9]">
                        <LocateFixed size={14} className="transition-transform group-hover:scale-110" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-3.5 py-2 text-[10px] text-slate-500">
              <span className="truncate">Clic en una geocerca para enfocar</span>
              <button
                type="button"
                onClick={() => {
                  setGeofencesActive(false);
                  setGeofencesPanelOpen(false);
                }}
                className="shrink-0 pl-2 font-medium text-red-500 transition-colors hover:text-red-700"
                title="Desactivar geocercas del mapa"
              >
                Ocultar del mapa
              </button>
            </div>
          </div>
        )}
      </div>

      {rulerActive && (
        <RulerPanel
          totalMeters={ruler.totalMeters}
          pointCount={rulerPointCount}
          onUndo={ruler.undo}
          onClear={ruler.clear}
          onFinish={() => setRulerActive(false)}
        />
      )}
    </div>
  );
}
