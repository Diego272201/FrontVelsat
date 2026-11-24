import { useCallback, useEffect, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { useSession } from 'next-auth/react';
import { useApi } from '@/context/ApiContext';
import { useServiciosRutasApi } from '../api';
import { Notificacion } from '../types';

// Notificaciones del conductor en tiempo real. El backend las guarda y las reenvía por el hub
// (evento "NotificacionRecibida"). Se mantiene el contador de no leídas y las últimas recibidas.
export function useNotificaciones(onNueva?: (n: Notificacion) => void) {
  const nuevaRef = useRef(onNueva);
  useEffect(() => {
    nuevaRef.current = onNueva;
  }, [onNueva]);

  const { baseUrl } = useApi();
  const { data: session } = useSession();
  const username = (session?.user?.username as string | undefined) ?? '';
  const api = useServiciosRutasApi();

  const [noLeidas, setNoLeidas] = useState(0);
  const [recientes, setRecientes] = useState<Notificacion[]>([]);

  const recargar = useCallback(async () => {
    if (!api.listo) return;
    try {
      const [cantidad, lista] = await Promise.all([api.getCantidadNoLeidas(), api.getNotificaciones({}, 8)]);
      setNoLeidas(cantidad);
      setRecientes(lista);
    } catch {
      // sin conexión: se reintenta en la próxima recarga
    }
  }, [api]);

  useEffect(() => {
    if (!baseUrl || !username) return;
    recargar();

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${baseUrl}/serviciosRutasHub/${encodeURIComponent(username)}`, { withCredentials: false })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connection.on('NotificacionRecibida', (n: Notificacion) => {
      if (!n || typeof n !== 'object') return;
      setNoLeidas((c) => c + 1);
      setRecientes((lista) => [n, ...lista.filter((x) => x.id !== n.id)].slice(0, 8));
      nuevaRef.current?.(n);
    });
    // Al reconectar se pueden haber perdido avisos: se vuelve a consultar.
    connection.onreconnected(() => {
      recargar();
    });
    connection.start().catch(() => undefined);

    return () => {
      connection.stop().catch(() => undefined);
    };
  }, [baseUrl, username, recargar]);

  return { noLeidas, recientes, recargar };
}
