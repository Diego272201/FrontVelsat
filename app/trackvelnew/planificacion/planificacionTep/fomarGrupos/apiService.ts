import { API_BASE_URL125 } from '@/app/components/urlsApi/urlApi';
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
  apepate: string;

}

interface Unidad {
  codunidad: string;
}

interface Servicio {
  conductor: Conductor;
  unidad: Unidad;

}

interface DataItem {
  id: number;
  codcliente: string;
  codigo: string;
  nombre: string;
  fecha: string;
  horaprog: string;
  empresa: string;
  tipo: string;
  lugar: Lugar;
  servicio: Servicio;
  destinocodigo: string;
  nomdestino: string;
  orden: string;
  numero: string;
  eliminado:string;
  codconductor: string; 
}

interface Grupo {
  id: number;
  fecha: string;
  horaprog: string;
  tipo: string;
  empresa: string;
  destinoGrupo: string;
  personas: any[];
  destino: { coddestino: string; nomdestino: string };
  conductor: string ;
  unidad: string ;
  codConductor: string;
  coordenadas: { wx: string; wy: string }[];
}

export const obtenerDatosYAgrupar = async (
  empresa: string,
  dato: string
): Promise<Grupo[]> => {
  try {
    const url = `${API_BASE_URL125}/api/preplan/get?dato=${encodeURIComponent(
      dato
    )}&empresa=${encodeURIComponent(empresa)}&usuario=movilbus`;
    const response = await axios.get(url);
    const datos: DataItem[] = response.data;
    
    let grupos: Grupo[] = [];
    let gn = 1;

    if (dato === '1') {
      const gruposMap = new Map<string, Grupo>();
      
      datos.forEach((item) => {
        const numGrupo = item.numero;
        if (!gruposMap.has(numGrupo)) {
          gruposMap.set(numGrupo, {
            id: gn++,
            fecha: item.fecha,
            horaprog: item.horaprog,
            tipo: item.tipo,
            empresa: item.empresa,
            codConductor: item.codconductor,            
            destinoGrupo: item.nomdestino,
            personas: [],
            destino: {
              coddestino: item.destinocodigo,
              nomdestino: item.nomdestino,
            },
            conductor: item.servicio.conductor.apepate ,
            unidad: item.servicio.unidad.codunidad,
            coordenadas: [], 
          });
        }
        gruposMap.get(numGrupo)?.personas.push({
          idCliente: item.id,
          codCliente: item.codcliente,
          codigo: item.codigo,
          nombre: item.nombre,
          direccion: item.lugar.direccion,
          distrito: item.lugar.distrito,
          wx: item.lugar.wx,
          wy: item.lugar.wy,
          fechaItem: item.fecha,
          area: item.empresa,
          eliminado:item.eliminado,
          orden: parseInt(item.orden, 10),
        });
        gruposMap.get(numGrupo)?.coordenadas.push({
          wx: item.lugar.wx,
          wy: item.lugar.wy,
        });
      });
      
      grupos = Array.from(gruposMap.values()).map((grupo) => ({
        ...grupo,
        personas: grupo.personas.sort((a, b) => a.orden - b.orden),
      }));
    } else {
      while (datos.length >= 1) {
        const item = datos[0];
        const grupo: Grupo = {
          id: gn,
          fecha: item.fecha,
          horaprog: item.horaprog,
          tipo: item.tipo,
          empresa: item.empresa,
          codConductor: item.codconductor,
          destinoGrupo: item.nomdestino,
          personas: [],
          destino: {
            coddestino: item.destinocodigo,
            nomdestino: item.nomdestino,
          },
          conductor: item.servicio.conductor.apepate ,
          unidad: item.servicio.unidad.codunidad,
          coordenadas: [], 
        };
        let it = 0;
        while (it < datos.length) {
          const currentItem = datos[it];
          if (
            currentItem.fecha === item.fecha &&
            currentItem.tipo === item.tipo &&
            currentItem.destinocodigo === item.destinocodigo
          ) {
            grupo.personas.push({
              idCliente: currentItem.id,
              codCliente: currentItem.codcliente,
              codigo: currentItem.codigo,
              nombre: currentItem.nombre,
              direccion: currentItem.lugar.direccion,
              distrito: currentItem.lugar.distrito,
              fechaItem: currentItem.fecha,
              eliminado:item.eliminado,
              area: currentItem.empresa,
            });
            grupo.coordenadas.push({
              wx: currentItem.lugar.wx,
              wy: currentItem.lugar.wy,
            });

            datos.splice(it, 1);
          } else {
            it++;
          }
        }
        grupos.push(grupo);
        gn++;
      }
    }
    return grupos;
  } catch (error) {
    console.error('Error al obtener los datos:', error);
    return [];
  }
};