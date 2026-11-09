import simplify from '@turf/simplify';

// Solo servidor: usa Valhalla Map Matching (primario) y ORS_API_KEY como respaldo.
/*
 * Línea "por calles" de una ruta de Servicios Rutas.
 *
 * El `trazado` que guarda el backend es una línea aproximada: dibujada tal cual corta manzanas y
 * casas. Aquí se ajusta ese trazado 100% a la geometría real de las calles usando dos motores:
 *
 *   1. Motor principal — Map Matching (Valhalla `trace_route`):
 *      Recibe todos los puntos del trazado (sin el límite de 50 waypoints de ORS) en una sola
 *      consulta y encaja la polilínea completa sobre la red vial mediante modelos ocultos de
 *      Markov (`map_snap`), respetando el recorrido fijo de la ruta.
 *
 *   2. Motor de respaldo — OpenRouteService (`driving-car`):
 *      Si el servicio de Map Matching no está disponible o falla, calcula el recorrido por calles
 *      con OpenRouteService usando `continue_straight: true`, umbral de desvío estricto (25 m) y
 *      división automática en bloques cuando se superan los 50 puntos.
 */

export type LatLng = [number, number]; // [lat, lng]

export interface ParaderoRuta {
  latitud: number;
  longitud: number;
}

export interface TramoCalles {
  /** Índice del paradero de inicio del tramo (0 = origen). */
  desde: number;
  /** `trazado`: ORS no encontró por calles un camino razonable y se usa el trazado de la API. */
  fuente: 'calles' | 'trazado';
  metros: number;
}

export interface LineaCalles {
  linea: LatLng[];
  tramos: TramoCalles[];
  metros: number;
  puntosGuia: number;
  /** Bucles (vueltas que vuelven a pasar por el mismo lugar) que quedaron en la línea final. */
  bucles: number;
  /** Mayor distancia (m) de un punto del trazado a la línea final: cuánto se aparta del trazado. */
  desvioMaximo: number;
  /** Pedidos hechos a ORS para esta ruta. */
  pedidosOrs: number;
}

// Motor principal de Map Matching (Valhalla sobre OpenStreetMap) y respaldo OpenRouteService.
const VALHALLA_TRACE_URL = 'https://valhalla1.openstreetmap.de/trace_route';
const ORS_URL = 'https://api.heigit.org/openrouteservice/v2/directions/driving-car/geojson';
const MAX_PUNTOS_ORS = 50;
const LOTE_PUNTOS_ORS = 42;
const DISTANCIA_MIN_A_PARADERO = 45; // m
/** Un candidato del trazado a más de esto de la ruta indica que ORS se fue por otra calle. */
const DESVIO_ESENCIAL = 25; // m
const MAX_ITERACIONES = 10;
/** Para culpar a un guía de una vuelta: regreso a menos de esto (cubre avenidas de doble calzada). */
const CERCA_CULPABLE = 60; // m
/** Tolerancia de Douglas-Peucker para los candidatos (grados, ~4 m): se quedan las curvas. */
const TOLERANCIA_CANDIDATOS = 0.00004;
/** Desvío permitido (grados) entre el sentido del trazado y la calzada a la que ORS pega el punto. */
const DESVIO_RUMBO = 40;
/**
 * Bucle: la línea vuelve a menos de BUCLE_CERCA m de un punto por el que pasó hace más de
 * BUCLE_LARGO m (misma calzada / vuelta innecesaria), sin cortar retornos legítimos en avenidas
 * de doble calzada separadas por berlina central.
 */
const BUCLE_CERCA = 14;
const BUCLE_LARGO = 80;
const BUCLE_CERRADO_CERCA = 10;
const BUCLE_CERRADO_LARGO = 40;

/** ¿El punto `i` cierra una vuelta con el segmento `j`? (`recorrido`: metros entre ambos). */
function cierraBucle(linea: LatLng[], i: number, j: number, recorrido: number, cerca = BUCLE_CERCA): boolean {
  if (recorrido < BUCLE_CERRADO_LARGO) return false;
  const d = distanciaASegmento(linea[i], linea[j], linea[j + 1]);
  return recorrido >= BUCLE_LARGO ? d < cerca : d < BUCLE_CERRADO_CERCA;
}

/* ------------------------------------------------------------------ */
/* Geometría                                                           */
/* ------------------------------------------------------------------ */
const R = 6371008.8;
const rad = (g: number) => (g * Math.PI) / 180;

export function metrosEntre(a: LatLng, b: LatLng): number {
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function largo(linea: LatLng[]): number {
  let total = 0;
  for (let i = 1; i < linea.length; i++) total += metrosEntre(linea[i - 1], linea[i]);
  return total;
}

/** Rumbo de a hacia b en grados (0 = norte, sentido horario). */
function rumbo(a: LatLng, b: LatLng): number {
  const f1 = rad(a[0]);
  const f2 = rad(b[0]);
  const dl = rad(b[1] - a[1]);
  const y = Math.sin(dl) * Math.cos(f2);
  const x = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Sentido de circulación del trazado en una posición `segmento + t` (el del segmento que llega). */
function rumboEnLinea(linea: LatLng[], pos: number): number {
  let i = Math.min(Math.max(Math.ceil(pos) - 1, 0), linea.length - 2);
  // Se salta segmentos de largo cero (puntos repetidos).
  while (i > 0 && metrosEntre(linea[i], linea[i + 1]) < 1) i--;
  return rumbo(linea[i], linea[i + 1]);
}

function acumulado(linea: LatLng[]): number[] {
  const cum = [0];
  for (let i = 1; i < linea.length; i++) cum.push(cum[i - 1] + metrosEntre(linea[i - 1], linea[i]));
  return cum;
}

function distanciaASegmento(p: LatLng, a: LatLng, b: LatLng): number {
  const lat0 = rad(p[0]);
  const xy = (q: LatLng) => [q[1] * Math.cos(lat0) * 111320, q[0] * 110540];
  const [px, py] = xy(p);
  const [ax, ay] = xy(a);
  const [bx, by] = xy(b);
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
  return Math.hypot(ax + t * dx - px, ay + t * dy - py);
}

/**
 * Bucles de una línea, como rangos [desde, hasta] en metros: tramos en los que la línea vuelve a
 * pasar cerca de donde ya pasó (vuelta a la manzana, ida y vuelta por una calzada, etc.).
 */
export function detectarBucles(
  linea: LatLng[],
  cum = acumulado(linea),
  cerca = BUCLE_CERCA,
): [number, number][] {
  const rangos: [number, number][] = [];
  for (let i = 0; i < linea.length; i++) {
    for (let j = 0; j < linea.length - 1; j++) {
      if (cum[i] - cum[j + 1] < BUCLE_CERRADO_LARGO) break;
      if (cierraBucle(linea, i, j, cum[i] - cum[j + 1], cerca)) {
        rangos.push([cum[j], cum[i]]);
        break;
      }
    }
  }
  // Se unen los rangos que se pisan.
  rangos.sort((a, b) => a[0] - b[0]);
  const unidos: [number, number][] = [];
  for (const r of rangos) {
    const ultimo = unidos[unidos.length - 1];
    if (ultimo && r[0] <= ultimo[1]) ultimo[1] = Math.max(ultimo[1], r[1]);
    else unidos.push([r[0], r[1]]);
  }
  return unidos;
}

/** Posición de un punto sobre la línea como `segmento + t` (0..1), buscando desde `desde`. */
function posicionEnLinea(linea: LatLng[], p: LatLng, desde = 0): number {
  const lat0 = rad(p[0]);
  const xy = (q: LatLng) => [q[1] * Math.cos(lat0) * 111320, q[0] * 110540];
  const [px, py] = xy(p);
  let mejor = { pos: desde, d: Infinity };
  for (let i = Math.floor(desde); i < linea.length - 1; i++) {
    const [ax, ay] = xy(linea[i]);
    const [bx, by] = xy(linea[i + 1]);
    const dx = bx - ax;
    const dy = by - ay;
    const l2 = dx * dx + dy * dy;
    let t = l2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / l2;
    t = Math.max(0, Math.min(1, t));
    if (i + t < desde) t = desde - i;
    const d = Math.hypot(ax + t * dx - px, ay + t * dy - py);
    if (d < mejor.d) mejor = { pos: i + t, d };
  }
  return mejor.pos;
}

function puntoEn(linea: LatLng[], pos: number): LatLng {
  const i = Math.min(Math.floor(pos), linea.length - 2);
  const t = pos - i;
  const a = linea[i];
  const b = linea[i + 1];
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/** Trozo de la línea entre dos posiciones `segmento + t`. */
function subLinea(linea: LatLng[], desde: number, hasta: number): LatLng[] {
  if (linea.length < 2 || hasta <= desde) return [];
  const out: LatLng[] = [puntoEn(linea, desde)];
  for (let i = Math.floor(desde) + 1; i <= Math.floor(hasta) && i < linea.length; i++) out.push(linea[i]);
  out.push(puntoEn(linea, hasta));
  return out;
}

/* ------------------------------------------------------------------ */
/* Puntos guía                                                         */
/* ------------------------------------------------------------------ */
interface PuntoGuia {
  punto: LatLng;
  /** Posición sobre el trazado, para ordenarlo entre sus paraderos. */
  pos: number;
}

/** Curvas del trazado (Douglas-Peucker) que pueden servir de guía: lejos de los paraderos. */
function candidatosGuia(trazado: LatLng[], paraderos: LatLng[], posParaderos: number[]): PuntoGuia[] {
  if (trazado.length < 3) return [];
  const inicio = posParaderos[0];
  const fin = posParaderos[posParaderos.length - 1];
  const simple = simplify(
    { type: 'LineString', coordinates: trazado.map(([lat, lng]) => [lng, lat]) },
    { tolerance: TOLERANCIA_CANDIDATOS, highQuality: true },
  );
  const candidatos: PuntoGuia[] = [];
  let desde = 0;
  for (const [lng, lat] of simple.coordinates) {
    // Los vértices simplificados son vértices del trazado: se ubica su índice recorriendo hacia adelante.
    let idx = desde;
    while (idx < trazado.length && (trazado[idx][0] !== lat || trazado[idx][1] !== lng)) idx++;
    if (idx >= trazado.length) continue;
    desde = idx + 1;
    const punto: LatLng = [lat, lng];
    if (idx <= inicio || idx >= fin) continue;
    if (paraderos.some((p) => metrosEntre(p, punto) < DISTANCIA_MIN_A_PARADERO)) continue;
    candidatos.push({ punto, pos: idx });
  }
  return candidatos;
}

function distanciaALinea(p: LatLng, linea: LatLng[]): number {
  let min = Infinity;
  for (let k = 0; k < linea.length - 1; k++) min = Math.min(min, distanciaASegmento(p, linea[k], linea[k + 1]));
  return min;
}

/* ------------------------------------------------------------------ */
/* Map Matching (Valhalla trace_route — Sin límite de 50 puntos)       */
/* ------------------------------------------------------------------ */
function decodificarPolyline6(str: string): LatLng[] {
  let index = 0;
  let lat = 0;
  let lng = 0;
  const coordinates: LatLng[] = [];
  while (index < str.length) {
    let byte: number;
    let shift = 0;
    let result = 0;
    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coordinates.push([lat / 1e6, lng / 1e6]);
  }
  return coordinates;
}

function diferenciaAngulo(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/**
 * Filtra puntos repetidos o pequeños retrocesos involuntarios al dibujar el trazado a mano
 * (ej. un clic hacia atrás en un óvalo que obligaría a dar una vuelta extra de 360°).
 */
function prepararTrazadoMapMatch(trazado: LatLng[]): LatLng[] {
  if (trazado.length < 3) return trazado;
  const limpio: LatLng[] = [trazado[0]];
  for (let i = 1; i < trazado.length - 1; i++) {
    const prev = limpio[limpio.length - 1];
    const curr = trazado[i];
    const next = trazado[i + 1];
    if (metrosEntre(prev, curr) < 4) continue;
    const r1 = rumbo(prev, curr);
    const r2 = rumbo(curr, next);
    if (diferenciaAngulo(r1, r2) > 130 && (metrosEntre(prev, curr) < 180 || metrosEntre(curr, next) < 180)) {
      continue;
    }
    limpio.push(curr);
  }
  limpio.push(trazado[trazado.length - 1]);
  return limpio;
}

async function pedirValhallaMapMatch(puntosTrazo: LatLng[]): Promise<LatLng[]> {
  const trazoLimpio = prepararTrazadoMapMatch(puntosTrazo);
  const shape = trazoLimpio.map(([lat, lon], idx) => ({
    lat,
    lon,
    type: idx === 0 || idx === trazoLimpio.length - 1 ? 'break' : 'via',
  }));

  for (const costing of ['bus', 'auto'] as const) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const res = await fetch(VALHALLA_TRACE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          shape,
          costing,
          shape_match: 'map_snap',
          trace_options: {
            search_radius: 50,
            gps_accuracy: 20,
            breakage_distance: 3000,
            turn_penalty_factor: 500,
          },
        }),
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!res.ok) continue;
      const data = await res.json().catch(() => null);
      const legs: { shape?: string }[] | undefined = data?.trip?.legs;
      if (!Array.isArray(legs) || legs.length === 0) continue;
      const linea: LatLng[] = [];
      for (const leg of legs) {
        if (!leg.shape) continue;
        const pts = decodificarPolyline6(leg.shape);
        linea.push(...(linea.length > 0 ? pts.slice(1) : pts));
      }
      if (linea.length >= 2) return linea;
    } catch {
      // Si falla con 'bus' o hay timeout, intenta siguiente perfil o pasa al respaldo ORS.
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error('Map Matching de Valhalla no disponible para esta ruta');
}

/* ------------------------------------------------------------------ */
/* OpenRouteService (Respaldo con soporte > 50 puntos por lotes)       */
/* ------------------------------------------------------------------ */
interface RespuestaOrs {
  linea: LatLng[];
  /** Índice dentro de `linea` de cada punto pedido. */
  wayPoints: number[];
}

/**
 * Pide la ruta a ORS con soporte para más de 50 puntos dividiendo en lotes solapados.
 * Incluye `continue_straight: true` para evitar giros en U en puntos guía intermedios.
 */
async function pedirOrs(puntos: LatLng[], apiKey: string, rumbos: (number | null)[] | null): Promise<RespuestaOrs> {
  if (puntos.length <= MAX_PUNTOS_ORS) {
    return pedirOrsLote(puntos, apiKey, rumbos);
  }
  const lineaTotal: LatLng[] = [];
  const wayPointsTotal: number[] = [];
  let inicio = 0;
  while (inicio < puntos.length - 1) {
    const fin = Math.min(inicio + LOTE_PUNTOS_ORS, puntos.length);
    const subPuntos = puntos.slice(inicio, fin);
    const subRumbos = rumbos ? rumbos.slice(inicio, fin) : null;
    const res = await pedirOrsLote(subPuntos, apiKey, subRumbos);
    const offset = lineaTotal.length > 0 ? lineaTotal.length - 1 : 0;
    if (lineaTotal.length === 0) {
      lineaTotal.push(...res.linea);
      wayPointsTotal.push(...res.wayPoints);
    } else {
      lineaTotal.push(...res.linea.slice(1));
      wayPointsTotal.push(...res.wayPoints.slice(1).map((wp) => wp + offset));
    }
    if (fin === puntos.length) break;
    inicio = fin - 1;
  }
  return { linea: lineaTotal, wayPoints: wayPointsTotal };
}

async function pedirOrsLote(puntos: LatLng[], apiKey: string, rumbos: (number | null)[] | null): Promise<RespuestaOrs> {
  if (rumbos) {
    try {
      return await pedirOrsUnaVez(puntos, apiKey, rumbos);
    } catch {
      // Se reintenta sin sentido de circulación.
    }
  }
  return pedirOrsUnaVez(puntos, apiKey, null);
}

async function pedirOrsUnaVez(
  puntos: LatLng[],
  apiKey: string,
  rumbos: (number | null)[] | null,
): Promise<RespuestaOrs> {
  const res = await fetch(ORS_URL, {
    method: 'POST',
    headers: {
      Authorization: apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/geo+json, application/json',
    },
    body: JSON.stringify({
      coordinates: puntos.map(([lat, lng]) => [lng, lat]),
      radiuses: puntos.map(() => -1),
      continue_straight: true,
      // null = cualquier sentido (desvío de 180°).
      ...(rumbos
        ? { bearings: rumbos.map((r) => (r === null ? [0, 180] : [Math.round(r) % 360, DESVIO_RUMBO])) }
        : {}),
    }),
    cache: 'no-store',
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const detalle = data?.error?.message ?? data?.error ?? res.statusText;
    throw new Error(`ORS ${res.status}: ${typeof detalle === 'string' ? detalle : JSON.stringify(detalle)}`);
  }
  const feature = data?.features?.[0];
  const coords: [number, number][] | undefined = feature?.geometry?.coordinates;
  const wayPoints: number[] | undefined = feature?.properties?.way_points;
  if (!coords || !wayPoints || wayPoints.length !== puntos.length) {
    throw new Error('ORS devolvió una respuesta inesperada');
  }
  return { linea: coords.map(([lng, lat]) => [lat, lng]), wayPoints };
}

/* ------------------------------------------------------------------ */
/* Cálculo                                                             */
/* ------------------------------------------------------------------ */
export async function calcularLineaCalles(
  paraderosRuta: ParaderoRuta[],
  trazadoRuta: LatLng[] | null,
  apiKey?: string,
): Promise<LineaCalles> {
  const paraderos: LatLng[] = paraderosRuta.map((p) => [p.latitud, p.longitud]);
  if (paraderos.length < 2) throw new Error('La ruta necesita al menos 2 paraderos');
  const trazado = trazadoRuta && trazadoRuta.length >= 2 ? trazadoRuta : null;

  // 1. Intento principal: Map Matching (Valhalla trace_route) con todos los puntos del trazado
  // sin límite de 50 puntos, ajustando 100% la línea a las calles.
  try {
    const puntosEntrada = trazado ?? paraderos;
    const lineaMatch = await pedirValhallaMapMatch(puntosEntrada);
    const limpia = recortarBucles(lineaMatch, trazado);

    const posEnCalles: number[] = [];
    let desdePos = 0;
    for (const p of paraderos) {
      desdePos = posicionEnLinea(limpia, p, desdePos);
      posEnCalles.push(desdePos);
    }

    const tramos: TramoCalles[] = [];
    for (let k = 0; k < paraderos.length - 1; k++) {
      const trozo = subLinea(limpia, posEnCalles[k], posEnCalles[k + 1]);
      tramos.push({ desde: k, fuente: 'calles', metros: Math.round(largo(trozo)) });
    }

    const desvioMaximo = trazado ? Math.max(...trazado.map((p) => distanciaALinea(p, limpia))) : 0;
    return {
      linea: limpia.map(([lat, lng]) => [Math.round(lat * 1e6) / 1e6, Math.round(lng * 1e6) / 1e6]),
      tramos,
      metros: Math.round(largo(limpia)),
      puntosGuia: puntosEntrada.length,
      bucles: detectarBucles(limpia).length,
      desvioMaximo: Math.round(desvioMaximo),
      pedidosOrs: 0,
    };
  } catch {
    if (!apiKey) {
      throw new Error('Map Matching falló y no hay ORS_API_KEY de respaldo configurada');
    }
  }

  // 2. Respaldo automático: OpenRouteService mejorado (con soporte > 50 puntos por lotes).
  const posParaderos: number[] = [];
  if (trazado) {
    let desde = 0;
    for (const p of paraderos) {
      desde = posicionEnLinea(trazado, p, desde);
      posParaderos.push(desde);
    }
  }
  const rumbosParaderos = trazado ? posParaderos.map((pos) => rumboEnLinea(trazado, pos)) : null;
  const puntosParadero: LatLng[] = trazado ? posParaderos.map((pos) => puntoEn(trazado, pos)) : paraderos;
  const candidatos = trazado ? candidatosGuia(trazado, paraderos, posParaderos) : [];

  let pedidosOrs = 0;
  const conSentido = new Set<PuntoGuia>();
  const pedir = async (guias: PuntoGuia[]) => {
    const puntos: LatLng[] = [];
    const rumbos: (number | null)[] = [];
    const indiceParadero: number[] = [];
    const indiceGuia = new Map<PuntoGuia, number>();
    puntosParadero.forEach((p, k) => {
      indiceParadero.push(puntos.length);
      puntos.push(p);
      if (rumbosParaderos) rumbos.push(rumbosParaderos[k]);
      if (trazado && k < paraderos.length - 1) {
        guias
          .filter((g) => g.pos > posParaderos[k] && g.pos < posParaderos[k + 1])
          .sort((x, y) => x.pos - y.pos)
          .forEach((g) => {
            indiceGuia.set(g, puntos.length);
            puntos.push(g.punto);
            rumbos.push(conSentido.has(g) ? rumboEnLinea(trazado, g.pos) : null);
          });
      }
    });
    pedidosOrs += 1;
    const ors = await pedirOrs(puntos, apiKey, rumbosParaderos ? rumbos : null);
    return { ors, indiceParadero, indiceGuia };
  };

  let guias: PuntoGuia[] = [];
  const descartados = new Set<PuntoGuia>();
  let actual = await pedir(guias);
  for (let iteracion = 0; trazado && iteracion < MAX_ITERACIONES; iteracion++) {
    const cum = acumulado(actual.ors.linea);
    const bucles = detectarBucles(actual.ors.linea, cum, CERCA_CULPABLE);
    const culpables = guias.filter((g) => {
      const indice = actual.indiceGuia.get(g);
      if (indice === undefined) return false;
      const metro = cum[actual.ors.wayPoints[indice]];
      return bucles.some(([desde, hasta]) => metro >= desde - 40 && metro <= hasta + 40);
    });
    if (culpables.length > 0) {
      culpables.forEach((g) => (conSentido.has(g) ? descartados.add(g) : conSentido.add(g)));
      guias = guias.filter((g) => !descartados.has(g));
      actual = await pedir(guias);
      continue;
    }

    const nuevas: PuntoGuia[] = [];
    for (let k = 0; k < paraderos.length - 1; k++) {
      const tramo = actual.ors.linea.slice(
        actual.ors.wayPoints[actual.indiceParadero[k]],
        actual.ors.wayPoints[actual.indiceParadero[k + 1]] + 1,
      );
      let peor: { g: PuntoGuia; d: number } | null = null;
      for (const g of candidatos) {
        if (g.pos <= posParaderos[k] || g.pos >= posParaderos[k + 1]) continue;
        if (descartados.has(g) || guias.includes(g)) continue;
        const d = distanciaALinea(g.punto, tramo);
        if (d > DESVIO_ESENCIAL && (!peor || d > peor.d)) peor = { g, d };
      }
      if (peor) nuevas.push(peor.g);
    }
    if (nuevas.length === 0) break;
    guias = [...guias, ...nuevas];
    actual = await pedir(guias);
  }

  // Se conserva siempre la geometría por calles (sin sustituir por trazado recto sobre manzanas).
  const linea: LatLng[] = [];
  const tramos: TramoCalles[] = [];
  for (let k = 0; k < paraderos.length - 1; k++) {
    const tramo = recortarBucles(
      actual.ors.linea.slice(
        actual.ors.wayPoints[actual.indiceParadero[k]],
        actual.ors.wayPoints[actual.indiceParadero[k + 1]] + 1,
      ),
      trazado,
    );
    const metros = largo(tramo);
    linea.push(...(linea.length > 0 ? tramo.slice(1) : tramo));
    tramos.push({ desde: k, fuente: 'calles', metros: Math.round(metros) });
  }

  const final = recortarBucles(linea, trazado);
  const desvioMaximo = trazado ? Math.max(...trazado.map((p) => distanciaALinea(p, final))) : 0;

  return {
    linea: final.map(([lat, lng]) => [Math.round(lat * 1e6) / 1e6, Math.round(lng * 1e6) / 1e6]),
    tramos,
    metros: Math.round(largo(final)),
    puntosGuia: guias.length,
    bucles: detectarBucles(final).length,
    desvioMaximo: Math.round(desvioMaximo),
    pedidosOrs,
  };
}

/** Punto de `ab` más cercano a `p`. */
function proyectar(p: LatLng, a: LatLng, b: LatLng): LatLng {
  const lat0 = rad(p[0]);
  const kx = Math.cos(lat0) * 111320;
  const ky = 110540;
  const dx = (b[1] - a[1]) * kx;
  const dy = (b[0] - a[0]) * ky;
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[1] - a[1]) * kx * dx + (p[0] - a[0]) * ky * dy) / l2));
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/**
 * Quita las vueltas de la línea: si en el punto `i` la línea vuelve cerca del segmento `j` por el
 * que ya pasó (ver cierraBucle), se une `j` con `i` y se descarta lo de
 * en medio.
 *
 * Si el trazado de la API no tiene ninguna vuelta, la ruta nunca pasa dos veces por el mismo lugar
 * y se recortan todas. Si el trazado sí tiene (una ruta que entra a un lugar y regresa por la misma
 * calle), solo se recortan las vueltas cortas, que son errores de calzada.
 */
const MAX_RECORTE_SI_TRAZADO_VUELVE = 600; // m

export function recortarBucles(entrada: LatLng[], trazado: LatLng[] | null): LatLng[] {
  const sinLimite = !!trazado && detectarBucles(trazado).length === 0;
  let linea = entrada;
  for (let vuelta = 0; vuelta < 200; vuelta++) {
    const cum = acumulado(linea);
    let corte: { i: number; j: number } | null = null;
    for (let i = 0; i < linea.length && !corte; i++) {
      for (let j = 0; j < linea.length - 1; j++) {
        if (cum[i] - cum[j + 1] < BUCLE_CERRADO_LARGO) break;
        if (!sinLimite && cum[i] - cum[j] > MAX_RECORTE_SI_TRAZADO_VUELVE) continue;
        if (cierraBucle(linea, i, j, cum[i] - cum[j + 1])) {
          corte = { i, j };
          break;
        }
      }
    }
    if (!corte) return linea;
    const { i, j } = corte;
    linea = [...linea.slice(0, j + 1), proyectar(linea[i], linea[j], linea[j + 1]), ...linea.slice(i)];
  }
  return linea;
}

/**
 * Limpieza final de una línea ya calculada (sin pedir nada a ORS): recorta vueltas y recalcula
 * largo y desvío. Se aplica también a las líneas guardadas en caché, así una mejora de la limpieza
 * llega a todas las rutas sin gastar cupo de ORS.
 */
export function limpiarLinea<T extends Pick<LineaCalles, 'linea' | 'metros' | 'bucles' | 'desvioMaximo'>>(
  resultado: T,
  trazadoRuta: LatLng[] | null,
): T {
  const trazado = trazadoRuta && trazadoRuta.length >= 2 ? trazadoRuta : null;
  const linea = recortarBucles(resultado.linea, trazado);
  return {
    ...resultado,
    linea,
    metros: Math.round(largo(linea)),
    bucles: detectarBucles(linea).length,
    desvioMaximo: trazado ? Math.round(Math.max(...trazado.map((p) => distanciaALinea(p, linea)))) : 0,
  };
}
