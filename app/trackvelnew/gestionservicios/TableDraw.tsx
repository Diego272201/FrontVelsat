'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { DndContext, closestCenter } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Button,
} from '@nextui-org/react';
import { BsArrowDownSquareFill } from 'react-icons/bs';

interface RowData {
  orden: string;
  area: string;
  nombre: string;
  direccion: string;
  distrito: string;
  estado: string;
}

interface Props {
  codServicio: string;
  onCoordenadasUpdate: (coordenadas: { lat: number; lng: number }[]) => void;
}

const SortableRow = ({ row, index }: { row: RowData; index: number }) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: row.orden });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab border bg-white active:cursor-grabbing"
    >
      <td className="border p-1">
        <div className="flex items-center justify-center gap-2">
          <span>{index + 1}</span>
          <Dropdown>
            <DropdownTrigger>
              <Button isIconOnly variant="light" className="p-0 shadow-none">
                <BsArrowDownSquareFill size={20} color="#0353a4" />
              </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label="Acciones">
              <DropdownItem key="edit">Editar</DropdownItem>
              <DropdownItem key="delete" className="text-danger" color="danger">
                Eliminar
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
      </td>
      <td className="border p-1">{row.area}</td>
      <td className="border p-1">{row.nombre}</td>
      <td className="border p-1">{row.direccion}</td>
      <td className="border p-1">{row.distrito}</td>
      <td className="border p-1">{row.estado}</td>
    </tr>
  );
};

export default function DragAndDropTable({
  codServicio,
  onCoordenadasUpdate,
}: Props) {
  const [data, setData] = useState<RowData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!codServicio) return;

    const API_URL = `http://66.240.210.125:8586/api/Preplan/PasajeroList?codservicio=${codServicio}`;
    setLoading(true);

    axios
      .get(API_URL)
      .then((response) => {
        const fetchedData = response.data.map((item: any, index: number) => ({
          orden: item.orden.toString(),
          area: item.arealan || 'N/A',
          nombre: item?.pasajero?.nombre || 'N/A',
          direccion: item?.lugar?.direccion || 'N/A',
          distrito: item?.lugar?.distrito || 'N/A',
          estado: item.lugar?.estado ?? 'Sin estado',
          wy: item.lugar?.wy ?? '',
          wx: item.lugar?.wx ?? '',
        }));

        console.log('Datos obtenidos:', fetchedData);
        setData(fetchedData);
        // Convertir wy y wx en coordenadas para pasarlas como props
        const coordenadas = fetchedData
          .map((item: { wy: string; wx: string }) => ({
            lat: parseFloat(item.wy),
            lng: parseFloat(item.wx),
          }))
          .filter(
            (coord: { lat: number; lng: number }) =>
              !isNaN(coord.lat) && !isNaN(coord.lng),
          ); // Filtrar valores inválidos

        onCoordenadasUpdate(coordenadas);
      })
      .catch((error) => console.error('Error fetching data:', error))
      .finally(() => setLoading(false));
  }, [codServicio, onCoordenadasUpdate]);

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = data.findIndex((item) => item.orden === active.id);
      const newIndex = data.findIndex((item) => item.orden === over?.id);
      setData(arrayMove(data, oldIndex, newIndex));
    }
  };

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={data.map((item) => ({ id: item.orden }))}
        strategy={verticalListSortingStrategy}
      >
        <div className="rounded-lg bg-white p-4 shadow-md">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-blue-300">
                <th className="border p-2">Orden</th>
                <th className="border p-2">Área</th>
                <th className="border p-2">Nombre</th>
                <th className="border p-2">Dirección</th>
                <th className="border p-2">Distrito</th>
                <th className="border p-2">Estado</th>
              </tr>
            </thead>

            <tbody style={{ fontSize: '13px' }}>
              {loading
                ? Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index} className="animate-pulse bg-gray-200">
                      <td className="border p-2">
                        <div className="h-4 w-8 rounded bg-gray-300"></div>
                      </td>
                      <td className="border p-2">
                        <div className="h-4 w-20 rounded bg-gray-300"></div>
                      </td>
                      <td className="border p-2">
                        <div className="h-4 w-24 rounded bg-gray-300"></div>
                      </td>
                      <td className="border p-2">
                        <div className="h-4 w-32 rounded bg-gray-300"></div>
                      </td>
                      <td className="border p-2">
                        <div className="h-4 w-20 rounded bg-gray-300"></div>
                      </td>
                      <td className="border p-2">
                        <div className="h-4 w-16 rounded bg-gray-300"></div>
                      </td>
                    </tr>
                  ))
                : data.map((row, index) => (
                    <SortableRow key={row.orden} row={row} index={index} />
                  ))}
            </tbody>
          </table>
        </div>
      </SortableContext>
    </DndContext>
  );
}
