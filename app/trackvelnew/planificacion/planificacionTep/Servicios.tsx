import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { MdAddBox } from 'react-icons/md';
import Container from './container';
import { Item } from './sortable_item';
import { obtenerDatosYAgrupar } from './fomarGrupos/apiService';
import GrupoEliminados from './GrupoEliminados';
import { Spinner } from '@nextui-org/react';
import { MdDelete } from 'react-icons/md';
import axios from 'axios';
import ModalDirecciones from './ModalDirecciones';
import { parseFechaHora } from '@/app/components/dates/convertToCustomFormat ';
import { API_BASE_URL125 } from '@/app/components/urlsApi/urlApi';
import { toast } from 'sonner';
import Swal from 'sweetalert2';

const wrapperStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
};

type Grupo = {
  tipo: string;
  fecha: string;
  horaprog: string;
};

interface ServiciosProps {
  empresa: string;
  dato: string;
  onGuardar?: (fn: () => void) => void;
  onActualizarDatos?: (datos: {
    totalGrupos: number;
    totalPasajeros: number;
  }) => void;
  onActualizarCabeceras?: (
    cabeceras: { empresa: string; fecha: string }[],
  ) => void;
  filtro?: { empresa: string; fecha: string } | null;
  nombrePasajero?: string;
  onActualizarFechas?: (fechas: {
    totalFechas: number;
    fechasLlenas: number;
  }) => void;
  modoVista: string;
  onLimpiarRefReady?: (handler: () => void) => void;
  setContadorGrupos: (value: number) => void;
  fechaSeleccionada: Date | null;
   onAgregarGrupoReady?: (handler: (nuevoGrupo: any) => void) => void;
}

export interface ServiciosRef {
  ejecutarGrupoCero: () => void;
}

export default function App({
  empresa,
  dato,
  onGuardar,
  onActualizarDatos,
  onActualizarCabeceras,
  filtro,
  nombrePasajero = '',
  onActualizarFechas,
  modoVista,
  onLimpiarRefReady,
  setContadorGrupos,
  fechaSeleccionada,
  onAgregarGrupoReady
}: ServiciosProps) {
  const [grupos, setGrupos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [shouldRefetch, setShouldRefetch] = useState(false);
  const [shouldRefetchAddPasajero, setShouldRefetchAddPasajero] =
    useState(false);
  const [conductores, setConductores] = useState<{ [grupoId: number]: number }>(
    {},
  );
  const [unidades, setUnidades] = useState<{ [grupoId: number]: string }>({});

  const handleUpdateConductor = (id: number, codigoConductor: number) => {
    setConductores((prev) => {
      return { ...prev, [id]: codigoConductor };
    });
  };

  const handleUpdateUnidad = (id: number, codigoUnidad: string) => {
    setUnidades((prev) => {
      return { ...prev, [id]: codigoUnidad };
    });
  };


  // Reemplaza la función agregarNuevoGrupo en Servicios.tsx con esta versión corregida:

const agregarNuevoGrupo = (nuevoGrupo: any) => {
  console.log('Función agregarNuevoGrupo ejecutada con:', nuevoGrupo);
  
  setGrupos((prevGrupos) => {
    console.log('Estado actual de grupos:', prevGrupos);
    
    // Generar un ID único basado en el timestamp y los grupos existentes
    const ultimoId = prevGrupos.length > 0 ? Math.max(...prevGrupos.map(g => g.id)) : 0;
    const nuevoId = ultimoId + 1;
    
    // Generar un idCliente único para la persona
    const todosLosIdClientes = prevGrupos.flatMap(grupo => 
      grupo.personas ? grupo.personas.map((persona: any) => persona.idCliente) : []
    );
    const ultimoIdCliente = todosLosIdClientes.length > 0 ? Math.max(...todosLosIdClientes) : 0;
    const nuevoIdCliente = ultimoIdCliente + 1;

    // Crear el grupo con la estructura correcta
    const grupoFormateado = {
      ...nuevoGrupo,
      id: nuevoId,
      personas: nuevoGrupo.personas.map((persona: any) => ({
        ...persona,
        idCliente: nuevoIdCliente,
        codigo: nuevoIdCliente.toString(),
        codCliente: nuevoIdCliente.toString(),
        eliminado: '0'
      }))
    };

    console.log('Nuevo grupo formateado:', grupoFormateado);
    
    // Agregar el nuevo grupo al final de la lista
    const nuevosGrupos = [...prevGrupos, grupoFormateado];
    
    console.log('Nuevos grupos después de agregar:', nuevosGrupos);
    
    // Actualizar los datos después de agregar el grupo (sin setTimeout)
    if (onActualizarDatos) {
      onActualizarDatos({
        totalGrupos: nuevosGrupos.length,
        totalPasajeros: nuevosGrupos.reduce(
          (acc, grupo) => acc + (grupo.personas?.length || 0),
          0,
        ),
      });
    }

    if (onActualizarCabeceras) {
      const cabeceras = nuevosGrupos.map((grupo) => ({
        empresa: grupo.empresa,
        fecha: grupo.fecha,
      }));
      onActualizarCabeceras(cabeceras);
    }

    return nuevosGrupos;
  });
};

// Y asegúrate de que el useEffect esté también corregido:

useEffect(() => {
  console.log('Registrando función agregarNuevoGrupo');
  if (onAgregarGrupoReady) {
    onAgregarGrupoReady(agregarNuevoGrupo);
    console.log('Función agregarNuevoGrupo registrada exitosamente');
  }
}, [onAgregarGrupoReady, onActualizarDatos, onActualizarCabeceras]); // Agregar dependencias



  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const groupedData = await obtenerDatosYAgrupar(empresa, dato);

      const nuevosGrupos = groupedData.map((grupo) => ({
        ...grupo,
        personas: grupo.personas.filter(
          (persona: any) => persona.eliminado === '0',
        ),
      }));

      const nuevosEliminados = groupedData.flatMap((grupo) =>
        grupo.personas
          .filter((persona: any) => persona.eliminado === '1')
          .map((persona: any) => ({
            ...persona,
            numGrupo: grupo.id,
            ordenOriginal: persona.idCliente,
          })),
      );

      setGrupos(nuevosGrupos);
      setEliminados(nuevosEliminados);
      setLoading(false);

      if (onActualizarDatos) {
        onActualizarDatos({
          totalGrupos: groupedData.length,
          totalPasajeros: groupedData.reduce(
            (acc, grupo) => acc + (grupo.personas?.length || 0),
            0,
          ),
        });
      }

      if (onActualizarCabeceras) {
        const cabeceras = groupedData.map((grupo) => ({
          empresa: grupo.empresa,
          fecha: grupo.fecha,
        }));
        onActualizarCabeceras(cabeceras);
      }

      const totalFechas = nuevosGrupos.length * 2;
      const esValido = (valor: any) =>
        valor !== null &&
        valor !== undefined &&
        valor !== '' &&
        valor !== 'null';

      const fechasLlenas = nuevosGrupos.reduce((count, grupo) => {
        if (esValido(grupo.fecha)) count++;
        if (esValido(grupo.horaprog)) count++;
        return count;
      }, 0);

      if (onActualizarFechas) {
        onActualizarFechas({ totalFechas, fechasLlenas });
      }

      setShouldRefetch(false);
      setShouldRefetchAddPasajero(false);
    };

    fetchData();
  }, [empresa, shouldRefetch, shouldRefetchAddPasajero, dato]);

  const handleRefrescarDatos = () => {
    setShouldRefetchAddPasajero(true);
  };

  useEffect(() => {
    if (grupos.length > 0 && onActualizarFechas) {
      const totalFechas = grupos.length * 2;
      const esValido = (valor: any) =>
        valor !== null &&
        valor !== undefined &&
        valor !== '' &&
        valor !== 'null';
      const fechasLlenas = grupos.reduce((count, grupo) => {
        if (esValido(grupo.fecha)) count++;
        if (esValido(grupo.horaprog)) count++;
        return count;
      }, 0);

      onActualizarFechas({ totalFechas, fechasLlenas });
    }
  }, [grupos]);

  const handleUpdateGrupoHoraProg = (id: number, nuevaFecha: string) => {
    console.log(`Actualizando grupo ID: ${id}, Nueva fecha: ${nuevaFecha}`);
    setGrupos((prevGrupos) =>
      prevGrupos.map((grupo) =>
        grupo.id === id ? { ...grupo, horaprog: nuevaFecha } : grupo,
      ),
    );
  };

  const gruposFiltrados = useMemo(() => {
    if (!filtro?.fecha && !nombrePasajero.trim()) return grupos;
    const filtroFechaHora = filtro?.fecha ? parseFechaHora(filtro.fecha) : null;
    return grupos.filter((grupo) => {
      const fechaHoraGrupo = parseFechaHora(grupo.fecha);
      const coincideFecha = filtroFechaHora
        ? fechaHoraGrupo === filtroFechaHora
        : true;

      const nombreBuscado = nombrePasajero.trim().toLowerCase();
      const coincidePasajero = !nombreBuscado
        ? true
        : grupo.personas.some((persona: any) =>
            persona.nombre.trim().toLowerCase().includes(nombreBuscado),
          );
      return coincideFecha && coincidePasajero;
    });
  }, [grupos, filtro, nombrePasajero]);

  useEffect(() => {
    console.log('Grupos filtrados:', gruposFiltrados);
  }, [gruposFiltrados]);

  function verificarGrupos(grupos: Grupo[], fechaParametro: string) {
    let contador = 0;

    const extraerSoloFecha = (fechaHora: string) => fechaHora.split(' ')[0];

    grupos.forEach((grupo) => {
      if (grupo.tipo === 'I') {
        const fechaGrupo = extraerSoloFecha(grupo.fecha);
        if (fechaGrupo === fechaParametro) {
          if (!grupo.horaprog || grupo.horaprog === 'null') {
            contador++;
          }
        }
      } else if (grupo.tipo === 'S') {
        const horaprogGrupo = extraerSoloFecha(grupo.fecha || '');
        if (horaprogGrupo === fechaParametro) {
          if (!grupo.horaprog || grupo.horaprog === 'null') {
            contador++;
          }
        }
      }
    });

    return contador;
  }

  function formatFechaDMY(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  useEffect(() => {
    if (gruposFiltrados.length > 0 && fechaSeleccionada) {
      const fechaParametro = formatFechaDMY(fechaSeleccionada);
      const contador = verificarGrupos(gruposFiltrados, fechaParametro);
      setContadorGrupos(contador);
    }
  }, [gruposFiltrados, fechaSeleccionada]);

  const [items, setItems] = useState<
    Record<
      string,
      {
        id: string;
        numGrupo: number;
        orderItem: number;
        nombre: string;
        distrito: string;
        direccion: string;
        fechaItem: string;
        area: string;
        acciones: React.ReactNode;
      }[]
    >
  >({});

  useEffect(() => {
    if (gruposFiltrados.length > 0) {
      const nuevoItems = gruposFiltrados.reduce((acc, grupo, index) => {
        if (grupo.personas && grupo.personas.length > 0) {
          acc[`container${index}`] = grupo.personas.map(
            (persona: any, idx: any) => {
              return {
                id: String(persona.idCliente),
                orderItem: idx + 1,
                nombre: persona.nombre,
                distrito: persona.distrito,
                direccion: persona.direccion,
                fechaItem: grupo.fecha,
                area: persona.area,
                numGrupo: grupo.id,
                tipo: grupo.tipo,
                destino: grupo.destinoGrupo,
                empresa: grupo.empresa,
                fecha: grupo.fecha,
                horaprog: grupo.horaprog,
                wx: persona.wx,
                wy: persona.wy,
                acciones: (
                  <div className="accionesItems">
                    <div className="relative inline-block h-8 w-8">
                      <div className="group relative h-full w-full">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoverAGrupoNuevo(Number(persona.idCliente));
                          }}
                          onPointerDown={(e) => e.stopPropagation()}
                          type="button"
                          className="flex h-full w-full items-center justify-center rounded bg-green-500 hover:bg-green-600 focus:outline-none"
                        >
                          <MdAddBox size={16} className="text-gray-800" />
                        </button>

                        <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-max -translate-x-1/2 rounded-md bg-green-800 px-3 py-1.5 text-xs text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                          Mover a nuevo grupo
                        </div>
                      </div>
                    </div>

                    <div className="relative inline-block h-8 w-8">
                      <div className="group relative h-full w-full">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEliminarDelArray(Number(persona.idCliente));
                          }}
                          onPointerDown={(e) => e.stopPropagation()}
                          type="button"
                          className="flex h-full w-full items-center justify-center rounded bg-red-600 hover:bg-red-500 focus:outline-none"
                        >
                          <MdDelete size={16} className="text-white" />
                        </button>

                        <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-max -translate-x-1/2 rounded-md bg-red-800 px-3 py-1.5 text-xs text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                          Eliminar Pasajero
                        </div>
                      </div>
                    </div>

                    <ModalDirecciones
                      codCliente={persona.codCliente}
                      nombrePasajero={persona.nombre}
                      codigo={persona.codigo}
                      setShouldRefetch={setShouldRefetch}
                    />
                  </div>
                ),
              };
            },
          );
        }
        return acc;
      }, {});

      setItems(nuevoItems);
    }
  }, [grupos, gruposFiltrados]);

  const [eliminados, setEliminados] = useState<any[]>([]);

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function findContainer(id: string) {
    if (id in items) {
      return id;
    }

    return Object.keys(items).find((key) =>
      items[key].some((item) => item.id === id),
    );
  }

  function handleDragStart(event: any) {
    const { active } = event;
    setActiveId(active.id);
  }

  function handleDragOver(event: any) {
    // Ahora NO hacemos nada aquí.
    // Solo si quieres algún efecto visual en el futuro, pero no movemos los datos.
  }

  async function handleDragEnd(event: any) {
    const { active, over } = event;
    setActiveId(null);

    if (!over) {
      return;
    }

    const activeId = active.id;
    const overId = over.id;

    if (overId === 'grupo-eliminados') {
      handleEliminarDelArray(Number(activeId));
      return;
    }

    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);

    if (!activeContainer || !overContainer) {
      return;
    }

    const activeContainerIndex = Number(activeContainer.replace(/\D/g, ''));
    const overContainerIndex = Number(overContainer.replace(/\D/g, ''));

    const activeIndex = items[activeContainer]?.findIndex(
      (item) => item.id === activeId,
    );
    const overIndex = items[overContainer]?.findIndex(
      (item) => item.id === overId,
    );

    const encontrarGrupoPorCliente = (idCliente: number) => {
      return grupos.findIndex((grupo) =>
        grupo.personas.some((persona: any) => persona.idCliente === idCliente),
      );
    };

    const indiceGrupo = encontrarGrupoPorCliente(Number(activeId));

    console.log(
      `Intentando mover el item ${activeId} del grupo ${indiceGrupo} al grupo ${overContainerIndex}`,
    );

    if (indiceGrupo === overContainerIndex) {
      intercambiarClientes(activeContainerIndex, activeIndex, overIndex);
      return;
    }

    const resultado = await Swal.fire({
      title:
        '<p style="font-size: 1.4rem; line-height: 1.4;">¿Deseas mover este cliente a otro grupo? Asegúrate de revisar la fecha programada de cada grupo.</p>',
      text: 'Confirma esta acción antes de continuar.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, mover',
      cancelButtonText: 'Cancelar',
    });

    if (resultado.isConfirmed) {
      moverClienteOtroGrupo(
        Number(activeId),
        indiceGrupo,
        overContainerIndex,
        overIndex ?? 0,
      );
    }
  }

  const intercambiarClientes = (
    grupoIndex: number,
    activeIndex: number,
    overIndex: number,
  ) => {
    setGrupos((prevGrupos) => {
      if (grupoIndex < 0 || grupoIndex >= prevGrupos.length) {
        console.error(`Error: grupoIndex fuera de rango (${grupoIndex})`);
        return prevGrupos;
      }

      let nuevosGrupos = [...prevGrupos];
      let personasGrupo = [...nuevosGrupos[grupoIndex].personas];

      if (
        activeIndex < 0 ||
        activeIndex >= personasGrupo.length ||
        overIndex < 0 ||
        overIndex >= personasGrupo.length
      ) {
        console.error(`Error: Índices fuera de rango en grupo ${grupoIndex}`, {
          activeIndex,
          overIndex,
        });
        return prevGrupos;
      }

      const [movedItem] = personasGrupo.splice(activeIndex, 1);
      personasGrupo.splice(overIndex, 0, movedItem);

      personasGrupo = personasGrupo.map((persona, index) => ({
        ...persona,
        idCliente: nuevosGrupos[grupoIndex].personas[index].idCliente,
      }));

      nuevosGrupos[grupoIndex] = {
        ...nuevosGrupos[grupoIndex],
        personas: personasGrupo,
      };

      return nuevosGrupos;
    });
  };

  const moverClienteOtroGrupo = (
    idCliente: number,
    origenIndex: number,
    destinoIndex: number,
    overIndex: number,
  ) => {
    setGrupos((prevGrupos) => {
      let nuevosGrupos = JSON.parse(JSON.stringify(prevGrupos));
      const grupoOrigen = nuevosGrupos[origenIndex];
      const grupoDestino = nuevosGrupos[destinoIndex];
      const clienteMovidoIndex = grupoOrigen.personas.findIndex(
        (persona: any) => persona.idCliente === idCliente,
      );
      if (clienteMovidoIndex === -1) return prevGrupos;
      const [clienteMovido] = grupoOrigen.personas.splice(
        clienteMovidoIndex,
        1,
      );

      if (overIndex >= grupoDestino.personas.length) {
        grupoDestino.personas.push(clienteMovido);
      } else {
        grupoDestino.personas.splice(overIndex, 0, clienteMovido);
      }

      return nuevosGrupos;
    });

    setTimeout(() => {
      setGrupos((prevGrupos) => {
        let idCounter = 1;
        const nuevosGrupos = prevGrupos.map((grupo) => ({
          ...grupo,
          personas: grupo.personas.map((persona: any) => ({
            ...persona,
            idCliente: idCounter++,
          })),
        }));

        return nuevosGrupos;
      });
    }, 0);
  };

  const handleMoverAGrupoNuevo = (idCliente: number) => {
    setGrupos((prevGrupos) => {
      let nuevosGrupos = [...prevGrupos];

      let grupoOrigenIndex = nuevosGrupos.findIndex((grupo) =>
        grupo.personas.some((persona: any) => persona.idCliente === idCliente),
      );

      if (grupoOrigenIndex !== -1) {
        let clienteMovido = nuevosGrupos[grupoOrigenIndex].personas.find(
          (persona: any) => persona.idCliente === idCliente,
        );

        if (clienteMovido) {
          const grupoOrigen = nuevosGrupos[grupoOrigenIndex];

          nuevosGrupos[grupoOrigenIndex].personas = nuevosGrupos[
            grupoOrigenIndex
          ].personas.filter((persona: any) => persona.idCliente !== idCliente);

          const nuevoGrupo = {
            id: grupoOrigen.id + 1,
            destinoGrupo: grupoOrigen.destinoGrupo,
            empresa: grupoOrigen.empresa,
            fecha: grupoOrigen.fecha,
            tipo: grupoOrigen.tipo,
            horaprog: grupoOrigen.horaprog,
            personas: [clienteMovido],
          };

          nuevosGrupos.splice(grupoOrigenIndex + 1, 0, nuevoGrupo);

          for (let i = grupoOrigenIndex + 2; i < nuevosGrupos.length; i++) {
            nuevosGrupos[i].id += 1;
          }
        }
      }

      return nuevosGrupos;
    });
  };

  const handleEliminarDelArray = (idCliente: number) => {
    setGrupos((prevGrupos) => {
      let nuevosGrupos = [...prevGrupos];

      let grupoOrigenIndex = nuevosGrupos.findIndex((grupo) =>
        grupo.personas.some((persona: any) => persona.idCliente === idCliente),
      );

      if (grupoOrigenIndex !== -1) {
        let clienteEliminado = nuevosGrupos[grupoOrigenIndex].personas.find(
          (persona: any) => persona.idCliente === idCliente,
        );

        if (clienteEliminado) {
          clienteEliminado = {
            ...clienteEliminado,
            numGrupo: nuevosGrupos[grupoOrigenIndex].id,
            ordenOriginal: idCliente,
          };

          nuevosGrupos[grupoOrigenIndex].personas = nuevosGrupos[
            grupoOrigenIndex
          ].personas.filter((persona: any) => persona.idCliente !== idCliente);

          setEliminados((prevEliminados) => {
            const nuevosEliminados = [...prevEliminados, clienteEliminado];

            console.log(
              `Cliente eliminado:`,
              clienteEliminado,
              `\nViene del grupo:`,
              clienteEliminado.numGrupo,
              `\nNuevo estado de eliminados:`,
              nuevosEliminados,
            );

            return nuevosEliminados;
          });
        }
      }

      return nuevosGrupos;
    });
  };

  useEffect(() => {
    console.log('Estado actualizado de eliminados:', eliminados);
  }, [eliminados]);

  const ejecutarGrupoCero = async () => {
    const toastId = toast.loading('Cargando ...');
    try {
      const response = await axios.put(
        'https://velsat.pe:8586/api/Preplan/GrupoCero?usuario=movilbus',
        {},
      );

      if (response.status === 200) {
        toast.success('Eliminado con éxito', { id: toastId });
        setEliminados([]);
      } else {
        toast.error('No se pudo eliminar. Por favor, inténtalo nuevamente.', {
          id: toastId,
        });
      }
    } catch (error) {
      console.error('Error al ejecutar GrupoCero:', error);
      toast.error('No se pudo eliminar. Por favor, inténtalo nuevamente.', {
        id: toastId,
      });
    }
  };

  useEffect(() => {
    if (onLimpiarRefReady) {
      onLimpiarRefReady(ejecutarGrupoCero);
    }
  }, []);

  const handleGuardar = async (
    data: any[],
    eliminados: any[],
    conductoresActualizados: any,
    unidadesActualizadas: any,
    esAutomatico: boolean = false,
  ) => {
    const dataToSend = [
      ...data.flatMap((grupo, grupoIndex) => {
        if (!grupo.personas || grupo.personas.length === 0) return [];

        const codConductor = conductores[grupo.id] ?? grupo.codConductor ?? 0;
        const codConductorStr = String(codConductor);

        const codUnidad = unidades[grupo.id] ?? grupo.unidad ?? '';

        return grupo.personas.map((persona: any, personaIndex: any) => ({
          codigo: Number(persona.codigo) || 0,
          horaprog: String(grupo.horaprog),
          orden: String(persona.idCliente - 1),
          numero: String(grupoIndex),
          eliminado: '0',
          codconductor: codConductorStr,
          codunidad: codUnidad,
          codtarifa: '',
          destinocodigo: grupo.destino?.coddestino?.trim(),
        }));
      }),

      ...eliminados.map((personaEliminada: any) => ({
        codigo: Number(personaEliminada.codigo) || 0,
        horaprog: String(personaEliminada.fechaItem),
        orden: String(personaEliminada.ordenOriginal - 1),
        numero: String(personaEliminada.numGrupo - 1),
        eliminado: '1',
        codconductor: '0',
        codunidad: '',
        codtarifa: '',
        destinocodigo: '',
      })),
    ];

    console.log('Datos a enviar:', JSON.stringify(dataToSend, null, 2));
    if (dataToSend.length === 0) {
      console.warn('No hay datos válidos para enviar a la API.');
      return;
    }

    const loadingToast = !esAutomatico
      ? toast.loading('Guardando datos...', { duration: 0 })
      : null;
    try {
      const response = await axios.put(
        `${API_BASE_URL125}/api/Preplan/save?usuario=movilbus`,
        dataToSend,
        { headers: { 'Content-Type': 'application/json' } },
      );

      console.log('Respuesta de la API:', response.data);
      if (!esAutomatico) {
        toast.dismiss(loadingToast!);
        toast.success('Datos guardados correctamente');
      }
    } catch (error) {
      console.error('Error al guardar los datos:', error);
      toast.dismiss(loadingToast!);
      toast.error('Error al guardar los datos.');
    }
  };

  const guardarCallback = useCallback(
    (esAutomatico: boolean = false) => {
      handleGuardar(grupos, eliminados, conductores, unidades, esAutomatico);
    },
    [grupos, eliminados, conductores, unidades],
  );

  useEffect(() => {
    if (onGuardar) {
      onGuardar(() => guardarCallback);
    }
  }, [guardarCallback]);

  const handleRestore = (item: any) => {
    setEliminados((prevEliminados) =>
      prevEliminados.filter(
        (eliminado) => eliminado.idCliente !== item.idCliente,
      ),
    );

    setGrupos((prevGrupos) => {
      let nuevosGrupos = [...prevGrupos];

      let grupoOriginalIndex = nuevosGrupos.findIndex(
        (grupo) => Number(grupo.id) === Number(item.numGrupo),
      );
      if (grupoOriginalIndex !== -1) {
        let existeEnGrupo = nuevosGrupos[grupoOriginalIndex].personas.some(
          (persona: any) => persona.idCliente === item.idCliente,
        );

        if (!existeEnGrupo) {
          nuevosGrupos[grupoOriginalIndex].personas.push(item);
          console.log(
            `Item restaurado:`,
            item,
            `\nRestaurado al grupo:`,
            nuevosGrupos[grupoOriginalIndex].id,
          );
        } else {
          console.warn('El cliente ya está en el grupo, evitando duplicados.');
        }
      } else {
        console.warn(
          'Grupo original no encontrado. No se restauró correctamente.',
        );
        console.log('Estado actual de grupos:', nuevosGrupos);
        console.log('Buscando grupo con ID:', item.numGrupo);
      }
      return nuevosGrupos;
    });
  };

  const handleUpdateDestino = (
    id: number,
    nuevoDestino: string,
    codigoDestino: string,
  ) => {
    setGrupos((prev) =>
      prev.map((g) =>
        g.id === id
          ? {
              ...g,
              destinoGrupo: nuevoDestino,
              destino: {
                ...g.destino,
                coddestino: codigoDestino,
                nomdestino: nuevoDestino,
              },
            }
          : g,
      ),
    );
  };

  return (
    <div style={wrapperStyle}>
      {loading ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
          }}
        >
          <Spinner color="primary" size="lg" />
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={rectIntersection}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          {modoVista === 'Eliminados' ? (
            <>
              {gruposFiltrados.length > 0 &&
                Object.keys(items).map((key, index) =>
                  gruposFiltrados[index] ? (
                    <Container
                      key={key}
                      id={key}
                      items={items[key] || []}
                      onUpdateDestino={handleUpdateDestino}
                      grupo={gruposFiltrados[index]}
                      coordenadas={gruposFiltrados[index]?.personas
                        ?.filter((p: any) => p.wx && p.wy)
                        .map((p: any) => ({
                          wx: p.wx,
                          wy: p.wy,
                          nombre: p.nombre,
                          direccion: p.direccion,
                        }))}
                      onUpdateGrupoHoraProg={(id: number, nuevaFecha: string) =>
                        handleUpdateGrupoHoraProg(id, nuevaFecha)
                      }
                      onUpdateConductor={handleUpdateConductor}
                      onUpdateUnidad={handleUpdateUnidad}
                      onRefrescarDatos={handleRefrescarDatos}
                    />
                  ) : null,
                )}
              <div>
                <GrupoEliminados items={eliminados} onRestore={handleRestore} />
              </div>
            </>
          ) : (
            <div>
              <GrupoEliminados items={eliminados} onRestore={handleRestore} />
            </div>
          )}

          <DragOverlay>
            {activeId
              ? (() => {
                  const container = findContainer(activeId);
                  if (!container) return null;
                  const item = items[container]?.find(
                    (item) => item.id === activeId,
                  );
                  return item ? <Item {...item} /> : null;
                })()
              : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
