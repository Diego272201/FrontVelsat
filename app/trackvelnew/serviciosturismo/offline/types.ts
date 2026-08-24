export type TipoOperacionPendiente =
  | 'crear'
  | 'editar'
  | 'cancelar'
  | 'standby'
  | 'reanudar';

export interface PayloadEditar {
  campos: Record<string, unknown>;
  usuario?: string;
  motivo?: string;
}

export interface PayloadCrear {
  campos: Record<string, unknown>;
}

// Una mutación que no se pudo enviar al backend (por falta de red o backend caído) y quedó
// guardada para reintentar más tarde, en el mismo orden en que se creó.
export interface OperacionPendiente {
  id: string; // uuid generado en el cliente
  tipo: TipoOperacionPendiente;
  idservicio: number; // id real, o negativo (temporal) si tipo === 'crear' y aún no se sincronizó
  fecha: string; // fecha ISO de la vista en la que se originó
  payload?: PayloadEditar | PayloadCrear;
  // La alerta de WhatsApp se dispara recién cuando esta operación sincroniza de verdad,
  // no al momento de encolarla.
  celularParaWhatsapp: string | null;
  mensajeWhatsapp?: string;
  creadoEn: number;
}
