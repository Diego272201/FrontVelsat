import { API_BASE_URL125 } from "@/app/components/urlsApi/urlApi"
import axios from "axios"

interface Lugar {
  codlugar: number
  direccion: string
  distrito: string
  wx: string
  wy: string
  zona: string
}

interface Conductor {
  codigo: number
  nombre: string | null
  apepate: string
}

interface Unidad {
  codunidad: string
}

interface Servicio {
  conductor: Conductor
  unidad: Unidad
}

interface DataItem {
  id: number
  codcliente: string
  codigo: string
  nombre: string
  fecha: string
  horaprog: string
  empresa: string
  tipo: string
  lugar: Lugar
  servicio: Servicio
  destinocodigo: string
  nomdestino: string
  orden: string | null
  numero: string | null
  eliminado: string
  codconductor: string
}

interface Grupo {
  id: number
  fecha: string
  horaprog: string
  tipo: string
  empresa: string
  destinoGrupo: string
  personas: any[]
  destino: { coddestino: string; nomdestino: string }
  conductor: string
  unidad: string
  codConductor: string
  coordenadas: { wx: string; wy: string }[]
}

export const obtenerDatosYAgrupar = async (empresa: string, dato: string, username: string,): Promise<Grupo[]> => {
  try {
    const url = `${API_BASE_URL125}/api/preplan/get?dato=${encodeURIComponent(
      dato,
    )}&empresa=${encodeURIComponent(empresa)}&usuario=${username}`
    const response = await axios.get(url)
    const datos: DataItem[] = response.data

    const grupos: Grupo[] = []
    let gn = 1

    if (dato === "1") {
      // Separar datos que ya tienen orden/número de los que no
      const datosConOrden = datos.filter(
        (item) => item.orden !== null && item.numero !== null && item.orden !== "" && item.numero !== "",
      )
      const datosSinOrden = datos.filter(
        (item) => item.orden === null || item.numero === null || item.orden === "" || item.numero === "",
      )

      console.log("[v0] Datos con orden:", datosConOrden.length)
      console.log("[v0] Datos sin orden:", datosSinOrden.length)

      // PASO 1: Procesar datos que ya tienen orden y número (lógica original del Dato 1)
      if (datosConOrden.length > 0) {
        const gruposConOrdenMap = new Map<string, Grupo>()

        datosConOrden.forEach((item) => {
          const numGrupo = item.numero!
          if (!gruposConOrdenMap.has(numGrupo)) {
            gruposConOrdenMap.set(numGrupo, {
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
              conductor: item.servicio.conductor.apepate || "",
              unidad: item.servicio.unidad.codunidad || "",
              coordenadas: [],
            })
          }

          gruposConOrdenMap.get(numGrupo)?.personas.push({
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
            eliminado: item.eliminado,
            orden: Number.parseInt(item.orden!, 10),
          })

          gruposConOrdenMap.get(numGrupo)?.coordenadas.push({
            wx: item.lugar.wx,
            wy: item.lugar.wy,
          })
        })

        // Agregar grupos con orden, ordenando personas por orden
        const gruposConOrden = Array.from(gruposConOrdenMap.values()).map((grupo) => ({
          ...grupo,
          personas: grupo.personas.sort((a, b) => a.orden - b.orden),
        }))

        grupos.push(...gruposConOrden)
      }

      // PASO 2: Procesar datos sin orden usando lógica del Dato 2
      if (datosSinOrden.length > 0) {
        const datosSinOrdenCopia = [...datosSinOrden]
        let ordenCounter = 0

        while (datosSinOrdenCopia.length >= 1) {
          const item = datosSinOrdenCopia[0]
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
              coddestino: item.destinocodigo || "",
              nomdestino: item.nomdestino,
            },
            conductor: item.servicio.conductor.apepate || "",
            unidad: item.servicio.unidad.codunidad || "",
            coordenadas: [],
          }

          let it = 0
          ordenCounter = 0 // Reiniciar contador de orden para cada grupo nuevo

          while (it < datosSinOrdenCopia.length) {
            const currentItem = datosSinOrdenCopia[it]

            // Agrupar por fecha, tipo y destino (lógica del Dato 2)
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
                eliminado: currentItem.eliminado,
                area: currentItem.empresa,
                wx: currentItem.lugar.wx,
                wy: currentItem.lugar.wy,
                orden: ordenCounter++, // Asignar orden secuencial
              })

              grupo.coordenadas.push({
                wx: currentItem.lugar.wx,
                wy: currentItem.lugar.wy,
              })

              datosSinOrdenCopia.splice(it, 1)
            } else {
              it++
            }
          }

          grupos.push(grupo)
          gn++
        }
      }
    } else {
      // Lógica original para Dato 2 (sin cambios)
      while (datos.length >= 1) {
        const item = datos[0]
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
            coddestino: item.destinocodigo || "",
            nomdestino: item.nomdestino,
          },
          conductor: item.servicio.conductor.apepate || "",
          unidad: item.servicio.unidad.codunidad || "",
          coordenadas: [],
        }

        let it = 0
        while (it < datos.length) {
          const currentItem = datos[it]
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
              eliminado: currentItem.eliminado,
              area: currentItem.empresa,
              wx: currentItem.lugar.wx,
              wy: currentItem.lugar.wy,
            })

            grupo.coordenadas.push({
              wx: currentItem.lugar.wx,
              wy: currentItem.lugar.wy,
            })

            datos.splice(it, 1)
          } else {
            it++
          }
        }
        grupos.push(grupo)
        gn++
      }
    }

    console.log("[v0] Grupos generados:", grupos.length)
    return grupos
  } catch (error) {
    console.error("Error al obtener los datos:", error)
    return []
  }
}