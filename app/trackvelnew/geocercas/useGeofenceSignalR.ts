'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';
import { toast } from 'sonner';
import { getAlertasReport, AlertaItem } from './reportsApi';

const BASE_URL = process.env.NEXT_PUBLIC_TRACKVEL_API_URL || 'http://localhost:5000';
export const SIGNALR_HUB_URL = `${BASE_URL.replace(/\/+$/, '')}/notificationsHub`;

export interface RealtimeGeofenceAlert {
  id: string;
  numericId?: number;
  accountID: string;
  deviceID: string;
  geofenceID: number;
  geofenceName: string;
  eventType: 'geofenceEnter' | 'geofenceExit';
  serverTime: string; // ISO
  serverTimeUtc?: string;
  latitude: number;
  longitude: number;
  speed?: number;
  durationMinutes: number | null;
  receivedAt: number;
  isLive?: boolean;
}

export type SignalRConnectionStatus =
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'connecting';

interface UseGeofenceSignalROptions {
  accountID?: string | null;
  enabled?: boolean;
  isDrawerOpen?: boolean;
}

const STORAGE_KEY_PREFIX = 'trackvel_last_read_alerts_';

function getLastReadTime(account: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    const val = localStorage.getItem(`${STORAGE_KEY_PREFIX}${account}`);
    return val ? Number(val) || 0 : 0;
  } catch {
    return 0;
  }
}

function setLastReadTime(account: string, timestamp: number) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${account}`, String(timestamp));
  } catch {}
}

/**
 * Mapea un registro de AlertaItem (deviceevent) a RealtimeGeofenceAlert
 */
export function mapAlertaItemToAlert(
  item: AlertaItem,
  defaultAccount: string,
): RealtimeGeofenceAlert {
  const isExit =
    String(item.eventType || '').toLowerCase().includes('exit') ||
    String(item.eventType || '').toLowerCase().includes('salida');

  let isoTime = item.serverTimeUtc;
  if (!isoTime) {
    if (typeof item.serverTime === 'number') {
      isoTime = new Date(
        item.serverTime > 1e11 ? item.serverTime : item.serverTime * 1000,
      ).toISOString();
    } else if (item.serverTime) {
      isoTime = new Date(item.serverTime).toISOString();
    } else {
      isoTime = new Date().toISOString();
    }
  }

  return {
    id: `alert-${item.id}`,
    numericId: item.id,
    accountID: item.accountID || defaultAccount || 'movilbus',
    deviceID: item.deviceID || 'Vehículo',
    geofenceID: Number(item.geofenceID || 0),
    geofenceName: item.geofenceName || 'Geocerca',
    eventType: isExit ? 'geofenceExit' : 'geofenceEnter',
    serverTime: isoTime,
    serverTimeUtc: isoTime,
    latitude: Number(item.latitude || 0),
    longitude: Number(item.longitude || 0),
    speed:
      item.speed !== undefined && item.speed !== null
        ? Number(item.speed)
        : undefined,
    durationMinutes:
      item.durationMinutes !== undefined && item.durationMinutes !== null
        ? Number(item.durationMinutes)
        : null,
    receivedAt: new Date(isoTime).getTime(),
    isLive: false,
  };
}

export function useGeofenceSignalR({
  accountID,
  enabled = true,
  isDrawerOpen = false,
}: UseGeofenceSignalROptions) {
  const [status, setStatus] = useState<SignalRConnectionStatus>('disconnected');
  const [alerts, setAlerts] = useState<RealtimeGeofenceAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loadingAlerts, setLoadingAlerts] = useState<boolean>(false);

  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const accountIdRef = useRef<string | null | undefined>(accountID);
  const isDrawerOpenRef = useRef<boolean>(Boolean(isDrawerOpen));

  useEffect(() => {
    accountIdRef.current = accountID;
  }, [accountID]);

  const markAllAsRead = useCallback(() => {
    setUnreadCount(0);
    const targetAccount = accountIdRef.current || accountID || 'movilbus';
    setAlerts((currAlerts) => {
      const maxAlertTime = currAlerts.reduce(
        (max, a) => Math.max(max, new Date(a.serverTime).getTime()),
        Date.now(),
      );
      setLastReadTime(targetAccount, maxAlertTime);
      return currAlerts;
    });
  }, [accountID]);

  useEffect(() => {
    isDrawerOpenRef.current = Boolean(isDrawerOpen);
    if (isDrawerOpen) {
      markAllAsRead();
    }
  }, [isDrawerOpen, markAllAsRead]);

  /**
   * 1. Consulta el historial de alertas desde la API GET /api/reportes/geocercas/alertas
   * Se ejecuta al abrir o recargar la pantalla (F5). Ya no se ve la pantalla vacía
   * y las alertas no se pierden nunca al refrescar el navegador.
   */
  const refreshAlerts = useCallback(async () => {
    const targetAccount = accountIdRef.current || accountID || 'movilbus';
    if (!targetAccount) return;

    setLoadingAlerts(true);
    try {
      const rawAlerts = await getAlertasReport(undefined, {
        accountID: targetAccount,
        limit: 50,
      });

      if (Array.isArray(rawAlerts)) {
        const mapped = rawAlerts.map((item) =>
          mapAlertaItemToAlert(item, targetAccount),
        );

        setAlerts((prev) => {
          // Conservar alertas en vivo que puedan haber llegado por WebSocket mientras la API respondía
          const liveAlerts = prev.filter((a) => a.isLive);
          const liveIds = new Set(liveAlerts.map((a) => a.id));
          const merged = [...liveAlerts];

          for (const a of mapped) {
            if (!liveIds.has(a.id)) {
              merged.push(a);
            }
          }
          return merged.slice(0, 100);
        });

        // Al cargar en F5, calcular no leídas comparando con la última vez que abrió el panel (localStorage)
        if (!isDrawerOpenRef.current) {
          const lastReadTime = getLastReadTime(targetAccount);
          if (lastReadTime === 0) {
            // Primera vez absoluta en este navegador: se cuentan las existentes
            setUnreadCount(mapped.length);
          } else {
            // Solo contar aquellas cuya fecha sea estrictamente posterior a la última lectura
            const unread = mapped.filter((a) => {
              const alertTime = new Date(a.serverTime).getTime();
              return alertTime > lastReadTime;
            });
            setUnreadCount(unread.length);
          }
        }
      }
    } catch (err) {
      console.warn('[SignalR] Error al cargar historial de alertas:', err);
    } finally {
      setLoadingAlerts(false);
    }
  }, [accountID]);

  // Precargar alertas individuales al montar el componente (F5) o cambiar de cuenta
  useEffect(() => {
    if (enabled && accountID) {
      refreshAlerts();
    }
  }, [enabled, accountID, refreshAlerts]);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
    setUnreadCount(0);
    const targetAccount = accountIdRef.current || accountID || 'movilbus';
    setLastReadTime(targetAccount, Date.now());
  }, [accountID]);

  const removeAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  /**
   * 2. Conexión SignalR En Vivo (/notificationsHub)
   * Escucha WebSocket: en cuanto un carro entra o sale, SignalR recibe la alerta
   * y se apila al inicio de la lista (unshift).
   * Si 3 carros generan alertas al mismo segundo, los 3 eventos se procesan y apilan juntos.
   */
  useEffect(() => {
    const targetAccount = accountID || 'movilbus';
    if (!enabled || !targetAccount) {
      if (connectionRef.current) {
        if (connectionRef.current.state === signalR.HubConnectionState.Connected) {
          connectionRef.current.stop().catch(() => {});
        }
        connectionRef.current = null;
        setStatus('disconnected');
      }
      return;
    }

    let isCancelled = false;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(SIGNALR_HUB_URL)
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connectionRef.current = connection;
    setStatus('connecting');

    connection.onreconnecting(() => {
      if (!isCancelled) {
        setStatus('reconnecting');
        console.log('[SignalR] Reconectando al servidor...');
      }
    });

    connection.onreconnected(async () => {
      if (!isCancelled) {
        setStatus('connected');
        console.log('[SignalR] Reconectado exitosamente');
        const currAccount = accountIdRef.current || targetAccount;
        try {
          // Re-unir al grupo de cuenta tras reconexión
          await connection.invoke('JoinAccountGroup', currAccount);
          console.log(`[SignalR] Re-unido al grupo ${currAccount}`);
        } catch (err) {
          console.error('[SignalR] Error al re-unirse al grupo tras reconexión:', err);
        }
      }
    });

    connection.onclose(() => {
      if (!isCancelled) {
        setStatus('disconnected');
        console.log('[SignalR] Conexión cerrada');
      }
    });

    // ⚠️ PUNTO CRÍTICO 1: Nombre de evento exacto "GeofenceAlert"
    connection.on('GeofenceAlert', (alerta: any) => {
      if (isCancelled || !alerta) return;

      console.log('¡Alerta nueva en vivo!', alerta);

      const rawType = String(alerta.eventType || '').toLowerCase();
      const isExit = rawType.includes('exit') || rawType.includes('salida');
      const eventType: 'geofenceEnter' | 'geofenceExit' = isExit
        ? 'geofenceExit'
        : 'geofenceEnter';

      const rawTime =
        alerta.serverTimeUtc || alerta.serverTime || alerta.fecha || alerta.timestamp;
      let isoTime: string;
      if (typeof rawTime === 'number') {
        isoTime = new Date(rawTime > 1e11 ? rawTime : rawTime * 1000).toISOString();
      } else if (rawTime) {
        isoTime = new Date(rawTime).toISOString();
      } else {
        isoTime = new Date().toISOString();
      }

      const alertId = alerta.id
        ? `alert-${alerta.id}`
        : `live-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      const newAlert: RealtimeGeofenceAlert = {
        id: alertId,
        numericId: alerta.id ? Number(alerta.id) : undefined,
        accountID: alerta.accountID || accountIdRef.current || targetAccount,
        deviceID: alerta.deviceID || 'Vehículo',
        geofenceID: Number(alerta.geofenceID || 0),
        geofenceName: alerta.geofenceName || 'Geocerca',
        eventType,
        serverTime: isoTime,
        serverTimeUtc: alerta.serverTimeUtc || isoTime,
        latitude: Number(alerta.latitude ?? alerta.lat ?? alerta.latitud ?? 0),
        longitude: Number(alerta.longitude ?? alerta.lng ?? alerta.lon ?? alerta.longitud ?? 0),
        speed:
          alerta.speed !== undefined && alerta.speed !== null
            ? Number(alerta.speed)
            : undefined,
        durationMinutes:
          alerta.durationMinutes !== undefined && alerta.durationMinutes !== null
            ? Number(alerta.durationMinutes)
            : alerta.duracionMinutos !== undefined && alerta.duracionMinutos !== null
            ? Number(alerta.duracionMinutos)
            : null,
        receivedAt: Date.now(),
        isLive: true,
      };

      // Apilar arriba (unshift). Al usar estado funcional, si 3 carros llegan
      // en el mismo segundo exacto, los 3 se agregan en orden secuencial sin colisiones
      setAlerts((prev) => {
        const existingIdx = prev.findIndex((a) => a.id === newAlert.id);
        if (existingIdx !== -1) {
          const updated = [...prev];
          updated.splice(existingIdx, 1);
          return [newAlert, ...updated];
        }
        return [newAlert, ...prev.slice(0, 99)];
      });

      // Si el panel lateral está abierto, marcar como leída de inmediato; si no, sumar al contador
      if (isDrawerOpenRef.current) {
        const targetAcc = newAlert.accountID || targetAccount;
        const alertTime = new Date(newAlert.serverTime).getTime();
        setLastReadTime(targetAcc, Math.max(Date.now(), alertTime));
        setUnreadCount(0);
      } else {
        setUnreadCount((prev) => prev + 1);
      }

      // Notificación Toast en pantalla
      const speedText =
        newAlert.speed !== undefined && newAlert.speed > 0
          ? ` · ${newAlert.speed} km/h`
          : '';

      if (eventType === 'geofenceEnter') {
        toast.success(`🟢 ${newAlert.deviceID} entró a ${newAlert.geofenceName}`, {
          description: `Hora: ${new Date(newAlert.serverTime).toLocaleTimeString('es-PE')}${speedText}`,
          duration: 6000,
        });
      } else {
        const durText =
          newAlert.durationMinutes !== null
            ? ` — permanencia ${newAlert.durationMinutes} min`
            : '';
        toast.warning(
          `🔴 ${newAlert.deviceID} salió de ${newAlert.geofenceName}${durText}`,
          {
            description: `Hora: ${new Date(newAlert.serverTime).toLocaleTimeString('es-PE')}${speedText}`,
            duration: 7000,
          },
        );
      }
    });

    // Iniciar SignalR y unirse al grupo de cuenta
    async function iniciarSignalR() {
      try {
        if (connection.state === signalR.HubConnectionState.Disconnected) {
          await connection.start();
          if (isCancelled) {
            await connection.stop();
            return;
          }
          setStatus('connected');
          console.log('Conectado a SignalR');

          // ⚠️ PUNTO CRÍTICO 2: Llamar a JoinAccountGroup con la cuenta activa
          await connection.invoke('JoinAccountGroup', targetAccount);
          console.log(`[SignalR] Unido al grupo: ${targetAccount}`);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Error al conectar a SignalR:', err);
          setStatus('disconnected');
        }
      }
    }

    iniciarSignalR();

    return () => {
      isCancelled = true;
      if (connectionRef.current) {
        if (connectionRef.current.state === signalR.HubConnectionState.Connected) {
          connectionRef.current.stop().catch(() => {});
        }
        connectionRef.current = null;
      }
      setStatus('disconnected');
    };
  }, [accountID, enabled]);

  return {
    status,
    alerts,
    unreadCount,
    markAllAsRead,
    loadingAlerts,
    refreshAlerts,
    clearAlerts,
    removeAlert,
    isConnected: status === 'connected',
  };
}
