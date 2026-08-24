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
  // Acuse de recibo del conductor desde la app móvil. Cada uno es una columna booleana
  // independiente (ya no hay un campo "estado" de texto combinado):
  // visto: el servicio se mostró en su pantalla.
  // confirmado: además deslizó la tarjeta para confirmarlo.
  // finalizado: deslizó hacia el otro lado y confirmó el modal de advertencia (estado final).
  // cancelado: se canceló desde este panel; un servicio cancelado ya no admite ediciones.
  visto: number | null;
  confirmado: number | null;
  finalizado: number | null;
  cancelado: number | null;
  // Pausa reversible: el conductor deja de ver el servicio (igual que cancelado), pero a diferencia
  // de cancelado se puede "reanudar" para que vuelva a estar activo.
  standby: number | null;
  // Se marca cuando se reprograma la fecha del servicio. El backend limpia visto/confirmado/finalizado
  // al reprogramar, así que puede mostrarse junto a un "Pendiente" recién reiniciado.
  reprogramado: number | null;
  // Campos que cambiaron en la última edición manual del servicio, solo si fue en las últimas 24h
  // (pasado ese plazo el backend deja de mandarlo). Se usa para resaltar esas celdas en la tabla.
  ultimaModificacion: { campos: string[]; fecha: string } | null;
  // No viene del backend: se marca en el front cuando el cambio se guardó localmente (sin
  // conexión) y todavía no se confirmó contra el servidor. idservicio negativo = creado offline,
  // aún sin id real asignado por el backend.
  _pendingSync?: boolean;
}

// Un registro de auditoría por campo modificado en una edición manual del servicio.
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

// Claves de ServicioTurismoVista cuyo valor es siempre string | null
// (excluye las numéricas: idservicio, visto, confirmado, finalizado, cancelado, standby y reprogramado;
// ultimaModificacion, que es un objeto, no texto; y _pendingSync, que es un flag del front).
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

// Columnas de la tabla principal (de Fecha a Destino) que tienen filtro tipo Excel.
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
