import { EditFormServicio, ServicioTurismoVista } from './types';

export function getIsoToday(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function isoToDdMmYyyy(iso: string): string {
  const [yyyy, mm, dd] = iso.split('-');
  return `${dd}/${mm}/${yyyy}`;
}

export function ddMmYyyyToIso(dmy: string | null): string {
  if (!dmy) return '';
  const partes = dmy.split('/');
  if (partes.length !== 3) return '';
  const [dd, mm, yyyy] = partes;
  return `${yyyy}-${mm}-${dd}`;
}

export function formatFechaHoraAuditoria(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;

  const dd = String(fecha.getDate()).padStart(2, '0');
  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  const yyyy = fecha.getFullYear();
  const hh = String(fecha.getHours()).padStart(2, '0');
  const min = String(fecha.getMinutes()).padStart(2, '0');

  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

export function combinarPlaca(
  bus: string | null,
  placa: string | null,
): string {
  const busLimpio = (bus || '').trim();
  const placaLimpia = (placa || '').replace(/[^a-zA-Z0-9]/g, '').trim();

  if (!busLimpio && !placaLimpia) return '';
  if (!busLimpio) return placaLimpia;
  if (!placaLimpia) return busLimpio;

  return `${busLimpio}-${placaLimpia}`;
}

export function construirFormDesdeServicio(
  servicio: ServicioTurismoVista,
): EditFormServicio {
  return {
    fechainicio: ddMmYyyyToIso(servicio.fechainicio),
    horainicio: servicio.horainicio || '',
    horaretorno: servicio.horaretorno || '',
    placa: servicio.placaCombinada || '',
    tipounidad: servicio.tipounidad || '',
    piloto: servicio.piloto || '',
    brevete: servicio.brevete || '',
    celular: servicio.celular || '',
    copiloto: servicio.copiloto || '',
    cobrevete: servicio.cobrevete || '',
    cocelular: servicio.cocelular || '',
    cliente: servicio.cliente || '',
    grupo: servicio.grupo || '',
    numpax: servicio.numpax || '',
    origen: servicio.origen || '',
    destino: servicio.destino || '',
    guiaturista: servicio.guiaturista || '',
    vuelocliente: servicio.vuelocliente || '',
    ejecutivo: servicio.ejecutivo || '',
    cotizacion: servicio.cotizacion || '',
    instrucciones: servicio.instrucciones || '',
    indicaciones: servicio.indicaciones || '',
    observaciones: servicio.observaciones || '',
  };
}

export type ClaveEstado =
  | 'Pendiente'
  | 'Visto por Conductor'
  | 'Confirmado por Conductor'
  | 'Finalizado por Conductor'
  | 'Stand By'
  | 'Cancelado';

export function calcularEstado(servicio: {
  cancelado?: number | null;
  standby?: number | null;
  finalizado?: number | null;
  confirmado?: number | null;
  visto?: number | null;
}): ClaveEstado {
  if (Number(servicio.cancelado) === 1) return 'Cancelado';
  if (Number(servicio.standby) === 1) return 'Stand By';
  if (Number(servicio.finalizado) === 1) return 'Finalizado por Conductor';
  if (Number(servicio.confirmado) === 1) return 'Confirmado por Conductor';
  if (Number(servicio.visto) === 1) return 'Visto por Conductor';
  return 'Pendiente';
}
