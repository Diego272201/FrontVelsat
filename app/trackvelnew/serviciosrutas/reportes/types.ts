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
  minutosAcumulados: number;
  horaProgramada: string; // HH:mm
  horaLlegadaReal: string | null; // HH:mm
  tiempoPermanenciaMin: number | null; // Minutos detenido en la parada (dwell time)
  horaSalidaReal: string | null; // HH:mm
  diferenciaMinutos: number; // >0 retraso, <0 adelanto, 0 puntual
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
  totalParadas: number;
  paradasCompletadas: number;
  paradasATiempo: number;
  paradasAdelantadas: number;
  paradasRetrasadas: number;
  paradasOmitidas: number;
  tiempoTotalParadasMin: number; // Suma de minutos en paradas
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
  promedioPermanenciaMin: number;
  tiempoTotalEnParadasMin: number;
}
