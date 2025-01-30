import React, { useState } from 'react';
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

const wrapperStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
};

export default function App() {

  const [items, setItems] = useState<
  Record<
    string,
    {
      id: string; // Se mantiene el `id`
      numGrupo: number;
      nombre: string;
      distrito: string;
      direccion: string;
      fecha: string;
      area: string;
      acciones: React.ReactNode;
    }[]
  >
>({
  root: [
    {
      id: 'A0', // Conservado
      numGrupo: 1,
      nombre: 'Juan Pérez',
      distrito: 'Lima',
      direccion: 'Av. Principal 123',
      fecha: '2025-01-27',
      area: 'Administración',
      acciones: (
        <>
          <button onClick={() => alert('Editar A0')}>Editar</button>
          <button onClick={() => alert('Eliminar A0')}>Eliminar</button>
        </>
      ),
    },
    {
      id: 'A1', // Conservado
      numGrupo: 2,
      nombre: 'María García',
      distrito: 'Cusco',
      direccion: 'Calle Secundaria 456',
      fecha: '2025-01-28',
      area: 'Ventas',
      acciones: (
        <>
          <button onClick={() => alert('Editar A1')}>Editar</button>
          <button onClick={() => alert('Eliminar A1')}>Eliminar</button>
        </>
      ),
    },
  ],
  container1: [
    {
      id: 'B0', // Conservado
      numGrupo: 1,
      nombre: 'Luis Gómez',
      distrito: 'Arequipa',
      direccion: 'Jr. Independencia 789',
      fecha: '2025-01-29',
      area: 'Producción',
      acciones: (
        <>
          <button onClick={() => alert('Editar B0')}>Editar</button>
          <button onClick={() => alert('Eliminar B0')}>Eliminar</button>
        </>
      ),
    },
  ],
  container2: [],
  container3: [],
});

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
    const { id } = active;

    const activeContainer = findContainer(id);

    if (!over) {
      setActiveId(null);
      return;
    }

    const { id: overId } = over;
    const overContainer = findContainer(overId);

    if (
      !activeContainer ||
      !overContainer ||
      activeContainer !== overContainer
    ) {
      return;
    }

    const activeIndex = items[activeContainer].findIndex(
      (item) => item.id === id,
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

  return (
    <div style={wrapperStyle}>
      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <Container id="root" items={items.root} />
        <Container id="container1" items={items.container1} />
        <Container id="container2" items={items.container2} />
        <Container id="container3" items={items.container3} />
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
