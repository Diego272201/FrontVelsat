import { useEffect, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { useSession } from 'next-auth/react';
import { useApi } from '@/context/ApiContext';
import { aPosicion, useServiciosRutasApi } from './api';
import { AvisoServicio, PosicionConductor } from './types';

// Una unidad que no reporta hace más de esto se quita del mapa.
const VIGENCIA_MS = 2 * 60 * 1000;
const LIMPIEZA_MS = 15000;

const estaVigente = (p: PosicionConductor) => {
  const t = p.fecha ? Date.parse(p.fecha) : NaN;
  return Number.isNaN(t) || Date.now() - t <= VIGENCIA_MS;
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

  useEffect(() => {
    if (!baseUrl || !username) return;
    let activo = true;
    const mapa = porClave.current;
    mapa.clear();

    const publicar = () => {
      if (activo) setPosiciones(Array.from(mapa.values()));
    };

    // Carga inicial (una vez). Si falla no pasa nada: las nuevas llegan igual por SignalR.
    api
      .getPosiciones()
      .then((lista) => {
        // Lo que ya llegó por SignalR mientras tanto es más reciente: no se pisa.
        lista.forEach((p) => {
          if (!mapa.has(p.clave)) mapa.set(p.clave, p);
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

    connection.on('PosicionActualizada', (mensaje: unknown) => {
      const p = aPosicion(mensaje);
      if (!p) return;
      mapa.set(p.clave, p);
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
          lista.forEach((p) => mapa.set(p.clave, p));
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
      mapa.forEach((p, clave) => {
        if (!estaVigente(p)) {
          mapa.delete(clave);
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
