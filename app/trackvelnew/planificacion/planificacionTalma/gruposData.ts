// gruposData.ts

import { Grupo, Pasajero } from "./types";

// Interfaz para la respuesta de la API (actualizada con TODOS los campos)
interface ApiPasajero {
  codigo: string;
  nombre: string;
  fecha: string;
  hora: string;
  tipo: string; // 'S' = Salida, 'I' = Llegada/Entrada
  horaprog: string | null; // Solo viene cuando tipo='I'
  orden: number | null;
  grupo: string | null;
  cerrado: boolean | null;
  eliminado: boolean | null;
  conductor: {
    codtaxi: number;
    nombres: string | null;
    apellidos: string;
  } | null;
  codunidad: string | null;
  empresa: string;
  destino: {
    codlugar: number;
    direccion: string;
    distrito: string;
    wy: string;
    wx: string;
    referencia: string | null;
  };
  direccionPasajero: {
    codlugar: number;
    direccion: string;
    distrito: string;
    wy: string;
    wx: string;
    referencia: string | null;
  };
}

// Función helper para convertir fecha de formato DD/MM/YYYY HH:mm a objeto Date
const parsearFecha = (fechaStr: string, horaStr: string): Date => {
  const [dia, mes, año] = fechaStr.split('/').map(Number);
  const [hora, minuto] = horaStr.split(':').map(Number);
  return new Date(año, mes - 1, dia, hora, minuto);
};



// Función para cargar datos desde API
export const cargarGruposDesdeAPI = async (
  fecha: string,      // Formato: DD/MM/YYYY
  hora: string,       // Formato: HH:mm
  tipo: 'S' | 'I'     // 'S' = Salida, 'I' = Entrada
): Promise<Grupo[]> => {
  try {
   
    const tipoParam = tipo === 'S' ? 'S' : 'I';
    const url = `https://do.velsat.pe:2083/api/Talma/PreplanTalma?tipo=${tipoParam}&fecha=${encodeURIComponent(fecha)}&hora=${encodeURIComponent(hora)}`;
    
    console.log('🌐 URL de la API:', url);
    
    const response = await fetch(url);

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
    const tipoServicio: 'S' | 'I' = primerPasajero.tipo as 'S' | 'I';

    // 🔥 LÓGICA DE FECHAS SEGÚN TIPO
    let fechaInicio: Date | null = null;
    let fechaFin: Date | null = null;

    if (tipoServicio === 'S') {
      // SALIDA: inicio con fecha/hora, fin vacío (usuario lo llenará)
      fechaInicio = parsearFecha(primerPasajero.fecha, primerPasajero.hora);
      fechaFin = null;
    } else if (tipoServicio === 'I') {
      // LLEGADA/ENTRADA: fin con horaprog, inicio vacío (usuario lo llenará)
      fechaInicio = null;
      if (primerPasajero.horaprog) {
        // horaprog viene en formato "DD/MM/YYYY HH:mm" completo
        const [fechaPart, horaPart] = primerPasajero.horaprog.split(' ');
        fechaFin = parsearFecha(fechaPart, horaPart);
      } else {
        fechaFin = null;
      }
    }

    // 🔥 CONDUCTOR: concatenar nombres + apellidos si existe
    let conductorNombre = '';
    if (primerPasajero.conductor) {
      const { nombres, apellidos } = primerPasajero.conductor;
      conductorNombre = nombres 
        ? `${nombres} ${apellidos}`.trim() 
        : apellidos.trim();
    }

    // Transformar todos los pasajeros
    const pasajeros: Pasajero[] = data.map((apiPasajero) => ({
      id: apiPasajero.codigo,
      nombre: apiPasajero.nombre,
      distrito: apiPasajero.direccionPasajero.distrito,
      direccion: apiPasajero.direccionPasajero.direccion,
      fecha: `${apiPasajero.fecha} ${apiPasajero.hora}`,
      area: apiPasajero.empresa,
      // Guardar TODOS los campos de la API para uso futuro
      _apiData: apiPasajero // Guardamos toda la data original
    }));

    // Crear UN SOLO GRUPO con todos los pasajeros
    const grupoUnico: Grupo = {
      id: 'grupo-1',
      numero: 1,
      tipoSalida: tipoServicio === 'S' ? 'Salida' : 'Entrada',
      empresa: primerPasajero.empresa,
      destino: primerPasajero.destino.direccion,
      inicio: fechaInicio, // ✅ null si es tipo 'I'
      fin: fechaFin, // ✅ null si es tipo 'S'
      tarifa: 'Por definir',
      conductor: conductorNombre,
      unidad: primerPasajero.codunidad || '',
      duracion: '0h 0min',
      pasajeros: pasajeros,
      // 🔥 NUEVOS CAMPOS para control de edición
      _tipoServicio: tipoServicio,
      _bloqueaInicio: tipoServicio === 'S', // Si es Salida, bloquea inicio
      _bloqueaFin: tipoServicio === 'I', // Si es Entrada, bloquea fin
    };

    console.log('✅ Grupo único creado con', pasajeros.length, 'pasajeros');
    console.log('📋 Tipo de servicio:', tipoServicio);
    console.log('🔒 Bloquea inicio:', grupoUnico._bloqueaInicio);
    console.log('🔒 Bloquea fin:', grupoUnico._bloqueaFin);
    console.log('📅 Fecha inicio:', fechaInicio);
    console.log('📅 Fecha fin:', fechaFin);
    
    return [grupoUnico];
    
  } catch (error) {
    console.error('❌ Error al cargar grupos desde API:', error);
    return [];
  }
};