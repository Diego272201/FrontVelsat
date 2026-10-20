'use client';

/**
 * Agrupamiento de unidades (marker clustering) para el mapa en vivo de Trackvel.
 *
 * Lee la preferencia `preferences.clusterMarkers` guardada en localStorage
 * (Configuración > Preferencias > "Agrupar unidades cercanas") y la aplica en
 * caliente cuando el usuario guarda cambios, sin recargar la página.
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { MutableRefObject } from 'react';
import {
  MarkerClusterer,
  MarkerClustererEvents,
  SuperClusterAlgorithm,
  type Renderer,
} from '@googlemaps/markerclusterer';
import { getCurrentUser, loadSettings } from './useUserSettings';
import type { PreferenceSettings } from './types';

interface ClusterableMarkerData {
  marker: google.maps.Marker;
  /** Etiqueta con la placa (siempre visible sobre la unidad) */
  popup1: google.maps.OverlayView;
  /** Tarjeta con el detalle completo de la unidad (al hacer clic) */
  popup2: google.maps.OverlayView;
}

/** A partir de zoom 16 ya no se agrupa: se muestran todas las unidades individuales. */
const CLUSTER_MAX_ZOOM = 15;
const CLUSTER_RADIUS_PX = 80;

const createAlgorithm = () =>
  new SuperClusterAlgorithm({ radius: CLUSTER_RADIUS_PX, maxZoom: CLUSTER_MAX_ZOOM });

/**
 * Color naranja corporativo del sistema (definido en tailwind.config como `customOrange: #FB7B0F`).
 */
const CLUSTER_COLOR = '#FB7B0F';

/**
 * Burbuja de agrupación estilizada con el color naranja del sistema (#FB7B0F).
 * El número de unidades se incluye en el SVG vectorial para máxima nitidez en cualquier pantalla.
 */
const trackvelRenderer: Renderer = {
  render({ count, position }) {
    const size = count < 10 ? 44 : count < 50 ? 50 : 58;
    const half = size / 2;
    const fontSize = count > 99 ? 11 : count > 9 ? 12 : 13;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${half}" cy="${half}" r="${half - 1}" fill="${CLUSTER_COLOR}" fill-opacity="0.28"/>
      <circle cx="${half}" cy="${half}" r="${half - 5}" fill="${CLUSTER_COLOR}" stroke="#ffffff" stroke-width="2.5"/>
      <text x="${half}" y="${half}" text-anchor="middle" dominant-baseline="central" fill="#ffffff" font-size="${fontSize}px" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="700">${count}</text>
    </svg>`;

    const base64Svg =
      typeof window !== 'undefined'
        ? window.btoa(unescape(encodeURIComponent(svg)))
        : '';

    const baseZIndex =
      typeof google !== 'undefined' && google.maps?.Marker?.MAX_ZINDEX
        ? Number(google.maps.Marker.MAX_ZINDEX)
        : 1000;
    const zIndex = (Number.isFinite(baseZIndex) ? baseZIndex : 1000) + count;

    return new google.maps.Marker({
      position,
      icon: {
        url: `data:image/svg+xml;base64,${base64Svg}`,
        scaledSize: new google.maps.Size(size, size),
        anchor: new google.maps.Point(half, half),
      },
      title: `${count} unidades agrupadas — clic para acercar`,
      zIndex,
    });
  },
};

function readClusterPreference(): boolean {
  try {
    return Boolean(loadSettings(getCurrentUser()).preferences?.clusterMarkers);
  } catch {
    return false;
  }
}

function readShowPlatePreference(): boolean {
  try {
    return loadSettings(getCurrentUser()).preferences?.showPlateLabels !== false;
  } catch {
    return true;
  }
}

export function useMarkerClustering(
  mapRef: MutableRefObject<google.maps.Map | null>,
  markersDataRef: MutableRefObject<Record<string, ClusterableMarkerData>>,
  mapLoaded: boolean,
) {
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const enabledRef = useRef(false);

  /**
   * Sincroniza la visibilidad de los popups flotantes (placas y tarjetas).
   * Cuando una unidad está agrupada, su marcador individual se oculta y por tanto
   * su etiqueta de placa (popup1) también debe ocultarse.
   */
  const syncPopups = useCallback(() => {
    const map = mapRef.current;
    if (!map || !enabledRef.current) return;
    const showPlates = readShowPlatePreference();

    Object.values(markersDataRef.current).forEach(({ marker, popup1, popup2 }) => {
      const isMarkerVisible = Boolean(marker.getMap());
      if (isMarkerVisible && showPlates) {
        if (!popup1.getMap()) popup1.setMap(map);
      } else {
        if (popup1.getMap()) popup1.setMap(null);
        if (popup2.getMap()) popup2.setMap(null);
      }
    });
  }, [mapRef, markersDataRef]);

  /**
   * Actualiza la visibilidad de las etiquetas de placa según la preferencia
   * 'Mostrar placas en el mapa', respetando si el marcador está agrupado o no.
   */
  const syncPlatesVisibility = useCallback(
    (showPlates: boolean) => {
      const map = mapRef.current;
      if (!map) return;
      Object.values(markersDataRef.current).forEach(({ marker, popup1 }) => {
        const isMarkerVisible = Boolean(marker.getMap());
        if (showPlates && isMarkerVisible) {
          if (!popup1.getMap()) popup1.setMap(map);
        } else {
          if (popup1.getMap()) popup1.setMap(null);
        }
      });
    },
    [mapRef, markersDataRef],
  );

  const enable = useCallback(() => {
    const map = mapRef.current;
    if (!map || clustererRef.current) return;

    enabledRef.current = true;
    const allMarkers = Object.values(markersDataRef.current).map((d) => d.marker);

    const clusterer = new MarkerClusterer({
      map,
      markers: allMarkers,
      algorithm: createAlgorithm(),
      renderer: trackvelRenderer,
      onClusterClick: (_event, cluster, mapInstance) => {
        if (!cluster.bounds) {
          const currentZoom = mapInstance.getZoom() ?? 10;
          mapInstance.setCenter(cluster.position);
          mapInstance.setZoom(Math.min(currentZoom + 2, 18));
          return;
        }

        const ne = cluster.bounds.getNorthEast();
        const sw = cluster.bounds.getSouthWest();
        if (ne.equals(sw)) {
          const currentZoom = mapInstance.getZoom() ?? 10;
          mapInstance.setCenter(cluster.position);
          mapInstance.setZoom(Math.min(currentZoom + 2, 18));
        } else {
          mapInstance.fitBounds(cluster.bounds);
        }
      },
    });

    google.maps.event.addListener(clusterer, MarkerClustererEvents.CLUSTERING_END, syncPopups);
    clustererRef.current = clusterer;

    // Si el mapa aún no calculó su proyección (carga inicial), esperar al evento idle
    if (!map.getProjection()) {
      google.maps.event.addListenerOnce(map, 'idle', () => {
        if (clustererRef.current && enabledRef.current) {
          clustererRef.current.render();
          syncPopups();
        }
      });
    } else {
      clusterer.render();
      syncPopups();
    }
  }, [mapRef, markersDataRef, syncPopups]);

  const teardown = useCallback(() => {
    const clusterer = clustererRef.current;
    if (clusterer) {
      google.maps.event.clearInstanceListeners(clusterer);
      clusterer.clearMarkers(true);
      clusterer.setMap(null);
      clustererRef.current = null;
    }
  }, []);

  const disable = useCallback(() => {
    enabledRef.current = false;
    teardown();

    // Restaurar todos los marcadores individuales y sus placas
    const map = mapRef.current;
    if (!map) return;
    const showPlates = readShowPlatePreference();

    Object.values(markersDataRef.current).forEach(({ marker, popup1 }) => {
      marker.setMap(map);
      if (showPlates) {
        if (!popup1.getMap()) popup1.setMap(map);
      } else {
        if (popup1.getMap()) popup1.setMap(null);
      }
    });
  }, [mapRef, markersDataRef, teardown]);

  const apply = useCallback(
    (shouldCluster: boolean) => (shouldCluster ? enable() : disable()),
    [enable, disable],
  );

  // Estado inicial al cargar el mapa
  useEffect(() => {
    if (!mapLoaded) return;
    if (readClusterPreference()) {
      enable();
    }
  }, [mapLoaded, enable]);

  // Aplicar en caliente cuando el usuario guarda cambios en Preferencias
  useEffect(() => {
    const onSettingsUpdated = (e: Event) => {
      const detail = (e as CustomEvent<{ key: string; value: PreferenceSettings }>).detail;
      if (detail?.key !== 'preferences' || !mapRef.current) return;

      const shouldCluster = Boolean(detail.value?.clusterMarkers);
      if (shouldCluster !== enabledRef.current) {
        apply(shouldCluster);
      }

      if (typeof detail.value?.showPlateLabels === 'boolean') {
        syncPlatesVisibility(detail.value.showPlateLabels);
      }
    };

    window.addEventListener('trackvel:settings-updated', onSettingsUpdated);
    return () => window.removeEventListener('trackvel:settings-updated', onSettingsUpdated);
  }, [apply, mapRef, syncPlatesVisibility]);

  // Limpieza al desmontar el componente
  useEffect(() => () => teardown(), [teardown]);

  return useMemo(
    () => ({
      isEnabled: () => enabledRef.current,
      /** Registrar un marcador nuevo en el agrupador (si el agrupamiento está activo) */
      addMarker: (marker: google.maps.Marker) => {
        if (!clustererRef.current || !enabledRef.current) return;
        clustererRef.current.addMarker(marker, true);
      },
      /** Quitar un marcador del agrupador (si el agrupamiento está activo) */
      removeMarker: (marker: google.maps.Marker) => {
        if (!clustererRef.current || !enabledRef.current) return;
        clustererRef.current.removeMarker(marker, true);
      },
      /**
       * Recalcular grupos. Cuando las unidades se mueven en cada intervalo de refresco,
       * se regenera el algoritmo con las nuevas coordenadas.
       */
      refresh: () => {
        const clusterer = clustererRef.current;
        if (!clusterer || !enabledRef.current) return;

        const allMarkers = Object.values(markersDataRef.current).map((d) => d.marker);
        clusterer.clearMarkers(true);
        clusterer.addMarkers(allMarkers, true);
        (clusterer as unknown as { algorithm: SuperClusterAlgorithm }).algorithm =
          createAlgorithm();

        const map = mapRef.current;
        if (map && !map.getProjection()) {
          google.maps.event.addListenerOnce(map, 'idle', () => {
            if (clustererRef.current && enabledRef.current) {
              clustererRef.current.render();
              syncPopups();
            }
          });
        } else {
          clusterer.render();
          syncPopups();
        }
      },
      destroy: teardown,
    }),
    [syncPopups, teardown, mapRef, markersDataRef],
  );
}
