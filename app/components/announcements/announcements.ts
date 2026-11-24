import type { SettingsSectionId } from '@/app/components/settings/types';

/**
 * Novedades que el asistente (avatar) anuncia al entrar.
 *
 * Para anunciar una funcionalidad nueva: agrega un objeto AL INICIO de la lista
 * con un `id` nuevo. La tarjeta aparece cada vez que el usuario entra al mapa y,
 * al cerrarla, queda el botón del avatar para volver a abrirla (con flechas para
 * recorrer las anteriores si hay más de una). Para dejar de mostrar novedades,
 * deja la lista vacía.
 */
export type AnnouncementIcon = 'car' | 'gauge' | 'bell' | 'route' | 'sliders' | 'sparkles';

export interface Announcement {
  /** Identificador único y estable (se guarda como "visto") */
  id: string;
  /** Fecha visible, p. ej. "Nov 2026" */
  date: string;
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

export const LATEST_ANNOUNCEMENT: Announcement | undefined = ANNOUNCEMENTS[0];
