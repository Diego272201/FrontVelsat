'use client';

import { useMemo } from 'react';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import { useApi } from '@/context/ApiContext';
import { getDeviceListUrlSelect } from '@/app/components/urlsApi/urlApi';
import {
  Paradero,
  PosicionConductor,
  Ruta,
  Servicio,
  EstadoServicio,
  NuevoServicioForm,
  SIN_GRUPO,
  Sentido,
} from './types';
import { isoToDdMmYyyy } from './utils';

// Capa de acceso a api/servicios-rutas/{accountId}/... (backend). La cuenta va en la URL
// (el usuario de la sesión) y por ahora la API no exige token.

interface RutaApi {
  id: number;
  codigo: string;
  nombre: string;
  grupo?: string | null;
  sentido?: Sentido | null;
  rutaParejaId?: number | null;
  rutaParejaCodigo?: string | null;
  rutaParejaNombre?: string | null;
  descripcion?: string | null;
  distanciaKm?: number | null;
  activo: boolean;
  cantidadParaderos?: number | null;
  duracionMin?: number | null;
  paraderos?: Paradero[] | null;
  trazado?: [number, number][] | null;
}

interface ServicioApi {
  id: number;
  deviceID: string;
  rutaId: number;
  rutaCodigo?: string | null;
  rutaNombre?: string | null;
  rutaSentido?: Sentido | null;
  fechaSalida?: string | null;
  horaSalida?: string | null;
  conductorNombre: string;
  conductorBrevete: string;
  conductorCelular: string;
  estado: EstadoServicio;
  paraderosCompletados?: number | null;
  totalParaderos?: number | null;
}

export interface ParaderoGuardar {
  id?: number;
  nombre: string;
  latitud: number;
  longitud: number;
  radioMetros: number;
  minutosDesdeAnterior: number;
}

export interface RutaGuardar {
  codigo: string;
  nombre: string;
  grupo: string;
  sentido: Sentido;
  /** null = sin pareja (al editar, desenlaza la que tenía). */
  rutaParejaId: number | null;
  descripcion: string | null;
  distanciaKm: number | null;
  paraderos: ParaderoGuardar[];
}

const aRuta = (r: RutaApi): Ruta => ({
  id: r.id,
  codigo: r.codigo,
  nombre: r.nombre,
  grupo: r.grupo?.trim() ? r.grupo : SIN_GRUPO,
  sentido: r.sentido === 'REGRESO' ? 'REGRESO' : 'IDA',
  rutaParejaId: r.rutaParejaId ?? null,
  rutaParejaCodigo: r.rutaParejaCodigo ?? null,
  rutaParejaNombre: r.rutaParejaNombre ?? null,
  descripcion: r.descripcion ?? null,
  distanciaKm: r.distanciaKm ?? null,
  activo: r.activo,
  paraderos: r.paraderos ?? [],
  trazado: r.trazado ?? null,
  cantidadParaderos: r.cantidadParaderos ?? r.paraderos?.length ?? 0,
  duracionMin:
    r.duracionMin ?? r.paraderos?.[r.paraderos.length - 1]?.minutosAcumulados ?? 0,
});

const aServicio = (s: ServicioApi): Servicio => ({
  id: s.id,
  deviceID: s.deviceID,
  rutaId: s.rutaId,
  rutaCodigo: s.rutaCodigo ?? '',
  rutaNombre: s.rutaNombre ?? '',
  rutaSentido: s.rutaSentido === 'REGRESO' ? 'REGRESO' : 'IDA',
  fechaSalida: s.fechaSalida ?? '',
  horaSalida: s.horaSalida ?? '',
  conductorNombre: s.conductorNombre,
  conductorBrevete: s.conductorBrevete,
  conductorCelular: s.conductorCelular,
  estado: s.estado,
  paraderosCompletados: s.paraderosCompletados ?? 0,
  totalParaderos: s.totalParaderos ?? 0,
});

/** Saca el mensaje de error que devuelve el backend ({ message }) o uno genérico. */
export function mensajeError(error: unknown, porDefecto = 'Ocurrió un error'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; title?: string } | undefined;
    return data?.message || data?.title || error.message || porDefecto;
  }
  return error instanceof Error ? error.message : porDefecto;
}

export function useServiciosRutasApi() {
  const { baseUrl } = useApi();
  const { data: session } = useSession();
  const username = (session?.user?.username as string | undefined) ?? '';

  // Solo se puede llamar cuando ya hay URL de servidor y usuario (la cuenta de la URL).
  const listo = Boolean(baseUrl && username);

  return useMemo(() => {
    const raiz = `${baseUrl}/api/servicios-rutas/${encodeURIComponent(username)}`;

    return {
      listo,
      cuenta: username,

      // ---- Rutas ----
      async getRutas(incluirInactivas = false): Promise<Ruta[]> {
        const { data } = await axios.get<RutaApi[]>(`${raiz}/rutas`, {
          params: { incluirInactivas },
        });
        return data.map(aRuta);
      },

      async getRuta(id: number): Promise<Ruta> {
        const { data } = await axios.get<RutaApi>(`${raiz}/rutas/${id}`);
        // TEMPORAL: ver en consola cómo llega el JSON del detalle (paraderos + trazado).
        console.log(`[servicios-rutas] GET rutas/${id}`, data);
        return aRuta(data);
      },

      async crearRuta(ruta: RutaGuardar): Promise<void> {
        await axios.post(`${raiz}/rutas`, cuerpoRuta(ruta));
      },

      async actualizarRuta(id: number, ruta: RutaGuardar): Promise<void> {
        await axios.put(`${raiz}/rutas/${id}`, cuerpoRuta(ruta));
      },

      async setRutaActiva(id: number, activo: boolean): Promise<void> {
        await axios.patch(`${raiz}/rutas/${id}/activo`, { activo });
      },

      // ---- Servicios ----
      async getServicios(fechaIso: string): Promise<Servicio[]> {
        const fecha = isoToDdMmYyyy(fechaIso);
        const { data } = await axios.get<ServicioApi[]>(`${raiz}/servicios`, {
          params: { desde: fecha, hasta: fecha },
        });
        return data.map(aServicio);
      },

      async crearServicio(form: NuevoServicioForm): Promise<void> {
        await axios.post(`${raiz}/servicios`, cuerpoServicio(form));
      },

      // Solo servicios PROGRAMADO; el backend regenera las horas esperadas por paradero.
      async actualizarServicio(id: number, form: NuevoServicioForm): Promise<void> {
        await axios.put(`${raiz}/servicios/${id}`, cuerpoServicio(form));
      },

      // PROGRAMADO o EN_CURSO: nueva fecha/hora de salida (las llegadas ya marcadas se conservan).
      async reprogramarServicio(
        id: number,
        datos: { fechaIso: string; hora: string; motivo: string },
      ): Promise<void> {
        await axios.patch(
          `${raiz}/servicios/${id}/reprogramar`,
          {
            fechaSalida: isoToDdMmYyyy(datos.fechaIso),
            horaSalida: datos.hora,
            motivo: datos.motivo.trim() || null,
          },
        );
      },

      // PROGRAMADO o EN_CURSO -> CANCELADO. Iniciar y finalizar los hace la app móvil.
      async cancelarServicio(id: number): Promise<void> {
        await axios.patch(`${raiz}/servicios/${id}/estado`, { estado: 'CANCELADO' });
      },

      // ---- Recorrido por calles (Route Handler propio: llama a OpenRouteService en el servidor) ----
      async getLineaCalles(id: number): Promise<[number, number][]> {
        const { data } = await axios.get<{ linea: [number, number][] }>(`/api/rutas/${id}/calles`, {
          params: { cuenta: username },
        });
        return data.linea;
      },

      // ---- Posiciones en vivo de los conductores ----
      async getPosiciones(): Promise<PosicionConductor[]> {
        const { data } = await axios.get<unknown>(`${raiz}/posiciones`);
        const lista = Array.isArray(data)
          ? data
          : Array.isArray((data as { data?: unknown })?.data)
            ? (data as { data: unknown[] }).data
            : [];
        return lista.map(aPosicion).filter((p): p is PosicionConductor => p !== null);
      },

      // ---- Unidades (placas de la cuenta) ----
      async getUnidades(): Promise<string[]> {
        const { data } = await axios.get<{ deviceId?: string }[]>(
          getDeviceListUrlSelect(baseUrl, username),
        );
        return (Array.isArray(data) ? data : [])
          .map((d) => d.deviceId ?? '')
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
      },
    };
  }, [baseUrl, username, listo]);
}

function cuerpoServicio(form: NuevoServicioForm) {
  return {
    deviceID: form.deviceID,
    rutaId: form.rutaId,
    fechaSalida: isoToDdMmYyyy(form.fechaIso),
    horaSalida: form.hora,
    conductorNombre: form.conductorNombre.trim(),
    conductorBrevete: form.conductorBrevete.trim(),
    conductorCelular: form.conductorCelular.trim(),
  };
}

function cuerpoRuta(ruta: RutaGuardar) {
  return {
    codigo: ruta.codigo,
    nombre: ruta.nombre,
    // "Sin grupo" es solo una etiqueta del front: en la base va NULL.
    grupo: ruta.grupo === SIN_GRUPO ? null : ruta.grupo,
    sentido: ruta.sentido,
    rutaParejaId: ruta.rutaParejaId,
    descripcion: ruta.descripcion,
    distanciaKm: ruta.distanciaKm,
    paraderos: ruta.paraderos,
  };
}

// El formato de /posiciones todavía no está publicado: se aceptan los nombres de campo más comunes.
const primero = (o: Record<string, unknown>, claves: string[]): unknown =>
  claves.map((k) => o[k]).find((v) => v !== undefined && v !== null && v !== '');

const numero = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : null;
};

export function aPosicion(item: unknown): PosicionConductor | null {
  if (!item || typeof item !== 'object') return null;
  const o = item as Record<string, unknown>;
  const lat = numero(primero(o, ['latitud', 'lat', 'latitude']));
  const lng = numero(primero(o, ['longitud', 'lng', 'lon', 'longitude']));
  if (lat === null || lng === null || (lat === 0 && lng === 0)) return null;
  const deviceID = (primero(o, ['deviceID', 'deviceId', 'placa', 'unidad']) as string | undefined) ?? null;
  const conductor =
    (primero(o, ['conductorNombre', 'conductor', 'nombreConductor', 'nombre']) as string | undefined) ?? null;
  const clave = String(primero(o, ['deviceID', 'deviceId', 'placa', 'conductorId', 'idConductor', 'id', 'conductorNombre', 'conductor']) ?? `${lat},${lng}`);
  const fecha = primero(o, ['fecha', 'fechaHora', 'timestamp', 'fechaGps', 'ultimaActualizacion']);
  return {
    clave,
    lat,
    lng,
    rumbo: numero(primero(o, ['rumbo', 'heading', 'course', 'direccion'])) ?? 0,
    deviceID: deviceID ? String(deviceID) : null,
    conductor: conductor ? String(conductor) : null,
    rutaId: numero(primero(o, ['rutaId', 'idRuta'])),
    velocidad: numero(primero(o, ['velocidad', 'speed'])),
    fecha: fecha ? String(fecha) : null,
  };
}
