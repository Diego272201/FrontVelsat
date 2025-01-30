import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import SortableItem from './sortable_item';
import App from '@/app/components/TimePicker';
import { FaCar } from 'react-icons/fa';
import { FaUserTie } from 'react-icons/fa6';

interface ItemData {
  id: string;
  numGrupo: number;
  nombre: string;
  distrito: string;
  direccion: string;
  fecha: string;
  area: string;
  acciones: React.ReactNode;
}

export default function Container(props: { id: string; items: ItemData[] }) {
  const { id, items } = props;
  const [startDate, setStartDate] = useState<string>('');

  const { setNodeRef } = useDroppable({
    id,
  });

  const handleStartDateSelect = (date: string) => {
    setStartDate(date);
  };

  return (
    <SortableContext
      id={id}
      items={items.map((item) => item.id)}
      strategy={verticalListSortingStrategy}
    >
      <div
        ref={setNodeRef}
        style={{
          background: '#fff',
          padding: 5,
          flex: 1,
          marginBottom: 10,
        }}
      >
        <table className="rwd-table">
          <thead style={{ color: '#fff' }}>
            <tr>
              <th>Grupo: 01</th>
              <th>Tipo: Ingreso</th>
              <th>Empresa: Delta</th>
              <th>Destino: Destino Aeropuerto Jorge Chavez</th>
              <th>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    height: '100%',
                  }}
                >
                  Inicio :
                  <App onDateSelect={handleStartDateSelect}  height='30px' borderRadius='0'/>
                </div>
              </th>
              <th>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    height: '100%',
                  }}
                >
                  Fin : <App onDateSelect={handleStartDateSelect}   height='30px' borderRadius='0'/>
                </div>
              </th>
              <th>Tarifa: Tarifa Delta Delta</th>
            </tr>
            
            <tr>
              <th>
          
                <div className="headTable">
                  <div className="num">N°</div>
                  <div className="nombre">Nombre</div>
                  <div className="distrito">Distrito</div>
                  <div className="direccion">Dirección</div>
                  <div className="fecha">Fecha</div>
                  <div className="area">Área</div>
                  <div className="acciones">Acciones</div>
                </div>
              </th>
            </tr>
          </thead>
        </table>

        {items.map((item) => (
          <SortableItem key={item.id} id={item.id} data={item} />
        ))}

        <div className="footerTep">
          <div className="dataConductorUnidad">
            <div className="relative">
              <input
                type="text"
                className="peer block w-full rounded-lg border-transparent bg-gray-100 px-4 py-2 ps-11 text-sm placeholder-zinc-500  disabled:pointer-events-none disabled:opacity-50"
                placeholder="Conductor"
              />
              <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-4 peer-disabled:pointer-events-none peer-disabled:opacity-50">
                <FaUserTie color="#343a40" />
              </div>
            </div>
            <div className="relative">
              <input
                type="text"
                className="peer block w-full rounded-lg border-transparent bg-gray-100 px-4 py-2 ps-11 text-sm placeholder-zinc-500 disabled:pointer-events-none disabled:opacity-50"
                placeholder="Unidad"
              />
              <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-4 peer-disabled:pointer-events-none peer-disabled:opacity-50">
                <FaCar color="#343a40" />
              </div>
            </div>

            <div>Duracion: (Ida desde el Aeropuerto) Calculando ...</div>

            <div className="btnTep">
              <button
                type="button"
                className="inline-flex h-8 items-center gap-x-2 rounded-lg border border-transparent bg-blue-600 px-2 py-1 text-sm font-medium text-white hover:bg-blue-700 focus:bg-blue-700 focus:outline-none disabled:pointer-events-none disabled:opacity-50"
              >
                Pasajero
              </button>

              <button
                type="button"
                className="inline-flex h-8 items-center gap-x-2 rounded-lg border border-transparent bg-blue-600 px-2 py-1 text-sm font-medium text-white hover:bg-blue-700 focus:bg-blue-700 focus:outline-none disabled:pointer-events-none disabled:opacity-50"
              >
                Ruta
              </button>
              <button
                type="button"
                className="inline-flex h-8 items-center gap-x-2 rounded-lg border border-transparent bg-blue-600 px-2 py-1 text-sm font-medium text-white hover:bg-blue-700 focus:bg-blue-700 focus:outline-none disabled:pointer-events-none disabled:opacity-50"
              >
                Calcular
              </button>
            </div>
          </div>
        </div>
      </div>
    </SortableContext>
  );
}
