import type { SettingsSectionId } from '@/app/components/settings/types';

/**
 * Novedades que el asistente (avatar) anuncia al entrar.
 *
 * Para anunciar una funcionalidad nueva: agrega un objeto AL INICIO de la lista
 * con un `id` nuevo. La tarjeta aparece cada vez que el usuario entra al mapa y,
 * al cerrarla, queda el botón del avatar para volver a abrirla (con flechas para
 * recorrer las anteriores si hay más de una). Cada una tiene `showUntil`: pasada
 * esa fecha deja de mostrarse sola; si no queda ninguna vigente, no aparece nada.
 */
export type AnnouncementIcon = 'car' | 'gauge' | 'bell' | 'route' | 'sliders' | 'sparkles';

export interface Announcement {
  /** Identificador único y estable */
  id: string;
  /** Fecha visible, p. ej. "Nov 2026" */
  date: string;
  /**
   * Hasta cuándo se muestra (hora de Perú, -05:00). Pasada esta fecha la novedad
   * deja de aparecer para todos los usuarios, sin publicar nada nuevo.
   */
  showUntil: string;
  title: string;
  intro: string;
  items: { icon: AnnouncementIcon; text: string }[];
  /** Dónde encontrarlo, en una línea */
  whereToFind?: string;
  /** Botón principal: abre la Configuración del sistema en esta pestaña */
  cta: { label: string; openSettings: SettingsSectionId };
}

export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'config-sistema-2026-11',
    date: 'Nov 2026',
    // Una semana: del 24 al 30 de noviembre de 2026. Desde el 1 de diciembre ya no sale.
    showUntil: '2026-11-30T23:59:59-05:00',
    title: 'Nueva Configuración del sistema',
    intro: 'Ahora puedes personalizar Trackvel a tu medida:',
    items: [
      { icon: 'car', text: 'Íconos para tus unidades: auto, van o cisterna' },
      { icon: 'gauge', text: 'Límites de velocidad para toda la flota o por vehículo' },
      { icon: 'bell', text: 'Alertas con el sonido que elijas y horario "No molestar"' },
      { icon: 'route', text: 'Odómetro de cada unidad y preferencias del mapa' },
    ],
    whereToFind: 'Lo encuentras en tu usuario (arriba a la derecha) → Configuración.',
    cta: { label: 'Muéstrame', openSettings: 'cuenta' },
  },
];

/** Novedades vigentes (no vencidas) en este momento */
export function getActiveAnnouncements(now: Date = new Date()): Announcement[] {
  return ANNOUNCEMENTS.filter((a) => {
    const until = new Date(a.showUntil).getTime();
    return Number.isFinite(until) && now.getTime() <= until;
  });
}
