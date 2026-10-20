import L from 'leaflet';
import type { MapTypeId } from '@/app/components/MapTypeSelector';

/*
 * Tiles públicos de Google (la misma técnica que Traccar): imágenes PNG sin
 * API key ni cuenta de facturación, por lo que no generan ningún costo.
 * Se dibujan con Leaflet; NO se usa la Maps JavaScript API (de pago).
 */

// Código `lyrs` de Google para cada tipo de mapa
const GOOGLE_LYRS: Record<MapTypeId, string> = {
  roadmap: 'm',
  satellite: 's',
  hybrid: 'y',
  terrain: 'p',
};

export const GOOGLE_TILES_MAX_ZOOM = 21;

export function googleTilesUrl(type: MapTypeId, traffic = false): string {
  return `https://mt{s}.google.com/vt/lyrs=${GOOGLE_LYRS[type]}${traffic ? ',traffic' : ''}&x={x}&y={y}&z={z}&hl=es`;
}

export function googleTileLayer(type: MapTypeId, traffic = false): L.TileLayer {
  return L.tileLayer(googleTilesUrl(type, traffic), {
    subdomains: ['0', '1', '2', '3'],
    maxZoom: GOOGLE_TILES_MAX_ZOOM,
    attribution: '&copy; Google',
  });
}
