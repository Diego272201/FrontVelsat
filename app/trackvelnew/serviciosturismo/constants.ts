import { CampoTexto } from './types';

export const API_BASE = 'https://do.velsat.pe:2083/api/ServTurismo';
export const API_UNIDADES = 'https://do.velsat.pe:2083/api/Preplan/carros';
export const API_TAXI = 'https://do.velsat.pe:2083/api/ServTurismo/taxi';

export const CLAVE_OPCIONES_AVANZADAS = 'ST2026';

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

export const ETIQUETAS_CAMPOS_AUDITORIA: Record<string, string> = {
  fechainicio: 'Fecha',
  horainicio: 'Hora Inicio',
  horaretorno: 'Hora Retorno',
  bus: 'Bus',
  placa: 'Placa',
  brevete: 'Brevete',
  piloto: 'Piloto',
  celular: 'Celular',
  cobrevete: 'Brevete Copiloto',
  copiloto: 'Copiloto',
  cocelular: 'Celular Copiloto',
  tipounidad: 'Tipo Unidad',
  cliente: 'Cliente',
  grupo: 'Grupo',
  numpax: 'N° Pax',
  origen: 'Origen',
  destino: 'Destino',
  guiaturista: 'Guía Turista',
  vuelocliente: 'Vuelo Cliente',
  observaciones: 'Observaciones',
  ejecutivo: 'Ejecutivo',
  cotizacion: 'Cotización',
  instrucciones: 'Instrucciones',
  indicaciones: 'Indicaciones',
};
