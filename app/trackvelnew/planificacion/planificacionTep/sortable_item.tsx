'use client';
import React, { memo } from 'react';
import { useSortable, type AnimateLayoutChanges } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MdAddBox, MdDelete, MdContentCopy } from 'react-icons/md';
import { TbGps } from 'react-icons/tb';

export interface ItemData {
  id: string;
  numGrupo: number;
  orderItem: number;
  nombre: string;
  distrito: string;
  direccion: string;
  fechaItem: string;
  area: string;
  wx: string;
  wy: string;
  codCliente: string;
  codigo: string;
}

export interface PasajeroDirecciones {
  codCliente: string;
  nombre: string;
  codigo: string;
}

export interface ItemActionCallbacks {
  onCopiarLink?: (coords: { lat: number; lng: number }) => void;
  onMoverAGrupoNuevo?: (idCliente: number) => void;
  onEliminar?: (idCliente: number) => void;
  onAbrirDirecciones?: (pasajero: PasajeroDirecciones) => void;
  /** Recibe el id de la fila; resuelve el grupo por su cuenta para que la
   *  referencia del callback sea estable y no rompa el memo de las filas. */
  onToggleSeleccion?: (itemId: string) => void;
}

type ItemProps = ItemData &
  ItemActionCallbacks & {
    seleccionado?: boolean;
    resaltado?: boolean;
  };

export const Item = memo(function Item(props: ItemProps) {
  const {
    id,
    orderItem,
    nombre,
    distrito,
    direccion,
    fechaItem,
    area,
    wx,
    wy,
    codCliente,
    codigo,
    onCopiarLink,
    onMoverAGrupoNuevo,
    onEliminar,
    onAbrirDirecciones,
    onToggleSeleccion,
    seleccionado,
    resaltado,
  } = props;

  const showActions = !!(onCopiarLink && onMoverAGrupoNuevo && onEliminar);

  return (
    <div
      style={{
        width: '100%',
        height: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        margin: '0px 0px 2.5px 0px',
        background: resaltado
          ? '#fde68a'
          : seleccionado
            ? '#dbeafe'
            : '#e9ecef',
        transition: 'background-color 200ms ease',
        fontSize: '12px',
        paddingLeft: '5px',
      }}
    >
      <span className="num flex items-center gap-1.5">
        {onToggleSeleccion && (
          <input
            type="checkbox"
            checked={!!seleccionado}
            onChange={() => onToggleSeleccion(id)}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Seleccionar a ${nombre}`}
            className="h-3.5 w-3.5 cursor-pointer accent-blue-600"
          />
        )}
        {orderItem}
      </span>
      <span className="nombre">{nombre}</span>
      <span className="distrito">{distrito}</span>
      <span className="direccion">{direccion}</span>
      <span className="fecha">{fechaItem}</span>
      <span className="area">{area}</span>
      <span className="acciones">
        {showActions && (
          <div className="accionesItems">
            {/* Copiar link de ubicación */}
            <div className="relative inline-block h-[26px] w-[26px]">
              <div className="group relative h-full w-full">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopiarLink?.({
                      lat: Number(wy),
                      lng: Number(wx),
                    });
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  type="button"
                  className="flex h-full w-full items-center justify-center rounded bg-blue-500 hover:bg-blue-600 focus:outline-none"
                >
                  <MdContentCopy size={13} className="text-white" />
                </button>
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-max -translate-x-1/2 rounded-md bg-blue-800 px-2.5 py-1 text-[11px] text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  Copiar link de ubicación
                </div>
              </div>
            </div>

            {/* Mover a nuevo grupo */}
            <div className="relative inline-block h-[26px] w-[26px]">
              <div className="group relative h-full w-full">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoverAGrupoNuevo?.(Number(id));
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  type="button"
                  className="flex h-full w-full items-center justify-center rounded bg-green-500 hover:bg-green-600 focus:outline-none"
                >
                  <MdAddBox size={14} className="text-gray-900" />
                </button>
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-max -translate-x-1/2 rounded-md bg-green-800 px-2.5 py-1 text-[11px] text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  Mover a nuevo grupo
                </div>
              </div>
            </div>

            {/* Eliminar Pasajero */}
            <div className="relative inline-block h-[26px] w-[26px]">
              <div className="group relative h-full w-full">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEliminar?.(Number(id));
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  type="button"
                  className="flex h-full w-full items-center justify-center rounded bg-red-600 hover:bg-red-500 focus:outline-none"
                >
                  <MdDelete size={14} className="text-white" />
                </button>
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-max -translate-x-1/2 rounded-md bg-red-800 px-2.5 py-1 text-[11px] text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  Eliminar Pasajero
                </div>
              </div>
            </div>

            {/* Solo el disparador. El modal se monta una vez en la lista. */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAbrirDirecciones?.({ codCliente, nombre, codigo });
              }}
              onPointerDown={(e) => e.stopPropagation()}
              type="button"
              className="flex h-[26px] items-center gap-1.5 rounded bg-[#f5a524] px-2.5 text-[11px] font-medium text-black hover:opacity-80 focus:outline-none"
            >
              Dirección
              <TbGps size={13} />
            </button>
          </div>
        )}
      </span>
    </div>
  );
});

interface SortableItemProps {
  id: string;
  data: ItemData;
  disabled?: boolean;
  /**
   * Desactiva SOLO la zona de drop de la fila, manteniéndola arrastrable.
   * Es lo que evita que dnd-kit mida las miles de filas de la lista al agarrar:
   * solo las del grupo que se está arrastrando se registran como droppables.
   */
  dropDesactivado?: boolean;
  actionCallbacks?: ItemActionCallbacks;
  seleccionado?: boolean;
  resaltado?: boolean;
}

// Las animaciones FLIP al soltar provocan una medición + animación por fila.
// Con listas grandes eso es lo que hace que el drop se sienta trabado.
const noLayoutAnimation: AnimateLayoutChanges = () => false;

const SortableItem = memo(function SortableItem(props: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: props.id,
    disabled: props.disabled
      ? true
      : { draggable: false, droppable: props.dropDesactivado ?? false },
    animateLayoutChanges: noLayoutAnimation,
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
      <Item
        {...props.data}
        {...(props.actionCallbacks || {})}
        seleccionado={props.seleccionado}
        resaltado={props.resaltado}
      />
    </div>
  );
});

export default SortableItem;