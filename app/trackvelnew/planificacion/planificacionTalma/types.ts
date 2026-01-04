// types.ts

export interface Pasajero {
  id: string;
  nombre: string;
  distrito: string;
  direccion: string;
  fecha: string;
  area: string;
  grupoOriginalId?: string; // Para rastrear el grupo original cuando está en papelera
}

export interface Grupo {
  id: string;
  numero: number;
  tipoSalida: string;
  empresa: string;
  destino: string;
  inicio: Date;
  fin: Date;
  tarifa: string;
  conductor: string;
  unidad: string;
  duracion: string;
  pasajeros: Pasajero[];
}