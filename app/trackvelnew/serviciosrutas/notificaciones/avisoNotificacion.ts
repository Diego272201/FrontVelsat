import { createElement } from 'react';
import { toast } from 'sonner';
import { Info, Lightbulb, OctagonAlert, TriangleAlert, type LucideIcon } from 'lucide-react';
import { CategoriaNotificacion, Notificacion } from '../types';

// Un ícono por categoría.
const ICONOS: Record<CategoriaNotificacion, LucideIcon> = {
  SUGERENCIA: Lightbulb,
  ALERTA: TriangleAlert,
  INCIDENCIA: OctagonAlert,
  INFO: Info,
};

// Verde oscuro para todos los tipos, con letras blancas.
const COLOR = { fondo: '#008000', texto: '#FFFFFF', borde: '#008000' };

/** Aviso flotante de una notificación nueva del conductor, en verde oscuro. */
export function avisarNotificacion(n: Notificacion): void {
  const c = COLOR;
  const quien = [n.conductorNombre, n.deviceID].filter(Boolean).join(' · ');
  toast(n.titulo, {
    description:
      [quien, n.paraderoNombre, n.comentario, `${n.latitud.toFixed(6)}, ${n.longitud.toFixed(6)}`]
        .filter(Boolean)
        .join(' — ') || undefined,
    duration: 10000,
    icon: createElement(ICONOS[n.categoria] ?? Info, { className: 'h-6 w-6' }),
    closeButton: true,
    style: { background: c.fondo, color: c.texto, border: `1px solid ${c.borde}` },
    // La descripción de sonner trae su propio color: se fuerza el del aviso.
    descriptionClassName: '!text-inherit opacity-90',
    classNames: {
      // X arriba a la derecha, sin círculo.
      closeButton: '!left-auto !right-2 !top-2 !transform-none !border-0 !bg-transparent !text-white hover:!bg-white/20',
    },
  });
}
