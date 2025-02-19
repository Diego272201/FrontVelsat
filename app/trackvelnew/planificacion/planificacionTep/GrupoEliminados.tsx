import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Item } from './sortable_item';

interface GrupoEliminadosProps {
  items: any[];
  onRestore: (item: any) => void;  
}

export default function GrupoEliminados({ items, onRestore }: GrupoEliminadosProps) {
  const { setNodeRef } = useDroppable({
    id: 'grupo-eliminados',
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        background: '#f8d7da',
        padding: '10px',
        margin: '20px 0',
        border: '2px dashed #721c24',
        minHeight: '100px',
      }}
    >
      <h3 style={{ color: '#721c24' }}>Grupo de Eliminados</h3>
      {items.length === 0 ? (
        <p>No hay elementos eliminados.</p>
      ) : (
        items.map((item) => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Item {...item} />
            <button 
              onClick={() => onRestore(item)} 
              style={{ marginLeft: '10px', backgroundColor: '#28a745', color: 'white', padding: '5px 10px', border: 'none', borderRadius: '4px' }}
            >
              Restaurar
            </button>
          </div>
        ))
      )}
    </div>
  );
}
