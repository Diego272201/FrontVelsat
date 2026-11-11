import { sumarMinutos } from '../utils';
import { ReporteServicio, ReporteServiciosApi, ResumenKpisData } from './types';

const ddMmYyyyToIso = (fecha: string): string => {
  const [dd, mm, yyyy] = fecha.split('/');
  return yyyy && mm && dd ? `${yyyy}-${mm}-${dd}` : '';
};

/** Convierte la respuesta del backend (reportes/servicios) en los servicios que muestra la pantalla. */
export function aReporteServicios(r: ReporteServiciosApi): ReporteServicio[] {
  return r.servicios.map((s) => {
    const ultima = s.paraderos[s.paraderos.length - 1];
    return {
      id: s.id,
      rutaId: s.ruta.id,
      rutaCodigo: s.ruta.codigo ?? '',
      rutaNombre: s.ruta.nombre ?? '',
      grupo: s.ruta.grupo ?? '',
      color: '#64748b',
      fechaSalida: s.fechaSalida,
      fechaIso: ddMmYyyyToIso(s.fechaSalida),
      horaSalidaProgramada: s.horaSalida,
      horaSalidaReal: s.inicioReal,
      horaLlegadaEstimada:
        s.horaSalida && s.duracionEstimadaMin !== null ? sumarMinutos(s.horaSalida, s.duracionEstimadaMin) : '—',
      horaLlegadaReal: s.finReal ?? ultima?.llegadaReal ?? null,
      duracionEstimadaMin: s.duracionEstimadaMin ?? 0,
      duracionRealMin: s.duracionRealMin,
      deviceID: s.deviceID,
      conductorNombre: s.conductorNombre,
      conductorBrevete: s.conductorBrevete,
      conductorCelular: s.conductorCelular,
      estadoServicio: s.estado,
      distanciaRealKm: s.distanciaRealKm,
      observaciones: s.observaciones,
      totalParadas: s.conteo.total,
      paradasCompletadas: s.conteo.completadas,
      paradasATiempo: s.conteo.aTiempo,
      paradasAdelantadas: s.conteo.adelantadas,
      paradasRetrasadas: s.conteo.retrasadas,
      paradasOmitidas: s.conteo.omitidas,
      tiempoTotalParadasSeg: s.conteo.permanenciaTotalSeg,
      paradas: s.paraderos.map((p) => ({
        id: p.orden,
        orden: p.orden,
        nombre: p.nombre,
        tipo: p.tipo,
        radioMetros: p.radioMetros,
        horaProgramada: p.horaEsperada ?? '—',
        horaLlegadaReal: p.llegadaReal,
        tiempoPermanenciaSeg: p.permanenciaSeg,
        horaSalidaReal: p.salidaReal,
        diferenciaSeg: p.diferenciaSeg ?? (p.diferenciaMin ?? 0) * 60,
        estadoPuntualidad: p.estado,
      })),
    };
  });
}

/** KPIs de los servicios mostrados (se recalculan al filtrar, sin volver a consultar el API). */
export function calcularKpis(servicios: ReporteServicio[]): ResumenKpisData {
  const suma = (f: (s: ReporteServicio) => number) => servicios.reduce((t, s) => t + f(s), 0);
  const paradasCompletadas = suma((s) => s.paradasCompletadas);
  const paradasATiempo = suma((s) => s.paradasATiempo);
  const tiempoTotalEnParadasSeg = suma((s) => s.tiempoTotalParadasSeg);
  const conEstancia = suma((s) => s.paradas.filter((p) => p.tiempoPermanenciaSeg !== null).length);
  return {
    totalServicios: servicios.length,
    totalParadas: suma((s) => s.totalParadas),
    paradasCompletadas,
    paradasATiempo,
    paradasAdelantadas: suma((s) => s.paradasAdelantadas),
    paradasRetrasadas: suma((s) => s.paradasRetrasadas),
    paradasOmitidas: suma((s) => s.paradasOmitidas),
    porcentajePuntualidad: paradasCompletadas > 0 ? Math.round((paradasATiempo / paradasCompletadas) * 100) : 0,
    promedioPermanenciaSeg: conEstancia > 0 ? Math.round(tiempoTotalEnParadasSeg / conEstancia) : 0,
    tiempoTotalEnParadasSeg,
  };
}
