import { CategoriaNotificacion, EstadoNotificacion } from '../types';

export const CATEGORIAS: CategoriaNotificacion[] = ['SUGERENCIA', 'ALERTA', 'INCIDENCIA', 'INFO'];
export const ESTADOS: EstadoNotificacion[] = ['PENDIENTE', 'ACEPTADA', 'RECHAZADA'];

export const CATEGORIA_CLASE: Record<CategoriaNotificacion, string> = {
  SUGERENCIA: 'bg-blue-100 text-blue-700',
  ALERTA: 'bg-red-100 text-red-700',
  INCIDENCIA: 'bg-amber-100 text-amber-800',
  INFO: 'bg-slate-100 text-slate-600',
};

export const ESTADO_CLASE: Record<EstadoNotificacion, string> = {
  PENDIENTE: 'bg-amber-100 text-amber-800',
  ACEPTADA: 'bg-emerald-100 text-emerald-700',
  RECHAZADA: 'bg-slate-200 text-slate-600',
};
