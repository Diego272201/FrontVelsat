export interface ServicioTurismo {
  idservicio: number;
  fechainicio: string | null;
  instrucciones: string | null;
  horainicio: string | null;
  indicaciones: string | null;
  horaretorno: string | null;
  bus: string | null;
  placa: string | null;
  brevete: string | null;
  piloto: string | null;
  celular: string | null;
  cobrevete: string | null;
  copiloto: string | null;
  cocelular: string | null;
  tipounidad: string | null;
  cliente: string | null;
  grupo: string | null;
  numpax: string | null;
  origen: string | null;
  destino: string | null;
  guiaturista: string | null;
  vuelocliente: string | null;
  observaciones: string | null;
  ejecutivo: string | null;
  cotizacion: string | null;
  visto: number | null;
  confirmado: number | null;
  finalizado: number | null;
  cancelado: number | null;
  standby: number | null;
  reprogramado: number | null;
  ultimaModificacion: { campos: string[]; fecha: string } | null;
  _pendingSync?: boolean;
}

export interface AuditoriaCampo {
  idauditoria: number;
  idservicio: number;
  campo: string;
  valorAnterior: string | null;
  valorNuevo: string | null;
  usuario: string | null;
  motivo: string | null;
  fecha: string;
}

export interface ServicioTurismoVista extends ServicioTurismo {
  placaCombinada: string;
}

export type CampoTexto = Exclude<
  keyof ServicioTurismoVista,
  | 'idservicio'
  | 'visto'
  | 'confirmado'
  | 'finalizado'
  | 'cancelado'
  | 'standby'
  | 'reprogramado'
  | 'ultimaModificacion'
  | '_pendingSync'
>;

export interface EditFormServicio {
  fechainicio: string;
  horainicio: string;
  horaretorno: string;
  placa: string;
  tipounidad: string;
  piloto: string;
  brevete: string;
  celular: string;
  copiloto: string;
  cobrevete: string;
  cocelular: string;
  cliente: string;
  grupo: string;
  numpax: string;
  origen: string;
  destino: string;
  guiaturista: string;
  vuelocliente: string;
  ejecutivo: string;
  cotizacion: string;
  instrucciones: string;
  indicaciones: string;
  observaciones: string;
}

export type ColumnaFiltrable =
  | 'fechainicio'
  | 'horainicio'
  | 'tipounidad'
  | 'placaCombinada'
  | 'piloto'
  | 'cliente'
  | 'grupo'
  | 'origen'
  | 'destino';

export interface Notificacion {
  id: string;
  tipo: 'success' | 'error';
  mensaje: string;
}
