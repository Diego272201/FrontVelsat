'use client';

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
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
import { toast } from 'sonner';

interface RowData {
  orden: string;
  area: string;
  codigo: number;
  nombre: string;
  direccion: string;
  distrito: string;
  estado: string;
  wy: string;
  wx: string;
  fechafin:string;
  feccancelpas:string;
}

interface Props {
  codServicio: string;
  onCoordenadasUpdate: (coordenadas: { lat: number; lng: number }[]) => void;
  onCenterUpdate?: (coordenadas: { lat: number; lng: number }) => void;
  fecha: string;
}

const SortableRow = ({ row, index, onUbicar, onCancelar }: { row: RowData; index: number; onUbicar: (coords: { lat: number; lng: number }) => void; onCancelar: (codigo: number) => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: row.orden });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const rowBgColor =
  row.estado === 'NA' || row.estado === 'AT' ? 'bg-[#fff]' : 
  row.estado === 'CC' || row.estado === 'CP' ? 'bg-[#FDBDAA]' : 
  'bg-white';

  return (
    <tr
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`cursor-grab border ${rowBgColor} active:cursor-grabbing`}   
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
            <DropdownItem key="edit" onPress={() => onUbicar({ lat: parseFloat(row.wy), lng: parseFloat(row.wx) })}>
                Ubicar
              </DropdownItem>
              <DropdownItem key="delete" className="text-danger" color="danger" onPress={() => onCancelar(row.codigo)}>  
                Cancelar
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

const DragAndDropTable = forwardRef(
  ({ codServicio, onCoordenadasUpdate, onCenterUpdate, fecha }: Props, ref) => {
    const [data, setData] = useState<RowData[]>([]);
    const [loading, setLoading] = useState(true);



    const handleUbicar = (coords: { lat: number; lng: number }) => {
      console.log("Coordenadas enviadas:", coords);
    
      if (!isNaN(coords.lat) && !isNaN(coords.lng)) {
        if (onCenterUpdate) {
          onCenterUpdate(coords); 
        }
      } else {
        toast.error("Coordenadas inválidas");
      }
    };

    const handleCancelar = async (codigo: number) => {
      try {
        await axios.put('http://66.240.210.125:8586/api/Preplan', { codigo });
        toast.success('Pasajero cancelado con éxito.');   
        setData((prevData) =>
          prevData.map((item) => {
            if (item.codigo === codigo) {
              
              const nuevoItem = { ...item, estado: 'C' };
              let estado = 'NA';
    
              if (nuevoItem.fechafin) {
                estado = 'AT';
              } else if (nuevoItem.estado === 'C') {
                estado = nuevoItem.feccancelpas ? 'CP' : 'CC';
              }
            
              return { ...nuevoItem, estado }; 
            }
    
            return item; 
          })
        );
    
      } catch (error) {
        toast.error('Error al cancelar el pasajero.');
      }
    };
    
    
    
    useEffect(() => {
      if (!codServicio) return;
    
      const API_URL = `http://66.240.210.125:8586/api/Preplan/PasajeroList?codservicio=${codServicio}`;
      setLoading(true);
    
      axios
        .get(API_URL)
        .then((response) => {
          const fetchedData = response.data.map((item: any, index: number) => {
            let estado = 'NA';

            
            if (item.fechafin) {
              estado = 'AT';
            } else if (item.estado === 'C') {
              estado = item.feccancelpas ? 'CP' : 'CC';
            }
            
            return {
              orden: item.orden.toString(),
              area: item.arealan || 'N/A',
              nombre: item?.pasajero?.nombre || 'N/A',
              direccion: item?.lugar?.direccion || 'N/A',
              distrito: item?.lugar?.distrito || 'N/A',
              estado, 
              wy: item.lugar?.wy ?? '',
              wx: item.lugar?.wx ?? '',
              codigo: item.codigo,
              fechafin:item.fechafin,
              feccancelpas:item.feccancelpas,
            };
          });
    
          setData(fetchedData);
    
          const coordenadas = fetchedData
            .map((item: { wy: string; wx: string }) => ({
              lat: parseFloat(item.wy),
              lng: parseFloat(item.wx),
            }))
            .filter(
              (coord: { lat: number; lng: number }) =>
                !isNaN(coord.lat) && !isNaN(coord.lng),
            );
    
          onCoordenadasUpdate(coordenadas);
        })
        .catch((error) => console.error('Error fetching data:', error))
        .finally(() => setLoading(false));
    }, [codServicio, onCoordenadasUpdate]);
    

    useEffect(() => {
      console.log(data);
    }, [data]);

    const actualizarOrdenEnServidor = async () => {
      if (!codServicio || data.length === 0) return;

      const API_URL = `http://66.240.210.125:8586/api/Preplan/actualizarOrden`;

      const payload = {
        codservicio: codServicio,
        fecha: fecha,
        listapuntos: data.map(({ codigo, orden }) => ({
          codigo,
          orden,
        })),
      };

      try {
        const response = await axios.put(API_URL, payload);
        toast.success('Orden actualizada con éxito.');
      } catch (error) {
        toast.error('Error al actualizar la orden.');
      }
    };

    useImperativeHandle(ref, () => ({
      actualizarOrdenEnServidor,
    }));

    const handleDragEnd = (event: any) => {
      const { active, over } = event;
      if (active.id !== over?.id) {
        const oldIndex = data.findIndex((item) => item.orden === active.id);
        const newIndex = data.findIndex((item) => item.orden === over?.id);

        const newData = arrayMove(data, oldIndex, newIndex);

        const updatedData = newData.map((item, index) => ({
          ...item,
          orden: (index + 1).toString(),
        }));

        setData(updatedData);
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
                      <SortableRow key={row.orden} row={row} index={index} onUbicar={handleUbicar} onCancelar={handleCancelar}/>
                    ))}
              </tbody>
            </table>
          </div>
        </SortableContext>
      </DndContext>
    );
  },
);

export default DragAndDropTable;
