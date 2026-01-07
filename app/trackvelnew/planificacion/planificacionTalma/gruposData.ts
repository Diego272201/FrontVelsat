// gruposData.ts

import { Grupo, Pasajero } from "./types";

// Interfaz para la respuesta de la API (actualizada con TODOS los campos)
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

// Helper para parsear fecha que viene en formato "DD/MM/YYYY HH:mm" (horaprog)
const parsearFechaCompleta = (fechaCompleta: string): Date => {
  const [fechaPart, horaPart] = fechaCompleta.split(' ');
  return parsearFecha(fechaPart, horaPart);
};

// Helper para formatear fecha a formato API (DD/MM/YYYY HH:mm)
const formatearFechaParaAPI = (fecha: Date | null): string | null => {
  if (!fecha) return null;
  
  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const año = fecha.getFullYear();
  const hora = String(fecha.getHours()).padStart(2, '0');
  const minuto = String(fecha.getMinutes()).padStart(2, '0');
  
  return `${dia}/${mes}/${año} ${hora}:${minuto}`;
};

// Función para cargar datos desde API
export const cargarGruposDesdeAPI = async (
  fecha: string,   
  hora: string,     
  tipo: 'S' | 'I'   
): Promise<Grupo[]> => {
  try {
    const tipoParam = tipo === 'S' ? 'S' : 'I';
    const url = `https://do.velsat.pe:2083/api/Talma/PreplanTalma?tipo=${tipoParam}&fecha=${encodeURIComponent(fecha)}&hora=${encodeURIComponent(hora)}`;
    
    console.log('URL de la API:', url);
    
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`);
    }

    const data: ApiPasajero[] = await response.json();
    
    console.log('Datos recibidos de la API:', data);
    
    if (data.length === 0) {
      return [];
    }

    const tieneOrdenYGrupo = data.every(p => p.orden !== null && p.grupo !== null);

    if (tieneOrdenYGrupo) {
      console.log('✅ Datos con orden y grupo definidos - Agrupando...');

      const gruposPorNumero = new Map<string, ApiPasajero[]>();
      
      data.forEach(pasajero => {
        const grupoKey = pasajero.grupo!;
        if (!gruposPorNumero.has(grupoKey)) {
          gruposPorNumero.set(grupoKey, []);
        }
        gruposPorNumero.get(grupoKey)!.push(pasajero);
      });

      // Ordenar pasajeros dentro de cada grupo por 'orden'
      gruposPorNumero.forEach(pasajeros => {
        pasajeros.sort((a, b) => (a.orden || 0) - (b.orden || 0));
      });

      // Convertir a array de grupos ordenados
      const gruposOrdenados = Array.from(gruposPorNumero.entries())
        .sort(([keyA], [keyB]) => Number(keyA) - Number(keyB))
        .map(([grupoKey, pasajerosDelGrupo]) => {
          const primerPasajero = pasajerosDelGrupo[0];
          const tipoServicio: 'S' | 'I' = primerPasajero.tipo as 'S' | 'I';

          let fechaInicio: Date | null = null;
          let fechaFin: Date | null = null;

          if (tipoServicio === 'S') {
            fechaInicio = parsearFecha(primerPasajero.fecha, primerPasajero.hora);
            if (primerPasajero.horaprog) {
              fechaFin = parsearFechaCompleta(primerPasajero.horaprog);
            } else {
              fechaFin = null;
            }
          } else if (tipoServicio === 'I') {
            if (primerPasajero.horaprog) {
              fechaInicio = parsearFechaCompleta(primerPasajero.horaprog);
            } else {
              fechaInicio = null;
            }
            fechaFin = parsearFecha(primerPasajero.fecha, primerPasajero.hora);
          }

          let conductorNombre = '';
          if (primerPasajero.conductor) {
            const { nombres, apellidos } = primerPasajero.conductor;
            conductorNombre = nombres 
              ? `${nombres} ${apellidos}`.trim() 
              : apellidos.trim();
          }

          const pasajeros: Pasajero[] = pasajerosDelGrupo.map((apiPasajero) => ({
            id: apiPasajero.codigo,
            nombre: apiPasajero.nombre,
            distrito: apiPasajero.direccionPasajero.distrito,
            direccion: apiPasajero.direccionPasajero.direccion,
            fecha: `${apiPasajero.fecha} ${apiPasajero.hora}`,
            area: apiPasajero.empresa,
            _apiData: apiPasajero
          }));

          const grupo: Grupo = {
            id: `grupo-${grupoKey}-${Date.now()}`,
            numero: Number(grupoKey) + 1, 
            tipoSalida: tipoServicio === 'S' ? 'Salida' : 'Entrada',
            empresa: primerPasajero.empresa,
            destino: primerPasajero.destino.direccion,
            inicio: fechaInicio,
            fin: fechaFin,
            tarifa: 'Por definir',
            conductor: conductorNombre,
            unidad: primerPasajero.codunidad || '',
            duracion: '0h 0min',
            pasajeros: pasajeros,
            _tipoServicio: tipoServicio,
            _bloqueaInicio: tipoServicio === 'S',
            _bloqueaFin: tipoServicio === 'I',
          };

          return grupo;
        });

      console.log(`${gruposOrdenados.length} grupos creados con orden definido`);
      gruposOrdenados.forEach((g, i) => {
        console.log(`   Grupo ${g.numero}: ${g.pasajeros.length} pasajeros`);
      });
      
      return gruposOrdenados;

    } else {
      const primerPasajero = data[0];
      const tipoServicio: 'S' | 'I' = primerPasajero.tipo as 'S' | 'I';

      let fechaInicio: Date | null = null;
      let fechaFin: Date | null = null;

      if (tipoServicio === 'S') {
        fechaInicio = parsearFecha(primerPasajero.fecha, primerPasajero.hora);
        fechaFin = null;
      } else if (tipoServicio === 'I') {
        fechaInicio = null;
        fechaFin = parsearFecha(primerPasajero.fecha, primerPasajero.hora);
      }

      let conductorNombre = '';
      if (primerPasajero.conductor) {
        const { nombres, apellidos } = primerPasajero.conductor;
        conductorNombre = nombres 
          ? `${nombres} ${apellidos}`.trim() 
          : apellidos.trim();
      }

      const pasajeros: Pasajero[] = data.map((apiPasajero) => ({
        id: apiPasajero.codigo,
        nombre: apiPasajero.nombre,
        distrito: apiPasajero.direccionPasajero.distrito,
        direccion: apiPasajero.direccionPasajero.direccion,
        fecha: `${apiPasajero.fecha} ${apiPasajero.hora}`,
        area: apiPasajero.empresa,
        _apiData: apiPasajero
      }));

      const grupoUnico: Grupo = {
        id: `grupo-1-${Date.now()}`,
        numero: 1,
        tipoSalida: tipoServicio === 'S' ? 'Salida' : 'Entrada',
        empresa: primerPasajero.empresa,
        destino: primerPasajero.destino.direccion,
        inicio: fechaInicio,
        fin: fechaFin,
        tarifa: 'Por definir',
        conductor: conductorNombre,
        unidad: primerPasajero.codunidad || '',
        duracion: '0h 0min',
        pasajeros: pasajeros,
        _tipoServicio: tipoServicio,
        _bloqueaInicio: tipoServicio === 'S',
        _bloqueaFin: tipoServicio === 'I',
      };

      return [grupoUnico];
    }
    
  } catch (error) {
    console.error('Error al cargar grupos desde API:', error);
    return [];
  }
};

// Función para guardar grupos en la API
export const guardarGruposEnAPI = async (
  grupos: Grupo[], 
  conductores: Array<{codigo: string, apepate: string}>
): Promise<boolean> => {
  try {
    // Array para acumular todos los pasajeros de todos los grupos
    const payload: any[] = [];

    // Recorrer cada grupo
    grupos.forEach((grupo) => {
      // Determinar qué fecha usar según el tipo de servicio
      let horaprog: string | null = null;
      
      if (grupo._tipoServicio === 'S') {
        // Si es Salida, usar fecha FIN
        horaprog = formatearFechaParaAPI(grupo.fin);
      } else if (grupo._tipoServicio === 'I') {
        // Si es Entrada, usar fecha INICIO
        horaprog = formatearFechaParaAPI(grupo.inicio);
      }

      // Validar que tenga la fecha requerida
      if (!horaprog) {
        throw new Error(
          `El grupo ${grupo.numero} no tiene la fecha ${
            grupo._tipoServicio === 'S' ? 'FIN' : 'INICIO'
          } configurada. Por favor complétala antes de guardar.`
        );
      }

      // Recorrer cada pasajero del grupo
      grupo.pasajeros.forEach((pasajero, index) => {
        const apiData = pasajero._apiData;

        // 🔥 Buscar código del conductor por nombre
        let codconductorEncontrado: string | null = null;
        if (grupo.conductor && grupo.conductor.trim() !== '') {
          const conductorEncontrado = conductores.find(c => 
            c.apepate.trim().toLowerCase() === grupo.conductor.trim().toLowerCase()
          );
          if (conductorEncontrado) {
            codconductorEncontrado = conductorEncontrado.codigo;
          }
        }

        const pasajeroPayload = {
          codigo: apiData.codigo,
          horaprog: horaprog!,
          orden: String(index),
          grupo: String(grupo.numero - 1),
          codconductor: codconductorEncontrado || (apiData.conductor?.codtaxi ? String(apiData.conductor.codtaxi) : null),
          codunidad: grupo.unidad || apiData.codunidad || null,  // 🔥 TOMA DE grupo.unidad primero
          destinocodigo: apiData.destino.codlugar ? String(apiData.destino.codlugar) : null,
          destinocodlugar: String(apiData.direccionPasajero.codlugar)
        };

        payload.push(pasajeroPayload);
      });
    });

    console.log('Payload enviando a la API (array directo):', JSON.stringify(payload, null, 2));
    console.log(`Total de pasajeros a guardar: ${payload.length}`);

    const response = await fetch('https://do.velsat.pe:2083/api/Talma/SavePreplanTalma', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload) 
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log('Respuesta de la API:', result);
    console.log('Guardado exitoso');
    
    return true;

  } catch (error) {
    console.error('Error al guardar grupos:', error);
    throw error;
  }
};