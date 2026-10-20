/**
 * Resolución dinámica del microservicio de notificaciones según el servidor
 * con el que inició sesión el usuario (localStorage 'servidorUrl'):
 * - DO  (https://do.velsat.pe:2083)  -> https://do.velsat.pe:8443/notificaciones-trackbell
 * - SUB (https://sub.velsat.pe:2096) -> https://sr.velsat.pe:8443/notificaciones-trackbell
 * Los endpoints son idénticos en ambos; solo cambia la URL base.
 */
export const NOTIFICATIONS_DO_URL =
  process.env.NEXT_PUBLIC_TRACKVEL_API_URL ||
  'https://do.velsat.pe:8443/notificaciones-trackbell';
export const NOTIFICATIONS_SR_URL =
  process.env.NEXT_PUBLIC_TRACKVEL_API_URL_SR ||
  'https://sr.velsat.pe:8443/notificaciones-trackbell';

export function isSubServerUrl(url?: string | null): boolean {
  const target = (url || '').toLowerCase().trim();
  return (
    target.includes('sub.velsat.pe') ||
    target.includes('sr.velsat.pe') ||
    target.includes('2096')
  );
}

export function getNotificationsBaseUrl(baseUrl?: string | null): string {
  let source = (baseUrl || '').trim();
  if (!source && typeof window !== 'undefined') {
    try {
      source = (localStorage.getItem('servidorUrl') || '').trim();
    } catch {
      source = '';
    }
  }
  const isOnSubPath =
    typeof window !== 'undefined' &&
    window.location?.pathname?.toLowerCase().startsWith('/subtrackvelnew');
  const base =
    isSubServerUrl(source) || (!source && isOnSubPath)
      ? NOTIFICATIONS_SR_URL
      : NOTIFICATIONS_DO_URL;
  return base.replace(/\/+$/, '');
}
