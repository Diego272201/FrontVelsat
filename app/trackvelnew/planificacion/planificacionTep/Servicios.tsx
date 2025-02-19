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

import Container from './container';
import { Item } from './sortable_item';
import { obtenerDatosYAgrupar } from './fomarGrupos/apiService';
import GrupoEliminados from './GrupoEliminados';
import { Button, Spinner } from '@nextui-org/react';
import { MdDelete } from 'react-icons/md';
import { MdOutlineAdd } from 'react-icons/md';
import { TbGps } from 'react-icons/tb';
import axios from 'axios';

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
}

export default function App({ empresa, dato,onGuardar,onActualizarDatos,onActualizarCabeceras,filtro   }: ServiciosProps) {
  const [grupos, setGrupos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const groupedData = await obtenerDatosYAgrupar(empresa, dato);
      setGrupos(groupedData);
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


    };

    fetchData();
  }, [empresa]);

  useEffect(() => {
    console.log(grupos);
  });

  
  const parseFechaHora = (fechaStr: string) => {
    if (!fechaStr) return ""; // Manejo de errores
    // Convierte la fecha a formato "YYYY-MM-DD HH:mm"
    const [dia, mes, año] = fechaStr.split(" ")[0].split("/");
    const hora = fechaStr.split(" ")[1];
    return `${año}-${mes}-${dia} ${hora}`; // Formato "YYYY-MM-DD HH:mm"
  };
  
  const parseFechaHoraFiltro = (filtroFecha: string) => {
    if (!filtroFecha) return ""; // Manejo de errores
    // Convierte el filtro de fecha y hora de "DD/MM/YYYY HH:mm" a "YYYY-MM-DD HH:mm"
    const [dia, mes, año] = filtroFecha.split(" ")[0].split("/");
    const hora = filtroFecha.split(" ")[1];
    return `${año}-${mes}-${dia} ${hora}`; // Formato "YYYY-MM-DD HH:mm"
  };
  
  const gruposFiltrados = useMemo(() => {
    if (!filtro?.fecha) return grupos; // Si no hay filtro, devuelve todos
  
    const filtroFechaHora = parseFechaHoraFiltro(filtro.fecha); // Convierte el filtro a "YYYY-MM-DD HH:mm"
  
    return grupos.filter((grupo) => {
      const fechaHoraGrupo = parseFechaHora(grupo.fecha); // "YYYY-MM-DD HH:mm"
      return fechaHoraGrupo === filtroFechaHora;
    });
  }, [grupos, filtro]);
  
  useEffect(() => {
    console.log("Fecha y hora filtro:", filtro?.fecha);
    console.log("Grupos filtrados:", gruposFiltrados);
  }, [gruposFiltrados]);
  
  
  
  

  const handleGuardar = async (data: any[]) => {
    const dataToSend = data.flatMap((grupo, grupoIndex) => {
      if (!grupo.personas || grupo.personas.length === 0) return [];
  
      return grupo.personas.map((persona: any, personaIndex: any) => {
        const destinoCodigo = grupo.destino?.coddestino ? String(grupo.destino.coddestino) : "4175"; // 🔹 Asegurar que siempre sea string
        const horaprog = grupo.horaprog ? String(grupo.horaprog) : "13/02/2025 20:00"; // 🔹 Valor por defecto correcto
        const codunidad = grupo.codunidad && grupo.codunidad !== "" ? String(grupo.codunidad) : "1"; // 🔹 Evitar valores vacíos
  
        return {
          codigo: Number(persona.codCliente) || 0, // 🔹 Convertir a número seguro
          horaprog, // 🔹 Asegurar formato de fecha
          orden: String(personaIndex), // 🔹 Convertir a string
          numero: String(grupoIndex), // 🔹 Convertir a string
          eliminado: "0",
          codconductor: 0,
          codunidad, // 🔹 Convertido a string válido
          codtarifa: "25",
          destinocodigo: destinoCodigo, // 🔹 Convertido a string válido
        };
      });
    });
  
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
      console.error("Error al guardar los datos:", error || error);
    }
  };
  
  
  useEffect(() => {
    if (onGuardar) {
      onGuardar(() => () => handleGuardar(grupos));
    }
  }, [grupos]); 
  






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
    if (gruposFiltrados.length > 0) { // Asegúrate de que estás usando el estado de gruposFiltrados
      const nuevoItems = gruposFiltrados.reduce((acc, grupo, index) => {
        if (grupo.personas && grupo.personas.length > 0) {
          acc[`container${index}`] = grupo.personas.map((persona, idx) => {
            console.log(`Procesando persona ${persona.nombre} en grupo ${grupo.id}`);
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
                    Nuevo
                    <MdOutlineAdd />
                  </Button>
  
                  <Button
                    color="danger"
                    size="sm"
                    onClick={() => handleEliminarDelArray(Number(persona.idCliente))}
                  >
                    Eliminar
                    <MdDelete />
                  </Button>
  
                  <Button color="warning" size="sm">
                    Dirección
                    <TbGps />
                  </Button>
                </div>
              ),
            };
          });
        }
        return acc;
      }, {});
      setItems(nuevoItems); // Actualizar el estado con los nuevos items
    }
  }, [grupos, gruposFiltrados]); // Asegúrate de agregar gruposFiltrados a las dependencias
  

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

    const activeContainer = findContainer(activeId);

    if (overId === 'grupo-eliminados') {
      handleEliminarDelArray(Number(activeId));
      setActiveId(null);
      return;
    }

    const overContainer = findContainer(overId);

    if (!activeContainer || !overContainer) {
      setActiveId(null);
      return;
    }

    // Si se reordena dentro del mismo grupo
    if (activeContainer === overContainer) {
      const activeIndex = items[activeContainer].findIndex(
        (item) => item.id === activeId,
      );
      const overIndex = items[overContainer].findIndex(
        (item) => item.id === overId,
      );

      if (activeIndex !== overIndex) {
        setItems((prevItems) => {
          const updatedItems = arrayMove(
            prevItems[overContainer],
            activeIndex,
            overIndex,
          );

          // Reasigna los `orderItem` después de mover
          const reorderedItems = updatedItems.map((item, index) => ({
            ...item,
            orderItem: index + 1,
          }));

          return {
            ...prevItems,
            [overContainer]: reorderedItems,
          };
        });
      }
    }

    setActiveId(null);
  }

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
          {gruposFiltrados.length > 0 &&
            Object.keys(items).map((key, index) =>
              gruposFiltrados[index] ? (
                <Container
                  key={key}
                  id={key}
                  items={items[key] || []}
                  grupo={gruposFiltrados[index]}
                />
              ) : null,
            )}

          <div>
            <GrupoEliminados items={eliminados} onRestore={handleRestore} />
          </div>

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
