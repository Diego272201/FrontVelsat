import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ItemProps {
  numGrupo: number;
  nombre: string;
  distrito: string;
  direccion: string;
  fecha: string;
  area: string;
  acciones: React.ReactNode;
}

export function Item(props: ItemProps) {
  const { numGrupo, nombre, distrito, direccion, fecha,area, acciones } = props;

  const style = {
    width: '100%',
    height: 50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    margin: '10px 0',
    background: '#e9ecef',
  };

  return (
    <div style={style}>
      <span className='num'>{numGrupo}</span>
      <span className='nombre'>{nombre}</span>
      <span className='distrito'>{distrito}</span>
      <span className='direccion'>{direccion}</span>
      <span className='fecha'>{fecha}</span>
      <span className='area'>{area}</span>
      <span className='acciones'>{acciones}</span>
    </div>
  );
}

export default function SortableItem(props: { id: string; data: ItemProps }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: props.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Item {...props.data} />
      </div>
  );
}
