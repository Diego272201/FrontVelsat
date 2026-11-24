'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';
import { getAlertasReport, AlertaItem } from './reportsApi';
import { getNotificationsBaseUrl } from './notificationsConfig';
import { getCurrentUser, loadSettings, syncSettingsFromApi } from '@/app/components/settings/useUserSettings';
import { getAlertName, loadAlertCatalog } from '@/app/components/settings/alertCatalog';
import { claimOnce, notifyAlert } from '@/app/components/settings/alertNotifier';
import {
  fetchAlertHistory,
  soundFromApi,
  type DeviceAlertPayload,
  type SeveridadAlerta,
} from '@/app/components/settings/settingsApi';

/*
 * Alertas en tiempo real (SignalR) + historial de la campana.
 *
 * - "GeofenceAlert": entrada / salida de geocerca.
 * - "DeviceAlert": el resto (SOS, corte de energía, exceso de velocidad, encendido/apagado,
 *   en línea / desconectada…). Ya trae su eventKey, severidad y el sonido configurado.
 * El servidor solo envía los tipos que la cuenta tiene en "Mis notificaciones".
 *
 * La misma alerta puede llegar varias veces: el hook se monta en varios sitios a la vez
 * (campana de escritorio, de celular, página de geocercas) y el servidor puede emitir el
 * mismo evento dos veces con milisegundos de diferencia. Se considera la misma alerta si
 * coinciden id, o unidad + geocerca + tipo con menos de DUPLICATE_WINDOW_MS de diferencia.
 */
const DUPLICATE_WINDOW_MS = 30000;
/** Exceso de velocidad: también lo detecta el mapa; un solo aviso por unidad en este lapso */
export const OVERSPEED_NOTIFY_WINDOW_MS = 5 * 60 * 1000;

/** Hub SignalR resuelto según el servidor de la sesión (DO o SR). */
export const getSignalRHubUrl = (baseUrl?: string | null) =>
  `${getNotificationsBaseUrl(baseUrl)}/notificationsHub`;

export interface RealtimeGeofenceAlert {
  id: string;
  numericId?: number;
  accountID: string;
  deviceID: string;
  /** Tipo de la alerta según el catálogo (geofenceEnter, alarm:sos, ignitionOn…) */
  eventKey?: string;
  severity?: SeveridadAlerta;
  alarmType?: string | null;
  ignition?: boolean;
  /** Solo en alertas de geocerca */
  geofenceID: number;
  geofenceName: string;
  eventType: 'geofenceEnter' | 'geofenceExit' | (string & {});
  serverTime: string; // ISO
  serverTimeUtc?: string;
  latitude: number;
  longitude: number;
  speed?: number;
  durationMinutes: number | null;
  receivedAt: number;
  isLive?: boolean;
}

/** eventKey de una alerta (las antiguas solo traen eventType). */
export const getAlertKey = (a: Pick<RealtimeGeofenceAlert, 'eventKey' | 'eventType'>) =>
  a.eventKey || a.eventType;

export const isGeofenceAlert = (a: Pick<RealtimeGeofenceAlert, 'eventKey' | 'eventType'>) => {
  const k = getAlertKey(a);
  return k === 'geofenceEnter' || k === 'geofenceExit';
};

const alertIdentity = (a: RealtimeGeofenceAlert) =>
  `${(a.deviceID || '').toUpperCase()}|${a.geofenceID || a.geofenceName || ''}|${getAlertKey(a)}`;

const alertTimeMs = (a: Pick<RealtimeGeofenceAlert, 'serverTime'>) => new Date(a.serverTime).getTime();

function isSameAlert(a: RealtimeGeofenceAlert, b: RealtimeGeofenceAlert): boolean {
  if (a.numericId && b.numericId) return a.numericId === b.numericId;
  return (
    alertIdentity(a) === alertIdentity(b) &&
    Math.abs(alertTimeMs(a) - alertTimeMs(b)) < DUPLICATE_WINDOW_MS
  );
}

/** true solo la primera vez que se avisa de esta alerta (en toda la página). */
function claimNotification(alert: RealtimeGeofenceAlert): boolean {
  if (alert.numericId) return claimOnce(`id|${alert.numericId}`, 10 * 60 * 1000);
  return claimOnce(`alert|${alertIdentity(alert)}`, DUPLICATE_WINDOW_MS, alertTimeMs(alert));
}

export type SignalRConnectionStatus =
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'connecting';

interface UseGeofenceSignalROptions {
  accountID?: string | null;
  baseUrl?: string | null;
  enabled?: boolean;
  isDrawerOpen?: boolean;
  /** Solo alertas de geocerca (pantalla de Geocercas): ignora "DeviceAlert" */
  geofenceOnly?: boolean;
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

/** Hora de la alerta en ISO: acepta ISO, segundos o milisegundos. */
function toIsoTime(utc?: string | null, raw?: unknown): string {
  if (utc) {
    const d = new Date(utc);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  if (typeof raw === 'number' && raw > 0) {
    return new Date(raw > 1e11 ? raw : raw * 1000).toISOString();
  }
  if (typeof raw === 'string' && raw) {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  return new Date().toISOString();
}

const optionalNumber = (v: unknown) =>
  v !== undefined && v !== null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : undefined;

/** Velocidad del payload, venga como speed, velocidad o speedKmh */
const payloadSpeed = (p: object | null | undefined) => {
  const r = (p ?? {}) as Record<string, unknown>;
  return (
    optionalNumber(r.speed) ??
    optionalNumber(r.velocidad) ??
    optionalNumber(r.speedKmh) ??
    optionalNumber(r.velocidadKmh)
  );
};

/** Máximo de alertas que guarda la lista del panel */
const MAX_ALERTS = 300;

const isToday = (iso: string) => {
  const d = new Date(iso);
  const t = new Date();
  return (
    d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate()
  );
};

/**
 * Alertas de HOY de los tipos que la cuenta tiene en "Mis notificaciones".
 * No se usa "soloActivas": el backend lo limita a una ventana corta (~1 h), por
 * eso antes la campana mostraba solo las últimas. Se pide cada tipo por separado
 * (así el ruido de otros tipos, como "En línea", no deja fuera las del día).
 */
async function fetchTodayAlerts(accountID: string): Promise<DeviceAlertPayload[]> {
  const types = Array.from(new Set((loadSettings(getCurrentUser()).alerts?.items ?? []).map((i) => i.type)));
  if (types.length === 0) return [];
  const results = await Promise.allSettled(
    types.map((eventKey) => fetchAlertHistory(accountID, { soloActivas: false, limit: 200, eventKey })),
  );
  const ok = results.filter(
    (r): r is PromiseFulfilledResult<DeviceAlertPayload[]> => r.status === 'fulfilled' && Array.isArray(r.value),
  );
  if (ok.length === 0) throw (results[0] as PromiseRejectedResult).reason;
  const seen = new Set<string>();
  return ok
    .flatMap((r) => r.value)
    .filter((p) => {
      if (!isToday(toIsoTime(p.serverTimeUtc, p.serverTime))) return false;
      const key = String(p.id ?? `${p.deviceID}|${p.eventKey}|${p.serverTimeUtc}`);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/** A la alerta en vivo le faltan datos que el historial sí trae (velocidad, geocerca) */
const isIncompleteLive = (a: RealtimeGeofenceAlert) =>
  a.speed === undefined || (isGeofenceAlert(a) && (!a.geofenceName || a.geofenceName === 'Geocerca'));

/**
 * Une la versión en vivo con la del historial: el historial completa lo que falte
 * (velocidad, nombre de geocerca, permanencia…) y se conservan id y marca "en vivo".
 */
function mergeWithHistory(live: RealtimeGeofenceAlert, hist: RealtimeGeofenceAlert): RealtimeGeofenceAlert {
  const merged: RealtimeGeofenceAlert = { ...live };
  (Object.keys(hist) as (keyof RealtimeGeofenceAlert)[]).forEach((k) => {
    const v = hist[k];
    if (v === undefined || v === null || v === '') return;
    if (k === 'geofenceName' && v === 'Geocerca' && live.geofenceName) return;
    if ((k === 'latitude' || k === 'longitude' || k === 'geofenceID') && !v) return;
    (merged as unknown as Record<string, unknown>)[k] = v;
  });
  merged.id = live.id;
  merged.isLive = true;
  merged.receivedAt = live.receivedAt;
  return merged;
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
  const isoTime = toIsoTime(item.serverTimeUtc, item.serverTime);
  const eventType = isExit ? 'geofenceExit' : 'geofenceEnter';

  return {
    id: `alert-${item.id}`,
    numericId: item.id,
    accountID: item.accountID || defaultAccount || 'movilbus',
    deviceID: item.deviceID || 'Vehículo',
    eventKey: eventType,
    severity: 'info',
    geofenceID: Number(item.geofenceID || 0),
    geofenceName: item.geofenceName || 'Geocerca',
    eventType,
    serverTime: isoTime,
    serverTimeUtc: isoTime,
    latitude: Number(item.latitude || 0),
    longitude: Number(item.longitude || 0),
    speed: optionalNumber(item.speed),
    durationMinutes: optionalNumber(item.durationMinutes) ?? null,
    receivedAt: new Date(isoTime).getTime(),
    isLive: false,
  };
}

/** Alerta del historial general (/api/alertas) o del evento "DeviceAlert". */
export function mapDeviceAlert(
  p: Partial<DeviceAlertPayload>,
  defaultAccount: string,
  isLive: boolean,
): RealtimeGeofenceAlert {
  const isoTime = toIsoTime(p.serverTimeUtc, p.serverTime);
  const eventKey =
    p.eventKey || (p.alarmType ? `${p.eventType}:${p.alarmType}` : p.eventType) || 'alerta';
  return {
    id: p.id ? `alert-${p.id}` : `live-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    numericId: p.id ? Number(p.id) : undefined,
    accountID: p.accountID || defaultAccount,
    deviceID: p.deviceID || 'Vehículo',
    eventKey,
    eventType: p.eventType || eventKey,
    severity: p.severity,
    alarmType: p.alarmType ?? null,
    ignition: p.ignition,
    geofenceID: 0,
    geofenceName: '',
    serverTime: isoTime,
    serverTimeUtc: isoTime,
    latitude: Number(p.latitude || 0),
    longitude: Number(p.longitude || 0),
    speed: payloadSpeed(p),
    durationMinutes: null,
    receivedAt: isLive ? Date.now() : new Date(isoTime).getTime(),
    isLive,
  };
}

const timeText = (a: RealtimeGeofenceAlert) =>
  `Hora: ${new Date(a.serverTime).toLocaleTimeString('es-PE')}${
    a.speed !== undefined && a.speed > 0 ? ` · ${Math.round(a.speed)} km/h` : ''
  }`;

export function useGeofenceSignalR({
  accountID,
  baseUrl,
  enabled = true,
  isDrawerOpen = false,
  geofenceOnly = false,
}: UseGeofenceSignalROptions) {
  // Activo tanto para DO como para SUB; el microservicio se resuelve dinámicamente
  const effectiveEnabled = Boolean(enabled);
  const notificationsBaseUrl = getNotificationsBaseUrl(baseUrl);
  const hubUrl = getSignalRHubUrl(baseUrl);

  const [status, setStatus] = useState<SignalRConnectionStatus>('disconnected');
  const [alerts, setAlerts] = useState<RealtimeGeofenceAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loadingAlerts, setLoadingAlerts] = useState<boolean>(false);

  const connectionRef = useRef<signalR.HubConnection | null>(null);
  // Copia síncrona de la lista para detectar repetidas dentro del handler de SignalR
  const alertsRef = useRef<RealtimeGeofenceAlert[]>([]);
  useEffect(() => {
    alertsRef.current = alerts;
  }, [alerts]);
  const accountIdRef = useRef<string | null | undefined>(accountID);
  const isDrawerOpenRef = useRef<boolean>(Boolean(isDrawerOpen));

  useEffect(() => {
    accountIdRef.current = accountID;
  }, [accountID]);

  // Configuración de la cuenta (qué notificaciones y con qué sonido) y catálogo de nombres
  useEffect(() => {
    const acc = (accountID || '').trim();
    if (!effectiveEnabled || !acc) return;
    syncSettingsFromApi().catch((err) =>
      console.warn('[Alertas] No se pudo leer la configuración de la cuenta:', err),
    );
    loadAlertCatalog();
  }, [effectiveEnabled, accountID]);

  const markAllAsRead = useCallback(() => {
    setUnreadCount(0);
    const targetAccount = (accountIdRef.current || accountID || '').trim();
    if (!targetAccount) return;
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
   * 1. Historial al abrir o recargar la pantalla (F5).
   * - Campana: las alertas de HOY de cada tipo de "Mis notificaciones"
   *   (GET /api/alertas?soloActivas=false&eventKey=…). Ese historial no trae el nombre
   *   de la geocerca: se completa con /api/reportes/geocercas/alertas (mismo id).
   * - Pantalla de Geocercas, o si el historial general no responde: solo geocercas.
   */
  const refreshAlerts = useCallback(async () => {
    const targetAccount = (accountIdRef.current || accountID || '').trim();
    if (!targetAccount) return;

    setLoadingAlerts(true);
    try {
      const [generalRes, geoRes] = await Promise.allSettled([
        geofenceOnly ? Promise.resolve(null) : fetchTodayAlerts(targetAccount),
        // En la campana se usa para poner el nombre de la geocerca a las alertas del día
        getAlertasReport(undefined, { accountID: targetAccount, limit: geofenceOnly ? 50 : 200, baseUrl }),
      ]);
      const geoItems = geoRes.status === 'fulfilled' && Array.isArray(geoRes.value) ? geoRes.value : [];

      let mapped: RealtimeGeofenceAlert[];
      if (generalRes.status === 'fulfilled' && Array.isArray(generalRes.value)) {
        const geoById = new Map(geoItems.map((g) => [Number(g.id), g]));
        mapped = generalRes.value.map((p) => {
          const a = mapDeviceAlert(p, targetAccount, false);
          if (isGeofenceAlert(a)) {
            const g = geoById.get(Number(p.id));
            a.geofenceID = Number(g?.geofenceID || 0);
            a.geofenceName = g?.geofenceName || 'Geocerca';
            a.durationMinutes = optionalNumber(g?.durationMinutes) ?? null;
          }
          return a;
        });
      } else if (geoRes.status === 'fulfilled') {
        if (generalRes.status === 'rejected') {
          console.warn('[Alertas] Historial general no disponible, se muestran solo geocercas:', generalRes.reason);
        }
        mapped = geoItems.map((item) => mapAlertaItemToAlert(item, targetAccount));
      } else {
        throw geoRes.reason;
      }

      setAlerts((prev) => {
        // Conservar las alertas en vivo (pueden haber llegado mientras la API respondía),
        // completándolas con los datos del historial cuando este ya las tiene.
        const liveAlerts = prev.filter((a) => a.isLive);
        const merged: RealtimeGeofenceAlert[] = liveAlerts.map((l) => {
          const hist = mapped.find((a) => a.id === l.id || isSameAlert(l, a));
          return hist ? mergeWithHistory(l, hist) : l;
        });
        for (const a of mapped) {
          if (!liveAlerts.some((l) => l.id === a.id || isSameAlert(l, a))) merged.push(a);
        }
        const next = merged.sort((x, y) => alertTimeMs(y) - alertTimeMs(x)).slice(0, MAX_ALERTS);
        alertsRef.current = next;
        return next;
      });

      // Al cargar en F5, calcular no leídas comparando con la última vez que abrió el panel (localStorage)
      if (!isDrawerOpenRef.current) {
        const lastReadTime = getLastReadTime(targetAccount);
        if (lastReadTime === 0) {
          // Primera vez absoluta en este navegador: se cuentan las existentes
          setUnreadCount(mapped.length);
        } else {
          // Solo contar aquellas cuya fecha sea estrictamente posterior a la última lectura
          setUnreadCount(mapped.filter((a) => alertTimeMs(a) > lastReadTime).length);
        }
      }
    } catch (err) {
      console.warn('[SignalR] Error al cargar historial de alertas:', err);
    } finally {
      setLoadingAlerts(false);
    }
  }, [accountID, notificationsBaseUrl, geofenceOnly]);

  // Si una alerta en vivo llega sin velocidad o sin geocerca, se vuelve a leer el
  // historial (que ya la tiene completa) a los 2.5 s y, por si el servidor tarda
  // en guardarla, otra vez a los 8 s. Sin esto, faltaba la velocidad hasta el F5.
  const refreshAlertsRef = useRef(refreshAlerts);
  useEffect(() => {
    refreshAlertsRef.current = refreshAlerts;
  }, [refreshAlerts]);
  const enrichTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const scheduleEnrich = useCallback(() => {
    enrichTimersRef.current.forEach(clearTimeout);
    enrichTimersRef.current = [2500, 8000].map((ms) =>
      setTimeout(() => {
        if (alertsRef.current.some((a) => a.isLive && isIncompleteLive(a))) refreshAlertsRef.current();
      }, ms),
    );
  }, []);
  useEffect(() => () => enrichTimersRef.current.forEach(clearTimeout), []);

  // Precargar alertas al montar el componente (F5) o cambiar de cuenta/servidor
  useEffect(() => {
    if (effectiveEnabled && accountID) {
      refreshAlerts();
    }
  }, [effectiveEnabled, accountID, refreshAlerts]);

  // Al cambiar "Mis notificaciones", el historial de la campana se vuelve a pedir
  useEffect(() => {
    if (geofenceOnly) return;
    const onSettings = (e: Event) => {
      if ((e as CustomEvent).detail?.key === 'alerts') refreshAlerts();
    };
    window.addEventListener('trackvel:settings-updated', onSettings);
    return () => window.removeEventListener('trackvel:settings-updated', onSettings);
  }, [geofenceOnly, refreshAlerts]);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
    setUnreadCount(0);
    const targetAccount = (accountIdRef.current || accountID || '').trim();
    if (targetAccount) {
      setLastReadTime(targetAccount, Date.now());
    }
  }, [accountID]);

  const removeAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  /**
   * 2. Conexión SignalR En Vivo (/notificationsHub)
   * En cuanto llega una alerta se apila al inicio de la lista. Si varias llegan al mismo
   * segundo, todas se procesan y apilan juntas.
   */
  useEffect(() => {
    const targetAccount = (accountID || '').trim();
    if (!effectiveEnabled || !targetAccount) {
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
      .withUrl(hubUrl)
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

    /** Agrega la alerta arriba de la lista. Devuelve true si ya estaba (repetida). */
    const pushLiveAlert = (incoming: RealtimeGeofenceAlert): boolean => {
      // Si la misma alerta ya está en la lista (repetida por el servidor), se reemplaza
      const matches = (a: RealtimeGeofenceAlert) => a.id === incoming.id || isSameAlert(a, incoming);
      const previous = alertsRef.current.find(matches);
      const isRepeated = Boolean(previous);
      // Sin perder datos que la versión anterior ya tenía (p. ej. velocidad del historial)
      const newAlert: RealtimeGeofenceAlert = previous
        ? {
            ...incoming,
            speed: incoming.speed ?? previous.speed,
            geofenceName:
              incoming.geofenceName && incoming.geofenceName !== 'Geocerca'
                ? incoming.geofenceName
                : previous.geofenceName || incoming.geofenceName,
            durationMinutes: incoming.durationMinutes ?? previous.durationMinutes,
          }
        : incoming;
      if (isIncompleteLive(newAlert)) scheduleEnrich();
      alertsRef.current = [newAlert, ...alertsRef.current.filter((a) => !matches(a))].slice(0, MAX_ALERTS);
      setAlerts((prev) => [newAlert, ...prev.filter((a) => !matches(a))].slice(0, MAX_ALERTS));

      // Si el panel lateral está abierto, marcar como leída de inmediato; si no, sumar al contador
      if (isRepeated) {
        // Repetida: no vuelve a sumar al contador
      } else if (isDrawerOpenRef.current) {
        const targetAcc = newAlert.accountID || targetAccount;
        setLastReadTime(targetAcc, Math.max(Date.now(), alertTimeMs(newAlert)));
        setUnreadCount(0);
      } else {
        setUnreadCount((prev) => prev + 1);
      }
      return isRepeated;
    };

    // ⚠️ Nombre de evento exacto "GeofenceAlert"
    connection.on('GeofenceAlert', (alerta: any) => {
      if (isCancelled || !alerta) return;

      console.log('¡Alerta nueva en vivo!', alerta);

      const rawType = String(alerta.eventType || '').toLowerCase();
      const isExit = rawType.includes('exit') || rawType.includes('salida');
      const eventType: 'geofenceEnter' | 'geofenceExit' = isExit ? 'geofenceExit' : 'geofenceEnter';
      const isoTime = toIsoTime(
        alerta.serverTimeUtc,
        alerta.serverTime ?? alerta.fecha ?? alerta.timestamp,
      );

      const newAlert: RealtimeGeofenceAlert = {
        id: alerta.id
          ? `alert-${alerta.id}`
          : `live-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        numericId: alerta.id ? Number(alerta.id) : undefined,
        accountID: alerta.accountID || accountIdRef.current || targetAccount,
        deviceID: alerta.deviceID || 'Vehículo',
        eventKey: eventType,
        severity: 'info',
        geofenceID: Number(alerta.geofenceID || 0),
        geofenceName: alerta.geofenceName || 'Geocerca',
        eventType,
        serverTime: isoTime,
        serverTimeUtc: alerta.serverTimeUtc || isoTime,
        latitude: Number(alerta.latitude ?? alerta.lat ?? alerta.latitud ?? 0),
        longitude: Number(alerta.longitude ?? alerta.lng ?? alerta.lon ?? alerta.longitud ?? 0),
        speed: payloadSpeed(alerta),
        durationMinutes:
          optionalNumber(alerta.durationMinutes) ?? optionalNumber(alerta.duracionMinutos) ?? null,
        receivedAt: Date.now(),
        isLive: true,
      };

      pushLiveAlert(newAlert);

      // Repetida (otra campana u otro envío del servidor): ya se avisó.
      if (!claimNotification(newAlert)) return;

      const plate = (newAlert.deviceID || '').toUpperCase();
      const durText =
        isExit && newAlert.durationMinutes !== null
          ? ` — permanencia ${newAlert.durationMinutes} min`
          : '';
      notifyAlert({
        // Un id fijo por evento hace que sonner muestre un solo aviso
        id: `geofence-${newAlert.deviceID}-${newAlert.geofenceID}-${eventType}-${newAlert.serverTime}`,
        eventKey: eventType,
        title: isExit
          ? `${plate} salió de ${newAlert.geofenceName}${durText}`
          : `${plate} entró a ${newAlert.geofenceName}`,
        description: timeText(newAlert),
        severity: 'info',
      });
    });

    // ⚠️ Resto de alertas: "DeviceAlert" (SOS, corte de energía, exceso de velocidad, motor, conexión…)
    if (!geofenceOnly) {
      connection.on('DeviceAlert', (alerta: DeviceAlertPayload) => {
        if (isCancelled || !alerta) return;
        console.log('¡Alerta de unidad en vivo!', alerta);

        const newAlert = mapDeviceAlert(alerta, accountIdRef.current || targetAccount, true);
        pushLiveAlert(newAlert);
        if (!claimNotification(newAlert)) return;

        const eventKey = getAlertKey(newAlert);
        const plate = (newAlert.deviceID || '').toUpperCase();
        // El mapa también detecta el exceso de velocidad: un solo aviso por unidad
        if (eventKey === 'deviceOverspeed' && !claimOnce(`overspeed|${plate}`, OVERSPEED_NOTIFY_WINDOW_MS)) {
          return;
        }

        notifyAlert({
          id: `device-${newAlert.id}`,
          eventKey,
          title: `${plate} · ${getAlertName(eventKey)}`,
          description: timeText(newAlert),
          severity: newAlert.severity,
          sound: alerta.sonido ? soundFromApi(alerta.sonido) : null,
          volume: alerta.volumen,
          loop: alerta.repetirHastaOk,
          // Si trae sonido, el servidor confirmó que la cuenta tiene este tipo agregado
          trustServer: Boolean(alerta.sonido),
        });
      });
    }

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

          // ⚠️ Llamar a JoinAccountGroup con la cuenta activa
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
  }, [accountID, enabled, hubUrl, geofenceOnly, scheduleEnrich]);

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
