/**
 * Cálculo de distancias geodésicas sin costo ni dependencias externas.
 *
 * Usa la fórmula inversa de Vincenty sobre el elipsoide WGS-84 (el mismo que
 * usa el GPS), con precisión del orden del milímetro. Es notablemente más
 * exacta que las fórmulas esféricas (Haversine o la librería `geometry` de
 * Google), que asumen una Tierra redonda y se desvían hasta ~0.3% según la
 * latitud y la orientación del tramo.
 */

export interface LatLngPoint {
  lat: number;
  lng: number;
}

// Parámetros del elipsoide WGS-84
const SEMI_MAJOR = 6378137.0; // radio ecuatorial (m)
const FLATTENING = 1 / 298.257223563;
const SEMI_MINOR = (1 - FLATTENING) * SEMI_MAJOR; // radio polar (m)

const MAX_ITERATIONS = 200;
const CONVERGENCE = 1e-12; // ~0.06 mm

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/**
 * Respaldo esférico para los pocos casos en que Vincenty no converge
 * (puntos prácticamente antipodales).
 */
function haversineMeters(from: LatLngPoint, to: LatLngPoint): number {
  const radius = 6371008.8; // radio medio terrestre (m)
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * radius * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Distancia en metros entre dos coordenadas sobre el elipsoide WGS-84. */
export function distanceMeters(from: LatLngPoint, to: LatLngPoint): number {
  const L = toRadians(to.lng - from.lng);
  const U1 = Math.atan((1 - FLATTENING) * Math.tan(toRadians(from.lat)));
  const U2 = Math.atan((1 - FLATTENING) * Math.tan(toRadians(to.lat)));

  const sinU1 = Math.sin(U1);
  const cosU1 = Math.cos(U1);
  const sinU2 = Math.sin(U2);
  const cosU2 = Math.cos(U2);

  let lambda = L;
  let previousLambda = 0;
  let iterations = 0;

  let sinSigma = 0;
  let cosSigma = 0;
  let sigma = 0;
  let cosSqAlpha = 0;
  let cos2SigmaM = 0;

  do {
    const sinLambda = Math.sin(lambda);
    const cosLambda = Math.cos(lambda);

    sinSigma = Math.sqrt(
      (cosU2 * sinLambda) ** 2 +
        (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda) ** 2,
    );

    // Puntos coincidentes
    if (sinSigma === 0) return 0;

    cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosLambda;
    sigma = Math.atan2(sinSigma, cosSigma);

    const sinAlpha = (cosU1 * cosU2 * sinLambda) / sinSigma;
    cosSqAlpha = 1 - sinAlpha * sinAlpha;

    // Sobre la línea ecuatorial cosSqAlpha es 0 y cos2SigmaM queda indefinido
    cos2SigmaM =
      cosSqAlpha === 0 ? 0 : cosSigma - (2 * sinU1 * sinU2) / cosSqAlpha;

    const C =
      (FLATTENING / 16) * cosSqAlpha * (4 + FLATTENING * (4 - 3 * cosSqAlpha));

    previousLambda = lambda;
    lambda =
      L +
      (1 - C) *
        FLATTENING *
        sinAlpha *
        (sigma +
          C *
            sinSigma *
            (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM ** 2)));

    iterations += 1;
  } while (
    Math.abs(lambda - previousLambda) > CONVERGENCE &&
    iterations < MAX_ITERATIONS
  );

  // Puntos antipodales: la fórmula no converge, caemos al respaldo esférico
  if (iterations >= MAX_ITERATIONS) return haversineMeters(from, to);

  const uSq =
    (cosSqAlpha * (SEMI_MAJOR * SEMI_MAJOR - SEMI_MINOR * SEMI_MINOR)) /
    (SEMI_MINOR * SEMI_MINOR);

  const A = 1 + (uSq / 16384) * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
  const B = (uSq / 1024) * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));

  const deltaSigma =
    B *
    sinSigma *
    (cos2SigmaM +
      (B / 4) *
        (cosSigma * (-1 + 2 * cos2SigmaM ** 2) -
          (B / 6) *
            cos2SigmaM *
            (-3 + 4 * sinSigma ** 2) *
            (-3 + 4 * cos2SigmaM ** 2)));

  return SEMI_MINOR * A * (sigma - deltaSigma);
}

/** Suma de los tramos de una ruta, en metros. */
export function pathLengthMeters(points: LatLngPoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += distanceMeters(points[i - 1], points[i]);
  }
  return total;
}

/** Formatea metros a un texto corto y legible: "82.4 m", "1.28 km". */
export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters)) return '—';
  if (meters === 0) return '0 m';

  if (meters < 1000) {
    const decimals = meters < 10 ? 2 : meters < 100 ? 1 : 0;
    return `${meters.toFixed(decimals)} m`;
  }

  const km = meters / 1000;
  return `${km.toFixed(km < 100 ? 2 : 1)} km`;
}
