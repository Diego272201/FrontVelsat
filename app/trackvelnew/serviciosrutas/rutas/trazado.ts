// Operaciones puras sobre el trazado de una ruta: lista de puntos [latitud, longitud].
// Ninguna modifica la lista recibida: todas devuelven una nueva.

export type Punto = [number, number];

const M_POR_GRADO = 111320;

/** Seis decimales (~0,1 m): lo que guarda la base. */
export const redondearPunto = ([lat, lng]: Punto): Punto => [
  Math.round(lat * 1e6) / 1e6,
  Math.round(lng * 1e6) / 1e6,
];

export function metrosEntre(a: Punto, b: Punto): number {
  const rad = Math.PI / 180;
  const dLat = (b[0] - a[0]) * rad;
  const dLng = (b[1] - a[1]) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

export function largoMetros(linea: readonly Punto[]): number {
  let total = 0;
  for (let i = 1; i < linea.length; i++)
    total += metrosEntre(linea[i - 1], linea[i]);
  return total;
}

/** Mueve toda la línea `norte` metros al norte y `este` metros al este (negativos: sur / oeste). */
export function desplazar(
  linea: readonly Punto[],
  norte: number,
  este: number,
): Punto[] {
  return linea.map(([lat, lng]) =>
    redondearPunto([
      lat + norte / M_POR_GRADO,
      lng +
        este / (M_POR_GRADO * Math.max(Math.cos((lat * Math.PI) / 180), 0.01)),
    ]),
  );
}

/** Pone un punto nuevo en el segmento `[indice, indice + 1]`. */
export function insertarDespuesDe(
  linea: readonly Punto[],
  indice: number,
  punto: Punto,
): Punto[] {
  const copia = [...linea];
  copia.splice(indice + 1, 0, redondearPunto(punto));
  return copia;
}

export function quitarPunto(linea: readonly Punto[], indice: number): Punto[] {
  return linea.filter((_, i) => i !== indice);
}

export function moverPunto(
  linea: readonly Punto[],
  indice: number,
  punto: Punto,
): Punto[] {
  return linea.map((p, i) => (i === indice ? redondearPunto(punto) : p));
}

/** Agrega un punto al final, o al inicio si `alInicio`. */
export function agregarPunto(
  linea: readonly Punto[],
  punto: Punto,
  alInicio: boolean,
): Punto[] {
  const nuevo = redondearPunto(punto);
  return alInicio ? [nuevo, ...linea] : [...linea, nuevo];
}

/** Deja la línea desde el punto `indice` hasta el final (quita lo anterior). */
export const quitarAnteriores = (
  linea: readonly Punto[],
  indice: number,
): Punto[] => linea.slice(indice);

/** Deja la línea desde el inicio hasta el punto `indice` (quita lo posterior). */
export const quitarPosteriores = (
  linea: readonly Punto[],
  indice: number,
): Punto[] => linea.slice(0, indice + 1);

export const invertir = (linea: readonly Punto[]): Punto[] =>
  [...linea].reverse();

/**
 * Une otra línea a ésta: la pega al final (o al inicio). Con `invertirOtra` la otra se recorre al revés.
 * Si el último punto de una coincide con el primero de la otra no se repite.
 */
export function unir(
  linea: readonly Punto[],
  otra: readonly Punto[],
  alFinal: boolean,
  invertirOtra: boolean,
): Punto[] {
  const extra = invertirOtra ? [...otra].reverse() : [...otra];
  const [primera, segunda] = alFinal
    ? [[...linea], extra]
    : [extra, [...linea]];
  if (primera.length > 0 && segunda.length > 0) {
    const ultimo = primera[primera.length - 1];
    if (metrosEntre(ultimo, segunda[0]) < 0.5) segunda.shift();
  }
  return [...primera, ...segunda];
}

// Distancia (m) de p al segmento a-b, en un plano local (suficiente a escala de ciudad).
function distanciaASegmento(p: Punto, a: Punto, b: Punto): number {
  const k = Math.cos((p[0] * Math.PI) / 180);
  const px = p[1] * k * M_POR_GRADO;
  const py = p[0] * M_POR_GRADO;
  const ax = a[1] * k * M_POR_GRADO;
  const ay = a[0] * M_POR_GRADO;
  const bx = b[1] * k * M_POR_GRADO;
  const by = b[0] * M_POR_GRADO;
  const dx = bx - ax;
  const dy = by - ay;
  const largo2 = dx * dx + dy * dy;
  const t =
    largo2 === 0
      ? 0
      : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / largo2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Quita los puntos que no cambian la forma más de `toleranciaM` metros (Douglas-Peucker). */
export function simplificar(
  linea: readonly Punto[],
  toleranciaM: number,
): Punto[] {
  if (linea.length < 3) return [...linea];
  const conservar = new Array<boolean>(linea.length).fill(false);
  conservar[0] = conservar[linea.length - 1] = true;
  const pila: Array<[number, number]> = [[0, linea.length - 1]];
  while (pila.length > 0) {
    const [ini, fin] = pila.pop()!;
    let mayor = 0;
    let indice = -1;
    for (let i = ini + 1; i < fin; i++) {
      const d = distanciaASegmento(linea[i], linea[ini], linea[fin]);
      if (d > mayor) {
        mayor = d;
        indice = i;
      }
    }
    if (indice !== -1 && mayor > toleranciaM) {
      conservar[indice] = true;
      pila.push([ini, indice], [indice, fin]);
    }
  }
  return linea.filter((_, i) => conservar[i]);
}
