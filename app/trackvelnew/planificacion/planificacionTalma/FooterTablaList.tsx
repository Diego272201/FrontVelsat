'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { User, Car, Check, Users, Search } from 'lucide-react';
import { Grupo } from './types';
import ModalMapa from '../planificacionTep/ModalRuta';
import { getMarkerSVG } from '@/app/components/ui/getMarkerSVG';
import ModalAgregarPasajero from '../planificacionTep/ModalAgregarPasajero';

interface FooterTablaListProps {
  grupo: Grupo;
  actualizarGrupo: (grupoId: string, campo: keyof Grupo, valor: string) => void;
  grupoEnSeleccion: string | null;
  abrirModalMover: (grupoId: string) => void;
  pasajerosSeleccionados: Set<string>;
  cancelarSeleccion: () => void;
  activarSeleccionMultiple: (grupoId: string) => void;
  conductores: Conductor[];
  unidades: Unidad[];
  onRefrescarDatos?: () => void;
}

type MarkerData = {
  wx: string;
  wy: string;
  nombre?: string;
  direccion?: string;
};

interface Conductor {
  codigo: string;
  apepate: string;
}

interface Unidad {
  id: number;
  codunidad: string;
}

const FooterTablaList: React.FC<FooterTablaListProps> = ({
  grupo,
  actualizarGrupo,
  grupoEnSeleccion,
  abrirModalMover,
  pasajerosSeleccionados,
  cancelarSeleccion,
  activarSeleccionMultiple,
  conductores,
  unidades,
  onRefrescarDatos,
}) => {
  const [mostrarConductores, setMostrarConductores] = useState(false);
  const [mostrarUnidades, setMostrarUnidades] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const [dropdownUnidadPosition, setDropdownUnidadPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [selectedUnidadIndex, setSelectedUnidadIndex] = useState(-1);
  const [modalAgregarPasajeroAbierto, setModalAgregarPasajeroAbierto] =
    useState(false);
  const conductorRef = useRef<HTMLDivElement>(null);
  const unidadRef = useRef<HTMLDivElement>(null);
  const inputConductorRef = useRef<HTMLInputElement>(null);
  const inputUnidadRef = useRef<HTMLInputElement>(null);
  const dropdownConductorRef = useRef<HTMLDivElement>(null);
  const dropdownUnidadRef = useRef<HTMLDivElement>(null);

  const [modalMapaAbierto, setModalMapaAbierto] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<MarkerData | null>(null);

  // Memorizar coordenadas para evitar re-renders innecesarios
  const coordenadas = useMemo(() => {
    return grupo.pasajeros.map((p) => ({
      wx: p._apiData?.direccionPasajero?.wx || '',
      wy: p._apiData?.direccionPasajero?.wy || '',
      nombre: p.nombre,
      direccion: p.direccion,
    }));
  }, [grupo.pasajeros]);

  const calcularPosicionDropdown = (
    inputElement: HTMLInputElement,
    itemsCount: number,
  ) => {
    const rect = inputElement.getBoundingClientRect();

    const headerHeight = 42;
    const itemHeight = 60;
    const maxVisibleItems = Math.min(itemsCount, 3.5);
    const dropdownHeight = headerHeight + itemHeight * maxVisibleItems;

    const top = rect.top + window.scrollY - dropdownHeight + 8;

    return {
      top,
      left: rect.left + window.scrollX,
    };
  };

  useEffect(() => {
    if (mostrarConductores && inputConductorRef.current) {
      const conductoresFiltrados = getConductoresFiltrados();
      const position = calcularPosicionDropdown(
        inputConductorRef.current,
        conductoresFiltrados.length,
      );
      setDropdownPosition({
        ...position,
        width: 360,
      });
    }
  }, [mostrarConductores, grupo.conductor]);

  useEffect(() => {
    if (mostrarUnidades && inputUnidadRef.current) {
      const unidadesFiltradas = getUnidadesFiltradas();
      const position = calcularPosicionDropdown(
        inputUnidadRef.current,
        unidadesFiltradas.length,
      );
      setDropdownUnidadPosition({
        ...position,
        width: 280,
      });
    }
  }, [mostrarUnidades, grupo.unidad]);

  useEffect(() => {
    const handleScroll = (event: Event) => {
      const target = event.target as HTMLElement;

      if (
        dropdownConductorRef.current &&
        dropdownConductorRef.current.contains(target)
      ) {
        return;
      }

      if (
        dropdownUnidadRef.current &&
        dropdownUnidadRef.current.contains(target)
      ) {
        return;
      }

      if (mostrarConductores) {
        setMostrarConductores(false);
        setSelectedIndex(-1);
      }
      if (mostrarUnidades) {
        setMostrarUnidades(false);
        setSelectedUnidadIndex(-1);
      }
    };

    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [mostrarConductores, mostrarUnidades]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        conductorRef.current &&
        !conductorRef.current.contains(event.target as Node)
      ) {
        setMostrarConductores(false);
        setSelectedIndex(-1);
      }
      if (
        unidadRef.current &&
        !unidadRef.current.contains(event.target as Node)
      ) {
        setMostrarUnidades(false);
        setSelectedUnidadIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getConductoresFiltrados = () => {
    if (!grupo.conductor || grupo.conductor.trim() === '') {
      return conductores;
    }
    return conductores.filter((c) =>
      c.apepate.toLowerCase().includes(grupo.conductor.toLowerCase()),
    );
  };

  const getUnidadesFiltradas = () => {
    if (!grupo.unidad || grupo.unidad.trim() === '') {
      return unidades;
    }
    return unidades.filter((u) =>
      u.codunidad.toLowerCase().includes(grupo.unidad.toLowerCase()),
    );
  };

  const conductoresFiltrados = getConductoresFiltrados();
  const unidadesFiltradas = getUnidadesFiltradas();

  const seleccionarConductor = (conductor: Conductor) => {
    actualizarGrupo(grupo.id, 'conductor', conductor.apepate.trim());
    setMostrarConductores(false);
    setSelectedIndex(-1);
  };

  const seleccionarUnidad = (unidad: Unidad) => {
    actualizarGrupo(grupo.id, 'unidad', unidad.codunidad);
    setMostrarUnidades(false);
    setSelectedUnidadIndex(-1);
  };

  const calcularDuracion = (inicio: Date | null, fin: Date | null): string => {
    if (!inicio || !fin) return '0h 0min';

    const diffMs = fin.getTime() - inicio.getTime();

    if (diffMs < 0) return '0h 0min';

    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;

    return `${hours}h ${minutes}min`;
  };

  return (
    <div className="flex items-center justify-between border-t-2 border-orange-300 bg-[#ffd29d] px-4 py-1">
      <div className="flex items-center gap-6">
        {/* Input de Conductor con Autocompletado */}
        <div className="flex items-center gap-2" ref={conductorRef}>
          <User className="h-4 w-4 text-orange-700" />
          <span className="text-[12px] font-semibold text-gray-800">
            Conductor
          </span>
          <div className="relative">
            <input
              ref={inputConductorRef}
              type="text"
              value={grupo.conductor}
              onChange={(e) => {
                actualizarGrupo(grupo.id, 'conductor', e.target.value);
                setMostrarConductores(true);
                setSelectedIndex(-1);
              }}
              onFocus={() => setMostrarConductores(true)}
              className="focus:ring-0.5 w-[350px] rounded-lg border-1 border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 transition-all focus:border-orange-400 focus:ring-orange-400"
              placeholder="Buscar Conductor"
            />
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>

          {/* Dropdown de Conductores */}
          {mostrarConductores &&
            conductores.length > 0 &&
            conductoresFiltrados.length > 0 &&
            createPortal(
              <div
                ref={dropdownConductorRef}
                className="max-h-60 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl"
                style={{
                  position: 'absolute',
                  top: `${dropdownPosition.top}px`,
                  left: `${dropdownPosition.left}px`,
                  width: `${dropdownPosition.width}px`,
                  zIndex: 99999,
                }}
              >
                <div className="sticky top-0 border-b border-orange-200 bg-gradient-to-r from-orange-50 to-orange-100 px-4 py-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-orange-800">
                    Conductores disponibles ({conductoresFiltrados.length})
                  </p>
                </div>
                <div className="scrollbar-thin scrollbar-thumb-orange-300 scrollbar-track-gray-100 max-h-64 overflow-y-auto">
                  {conductoresFiltrados.map((conductor, index) => (
                    <div
                      key={conductor.codigo}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        seleccionarConductor(conductor);
                      }}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`cursor-pointer border-b border-gray-100 px-4 py-3 transition-all duration-150 last:border-b-0 ${
                        selectedIndex === index
                          ? 'border-l-4 border-l-orange-500 bg-gradient-to-r from-orange-50 to-orange-100'
                          : 'border-l-4 border-l-transparent hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100">
                            <User className="h-4 w-4 text-orange-600" />
                          </div>
                          <div>
                            <p
                              className={`text-[11px] font-medium ${selectedIndex === index ? 'text-orange-900' : 'text-gray-900'}`}
                            >
                              {conductor.apepate.trim()}
                            </p>
                            <p className="text-xs text-gray-500">
                              Código: {conductor.codigo}
                            </p>
                          </div>
                        </div>
                        {selectedIndex === index && (
                          <Check className="h-4 w-4 text-orange-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>,
              document.body,
            )}

          {/* Mensaje cuando no hay resultados */}
          {mostrarConductores &&
            conductores.length > 0 &&
            conductoresFiltrados.length === 0 &&
            createPortal(
              <div
                className="rounded-lg border border-gray-200 bg-white shadow-2xl"
                style={{
                  position: 'absolute',
                  top: `${dropdownPosition.top - 170}px`,
                  left: `${dropdownPosition.left}px`,
                  width: `${dropdownPosition.width}px`,
                  zIndex: 99999,
                }}
              >
                <div className="p-8 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                    <Search className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="mb-1 text-sm font-medium text-gray-700">
                    No se encontraron conductores
                  </p>
                  <p className="text-xs text-gray-500">
                    No hay coincidencias con &quot;{grupo.conductor}&quot;
                  </p>
                </div>
              </div>,
              document.body,
            )}
        </div>

        {/* Input de Unidad con Autocompletado */}
        <div className="flex items-center gap-2" ref={unidadRef}>
          <Car className="h-4 w-4 text-orange-700" />
          <span className="text-[12px] font-semibold text-gray-800">
            Unidad
          </span>
          <div className="relative">
            <input
              ref={inputUnidadRef}
              type="text"
              value={grupo.unidad}
              onChange={(e) => {
                actualizarGrupo(grupo.id, 'unidad', e.target.value);
                setMostrarUnidades(true);
                setSelectedUnidadIndex(-1);
              }}
              onFocus={() => setMostrarUnidades(true)}
              className="focus:ring-0.5 w-[180px] rounded-lg border-1 border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 shadow-sm transition-all focus:border-orange-400 focus:ring-orange-400"
              placeholder="Placa"
            />
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>

          {/* Dropdown de Unidades */}
          {mostrarUnidades &&
            unidades.length > 0 &&
            unidadesFiltradas.length > 0 &&
            createPortal(
              <div
                ref={dropdownUnidadRef}
                className="max-h-60 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl"
                style={{
                  position: 'absolute',
                  top: `${dropdownUnidadPosition.top}px`,
                  left: `${dropdownUnidadPosition.left}px`,
                  width: `${dropdownUnidadPosition.width}px`,
                  zIndex: 99999,
                }}
              >
                <div className="sticky top-0 border-b border-orange-200 bg-gradient-to-r from-orange-50 to-orange-100 px-4 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-orange-800">
                    Unidades disponibles ({unidadesFiltradas.length})
                  </p>
                </div>
                <div className="scrollbar-thin scrollbar-thumb-orange-300 scrollbar-track-gray-100 max-h-64 overflow-y-auto">
                  {unidadesFiltradas.map((unidad, index) => (
                    <div
                      key={unidad.id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        seleccionarUnidad(unidad);
                      }}
                      onMouseEnter={() => setSelectedUnidadIndex(index)}
                      className={`cursor-pointer border-b border-gray-100 px-4 py-3 transition-all duration-150 last:border-b-0 ${
                        selectedUnidadIndex === index
                          ? 'border-l-4 border-l-orange-500 bg-gradient-to-r from-orange-50 to-orange-100'
                          : 'border-l-4 border-l-transparent hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100">
                            <Car className="h-4 w-4 text-orange-600" />
                          </div>
                          <p
                            className={`text-[11px] font-medium ${selectedUnidadIndex === index ? 'text-orange-900' : 'text-gray-900'}`}
                          >
                            {unidad.codunidad}
                          </p>
                        </div>
                        {selectedUnidadIndex === index && (
                          <Check className="h-4 w-4 text-orange-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>,
              document.body,
            )}

          {/* Mensaje cuando no hay resultados */}
          {mostrarUnidades &&
            unidades.length > 0 &&
            unidadesFiltradas.length === 0 &&
            createPortal(
              <div
                className="rounded-lg border border-gray-200 bg-white shadow-2xl"
                style={{
                  position: 'absolute',
                  top: `${dropdownUnidadPosition.top}px`,
                  left: `${dropdownUnidadPosition.left}px`,
                  width: `${dropdownUnidadPosition.width}px`,
                  zIndex: 99999,
                }}
              >
                <div className="p-8 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                    <Search className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="mb-1 text-sm font-medium text-gray-700">
                    No se encontraron unidades
                  </p>
                  <p className="text-xs text-gray-500">
                    No hay coincidencias con &quot;{grupo.unidad}&quot;
                  </p>
                </div>
              </div>,
              document.body,
            )}
        </div>

        <span className="text-[12px] font-semibold text-gray-800">
          Duración: {calcularDuracion(grupo.inicio, grupo.fin)}
        </span>
      </div>

      <div className="flex gap-2">
        {grupoEnSeleccion === grupo.id ? (
          <>
            <button
              onClick={() => abrirModalMover(grupo.id)}
              className="flex items-center gap-1.5 rounded bg-blue-500 px-4 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-blue-600"
            >
              <Check className="h-4 w-4" />
              Mover seleccionados ({pasajerosSeleccionados.size})
            </button>
            <button
              onClick={cancelarSeleccion}
              className="rounded bg-gray-500 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-gray-600"
            >
              Cancelar
            </button>
          </>
        ) : (
          <>
            {/* Modal Agregar Pasajero */}
            <ModalAgregarPasajero
              grupo={{
                id: grupo.numero - 1,
                tipo: grupo._tipoServicio || 'S',
                empresa: grupo.empresa,
                destinoGrupo: grupo.destino,
                destinocodigo: grupo.destinocodigo,
                fecha: grupo.inicio
                  ? new Date(grupo.inicio)
                      .toLocaleString('sv-SE')
                      .replace(' ', 'T')
                  : '',
                horaprog: grupo.fin
                  ? new Date(grupo.fin)
                      .toLocaleString('sv-SE')
                      .replace(' ', 'T')
                  : '',
                conductor: grupo.conductor,
                unidad: grupo.unidad,
                cantidadPasajeros: grupo.pasajeros.length - 1,
              }}
              onRefrescarDatos={onRefrescarDatos}
              usarApiTalma={true}
            />

            {grupo.pasajeros.length >= 1 && (
              <button
                onClick={() => activarSeleccionMultiple(grupo.id)}
                className="flex items-center gap-1.5 rounded bg-purple-500 px-4 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-purple-600"
              >
                <Users className="h-3 w-3" />
                Mover múltiples
              </button>
            )}

            <button
              onClick={() => setModalMapaAbierto(true)}
              className="rounded bg-orange-500 px-4 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-orange-600"
            >
              Ruta
            </button>

            {/* Modal de Mapa */}
            <ModalMapa
              isOpen={modalMapaAbierto}
              setIsOpen={setModalMapaAbierto}
              grupo={grupo.numero}
              coordenadas={coordenadas}
              selectedMarker={selectedMarker}
              setSelectedMarker={setSelectedMarker}
              getMarkerSVG={getMarkerSVG}
            />
          </>
        )}
      </div>
    </div>
  );
};

export { type Conductor, type Unidad };
export default FooterTablaList;
