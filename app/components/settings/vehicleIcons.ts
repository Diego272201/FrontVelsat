import type { VehicleIconId } from './types';
import { getIconTypeForUnit } from './useUserSettings';
import {
  getAutoSideSvgDataUrl,
  getAutoSvgDataUrl,
  getCisternaSideSvgDataUrl,
  getCisternaSvgDataUrl,
  getVanSideSvgDataUrl,
  getVanSvgDataUrl,
  normalizeVehicleHeading,
} from './vanSvgIcon';

export type CardinalDir =
  | 'norte'
  | 'noreste'
  | 'este'
  | 'sureste'
  | 'sur'
  | 'suroeste'
  | 'oeste'
  | 'noroeste';

export interface VehicleMarkerSpec {
  url: string;
  size: [number, number];
  /** Punto de anclaje opcional (en px). Para SVG 360° alinea el vehículo cerca del popup de placa. */
  anchor?: [number, number];
  dir: CardinalDir;
  iconType: VehicleIconId;
  /** Clave única para cachear el objeto Icon en Google Maps / Leaflet */
  cacheKey: string;
}

export function headingToCardinal(heading: number): CardinalDir {
  const h = ((Number(heading) || 0) % 360 + 360) % 360;
  if (h <= 22.5 || h > 337.5) return 'norte';
  if (h <= 67.5) return 'noreste';
  if (h <= 112.5) return 'este';
  if (h <= 157.5) return 'sureste';
  if (h <= 202.5) return 'sur';
  if (h <= 247.5) return 'suroeste';
  if (h <= 292.5) return 'oeste';
  return 'noroeste';
}

/**
 * Calcula la coordenada Y del `anchor` según el ángulo de rotación para que el borde
 * superior del vehículo mantenga siempre la misma distancia fija respecto al popup de
 * la placa, sin importar si apunta vertical, horizontal o diagonal.
 */
function computeDynamicAnchorY(
  angleDeg: number,
  centerY: number,
  halfLength: number,
  halfWidth: number,
  targetTopAboveGps = 31,
): number {
  const rad = (angleDeg * Math.PI) / 180;
  const halfHeight =
    halfLength * Math.abs(Math.cos(rad)) + halfWidth * Math.abs(Math.sin(rad));
  return Math.round(centerY + targetTopAboveGps - halfHeight);
}

/**
 * Devuelve la URL, tamaño y clave de caché del marcador para una unidad y rumbo dados.
 * Los tres tipos (auto, van y cisterna) usan SVG cenital rotado 360° con precisión
 * grado a grado e indicador de estado; en la lista lateral se muestra su SVG de perfil.
 */
export function resolveVehicleMarkerSpec(
  heading: number,
  deviceId?: string,
  options?: { iconTypeOverride?: VehicleIconId; isMoving?: boolean },
): VehicleMarkerSpec {
  const iconType: VehicleIconId =
    options?.iconTypeOverride ?? (deviceId ? getIconTypeForUnit(deviceId) : 'auto');
  const dir = headingToCardinal(heading);

  const angle = normalizeVehicleHeading(heading);
  const state = options?.isMoving === undefined ? 'n' : options.isMoving ? 'm' : 's';

  if (iconType === 'cisterna') {
    const anchorY = computeDynamicAnchorY(angle, 32, 26, 10, 31);
    return {
      url: getCisternaSvgDataUrl(angle, options?.isMoving),
      size: [64, 64],
      anchor: [32, anchorY],
      dir,
      iconType,
      cacheKey: `cisterna_${angle}_${state}`,
    };
  }

  if (iconType === 'van') {
    const anchorY = computeDynamicAnchorY(angle, 30, 23, 10, 31);
    return {
      url: getVanSvgDataUrl(angle, options?.isMoving),
      size: [60, 60],
      anchor: [30, anchorY],
      dir,
      iconType,
      cacheKey: `van_${angle}_${state}`,
    };
  }

  // Auto: SVG de 64 dibujado a 60 px (largo ~42 px, como los sprites WebP anteriores)
  const anchorY = computeDynamicAnchorY(angle, 30, 21, 10, 31);
  return {
    url: getAutoSvgDataUrl(angle, options?.isMoving),
    size: [60, 60],
    anchor: [30, anchorY],
    dir,
    iconType: 'auto',
    cacheKey: `auto_${angle}_${state}`,
  };
}

/**
 * Miniatura para la lista lateral de unidades: SVG de perfil lateral de cada tipo.
 * `customAutoSrc` permite conservar una imagen propia de Auto para cuentas específicas.
 */
export function getVehicleSidebarImage(deviceId: string, customAutoSrc?: string): string {
  const iconType = getIconTypeForUnit(deviceId);
  if (iconType === 'cisterna') return getCisternaSideSvgDataUrl();
  if (iconType === 'van') return getVanSideSvgDataUrl();
  return customAutoSrc || getAutoSideSvgDataUrl();
}
