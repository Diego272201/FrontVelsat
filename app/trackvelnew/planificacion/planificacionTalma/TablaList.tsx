import React, { useState, useMemo, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Search, Users, Clock, MapPin, Trash2, ArrowRight, Car, User, Edit, Check, Plus, AlertTriangle, RotateCcw, GripVertical, ChevronUp, ChevronDown, GripHorizontal, Save } from 'lucide-react';
import { DatePickerField } from './DatePickerField';
import { cargarGruposDesdeAPI } from './gruposData';
import { Pasajero, Grupo } from './types';
import { Spinner } from '@nextui-org/react';

export interface TablaListRef {
  cargarDatos: (fecha: string, hora: string, tipo: 'S' | 'I') => Promise<void>;
}

export const TablaList = forwardRef<TablaListRef>((props, ref) => {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [cargando, setCargando] = useState(false);
  const [datosIntentadosCargar, setDatosIntentadosCargar] = useState(false);


useImperativeHandle(ref, () => ({
  cargarDatos: async (fecha: string, hora: string, tipo: 'S' | 'I') => {
    setCargando(true);
    setDatosIntentadosCargar(true);
    const gruposCargados = await cargarGruposDesdeAPI(fecha, hora, tipo);
    setGrupos(gruposCargados);
    setCargando(false);
  }
}));
  
const cargarDatosExternos = async (fecha: string, hora: string, tipo: 'S' | 'I') => {
  setCargando(true);
  setDatosIntentadosCargar(true);
  const gruposCargados = await cargarGruposDesdeAPI(fecha, hora, tipo);
  setGrupos(gruposCargados);
  setCargando(false);
};

  // Grupo especial de eliminados
  const [grupoEliminados, setGrupoEliminados] = useState<Grupo>({
    id: 'grupo-eliminados',
    numero: 0,
    tipoSalida: 'Eliminados',
    empresa: '-',
    destino: 'Papelera',
    inicio: new Date(),
    fin: new Date(),
    tarifa: '-',
    conductor: '',
    unidad: '',
    duracion: '0h 0min',
    pasajeros: []
  });

  const [selectedPasajeros, setSelectedPasajeros] = useState<{
    pasajeros: Pasajero[];
    grupoOrigenId: string;
  } | null>(null);

  const [pasajerosSeleccionados, setPasajerosSeleccionados] = useState<Set<string>>(new Set());
  const [grupoEnSeleccion, setGrupoEnSeleccion] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estado para confirmación de eliminación
  const [confirmacionEliminar, setConfirmacionEliminar] = useState<{
    pasajero: Pasajero;
    grupoId: string;
  } | null>(null);

  // Estado para el pasajero que se está arrastrando
  const [draggingPassenger, setDraggingPassenger] = useState<{
    pasajero: Pasajero;
    grupoId: string;
    index: number;
  } | null>(null);

  // Estado para el indicador de drop
  const [dropIndicator, setDropIndicator] = useState<{
    grupoId: string;
    index: number;
    position: 'before' | 'after';
  } | null>(null);

  // Actualizar fecha de grupo con tipado correcto
  const actualizarFecha = (grupoId: string, campo: 'inicio' | 'fin', fecha: Date | null) => {
    if (!fecha) return;

    setGrupos(prevGrupos =>
      prevGrupos.map(grupo =>
        grupo.id === grupoId ? { ...grupo, [campo]: fecha } : grupo
      )
    );
  };

  // Actualizar campo de texto de grupo
  const actualizarGrupo = (grupoId: string, campo: keyof Grupo, valor: string) => {
    setGrupos(prevGrupos =>
      prevGrupos.map(grupo =>
        grupo.id === grupoId ? { ...grupo, [campo]: valor } : grupo
      )
    );
  };

  // Activar modo de selección múltiple
  const activarSeleccionMultiple = (grupoId: string) => {
    setGrupoEnSeleccion(grupoId);
    setPasajerosSeleccionados(new Set());
  };

  // Toggle selección de pasajero
  const toggleSeleccionPasajero = (pasajeroId: string) => {
    setPasajerosSeleccionados(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pasajeroId)) {
        newSet.delete(pasajeroId);
      } else {
        newSet.add(pasajeroId);
      }
      return newSet;
    });
  };

  // Eliminar pasajero con confirmación
  const solicitarEliminarPasajero = (pasajero: Pasajero, grupoId: string) => {
    setConfirmacionEliminar({ pasajero, grupoId });
  };

  const confirmarEliminarPasajero = () => {
    if (!confirmacionEliminar) return;

    const { pasajero, grupoId } = confirmacionEliminar;

    setGrupos(prevGrupos =>
      prevGrupos.map(grupo => {
        if (grupo.id === grupoId) {
          return {
            ...grupo,
            pasajeros: grupo.pasajeros.filter(p => p.id !== pasajero.id)
          };
        }
        return grupo;
      })
    );

    // Agregar al grupo de eliminados con referencia al grupo original
    setGrupoEliminados(prev => ({
      ...prev,
      pasajeros: [...prev.pasajeros, { ...pasajero, grupoOriginalId: grupoId }]
    }));

    setConfirmacionEliminar(null);
  };

  // Restaurar pasajero desde eliminados
  const restaurarPasajero = (pasajero: Pasajero & { grupoOriginalId?: string }) => {
    if (!pasajero.grupoOriginalId) {
      alert('No se puede determinar el grupo original del pasajero');
      return;
    }

    // Remover del grupo eliminados
    setGrupoEliminados(prev => ({
      ...prev,
      pasajeros: prev.pasajeros.filter(p => p.id !== pasajero.id)
    }));

    // Restaurar al grupo original
    setGrupos(prevGrupos =>
      prevGrupos.map(grupo => {
        if (grupo.id === pasajero.grupoOriginalId) {
          const { grupoOriginalId, ...pasajeroLimpio } = pasajero;
          return {
            ...grupo,
            pasajeros: [...grupo.pasajeros, pasajeroLimpio]
          };
        }
        return grupo;
      })
    );
  };

  // Eliminar permanentemente desde papelera
  const eliminarPermanentemente = (pasajeroId: string) => {
    if (confirm('¿Estás seguro de eliminar este pasajero permanentemente? Esta acción no se puede deshacer.')) {
      setGrupoEliminados(prev => ({
        ...prev,
        pasajeros: prev.pasajeros.filter(p => p.id !== pasajeroId)
      }));
    }
  };

  // Abrir modal con pasajeros seleccionados
  const abrirModalMover = (grupoId: string) => {
    const grupo = grupos.find(g => g.id === grupoId);
    if (!grupo) return;

    const pasajerosAMover = grupo.pasajeros.filter(p => pasajerosSeleccionados.has(p.id));

    if (pasajerosAMover.length === 0) {
      alert('Selecciona al menos un pasajero para mover');
      return;
    }

    // Validar que no se queden sin pasajeros
    if (grupo.pasajeros.length - pasajerosAMover.length < 1) {
      alert('Debes dejar al menos 1 pasajero en el grupo');
      return;
    }

    setSelectedPasajeros({
      pasajeros: pasajerosAMover,
      grupoOrigenId: grupoId
    });
  };

  // Cancelar selección
  const cancelarSeleccion = () => {
    setGrupoEnSeleccion(null);
    setPasajerosSeleccionados(new Set());
  };

  // Mover pasajeros a grupo existente
  const moverPasajerosAGrupo = (grupoDestinoId: string) => {
    if (!selectedPasajeros) return;

    setGrupos(prevGrupos => {
      return prevGrupos.map(grupo => {
        // Remover del grupo origen
        if (grupo.id === selectedPasajeros.grupoOrigenId) {
          return {
            ...grupo,
            pasajeros: grupo.pasajeros.filter(
              p => !selectedPasajeros.pasajeros.some(sp => sp.id === p.id)
            )
          };
        }

        // Agregar al grupo destino
        if (grupo.id === grupoDestinoId) {
          return {
            ...grupo,
            pasajeros: [...grupo.pasajeros, ...selectedPasajeros.pasajeros]
          };
        }

        return grupo;
      });
    });

    setSelectedPasajeros(null);
    setPasajerosSeleccionados(new Set());
    setGrupoEnSeleccion(null);
  };

  // Crear nuevo grupo con los pasajeros seleccionados
  const crearNuevoGrupo = () => {
    if (!selectedPasajeros) return;

    const nuevoNumero = Math.max(...grupos.map(g => g.numero)) + 1;
    const grupoOrigen = grupos.find(g => g.id === selectedPasajeros.grupoOrigenId);

    const nuevoGrupo: Grupo = {
      id: `grupo-${Date.now()}`,
      numero: nuevoNumero,
      tipoSalida: grupoOrigen?.tipoSalida || 'Salida',
      empresa: grupoOrigen?.empresa || 'Rep',
      destino: grupoOrigen?.destino || '',
      inicio: new Date(),
      fin: new Date(),
      tarifa: grupoOrigen?.tarifa || 'Latam',
      conductor: '',
      unidad: '',
      duracion: '0h 0min',
      pasajeros: selectedPasajeros.pasajeros
    };

    setGrupos(prevGrupos => {
      // Remover pasajeros del grupo origen
      const gruposActualizados = prevGrupos.map(grupo => {
        if (grupo.id === selectedPasajeros.grupoOrigenId) {
          return {
            ...grupo,
            pasajeros: grupo.pasajeros.filter(
              p => !selectedPasajeros.pasajeros.some(sp => sp.id === p.id)
            )
          };
        }
        return grupo;
      });

      // Agregar nuevo grupo
      return [...gruposActualizados, nuevoGrupo];
    });

    setSelectedPasajeros(null);
    setPasajerosSeleccionados(new Set());
    setGrupoEnSeleccion(null);
  };

  // Mover pasajero arriba
  const moverPasajeroArriba = (grupoId: string, index: number) => {
    if (index === 0) return;

    setGrupos(prevGrupos =>
      prevGrupos.map(grupo => {
        if (grupo.id === grupoId) {
          const nuevosPasajeros = [...grupo.pasajeros];
          [nuevosPasajeros[index - 1], nuevosPasajeros[index]] = 
          [nuevosPasajeros[index], nuevosPasajeros[index - 1]];
          return { ...grupo, pasajeros: nuevosPasajeros };
        }
        return grupo;
      })
    );
  };

  // Mover pasajero abajo
  const moverPasajeroAbajo = (grupoId: string, index: number, totalPasajeros: number) => {
    if (index === totalPasajeros - 1) return;

    setGrupos(prevGrupos =>
      prevGrupos.map(grupo => {
        if (grupo.id === grupoId) {
          const nuevosPasajeros = [...grupo.pasajeros];
          [nuevosPasajeros[index], nuevosPasajeros[index + 1]] = 
          [nuevosPasajeros[index + 1], nuevosPasajeros[index]];
          return { ...grupo, pasajeros: nuevosPasajeros };
        }
        return grupo;
      })
    );
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, pasajero: Pasajero, grupoId: string, index: number) => {
    setDraggingPassenger({ pasajero, grupoId, index });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetGrupoId: string, targetIndex: number) => {
    e.preventDefault();
    
    // Solo permitir drop si es el mismo grupo
    if (draggingPassenger && draggingPassenger.grupoId === targetGrupoId) {
      e.dataTransfer.dropEffect = 'move';
      
      // Detectar si el mouse está en la mitad superior o inferior de la fila
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      const position = e.clientY < midpoint ? 'before' : 'after';
      
      setDropIndicator({ grupoId: targetGrupoId, index: targetIndex, position });
    } else {
      e.dataTransfer.dropEffect = 'none';
      setDropIndicator(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetGrupoId: string, targetIndex: number) => {
    e.preventDefault();
    
    if (!draggingPassenger || !dropIndicator) {
      setDropIndicator(null);
      setDraggingPassenger(null);
      return;
    }
    
    const { pasajero, grupoId: sourceGrupoId, index: sourceIndex } = draggingPassenger;

    // VALIDACIÓN: Solo permitir reordenar dentro del mismo grupo
    if (sourceGrupoId !== targetGrupoId) {
      setDraggingPassenger(null);
      setDropIndicator(null);
      return;
    }

    // Calcular el índice final considerando si es 'before' o 'after'
    let finalIndex = targetIndex;
    if (dropIndicator.position === 'after') {
      finalIndex = targetIndex + 1;
    }

    // Si arrastramos hacia abajo, ajustar el índice
    if (sourceIndex < finalIndex) {
      finalIndex--;
    }

    if (sourceIndex === finalIndex) {
      setDraggingPassenger(null);
      setDropIndicator(null);
      return;
    }

    setGrupos(prevGrupos =>
      prevGrupos.map(grupo => {
        if (grupo.id === sourceGrupoId) {
          const nuevosPasajeros = [...grupo.pasajeros];
          // Remover del índice original
          const [removed] = nuevosPasajeros.splice(sourceIndex, 1);
          // Insertar en nueva posición
          nuevosPasajeros.splice(finalIndex, 0, removed);
          
          return { ...grupo, pasajeros: nuevosPasajeros };
        }
        return grupo;
      })
    );

    setDraggingPassenger(null);
    setDropIndicator(null);
  };

  const handleDragLeave = () => {
    setDropIndicator(null);
  };

  const gruposFiltrados = useMemo(() => {
    if (!searchTerm) return grupos;

    const term = searchTerm.toLowerCase();
    return grupos.map(grupo => ({
      ...grupo,
      pasajeros: grupo.pasajeros.filter(p =>
        p.nombre.toLowerCase().includes(term) ||
        p.distrito.toLowerCase().includes(term) ||
        p.direccion.toLowerCase().includes(term)
      )
    })).filter(grupo => grupo.pasajeros.length > 0);
  }, [grupos, searchTerm]);

  return (
    <div className="w-full px-4 pt-2 pb-2">

 
      {/* Buscador */}
      <div className="mb-[10px]  flex items-center justify-between ">
        <div className="relative w-1/3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-800 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar pasajero por nombre, distrito o dirección..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-[7px] border border-gray-300 rounded-lg bg-white shadow-sm placeholder:text-sm placeholder:text-gray-400 focus:outline-none focus:ring-0 focus:border-gray-400"
          />
        </div>

    <div>
  <button className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95">
    <Save className="h-4 w-4" />
    Guardar
  </button>
</div>
      </div>

      {/* Modal de confirmación de eliminación */}
      {confirmacionEliminar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full shadow-xl">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-red-100 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  ¿Eliminar pasajero?
                </h3>
              </div>
              
              <p className="text-gray-700 mb-2">
                Estás por eliminar a:
              </p>
              <p className="font-semibold text-gray-900 mb-4">
                {confirmacionEliminar.pasajero.nombre}
              </p>
              
              <p className="text-sm text-gray-600 mb-6">
                El pasajero se moverá a la papelera y podrás restaurarlo más tarde si lo necesitas.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmacionEliminar(null)}
                  className="flex-1 py-2 px-4 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarEliminarPasajero}
                  className="flex-1 py-2 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de selección de grupo destino */}
      {selectedPasajeros && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[85vh] overflow-y-auto shadow-xl">
            <div className="p-6 border-b sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold mb-2">
                Mover {selectedPasajeros.pasajeros.length} pasajero{selectedPasajeros.pasajeros.length > 1 ? 's' : ''} a otro grupo
              </h3>
              <div className="mt-2 max-h-32 overflow-y-auto bg-gray-50 p-3 rounded">
                {selectedPasajeros.pasajeros.map((p, idx) => (
                  <p key={p.id} className="text-sm text-gray-600">
                    {idx + 1}. {p.nombre}
                  </p>
                ))}
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Botón para crear nuevo grupo */}
              <button
                onClick={crearNuevoGrupo}
                className="w-full p-4 border-2 border-green-500 bg-green-50 rounded-lg hover:bg-green-100 transition-all text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500 rounded-full">
                      <Plus className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-green-900">Crear nuevo grupo</p>
                      <p className="text-sm text-green-700">
                        Se creará el grupo {Math.max(...grupos.map(g => g.numero)) + 1} con {selectedPasajeros.pasajeros.length} pasajero{selectedPasajeros.pasajeros.length > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-green-600" />
                </div>
              </button>

              {/* Grupos existentes */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">O mover a un grupo existente:</h4>
                <div className="space-y-3">
                  {grupos
                    .filter(g => g.id !== selectedPasajeros.grupoOrigenId)
                    .map(grupo => (
                      <button
                        key={grupo.id}
                        onClick={() => moverPasajerosAGrupo(grupo.id)}
                        className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-900">Grupo {grupo.numero}</p>
                            <p className="text-sm text-gray-600">
                              {grupo.pasajeros.length} pasajero{grupo.pasajeros.length !== 1 ? 's' : ''} actualmente
                            </p>
                          </div>
                          <ArrowRight className="w-5 h-5 text-blue-500" />
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50">
              <button
                onClick={() => setSelectedPasajeros(null)}
                className="w-full py-2 px-4 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de grupos */}
      <div className="space-y-4">
{gruposFiltrados.length === 0 && grupos.length === 0 ? (
  <div className="bg-white rounded-lg shadow-md border border-gray-200 p-12">
    <div className="text-center">
      {cargando ? (
        <>
          <div className="mx-auto w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mb-6">
            <Spinner color="primary" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-3">
            Cargando datos...
          </h3>
          <p className="text-gray-600 mb-2 max-w-md mx-auto">
            Por favor espera mientras se cargan los grupos y pasajeros.
          </p>
        </>
      ) : datosIntentadosCargar ? (
        <>
          <div className="mx-auto w-24 h-24 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle className="w-12 h-12 text-orange-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-3">
            No hay datos disponibles
          </h3>
          <p className="text-gray-600 mb-2 max-w-md mx-auto">
            No se encontraron grupos para los rangos seleccionados.
          </p>
          <p className="text-sm text-gray-500">
            Intenta con otra fecha, hora o tipo de salida.
          </p>
        </>
      ) : (
        <>
          <div className="mx-auto w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mb-6">
            <Users className="w-12 h-12 text-blue-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-3">
            No hay grupos cargados
          </h3>
          <p className="text-gray-600 mb-2 max-w-md mx-auto">
            Selecciona los campos y presiona &quot;Cargar&quot; para ver los grupos.
          </p>
        </>
      )}
    </div>
  </div>
        ) : gruposFiltrados.length === 0 && searchTerm ? (
          /* Mensaje cuando NO HAY RESULTADOS DE BÚSQUEDA */
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-12">
            <div className="text-center">
              <div className="mx-auto w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Search className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                No se encontraron resultados
              </h3>
              <p className="text-gray-600 mb-4">
                No hay pasajeros que coincidan con &quot;<span className="font-semibold">{searchTerm}</span>&quot;
              </p>
              <button
                onClick={() => setSearchTerm('')}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
              >
                Limpiar búsqueda
              </button>
            </div>
          </div>
        ) : (
          /* LISTA DE GRUPOS */
          gruposFiltrados.map(grupo => (
          <div key={grupo.id} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
            {/* Header del grupo con date pickers */}
            <div className="bg-gradient-to-r from-blue-100 to-blue-200 px-4 py-0 flex items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <span className="text-sm font-bold text-gray-800">Grupo: {grupo.numero}</span>
                <span className="text-sm text-gray-700">Tipo: {grupo.tipoSalida}</span>
                <span className="text-sm text-gray-700">Empresa: {grupo.empresa}</span>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">Destino: {grupo.destino}</span>
                  <button className="p-1.5 bg-blue-500 hover:bg-blue-600 rounded text-white transition-colors">
                    <Edit className="w-4 h-4" />
                  </button>
                </div>

                <DatePickerField
                  label="Inicio"
                  selected={grupo.inicio}
                  onChange={(date) => {
                    if (!grupo._bloqueaInicio) {
                      actualizarFecha(grupo.id, 'inicio', date);
                    }
                  }}
                  disabled={grupo._bloqueaInicio}
                />

                {/* DatePicker de Fin - 🔥 CON BLOQUEO */}
                <DatePickerField
                  label="Fin"
                  selected={grupo.fin}
                  onChange={(date) => {
                    if (!grupo._bloqueaFin) {
                      actualizarFecha(grupo.id, 'fin', date);
                    }
                  }}
                  disabled={grupo._bloqueaFin}
                />

                <span className="text-sm text-gray-700">Tarifa: {grupo.tarifa}</span>
              </div>
            </div>

            {/* Tabla de pasajeros */}
            {grupo.pasajeros.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b-2 border-gray-300">
                    <tr>
                      {grupoEnSeleccion === grupo.id && (
                        <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-700 w-12">
                          <input
                            type="checkbox"
                            checked={grupo.pasajeros.every(p => pasajerosSeleccionados.has(p.id))}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setPasajerosSeleccionados(new Set(grupo.pasajeros.map(p => p.id)));
                              } else {
                                setPasajerosSeleccionados(new Set());
                              }
                            }}
                            className="w-4 h-4 cursor-pointer"
                          />
                        </th>
                      )}
                      <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-700 w-12">Orden</th>
                      <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-700">N°</th>
                      <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-700">Nombre</th>
                      <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-700">Distrito</th>
                      <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-700">Dirección</th>
                      <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-700">Fecha</th>
                      <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-700">Área</th>
                      <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-700">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {grupo.pasajeros.map((pasajero, index) => (
                      <tr
                        key={pasajero.id}
                        draggable={grupoEnSeleccion !== grupo.id}
                        onDragStart={(e) => handleDragStart(e, pasajero, grupo.id, index)}
                        onDragOver={(e) => handleDragOver(e, grupo.id, index)}
                        onDrop={(e) => handleDrop(e, grupo.id, index)}
                        onDragLeave={handleDragLeave}
                        className={`transition-colors ${
                          pasajerosSeleccionados.has(pasajero.id)
                            ? 'bg-blue-50'
                            : 'hover:bg-gray-50'
                        } ${grupoEnSeleccion !== grupo.id ? 'cursor-move' : ''} ${
                          dropIndicator?.grupoId === grupo.id && 
                          dropIndicator?.index === index && 
                          dropIndicator?.position === 'before'
                            ? 'border-t-4 border-blue-500'
                            : ''
                        } ${
                          dropIndicator?.grupoId === grupo.id && 
                          dropIndicator?.index === index && 
                          dropIndicator?.position === 'after'
                            ? 'border-b-4 border-blue-500'
                            : ''
                        }`}
                      >
                        {grupoEnSeleccion === grupo.id && (
                          <td className="px-4 py-2">
                            <input
                              type="checkbox"
                              checked={pasajerosSeleccionados.has(pasajero.id)}
                              onChange={() => toggleSeleccionPasajero(pasajero.id)}
                              className="w-4 h-4 cursor-pointer"
                            />
                          </td>
                        )}

                        <td className="px-4 py-0 bg-gray-100">
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => moverPasajeroArriba(grupo.id, index)}
                              disabled={index === 0}
                              className={`flex items-center justify-center p-0 rounded ${
                                index === 0
                                  ? 'text-gray-300 cursor-not-allowed'
                                  : 'text-gray-600 hover:bg-gray-200'
                              }`}
                              title="Mover arriba"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() =>
                                moverPasajeroAbajo(grupo.id, index, grupo.pasajeros.length)
                              }
                              disabled={index === grupo.pasajeros.length - 1}
                              className={`flex items-center justify-center p-0 rounded ${
                                index === grupo.pasajeros.length - 1
                                  ? 'text-gray-300 cursor-not-allowed'
                                  : 'text-gray-600 hover:bg-gray-200'
                              }`}
                              title="Mover abajo"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-1 text-[12px] text-gray-900 font-medium">{index + 1}</td>
                        <td className="px-4 py-1 text-[12px] text-gray-900">{pasajero.nombre}</td>
                        <td className="px-4 py-1 text-[12px] text-gray-700">{pasajero.distrito}</td>
                        <td className="px-4 py-1 text-[12px] text-gray-700 max-w-md" title={pasajero.direccion}>
                          {pasajero.direccion}
                        </td>
                        <td className="px-4 py-1 text-[12px] text-gray-700">{pasajero.fecha}</td>
                        <td className="px-4 py-1 text-[12px]">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                            {pasajero.area}
                          </span>
                        </td>
                        <td className="px-4 py-1">
                          <div className="flex gap-2">
                            <button
                              className="p-2 bg-green-500 hover:bg-green-600 text-white rounded transition-colors"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => solicitarEliminarPasajero(pasajero, grupo.id)}
                              className="p-2 bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <button
                              className="px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded transition-colors text-xs font-semibold flex items-center gap-1.5"
                              title="Ver dirección"
                            >
                              Dirección
                              <MapPin className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>No hay pasajeros en este grupo</p>
              </div>
            )}

            {/* Barra inferior con inputs editables */}
            <div className="bg-[#ffd29d] px-4 py-1 flex items-center justify-between border-t-2 border-orange-300">
              <div className="flex items-center gap-6">
                {/* Input de Conductor */}
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-orange-700" />
                  <span className="text-[12px] font-semibold text-gray-800">Conductor</span>
                  <input
                    type="text"
                    value={grupo.conductor}
                    onChange={(e) => actualizarGrupo(grupo.id, 'conductor', e.target.value)}
                    className="px-3 py-1 text-sm text-gray-800 bg-white border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 focus:border-transparent w-48"
                    placeholder="Nombre del conductor"
                  />
                </div>

                {/* Input de Unidad */}
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4 text-orange-700" />
                  <span className="text-[12px] font-semibold text-gray-800">Unidad</span>
                  <input
                    type="text"
                    value={grupo.unidad}
                    onChange={(e) => actualizarGrupo(grupo.id, 'unidad', e.target.value)}
                    className="px-3 py-1 text-sm text-gray-800 bg-white border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 focus:border-transparent w-32"
                    placeholder="Placa"
                  />
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
          </div>
        )))}
      </div>

       {/* Grupo de Eliminados (Papelera) */}
      {grupoEliminados.pasajeros.length > 0 && (
        <div className="mt-3 mb-2 bg-red-50 rounded-lg shadow-md border-2 border-red-300 overflow-hidden">
          <div className="bg-gradient-to-r from-red-200 to-red-300 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trash2 className="w-5 h-5 text-red-800" />
              <span className="text-sm font-bold text-red-900">
                Papelera ({grupoEliminados.pasajeros.length} pasajero{grupoEliminados.pasajeros.length !== 1 ? 's' : ''})
              </span>
            </div>
            <span className="text-xs text-red-800">
              Puedes restaurar pasajeros a su grupo original
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-red-100 border-b-2 border-red-300">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-700">N°</th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-700">Nombre</th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-700">Distrito</th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-700">Dirección</th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-200">
                {grupoEliminados.pasajeros.map((pasajero, index) => (
                  <tr key={pasajero.id} className="hover:bg-red-100 transition-colors">
                    <td className="px-4 py-2 text-[12px] text-gray-900 font-medium">{index + 1}</td>
                    <td className="px-4 py-2 text-[12px] text-gray-900">{pasajero.nombre}</td>
                    <td className="px-4 py-2 text-[12px] text-gray-700">{pasajero.distrito}</td>
                    <td className="px-4 py-2 text-[12px] text-gray-700 max-w-md">{pasajero.direccion}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => restaurarPasajero(pasajero)}
                          className="p-2 bg-green-500 hover:bg-green-600 text-white rounded transition-colors"
                          title="Restaurar al grupo original"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => eliminarPermanentemente(pasajero.id)}
                          className="p-2 bg-red-700 hover:bg-red-800 text-white rounded transition-colors"
                          title="Eliminar permanentemente"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
    );
});

TablaList.displayName = 'TablaList';