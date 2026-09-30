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

// El backend guarda estas fechas en UTC (NOW() del servidor) pero el JSON las manda sin sufijo
// "Z" ("2026-09-30T06:10:00"); sin eso, `new Date(...)` las interpreta como si YA fueran hora
// local del navegador y se muestran 5 horas adelantadas. Se fuerza UTC y se resta el offset fijo
// de Lima (UTC-5, Perú no tiene horario de verano), sin depender de la zona horaria del equipo
// que abre la página.
const OFFSET_LIMA_MS = 5 * 60 * 60 * 1000;
const TIENE_ZONA_HORARIA = /Z$|[+-]\d{2}:\d{2}$/;

// Convierte una fecha/hora que el backend guardó en UTC (sin sufijo "Z") a un Date cuyos
// getters UTC (getUTCHours, getUTCDate, etc.) devuelven directamente la hora de Lima
// (UTC-5), sin depender de la zona horaria del navegador que abre la página.
export function convertirUtcALima(iso: string): Date | null {
  const isoUtc = TIENE_ZONA_HORARIA.test(iso) ? iso : `${iso}Z`;
  const fechaUtc = new Date(isoUtc);
  if (Number.isNaN(fechaUtc.getTime())) return null;

  return new Date(fechaUtc.getTime() - OFFSET_LIMA_MS);
}

export function formatFechaHoraAuditoria(iso: string): string {
  const fechaLima = convertirUtcALima(iso);
  if (!fechaLima) return iso;

  const dd = String(fechaLima.getUTCDate()).padStart(2, '0');
  const mm = String(fechaLima.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = fechaLima.getUTCFullYear();
  const hh = String(fechaLima.getUTCHours()).padStart(2, '0');
  const min = String(fechaLima.getUTCMinutes()).padStart(2, '0');

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
