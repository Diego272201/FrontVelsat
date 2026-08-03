import { CampoTexto } from './types';

export const API_BASE = 'https://do.velsat.pe:2083/api/ServTurismo';
export const API_UNIDADES = 'https://do.velsat.pe:2083/api/Preplan/carros';

// Card "Detalles" (el resto de secciones se arman a mano por su layout particular).
export const SECCIONES_DETALLE: {
  titulo: string;
  campos: { key: CampoTexto; label: string }[];
}[] = [
  {
    titulo: 'Detalles',
    campos: [
      { key: 'guiaturista', label: 'Guía Turista' },
      { key: 'vuelocliente', label: 'Vuelo Cliente' },
      { key: 'ejecutivo', label: 'Ejecutivo' },
      { key: 'cotizacion', label: 'Cotización' },
    ],
  },
];

// Campos que se recapitulan en el card "Servicio" (algunos ya visibles en la fila principal).
export const CAMPOS_SERVICIO: { key: CampoTexto; label: string }[] = [
  { key: 'cliente', label: 'Cliente' },
  { key: 'grupo', label: 'Grupo' },
  { key: 'numpax', label: 'N° Pax' },
  { key: 'origen', label: 'Origen' },
  { key: 'destino', label: 'Destino' },
];

export const SECCIONES_NOTAS: { key: CampoTexto; label: string }[] = [
  { key: 'instrucciones', label: 'Instrucciones' },
  { key: 'indicaciones', label: 'Indicaciones' },
  { key: 'observaciones', label: 'Observaciones' },
];
