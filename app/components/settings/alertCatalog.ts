'use client';

import { useEffect, useState } from 'react';
import { fetchAlertCatalog, type AlertCatalogItem } from './settingsApi';

/**
 * Catálogo de notificaciones que la cuenta puede agregar ("+ Agregar notificación").
 * Viene de GET /api/configuracion/alertas/catalogo; mientras carga, o si el servidor
 * no responde, se usa esta copia (la misma que devuelve hoy la API).
 */
export const FALLBACK_ALERT_CATALOG: AlertCatalogItem[] = [
  { eventKey: 'geofenceEnter', eventType: 'geofenceEnter', alarmType: null, nombre: 'Entrada a geocerca', descripcion: 'Cuando una unidad ingresa a una geocerca', severidad: 'info', sonidoDefault: 'ding' },
  { eventKey: 'geofenceExit', eventType: 'geofenceExit', alarmType: null, nombre: 'Salida de geocerca', descripcion: 'Cuando una unidad sale de una geocerca', severidad: 'info', sonidoDefault: 'campana' },
  { eventKey: 'deviceOverspeed', eventType: 'deviceOverspeed', alarmType: null, nombre: 'Exceso de velocidad', descripcion: 'Cuando una unidad supera el límite de velocidad', severidad: 'warning', sonidoDefault: 'clasico' },
  { eventKey: 'alarm:sos', eventType: 'alarm', alarmType: 'sos', nombre: 'Botón de pánico (SOS)', descripcion: 'Alarma de emergencia activada desde la unidad', severidad: 'critical', sonidoDefault: 'sirena' },
  { eventKey: 'alarm:powercut', eventType: 'alarm', alarmType: 'powercut', nombre: 'Corte de energía', descripcion: 'Desconexión de batería o alimentación del GPS', severidad: 'critical', sonidoDefault: 'sirena' },
  { eventKey: 'alarm:overspeed', eventType: 'alarm', alarmType: 'overspeed', nombre: 'Alarma de exceso de velocidad (GPS)', descripcion: 'Alarma interna de exceso de velocidad reportada por el equipo GPS', severidad: 'warning', sonidoDefault: 'clasico' },
  { eventKey: 'ignitionOn', eventType: 'ignitionOn', alarmType: null, nombre: 'Encendido de motor', descripcion: 'Cuando se enciende el motor de una unidad', severidad: 'info', sonidoDefault: 'ding' },
  { eventKey: 'ignitionOff', eventType: 'ignitionOff', alarmType: null, nombre: 'Apagado de motor', descripcion: 'Cuando se apaga el motor de una unidad', severidad: 'info', sonidoDefault: 'ding' },
  { eventKey: 'deviceOnline', eventType: 'deviceOnline', alarmType: null, nombre: 'Unidad en línea', descripcion: 'Cuando una unidad vuelve a conectarse', severidad: 'info', sonidoDefault: 'ding' },
  { eventKey: 'deviceOffline', eventType: 'deviceOffline', alarmType: null, nombre: 'Unidad desconectada', descripcion: 'Cuando una unidad pierde conexión con el servidor', severidad: 'warning', sonidoDefault: 'campana' },
  { eventKey: 'deviceUnknown', eventType: 'deviceUnknown', alarmType: null, nombre: 'Estado desconocido', descripcion: 'Cuando no se puede determinar el estado de conexión de una unidad', severidad: 'warning', sonidoDefault: 'campana' },
];

let catalogCache: AlertCatalogItem[] | null = null;
let catalogPromise: Promise<AlertCatalogItem[]> | null = null;

/** Catálogo ya cargado (o la copia local si aún no llegó). */
export function getAlertCatalogSync(): AlertCatalogItem[] {
  return catalogCache ?? FALLBACK_ALERT_CATALOG;
}

export function getAlertCatalogItem(eventKey: string): AlertCatalogItem | undefined {
  return (
    getAlertCatalogSync().find((c) => c.eventKey === eventKey) ??
    FALLBACK_ALERT_CATALOG.find((c) => c.eventKey === eventKey)
  );
}

/** Nombre legible de una notificación (p. ej. "Botón de pánico (SOS)"). */
export function getAlertName(eventKey: string): string {
  return getAlertCatalogItem(eventKey)?.nombre ?? eventKey;
}

/** Carga el catálogo una sola vez por página; si falla, se reintenta en la próxima llamada. */
export function loadAlertCatalog(): Promise<AlertCatalogItem[]> {
  if (catalogCache) return Promise.resolve(catalogCache);
  if (!catalogPromise) {
    catalogPromise = fetchAlertCatalog()
      .then((items) => {
        const valid = items.filter((i) => i && typeof i.eventKey === 'string' && i.eventKey);
        catalogCache = valid.length ? valid : FALLBACK_ALERT_CATALOG;
        return catalogCache;
      })
      .catch((err) => {
        console.warn('[Alertas] No se pudo cargar el catálogo, se usa la copia local:', err);
        catalogPromise = null;
        return FALLBACK_ALERT_CATALOG;
      });
  }
  return catalogPromise;
}

export function useAlertCatalog() {
  const [catalog, setCatalog] = useState<AlertCatalogItem[]>(getAlertCatalogSync);
  const [loading, setLoading] = useState(!catalogCache);

  useEffect(() => {
    let alive = true;
    loadAlertCatalog().then((c) => {
      if (!alive) return;
      setCatalog(c);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  return { catalog, loading };
}
