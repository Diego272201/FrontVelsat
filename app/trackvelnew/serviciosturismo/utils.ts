import { EditFormServicio, ServicioTurismoVista } from './types';

export function getIsoToday(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// El input <input type="date"> entrega yyyy-MM-dd; el backend espera dd/MM/yyyy.
export function isoToDdMmYyyy(iso: string): string {
  const [yyyy, mm, dd] = iso.split('-');
  return `${dd}/${mm}/${yyyy}`;
}

// El backend entrega fechainicio como dd/MM/yyyy; <input type="date"> necesita yyyy-MM-dd.
export function ddMmYyyyToIso(dmy: string | null): string {
  if (!dmy) return '';
  const partes = dmy.split('/');
  if (partes.length !== 3) return '';
  const [dd, mm, yyyy] = partes;
  return `${yyyy}-${mm}-${dd}`;
}

// Arma el mismo identificador que usa el sistema de rastreo (codunidad): BUS-PLACA(sin caracteres especiales).
export function combinarPlaca(bus: string | null, placa: string | null): string {
  const busLimpio = (bus || '').trim();
  const placaLimpia = (placa || '').replace(/[^a-zA-Z0-9]/g, '').trim();

  if (!busLimpio && !placaLimpia) return '';
  if (!busLimpio) return placaLimpia;
  if (!placaLimpia) return busLimpio;

  return `${busLimpio}-${placaLimpia}`;
}

export function construirFormDesdeServicio(servicio: ServicioTurismoVista): EditFormServicio {
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
