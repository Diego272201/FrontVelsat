import React, { useEffect, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import SortableItem from './sortable_item';
import App from '@/app/components/TimePicker';
import { FaCar } from 'react-icons/fa';
import { FaUserTie } from 'react-icons/fa6';
import {
  GoogleMap,
  Marker,
  useJsApiLoader,
} from '@react-google-maps/api';
import axios from 'axios';

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
}

interface ContainerProps {
  id: string;
  items: ItemData[];
  grupo: Grupo;
  conductorCodigo: string;
  unidadCodigo: string;
  onUpdateGrupo: (id: number, nuevaFecha: string) => void;
  onUpdateConductor?: (id: number, conductorCodigo: number) => void;
  onUpdateUnidad?: (id: number, unidadCodigo: string) => void;
  
}

const center = {
  lat: -12.0464,
  lng: -77.0428,
};

export default function Container({
  id,
  items,
  grupo,
  conductorCodigo,
  unidadCodigo,
  onUpdateGrupo,
  onUpdateConductor,
  onUpdateUnidad,
}: ContainerProps) {

  const [startDate, setStartDate] = useState<string>(grupo?.fecha || '');
  const [endDate, setEndDate] = useState<string>(grupo?.horaprog || '');

  const [conductor, setConductor] = useState<string>("");
  const [conductores, setConductores] = useState<{ codigo: number; apepate: string }[]>([]);
  const [filteredOptions, setFilteredOptions] = useState<{ codigo: number; apepate: string }[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);


  const [unidad, setUnidad] = useState<string>("");
  const [unidades, setUnidades] = useState<{ id: number; codunidad: string }[]>([]);
  const [filteredUnidades, setFilteredUnidades] = useState<{ id: number; codunidad: string }[]>([]);
  const [showDropdownUnidad, setShowDropdownUnidad] = useState(false);


  useEffect(() => {
    const fetchConductores = async () => {
      try {
        const response = await axios.get(
          'http://66.240.210.125:8586/api/Preplan/conductores?usuario=movilbus',
        );
        setConductores(response.data);
      } catch (error) {
        console.error('Error al obtener conductores:', error);
      }
    };

    const fetchUnidades = async () => {
      try {
        const response = await axios.get(
          'http://66.240.210.125:8586/api/Preplan/unidades',
        );
        setUnidades(response.data);
      } catch (error) {
        console.error('Error al obtener unidades:', error);
      }
    };

    fetchConductores();
    fetchUnidades();
  }, []);



  
  const handleConductorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newConductor = event.target.value;
    setConductor(newConductor);

    if (newConductor.trim() === '') {
      setFilteredOptions([]);
      setShowDropdown(false);
      return;
    }

    const filtered = conductores.filter((c) =>
      c.apepate.toLowerCase().includes(newConductor.toLowerCase()),
    );

    setFilteredOptions(filtered);
    setShowDropdown(filtered.length > 0);
  };

  const handleSelectConductor = (codigo: number, apepate: string) => {
    console.log(`🚗 Conductor seleccionado: ${apepate} (Código: ${codigo})`);
    setConductor(apepate); // Mostrar el nombre en el input
    setShowDropdown(false);

    if (onUpdateConductor) {
      onUpdateConductor(grupo.id, codigo); // Guardar el código
    } else {
      console.warn('onUpdateConductor no está definido.');
    }
  };

  const handleUnidadChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newUnidad = event.target.value;
    setUnidad(newUnidad);

    if (newUnidad.trim() === '') {
      setFilteredUnidades([]);
      setShowDropdownUnidad(false);
      return;
    }

    const filtered = unidades.filter((u) =>
      (u.codunidad ?? '').toLowerCase().includes(newUnidad.toLowerCase()),
    );

    setFilteredUnidades(filtered);
    setShowDropdownUnidad(filtered.length > 0);
  };

  const handleSelectUnidad = (codunidad: string) => {
    console.log(`🚌 Unidad seleccionada: ${codunidad}`);
    setUnidad(codunidad);
    setShowDropdownUnidad(false);

    if (onUpdateUnidad) {
      onUpdateUnidad(grupo.id, codunidad);
    } else {
      console.warn('onUpdateUnidad no está definido.');
    }
  };

  const handleStartDateSelect = (date: string) => {
    setStartDate(date);
  };

  const formatDateToCustom = (fecha?: string) => {
    if (!fecha) return '';

    const isoRegex = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
    const match = fecha.match(isoRegex);

    if (!match) return '';

    const [, year, month, day, hours, minutes] = match;
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const handleEndDateSelect = (date: string) => {
    console.log('Fecha seleccionada antes de conversión:', date);

    setEndDate(date);

    const formattedDate = formatDateToCustom(date);

    if (!formattedDate) {
      console.error('Error: Fecha inválida después de conversión.');
      return;
    }

    console.log('Fecha convertida a formato deseado:', formattedDate);
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

  const formatDateToISO = (fecha?: string) => {
    if (!fecha) return '';

    const regex = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/;
    const match = fecha.match(regex);

    if (!match) return '';

    const [, day, month, year, hours, minutes] = match;
    return `${year}-${month}-${day}T${hours}:${minutes}`;
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
          padding: '0px 0 0px 0px',
          flex: 1,
          marginBottom: 10,
          border: '1px solid white',
        }}
      >
        <table className="rwd-table">
          <thead style={{ color: '#fff' }}>
            <tr>
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
                className="peer block w-96 rounded-lg border-transparent bg-gray-100 px-16 py-2 ps-11 text-sm placeholder-zinc-500  disabled:pointer-events-none disabled:opacity-50"
                placeholder="Conductor"
                value={conductor}
                onChange={handleConductorChange}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              />

              <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-4 peer-disabled:pointer-events-none peer-disabled:opacity-50">
                <FaUserTie color="#343a40" />
              </div>

              {showDropdown && filteredOptions.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full rounded-lg bg-white shadow-lg">
                  {filteredOptions.map((conductor) => (
                    <li
                      key={conductor.codigo}
                      className="cursor-pointer px-4 py-2 hover:bg-gray-200"
                      onClick={() =>
                        handleSelectConductor(
                          conductor.codigo,
                          conductor.apepate,
                        )
                      }
                    >
                      {conductor.apepate}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="relative">
              <input
                type="text"
                className="peer block w-full rounded-lg border-transparent bg-gray-100 px-4 py-2 ps-11 text-sm placeholder-zinc-500 disabled:pointer-events-none disabled:opacity-50"
                placeholder="Unidad"
                value={unidad}
                onChange={handleUnidadChange}
                onFocus={() => setShowDropdownUnidad(true)}
                onBlur={() =>
                  setTimeout(() => setShowDropdownUnidad(false), 200)
                }
              />
              <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-4 peer-disabled:pointer-events-none peer-disabled:opacity-50">
                <FaCar color="#343a40" />
              </div>

              {showDropdownUnidad && filteredUnidades.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full rounded-lg bg-white shadow-lg">
                  {filteredUnidades.map((unidad) => (
                    <li
                      key={unidad.id}
                      className="cursor-pointer px-4 py-2 hover:bg-gray-200"
                      onClick={() => handleSelectUnidad(unidad.codunidad)}
                    >
                      {unidad.codunidad}
                    </li>
                  ))}
                </ul>
              )}
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

                      {/* Muestra el mapa solo si la API está cargada */}
                      {isLoaded ? (
                        <div className="h-[500px] w-full">
                          <GoogleMap
                            mapContainerStyle={{
                              width: '100%',
                              height: '100%',
                            }}
                            center={center}
                            zoom={14}
                          >
                            <Marker position={center} />
                          </GoogleMap>
                        </div>
                      ) : (
                        <p>Cargando mapa...</p>
                      )}

                      {/* Botón para cerrar */}
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
