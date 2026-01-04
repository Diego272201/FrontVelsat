// gruposData.ts

import { Grupo, Pasajero } from "./types";

// Interfaz para la respuesta de la API
interface ApiPasajero {
  codigo: string;
  nombre: string;
  fecha: string;
  hora: string;
  tipo: string;
  horaprog: string | null;
  orden: number | null;
  grupo: string | null;
  cerrado: boolean | null;
  eliminado: boolean | null;
  codconductor: string | null;
  codunidad: string | null;
  empresa: string;
  destino: {
    direccion: string;
    distrito: string;
    wy: string;
    wx: string;
    referencia: string | null;
  };
  direccionPasajero: {
    direccion: string;
    distrito: string;
    wy: string;
    wx: string;
    referencia: string | null;
  };
}

// Función helper para convertir fecha de formato DD/MM/YYYY a objeto Date
const parsearFecha = (fechaStr: string, horaStr: string): Date => {
  const [dia, mes, año] = fechaStr.split('/').map(Number);
  const [hora, minuto] = horaStr.split(':').map(Number);
  return new Date(año, mes - 1, dia, hora, minuto);
};

// Array vacío - se llenará desde el componente
export const gruposIniciales: Grupo[] = [];

// Función para cargar datos desde API
export const cargarGruposDesdeAPI = async (): Promise<Grupo[]> => {
  try {
    const response = await fetch(
      'https://do.velsat.pe:2083/api/Talma/PreplanTalma?tipo=S&fecha=20%2F08%2F2025&hora=02%3A00'
    );

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`);
    }

    const data: ApiPasajero[] = await response.json();
    
    console.log('✅ Datos recibidos de la API:', data);
    
    if (data.length === 0) {
      return [];
    }

    // Tomar info del primer pasajero para el grupo
    const primerPasajero = data[0];
    const fechaInicio = parsearFecha(primerPasajero.fecha, primerPasajero.hora);
    const fechaFin = parsearFecha(primerPasajero.fecha, primerPasajero.hora);

    // Transformar todos los pasajeros
    const pasajeros: Pasajero[] = data.map((apiPasajero) => ({
      id: apiPasajero.codigo,
      nombre: apiPasajero.nombre,
      distrito: apiPasajero.direccionPasajero.distrito,
      direccion: apiPasajero.direccionPasajero.direccion,
      fecha: `${apiPasajero.fecha} ${apiPasajero.hora}`,
      area: apiPasajero.empresa,
    }));

    // Crear UN SOLO GRUPO con todos los pasajeros
    const grupoUnico: Grupo = {
      id: 'grupo-1',
      numero: 1,
      tipoSalida: primerPasajero.tipo === 'S' ? 'Salida' : 'Llegada',
      empresa: primerPasajero.empresa,
      destino: primerPasajero.destino.direccion,
      inicio: fechaInicio,
      fin: fechaFin,
      tarifa: 'Por definir',
      conductor: primerPasajero.codconductor || '',
      unidad: primerPasajero.codunidad || '',
      duracion: '0h 0min',
      pasajeros: pasajeros,
    };

    console.log('✅ Grupo único creado con', pasajeros.length, 'pasajeros');
    
    return [grupoUnico];
    
  } catch (error) {
    console.error('❌ Error al cargar grupos desde API:', error);
    return [];
  }
};