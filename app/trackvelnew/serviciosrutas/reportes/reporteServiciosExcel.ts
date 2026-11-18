'use client';

import ExcelJS from 'exceljs';
import axios from 'axios';
import type { ReporteServicioApi } from './types';

// Reporte de servicios (solo descarga, no se visualiza en la web). Una fila por servicio con los datos
// del conductor y la unidad, los horarios reales y el kilometraje recorrido entre el inicio y el fin
// del servicio (se consulta con el endpoint por lotes de kilometraje existente).

/** Máximo de días (inclusive) que se permite consultar, para no cargar el servidor. */
export const MAX_DIAS_REPORTE_SERVICIOS = 15;

/** Cantidad de rangos por consulta al endpoint de kilometraje. */
const RANGOS_POR_CONSULTA = 50;

/** Días del rango, contando ambos extremos (yyyy-MM-dd). */
export function diasDelRango(desdeIso: string, hastaIso: string): number {
  const d = new Date(`${desdeIso}T00:00:00`).getTime();
  const h = new Date(`${hastaIso}T00:00:00`).getTime();
  if (Number.isNaN(d) || Number.isNaN(h)) return 0;
  return Math.round((h - d) / 86_400_000) + 1;
}

interface FilaReporte {
  fecha: Date;
  fechaTexto: string; // dd/MM/yyyy
  horaSolicitud: number | null; // fracción de día
  unidad: string;
  placa: string;
  brevete: string;
  piloto: string;
  celular: string;
  cliente: string;
  grupo: string;
  origen: string;
  destino: string;
  horaLlegada: number | null;
  horaInicioTexto: string | null;
  horaFinTexto: string | null;
  horaInicio: number | null;
  horaFin: number | null;
  km: number | null;
  servicioId: number;
}

const segundosDeHora = (hora: string | null | undefined): number | null => {
  if (!hora) return null;
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(hora.trim());
  if (!m) return null;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3] ?? 0);
};

const fraccionDeDia = (hora: string | null | undefined): number | null => {
  const s = segundosDeHora(hora);
  return s === null ? null : s / 86400;
};

/** "07:25" -> "7:25AM", "17:05" -> "5:05PM". */
const horaAmPm = (hora: string): string => {
  const s = segundosDeHora(hora);
  if (s === null) return hora;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')}${h >= 12 ? 'PM' : 'AM'}`;
};

const pad = (n: number) => String(n).padStart(2, '0');

/** dd/MM/yyyy + segundos del día -> "dd/MM/yyyy HH:mm" (el día se corre si pasa de 24 h). */
const fechaHoraApi = (fechaTexto: string, segundos: number): string => {
  const [dd, mm, yyyy] = fechaTexto.split('/').map(Number);
  const base = new Date(yyyy, mm - 1, dd);
  base.setSeconds(segundos);
  return `${pad(base.getDate())}/${pad(base.getMonth() + 1)}/${base.getFullYear()} ${pad(base.getHours())}:${pad(base.getMinutes())}`;
};

/** La placa completa se guarda como "UNIDAD-PLACA" (MB37-CAB-242): lo anterior al primer guion es la unidad. */
const separarUnidadPlaca = (deviceID: string): { unidad: string; placa: string } => {
  const i = deviceID.indexOf('-');
  if (i < 0) return { unidad: '', placa: deviceID.trim() };
  return { unidad: deviceID.slice(0, i).trim(), placa: deviceID.slice(i + 1).trim() };
};

/** Cliente según el grupo de la ruta: San Isidro = REP, San Juan de Miraflores = REP SJM. */
const clienteDelGrupo = (grupo: string | null): string => {
  const g = (grupo ?? '').toLowerCase();
  if (g.includes('miraflores') || /\bsjm\b/.test(g)) return 'REP SJM';
  if (/\brep\b/.test(g)) return 'REP';
  return (grupo ?? '').trim();
};

const aFecha = (fechaTexto: string): Date => {
  const [dd, mm, yyyy] = fechaTexto.split('/').map(Number);
  return new Date(Date.UTC(yyyy, mm - 1, dd));
};

const aFila = (s: ReporteServicioApi): FilaReporte => {
  const paraderos = [...s.paraderos].sort((a, b) => a.orden - b.orden);
  const primero = paraderos[0];
  const ultimo = paraderos[paraderos.length - 1];
  const { unidad, placa } = separarUnidadPlaca(s.deviceID);

  let destino = (ultimo?.nombre ?? '').trim();
  // En los servicios de ida el destino lleva la hora de llegada prevista.
  if (s.ruta.sentido !== 'REGRESO' && ultimo?.horaEsperada) {
    destino = `LLEGADA ${horaAmPm(ultimo.horaEsperada)} ${destino}`;
  }

  return {
    servicioId: s.id,
    fecha: aFecha(s.fechaSalida),
    fechaTexto: s.fechaSalida,
    horaSolicitud: fraccionDeDia(s.horaSalida),
    unidad,
    placa,
    brevete: (s.conductorBrevete ?? '').trim(),
    piloto: (s.conductorNombre ?? '').trim(),
    celular: (s.conductorCelular ?? '').trim(),
    cliente: clienteDelGrupo(s.ruta.grupo),
    grupo: (s.ruta.nombre ?? '').trim().toUpperCase(),
    origen: (primero?.nombre ?? '').trim(),
    destino,
    horaLlegada: fraccionDeDia(primero?.llegadaReal),
    horaInicioTexto: s.inicioReal,
    horaFinTexto: s.finReal,
    horaInicio: fraccionDeDia(s.inicioReal),
    horaFin: fraccionDeDia(s.finReal),
    km: null,
  };
};

const claveOrden = (f: FilaReporte): string => {
  const [dd, mm, yyyy] = f.fechaTexto.split('/');
  return `${yyyy}${mm}${dd}|${String(Math.round((f.horaSolicitud ?? 0) * 86400)).padStart(6, '0')}|${f.grupo}`;
};

interface ResultadoKm {
  rangoId: string;
  kilometros: number;
}

/** Kilometraje de cada servicio entre su hora de inicio y fin (endpoint por lotes). Devuelve cuántas consultas fallaron. */
async function completarKilometraje(
  filas: FilaReporte[],
  s: ReporteServicioApi[],
  baseUrl: string,
  cuenta: string,
): Promise<number> {
  const porId = new Map(s.map((x) => [x.id, x]));
  const rangos: { rangoId: string; deviceID: string; fechaIni: string; fechaFin: string }[] = [];

  filas.forEach((f) => {
    const servicio = porId.get(f.servicioId);
    const ini = segundosDeHora(f.horaInicioTexto);
    let fin = segundosDeHora(f.horaFinTexto);
    if (!servicio || ini === null || fin === null) return;
    // Pasó la medianoche: el fin es del día siguiente.
    if (fin <= ini) fin += 86400;
    // Se redondea el fin hacia arriba al minuto para no perder los últimos segundos del recorrido.
    if (fin % 60 !== 0) fin = Math.ceil(fin / 60) * 60;
    rangos.push({
      rangoId: String(f.servicioId),
      deviceID: servicio.deviceID,
      fechaIni: fechaHoraApi(f.fechaTexto, ini),
      fechaFin: fechaHoraApi(f.fechaTexto, fin),
    });
  });

  const kmPorServicio = new Map<string, number>();
  let fallidas = 0;

  for (let i = 0; i < rangos.length; i += RANGOS_POR_CONSULTA) {
    const lote = rangos.slice(i, i + RANGOS_POR_CONSULTA);
    try {
      const { data } = await axios.post<{ resultados?: ResultadoKm[] }>(`${baseUrl}/api/Kilometer/kilometerbatch`, {
        accountID: cuenta,
        rangos: lote,
      });
      (data?.resultados ?? []).forEach((r) => kmPorServicio.set(String(r.rangoId), r.kilometros));
    } catch {
      fallidas += 1;
    }
  }

  filas.forEach((f) => {
    const km = kmPorServicio.get(String(f.servicioId));
    f.km = km === undefined ? null : km;
  });
  return fallidas;
}

const ANCHOS = [14, 13, 10, 11, 13, 36, 13, 11, 10, 52, 66, 12, 11, 11, 15, 9];
const ENCABEZADOS = [
  'FECHA INICIO',
  'H. SOLICITUD',
  'UNIDAD',
  'PLACA',
  'BREVETE',
  'PILOTO',
  'CELULAR',
  'CLIENTE',
  'GRUPO',
  'ORIGEN',
  'DESTINO / DESCRIP. DEL SERV.',
  'H. LLEGADA',
  'H. INICIO',
  'H. FIN',
  'HORAS TRABAJADAS',
  'KM',
];

export interface ResultadoReporteServicios {
  filas: number;
  kmSinCalcular: number;
  consultasKmFallidas: number;
}

/**
 * Arma y descarga el Excel de servicios del rango. Solo incluye servicios FINALIZADO y EN_CURSO
 * (los programados o cancelados no tienen horarios reales).
 */
export async function descargarReporteServicios(
  servicios: ReporteServicioApi[],
  baseUrl: string,
  cuenta: string,
  desdeIso: string,
  hastaIso: string,
): Promise<ResultadoReporteServicios> {
  const validos = servicios.filter((s) => s.estado === 'FINALIZADO' || s.estado === 'EN_CURSO');
  const filas = validos.map(aFila).sort((a, b) => claveOrden(a).localeCompare(claveOrden(b)));

  const consultasKmFallidas = await completarKilometraje(filas, validos, baseUrl, cuenta);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Trackvel System';
  workbook.created = new Date();
  const hoja = workbook.addWorksheet('Servicios', { views: [{ state: 'frozen', ySplit: 1 }] });

  hoja.columns = ENCABEZADOS.map((h, i) => ({ header: h, key: `c${i}`, width: ANCHOS[i] }));
  const cabecera = hoja.getRow(1);
  cabecera.height = 22;
  cabecera.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF113EB9' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });

  filas.forEach((f, i) => {
    const r = i + 2;
    const horas = f.horaInicio !== null && f.horaFin !== null ? (f.horaFin - f.horaInicio + 1) % 1 : null;
    const fila = hoja.addRow([
      f.fecha,
      f.horaSolicitud,
      f.unidad,
      f.placa,
      f.brevete,
      f.piloto,
      f.celular,
      f.cliente,
      f.grupo,
      f.origen,
      f.destino,
      f.horaLlegada,
      f.horaInicio,
      f.horaFin,
      horas !== null ? { formula: `MOD(N${r}-M${r},1)`, result: horas } : null,
      f.km !== null ? Math.round(f.km * 100) / 100 : null,
    ]);
    fila.getCell(1).numFmt = 'dd/mm/yyyy';
    [2, 12, 13, 14].forEach((c) => (fila.getCell(c).numFmt = 'h:mm'));
    fila.getCell(15).numFmt = '[h]:mm';
    fila.getCell(16).numFmt = '0.00';
    fila.eachCell((cell, col) => {
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
      cell.alignment = { vertical: 'middle', horizontal: [6, 10, 11].includes(col) ? 'left' : 'center' };
    });
  });

  if (filas.length > 0) {
    hoja.autoFilter = { from: { row: 1, column: 1 }, to: { row: filas.length + 1, column: ENCABEZADOS.length } };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Reporte_Servicios_${desdeIso}_${hastaIso}.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);

  return {
    filas: filas.length,
    kmSinCalcular: filas.filter((f) => f.km === null).length,
    consultasKmFallidas,
  };
}
