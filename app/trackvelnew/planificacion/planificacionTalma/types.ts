export interface Grupo {
  id: string;
  numero: number;
  tipoSalida: string;
  empresa: string;
  destino: string;
  inicio: Date | null; // ✅ Ahora puede ser null
  fin: Date | null; // ✅ Ahora puede ser null
  tarifa: string;
  conductor: string;
  unidad: string;
  duracion: string;
  pasajeros: Pasajero[];
  
  // 🔥 NUEVOS CAMPOS OPCIONALES
  _tipoServicio?: 'S' | 'I'; // Tipo original del servicio
  _bloqueaInicio?: boolean; // true = no se puede editar inicio
  _bloqueaFin?: boolean; // true = no se puede editar fin
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