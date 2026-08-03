import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import SortableItem, {
  Item,
  type ItemData,
  type ItemActionCallbacks,
} from './sortable_item';
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
import { useUsername } from '@/hooks/useUsername';

/**
 * Datos escalares del grupo. Se construye con useMemo a partir de los campos
 * primitivos, de modo que reordenar pasajeros (que sí crea un objeto de grupo
 * nuevo) NO cambie su identidad y la cabecera y el pie puedan memoizarse.
 */
export interface GrupoInfo {
  id: number;
  tipo: string;
  empresa: string;
  destinoGrupo: string;
  destinocodigo?: string;
  fecha: string;
  horaprog: string;
  conductor: string;
  unidad: string;
  cantidadPasajeros?: number;
}

type MarkerData = {
  wx: string;
  wy: string;
  nombre?: string;
  direccion?: string;
};

const MINUTOS_POR_DIA = 24 * 60;
/** Por encima de esto la "duración" delata fechas de días distintos. */
const MAX_DURACION_MINUTOS = MINUTOS_POR_DIA;

const formatearNombre = (texto: string) =>
  texto
    .toLowerCase()
    .split(' ')
    .map((palabra) => palabra.charAt(0).toUpperCase() + palabra.slice(1))
    .join(' ');

/* -------------------------------------------------------------------------- */
/* Cabecera                                                                    */
/* -------------------------------------------------------------------------- */

interface GrupoCabeceraProps {
  grupo: GrupoInfo;
  onUpdateGrupoHoraProg: (id: number, nuevaFecha: string) => void;
  onUpdateDestino: (
    id: number,
    nuevoDestino: string,
    codigoDestino: string,
  ) => void;
}

const GrupoCabecera = memo(function GrupoCabecera({
  grupo,
  onUpdateGrupoHoraProg,
  onUpdateDestino,
}: GrupoCabeceraProps) {
  const handleStartDateSelect = useCallback(
    (date: string) => {
      if (grupo.tipo !== 'I') {
        toast.error(
          'Has cambiado la fecha de inicio, pero no está permitido actualizarla para este grupo.',
        );
        return;
      }

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
    },
    [grupo.id, grupo.tipo, onUpdateGrupoHoraProg],
  );

  const handleEndDateSelect = useCallback(
    (date: string) => {
      if (grupo.tipo !== 'S') {
        toast.error(
          'Has cambiado la fecha de fin, pero no está permitido actualizarla para este grupo.',
        );
        return;
      }

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
    },
    [grupo.id, grupo.tipo, onUpdateGrupoHoraProg],
  );

  return (
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
              Destino: {formatearNombre(grupo.destinoGrupo)}
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
            {grupo.empresa === 'REP' ? 'Latam' : formatearNombre(grupo.empresa)}
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
  );
});

/* -------------------------------------------------------------------------- */
/* Filas + arrastre                                                            */
/* -------------------------------------------------------------------------- */

interface GrupoFilasProps {
  uid: string;
  items: ItemData[];
  disabled: boolean;
  actionCallbacks?: ItemActionCallbacks;
  onReordenar: (uid: string, desdeIndice: number, hastaIndice: number) => void;
  /** Solo los de ESTE grupo. Al venir por grupo, seleccionar en uno no cambia
   *  la referencia que reciben los demás y su memo sigue cortando. */
  seleccionados?: string[];
  resaltados?: string[];
}

/**
 * Cada grupo tiene su PROPIO DndContext. Es lo que mantiene el arrastre
 * instantáneo: dnd-kit mide y compara únicamente los droppables registrados en
 * su contexto, así que arrastrar entre 12 pasajeros cuesta 12, no 2000.
 * Como contrapartida no se puede arrastrar de un grupo a otro; eso se hace con
 * la acción explícita de mover.
 */
const GrupoFilas = memo(function GrupoFilas({
  uid,
  items,
  disabled,
  actionCallbacks,
  onReordenar,
  seleccionados,
  resaltados,
}: GrupoFilasProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const setSeleccionados = useMemo(
    () => new Set(seleccionados ?? []),
    [seleccionados],
  );
  const setResaltados = useMemo(
    () => new Set(resaltados ?? []),
    [resaltados],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const itemIds = useMemo(() => items.map((item) => item.id), [items]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  // El estado se actualiza solo al soltar. Durante el arrastre no tocamos
  // nada: dnd-kit se encarga de la animación intermedia.
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);

      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const desdeIndice = items.findIndex((item) => item.id === active.id);
      const hastaIndice = items.findIndex((item) => item.id === over.id);
      if (desdeIndice === -1 || hastaIndice === -1) return;

      onReordenar(uid, desdeIndice, hastaIndice);
    },
    [items, onReordenar, uid],
  );

  const itemActivo = activeId
    ? items.find((item) => item.id === activeId)
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        {items.map((item) => (
          <SortableItem
            key={item.id}
            id={item.id}
            data={item}
            disabled={disabled}
            actionCallbacks={actionCallbacks}
            seleccionado={setSeleccionados.has(item.id)}
            resaltado={setResaltados.has(item.id)}
          />
        ))}
      </SortableContext>

      <DragOverlay>{itemActivo ? <Item {...itemActivo} /> : null}</DragOverlay>
    </DndContext>
  );
});

/* -------------------------------------------------------------------------- */
/* Pie                                                                         */
/* -------------------------------------------------------------------------- */

interface GrupoPieProps {
  grupo: GrupoInfo;
  onUpdateConductor?: (id: number, conductorCodigo: number) => void;
  onUpdateUnidad?: (id: number, unidadCodigo: string) => void;
  onRefrescarDatos?: () => void;
  onAbrirRuta: () => void;
}

const GrupoPie = memo(function GrupoPie({
  grupo,
  onUpdateConductor,
  onUpdateUnidad,
  onRefrescarDatos,
  onAbrirRuta,
}: GrupoPieProps) {
  const { username } = useUsername();
  const [conductor, setConductor] = useState(grupo.conductor || '');
  const [unidad, setUnidad] = useState(grupo.unidad || '');

  // Antes eran dos estados con dos efectos encadenados; es un cálculo derivado.
  const diferencia = useMemo(() => {
    const inicioISO =
      grupo.tipo === 'I'
        ? formatDateToISO(grupo.horaprog)
        : formatDateToISO(grupo.fecha);
    const finISO =
      grupo.tipo === 'S'
        ? formatDateToISO(grupo.horaprog)
        : formatDateToISO(grupo.fecha);

    const inicio = inicioISO ? new Date(inicioISO) : null;
    const fin = finISO ? new Date(finISO) : null;

    if (
      !inicio ||
      !fin ||
      isNaN(inicio.getTime()) ||
      isNaN(fin.getTime())
    ) {
      return null;
    }

    const totalMinutos = Math.floor(
      Math.abs(fin.getTime() - inicio.getTime()) / (1000 * 60),
    );

    return {
      horas: Math.floor(totalMinutos / 60),
      minutos: totalMinutos % 60,
      dias: Math.round(totalMinutos / MINUTOS_POR_DIA),
      // Un servicio dura horas, no días. Si sale algo mayor es que fecha y
      // horaprog no son del mismo día, así que mostramos un aviso en vez de
      // una cifra de cuatro dígitos que no significa nada.
      esAnomala: totalMinutos > MAX_DURACION_MINUTOS,
    };
  }, [grupo.tipo, grupo.fecha, grupo.horaprog]);

  return (
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
            {username && (
              <InputUnidad
                value={unidad}
                onChange={setUnidad}
                onSelect={(codunidad) => {
                  setUnidad(codunidad);
                  onUpdateUnidad?.(grupo.id, codunidad);
                }}
                usuario={username}
              />
            )}
          </div>

          {/* Indicador de estado, no un campo: sin fondo blanco, sin borde y
              sin ancho fijo, para que no se confunda con los inputs vecinos. */}
          {/* Mismo alto, borde y redondeo que los inputs de Conductor y
              Unidad, para que la fila del footer quede alineada. */}
          {diferencia && diferencia.esAnomala ? (
            <div
              title={`Inicio y fin están separados ${diferencia.dias} días (${diferencia.horas}h ${diferencia.minutos}min). Revisa la fecha y la hora programada del grupo.`}
              className="flex h-8 w-fit cursor-help items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5"
            >
              <GoAlertFill className="shrink-0 text-gray-700" size={12} />
              <span className="whitespace-nowrap text-[11px] font-semibold text-gray-800">
                Revisa las fechas
              </span>
              <span className="whitespace-nowrap text-[11px] text-gray-500">
                {diferencia.dias} d
              </span>
            </div>
          ) : diferencia ? (
            <div className="flex h-8 w-fit items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5">
              <IoTime className="shrink-0 text-[#113eb9]" size={13} />
              <span className="whitespace-nowrap text-[11px] text-gray-600">
                Duración
              </span>
              <span className="whitespace-nowrap text-[11px] font-bold text-[#113eb9]">
                {diferencia.horas}h {diferencia.minutos}min
              </span>
            </div>
          ) : (
            <div className="flex h-8 w-fit items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5">
              <GoAlertFill className="shrink-0 text-red-600" size={12} />
              <span className="whitespace-nowrap text-[11px] font-semibold text-red-600">
                Define fechas
              </span>
            </div>
          )}
        </div>

        <div className="btnTep">
          <ModalAgregarPasajero
            grupo={grupo}
            onRefrescarDatos={onRefrescarDatos}
          />

          <div>
            <button
              type="button"
              onClick={onAbrirRuta}
              className="obtenerDatosYAgrupar-1 inline-flex h-8 items-center gap-x-2 rounded border border-transparent bg-blue-600 px-2 text-sm font-medium text-white hover:bg-blue-700 focus:bg-blue-700 focus:outline-none disabled:pointer-events-none disabled:opacity-50"
            >
              Ruta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

/* -------------------------------------------------------------------------- */
/* Grupo completo                                                              */
/* -------------------------------------------------------------------------- */

interface ContainerProps {
  uid: string;
  items: ItemData[];
  grupo: GrupoInfo & { personas?: any[] };
  onReordenar: (uid: string, desdeIndice: number, hastaIndice: number) => void;
  onUpdateGrupoHoraProg: (id: number, nuevaFecha: string) => void;
  onUpdateConductor?: (id: number, conductorCodigo: number) => void;
  onUpdateUnidad?: (id: number, unidadCodigo: string) => void;
  coordenadas?: MarkerData[];
  onRefrescarDatos?: () => void;
  onUpdateDestino: (
    id: number,
    nuevoDestino: string,
    codigoDestino: string,
  ) => void;
  actionCallbacks?: ItemActionCallbacks;
  seleccionados?: string[];
  resaltados?: string[];
}

const Container = memo(function Container({
  uid,
  items,
  grupo,
  onReordenar,
  onUpdateGrupoHoraProg,
  onUpdateConductor,
  onUpdateUnidad,
  coordenadas: coordenadasProp,
  onRefrescarDatos,
  onUpdateDestino,
  actionCallbacks,
  seleccionados,
  resaltados,
}: ContainerProps) {
  const [rutaAbierta, setRutaAbierta] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<MarkerData | null>(null);

  // Identidad estable mientras no cambie ningún campo escalar del grupo, para
  // que reordenar pasajeros no re-renderice cabecera ni pie.
  const grupoInfo = useMemo<GrupoInfo>(
    () => ({
      id: grupo.id,
      tipo: grupo.tipo,
      empresa: grupo.empresa,
      destinoGrupo: grupo.destinoGrupo,
      destinocodigo: grupo.destinocodigo,
      fecha: grupo.fecha,
      horaprog: grupo.horaprog,
      conductor: grupo.conductor,
      unidad: grupo.unidad,
      cantidadPasajeros: grupo.cantidadPasajeros,
    }),
    [
      grupo.id,
      grupo.tipo,
      grupo.empresa,
      grupo.destinoGrupo,
      grupo.destinocodigo,
      grupo.fecha,
      grupo.horaprog,
      grupo.conductor,
      grupo.unidad,
      grupo.cantidadPasajeros,
    ],
  );

  const abrirRuta = useCallback(() => setRutaAbierta(true), []);

  // Solo se recalcula al abrir el modal de ruta.
  const coordenadas = useMemo(() => {
    if (!rutaAbierta) return [];
    if (coordenadasProp && coordenadasProp.length > 0) return coordenadasProp;
    return items
      .filter((p) => p.wx && p.wy)
      .map((p) => ({
        wx: p.wx,
        wy: p.wy,
        nombre: p.nombre,
        direccion: p.direccion,
      }));
  }, [rutaAbierta, items, coordenadasProp]);

  return (
    <div
      // Ancla para poder desplazar la vista hasta este grupo tras un movimiento.
      id={`grupo-${uid}`}
      style={{
        background: 'white',
        padding: '0px 0 0px 0px',
        flex: 1,
        marginBottom: 10,
        border: '1px solid white',
      }}
    >
      <GrupoCabecera
        grupo={grupoInfo}
        onUpdateGrupoHoraProg={onUpdateGrupoHoraProg}
        onUpdateDestino={onUpdateDestino}
      />

      <GrupoFilas
        uid={uid}
        items={items}
        disabled={rutaAbierta}
        actionCallbacks={actionCallbacks}
        onReordenar={onReordenar}
        seleccionados={seleccionados}
        resaltados={resaltados}
      />

      <GrupoPie
        grupo={grupoInfo}
        onUpdateConductor={onUpdateConductor}
        onUpdateUnidad={onUpdateUnidad}
        onRefrescarDatos={onRefrescarDatos}
        onAbrirRuta={abrirRuta}
      />

      {rutaAbierta && (
        <ModalMapa
          isOpen={rutaAbierta}
          setIsOpen={setRutaAbierta}
          grupo={grupo.id}
          coordenadas={coordenadas}
          selectedMarker={selectedMarker}
          setSelectedMarker={setSelectedMarker}
          getMarkerSVG={getMarkerSVG}
        />
      )}
    </div>
  );
});

export default Container;
