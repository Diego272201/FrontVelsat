import React, { useEffect, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import SortableItem from './sortable_item';
import App from '@/app/components/TimePicker';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import {
  formatDate,
  formatDateToISO,
} from '@/app/components/dates/convertToCustomFormat ';
import InputUnidad from '@/app/components/inputs/InputUnidad';
import InputConductor from '@/app/components/inputs/InputConductor';

// Esta la estructura de cada tabla, lo usamos para formar los grupos

interface ItemData {
  id: string;
  numGrupo: number;
  orderItem: number;
  nombre: string;
  distrito: string;
  direccion: string;
  fechaItem: string;
  area: string;
  acciones: React.ReactNode;
}

interface Grupo {
  id: number;
  tipo: string;
  empresa: string;
  destinoGrupo: string;
  fecha: string;
  horaprog: string;
  conductor: string;
  unidad: string;
}

interface ContainerProps {
  id: string;
  items: ItemData[];
  grupo: Grupo;
  onUpdateGrupo: (id: number, nuevaFecha: string) => void;
  onUpdateConductor?: (id: number, conductorCodigo: number) => void;
  onUpdateUnidad?: (id: number, unidadCodigo: string) => void;
  coordenadas?: { wx: string; wy: string }[];
}

const center = {
  lat: -12.0464,
  lng: -77.0428,
};

export default function Container({
  id,
  items,
  grupo,
  onUpdateGrupo,
  onUpdateConductor,
  onUpdateUnidad,
  coordenadas,
}: ContainerProps) {
  
  const [startDate, setStartDate] = useState<string>(grupo?.fecha || '');
  const [endDate, setEndDate] = useState<string>(grupo?.horaprog || '');
  const [conductor, setConductor] = useState(grupo.conductor || '');
  const [unidad, setUnidad] = useState(grupo.unidad || '');
  const [isOpen, setIsOpen] = useState(false);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
  });

  const [mapCenter, setMapCenter] = useState(center);

  useEffect(() => {
    if (coordenadas && coordenadas.length > 0) {
      const firstCoord = coordenadas[0];
      setMapCenter({
        lat: parseFloat(firstCoord.wy),
        lng: parseFloat(firstCoord.wx),
      });
    }
  }, [coordenadas]);

  const handleStartDateSelect = (date: string) => {
    setStartDate(date);
  };

  const handleEndDateSelect = (date: string) => {
    setEndDate(date);
    const formattedDate = formatDate(date);

    if (!formattedDate) {
      console.error('Error: Fecha inválida después de conversión.');
      return;
    }

    onUpdateGrupo(grupo.id, formattedDate);
  };

  useEffect(() => {
    if (grupo?.fecha) {
      setStartDate(grupo.fecha);
    }
  }, [grupo]);

  useEffect(() => {
    if (grupo?.horaprog) {
      setEndDate(grupo.horaprog);
    }
  }, [grupo]);

  const { setNodeRef } = useDroppable({
    id,
  });

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
          padding: '0px 0 0px 0px',
          flex: 1,
          marginBottom: 10,
          border: '1px solid white',
        }}
      >
        <table className="rwd-table">
          <thead style={{ color: '#fff'}}>
            <tr className="px-[5px]">
              <th>Grupo: {grupo.id}</th>
              <th>Tipo: {grupo.tipo}</th>
              <th>Empresa: {grupo.empresa}</th>
              <th>Destino: {grupo.destinoGrupo}</th>

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
                  <App
                    onDateSelect={handleStartDateSelect}
                    height="30px"
                    borderRadius="0"
                    initialDateTime={formatDateToISO(grupo.fecha)}
                  />
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
                  Fin :
                  <App
                    onDateSelect={handleEndDateSelect}
                    height="30px"
                    borderRadius="0"
                    initialDateTime={formatDateToISO(grupo.horaprog)}
                  />
                </div>
              </th>
              <th>Tarifa: Tarifa Delta Delta</th>
            </tr>

            <tr >
              <th >
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
              <InputConductor
                value={conductor}
                onChange={setConductor}
                onSelect={(codigo, apepate) => {
                  setConductor(apepate);
                  onUpdateConductor?.(grupo.id, codigo);
                }}
              />
            </div>

            <div className="relative">
              <InputUnidad
                value={unidad}
                onChange={setUnidad}
                onSelect={(codunidad) => {
                  setUnidad(codunidad);
                  onUpdateUnidad?.(grupo.id, codunidad);
                }}
              />
            </div>

            <div>Duracion: (Ida desde el Aeropuerto) Calculando ...</div>

            <div className="btnTep">
              <button
                type="button"
                className="inline-flex h-8 items-center gap-x-2 rounded-lg border border-transparent bg-blue-600 px-2 py-1 text-sm font-medium text-white hover:bg-blue-700 focus:bg-blue-700 focus:outline-none disabled:pointer-events-none disabled:opacity-50"
              >
                Pasajero
              </button>

              <div>
                <button
                  type="button"
                  onClick={() => setIsOpen(true)}
                  className="inline-flex h-8 items-center gap-x-2 rounded-lg border border-transparent bg-blue-600 px-2 py-1 text-sm font-medium text-white hover:bg-blue-700 focus:bg-blue-700 focus:outline-none disabled:pointer-events-none disabled:opacity-50"
                >
                  Ruta
                </button>

                {isOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="z-60 relative w-full max-w-2xl rounded-lg bg-white p-6 shadow-lg">
                      <h2 className="mb-4 text-lg font-semibold">
                        Ruta programada - Grupo 1
                      </h2>

                      {isLoaded ? (
                        <div className="h-[500px] w-full">
                          <GoogleMap
                            mapContainerStyle={{
                              width: '100%',
                              height: '100%',
                            }}
                            center={mapCenter}
                            zoom={15}
                          >
                            {coordenadas?.map((coord, index) => (
                              <Marker
                                key={index}
                                position={{
                                  lat: parseFloat(coord.wy),
                                  lng: parseFloat(coord.wx),
                                }}
                              />
                            ))}
                          </GoogleMap>
                        </div>
                      ) : (
                        <p>Cargando mapa...</p>
                      )}

                      <button
                        onClick={() => setIsOpen(false)}
                        className="mt-4 rounded-lg bg-red-500 px-4 py-2 text-white hover:bg-red-600"
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                )}
              </div>

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
