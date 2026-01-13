import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Item } from './sortable_item';
import { Trash2 } from 'lucide-react';

interface GrupoEliminadosProps {
  items: any[];
  onRestore: (item: any) => void;
}

export default function GrupoEliminados({
  items,
  onRestore,
}: GrupoEliminadosProps) {
  const { setNodeRef } = useDroppable({
    id: 'grupo-eliminados',
  });

  return (
    <div
      ref={setNodeRef}
      className="my-0 min-h-[100px] rounded-lg border-2 border-dashed border-red-300 bg-red-100 p-4 transition-colors hover:bg-red-100"
    >
      {/* Encabezado con advertencia en la misma línea */}
      <div className="mb-2 flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500">
          <Trash2 className="text-gray-50" size={14} />
        </div>
        <h3 className="text-[13.5px] font-semibold text-red-700">
          Elementos Eliminados
        </h3>

        {/* Advertencia compacta */}
        <div className="ml-4 flex items-center gap-1 rounded-md border border-yellow-200 bg-yellow-50 px-2 py-1">
          <svg
            className="h-4 w-4 text-yellow-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-[12px] text-yellow-700">
            Guarda cambios antes de limpiar eliminados
          </span>
        </div>

        <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-50 text-xs font-medium text-red-800">
          {items.length}
        </span>
      </div>

      {/* Contenido del grupo */}
      {items.length === 0 ? (
        <div className="text-center">
          <div className="mx-auto mb-1 flex h-5  w-5 items-center justify-center">
            <svg
              className="h-5 w-5 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </div>
          <p className="text-[12px] text-gray-500">No hay elementos eliminados</p>
        </div>
        
      ) : (
        <div className="space-y-0">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg border border-red-200 bg-white p-1 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex-1">
                <Item {...item} />
              </div>

              <button
                onClick={() => onRestore(item)}
                className="ml-4 flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                  />
                </svg>
                Restaurar
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Acciones adicionales si hay elementos */}
      {items.length > 0 && (
        <div className="mt-4 border-t border-red-300 pt-2">
          <p className="mb-0 text-xs text-gray-500">
            Tienes {items.length} elemento{items.length !== 1 ? 's' : ''}{' '}
            eliminado{items.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
}
