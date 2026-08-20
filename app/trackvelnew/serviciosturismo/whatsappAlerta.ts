const WHATSAPP_API_URL = 'https://do.velsat.pe:8443/whatsapp/api/send/single';
const WHATSAPP_API_KEY = '1d78f405-c698-49f9-b6fc-e952f2716afcc';

export const MENSAJE_NUEVO_SERVICIO =
  'Hola, se te asignó un nuevo servicio. Revisa tu app.';
export const MENSAJE_SERVICIO_MODIFICADO =
  'Hola, se hicieron algunos cambios en tu servicio. Revisa tu app.';

export function normalizarCelularPeru(valor: string): string | null {
  const digitos = valor.replace(/\D/g, '');
  if (digitos.length === 9) return `51${digitos}`;
  if (digitos.length === 11 && digitos.startsWith('51')) return digitos;
  return null;
}

export async function enviarAlertaWhatsapp(
  phone: string,
  mensaje: string = MENSAJE_NUEVO_SERVICIO,
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

    console.log(`WhatsApp: alerta enviada a ${phone}`, bodyTexto);
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

export async function enviarAlertasWhatsappLote(
  celularesCrudos: (string | undefined)[],
  mensaje: string = MENSAJE_NUEVO_SERVICIO,
): Promise<ResultadoAlertasWhatsapp> {
  const celulares = new Set<string>();

  celularesCrudos.forEach((valor) => {
    const normalizado = normalizarCelularPeru(valor || '');
    if (normalizado) celulares.add(normalizado);
  });

  const resultados = await Promise.all(
    Array.from(celulares).map((phone) => enviarAlertaWhatsapp(phone, mensaje)),
  );

  const enviados = resultados.filter(Boolean).length;

  return {
    total: celulares.size,
    enviados,
    fallidos: celulares.size - enviados,
  };
}
