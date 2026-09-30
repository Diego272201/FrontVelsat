import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import * as signalR from '@microsoft/signalr';
import { API_BASE, TURISMO_HUB_URL, USUARIO_DESPACHO_TURISMO } from './constants';
import { MensajeTurismo } from './types';

// Alertas de mensajes/solicitudes del conductor: llegan en vivo por SignalR y no se cierran
// solas — quedan en pantalla hasta que el operador las marca como atendidas a mano. Por eso al
// montar también se recuperan las que quedaron pendientes en el servidor (por si el front estuvo
// cerrado o desconectado cuando se enviaron: SignalR solo entrega en vivo a quien está conectado
// en ese momento).
export function useMensajesTurismo() {
  const [alertas, setAlertas] = useState<MensajeTurismo[]>([]);
  const idsVistos = useRef<Set<number>>(new Set());

  const agregarAlerta = useCallback((mensaje: MensajeTurismo) => {
    if (idsVistos.current.has(mensaje.idmensaje)) return;
    idsVistos.current.add(mensaje.idmensaje);
    setAlertas(prev => [mensaje, ...prev]);
  }, []);

  useEffect(() => {
    let activo = true;

    (async () => {
      try {
        const { data } = await axios.get<MensajeTurismo[]>(`${API_BASE}/mensajes/pendientes`);
        if (!activo || !Array.isArray(data)) return;
        data.forEach(agregarAlerta);
      } catch {
        // Si falla, el operador se queda sin las alertas que llegaron mientras estaba
        // desconectado; no es crítico, las nuevas seguirán llegando en vivo.
      }
    })();

    const hubUrl = `${TURISMO_HUB_URL}/${USUARIO_DESPACHO_TURISMO}`;

    const connection = new signalR.HubConnectionBuilder()
      // El hub es anónimo (sin [Authorize], sin cookies): sin withCredentials: false, el cliente
      // manda la negociación con credenciales y el navegador la rechaza porque el backend permite
      // cualquier origen ("*"), y "Access-Control-Allow-Origin: *" es incompatible con credenciales.
      .withUrl(hubUrl, { withCredentials: false })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connection.on('NuevoMensajeTurismo', (mensaje: MensajeTurismo) => {
      agregarAlerta(mensaje);
    });

    // eslint-disable-next-line no-console
    connection.onclose((error) => console.warn('[turismoHub] conexión cerrada', hubUrl, error));
    // eslint-disable-next-line no-console
    connection.onreconnecting((error) => console.warn('[turismoHub] reconectando', hubUrl, error));

    connection
      .start()
      // eslint-disable-next-line no-console
      .then(() => console.info('[turismoHub] conectado', hubUrl))
      .catch((error) => {
        // Si falla la conexión en vivo, las alertas pendientes ya se cargaron por HTTP arriba;
        // el operador solo se pierde las que lleguen mientras siga sin conexión. Se deja el
        // error en consola porque, sin esto, un fallo de conexión es indistinguible de "no
        // llegó ningún mensaje nuevo" — y ese es justo el síntoma reportado.
        // eslint-disable-next-line no-console
        console.error('[turismoHub] no se pudo conectar', hubUrl, error);
      });

    return () => {
      activo = false;
      connection.stop().catch(() => {});
    };
  }, [agregarAlerta]);

  const marcarAtendida = useCallback(async (idmensaje: number) => {
    setAlertas(prev => prev.filter(a => a.idmensaje !== idmensaje));
    try {
      await axios.patch(`${API_BASE}/mensajes/${idmensaje}/atendido`);
    } catch {
      // La alerta ya se quitó de pantalla; si el PATCH falla, en la próxima carga de la página
      // GetMensajesPendientes la volvería a traer (queda "atendido = 0" en el servidor).
    }
  }, []);

  return { alertas, marcarAtendida };
}
