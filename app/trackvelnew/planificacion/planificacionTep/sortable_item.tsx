import React, { useEffect, useState } from 'react';
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

  const style = {
    width: '100%',
    height: 40,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    margin: '0px 0px 2.5px 0px',
    background: '#e9ecef',
    fontSize: '12px',
    paddingLeft: '5px',
  };

  return (
    <div style={style}>
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

export default function SortableItem(props: { id: string; data: ItemProps; disabled?: boolean }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Detectar automáticamente si hay modales abiertos
  useEffect(() => {
    const checkForModals = () => {
      // Buscar elementos de modales en el DOM
      const nextUIModals = document.querySelectorAll('[data-nextui-modal], [role="dialog"]');
      const fixedElements = document.querySelectorAll('.fixed[style*="z-index"]');
      
      // Verificar si hay backdrop de modal visible
      const modalBackdrops = document.querySelectorAll('[data-nextui-modal-backdrop], .fixed.inset-0');
      
      const hasModal = nextUIModals.length > 0 || 
                       fixedElements.length > 0 || 
                       modalBackdrops.length > 0;

      setIsModalOpen(hasModal);
    };

    // Verificar inmediatamente
    checkForModals();

    // Crear un observer para detectar cambios en el DOM
    const observer = new MutationObserver(checkForModals);
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'data-nextui-modal', 'role']
    });

    // También escuchar cambios en el z-index del body (NextUI puede cambiar esto)
    const checkBodyStyle = () => {
      const bodyStyle = window.getComputedStyle(document.body);
      const isBodyBlocked = bodyStyle.overflow === 'hidden' || 
                           bodyStyle.pointerEvents === 'none';
      
      if (isBodyBlocked !== isModalOpen) {
        setIsModalOpen(isBodyBlocked);
      }
    };

    const styleObserver = new MutationObserver(checkBodyStyle);
    styleObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['style', 'class']
    });

    return () => {
      observer.disconnect();
      styleObserver.disconnect();
    };
  }, [isModalOpen]);

  // Usar la prop disabled si se pasa, sino usar la detección automática
  const shouldDisable = props.disabled !== undefined ? props.disabled : isModalOpen;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: props.id,
    disabled: shouldDisable
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    // Feedback visual cuando está deshabilitado
    opacity: shouldDisable ? 0.6 : 1,
    cursor: shouldDisable ? 'default' : isDragging ? 'grabbing' : 'grab',
    pointerEvents: shouldDisable ? ('none' as const) : ('auto' as const),
  };

  // Si está deshabilitado, no agregar listeners
  const sortableProps = shouldDisable ? {} : { ...attributes, ...listeners };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...sortableProps}
      data-sortable-disabled={shouldDisable}
    >
      <Item {...props.data} />
    </div>
  );
}