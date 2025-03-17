import React, { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { MdAddBox } from "react-icons/md";

import Container from './container';
import { Item } from './sortable_item';
import { obtenerDatosYAgrupar } from './fomarGrupos/apiService';
import GrupoEliminados from './GrupoEliminados';
import { Button, Spinner } from '@nextui-org/react';
import { MdDelete } from 'react-icons/md';
import { MdOutlineAdd } from 'react-icons/md';
import { TbGps } from 'react-icons/tb';
import axios from 'axios';
import ModalDirecciones from './ModalDirecciones';

const wrapperStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
};

interface ServiciosProps {
  empresa: string;
  dato: string;
  onGuardar?: (fn: () => void) => void; 
  onActualizarDatos?: (datos: { totalGrupos: number; totalPasajeros: number }) => void;
  onActualizarCabeceras?: (cabeceras: { empresa: string; fecha: string }[]) => void; 
  filtro?: { empresa: string; fecha: string } | null;
  nombrePasajero?:string;
  onActualizarFechas?: (fechas: { totalFechas: number; fechasLlenas: number }) => void;
  modoVista: string; 
}

export default function App({ empresa, dato,onGuardar,onActualizarDatos,onActualizarCabeceras,filtro,nombrePasajero="", onActualizarFechas, modoVista}: ServiciosProps) {
  const [grupos, setGrupos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [shouldRefetch, setShouldRefetch] = useState(false);

  const [conductores, setConductores] = useState<{ [grupoId: number]: number }>({}); // Ahora guarda números

  const [unidades, setUnidades] = useState<{ [grupoId: number]: string }>({});

  const handleUpdateConductor = (id: number, codigoConductor: number) => {
    setConductores((prev) => {
      console.log("Actualizando conductor:", { ...prev, [id]: codigoConductor });
      return { ...prev, [id]: codigoConductor };
    });
  };

  const handleUpdateUnidad = (id: number, codigoUnidad: string) => {
    setUnidades((prev) => {
      console.log("Actualizando unidad:", { ...prev, [id]: codigoUnidad });
      return { ...prev, [id]: codigoUnidad };
    });
  };
  
  useEffect(() => {
    console.log("Estado de unidades actualizado:", unidades);
  }, [unidades]);
  
  
  useEffect(() => {
    console.log("Estado de conductores actualizado:", conductores);
  }, [conductores]);
  
  



  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const groupedData = await obtenerDatosYAgrupar(empresa, dato);

      const nuevosGrupos = groupedData.map((grupo) => ({
        ...grupo,
        personas: grupo.personas.filter((persona: any) => persona.eliminado === "0"),
      }));

      const nuevosEliminados = groupedData.flatMap((grupo) =>
        grupo.personas
          .filter((persona: any) => persona.eliminado === "1")
          .map((persona: any) => ({
            ...persona,
            numGrupo: grupo.id, 
            ordenOriginal: persona.idCliente,
          }))
      );

      setGrupos(nuevosGrupos);
      setEliminados(nuevosEliminados);      
      setLoading(false);


      if (onActualizarDatos) {
        onActualizarDatos({
          totalGrupos: groupedData.length,
          totalPasajeros: groupedData.reduce((acc, grupo) => acc + (grupo.personas?.length || 0), 0),
        });
      }

      if (onActualizarCabeceras) {
        const cabeceras = groupedData.map((grupo) => ({
          empresa: grupo.empresa,
          fecha: grupo.fecha,
        }));
        onActualizarCabeceras(cabeceras);
      }

      const totalFechas = nuevosGrupos.length * 2;
      const fechasLlenas = nuevosGrupos.reduce((count, grupo) => {
        if (grupo.fecha) count++;
        if (grupo.horaprog) count++;
        return count;
      }, 0);

      if (onActualizarFechas) {
        onActualizarFechas({ totalFechas, fechasLlenas });
      }

      setShouldRefetch(false); 
    };

      fetchData();
    
  }, [empresa,shouldRefetch]);


  
  useEffect(() => {
    console.log(grupos);
  });


  useEffect(() => {
    if (grupos.length > 0 && onActualizarFechas) {
      const totalFechas = grupos.length * 2;
      const fechasLlenas = grupos.reduce((count, grupo) => {
        if (grupo.fecha) count++;
        if (grupo.horaprog) count++;
        return count;
      }, 0);
  
      onActualizarFechas({ totalFechas, fechasLlenas });
    }
  }, [grupos]); 
  


  const handleUpdateGrupo = (id: number, nuevaFecha: string) => {


    console.log(`Actualizando grupo ID: ${id}, Nueva fecha: ${nuevaFecha}`);
    setGrupos((prevGrupos) =>
      prevGrupos.map((grupo) =>
        grupo.id === id ? { ...grupo, horaprog: nuevaFecha } : grupo
      )
    );
  };
  

  
  const parseFechaHora = (fechaStr: string) => {
    if (!fechaStr) return ""; 
    const [dia, mes, año] = fechaStr.split(" ")[0].split("/");
    const hora = fechaStr.split(" ")[1];
    return `${año}-${mes}-${dia} ${hora}`; 
  };
  
  const parseFechaHoraFiltro = (filtroFecha: string) => {
    if (!filtroFecha) return ""; 
  
    const [dia, mes, año] = filtroFecha.split(" ")[0].split("/");
    const hora = filtroFecha.split(" ")[1];
    return `${año}-${mes}-${dia} ${hora}`; 
  };
  
  const gruposFiltrados = useMemo(() => {
    if (!filtro?.fecha && !nombrePasajero.trim()) return grupos;
  
    const filtroFechaHora = filtro?.fecha ? parseFechaHoraFiltro(filtro.fecha) : null;
  
    return grupos.filter((grupo) => {
      const fechaHoraGrupo = parseFechaHora(grupo.fecha);
      const coincideFecha = filtroFechaHora ? fechaHoraGrupo === filtroFechaHora : true;
  
      // Normalizamos nombrePasajero eliminando espacios extra y convirtiendo a minúsculas
      const nombreBuscado = nombrePasajero.trim().toLowerCase();
  
      const coincidePasajero = !nombreBuscado
        ? true
        : grupo.personas.some((persona: any) =>
            persona.nombre.trim().toLowerCase().includes(nombreBuscado)
          );
  
      return coincideFecha && coincidePasajero;
    });
  }, [grupos, filtro, nombrePasajero]);
  

  useEffect(() => {
    console.log("Texto ingresado en búsqueda:", nombrePasajero);
  }, [nombrePasajero]);
  
  useEffect(() => {
    console.log("Fecha y hora filtro:", filtro?.fecha);
    console.log("Grupos filtrados:", gruposFiltrados);
  }, [gruposFiltrados]);
  
 
  const [items, setItems] = useState<
    Record<
      string,
      {
        id: string;
        numGrupo: number;
        orderItem: number;
        nombre: string;
        distrito: string;
        direccion: string;
        fechaItem: string;
        area: string;
        acciones: React.ReactNode;
      }[]
    >
  >({});

  useEffect(() => {
    if (gruposFiltrados.length > 0) { 
      const nuevoItems = gruposFiltrados.reduce((acc, grupo, index) => {
        if (grupo.personas && grupo.personas.length > 0) {
          acc[`container${index}`] = grupo.personas.map((persona:any, idx:any) => {
            // console.log(`Procesando persona ${persona.nombre} en grupo ${grupo.id}`);
            return {
              id: String(persona.idCliente),
              orderItem: idx + 1,
              nombre: persona.nombre,
              distrito: persona.distrito,
              direccion: persona.direccion,
              fechaItem: grupo.fecha,
              area: persona.area,
              numGrupo: grupo.id,
              tipo: grupo.tipo,
              destino: grupo.destinoGrupo,
              empresa: grupo.empresa,
              fecha: grupo.fecha,
              horaprog: grupo.horaprog,
              acciones: (
                <div className="accionesItems">
                  <Button
                    color="success"
                    size="sm"
                    onClick={() => handleMoverAGrupoNuevo(Number(persona.idCliente))}
                  >
                    
                    <MdAddBox  size={16} color='#343a40'/>
                  </Button>
  
                  <Button
                    color="danger"
                    size="sm"
                    onClick={() => handleEliminarDelArray(Number(persona.idCliente))}
                  >
                    
                    <MdDelete size={16}/>
                  </Button>
  
              

                  <ModalDirecciones codCliente={persona.codCliente} nombrePasajero={persona.nombre} codigo={persona.codigo} setShouldRefetch={setShouldRefetch}/>


                </div>
              ),
            };
          });
        }
        return acc;
      }, {});
      setItems(nuevoItems); 
    }
  }, [grupos, gruposFiltrados]); 


  const [eliminados, setEliminados] = useState<any[]>([]);

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function findContainer(id: string) {
    if (id in items) {
      return id;
    }

    return Object.keys(items).find((key) =>
      items[key].some((item) => item.id === id),
    );
  }

  function handleDragStart(event: any) {
    const { active } = event;
    setActiveId(active.id);
  }

  function handleDragOver(event: any) {
    const { active, over } = event;
    const { id } = active;
    if (!over) {
      return;
    }
    const { id: overId } = over;

    const activeContainer = findContainer(id);
    const overContainer = findContainer(overId);

    if (
      !activeContainer ||
      !overContainer ||
      activeContainer === overContainer
    ) {
      return;
    }

    setItems((prev) => {
      const activeItems = prev[activeContainer];
      const overItems = prev[overContainer];

      const activeIndex = activeItems.findIndex((item) => item.id === id);
      const overIndex = overItems.findIndex((item) => item.id === overId);

      const newItem = activeItems[activeIndex];
      const newIndex = overIndex >= 0 ? overIndex + 1 : overItems.length;

      return {
        ...prev,
        [activeContainer]: activeItems.filter((item) => item.id !== id),
        [overContainer]: [
          ...overItems.slice(0, newIndex),
          newItem,
          ...overItems.slice(newIndex),
        ],
      };
    });
  }


  function handleDragEnd(event: any) {
    const { active, over } = event;
    if (!over) {
      setActiveId(null);
      return;
    }
  
    const activeId = active.id;
    const overId = over.id;
  
    if (overId === 'grupo-eliminados') {
      handleEliminarDelArray(Number(activeId));
      setActiveId(null);
      return;
    }

  


    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);


  
    if (!activeContainer || !overContainer) {
      setActiveId(null);
      return;
    }
  
    let activeIndex = items[activeContainer]?.findIndex(
      (item) => item.id === activeId
    );
    let overIndex = items[overContainer]?.findIndex(
      (item) => item.id === overId
    );

    const encontrarGrupoPorCliente = (idCliente: number) => {
      return grupos.findIndex((grupo) =>
        grupo.personas.some((persona:any) => persona.idCliente === idCliente)
      );
    };
    
    // Ejemplo de uso:
    const indiceGrupo = encontrarGrupoPorCliente(Number(activeId));
    
    const overContainerIndex = Number(overContainer.replace(/\D/g, ''));
    const activeContainerIndex = Number(activeContainer.replace(/\D/g, '')); 
      console.log(`Moviendo el item ${activeId} del grupo ${indiceGrupo} al grupo ${overContainerIndex}`);


 if(indiceGrupo === overContainerIndex){
  intercambiarClientes(activeContainerIndex, activeIndex, overIndex);
 }else{
  moverClienteOtroGrupo(Number(activeId), indiceGrupo, overContainerIndex, overIndex ?? 0);

 }
  
    

    setActiveId(null);
  }
  
  const intercambiarClientes = (grupoIndex: number, activeIndex: number, overIndex: number) => {
    setGrupos((prevGrupos) => {
      if (grupoIndex < 0 || grupoIndex >= prevGrupos.length) {
        console.error(`Error: grupoIndex fuera de rango (${grupoIndex})`);
        return prevGrupos;
      }
  
      let nuevosGrupos = [...prevGrupos];
      let personasGrupo = [...nuevosGrupos[grupoIndex].personas];
  
      if (activeIndex < 0 || activeIndex >= personasGrupo.length || overIndex < 0 || overIndex >= personasGrupo.length) {
        console.error(`Error: Índices fuera de rango en grupo ${grupoIndex}`, { activeIndex, overIndex });
        return prevGrupos;
      }
  
      // 🔹 Mover el elemento sin perder datos
      const [movedItem] = personasGrupo.splice(activeIndex, 1);
      personasGrupo.splice(overIndex, 0, movedItem);
  
      // 🔹 Reasignar idCliente en orden
      personasGrupo = personasGrupo.map((persona, index) => ({
        ...persona,
        idCliente: index + 1, // Ahora el primer elemento tendrá idCliente = 1, el segundo = 2, etc.
      }));
  
      nuevosGrupos[grupoIndex] = {
        ...nuevosGrupos[grupoIndex],
        personas: personasGrupo,
      };
  
      console.log('Nuevo estado de grupos:', nuevosGrupos);
      return nuevosGrupos;
    });
  };
  
  const moverClienteOtroGrupo = (
    idCliente: number,
    origenIndex: number,
    destinoIndex: number,
    overIndex: number
  ) => {
    setGrupos((prevGrupos) => {
      let nuevosGrupos = JSON.parse(JSON.stringify(prevGrupos)); // 🔹 Clonamos para evitar mutaciones
  
      // 🔹 Encontrar el grupo de origen y el cliente a mover
      const grupoOrigen = nuevosGrupos[origenIndex];
      const grupoDestino = nuevosGrupos[destinoIndex];
  
      const clienteMovidoIndex = grupoOrigen.personas.findIndex(
        (persona: any) => persona.idCliente === idCliente
      );
  
      if (clienteMovidoIndex === -1) return prevGrupos; // Si no se encuentra, retornamos el estado actual
  
      // 🔹 Remover al cliente del grupo de origen
      const [clienteMovido] = grupoOrigen.personas.splice(clienteMovidoIndex, 1);
  
      // 🔹 Insertar el cliente en el grupo de destino en la posición correcta
      if (overIndex >= grupoDestino.personas.length) {
        grupoDestino.personas.push(clienteMovido);
      } else {
        grupoDestino.personas.splice(overIndex, 0, clienteMovido);
      }
  
      return nuevosGrupos;
    });
  
    // 🔹 Después de mover el cliente, reasignamos los `idCliente`
    setTimeout(() => {
      setGrupos((prevGrupos) => {
        let idCounter = 1;
        const nuevosGrupos = prevGrupos.map((grupo) => ({
          ...grupo,
          personas: grupo.personas.map((persona:any) => ({
            ...persona,
            idCliente: idCounter++, // 🔹 Se asigna en orden sin afectar el movimiento
          })),
        }));
  
        console.log("Nuevo estado de grupos:", nuevosGrupos); // ✅ Agregado aquí
  
        return nuevosGrupos;
      });
    }, 0); // 🔹 Se ejecuta después del `setState` para evitar problemas con el estado anterior
  };
  
  
  const handleMoverAGrupoNuevo = (idCliente: number) => {
    setGrupos((prevGrupos) => {
      let nuevosGrupos = [...prevGrupos];
  
      // Encontrar el índice del grupo origen
      let grupoOrigenIndex = nuevosGrupos.findIndex((grupo) =>
        grupo.personas.some((persona: any) => persona.idCliente === idCliente)
      );
  
      if (grupoOrigenIndex !== -1) {
        let clienteMovido = nuevosGrupos[grupoOrigenIndex].personas.find(
          (persona: any) => persona.idCliente === idCliente
        );
  
        if (clienteMovido) {
          const grupoOrigen = nuevosGrupos[grupoOrigenIndex];
  
          // Eliminar el cliente del grupo de origen
          nuevosGrupos[grupoOrigenIndex].personas = nuevosGrupos[
            grupoOrigenIndex
          ].personas.filter((persona: any) => persona.idCliente !== idCliente);
  
          // Crear un nuevo grupo en la siguiente posición
          const nuevoGrupo = {
            id: grupoOrigen.id + 1, // ID consecutivo
            destinoGrupo: grupoOrigen.destinoGrupo,
            empresa: grupoOrigen.empresa,
            fecha: grupoOrigen.fecha,
            tipo: grupoOrigen.tipo,
            horaprog: grupoOrigen.horaprog,
            personas: [clienteMovido],
          };
  
          // Insertar el nuevo grupo después del grupo de origen
          nuevosGrupos.splice(grupoOrigenIndex + 1, 0, nuevoGrupo);
  
          // Desplazar los IDs de los grupos siguientes
          for (let i = grupoOrigenIndex + 2; i < nuevosGrupos.length; i++) {
            nuevosGrupos[i].id += 1;
          }
        }
      }
  
      console.log('Nuevo estado de grupos:', nuevosGrupos);
      return nuevosGrupos;
    });
  };
  

  const handleEliminarDelArray = (idCliente: number) => {
    setGrupos((prevGrupos) => {
      let nuevosGrupos = [...prevGrupos];

      let grupoOrigenIndex = nuevosGrupos.findIndex((grupo) =>
        grupo.personas.some((persona: any) => persona.idCliente === idCliente),
      );

      if (grupoOrigenIndex !== -1) {
        let clienteEliminado = nuevosGrupos[grupoOrigenIndex].personas.find(
          (persona: any) => persona.idCliente === idCliente,
        );

        if (clienteEliminado) {
          // Agregar el número del grupo antes de eliminarlo
          clienteEliminado = {
            ...clienteEliminado,
            numGrupo: nuevosGrupos[grupoOrigenIndex].id,
            ordenOriginal: idCliente,

          };

          // Remover del grupo
          nuevosGrupos[grupoOrigenIndex].personas = nuevosGrupos[
            grupoOrigenIndex
          ].personas.filter((persona: any) => persona.idCliente !== idCliente);

          // Guardar en eliminados con su numGrupo
          setEliminados((prevEliminados) => {
            const nuevosEliminados = [...prevEliminados, clienteEliminado];

            console.log(
              `Cliente eliminado:`,
              clienteEliminado,
              `\nViene del grupo:`,
              clienteEliminado.numGrupo,
              `\nNuevo estado de eliminados:`,
              nuevosEliminados,
            );

            return nuevosEliminados;
          });
        }
      }

      return nuevosGrupos;
    });
  };

    
  const handleGuardar = async (data: any[], eliminados: any[],conductoresActualizados: any, unidadesActualizadas: any ) => {
    const dataToSend = [
      // Datos de los grupos (no eliminados)
      ...data.flatMap((grupo, grupoIndex) => {
        if (!grupo.personas || grupo.personas.length === 0) return [];

        const codConductor = conductores[grupo.id] ?? grupo.codConductor ?? 0;
        const codConductorStr = String(codConductor);

        const codUnidad = unidades[grupo.id] ?? grupo.unidad ?? "";
        return grupo.personas.map((persona: any, personaIndex: any) => ({
          codigo: Number(persona.codigo) || 0,
          horaprog: String(grupo.horaprog),
          orden: String(persona.idCliente-1),
          numero: String(grupoIndex),
          eliminado: "0", // No está eliminado
          codconductor: codConductorStr,  
          codunidad: codUnidad,
          codtarifa: "",
          destinocodigo: "",
        }));
      }),
  
      // Datos de los eliminados
      ...eliminados.map((personaEliminada: any) => ({
        codigo: Number(personaEliminada.codigo) || 0,
        horaprog: String(personaEliminada.fechaItem),
        orden: String(personaEliminada.ordenOriginal-1),
        numero: String(personaEliminada.numGrupo-1),
        eliminado: "1", 
        codconductor: "0",
        codunidad: "",
        codtarifa: "",
        destinocodigo: "",
      })),
    ];
  
    console.log("Datos a enviar:", JSON.stringify(dataToSend, null, 2));
  
    if (dataToSend.length === 0) {
      console.warn("No hay datos válidos para enviar a la API.");
      return;
    }
  
    try {
      const response = await axios.put(
        "http://66.240.210.125:8586/api/Preplan/save?usuario=movilbus",
        dataToSend,
        { headers: { "Content-Type": "application/json" } }
      );
  
      console.log("Respuesta de la API:", response.data);
    } catch (error) {
      console.error("Error al guardar los datos:", error);
    }
  };
  
  
  useEffect(() => {
    if (onGuardar) {
      onGuardar(() => () => handleGuardar(grupos, eliminados, conductores,unidades));
    }
  }, [grupos, eliminados,conductores,unidades]); 
  
  

  const handleRestore = (item: any) => {
    setEliminados((prevEliminados) =>
      prevEliminados.filter(
        (eliminado) => eliminado.idCliente !== item.idCliente,
      ),
    );

    setGrupos((prevGrupos) => {
      let nuevosGrupos = [...prevGrupos];

      let grupoOriginalIndex = nuevosGrupos.findIndex(
        (grupo) => Number(grupo.id) === Number(item.numGrupo),
      );

      if (grupoOriginalIndex !== -1) {
        let existeEnGrupo = nuevosGrupos[grupoOriginalIndex].personas.some(
          (persona: any) => persona.idCliente === item.idCliente,
        );

        if (!existeEnGrupo) {
          nuevosGrupos[grupoOriginalIndex].personas.push(item);
          console.log(
            `Item restaurado:`,
            item,
            `\nRestaurado al grupo:`,
            nuevosGrupos[grupoOriginalIndex].id,
          );
        } else {
          console.warn('El cliente ya está en el grupo, evitando duplicados.');
        }
      } else {
        console.warn(
          'Grupo original no encontrado. No se restauró correctamente.',
        );
        console.log('Estado actual de grupos:', nuevosGrupos);
        console.log('Buscando grupo con ID:', item.numGrupo);
      }

      return nuevosGrupos;
    });
  };

  return (
    <div style={wrapperStyle}>
      {loading ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
          }}
        >
          <Spinner color="primary" size="lg" />
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={rectIntersection}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >


      {modoVista === "Eliminados" ? (
            <>
              {gruposFiltrados.length > 0 &&
                Object.keys(items).map((key, index) =>
                  gruposFiltrados[index] ? (
                    <Container
                      key={key}
                      id={key}
                      items={items[key] || []}
                      grupo={gruposFiltrados[index]}
                      conductorCodigo={gruposFiltrados[index]?.conductor || ""}
                      unidadCodigo={gruposFiltrados[index]?.unidad || ""}
                      onUpdateGrupo={(id: number, nuevaFecha: string) => handleUpdateGrupo(id, nuevaFecha)}
                      onUpdateConductor={handleUpdateConductor}
                      onUpdateUnidad={handleUpdateUnidad}
                    />
                  ) : null,
                )}
              <div>
                <GrupoEliminados items={eliminados} onRestore={handleRestore} />
              </div>
            </>
          ) : (
            <div>
              <GrupoEliminados items={eliminados} onRestore={handleRestore} />
            </div>
          )}

          <DragOverlay>
            {activeId
              ? (() => {
                  const container = findContainer(activeId);
                  if (!container) return null;
                  const item = items[container]?.find(
                    (item) => item.id === activeId,
                  );
                  return item ? <Item {...item} /> : null;
                })()
              : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
