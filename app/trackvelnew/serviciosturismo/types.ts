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
}

export interface ServicioTurismoVista extends ServicioTurismo {
  placaCombinada: string;
}

// Claves de ServicioTurismoVista cuyo valor es siempre string | null (excluye idservicio: number).
export type CampoTexto = Exclude<keyof ServicioTurismoVista, 'idservicio'>;

export interface EditFormServicio {
  fechainicio: string; // yyyy-MM-dd (input date)
  horainicio: string; // HH:mm (input time)
  horaretorno: string;
  placa: string; // codunidad combinado (bus-placa)
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

export interface Notificacion {
  id: string;
  tipo: 'success' | 'error';
  mensaje: string;
}
