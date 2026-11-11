// Tipos para el módulo de Reportes de Cumplimiento de Rutas y Paradas

export type EstadoPuntualidad =
  | 'A_TIEMPO'
  | 'ADELANTADO'
  | 'RETRASADO'
  | 'OMITIDO'
  | 'PENDIENTE';

export type TipoParada = 'ORIGEN' | 'INTERMEDIO' | 'DESTINO';

export interface ReporteParadaItem {
  id: number;
  orden: number;
  nombre: string;
  tipo: TipoParada;
  radioMetros: number;
  horaProgramada: string; // HH:mm
  horaLlegadaReal: string | null; // HH:mm:ss
  tiempoPermanenciaSeg: number | null; // Segundos detenido en la parada (dwell time)
  horaSalidaReal: string | null; // HH:mm:ss
  diferenciaSeg: number; // >0 retraso, <0 adelanto, 0 puntual
  estadoPuntualidad: EstadoPuntualidad;
  observaciones?: string;
}

export interface ReporteServicio {
  id: number;
  rutaId: number;
  rutaCodigo: string;
  rutaNombre: string;
  grupo: string;
  color: string;
  fechaSalida: string; // dd/MM/yyyy
  fechaIso: string; // yyyy-MM-dd
  horaSalidaProgramada: string; // HH:mm
  horaSalidaReal: string | null; // HH:mm
  horaLlegadaEstimada: string; // HH:mm
  horaLlegadaReal: string | null; // HH:mm
  duracionEstimadaMin: number;
  duracionRealMin: number | null;
  deviceID: string; // Placa
  conductorNombre: string;
  conductorBrevete: string;
  conductorCelular: string;
  estadoServicio: 'PROGRAMADO' | 'EN_CURSO' | 'FINALIZADO' | 'CANCELADO';
  distanciaRealKm: number | null;
  observaciones: string | null;
  totalParadas: number;
  paradasCompletadas: number;
  paradasATiempo: number;
  paradasAdelantadas: number;
  paradasRetrasadas: number;
  paradasOmitidas: number;
  tiempoTotalParadasSeg: number; // Suma de segundos en paradas
  paradas: ReporteParadaItem[];
}

export interface ResumenKpisData {
  totalServicios: number;
  totalParadas: number;
  paradasCompletadas: number;
  paradasATiempo: number;
  paradasAdelantadas: number;
  paradasRetrasadas: number;
  paradasOmitidas: number;
  porcentajePuntualidad: number;
  promedioPermanenciaSeg: number;
  tiempoTotalEnParadasSeg: number;
}

// Respuesta de GET api/servicios-rutas/{cuenta}/reportes/servicios (horas "HH:mm", fecha "dd/MM/yyyy").
export interface ReporteParaderoApi {
  orden: number;
  nombre: string;
  tipo: TipoParada;
  radioMetros: number;
  horaEsperada: string | null;
  llegadaReal: string | null;
  salidaReal: string | null;
  permanenciaSeg: number | null;
  diferenciaMin: number | null;
  diferenciaSeg: number | null;
  estado: EstadoPuntualidad;
}

export interface ReporteServicioApi {
  id: number;
  estado: 'PROGRAMADO' | 'EN_CURSO' | 'FINALIZADO' | 'CANCELADO';
  fechaSalida: string;
  horaSalida: string;
  inicioReal: string | null;
  finReal: string | null;
  duracionEstimadaMin: number | null;
  duracionRealMin: number | null;
  distanciaRealKm: number | null;
  observaciones: string | null;
  deviceID: string;
  conductorNombre: string;
  conductorBrevete: string;
  conductorCelular: string;
  ruta: { id: number; codigo: string | null; nombre: string | null; grupo: string | null; sentido: string | null };
  conteo: {
    total: number;
    completadas: number;
    aTiempo: number;
    adelantadas: number;
    retrasadas: number;
    omitidas: number;
    permanenciaTotalSeg: number;
  };
  paraderos: ReporteParaderoApi[];
}

export interface ReporteServiciosApi {
  toleranciaMin: number;
  resumen: {
    totalServicios: number;
    totalParadas: number;
    paradasCompletadas: number;
    aTiempo: number;
    adelantadas: number;
    retrasadas: number;
    omitidas: number;
    porcentajePuntualidad: number;
    permanenciaTotalSeg: number;
    permanenciaPromedioSeg: number;
  };
  servicios: ReporteServicioApi[];
}
