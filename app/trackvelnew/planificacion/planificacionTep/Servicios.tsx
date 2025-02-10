import React, { useEffect, useState } from 'react';
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
import { Button } from '@nextui-org/react';
import { MdDelete } from 'react-icons/md';
import { MdOutlineAdd } from 'react-icons/md';
import { TbGps } from 'react-icons/tb';

const wrapperStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
};

interface ServiciosProps {
  empresa: string;
  dato: string;
}

export default function App({ empresa, dato }: ServiciosProps) {
  const [grupos, setGrupos] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const groupedData = await obtenerDatosYAgrupar(empresa, dato);
      setGrupos(groupedData);
    };

    fetchData();
  }, [empresa]);


  useEffect(()=>{
    console.log(grupos)
  })


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
    if (grupos.length > 0) {
      const nuevoItems = grupos.reduce(
        (acc, grupo, index) => {
          acc[`container${index}`] = grupo.personas.map(
            (persona: any, idx: number) => {
              const item = {
                id: String(persona.idCliente),
                orderItem: idx + 1,
                nombre: persona.nombre,
                distrito: persona.distrito,
                direccion: persona.direccion,
                fechaItem: persona.fechaItem,
                area: persona.area,

                numGrupo: grupo.id,
                tipo: grupo.tipo,
                destino: grupo.destinoGrupo,
                empresa: grupo.empresa,
                fecha: grupo.fecha,
              };

              return {
                ...item,
                acciones: (
                  <div className="accionesItems">

              <Button color="success" size="sm" onClick={() => handleMoverAGrupoNuevo(Number(item.id))}>
                  Nuevo
                  <MdOutlineAdd />
                </Button>



                    <Button
                      color="danger"
                      size="sm"
                      onClick={() => handleEliminarDelArray(Number(item.id))}
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
            },
          );
          return acc;
        },
        {} as Record<string, any[]>,
      );

      setItems(nuevoItems);
    }
  }, [grupos]);

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
  
      let grupoOrigenIndex = nuevosGrupos.findIndex(grupo =>
        grupo.personas.some(persona => persona.idCliente === idCliente)
      );
  
      if (grupoOrigenIndex !== -1) {
        let clienteMovido = nuevosGrupos[grupoOrigenIndex].personas.find(
          persona => persona.idCliente === idCliente
        );
  
        if (clienteMovido) {

          const grupoOrigen = nuevosGrupos[grupoOrigenIndex];

          nuevosGrupos[grupoOrigenIndex].personas = nuevosGrupos[grupoOrigenIndex].personas.filter(
            persona => persona.idCliente !== idCliente
          );
  
      
          const nuevoGrupo = {
            id: nuevosGrupos.length + 1, 
            destinoGrupo: grupoOrigen.destinoGrupo, 
          empresa: grupoOrigen.empresa, 
          fecha: grupoOrigen.fecha, 
          tipo: grupoOrigen.tipo, 
            personas: [clienteMovido], 
          };
  
          nuevosGrupos.push(nuevoGrupo);
        }
      }
  
      console.log("Nuevo estado de grupos:", nuevosGrupos);
      return nuevosGrupos;
    });
  };
  
  const handleEliminarDelArray = (idCliente: number) => {
    setGrupos((prevGrupos) => {
      let nuevosGrupos = [...prevGrupos];
  
      let grupoOrigenIndex = nuevosGrupos.findIndex(grupo =>
        grupo.personas.some(persona => persona.idCliente === idCliente)
      );
  
      if (grupoOrigenIndex !== -1) {
        let clienteEliminado = nuevosGrupos[grupoOrigenIndex].personas.find(
          persona => persona.idCliente === idCliente
        );
  
        if (clienteEliminado) {
          // Agregar el número del grupo antes de eliminarlo
          clienteEliminado = { ...clienteEliminado, numGrupo: nuevosGrupos[grupoOrigenIndex].id };
  
          // Remover del grupo
          nuevosGrupos[grupoOrigenIndex].personas = nuevosGrupos[grupoOrigenIndex].personas.filter(
            persona => persona.idCliente !== idCliente
          );
  
          // Guardar en eliminados con su numGrupo
          setEliminados((prevEliminados) => {
            const nuevosEliminados = [...prevEliminados, clienteEliminado];
  
            console.log(
              `Cliente eliminado:`, clienteEliminado,
              `\nViene del grupo:`, clienteEliminado.numGrupo,
              `\nNuevo estado de eliminados:`, nuevosEliminados
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
      prevEliminados.filter((eliminado) => eliminado.idCliente !== item.idCliente)
    );
  
    setGrupos((prevGrupos) => {
      let nuevosGrupos = [...prevGrupos];
  
      // Buscar el grupo original por `numGrupo`
      let grupoOriginalIndex = nuevosGrupos.findIndex(
        (grupo) => Number(grupo.id) === Number(item.numGrupo)
      );
  
      if (grupoOriginalIndex !== -1) {
        // Verificar si el cliente ya está en la lista antes de agregarlo
        let existeEnGrupo = nuevosGrupos[grupoOriginalIndex].personas.some(
          (persona) => persona.idCliente === item.idCliente
        );
  
        if (!existeEnGrupo) {
          nuevosGrupos[grupoOriginalIndex].personas.push(item);
          console.log(
            `Item restaurado:`, item,
            `\nRestaurado al grupo:`, nuevosGrupos[grupoOriginalIndex].id
          );
        } else {
          console.warn("El cliente ya está en el grupo, evitando duplicados.");
        }
      } else {
        console.warn("Grupo original no encontrado. No se restauró correctamente.");
        console.log("Estado actual de grupos:", nuevosGrupos);
        console.log("Buscando grupo con ID:", item.numGrupo);
      }
  
      return nuevosGrupos;
    });
  };
  
  


  return (
    <div style={wrapperStyle}>
      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {grupos.length > 0 &&
          Object.keys(items).map((key, index) =>
            grupos[index] ? (
              <Container
                key={key}
                id={key}
                items={items[key] || []}
                grupo={grupos[index]}
              />
            ) : null,
          )}

        <div>
          <GrupoEliminados items={eliminados} onRestore={handleRestore} />
        </div>

        <div>
        <Button
            color="primary"
            onClick={() => handleEliminarDelArray(4)}
          >
            Eliminar del array
          </Button>


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
    </div>
  );
}
