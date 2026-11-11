import { useEffect, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { useSession } from 'next-auth/react';
import { useApi } from '@/context/ApiContext';
import { aPosicion, useServiciosRutasApi } from './api';
import { AvisoServicio, PosicionConductor } from './types';

// Una unidad que no reporta hace más de esto se quita del mapa.
const VIGENCIA_MS = 10 * 60 * 1000;
const LIMPIEZA_MS = 15000;

const TOLERANCIA_FUTURO_MS = 30 * 1000;
const TIENE_ZONA = /(Z|[+-]\d{2}:?\d{2})$/i;

/**
 * Instante (ms) desde el que cuenta la vigencia de una posición: la hora del GPS (`fecha`) si es creíble, o
 * la hora de llegada a esta pantalla si no. Si el servidor manda la hora sin zona horaria se prueba también
 * como UTC; una hora en el futuro (reloj desfasado) se descarta. Así una unidad que dejó de reportar expira
 * aunque el backend siga reenviando su última posición, y una con `fecha` rara no queda para siempre.
 */
const instanteRecibido = (p: PosicionConductor): number => {
  const ahora = Date.now();
  if (!p.fecha) return ahora;
  const texto = p.fecha.trim();
  const candidatos = [Date.parse(texto)];
  if (!TIENE_ZONA.test(texto)) candidatos.push(Date.parse(`${texto.replace(' ', 'T')}Z`));
  const validos = candidatos.filter((t) => !Number.isNaN(t) && t <= ahora + TOLERANCIA_FUTURO_MS);
  return validos.length > 0 ? Math.min(ahora, Math.max(...validos)) : ahora;
};

// Posiciones de los conductores en tiempo real. La app del conductor las manda a
// POST api/servicios-rutas/{cuenta}/posiciones y el backend las reenvía por SignalR (evento
// "PosicionActualizada") sin guardarlas en la base. Al abrir la pantalla se pide una sola vez la
// última posición conocida (GET posiciones, de memoria) para no esperar al siguiente envío.
// Por la misma conexión llega el evento "ServicioActualizado" (llegada/salida de un paradero, cambio de
// estado, etc.), que se entrega a `onAviso` para refrescar la pantalla al instante.
export function usePosicionesEnVivo(onAviso?: (aviso: AvisoServicio) => void): PosicionConductor[] {
  // Siempre el último callback, sin reconectar el hub cuando cambia.
  const avisoRef = useRef(onAviso);
  useEffect(() => {
    avisoRef.current = onAviso;
  }, [onAviso]);

  const { baseUrl } = useApi();
  const { data: session } = useSession();
  const username = (session?.user?.username as string | undefined) ?? '';
  const api = useServiciosRutasApi();

  const [posiciones, setPosiciones] = useState<PosicionConductor[]>([]);
  const porClave = useRef<Map<string, PosicionConductor>>(new Map());
  const recibidoEn = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!baseUrl || !username) return;
    let activo = true;
    const mapa = porClave.current;
    const recibido = recibidoEn.current;
    mapa.clear();
    recibido.clear();

    const publicar = () => {
      if (activo) setPosiciones(Array.from(mapa.values()));
    };

    // Carga inicial (una vez). Si falla no pasa nada: las nuevas llegan igual por SignalR.
    api
      .getPosiciones()
      .then((lista) => {
        // Lo que ya llegó por SignalR mientras tanto es más reciente: no se pisa.
        lista.forEach((p) => {
          if (!mapa.has(p.clave)) {
            mapa.set(p.clave, p);
            recibido.set(p.clave, instanteRecibido(p));
          }
        });
        publicar();
      })
      .catch(() => undefined);

    const connection = new signalR.HubConnectionBuilder()
      // Hub anónimo y CORS abierto (*): sin credenciales, igual que el hub de turismo.
      .withUrl(`${baseUrl}/serviciosRutasHub/${encodeURIComponent(username)}`, { withCredentials: false })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connection.on('PosicionActualizada', (mensaje: unknown) => {      const p = aPosicion(mensaje);
      if (!p) return;
      mapa.set(p.clave, p);
      recibido.set(p.clave, instanteRecibido(p));
      publicar();
    });

    connection.on('ServicioActualizado', (aviso: AvisoServicio) => {
      if (aviso && typeof aviso === 'object') avisoRef.current?.(aviso);
    });

    // Al reconectar se pueden haber perdido envíos: se vuelve a pedir la última posición de cada unidad.
    connection.onreconnected(() => {
      api
        .getPosiciones()
        .then((lista) => {
          lista.forEach((p) => {
            mapa.set(p.clave, p);
            recibido.set(p.clave, instanteRecibido(p));
          });
          publicar();
        })
        .catch(() => undefined);
    });

    connection.start().catch((error) => {
      // eslint-disable-next-line no-console
      console.error('[serviciosRutasHub] no se pudo conectar', error);
    });

    // Quita del mapa las unidades que dejaron de reportar.
    const limpieza = setInterval(() => {
      let cambio = false;
      mapa.forEach((_p, clave) => {
        if (Date.now() - (recibido.get(clave) ?? 0) > VIGENCIA_MS) {
          mapa.delete(clave);
          recibido.delete(clave);
          cambio = true;
        }
      });
      if (cambio) publicar();
    }, LIMPIEZA_MS);

    return () => {
      activo = false;
      clearInterval(limpieza);
      connection.stop().catch(() => undefined);
    };
  }, [api, baseUrl, username]);

  return posiciones;
}
