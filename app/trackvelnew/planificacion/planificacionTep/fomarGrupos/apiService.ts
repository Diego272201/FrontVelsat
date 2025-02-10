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
  destinoGrupo: string;
  personas: any[];
  destino: { coddestino: string; nomdestino: string };
  fecfin: string | null;
  fecaten: string | null;
}

export const obtenerDatosYAgrupar = async (empresa: string, dato:string): Promise<Grupo[]> => {
  try {
    const url = `http://66.240.210.125:8586/api/preplan/get?dato=${encodeURIComponent(dato)}&empresa=${encodeURIComponent(empresa)}&usuario=movilbus`;

    
    const response = await axios.get(url);


    const datos = response.data;

    let grupos: Grupo[] = [];
    let gn = 1;

    while (datos.length >= 1) {
      const item = datos[0];
      const fecha = item.fecha;
      const tipo = item.tipo;
      const numgrupo = item.destino;
      const empresa = item.empresa;
      const destinoGrupo = item.nomdestino;
      const grupo: Grupo = {
        id: gn,
        fecha: fecha,
        tipo: tipo,
        empresa: empresa,
        destinoGrupo: destinoGrupo,
        personas: [],
        destino: {
          coddestino: item.destino,
          nomdestino: item.nomdestino,
        },
        fecfin: null,
        fecaten: null,
      };

      let it = 0;

      while (it < datos.length) {
        const currentItem = datos[it];

        if (
          currentItem.fecha === fecha &&
          currentItem.tipo === tipo &&
          currentItem.destino === numgrupo
        ) {
          const persona = {
            idCliente: currentItem.id,
            codCliente: currentItem.codcliente,
            nombre: currentItem.nombre,
            direccion: currentItem.lugar.direccion,
            distrito: currentItem.lugar.distrito,
            fechaItem:currentItem.horaprog,
            area:currentItem.area,

          };

          grupo.personas.push(persona);

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
