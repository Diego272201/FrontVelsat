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

export default function App() {
  const [grupos, setGrupos] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const groupedData = await obtenerDatosYAgrupar();
      setGrupos(groupedData);
    };

    fetchData();
  }, []);

  function handleDelete(item: any, containerKey: string) {
    setItems((prev) => {
      const updatedItems = prev[containerKey].filter((i) => i.id !== item.id);
      return {
        ...prev,
        [containerKey]: updatedItems,
      };
    });
  
    setEliminados((prev) => [
      ...prev,
      {
        ...item,
        acciones: undefined, // Eliminar las acciones al mover al grupo de eliminados
        originalContainer: containerKey,
        originalIndex: items[containerKey]?.findIndex((i) => i.id === item.id),
        originalNumGrupo: item.numGrupo,
      },
    ]);
  }

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
        fecha: string;
        area: string;
        acciones: React.ReactNode;
      }[]
    >
  >({});

  useEffect(() => {
    const nuevoItems = grupos.reduce(
      (acc, grupo, index) => {
        acc[`container${index}`] = grupo.personas.map(
          (persona: any, idx: number) => {
            const item = {
              id: String(persona.idCliente),
              numGrupo: grupo.id,
              orderItem: idx + 1,
              tipo: grupo.tipo,
              destino: grupo.destinoGrupo,
              empresa: grupo.empresa,
              fechaGrupo: persona.fechaItem,
              nombre: persona.nombre,
              distrito: persona.distrito,
              direccion: persona.direccion,
              fecha: persona.fechaItem,
              area: persona.area,
            };

            return {
              ...item,
              acciones: (
                <div className="accionesItems">
                  <Button color="success" size="sm">
                    Nuevo
                    <MdOutlineAdd />
                  </Button>
                  <Button
                    color="danger"
                    size="sm"
                    onClick={() => {
                      const currentContainer = findContainer(item.id);
                      if (currentContainer) {
                        handleDelete(item, currentContainer);
                      }
                    }}
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
      if (activeContainer) {
        const activeItems = items[activeContainer];
        const itemToRemove = activeItems.find((item) => item.id === activeId);
        const originalIndex = activeItems.findIndex(
          (item) => item.id === activeId,
        );

        setItems((prev) => ({
          ...prev,
          [activeContainer]: prev[activeContainer].filter(
            (item) => item.id !== activeId,
          ),
        }));

        if (!itemToRemove) return;
        setEliminados((prev) => [
          ...prev,
          {
            ...itemToRemove,
            acciones: undefined,
            originalContainer: activeContainer,
            originalIndex,
            originalNumGrupo: itemToRemove.numGrupo,
          },
        ]);
      }
      setActiveId(null);
      return;
    }

    const overContainer = findContainer(overId);

    if (
      !activeContainer ||
      !overContainer ||
      activeContainer !== overContainer
    ) {
      setActiveId(null);
      return;
    }

    const activeIndex = items[activeContainer].findIndex(
      (item) => item.id === activeId,
    );
    const overIndex = items[overContainer].findIndex(
      (item) => item.id === overId,
    );

    if (activeIndex !== overIndex) {
      setItems((items) => ({
        ...items,
        [overContainer]: arrayMove(
          items[overContainer],
          activeIndex,
          overIndex,
        ),
      }));
    }

    setActiveId(null);
  }

  function handleRestore(item: any) {
    const containerKey = Object.keys(items).find((key, index) => {
      return grupos[index]?.id === item.originalNumGrupo;
    });

    if (!containerKey) {
      console.error('No se pudo encontrar el contenedor original');
      return;
    }

    setItems((prevItems) => {
      const updatedItems = [...(prevItems[containerKey] || [])];

      if (updatedItems.some((existingItem) => existingItem.id === item.id)) {
        return prevItems;
      }

      const restoredItem = {
        ...item,
        acciones: (
          <div className="accionesItems">
            <Button color="success" size="sm">
              Nuevo
              <MdOutlineAdd />
            </Button>
            <Button
              color="danger"
              size="sm"
              onClick={() => {
                handleDelete(restoredItem, containerKey);
              }}
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

      updatedItems.push(restoredItem);

      return {
        ...prevItems,
        [containerKey]: updatedItems,
      };
    });

    setEliminados((prevEliminados) =>
      prevEliminados.filter((el) => el.id !== item.id),
    );
  }

  return (
    <div style={wrapperStyle}>
      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {Object.keys(items).map((key, index) => (
          <Container
            key={key}
            id={key}
            items={items[key]}
            grupo={grupos[index]}
          />
        ))}

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
    </div>
  );
}
