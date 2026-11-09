import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { calcularLineaCalles, LatLng, limpiarLinea, LineaCalles, ParaderoRuta } from '@/lib/rutasCalles';

/*
 * GET /api/rutas/{id}/calles?cuenta={accountId}
 *
 * Devuelve la línea de la ruta por calles (OpenRouteService), calculada en el servidor para que
 * ORS_API_KEY nunca llegue al navegador.
 *
 * Caché (para no gastar el cupo diario de ORS):
 *   - Clave: cuenta + rutaId + updatedAt + versión del cálculo. Mientras la ruta no cambie no se
 *     vuelve a pedir a ORS.
 *   - En memoria y en disco (carpeta temporal del sistema): sobrevive a reinicios del servidor.
 *   - Si ORS falla (cupo agotado, caída) se devuelve la última línea buena de esa ruta, aunque sea de
 *     una versión anterior (X-Cache: STALE), y no se reintenta durante ESPERA_TRAS_ERROR_MS.
 */

export const dynamic = 'force-dynamic';

// Servidor que resuelve en qué servidor está cada cuenta (el mismo que usa el login).
const URL_SERVIDOR_CUENTA = 'https://do.velsat.pe:2083/api/Server';
const TTL_SERVIDOR_MS = 60 * 60 * 1000;
const ESPERA_TRAS_ERROR_MS = 10 * 60 * 1000;
const CUENTA_VALIDA = /^[A-Za-z0-9._-]{1,64}$/;
// Sube al cambiar el cálculo: las líneas guardadas con la versión anterior se recalculan.
const VERSION_CALCULO = 17;
const CARPETA_CACHE = path.join(os.tmpdir(), 'trackvel-rutas-calles');

interface RespuestaCalles extends LineaCalles {
  rutaId: number;
  updatedAt: string | null;
  generado: string;
}

interface Guardada {
  clave: string;
  resultado: RespuestaCalles;
}

interface DetalleRuta {
  id: number;
  updatedAt?: string | null;
  paraderos?: ParaderoRuta[] | null;
  trazado?: LatLng[] | null;
}

// En globalThis para que el estado sobreviva a las recargas del modo desarrollo.
const estado = globalThis as typeof globalThis & {
  __rutasCalles?: Map<string, Guardada>;
  __rutasCallesEnCurso?: Map<string, Promise<RespuestaCalles>>;
  __rutasCallesErrores?: Map<string, number>;
  __rutasServidores?: Map<string, { url: string; vence: number }>;
  /** Formato anterior de la caché (clave completa -> resultado); solo se lee como respaldo. */
  __rutasCallesCache?: Map<string, RespuestaCalles>;
};
/** Última línea buena por ruta (`cuenta|id`). */
const memoria = (estado.__rutasCalles ??= new Map());
const enCurso = (estado.__rutasCallesEnCurso ??= new Map());
/** Momento del último error de ORS por ruta, para no reintentar enseguida. */
const errores = (estado.__rutasCallesErrores ??= new Map());
const servidores = (estado.__rutasServidores ??= new Map());

const archivoDe = (ruta: string) => path.join(CARPETA_CACHE, `${ruta.replace('|', '_')}.json`);

async function leerGuardada(ruta: string): Promise<Guardada | null> {
  const enMemoria = memoria.get(ruta);
  if (enMemoria) {
    if (!enDisco.has(ruta)) await escribirGuardada(ruta, enMemoria);
    return enMemoria;
  }
  try {
    const guardada = JSON.parse(await fs.readFile(archivoDe(ruta), 'utf8')) as Guardada;
    if (guardada?.clave && Array.isArray(guardada.resultado?.linea)) {
      memoria.set(ruta, guardada);
      enDisco.add(ruta);
      return guardada;
    }
  } catch {
    // Sin archivo o ilegible: se busca en la caché con el formato anterior.
  }
  const anterior = Array.from(estado.__rutasCallesCache?.entries() ?? []).find(([k]) => k.startsWith(`${ruta}|`));
  if (anterior) {
    const guardada = { clave: anterior[0], resultado: anterior[1] };
    await escribirGuardada(ruta, guardada);
    return guardada;
  }
  return null;
}

/** Rutas cuya línea en memoria ya se escribió en disco (en este proceso). */
const enDisco = new Set<string>();

async function escribirGuardada(ruta: string, guardada: Guardada) {
  memoria.set(ruta, guardada);
  try {
    await fs.mkdir(CARPETA_CACHE, { recursive: true });
    await fs.writeFile(archivoDe(ruta), JSON.stringify(guardada));
    enDisco.add(ruta);
  } catch {
    // Si no se puede escribir en disco, queda al menos en memoria.
  }
}

async function servidorDeCuenta(cuenta: string): Promise<string> {
  const guardado = servidores.get(cuenta);
  if (guardado && guardado.vence > Date.now()) return guardado.url;
  const res = await fetch(`${URL_SERVIDOR_CUENTA}/${encodeURIComponent(cuenta)}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`No se pudo resolver el servidor de la cuenta (${res.status})`);
  const data = await res.json();
  const url = typeof data?.servidor === 'string' ? data.servidor.replace(/\/+$/, '') : '';
  if (!/^https:\/\/[^/]+$/.test(url)) throw new Error('El servidor de la cuenta no es válido');
  servidores.set(cuenta, { url, vence: Date.now() + TTL_SERVIDOR_MS });
  return url;
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Falta ORS_API_KEY en el servidor' }, { status: 500 });
  }

  const id = Number(params.id);
  const cuenta = request.nextUrl.searchParams.get('cuenta') ?? '';
  if (!Number.isInteger(id) || id <= 0 || !CUENTA_VALIDA.test(cuenta)) {
    return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 });
  }
  const rutaClave = `${cuenta}|${id}`;

  let guardada: Guardada | null = null;
  let trazado: LatLng[] | null = null;
  // La limpieza final (recortar vueltas) se aplica siempre al responder, también a lo guardado.
  const responder = (resultado: RespuestaCalles, cache: string, extra: Record<string, string> = {}) =>
    NextResponse.json(limpiarLinea(resultado, trazado), { headers: { 'X-Cache': cache, ...extra } });

  try {
    guardada = await leerGuardada(rutaClave);

    // El detalle trae paraderos, trazado y updatedAt (parte de la clave de la caché).
    const servidor = await servidorDeCuenta(cuenta);
    const resRuta = await fetch(
      `${servidor}/api/servicios-rutas/${encodeURIComponent(cuenta)}/rutas/${id}`,
      { cache: 'no-store' },
    );
    if (!resRuta.ok) throw new Error(`No se pudo leer la ruta (${resRuta.status})`);
    const ruta: DetalleRuta = await resRuta.json();
    trazado = ruta.trazado ?? null;
    const updatedAt = ruta.updatedAt ?? null;
    const clave = `${rutaClave}|${updatedAt ?? ''}|v${VERSION_CALCULO}`;

    if (guardada?.clave === clave) {
      return responder(guardada.resultado, 'HIT');
    }

    // ORS falló hace poco para esta ruta: no se gasta cupo reintentando enseguida.
    const ultimoError = errores.get(`${rutaClave}|v${VERSION_CALCULO}`);
    if (guardada && ultimoError && Date.now() - ultimoError < ESPERA_TRAS_ERROR_MS) {
      return responder(guardada.resultado, 'STALE');
    }

    // Si llegan varios pedidos a la vez para la misma ruta, ORS se llama una sola vez.
    let promesa = enCurso.get(clave);
    if (!promesa) {
      promesa = calcularLineaCalles(ruta.paraderos ?? [], ruta.trazado ?? null, apiKey).then((linea) => ({
        ...linea,
        rutaId: id,
        updatedAt,
        generado: new Date().toISOString(),
      }));
      enCurso.set(clave, promesa);
    }
    try {
      const resultado = await promesa;
      errores.delete(`${rutaClave}|v${VERSION_CALCULO}`);
      await escribirGuardada(rutaClave, { clave, resultado });
      return responder(resultado, 'MISS');
    } finally {
      enCurso.delete(clave);
    }
  } catch (error) {
    errores.set(`${rutaClave}|v${VERSION_CALCULO}`, Date.now());
    const mensaje = error instanceof Error ? error.message : 'Error al calcular la ruta por calles';
    // Mejor la última línea buena (aunque sea de una versión anterior) que el trazado punteado.
    if (guardada) {
      return responder(guardada.resultado, 'STALE', { 'X-Calles-Error': encodeURIComponent(mensaje) });
    }
    return NextResponse.json({ error: mensaje }, { status: 502 });
  }
}
