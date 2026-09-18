import { Conductor } from './SelectBuscable';

const WHATSAPP_API_URL = 'https://do.velsat.pe:8443/whatsapp/api/send/single';
const WHATSAPP_API_KEY = '1d78f405-c698-49f9-b6fc-e952f2716afc';

// Plantillas de mensaje para la notificación manual al conductor (botón por fila). El
// backend es quien arma el texto final y lo envía (ver notificarConductor en
// useServiciosTurismo.ts, que llama a PATCH /api/ServTurismo/{id}/notificar con { tipo });
// `construirTexto` acá solo sirve para la vista previa en el menú del botón.
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

// Mensaje genérico usado solo para la carga masiva por Excel (que sí sigue enviando
// directo desde el front, ver resolverTelefonosConductoresDesdeBrevete más abajo).
export const MENSAJE_EXCEL_DEFECTO =
  'Hola, tienes un servicio de turismo asignado. Revisa el detalle en tu app.';

export function normalizarCelularPeru(valor: string): string | null {
  const digitos = valor.replace(/\D/g, '');
  if (digitos.length === 9) return `51${digitos}`;
  if (digitos.length === 11 && digitos.startsWith('51')) return digitos;
  return null;
}

export async function enviarAlertaWhatsapp(
  phone: string,
  mensaje: string = MENSAJE_EXCEL_DEFECTO,
): Promise<boolean> {
  try {
    const response = await fetch(WHATSAPP_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': WHATSAPP_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone,
        type: 'texto',
        text: mensaje,
      }),
    });

    const bodyTexto = await response.text().catch(() => '');

    if (!response.ok) {
      console.error(
        `WhatsApp: fallo al enviar a ${phone} (HTTP ${response.status}): ${bodyTexto}`,
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error(`WhatsApp: error de red al enviar a ${phone}:`, error);
    return false;
  }
}

export interface ResultadoAlertasWhatsapp {
  total: number;
  enviados: number;
  fallidos: number;
}

// Único caso donde se sigue notificando en lote/automático: la carga masiva por Excel
// (y su sincronización cuando esa carga se hizo sin conexión). El resto de flujos usa el
// botón manual por fila. Los teléfonos ya deben venir resueltos desde la BD (ver
// resolverTelefonosConductoresDesdeBrevete), nunca desde la columna "celular" del Excel.
export async function enviarAlertasWhatsappLote(
  telefonosNormalizados: string[],
  mensaje: string = MENSAJE_EXCEL_DEFECTO,
): Promise<ResultadoAlertasWhatsapp> {
  const telefonos = new Set(telefonosNormalizados.filter(Boolean));

  const resultados = await Promise.all(
    Array.from(telefonos).map((phone) => enviarAlertaWhatsapp(phone, mensaje)),
  );

  const enviados = resultados.filter(Boolean).length;

  return {
    total: telefonos.size,
    enviados,
    fallidos: telefonos.size - enviados,
  };
}

// Resuelve, para un lote de registros con brevete/cobrevete (p.ej. de un Excel cargado),
// los celulares reales de esos conductores según la ficha de la BD (tabla taxi) — nunca
// según lo que se haya escrito en el Excel.
export function resolverTelefonosConductoresDesdeBrevete(
  registros: { brevete?: string | null; cobrevete?: string | null }[],
  conductores: Conductor[],
): string[] {
  const porBrevete = new Map<string, string>();
  conductores.forEach((c) => {
    const brevete = (c.brevete || '').trim();
    if (brevete && c.telefono) porBrevete.set(brevete, c.telefono);
  });

  const telefonos: string[] = [];
  registros.forEach((registro) => {
    [registro.brevete, registro.cobrevete].forEach((brevete) => {
      const clave = (brevete || '').trim();
      if (!clave) return;
      const telefono = normalizarCelularPeru(porBrevete.get(clave) || '');
      if (telefono) telefonos.push(telefono);
    });
  });

  return telefonos;
}
