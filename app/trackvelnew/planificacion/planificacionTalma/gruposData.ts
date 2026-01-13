import { Grupo, Pasajero } from './types';

interface ApiPasajero {
  codigo: string;
  codcliente: string; 
  codlan: string;
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

const parsearFecha = (fechaStr: string, horaStr: string): Date => {
  const [dia, mes, año] = fechaStr.split('/').map(Number);
  const [hora, minuto] = horaStr.split(':').map(Number);
  return new Date(año, mes - 1, dia, hora, minuto);
};

const parsearFechaCompleta = (fechaCompleta: string): Date => {
  const [fechaPart, horaPart] = fechaCompleta.split(' ');
  return parsearFecha(fechaPart, horaPart);
};

const formatearFechaParaAPI = (fecha: Date | null): string | null => {
  if (!fecha) return null;

  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const año = fecha.getFullYear();
  const hora = String(fecha.getHours()).padStart(2, '0');
  const minuto = String(fecha.getMinutes()).padStart(2, '0');

  return `${dia}/${mes}/${año} ${hora}:${minuto}`;
};

export const cargarGruposDesdeAPI = async (
  fecha: string,
  hora: string,
  tipo: 'S' | 'I',
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

    const tieneOrdenYGrupo = data.every(
      (p) => p.orden !== null && p.grupo !== null,
    );

    if (tieneOrdenYGrupo) {
      console.log('Datos con orden y grupo definidos - Agrupando...');

      const gruposPorNumero = new Map<string, ApiPasajero[]>();

      data.forEach((pasajero) => {
        const grupoKey = pasajero.grupo!;
        if (!gruposPorNumero.has(grupoKey)) {
          gruposPorNumero.set(grupoKey, []);
        }
        gruposPorNumero.get(grupoKey)!.push(pasajero);
      });

      gruposPorNumero.forEach((pasajeros) => {
        pasajeros.sort((a, b) => (a.orden || 0) - (b.orden || 0));
      });

      const gruposOrdenados = Array.from(gruposPorNumero.entries())
        .sort(([keyA], [keyB]) => Number(keyA) - Number(keyB))
        .map(([grupoKey, pasajerosDelGrupo]) => {
          const primerPasajero = pasajerosDelGrupo[0];
          const tipoServicio: 'S' | 'I' = primerPasajero.tipo as 'S' | 'I';

          let fechaInicio: Date | null = null;
          let fechaFin: Date | null = null;

          if (tipoServicio === 'S') {
            fechaInicio = parsearFecha(
              primerPasajero.fecha,
              primerPasajero.hora,
            );
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
            const { apellidos } = primerPasajero.conductor;
            conductorNombre = apellidos.trim();
          }

          const pasajeros: Pasajero[] = pasajerosDelGrupo.map(
            (apiPasajero) => ({
              id: apiPasajero.codigo,
              nombre: apiPasajero.nombre,
              distrito: apiPasajero.direccionPasajero.distrito,
              direccion: apiPasajero.direccionPasajero.direccion,
              fecha: `${apiPasajero.fecha} ${apiPasajero.hora}`,
              area: apiPasajero.empresa,
              codlan: apiPasajero.codlan,
              _apiData: apiPasajero,
            }),
          );

          const grupo: Grupo = {
            id: `grupo-${grupoKey}-${Date.now()}`,
            numero: Number(grupoKey) + 1,
            tipoSalida: tipoServicio === 'S' ? 'Salida' : 'Entrada',
            empresa: primerPasajero.empresa,
            destinocodigo: String(primerPasajero.destino.codlugar),
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

      console.log(
        `${gruposOrdenados.length} grupos creados con orden definido`,
      );
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
        const { apellidos } = primerPasajero.conductor;
        conductorNombre = apellidos.trim();
      }

      const pasajeros: Pasajero[] = data.map((apiPasajero) => ({
        id: apiPasajero.codigo,
        nombre: apiPasajero.nombre,
        distrito: apiPasajero.direccionPasajero.distrito,
        direccion: apiPasajero.direccionPasajero.direccion,
        fecha: `${apiPasajero.fecha} ${apiPasajero.hora}`,
        area: apiPasajero.empresa,
        codlan: apiPasajero.codlan,
        _apiData: apiPasajero,
      }));

      const grupoUnico: Grupo = {
        id: `grupo-1-${Date.now()}`,
        numero: 1,
        tipoSalida: tipoServicio === 'S' ? 'Salida' : 'Entrada',
        empresa: primerPasajero.empresa,
        destinocodigo: String(primerPasajero.destino.codlugar),
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

export const guardarGruposEnAPI = async (
  grupos: Grupo[],
  conductores: Array<{ codigo: string; apepate: string }>,
): Promise<boolean> => {
  try {
    const payload: any[] = [];

    grupos.forEach((grupo) => {
      let horaprog: string = '';
      if (grupo._tipoServicio === 'S' && grupo.fin) {
        horaprog = formatearFechaParaAPI(grupo.fin) || '';
      } else if (grupo._tipoServicio === 'I' && grupo.inicio) {
        horaprog = formatearFechaParaAPI(grupo.inicio) || '';
      }

      grupo.pasajeros.forEach((pasajero, index) => {
        if (!pasajero._apiData) {
          console.error(
            `Pasajero ${pasajero.nombre} (${pasajero.id}) no tiene _apiData`,
          );
          throw new Error(
            `El pasajero "${pasajero.nombre}" no tiene datos de la API. Esto puede ocurrir si fue restaurado incorrectamente.`,
          );
        }

        const apiData = pasajero._apiData;

        let codconductorEncontrado: string | null = null;
        if (grupo.conductor && grupo.conductor.trim() !== '') {
          const conductorEncontrado = conductores.find(
            (c) =>
              c.apepate.trim().toLowerCase() ===
              grupo.conductor.trim().toLowerCase(),
          );
          if (conductorEncontrado) {
            codconductorEncontrado = conductorEncontrado.codigo;
          }
        }

        const pasajeroPayload = {
          codigo: apiData.codigo,
          horaprog: horaprog,
          orden: String(index),
          grupo: String(grupo.numero - 1),
          codconductor:
            grupo.conductor && grupo.conductor.trim() !== ''
              ? codconductorEncontrado
              : null,
          codunidad:
            grupo.unidad && grupo.unidad.trim() !== '' ? grupo.unidad : null,
          destinocodigo: apiData.destino?.codlugar
            ? String(apiData.destino.codlugar)
            : null,
          destinocodlugar: String(apiData.direccionPasajero.codlugar),
        };

        payload.push(pasajeroPayload);
      });
    });

    console.log(
      'Payload enviando a la API (array directo):',
      JSON.stringify(payload, null, 2),
    );
    console.log(`Total de pasajeros a guardar: ${payload.length}`);

    const response = await fetch(
      'https://do.velsat.pe:2083/api/Talma/SavePreplanTalma',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
    );

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



export const publicarGruposEnAPI = async (
  grupos: Grupo[],
): Promise<{ success: boolean; gruposPublicados: number[]; gruposOmitidos: number[] }> => {
  try {
    const payload: any[] = [];
    const gruposConErrores: number[] = [];
    const gruposValidos: number[] = [];

    grupos.forEach((grupo) => {
      // Determinar la fecha del grupo según el tipo
      let fechaGrupo: string = '';
      if (grupo._tipoServicio === 'S' && grupo.inicio) {
        fechaGrupo = formatearFechaParaAPI(grupo.inicio) || '';
      } else if (grupo._tipoServicio === 'I' && grupo.fin) {
        fechaGrupo = formatearFechaParaAPI(grupo.fin) || '';
      }

      // Determinar la fecha de los subservicios (opuesta a la del grupo)
      let fechaSubservicios: string = '';
      if (grupo._tipoServicio === 'S' && grupo.fin) {
        fechaSubservicios = formatearFechaParaAPI(grupo.fin) || '';
      } else if (grupo._tipoServicio === 'I' && grupo.inicio) {
        fechaSubservicios = formatearFechaParaAPI(grupo.inicio) || '';
      }

      // VALIDACIÓN: Si fechaSubservicios está vacía, marcar grupo con error
      if (!fechaSubservicios || fechaSubservicios.trim() === '') {
        gruposConErrores.push(grupo.numero);
        return; // Saltar este grupo
      }

      // Si llegamos aquí, el grupo es válido
      gruposValidos.push(grupo.numero);

      const subservicios: any[] = [];

      // Primer subservicio (siempre el destino con orden 0)
      subservicios.push({
        codubicli: grupo.destinocodigo,
        fecha: fechaSubservicios,
        codcliente: grupo.destinocodigo,
        orden: '0',
        codigo: '0',
      });

      // Agregar los pasajeros del grupo (empiezan desde orden 1)
      grupo.pasajeros.forEach((pasajero, index) => {
        if (!pasajero._apiData) {
          console.error(
            `Pasajero ${pasajero.nombre} (${pasajero.id}) no tiene _apiData`,
          );
          throw new Error(
            `El pasajero "${pasajero.nombre}" no tiene datos de la API.`,
          );
        }

        const apiData = pasajero._apiData;

        subservicios.push({
          codubicli: String(apiData.direccionPasajero.codlugar),
          fecha: fechaSubservicios,
          codcliente: apiData.codcliente,
          orden: String(index + 1),
          codigo: apiData.codigo,
        });
      });

      // Agregar el grupo completo al payload
      payload.push({
        tipo: grupo._tipoServicio,
        codusuario: 'cgacela',
        fecha: fechaGrupo,
        subservicios: subservicios,
      });
    });

    // VALIDACIONES ANTES DE ENVIAR
    if (gruposConErrores.length > 0 && payload.length === 0) {
      // Todos los grupos tienen errores
      const mensajeGrupos = gruposConErrores.length === 1 
        ? `el Grupo ${gruposConErrores[0]}` 
        : `los Grupos ${gruposConErrores.join(', ')}`;
      throw new Error(`Rellena el campo fecha  en ${mensajeGrupos} para poder publicar.`);
    }

    if (payload.length === 0) {
      throw new Error('No hay grupos válidos para publicar.');
    }

    console.log('PAYLOAD COMPLETO:');
    console.log(JSON.stringify(payload, null, 2));

    const response = await fetch(
      'https://do.velsat.pe:2083/api/Talma/CreateServicios',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log('Respuesta de la API:', result);

    return { 
      success: true, 
      gruposPublicados: gruposValidos, 
      gruposOmitidos: gruposConErrores 
    };
  } catch (error) {
    console.error('Error al publicar grupos:', error);
    throw error;
  }
};