import React, { useEffect, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import SortableItem from './sortable_item';
import { useJsApiLoader } from '@react-google-maps/api';
import {
  formatDate,
  formatDateToISO,
} from '@/app/components/dates/convertToCustomFormat ';
import InputUnidad from '@/app/components/inputs/InputUnidad';
import InputConductor from '@/app/components/inputs/InputConductor';
import { getMarkerSVG } from '@/app/components/ui/getMarkerSVG';
import ModalAgregarPasajero from './ModalAgregarPasajero';
import ModalMapa from './ModalRuta';
import { toast } from 'sonner';
import { GoAlertFill } from 'react-icons/go';
import ModalDestino from '../ModalDestino';
import { IoTime } from 'react-icons/io5';
import { DateTimePicker } from '@/app/dashboard/DateTimePicker';

const libraries: 'places'[] = ['places'];

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
  onUpdateGrupoHoraProg: (id: number, nuevaFecha: string) => void;
  onUpdateConductor?: (id: number, conductorCodigo: number) => void;
  onUpdateUnidad?: (id: number, unidadCodigo: string) => void;
  coordenadas?: {
    wx: string;
    wy: string;
    nombre?: string;
    direccion?: string;
  }[];
  onRefrescarDatos?: () => void;
  onUpdateDestino: (
    id: number,
    nuevoDestino: string,
    codigoDestino: string,
  ) => void;
}

type MarkerData = {
  wx: string;
  wy: string;
  nombre?: string;
  direccion?: string;
};

export default function Container({
  id,
  items,
  grupo,
  onUpdateGrupoHoraProg,
  onUpdateConductor,
  onUpdateUnidad,
  coordenadas,
  onRefrescarDatos,
  onUpdateDestino,
}: ContainerProps) {



console.log(`=== CONTAINER GRUPO ${grupo.id} ===`);
console.log("grupo.tipo:", grupo.tipo);
console.log("grupo.horaprog:", grupo.horaprog);
console.log("grupo.fecha:", grupo.fecha);

console.log("formatDateToISO(grupo.horaprog):", formatDateToISO(grupo.horaprog));
console.log("formatDateToISO(grupo.fecha):", formatDateToISO(grupo.fecha));

  const [startDate, setStartDate] = useState<string>(grupo?.fecha || '');
  const [endDate, setEndDate] = useState<string>(grupo?.horaprog || '');

  const [conductor, setConductor] = useState(grupo.conductor || '');
  const [unidad, setUnidad] = useState(grupo.unidad || '');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<MarkerData | null>(null);

  const [diferencia, setDiferencia] = useState<{
    horas: number;
    minutos: number;
  } | null>(null);

  const [fechaInicio, setFechaInicio] = useState<Date | null>(null);
  const [fechaFin, setFechaFin] = useState<Date | null>(null);


  

useEffect(() => {
  const fechaInicio =
    grupo.tipo === 'I'
      ? formatDateToISO(grupo.horaprog)
      : formatDateToISO(grupo.fecha);
  const fechaFin =
    grupo.tipo === 'S'
      ? formatDateToISO(grupo.horaprog)
      : formatDateToISO(grupo.fecha);

  // ✅ SOLUCIÓN: Solo crear Date si la string no está vacía
  setFechaInicio(fechaInicio ? new Date(fechaInicio) : null);
  setFechaFin(fechaFin ? new Date(fechaFin) : null);
}, [grupo]);




  useEffect(() => {
    const fechaInicioValida =
      fechaInicio instanceof Date && !isNaN(fechaInicio.getTime());
    const fechaFinValida =
      fechaFin instanceof Date && !isNaN(fechaFin.getTime());

    if (fechaInicioValida && fechaFinValida) {
      const diferenciaEnMs = Math.abs(
        fechaFin.getTime() - fechaInicio.getTime(),
      );
      const diferenciaEnMinutos = Math.floor(diferenciaEnMs / (1000 * 60));

      const horas = Math.floor(diferenciaEnMinutos / 60);
      const minutos = diferenciaEnMinutos % 60;

      setDiferencia({ horas, minutos });
    } else {
      setDiferencia(null);
    }
  }, [fechaInicio, fechaFin]);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
    libraries,
  });

  const handleStartDateSelect = (date: string) => {
    if (grupo.tipo !== 'I') {
      toast.error(
        'Has cambiado la fecha de inicio, pero no está permitido actualizarla para este grupo.',
      );
      return;
    }
    setStartDate(date);
    if (date === '') {
      onUpdateGrupoHoraProg(grupo.id, '');
      return;
    }

    const formattedDate = formatDate(date);
    if (!formattedDate) {
      console.error('Error: Fecha inválida después de conversión.');
      return;
    }

    onUpdateGrupoHoraProg(grupo.id, formattedDate);
  };

  const handleEndDateSelect = (date: string) => {
    if (grupo.tipo !== 'S') {
      toast.error(
        'Has cambiado la fecha de fin, pero no está permitido actualizarla para este grupo.',
      );
      return;
    }

    setEndDate(date);

    if (date === '') {
      onUpdateGrupoHoraProg(grupo.id, '');
      return;
    }

    const formattedDate = formatDate(date);
    if (!formattedDate) {
      console.error('Error: Fecha inválida después de conversión.');
      return;
    }

    onUpdateGrupoHoraProg(grupo.id, formattedDate);
  };

  const formatearNombre = (texto: string) => {
    return texto
      .toLowerCase()
      .split(' ')
      .map((palabra) => palabra.charAt(0).toUpperCase() + palabra.slice(1))
      .join(' ');
  };



useEffect(() => {
  setStartDate(grupo?.fecha || '');
}, [grupo]);

useEffect(() => {
  setEndDate(grupo?.horaprog || ''); 
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
          background: 'white',
          padding: '0px 0 0px 0px',
          flex: 1,
          marginBottom: 10,
          border: '1px solid white',
        }}
      >
        <table className="rwd-table">
          <thead style={{ color: '#fff' }}>
            <tr className="px-[5px]">
              <th>Grupo: {grupo.id}</th>
              <th>
                Tipo:{' '}
                {grupo.tipo === 'I'
                  ? 'Ingreso'
                  : grupo.tipo === 'S'
                    ? 'Salida'
                    : grupo.tipo}
              </th>
              <th>Empresa: {formatearNombre(grupo.empresa)}</th>
              <th>
                <div className="flex items-center">
                  Destino:{' '}
                  {grupo.destinoGrupo
                    .toLowerCase()
                    .split(' ')
                    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
                    .join(' ')}
                  <ModalDestino
                    onDestinoSeleccionado={(nuevoDestino, codigoDestino) => {
                      onUpdateDestino(grupo.id, nuevoDestino, codigoDestino);
                    }}
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
                  Inicio:
                  <DateTimePicker
                    initialDateTime={
                      grupo.tipo === 'I'
                        ? formatDateToISO(grupo.horaprog)
                        : formatDateToISO(grupo.fecha)
                    }
                    onDateSelect={handleStartDateSelect}
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
                  Fin:
                  <DateTimePicker
                    initialDateTime={
                      grupo.tipo === 'S'
                        ? formatDateToISO(grupo.horaprog)
                        : formatDateToISO(grupo.fecha)
                    }
                    onDateSelect={handleEndDateSelect}
                  />
                </div>
              </th>

              <th>
                Tarifa:{' '}
                {grupo.empresa === 'REP'
                  ? 'Latam'
                  : grupo.empresa
                      .toLowerCase()
                      .split(' ')
                      .map(
                        (palabra) =>
                          palabra.charAt(0).toUpperCase() + palabra.slice(1),
                      )
                      .join(' ')}
              </th>
            </tr>

            <tr>
              <th>
                <div className="headTable bg-gray-400">
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
            <div className="flex w-[60%] items-center gap-4">
              <div className="w-[380px]">
                <InputConductor
                  value={conductor}
                  onChange={setConductor}
                  onSelect={(codigo, apepate) => {
                    setConductor(apepate);
                    onUpdateConductor?.(grupo.id, codigo);
                  }}
                />
              </div>

              <div>
                <InputUnidad
                  value={unidad}
                  onChange={setUnidad}
                  onSelect={(codunidad) => {
                    setUnidad(codunidad);
                    onUpdateUnidad?.(grupo.id, codunidad);
                  }}
                />
              </div>

              <div className="border  border-gray-200 bg-white px-2 py-[7px] shadow-sm w-[230px]">
                {diferencia ? (
                  <div className="flex items-center space-x-1">
                    <div className="rounded-full bg-blue-100 p-1">
                      <IoTime className="text-blue-600" size={12} />
                    </div>
                    <span className="text-xs text-gray-600">Duración:</span>
                    <span className="text-xs font-semibold text-blue-600">
                      {diferencia.horas}h {diferencia.minutos}min
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1 py-[2px]">
                    <GoAlertFill className="text-amber-500" size={12} />
                    <span className="text-xs font-medium text-amber-600">
                      Define fechas
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="btnTep">
              <ModalAgregarPasajero
                grupo={grupo}
                onRefrescarDatos={onRefrescarDatos}
              ></ModalAgregarPasajero>

              <div>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(true);
                  }}
                  className="obtenerDatosYAgrupar-1 inline-flex h-8 items-center gap-x-2 rounded border border-transparent bg-blue-600 px-2 text-sm font-medium text-white hover:bg-blue-700 focus:bg-blue-700 focus:outline-none disabled:pointer-events-none disabled:opacity-50"
                >
                  Ruta
                </button>

                <ModalMapa
                  isOpen={isOpen}
                  setIsOpen={setIsOpen}
                  grupo={grupo.id}
                  coordenadas={coordenadas}
                  selectedMarker={selectedMarker}
                  setSelectedMarker={setSelectedMarker}
                  isLoaded={isLoaded}
                  getMarkerSVG={getMarkerSVG}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </SortableContext>
  );
}
