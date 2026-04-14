'use client';
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ItemProps {
  numGrupo: number;
  orderItem: number;
  nombre: string;
  distrito: string;
  direccion: string;
  fechaItem: string;
  area: string;
  acciones: React.ReactNode;
}

export function Item(props: ItemProps) {
  const { orderItem, numGrupo, nombre, distrito, direccion, fechaItem, area, acciones } = props;

  return (
    <div style={{
      width: '100%',
      height: 40,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      margin: '0px 0px 2.5px 0px',
      background: '#e9ecef',
      fontSize: '12px',
      paddingLeft: '5px',
    }}>
      <span className='num'>{orderItem}</span>
      <span className='nombre'>{nombre}</span>
      <span className='distrito'>{distrito}</span>
      <span className='direccion'>{direccion}</span>
      <span className='fecha'>{fechaItem}</span>
      <span className='area'>{area}</span>
      <span className='acciones'>{acciones}</span>
    </div>
  );
}

// ✅ disabled viene directo del padre — sin observers, sin querySelectorAll
export default function SortableItem(props: { id: string; data: ItemProps; disabled?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.id,
    disabled: props.disabled ?? false,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: props.disabled ? 0.6 : 1,
    cursor: props.disabled ? 'default' : isDragging ? 'grabbing' : 'grab',
    pointerEvents: props.disabled ? ('none' as const) : ('auto' as const),
  };

  const sortableProps = props.disabled ? {} : { ...attributes, ...listeners };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...sortableProps}
      data-sortable-disabled={props.disabled}
    >
      <Item {...props.data} />
    </div>
  );
}