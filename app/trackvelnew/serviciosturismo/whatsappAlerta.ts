// Plantillas de mensaje para la notificación manual al conductor (botón por fila). El
// backend es quien arma el texto final y lo envía (ver notificarConductor en
// useServiciosTurismo.ts, que llama a PATCH /api/ServTurismo/{id}/notificar con { tipo });
// `construirTexto` acá solo sirve para la vista previa en el menú del botón.
//
// La carga masiva por Excel también notifica por WhatsApp, pero lo hace el backend dentro de
// POST /lote: el front no envía mensajes ni conoce la API del gateway de WhatsApp.
export type TipoPlantillaWhatsapp = 'revision' | 'cambio' | 'cancelacion';

export interface PlantillaWhatsapp {
  id: TipoPlantillaWhatsapp;
  titulo: string;
  construirTexto: (datos: { fecha: string; hora: string }) => string;
}

export const PLANTILLAS_WHATSAPP: PlantillaWhatsapp[] = [
  {
    id: 'revision',
    titulo: 'Notificar revisión',
    construirTexto: ({ fecha }) => `Revisa tus servicios asignados para el día ${fecha || '-'}`,
  },
  {
    id: 'cambio',
    titulo: 'Notificar cambio',
    construirTexto: ({ fecha, hora }) =>
      `Tu servicio del día ${fecha || '-'} de las ${hora || '-'} tuvo una modificación`,
  },
  {
    id: 'cancelacion',
    titulo: 'Cancelación de servicio',
    construirTexto: ({ fecha, hora }) =>
      `Tu servicio del día ${fecha || '-'} de las ${hora || '-'} fue cancelado`,
  },
];
