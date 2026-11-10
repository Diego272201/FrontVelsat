// Tipos del módulo Servicios Rutas. Reflejan las respuestas de la API
// (api/servicios-rutas en el backend): fechas "dd/MM/yyyy" y horas "HH:mm".

export type EstadoServicio = 'PROGRAMADO' | 'EN_CURSO' | 'FINALIZADO' | 'CANCELADO';

export type EstadoParadero =
  | 'PENDIENTE'
  | 'A_TIEMPO'
  | 'ADELANTADO'
  | 'RETRASADO'
  | 'OMITIDO';

export type TipoParadero = 'ORIGEN' | 'INTERMEDIO' | 'DESTINO';

export type Sentido = 'IDA' | 'REGRESO';

export interface Paradero {
  id: number;
  orden: number;
  tipo: TipoParadero;
  nombre: string;
  latitud: number;
  longitud: number;
  radioMetros: number;
  /** Minutos para llegar a este paradero desde el anterior (0 en el origen). */
  minutosDesdeAnterior: number;
  /** Calculado por la API: suma de minutosDesdeAnterior hasta este paradero. */
  minutosAcumulados: number;
}

export interface Ruta {
  id: number;
  codigo: string;
  nombre: string;
  /** Texto libre de la columna `ruta.grupo`. Las rutas sin grupo llegan como SIN_GRUPO. */
  grupo: string;
  /** Cada sentido es una ruta propia (con su trazado y paraderos). */
  sentido: Sentido;
  /** Ruta del sentido contrario (null si no tiene). Se enlaza en las dos rutas. */
  rutaParejaId: number | null;
  rutaParejaCodigo: string | null;
  rutaParejaNombre: string | null;
  descripcion?: string | null;
  distanciaKm: number | null;
  activo: boolean;
  /** Solo el detalle (GET rutas/{id}) trae los paraderos; en el listado va vacío. */
  paraderos: Paradero[];
  /** Línea del recorrido como pares [latitud, longitud]. Solo en el detalle; null si no hay. */
  trazado: [number, number][] | null;
  /** Solo en el listado. */
  cantidadParaderos: number;
  /** Minutos totales de la ruta. Solo en el listado. */
  duracionMin: number;
}

/** Etiqueta para las rutas que no tienen grupo (grupo = NULL en la base). */
export const SIN_GRUPO = 'Sin grupo';

export interface Servicio {
  id: number;
  deviceID: string;
  rutaId: number;
  rutaCodigo: string;
  rutaNombre: string;
  rutaSentido: Sentido;
  fechaSalida: string; // dd/MM/yyyy
  horaSalida: string; // HH:mm
  conductorNombre: string;
  conductorBrevete: string;
  conductorCelular: string;
  estado: EstadoServicio;
  /** Paraderos con llegada registrada / total de paraderos de la ruta. */
  paraderosCompletados: number;
  totalParaderos: number;
}

export interface NuevoServicioForm {
  deviceID: string;
  rutaId: number | null;
  fechaIso: string; // yyyy-MM-dd (input date)
  hora: string; // HH:mm (input time)
  conductorNombre: string;
  conductorBrevete: string;
  conductorCelular: string;
}

/** Ruta activa lista para mostrarse: con su color y, si cargó, con paraderos y trazado. */
export interface RutaVista extends Ruta {
  color: string;
}

/** Posición en vivo de un conductor (GET {cuenta}/posiciones). */
export interface PosicionConductor {
  /** Identificador estable del marcador (unidad o conductor). */
  clave: string;
  lat: number;
  lng: number;
  /** Grados desde el norte, sentido horario. */
  rumbo: number;
  deviceID: string | null;
  conductor: string | null;
  rutaId: number | null;
  velocidad: number | null;
  fecha: string | null;
}

/** Evento "ServicioActualizado" del hub: algo cambió en un servicio. */
export interface AvisoServicio {
  servicioId: number;
  tipo: 'CREADO' | 'EDITADO' | 'REPROGRAMADO' | 'ESTADO' | 'LLEGADA' | 'SALIDA';
  deviceID?: string | null;
  orden?: number | null;
  paradero?: string | null;
  /** HH:mm:ss, hora de Perú. */
  hora?: string | null;
  /** Solo LLEGADA: A_TIEMPO | ADELANTADO | RETRASADO. */
  estadoParadero?: string | null;
  /** Solo LLEGADA: minutos de diferencia (+ = retraso). */
  diferenciaMin?: number | null;
  /** Solo SALIDA: minutos entre la llegada y la salida. */
  permanenciaMin?: number | null;
  /** Solo ESTADO: nuevo estado del servicio. */
  estadoServicio?: string | null;
}

/** Punto donde terminan una o varias rutas (mismo paradero destino). */
export interface DestinoComun {
  lat: number;
  lng: number;
  nombre: string;
  rutaIds: number[];
}
