import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { User, Car, Clock, Check, Users, Search } from 'lucide-react'
import { Grupo } from './types'

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
}

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
  unidades
}) => {
  const [mostrarConductores, setMostrarConductores] = useState(false);
  const [mostrarUnidades, setMostrarUnidades] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [dropdownUnidadPosition, setDropdownUnidadPosition] = useState({ top: 0, left: 0, width: 0 });
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [selectedUnidadIndex, setSelectedUnidadIndex] = useState(-1);
  
  const conductorRef = useRef<HTMLDivElement>(null);
  const unidadRef = useRef<HTMLDivElement>(null);
  const inputConductorRef = useRef<HTMLInputElement>(null);
  const inputUnidadRef = useRef<HTMLInputElement>(null);

  // Actualizar posición del dropdown de conductores
  useEffect(() => {
    if (mostrarConductores && inputConductorRef.current) {
      const rect = inputConductorRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: 360
      });
    }
  }, [mostrarConductores]);

  // Actualizar posición del dropdown de unidades
  useEffect(() => {
    if (mostrarUnidades && inputUnidadRef.current) {
      const rect = inputUnidadRef.current.getBoundingClientRect();
      setDropdownUnidadPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: 280
      });
    }
  }, [mostrarUnidades]);

  // Cerrar dropdowns al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (conductorRef.current && !conductorRef.current.contains(event.target as Node)) {
        setMostrarConductores(false);
        setSelectedIndex(-1);
      }
      if (unidadRef.current && !unidadRef.current.contains(event.target as Node)) {
        setMostrarUnidades(false);
        setSelectedUnidadIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtrar conductores
  const getConductoresFiltrados = () => {
    if (!grupo.conductor || grupo.conductor.trim() === '') {
      return conductores;
    }
    return conductores.filter(c => 
      c.apepate.toLowerCase().includes(grupo.conductor.toLowerCase())
    );
  };

  // Filtrar unidades
  const getUnidadesFiltradas = () => {
    if (!grupo.unidad || grupo.unidad.trim() === '') {
      return unidades;
    }
    return unidades.filter(u => 
      u.codunidad.toLowerCase().includes(grupo.unidad.toLowerCase())
    );
  };

  const conductoresFiltrados = getConductoresFiltrados();
  const unidadesFiltradas = getUnidadesFiltradas();

  // Seleccionar conductor
  const seleccionarConductor = (conductor: Conductor) => {
    actualizarGrupo(grupo.id, 'conductor', conductor.apepate.trim());
    setMostrarConductores(false);
    setSelectedIndex(-1);
  };

  // Seleccionar unidad
  const seleccionarUnidad = (unidad: Unidad) => {
    actualizarGrupo(grupo.id, 'unidad', unidad.codunidad);
    setMostrarUnidades(false);
    setSelectedUnidadIndex(-1);
  };

  return (
    <div className="bg-[#ffd29d] px-4 py-1 flex items-center justify-between border-t-2 border-orange-300">
      
      <div className="flex items-center gap-6">
        {/* Input de Conductor con Autocompletado */}
        <div className="flex items-center gap-2" ref={conductorRef}>
          <User className="w-4 h-4 text-orange-700" />
          <span className="text-[12px] font-semibold text-gray-800">Conductor</span>
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
              className="px-3 py-1.5 text-sm text-gray-800 bg-white border-1 border-gray-300 rounded-lg focus:ring-0.5 focus:ring-orange-400 focus:border-orange-400 transition-all w-[350px]"
              placeholder="Buscar Conductor"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
          
          {/* Dropdown de Conductores */}
          {mostrarConductores && conductores.length > 0 && conductoresFiltrados.length > 0 && createPortal(
            <div 
              className="bg-white rounded-lg shadow-2xl max-h-80 overflow-hidden border border-gray-200"
              style={{ 
                position: 'absolute',
                top: `${dropdownPosition.top}px`,
                left: `${dropdownPosition.left}px`,
                width: `${dropdownPosition.width}px`,
                zIndex: 99999
              }}
            >
              <div className="sticky top-0 bg-gradient-to-r from-orange-50 to-orange-100 px-4 py-2 border-b border-orange-200">
                <p className="text-xs font-semibold text-orange-800 uppercase tracking-wide">
                  Conductores disponibles ({conductoresFiltrados.length})
                </p>
              </div>
              <div className="overflow-y-auto max-h-64 scrollbar-thin scrollbar-thumb-orange-300 scrollbar-track-gray-100">
                {conductoresFiltrados.map((conductor, index) => (
                  <div
                    key={conductor.codigo}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      seleccionarConductor(conductor);
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`px-4 py-3 cursor-pointer transition-all duration-150 border-b border-gray-100 last:border-b-0 ${
                      selectedIndex === index 
                        ? 'bg-gradient-to-r from-orange-50 to-orange-100 border-l-4 border-l-orange-500' 
                        : 'hover:bg-gray-50 border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                          <User className="w-4 h-4 text-orange-600" />
                        </div>
                        <div>
                          <p className={`text-sm font-medium ${selectedIndex === index ? 'text-orange-900' : 'text-gray-900'}`}>
                            {conductor.apepate.trim()}
                          </p>
                          <p className="text-xs text-gray-500">Código: {conductor.codigo}</p>
                        </div>
                      </div>
                      {selectedIndex === index && (
                        <Check className="w-4 h-4 text-orange-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>,
            document.body
          )}

          {/* Mensaje cuando no hay resultados */}
          {mostrarConductores && conductores.length > 0 && conductoresFiltrados.length === 0 && createPortal(
            <div 
              className="bg-white rounded-lg shadow-2xl border border-gray-200"
              style={{ 
                position: 'absolute',
                top: `${dropdownPosition.top}px`,
                left: `${dropdownPosition.left}px`,
                width: `${dropdownPosition.width}px`,
                zIndex: 99999
              }}
            >
              <div className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-700 mb-1">
                  No se encontraron conductores
                </p>
                <p className="text-xs text-gray-500">
                  No hay coincidencias con &quot;{grupo.conductor}&quot;
                </p>
              </div>
            </div>,
            document.body
          )}
        </div>

        {/* Input de Unidad con Autocompletado */}
        <div className="flex items-center gap-2" ref={unidadRef}>
          <Car className="w-4 h-4 text-orange-700" />
          <span className="text-[12px] font-semibold text-gray-800">Unidad</span>
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
              className="px-3 py-1.5 text-sm text-gray-800 bg-white border-1 border-gray-300 rounded-lg focus:ring-0.5 focus:ring-orange-400 focus:border-orange-400 transition-all w-[180px] shadow-sm"
              placeholder="Placa"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
          
          {/* Dropdown de Unidades */}
          {mostrarUnidades && unidades.length > 0 && unidadesFiltradas.length > 0 && createPortal(
            <div 
              className="bg-white rounded-lg shadow-2xl max-h-80 overflow-hidden border border-gray-200"
              style={{ 
                position: 'absolute',
                top: `${dropdownUnidadPosition.top}px`,
                left: `${dropdownUnidadPosition.left}px`,
                width: `${dropdownUnidadPosition.width}px`,
                zIndex: 99999
              }}
            >
              <div className="sticky top-0 bg-gradient-to-r from-orange-50 to-orange-100 px-4 py-2 border-b border-orange-200">
                <p className="text-xs font-semibold text-orange-800 uppercase tracking-wide">
                  Unidades disponibles ({unidadesFiltradas.length})
                </p>
              </div>
              <div className="overflow-y-auto max-h-64 scrollbar-thin scrollbar-thumb-orange-300 scrollbar-track-gray-100">
                {unidadesFiltradas.map((unidad, index) => (
                  <div
                    key={unidad.id}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      seleccionarUnidad(unidad);
                    }}
                    onMouseEnter={() => setSelectedUnidadIndex(index)}
                    className={`px-4 py-3 cursor-pointer transition-all duration-150 border-b border-gray-100 last:border-b-0 ${
                      selectedUnidadIndex === index 
                        ? 'bg-gradient-to-r from-orange-50 to-orange-100 border-l-4 border-l-orange-500' 
                        : 'hover:bg-gray-50 border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                          <Car className="w-4 h-4 text-orange-600" />
                        </div>
                        <p className={`text-sm font-medium ${selectedUnidadIndex === index ? 'text-orange-900' : 'text-gray-900'}`}>
                          {unidad.codunidad}
                        </p>
                      </div>
                      {selectedUnidadIndex === index && (
                        <Check className="w-4 h-4 text-orange-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>,
            document.body
          )}

          {/* Mensaje cuando no hay resultados */}
          {mostrarUnidades && unidades.length > 0 && unidadesFiltradas.length === 0 && createPortal(
            <div 
              className="bg-white rounded-lg shadow-2xl border border-gray-200"
              style={{ 
                position: 'absolute',
                top: `${dropdownUnidadPosition.top}px`,
                left: `${dropdownUnidadPosition.left}px`,
                width: `${dropdownUnidadPosition.width}px`,
                zIndex: 99999
              }}
            >
              <div className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-700 mb-1">
                  No se encontraron unidades
                </p>
                <p className="text-xs text-gray-500">
                  No hay coincidencias con &quot;{grupo.unidad}&quot;
                </p>
              </div>
            </div>,
            document.body
          )}
        </div>

        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-orange-700" />
          <span className="text-[12px] font-semibold text-gray-800">Duración: {grupo.duracion}</span>
        </div>
      </div>

      <div className="flex gap-2">
        {grupoEnSeleccion === grupo.id ? (
          <>
            <button
              onClick={() => abrirModalMover(grupo.id)}
              className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-[12px] rounded font-semibold transition-colors flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Mover seleccionados ({pasajerosSeleccionados.size})
            </button>
            <button
              onClick={cancelarSeleccion}
              className="px-4 py-1.5 bg-gray-500 hover:bg-gray-600 text-white text-sm rounded font-semibold transition-colors"
            >
              Cancelar
            </button>
          </>
        ) : (
          <>
            <button className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-[12px] rounded font-semibold transition-colors flex items-center gap-1.5">
              <span className="text-[12px]">+</span> Pasajero
            </button>
            {grupo.pasajeros.length > 1 && (
              <button
                onClick={() => activarSeleccionMultiple(grupo.id)}
                className="px-4 py-1.5 bg-purple-500 hover:bg-purple-600 text-white text-[12px] rounded font-semibold transition-colors flex items-center gap-1.5"
              >
                <Users className="w-3 h-3" />
                Mover múltiples
              </button>
            )}
            <button className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-[12px] rounded font-semibold transition-colors">
              Ruta
            </button>
          </>
        )}
      </div>
          </div>
  )
}

export { type Conductor, type Unidad };
export default FooterTablaList