export type TipoOperacionPendiente =
  | 'crear'
  | 'editar'
  | 'cancelar'
  | 'standby'
  | 'reanudar'
  | 'cargaExcel';

export interface PayloadEditar {
  campos: Record<string, unknown>;
  usuario?: string;
  motivo?: string;
}

export interface PayloadCrear {
  campos: Record<string, unknown>;
}

export interface PayloadCargaExcel {
  registros: Record<string, unknown>[];
}

export interface OperacionPendiente {
  id: string;
  tipo: TipoOperacionPendiente;
  idservicio: number;
  fecha: string;
  payload?: PayloadEditar | PayloadCrear | PayloadCargaExcel;
  creadoEn: number;
}
