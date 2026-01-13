import React, {
  useState,
  useMemo,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  Search,
  Users,
  ArrowRight,
  Plus,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  Save,
  Send,
} from 'lucide-react';
import { DatePickerField } from './DatePickerField';
import { cargarGruposDesdeAPI, guardarGruposEnAPI, publicarGruposEnAPI } from './gruposData';
import { Pasajero, Grupo } from './types';
import { Spinner } from '@nextui-org/react';
import { toast } from 'sonner';
import FooterTablaList, {
  type Conductor,
  type Unidad,
} from './FooterTablaList';
import ButtonEliminarPasajero from './ButtonEliminarPasajero';
import { PapeleraGrupos } from './PapeleraGrupos';
import ModalDireccion from './ModalDireccion';
import ModalDirecciones from './ModalDirecciones';

export interface TablaListRef {
  cargarDatos: (fecha: string, hora: string, tipo: 'S' | 'I') => Promise<void>;
  getEstadisticas: () => { totalGrupos: number; totalPasajeros: number };
  refrescarDatos: () => Promise<void>; 
}

export const TablaList = forwardRef<TablaListRef>((props, ref) => {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [cargando, setCargando] = useState(false);
  const [datosIntentadosCargar, setDatosIntentadosCargar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [confirmacionPublicar, setConfirmacionPublicar] = useState(false);

  const [conductores, setConductores] = useState<Conductor[]>([]);
  const [unidades, setUnidades] = useState<Unidad[]>([]);

  const [triggerRecargaPapelera, setTriggerRecargaPapelera] = useState(0);

  const [pasajerosRestaurados, setPasajerosRestaurados] = useState<Set<string>>(
    new Set(),
  );

  const [modalDireccionAbierto, setModalDireccionAbierto] = useState(false);
const [pasajeroSeleccionadoDireccion, setPasajeroSeleccionadoDireccion] = useState<Pasajero | null>(null);
  const [shouldRefetch, setShouldRefetch] = useState(false);
const [publicando, setPublicando] = useState(false);

  const [parametrosCarga, setParametrosCarga] = useState<{
    fecha: string;
    hora: string;
    tipo: 'S' | 'I';
  }>({ fecha: '', hora: '', tipo: 'S' });

  
useEffect(() => {
  if (shouldRefetch && parametrosCarga.fecha && parametrosCarga.hora) {
    // Recargar los datos cuando shouldRefetch es true
    cargarDatosExternos(
      parametrosCarga.fecha,
      parametrosCarga.hora,
      parametrosCarga.tipo
    );
    
    // Resetear el flag
    setShouldRefetch(false);
  }
}, [shouldRefetch, parametrosCarga]);

  useEffect(() => {
    const cargarConductores = async () => {
      try {
        const response = await fetch(
          'https://do.velsat.pe:2083/api/Preplan/conductores?usuario=cgacela',
        );
        const data = await response.json();
        console.log('Conductores cargados:', data.length);
        setConductores(data);
      } catch (error) {
        console.error('Error al cargar conductores:', error);
      }
    };

    const cargarUnidades = async () => {
      try {
        const response = await fetch(
          'https://do.velsat.pe:2083/api/Preplan/unidades?usuario=cgacela',
        );
        const data = await response.json();
        console.log('Unidades cargadas:', data.length);
        setUnidades(data);
      } catch (error) {
        console.error('Error al cargar unidades:', error);
      }
    };

    cargarConductores();
    cargarUnidades();
  }, []);

  const handleGuardar = async () => {
    try {
      if (grupos.length === 0) {
        alert('No hay grupos para guardar');
        return;
      }


      setGuardando(true);
      await guardarGruposEnAPI(grupos, conductores);
      toast.success('Grupos guardados exitosamente');
    } catch (error: any) {
      toast.error(`Error al guardar: ${error.message}`);
    } finally {
      setGuardando(false);
    }
  };

  


const abrirModalPublicar = () => {
  if (grupos.length === 0) {
    alert('No hay grupos para publicar');
    return;
  }
  setConfirmacionPublicar(true);
};


const confirmarPublicar = async () => {
  try {
    setPublicando(true);
    setConfirmacionPublicar(false);
    
    const resultado = await publicarGruposEnAPI(grupos);
    
    // Mostrar mensajes según el resultado
    if (resultado.gruposOmitidos.length > 0) {
      // Algunos grupos se omitieron
      const mensajeOmitidos = resultado.gruposOmitidos.length === 1
        ? `El Grupo ${resultado.gruposOmitidos[0]} no se publicó (falta fecha)`
        : `Los Grupos ${resultado.gruposOmitidos.join(', ')} no se publicaron (falta fecha)`;
      
      const mensajePublicados = resultado.gruposPublicados.length === 1
        ? `Solo se publicó el Grupo ${resultado.gruposPublicados[0]}`
        : `Solo se publicaron los Grupos ${resultado.gruposPublicados.join(', ')}`;
      
      toast.warning(`${mensajePublicados}. ${mensajeOmitidos}`);
    } else {
      // Todos los grupos se publicaron
      toast.success('Todos los grupos se publicaron exitosamente');
    }
    
    if (parametrosCarga.fecha && parametrosCarga.hora) {
      await cargarDatosExternos(
        parametrosCarga.fecha,
        parametrosCarga.hora,
        parametrosCarga.tipo
      );
    }
  } catch (error: any) {
    toast.error(`Error al publicar: ${error.message}`);
  } finally {
    setPublicando(false);
  }
};


useImperativeHandle(ref, () => ({
  cargarDatos: async (fecha: string, hora: string, tipo: 'S' | 'I') => {
    setCargando(true);
    setDatosIntentadosCargar(true);

    setParametrosCarga({ fecha, hora, tipo });

    setPasajerosRestaurados(new Set());

    setTriggerRecargaPapelera((prev) => prev + 1);

    const gruposCargados = await cargarGruposDesdeAPI(fecha, hora, tipo);
    setGrupos(gruposCargados);
    setCargando(false);
  },
  getEstadisticas: () => {
    const totalGrupos = grupos.length;
    const totalPasajeros = grupos.reduce(
      (total, grupo) => total + grupo.pasajeros.length,
      0,
    );
    return { totalGrupos, totalPasajeros };
  },

  refrescarDatos: async () => {
    if (parametrosCarga.fecha && parametrosCarga.hora) {
      setCargando(true);
      setPasajerosRestaurados(new Set());
      setTriggerRecargaPapelera((prev) => prev + 1);
      
      const gruposCargados = await cargarGruposDesdeAPI(
        parametrosCarga.fecha,
        parametrosCarga.hora,
        parametrosCarga.tipo
      );
      setGrupos(gruposCargados);
      setCargando(false);
    }
  },
}));




  const cargarDatosExternos = async (
    fecha: string,
    hora: string,
    tipo: 'S' | 'I',
  ) => {
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
     destinocodigo: '0',
    destino: 'Papelera',
    inicio: new Date(),
    fin: new Date(),
    tarifa: '-',
    conductor: '',
    unidad: '',
    duracion: '0h 0min',
    pasajeros: [],
  });

  const [selectedPasajeros, setSelectedPasajeros] = useState<{
    pasajeros: Pasajero[];
    grupoOrigenId: string;
  } | null>(null);

  const [pasajerosSeleccionados, setPasajerosSeleccionados] = useState<
    Set<string>
  >(new Set());
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
  const actualizarFecha = (
    grupoId: string,
    campo: 'inicio' | 'fin',
    fecha: Date | null,
  ) => {

    setGrupos((prevGrupos) =>
      prevGrupos.map((grupo) =>
        grupo.id === grupoId ? { ...grupo, [campo]: fecha } : grupo,
      ),
    );
  };

  // Actualizar campo de texto de grupo
  const actualizarGrupo = (
    grupoId: string,
    campo: keyof Grupo,
    valor: string,
  ) => {
    setGrupos((prevGrupos) =>
      prevGrupos.map((grupo) =>
        grupo.id === grupoId ? { ...grupo, [campo]: valor } : grupo,
      ),
    );
  };

  // Activar modo de selección múltiple
  const activarSeleccionMultiple = (grupoId: string) => {
    setGrupoEnSeleccion(grupoId);
    setPasajerosSeleccionados(new Set());
  };

  // Toggle selección de pasajero
  const toggleSeleccionPasajero = (pasajeroId: string) => {
    setPasajerosSeleccionados((prev) => {
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

  const confirmarEliminarPasajero = async () => {
    if (!confirmacionEliminar) return;

    const { pasajero, grupoId } = confirmacionEliminar;

    try {
      const response = await fetch(
        `https://do.velsat.pe:2083/api/Talma/DeletePreplanTalma/${pasajero.id}`,
        {
          method: 'DELETE',
        },
      );

      if (!response.ok) {
        throw new Error(`Error al eliminar: ${response.status}`);
      }

      console.log('Pasajero eliminado de la API');

      // Continuar con la lógica existente
      setGrupos((prevGrupos) =>
        prevGrupos.map((grupo) => {
          if (grupo.id === grupoId) {
            return {
              ...grupo,
              pasajeros: grupo.pasajeros.filter((p) => p.id !== pasajero.id),
            };
          }
          return grupo;
        }),
      );

      setGrupoEliminados((prev) => ({
        ...prev,
        pasajeros: [
          ...prev.pasajeros,
          { ...pasajero, grupoOriginalId: grupoId },
        ],
      }));

      setConfirmacionEliminar(null);

      toast.success('Pasajero eliminado exitosamente');
      setTriggerRecargaPapelera((prev) => prev + 1);

      setTimeout(() => {
        setParametrosCarga((prev) => ({ ...prev }));
      }, 500);
    } catch (error: any) {
      console.error('Error al eliminar pasajero:', error);
      toast.error(`Error al eliminar: ${error.message}`);
    }
  };
  // Restaurar pasajero desde eliminados

const restaurarPasajero = (
    pasajero: Pasajero & { grupoOriginalId?: string; _apiData?: any },
  ) => {
    // Validar que tenga los datos originales de la API
    if (!pasajero._apiData) {
      toast.error('No se encontraron los datos originales del pasajero');
      return;
    }

    // Si no tiene grupoOriginalId, usar grupo 0 por defecto
    const grupoOriginalId = pasajero.grupoOriginalId ?? '0';
    const numeroGrupoDestino = Number(grupoOriginalId) + 1;
    const grupoDestino = grupos.find((g) => g.numero === numeroGrupoDestino);

    if (!grupoDestino) {
      toast.error(`No se encontró el grupo ${numeroGrupoDestino}`);
      return;
    }

    setGrupos((prevGrupos) =>
      prevGrupos.map((grupo) => {
        if (grupo.id === grupoDestino.id) {
          const { grupoOriginalId, ...pasajeroConApiData } = pasajero;

          return {
            ...grupo,
            pasajeros: [...grupo.pasajeros, pasajeroConApiData],
          };
        }
        return grupo;
      }),
    );

    setPasajerosRestaurados((prev) => new Set(prev).add(pasajero.id));

    toast.success(
      `Pasajero restaurado al Grupo ${numeroGrupoDestino} (presiona Guardar para confirmar)`,
    );
  };

  // Eliminar permanentemente desde papelera
  const eliminarPermanentemente = (pasajeroId: string) => {
    if (
      confirm(
        '¿Estás seguro de eliminar este pasajero permanentemente? Esta acción no se puede deshacer.',
      )
    ) {
      setGrupoEliminados((prev) => ({
        ...prev,
        pasajeros: prev.pasajeros.filter((p) => p.id !== pasajeroId),
      }));
    }
  };

  const abrirModalMover = (grupoId: string) => {
    const grupo = grupos.find((g) => g.id === grupoId);
    if (!grupo) return;

    const pasajerosAMover = grupo.pasajeros.filter((p) =>
      pasajerosSeleccionados.has(p.id),
    );

    if (pasajerosAMover.length === 0) {
      alert('Selecciona al menos un pasajero para mover');
      return;
    }

    if (grupo.pasajeros.length - pasajerosAMover.length < 1) {
      alert('Debes dejar al menos 1 pasajero en el grupo');
      return;
    }

    setSelectedPasajeros({
      pasajeros: pasajerosAMover,
      grupoOrigenId: grupoId,
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

    setGrupos((prevGrupos) => {
      return prevGrupos.map((grupo) => {
        // Remover del grupo origen
        if (grupo.id === selectedPasajeros.grupoOrigenId) {
          return {
            ...grupo,
            pasajeros: grupo.pasajeros.filter(
              (p) => !selectedPasajeros.pasajeros.some((sp) => sp.id === p.id),
            ),
          };
        }

        // Agregar al grupo destino
        if (grupo.id === grupoDestinoId) {
          return {
            ...grupo,
            pasajeros: [...grupo.pasajeros, ...selectedPasajeros.pasajeros],
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

    const nuevoNumero = Math.max(...grupos.map((g) => g.numero)) + 1;
    const grupoOrigen = grupos.find(
      (g) => g.id === selectedPasajeros.grupoOrigenId,
    );

    const nuevoGrupo: Grupo = {
      id: `grupo-${Date.now()}`,
      numero: nuevoNumero,
      tipoSalida: grupoOrigen?.tipoSalida || 'Salida',
      empresa: grupoOrigen?.empresa || 'Rep',
      destinocodigo: grupoOrigen?.destinocodigo || '0',
      destino: grupoOrigen?.destino || '',
      inicio: grupoOrigen?.inicio || null,
      fin: grupoOrigen?.fin || null,
      tarifa: grupoOrigen?.tarifa || 'Latam',
      conductor: '',
      unidad: '',
      duracion: '0h 0min',
      pasajeros: selectedPasajeros.pasajeros,
      _tipoServicio: grupoOrigen?._tipoServicio || 'S',
      _bloqueaInicio: grupoOrigen?._bloqueaInicio || false,
      _bloqueaFin: grupoOrigen?._bloqueaFin || false,
    };

    setGrupos((prevGrupos) => {
      // Remover pasajeros del grupo origen
      const gruposActualizados = prevGrupos.map((grupo) => {
        if (grupo.id === selectedPasajeros.grupoOrigenId) {
          return {
            ...grupo,
            pasajeros: grupo.pasajeros.filter(
              (p) => !selectedPasajeros.pasajeros.some((sp) => sp.id === p.id),
            ),
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

    setGrupos((prevGrupos) =>
      prevGrupos.map((grupo) => {
        if (grupo.id === grupoId) {
          const nuevosPasajeros = [...grupo.pasajeros];
          [nuevosPasajeros[index - 1], nuevosPasajeros[index]] = [
            nuevosPasajeros[index],
            nuevosPasajeros[index - 1],
          ];
          return { ...grupo, pasajeros: nuevosPasajeros };
        }
        return grupo;
      }),
    );
  };

  // Mover pasajero abajo
  const moverPasajeroAbajo = (
    grupoId: string,
    index: number,
    totalPasajeros: number,
  ) => {
    if (index === totalPasajeros - 1) return;

    setGrupos((prevGrupos) =>
      prevGrupos.map((grupo) => {
        if (grupo.id === grupoId) {
          const nuevosPasajeros = [...grupo.pasajeros];
          [nuevosPasajeros[index], nuevosPasajeros[index + 1]] = [
            nuevosPasajeros[index + 1],
            nuevosPasajeros[index],
          ];
          return { ...grupo, pasajeros: nuevosPasajeros };
        }
        return grupo;
      }),
    );
  };

  // Drag and Drop handlers
  const handleDragStart = (
    e: React.DragEvent,
    pasajero: Pasajero,
    grupoId: string,
    index: number,
  ) => {
    setDraggingPassenger({ pasajero, grupoId, index });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (
    e: React.DragEvent,
    targetGrupoId: string,
    targetIndex: number,
  ) => {
    e.preventDefault();

    // Solo permitir drop si es el mismo grupo
    if (draggingPassenger && draggingPassenger.grupoId === targetGrupoId) {
      e.dataTransfer.dropEffect = 'move';

      // Detectar si el mouse está en la mitad superior o inferior de la fila
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      const position = e.clientY < midpoint ? 'before' : 'after';

      setDropIndicator({
        grupoId: targetGrupoId,
        index: targetIndex,
        position,
      });
    } else {
      e.dataTransfer.dropEffect = 'none';
      setDropIndicator(null);
    }
  };

  const handleDrop = (
    e: React.DragEvent,
    targetGrupoId: string,
    targetIndex: number,
  ) => {
    e.preventDefault();

    if (!draggingPassenger || !dropIndicator) {
      setDropIndicator(null);
      setDraggingPassenger(null);
      return;
    }

    const {
      pasajero,
      grupoId: sourceGrupoId,
      index: sourceIndex,
    } = draggingPassenger;

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

    setGrupos((prevGrupos) =>
      prevGrupos.map((grupo) => {
        if (grupo.id === sourceGrupoId) {
          const nuevosPasajeros = [...grupo.pasajeros];
          // Remover del índice original
          const [removed] = nuevosPasajeros.splice(sourceIndex, 1);
          // Insertar en nueva posición
          nuevosPasajeros.splice(finalIndex, 0, removed);

          return { ...grupo, pasajeros: nuevosPasajeros };
        }
        return grupo;
      }),
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
    return grupos
      .map((grupo) => ({
        ...grupo,
        pasajeros: grupo.pasajeros.filter(
          (p) =>
            p.nombre.toLowerCase().includes(term) ||
            p.distrito.toLowerCase().includes(term) ||
            p.direccion.toLowerCase().includes(term),
        ),
      }))
      .filter((grupo) => grupo.pasajeros.length > 0);
  }, [grupos, searchTerm]);

  return (
    <div className="w-full px-4 pb-2 pt-0">
      {/* Buscador */}
      <div className="sticky top-0 z-20 mb-[0px] flex items-center justify-between bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 py-2">
        <div className="relative w-1/3">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-gray-800" />
          <input
            type="text"
            placeholder="Buscar pasajero por nombre, distrito o dirección..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-[7px] pl-10 pr-4 shadow-sm placeholder:text-sm placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-0"
          />
        </div>

        <div className='flex gap-3'>
          <button
            onClick={handleGuardar}
            disabled={guardando || grupos.length === 0}
            className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {guardando ? (
              <>
                <Spinner size="sm" color="white" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Guardar
              </>
            )}
          </button>


<button
  onClick={abrirModalPublicar} 
  disabled={publicando || grupos.length === 0}
  className="flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-green-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
>
  {publicando ? (
    <>
      <Spinner size="sm" color="white" />
      Publicando...
    </>
  ) : (
    <>
      <Send className="h-4 w-4" />
      Publicar
    </>
  )}
</button>


        </div>

        
      </div>

      {/* Modal de confirmación de eliminación */}
      {confirmacionEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
            <div className="p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-full bg-red-100 p-3">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  ¿Eliminar pasajero?
                </h3>
              </div>

              <p className="mb-2 text-gray-700">Estás por eliminar a:</p>
              <p className="mb-4 font-semibold text-gray-900">
                {confirmacionEliminar.pasajero.nombre}
              </p>

              <p className="mb-6 text-sm text-gray-600">
                El pasajero se moverá a la papelera y podrás restaurarlo más
                tarde si lo necesitas.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmacionEliminar(null)}
                  className="flex-1 rounded-lg bg-gray-200 px-4 py-2 font-medium transition-colors hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarEliminarPasajero}
                  className="flex-1 rounded-lg bg-red-500 px-4 py-2 font-medium text-white transition-colors hover:bg-red-600"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {confirmacionPublicar && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
    <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
      <div className="p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-full bg-green-100 p-3">
            <Send className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            ¿Publicar grupos?
          </h3>
        </div>

        <p className="mb-4 text-gray-700">
          Estás por publicar <span className="font-semibold">{grupos.length} grupo{grupos.length > 1 ? 's' : ''}</span> con un total de{' '}
          <span className="font-semibold">
            {grupos.reduce((total, g) => total + g.pasajeros.length, 0)} pasajero{grupos.reduce((total, g) => total + g.pasajeros.length, 0) > 1 ? 's' : ''}
          </span>.
        </p>

        <p className="mb-6 text-sm text-gray-600">
          Esta acción creará los servicios en el sistema. ¿Deseas continuar?
        </p>

        <div className="flex gap-3">
          <button
            onClick={() => setConfirmacionPublicar(false)}
            className="flex-1 rounded-lg bg-gray-200 px-4 py-2 font-medium transition-colors hover:bg-gray-300"
          >
            Cancelar
          </button>
          <button
            onClick={confirmarPublicar}
            className="flex-1 rounded-lg bg-green-500 px-4 py-2 font-medium text-white transition-colors hover:bg-green-600"
          >
            Publicar
          </button>
        </div>
      </div>
    </div>
  </div>
)}



      {/* Modal de selección de grupo destino */}
      {selectedPasajeros && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white shadow-xl">
            <div className="sticky top-0 z-10 border-b bg-white p-6">
              <h3 className="mb-2 text-lg font-semibold">
                Mover {selectedPasajeros.pasajeros.length} pasajero
                {selectedPasajeros.pasajeros.length > 1 ? 's' : ''} a otro grupo
              </h3>
              <div className="mt-2 max-h-32 overflow-y-auto rounded bg-gray-50 p-3">
                {selectedPasajeros.pasajeros.map((p, idx) => (
                  <p key={p.id} className="text-sm text-gray-600">
                    {idx + 1}. {p.nombre}
                  </p>
                ))}
              </div>
            </div>

            <div className="space-y-4 p-6">
              {/* Botón para crear nuevo grupo */}
              <button
                onClick={crearNuevoGrupo}
                className="w-full rounded-lg border-2 border-green-500 bg-green-50 p-4 text-left transition-all hover:bg-green-100"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-green-500 p-2">
                      <Plus className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-green-900">
                        Crear nuevo grupo
                      </p>
                      <p className="text-sm text-green-700">
                        Se creará el grupo{' '}
                        {Math.max(...grupos.map((g) => g.numero)) + 1} con{' '}
                        {selectedPasajeros.pasajeros.length} pasajero
                        {selectedPasajeros.pasajeros.length > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-green-600" />
                </div>
              </button>

              {/* Grupos existentes */}
              <div className="border-t pt-4">
                <h4 className="mb-3 text-sm font-semibold text-gray-700">
                  O mover a un grupo existente:
                </h4>
                <div className="space-y-3">
                  {grupos
                    .filter((g) => g.id !== selectedPasajeros.grupoOrigenId)
                    .map((grupo) => (
                      <button
                        key={grupo.id}
                        onClick={() => moverPasajerosAGrupo(grupo.id)}
                        className="w-full rounded-lg border-2 border-gray-200 p-4 text-left transition-all hover:border-blue-500 hover:bg-blue-50"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-900">
                              Grupo {grupo.numero}
                            </p>
                            <p className="text-sm text-gray-600">
                              {grupo.pasajeros.length} pasajero
                              {grupo.pasajeros.length !== 1 ? 's' : ''}{' '}
                              actualmente
                            </p>
                          </div>
                          <ArrowRight className="h-5 w-5 text-blue-500" />
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            </div>

            <div className="border-t bg-gray-50 p-6">
              <button
                onClick={() => setSelectedPasajeros(null)}
                className="w-full rounded-lg bg-gray-200 px-4 py-2 font-medium transition-colors hover:bg-gray-300"
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
          <div className="rounded-lg border border-gray-200 bg-white p-12 shadow-md">
            <div className="text-center">
              {cargando ? (
                <>
                  <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-blue-200">
                    <Spinner color="primary" />
                  </div>
                  <h3 className="mb-3 text-2xl font-bold text-gray-800">
                    Cargando datos...
                  </h3>
                  <p className="mx-auto mb-2 max-w-md text-gray-600">
                    Por favor espera mientras se cargan los grupos y pasajeros.
                  </p>
                </>
              ) : datosIntentadosCargar ? (
                <>
                  <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-orange-100 to-orange-200">
                    <AlertTriangle className="h-12 w-12 text-orange-600" />
                  </div>
                  <h3 className="mb-3 text-2xl font-bold text-gray-800">
                    No hay datos disponibles
                  </h3>
                  <p className="mx-auto mb-2 max-w-md text-gray-600">
                    No se encontraron grupos para los rangos seleccionados.
                  </p>
                  <p className="text-sm text-gray-500">
                    Intenta con otra fecha, hora o tipo de salida.
                  </p>
                </>
              ) : (
                <>
                  <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-blue-200">
                    <Users className="h-12 w-12 text-blue-600" />
                  </div>
                  <h3 className="mb-3 text-2xl font-bold text-gray-800">
                    No hay grupos cargados
                  </h3>
                  <p className="mx-auto mb-2 max-w-md text-gray-600">
                    Selecciona los campos y presiona &quot;Cargar&quot; para ver
                    los grupos.
                  </p>
                </>
              )}
            </div>
          </div>
        ) : gruposFiltrados.length === 0 && searchTerm ? (
          /* Mensaje cuando NO HAY RESULTADOS DE BÚSQUEDA */
          <div className="rounded-lg border border-gray-200 bg-white p-12 shadow-md">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
                <Search className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-gray-800">
                No se encontraron resultados
              </h3>
              <p className="mb-4 text-gray-600">
                No hay pasajeros que coincidan con &quot;
                <span className="font-semibold">{searchTerm}</span>&quot;
              </p>
              <button
                onClick={() => setSearchTerm('')}
                className="rounded-lg bg-blue-500 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-600"
              >
                Limpiar búsqueda
              </button>
            </div>
          </div>
        ) : (
          /* LISTA DE GRUPOS */
          gruposFiltrados.map((grupo) => (
            <div
              key={grupo.id}
              className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md"
            >
              {/* Header del grupo con date pickers */}
              <div className="flex items-center justify-between gap-4 bg-gradient-to-r from-blue-100 to-blue-200 px-4 py-0">
                <div className="flex items-center gap-6">
                  <span className="text-sm font-bold text-gray-800">
                    Grupo: {grupo.numero}
                  </span>
                  <span className="text-sm text-gray-700">
                    Tipo: {grupo.tipoSalida}
                  </span>
                  <span className="text-sm text-gray-700">
                    Empresa: {grupo.empresa}
                  </span>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">
                      Destino: {grupo.destino}
                    </span>
               
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

             
                </div>
              </div>

              {/* Tabla de pasajeros */}
              {grupo.pasajeros.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b-2 border-gray-300 bg-gray-100">
                      <tr>
                        {grupoEnSeleccion === grupo.id && (
                          <th className="w-12 px-4 py-2.5 text-left text-xs font-bold text-gray-700">
                            <input
                              type="checkbox"
                              checked={grupo.pasajeros.every((p) =>
                                pasajerosSeleccionados.has(p.id),
                              )}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setPasajerosSeleccionados(
                                    new Set(grupo.pasajeros.map((p) => p.id)),
                                  );
                                } else {
                                  setPasajerosSeleccionados(new Set());
                                }
                              }}
                              className="h-4 w-4 cursor-pointer"
                            />
                          </th>
                        )}
                        <th className="w-12 px-4 py-2.5 text-left text-xs font-bold text-gray-700">
                          Orden
                        </th>
                        <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-700">
                          N°
                        </th>
                        <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-700">
                          Nombre
                        </th>
                        <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-700">
                          Distrito
                        </th>
                        <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-700">
                          Dirección
                        </th>
                        <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-700">
                          Fecha
                        </th>
                        <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-700">
                          Área
                        </th>
                        <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-700">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {grupo.pasajeros.map((pasajero, index) => (
                        <tr
                          key={pasajero.id}
                          draggable={grupoEnSeleccion !== grupo.id}
                          onDragStart={(e) =>
                            handleDragStart(e, pasajero, grupo.id, index)
                          }
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
                                checked={pasajerosSeleccionados.has(
                                  pasajero.id,
                                )}
                                onChange={() =>
                                  toggleSeleccionPasajero(pasajero.id)
                                }
                                className="h-4 w-4 cursor-pointer"
                              />
                            </td>
                          )}

                          <td className="bg-gray-100 px-4 py-0">
                            <div className="flex flex-col gap-1">
                              <button
                                onClick={() =>
                                  moverPasajeroArriba(grupo.id, index)
                                }
                                disabled={index === 0}
                                className={`flex items-center justify-center rounded p-0 ${
                                  index === 0
                                    ? 'cursor-not-allowed text-gray-300'
                                    : 'text-gray-600 hover:bg-gray-200'
                                }`}
                                title="Mover arriba"
                              >
                                <ChevronUp className="h-4 w-4" />
                              </button>

                              <button
                                onClick={() =>
                                  moverPasajeroAbajo(
                                    grupo.id,
                                    index,
                                    grupo.pasajeros.length,
                                  )
                                }
                                disabled={index === grupo.pasajeros.length - 1}
                                className={`flex items-center justify-center rounded p-0 ${
                                  index === grupo.pasajeros.length - 1
                                    ? 'cursor-not-allowed text-gray-300'
                                    : 'text-gray-600 hover:bg-gray-200'
                                }`}
                                title="Mover abajo"
                              >
                                <ChevronDown className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-1 text-[12px] font-medium text-gray-900">
                            {index + 1}
                          </td>
                          <td className="px-4 py-1 text-[12px] text-gray-900">
                            {pasajero.nombre}
                          </td>
                          <td className="px-4 py-1 text-[12px] text-gray-700">
                            {pasajero.distrito}
                          </td>
                          <td
                            className="max-w-md px-4 py-1 text-[12px] text-gray-700"
                            title={pasajero.direccion}
                          >
                            {pasajero.direccion}
                          </td>
                          <td className="px-4 py-1 text-[12px] text-gray-700">
                            {pasajero.fecha}
                          </td>
                          <td className="px-4 py-1 text-[12px]">
                            <span className="rounded bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
                              {pasajero.area}
                            </span>
                          </td>
                          <td className="px-4 py-1">
                            <div className="flex gap-2">
                              <ButtonEliminarPasajero
                                pasajero={pasajero}
                                grupoId={grupo.id}
                                onEliminar={solicitarEliminarPasajero}
                              />

<ModalDirecciones
  codCliente={pasajero.codlan || ''}
  nombrePasajero={pasajero.nombre}
  codigo={pasajero.id}
  setShouldRefetch={setShouldRefetch}
  useTalmaEndpoint={true}
/>


                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <Users className="mx-auto mb-2 h-12 w-12 opacity-30" />
                  <p>No hay pasajeros en este grupo</p>
                </div>
              )}

              {/* Barra inferior con inputs editables */}
              <FooterTablaList
                grupo={grupo}
                actualizarGrupo={actualizarGrupo}
                grupoEnSeleccion={grupoEnSeleccion}
                abrirModalMover={abrirModalMover}
                pasajerosSeleccionados={pasajerosSeleccionados}
                cancelarSeleccion={cancelarSeleccion}
                activarSeleccionMultiple={activarSeleccionMultiple}
                conductores={conductores}
                unidades={unidades}
                onRefrescarDatos={async () => {
                await cargarDatosExternos(
                  parametrosCarga.fecha,
                  parametrosCarga.hora,
                  parametrosCarga.tipo
                );
  }}
              />
            </div>
          ))
        )}
      </div>

      <PapeleraGrupos
        fecha={parametrosCarga.fecha}
        hora={parametrosCarga.hora}
        tipo={parametrosCarga.tipo}
        triggerRecarga={triggerRecargaPapelera}
        pasajerosRestaurados={pasajerosRestaurados}
        onRestaurar={restaurarPasajero}
        onEliminarPermanentemente={eliminarPermanentemente}
      />



    </div>
  );
});

TablaList.displayName = 'TablaList';
