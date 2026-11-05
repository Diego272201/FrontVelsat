'use client';

import { useMemo } from 'react';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import { useApi } from '@/context/ApiContext';
import { getDeviceListUrlSelect } from '@/app/components/urlsApi/urlApi';
import { Paradero, Ruta, Servicio, EstadoServicio, NuevoServicioForm, SIN_GRUPO } from './types';
import { isoToDdMmYyyy } from './utils';

// Capa de acceso a api/servicios-rutas (backend). Todas las rutas exigen JWT:
// se usa el token de la sesión de next-auth y la URL del servidor del usuario.

interface RutaApi {
  id: number;
  codigo: string;
  nombre: string;
  grupo?: string | null;
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
  descripcion: string | null;
  distanciaKm: number | null;
  paraderos: ParaderoGuardar[];
}

const aRuta = (r: RutaApi): Ruta => ({
  id: r.id,
  codigo: r.codigo,
  nombre: r.nombre,
  grupo: r.grupo?.trim() ? r.grupo : SIN_GRUPO,
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
  const token = session?.user?.token as string | undefined;
  const username = (session?.user?.username as string | undefined) ?? '';

  // Solo se puede llamar cuando ya hay URL de servidor y token.
  const listo = Boolean(baseUrl && token);

  return useMemo(() => {
    const raiz = `${baseUrl}/api/servicios-rutas`;
    const cfg = { headers: { Authorization: `Bearer ${token}` } };

    return {
      listo,

      // ---- Rutas ----
      async getRutas(incluirInactivas = false): Promise<Ruta[]> {
        const { data } = await axios.get<RutaApi[]>(`${raiz}/rutas`, {
          ...cfg,
          params: { incluirInactivas },
        });
        return data.map(aRuta);
      },

      async getRuta(id: number): Promise<Ruta> {
        const { data } = await axios.get<RutaApi>(`${raiz}/rutas/${id}`, cfg);
        // TEMPORAL: ver en consola cómo llega el JSON del detalle (paraderos + trazado).
        console.log(`[servicios-rutas] GET rutas/${id}`, data);
        return aRuta(data);
      },

      async crearRuta(ruta: RutaGuardar): Promise<void> {
        await axios.post(`${raiz}/rutas`, cuerpoRuta(ruta), cfg);
      },

      async actualizarRuta(id: number, ruta: RutaGuardar): Promise<void> {
        await axios.put(`${raiz}/rutas/${id}`, cuerpoRuta(ruta), cfg);
      },

      async setRutaActiva(id: number, activo: boolean): Promise<void> {
        await axios.patch(`${raiz}/rutas/${id}/activo`, { activo }, cfg);
      },

      // ---- Servicios ----
      async getServicios(fechaIso: string): Promise<Servicio[]> {
        const fecha = isoToDdMmYyyy(fechaIso);
        const { data } = await axios.get<ServicioApi[]>(`${raiz}/servicios`, {
          ...cfg,
          params: { desde: fecha, hasta: fecha },
        });
        return data.map(aServicio);
      },

      async crearServicio(form: NuevoServicioForm): Promise<void> {
        await axios.post(`${raiz}/servicios`, cuerpoServicio(form), cfg);
      },

      // Solo servicios PROGRAMADO; el backend regenera las horas esperadas por paradero.
      async actualizarServicio(id: number, form: NuevoServicioForm): Promise<void> {
        await axios.put(`${raiz}/servicios/${id}`, cuerpoServicio(form), cfg);
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
          cfg,
        );
      },

      // PROGRAMADO o EN_CURSO -> CANCELADO. Iniciar y finalizar los hace la app móvil.
      async cancelarServicio(id: number): Promise<void> {
        await axios.patch(`${raiz}/servicios/${id}/estado`, { estado: 'CANCELADO' }, cfg);
      },

      // ---- Unidades (placas de la cuenta) ----
      async getUnidades(): Promise<string[]> {
        const { data } = await axios.get<{ deviceId?: string }[]>(
          getDeviceListUrlSelect(baseUrl, username),
          cfg,
        );
        return (Array.isArray(data) ? data : [])
          .map((d) => d.deviceId ?? '')
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
      },
    };
  }, [baseUrl, token, username, listo]);
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
    descripcion: ruta.descripcion,
    distanciaKm: ruta.distanciaKm,
    paraderos: ruta.paraderos,
  };
}
