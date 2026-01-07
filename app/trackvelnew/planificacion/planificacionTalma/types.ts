export interface Grupo {
  id: string;
  numero: number;
  tipoSalida: 'Salida' | 'Entrada' | 'Eliminados';
  empresa: string;
  destino: string;
  inicio: Date | null;
  fin: Date | null;
  tarifa: string;
  conductor: string;
  unidad: string;
  duracion: string;
  pasajeros: Pasajero[];
  _tipoServicio?: 'S' | 'I';     // 🔥 Agregar si no existe
  _bloqueaInicio?: boolean;       // 🔥 Agregar si no existe
  _bloqueaFin?: boolean;          // 🔥 Agregar si no existe
}

export interface Pasajero {
  id: string;
  nombre: string;
  distrito: string;
  direccion: string;
  fecha: string;
  area: string;
  grupoOriginalId?: string;
  
  // 🔥 NUEVO: Guardar data completa de API
  _apiData?: any; // Toda la info original de la API
}