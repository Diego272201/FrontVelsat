import { EstadoServicio } from './types';

export function getIsoToday(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function isoToDdMmYyyy(iso: string): string {
  if (!iso) return '';
  const [yyyy, mm, dd] = iso.split('-');
  return `${dd}/${mm}/${yyyy}`;
}

export function ddMmYyyyToIso(fecha: string): string {
  if (!fecha) return '';
  const [dd, mm, yyyy] = fecha.split('/');
  return `${yyyy}-${mm}-${dd}`;
}

export const ESTADO_SERVICIO_LABEL: Record<EstadoServicio, string> = {
  PROGRAMADO: 'Programado',
  EN_CURSO: 'En curso',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
};

export const ESTADO_SERVICIO_CLASE: Record<EstadoServicio, string> = {
  PROGRAMADO: 'bg-blue-100 text-blue-700',
  EN_CURSO: 'bg-green-100 text-green-700',
  FINALIZADO: 'bg-gray-200 text-gray-700',
  CANCELADO: 'bg-red-100 text-red-700',
};
