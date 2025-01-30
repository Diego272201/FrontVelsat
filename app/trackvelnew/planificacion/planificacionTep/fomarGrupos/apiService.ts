// services/apiService.ts
import axios from 'axios';

interface Lugar {
  codlugar: number;
  direccion: string;
  distrito: string;
  wx: string;
  wy: string;
  zona: string;
}

interface Conductor {
  codigo: number;
  nombre: string | null;
}

interface Servicio {
  conductor: Conductor;
}

interface DataItem {
  codcliente: string;
  nombre: string;
  tipo: string;
  fecha: string;
  fecreg: string;
  empresa: string;
  destino: string;
  lugar: Lugar;
  servicio: Servicio;
  eliminado: string;
}

interface Grupo {
  id: number;
  fecha: string;
  tipo: string;
  empresa: string;
  personas: any[];
  destino: { coddestino: string; nomdestino: string };
  fecfin: string | null;
  fecaten: string | null;
}

export const obtenerDatosYAgrupar = async (): Promise<Grupo[]> => {
  try {
    const response = await axios.get(
      'http://66.240.210.125:8586/api/preplan/get?dato=2&empresa=AMERICAN%20TIERRA&usuario=movilbus'
    );
    const datos = response.data; // Aquí se reciben los datos de la API

    let grupos: Grupo[] = [];
    let gn = 0;

    while (datos.length >= 1) {
      const item = datos[0];
      const fecha = item.fecha;
      const tipo = item.tipo;
      const numgrupo = item.destino;
      const empresa = item.empresa;
      const grupo: Grupo = {
        id: gn,
        fecha: fecha,
        tipo: tipo,
        empresa: empresa,
        personas: [],
        destino: {
          coddestino: item.destino,
          nomdestino: item.destinocodigo,
        },
        fecfin: null,
        fecaten: null,
      };

      let it = 0;

      // Agrupar por fecha, tipo y destino
      while (it < datos.length) {
        const currentItem = datos[it];

        if (
          currentItem.fecha === fecha &&
          currentItem.tipo === tipo &&
          currentItem.destino === numgrupo
        ) {
          const persona = {
            nombre: currentItem.nombre,
            direccion: currentItem.lugar.direccion,
            distrito: currentItem.lugar.distrito,
            zona: currentItem.lugar.zona,
            lat: currentItem.lugar.wy,
            lng: currentItem.lugar.wx,
          };

          grupo.personas.push(persona);

          // Eliminar el item procesado de la lista
          datos.splice(it, 1);
        } else {
          it++;
        }
      }

      grupos.push(grupo);
      gn++;
    }

    return grupos;
  } catch (error) {
    console.error('Error al obtener los datos:', error);
    return [];
  }
};
