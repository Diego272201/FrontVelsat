export interface Grupo {
  id: string;
  numero: number;
  tipoSalida: 'Salida' | 'Entrada' | 'Eliminados';
  empresa: string;
  destinocodigo: string;
  destino: string;
  inicio: Date | null;
  fin: Date | null;
  tarifa: string;
  conductor: string;
  unidad: string;
  duracion: string;
  pasajeros: Pasajero[];
  _tipoServicio?: 'S' | 'I';     
  _bloqueaInicio?: boolean;      
  _bloqueaFin?: boolean;          
}

export interface Pasajero {
  id: string;
  nombre: string;
  distrito: string;
  direccion: string;
  fecha: string;
  area: string;
  codlan?: string;
  grupoOriginalId?: string;
  _apiData?: any;
}

export interface GrupoParaModal {
  id: number;
  tipo: string;
  empresa: string;
  destinoGrupo: string;
  fecha: string;
  horaprog: string;
  conductor: string;
  unidad: string;
  cantidadPasajeros: number;
}