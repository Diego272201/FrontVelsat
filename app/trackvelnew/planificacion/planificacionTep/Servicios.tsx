import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import Container, { ID_CONTENEDOR } from './container';
import {
  Item,
  type ItemData,
  type ItemActionCallbacks,
  type PasajeroDirecciones,
} from './sortable_item';
import ModalDirecciones from './ModalDirecciones';
import ModalMoverGrupo from './ModalMoverGrupo';
import { TbArrowsExchange } from 'react-icons/tb';
import { obtenerDatosYAgrupar } from './fomarGrupos/apiService';
import GrupoEliminados from './GrupoEliminados';
import { Spinner } from '@nextui-org/react';
import axios from 'axios';
import { parseFechaHora } from '@/app/components/dates/convertToCustomFormat ';
import { API_BASE_URL125 } from '@/app/components/urlsApi/urlApi';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { useUsername } from '@/hooks/useUsername';

const wrapperStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
};

/**
 * Identificador estable de grupo. El `id` visible se reindexa cada vez que un
 * grupo se vacía, así que no sirve como clave: al desplazarse invalidaría el
 * memo de TODOS los contenedores. El uid no cambia nunca durante la sesión.
 */
let contadorUid = 0;
const nuevoUid = () => `g${++contadorUid}`;

type Grupo = {
  tipo: string;
  fecha: string;
  horaprog: string;
};

interface ServiciosProps {
  empresa: string;
  dato: string;
  onGuardar?: (fn: () => (esAutomatico?: boolean) => void) => void;
  onActualizarDatos?: (datos: {
    totalGrupos: number;
    totalPasajeros: number;
  }) => void;
  onActualizarCabeceras?: (
    cabeceras: { empresa: string; fecha: string }[],
  ) => void;
  filtro?: { empresa: string; fecha: string } | null;
  filtroHora?: string; // Mantener como string simple

  nombrePasajero?: string;
  onActualizarFechas?: (fechas: {
    totalFechas: number;
    fechasLlenas: number;
  }) => void;
  modoVista: string;
  onLimpiarRefReady?: (handler: () => void) => void;
  setContadorGrupos: (value: number) => void;
  fechaSeleccionada: Date | null;
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
  filtroHora,
  nombrePasajero = '',
  onActualizarFechas,
  modoVista,
  onLimpiarRefReady,
  setContadorGrupos,
  fechaSeleccionada,
}: ServiciosProps) {
  const { username, isReady } = useUsername();

  const [grupos, setGrupos] = useState<any[]>([]);
  const gruposRef = useRef(grupos);
  gruposRef.current = grupos;

  const [loading, setLoading] = useState(true);
  const [shouldRefetch, setShouldRefetch] = useState(false);
  const [shouldRefetchAddPasajero, setShouldRefetchAddPasajero] =
    useState(false);
  const [conductores, setConductores] = useState<{ [grupoId: number]: number }>(
    {},
  );
  const [unidades, setUnidades] = useState<{ [grupoId: number]: string }>({});

  // Función simple para extraer hora
  const extraerHora = (fechaHora: string): string => {
    if (!fechaHora || fechaHora === 'null') return '';

    // Si tiene formato "DD/MM/YYYY HH:MM"
    if (fechaHora.includes(' ')) {
      return fechaHora.split(' ')[1] || '';
    }

    // Si ya es solo hora
    return fechaHora;
  };

  const handleUpdateConductor = useCallback(
    (id: number, codigoConductor: number) => {
      setConductores((prev) => ({ ...prev, [id]: codigoConductor }));
    },
    [],
  );

  const handleUpdateUnidad = useCallback((id: number, codigoUnidad: string) => {
    setUnidades((prev) => ({ ...prev, [id]: codigoUnidad }));
  }, []);

  // Función para limpiar grupos vacíos y reindexar reservando referencias inmutables
  const limpiarGruposVacios = (gruposActuales: any[]) => {
    const tieneGruposVacios = gruposActuales.some(
      (grupo) => !grupo.personas || grupo.personas.length === 0,
    );

    if (!tieneGruposVacios) {
      // Si ningún grupo está vacío, verificar si los IDs ya están consecutivos para reutilizar objetos
      let idsCambian = false;
      for (let i = 0; i < gruposActuales.length; i++) {
        if (gruposActuales[i].id !== i + 1) {
          idsCambian = true;
          break;
        }
      }
      if (!idsCambian) return gruposActuales;
    }

    const gruposConPasajeros = gruposActuales.filter(
      (grupo) => grupo.personas && grupo.personas.length > 0,
    );

    return gruposConPasajeros.map((grupo, index) => {
      const nuevoId = index + 1;
      if (grupo.id === nuevoId) return grupo;
      return { ...grupo, id: nuevoId };
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!isReady || !username) return;

      setLoading(true);
      const groupedData = await obtenerDatosYAgrupar(empresa, dato, username);

      const nuevosGrupos = groupedData.map((grupo) => ({
        ...grupo,
        uid: nuevoUid(),
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

      // Limpiar grupos vacíos y reindexar
      const gruposLimpios = limpiarGruposVacios(nuevosGrupos);

      setGrupos(gruposLimpios);
      setEliminados(nuevosEliminados);
      setLoading(false);

      if (onActualizarCabeceras) {
        const cabeceras = gruposLimpios.map((grupo) => ({
          empresa: grupo.empresa,
          fecha: grupo.fecha,
        }));
        onActualizarCabeceras(cabeceras);
      }

      const totalFechas = gruposLimpios.length * 2;
      const esValido = (valor: any) =>
        valor !== null &&
        valor !== undefined &&
        valor !== '' &&
        valor !== 'null';

      const fechasLlenas = gruposLimpios.reduce((count, grupo) => {
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
  }, [empresa, shouldRefetch, shouldRefetchAddPasajero, dato, username]);

  const handleRefrescarDatos = useCallback(() => {
    setShouldRefetchAddPasajero(true);
  }, []);

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

  // Los contadores se derivan aquí, no dentro de los updaters de setGrupos.
  // Antes cada operación los avisaba desde dentro del updater con un setTimeout;
  // como React ejecuta los updaters dos veces en StrictMode, ese patrón
  // duplicaba efectos secundarios.
  useEffect(() => {
    if (!onActualizarDatos) return;
    onActualizarDatos({
      totalGrupos: grupos.length,
      totalPasajeros: grupos.reduce(
        (acc, grupo) => acc + (grupo.personas?.length || 0),
        0,
      ),
    });
  }, [grupos]);

  const handleUpdateGrupoHoraProg = useCallback(
    (id: number, nuevaFecha: string) => {
      setGrupos((prevGrupos) =>
        prevGrupos.map((grupo) =>
          grupo.id === id ? { ...grupo, horaprog: nuevaFecha } : grupo,
        ),
      );
    },
    [],
  );

  // Actualizar gruposFiltrados:
  const gruposFiltrados = useMemo(() => {
    if (!filtro?.fecha && !nombrePasajero.trim() && !filtroHora?.trim())
      return grupos;

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

      // Filtro de hora super simple
      let coincideHora = true;
      if (filtroHora?.trim()) {
        const horaGrupo = extraerHora(grupo.horaprog);
        coincideHora = horaGrupo.includes(filtroHora.trim());
      }

      return coincideFecha && coincidePasajero && coincideHora;
    });
  }, [grupos, filtro, nombrePasajero, filtroHora]);

  const handleCopiarLink = useCallback(
    async (coords: { lat: number; lng: number }) => {
      if (isNaN(coords.lat) || isNaN(coords.lng)) {
        toast.error('Coordenadas inválidas');
        return;
      }

      const googleMapsLink = `https://www.google.com/maps?q=${coords.lat},${coords.lng}`;

      try {
        await navigator.clipboard.writeText(googleMapsLink);
        toast.success('Link copiado al portapapeles');
      } catch (error) {
        toast.error('Error al copiar el link');
        console.error('Error al copiar:', error);
      }
    },
    [],
  );

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

  const prevItemsCacheRef = useRef<
    Record<
      string,
      { personas: any[]; fecha: string; itemDataArray: ItemData[] }
    >
  >({});

  // Indexado por uid, no por posición: así reindexar los ids visibles no
  // invalida los arreglos del resto de grupos y su memo puede cortar.
  const items = useMemo<Record<string, ItemData[]>>(() => {
    if (gruposFiltrados.length === 0) return {};

    const nextCache: typeof prevItemsCacheRef.current = {};

    const result = gruposFiltrados.reduce<Record<string, ItemData[]>>(
      (acc, grupo) => {
        const cacheKey = grupo.uid;
        const prevCache = prevItemsCacheRef.current[cacheKey];

        if (grupo.personas && grupo.personas.length > 0) {
          // Si personas y fecha no han cambiado, reutilizar el arreglo exactamente
          if (
            prevCache &&
            prevCache.personas === grupo.personas &&
            prevCache.fecha === grupo.fecha &&
            prevCache.itemDataArray[0]?.numGrupo === grupo.id
          ) {
            acc[cacheKey] = prevCache.itemDataArray;
            nextCache[cacheKey] = prevCache;
          } else {
            const itemDataArray: ItemData[] = grupo.personas.map(
              (persona: any, idx: number) => ({
                id: String(persona.idCliente),
                orderItem: idx + 1,
                nombre: persona.nombre,
                distrito: persona.distrito,
                direccion: persona.direccion,
                fechaItem: grupo.fecha,
                area: persona.area,
                numGrupo: grupo.id,
                wx: persona.wx ?? '',
                wy: persona.wy ?? '',
                codCliente: persona.codCliente ?? '',
                codigo: persona.codigo ?? '',
              }),
            );
            acc[cacheKey] = itemDataArray;
            nextCache[cacheKey] = {
              personas: grupo.personas,
              fecha: grupo.fecha,
              itemDataArray,
            };
          }
        }
        return acc;
      },
      {},
    );

    prevItemsCacheRef.current = nextCache;
    return result;
  }, [gruposFiltrados]);

  const [eliminados, setEliminados] = useState<any[]>([]);

  /**
   * Reordenamiento dentro de un mismo grupo.
   *
   * Reemplaza el objeto de UN grupo y devuelve el resto por referencia, que es
   * lo que permite que reordenar no re-renderice a los demás. No pasa por
   * limpiarGruposVacios a propósito: reordenar no puede vaciar un grupo, y
   * reindexar invalidaría contenedores que no han cambiado.
   */
  const handleReordenar = useCallback(
    (uid: string, desdeIndice: number, hastaIndice: number) => {
      setGrupos((prevGrupos) =>
        prevGrupos.map((grupo) => {
          if (grupo.uid !== uid) return grupo;

          const personas = [...grupo.personas];
          if (
            desdeIndice < 0 ||
            desdeIndice >= personas.length ||
            hastaIndice < 0 ||
            hastaIndice >= personas.length
          ) {
            return grupo;
          }

          const [movido] = personas.splice(desdeIndice, 1);
          personas.splice(hastaIndice, 0, movido);

          return { ...grupo, personas };
        }),
      );
    },
    [],
  );

  /* ---------------------------------------------------------------------- */
  /* Arrastre: dentro de un grupo y entre grupos                             */
  /* ---------------------------------------------------------------------- */

  const [arrastre, setArrastre] = useState<{
    itemId: string;
    uidGrupo: string;
  } | null>(null);

  // Filas resaltadas tras un movimiento, por uid de grupo. Lo comparten el
  // arrastre entre grupos y el movimiento por lote del modal.
  const [resaltados, setResaltados] = useState<Record<string, string[]>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const buscarGrupoDePasajero = useCallback((itemId: string) => {
    return gruposRef.current.find((grupo) =>
      grupo.personas.some((p: any) => String(p.idCliente) === itemId),
    );
  }, []);

  // Una sola pasada. Se prefiere la fila concreta bajo el cursor; si no hay
  // ninguna (porque las filas de los otros grupos no son zona de drop), gana el
  // contenedor del grupo, que es lo que dispara el movimiento entre grupos.
  const detectarColisiones = useCallback<CollisionDetection>((args) => {
    const colisiones = pointerWithin(args);

    if (colisiones.length > 0) {
      for (const colision of colisiones) {
        if (!String(colision.id).startsWith(ID_CONTENEDOR)) return [colision];
      }
      return colisiones;
    }

    return closestCenter({
      ...args,
      droppableContainers: args.droppableContainers.filter((c) =>
        String(c.id).startsWith(ID_CONTENEDOR),
      ),
    });
  }, []);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const itemId = String(event.active.id);
      const grupo = buscarGrupoDePasajero(itemId);
      if (!grupo) return;
      // Marcar el grupo activo activa las zonas de drop de SUS filas.
      setArrastre({ itemId, uidGrupo: grupo.uid });
    },
    [buscarGrupoDePasajero],
  );

  const handleDragCancel = useCallback(() => setArrastre(null), []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      const arrastreActual = arrastre;
      setArrastre(null);

      if (!over || !arrastreActual) return;

      const itemId = String(active.id);
      const overId = String(over.id);
      if (itemId === overId) return;

      const uidOrigen = arrastreActual.uidGrupo;
      const grupoOrigen = gruposRef.current.find((g) => g.uid === uidOrigen);
      if (!grupoOrigen) return;

      const soltadoEnContenedor = overId.startsWith(ID_CONTENEDOR);
      const uidDestino = soltadoEnContenedor
        ? overId.slice(ID_CONTENEDOR.length)
        : buscarGrupoDePasajero(overId)?.uid;

      if (!uidDestino) return;

      // ── Mismo grupo: reordenar ──
      if (uidDestino === uidOrigen) {
        if (soltadoEnContenedor) return; // soltado en zona vacía del grupo
        const desde = grupoOrigen.personas.findIndex(
          (p: any) => String(p.idCliente) === itemId,
        );
        const hasta = grupoOrigen.personas.findIndex(
          (p: any) => String(p.idCliente) === overId,
        );
        if (desde === -1 || hasta === -1) return;
        handleReordenar(uidOrigen, desde, hasta);
        return;
      }

      // ── Otro grupo: confirmar y mover ──
      const grupoDestino = gruposRef.current.find((g) => g.uid === uidDestino);
      if (!grupoDestino) return;

      const horaOrigen = grupoOrigen.horaprog;
      const horaDestino = grupoDestino.horaprog;
      const horasDistintas =
        horaOrigen &&
        horaDestino &&
        horaOrigen !== 'null' &&
        horaDestino !== 'null' &&
        horaOrigen !== horaDestino;

      if (horasDistintas) {
        const confirmacion = await Swal.fire({
          title: '⚠️ Diferencia de horario',
          html: `
            <p>Grupo de origen: <strong>${horaOrigen}</strong></p>
            <p>Grupo destino: <strong>${horaDestino}</strong></p>
            <p>¿Confirmas el movimiento?</p>
          `,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Sí, mover',
          cancelButtonText: 'Cancelar',
          confirmButtonColor: '#f0a500',
          cancelButtonColor: '#3085d6',
        });
        if (!confirmacion.isConfirmed) return;
      }

      moverPasajeroAGrupo(itemId, uidOrigen, uidDestino);
    },
    [arrastre, buscarGrupoDePasajero, handleReordenar],
  );

  /** Mueve un pasajero al final del grupo destino, por uid. */
  const moverPasajeroAGrupo = useCallback(
    (itemId: string, uidOrigen: string, uidDestino: string) => {
      setGrupos((prevGrupos) => {
        const origen = prevGrupos.find((g) => g.uid === uidOrigen);
        const pasajero = origen?.personas.find(
          (p: any) => String(p.idCliente) === itemId,
        );
        if (!pasajero) return prevGrupos;

        const actualizados = prevGrupos.map((grupo) => {
          if (grupo.uid === uidOrigen) {
            return {
              ...grupo,
              personas: grupo.personas.filter(
                (p: any) => String(p.idCliente) !== itemId,
              ),
            };
          }
          if (grupo.uid === uidDestino) {
            return { ...grupo, personas: [...grupo.personas, pasajero] };
          }
          return grupo;
        });

        return limpiarGruposVacios(actualizados);
      });

      // Confirmación visual, igual que en el movimiento por lote.
      setResaltados({ [uidDestino]: [itemId] });
      setTimeout(() => setResaltados({}), 3000);
      toast.success('Pasajero movido de grupo.');
    },
    [],
  );

  // Reescrito de forma inmutable: la versión anterior mutaba `personas` y el
  // `id` de objetos compartidos con el estado previo, así que el memo de los
  // contenedores no detectaba el cambio y mostraba números de grupo obsoletos.
  const handleMoverAGrupoNuevo = useCallback((idCliente: number) => {
    // Generado fuera del updater: incrementar el contador dentro lo haría
    // impuro, y StrictMode ejecuta los updaters dos veces.
    const uidNuevoGrupo = nuevoUid();

    setGrupos((prevGrupos) => {
      const origenIndex = prevGrupos.findIndex((grupo) =>
        grupo.personas.some((persona: any) => persona.idCliente === idCliente),
      );
      if (origenIndex === -1) return prevGrupos;

      const grupoOrigen = prevGrupos[origenIndex];
      const clienteMovido = grupoOrigen.personas.find(
        (persona: any) => persona.idCliente === idCliente,
      );
      if (!clienteMovido) return prevGrupos;

      const nuevosGrupos = [...prevGrupos];

      nuevosGrupos[origenIndex] = {
        ...grupoOrigen,
        personas: grupoOrigen.personas.filter(
          (persona: any) => persona.idCliente !== idCliente,
        ),
      };

      nuevosGrupos.splice(origenIndex + 1, 0, {
        ...grupoOrigen,
        uid: uidNuevoGrupo,
        id: grupoOrigen.id + 1,
        personas: [clienteMovido],
      });

      // limpiarGruposVacios ya reindexa los ids sin mutar nada.
      const gruposLimpios = limpiarGruposVacios(nuevosGrupos);


      return gruposLimpios;
    });
  }, []);

  const handleEliminarDelArray = useCallback((idCliente: number) => {
    // Usar ref para acceder a grupos actuales
    const currentGrupos = gruposRef.current;
    const grupoOrigenIndex = currentGrupos.findIndex((grupo: any) =>
      grupo.personas.some((persona: any) => persona.idCliente === idCliente),
    );

    if (grupoOrigenIndex === -1) {
      console.warn('No se encontró el grupo del cliente');
      return;
    }

    const grupoOrigen = currentGrupos[grupoOrigenIndex];

    // Verificamos si el grupo tiene solo una persona
    if (grupoOrigen.personas.length === 1) {
      Swal.fire({
        title: 'Advertencia',
        text: 'Al eliminar a este pasajero, se eliminará todo el grupo y no podrás regresar al pasajero a su grupo original.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Eliminar de todas formas',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
      }).then((result) => {
        if (result.isConfirmed) {
          procederConEliminacion(idCliente);
        }
      });
      return;
    }

    // Si el grupo tiene más de una persona, proceder directamente
    procederConEliminacion(idCliente);
  }, []);

  /**
   * Los updaters de estado deben ser puros. Llamar a setEliminados DENTRO del
   * updater de setGrupos hacía que, con StrictMode (activo por defecto en dev),
   * React ejecutase el updater dos veces y el pasajero apareciera duplicado en
   * la lista de eliminados. Ahora el efecto secundario ocurre fuera.
   */
  const procederConEliminacion = useCallback((idCliente: number) => {
    const grupoOrigen = gruposRef.current.find((grupo: any) =>
      grupo.personas.some((persona: any) => persona.idCliente === idCliente),
    );
    if (!grupoOrigen) return;

    const persona = grupoOrigen.personas.find(
      (p: any) => p.idCliente === idCliente,
    );
    if (!persona) return;

    const clienteEliminado = {
      ...persona,
      numGrupo: grupoOrigen.id,
      ordenOriginal: idCliente,
    };

    setEliminados((prevEliminados) =>
      prevEliminados.some((e: any) => e.idCliente === idCliente)
        ? prevEliminados
        : [...prevEliminados, clienteEliminado],
    );

    setGrupos((prevGrupos) => {
      const indice = prevGrupos.findIndex((g) => g.uid === grupoOrigen.uid);
      if (indice === -1) return prevGrupos;

      const nuevosGrupos = [...prevGrupos];
      nuevosGrupos[indice] = {
        ...prevGrupos[indice],
        personas: prevGrupos[indice].personas.filter(
          (p: any) => p.idCliente !== idCliente,
        ),
      };

      return limpiarGruposVacios(nuevosGrupos);
    });
  }, []);

  const ejecutarGrupoCero = async () => {
    if (!isReady) return;
    const toastId = toast.loading('Cargando ...');
    try {
      const response = await axios.put(
        `https://do.velsat.pe:2083/api/Preplan/GrupoCero?usuario=${username}`,
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
    if (!isReady) return;

    const dataToSend = [
      ...data.flatMap((grupo, grupoIndex) => {
        if (!grupo.personas || grupo.personas.length === 0) return [];

        const codConductor = conductores[grupo.id] ?? grupo.codConductor ?? 0;
        const codConductorStr = String(codConductor);

        const codUnidad = unidades[grupo.id] ?? grupo.unidad ?? '';

        return grupo.personas.map((persona: any, personaIndex: number) => ({
          codigo: Number(persona.codigo) || 0,
          horaprog: String(grupo.horaprog),
          orden: String(personaIndex),
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
        `${API_BASE_URL125}/api/Preplan/save?usuario=${username}`,
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

  const handleRestore = useCallback((item: any) => {
    setEliminados((prevEliminados) =>
      prevEliminados.filter(
        (eliminado) => eliminado.idCliente !== item.idCliente,
      ),
    );

    setGrupos((prevGrupos) => {
      const grupoOriginalIndex = prevGrupos.findIndex(
        (grupo) => Number(grupo.id) === Number(item.numGrupo),
      );

      if (grupoOriginalIndex === -1) {
        console.warn(
          'Grupo original no encontrado. No se restauró correctamente.',
        );
        return prevGrupos;
      }

      const grupoOriginal = prevGrupos[grupoOriginalIndex];
      const existeEnGrupo = grupoOriginal.personas.some(
        (persona: any) => persona.idCliente === item.idCliente,
      );

      if (existeEnGrupo) {
        console.warn('El cliente ya está en el grupo, evitando duplicados.');
        return prevGrupos;
      }

      // Antes hacía personas.push(item), mutando el arreglo del estado: la
      // caché de items comparaba por referencia, no veía el cambio y el
      // pasajero restaurado no reaparecía en la lista.
      const nuevosGrupos = [...prevGrupos];
      nuevosGrupos[grupoOriginalIndex] = {
        ...grupoOriginal,
        personas: [...grupoOriginal.personas, item],
      };


      return nuevosGrupos;
    });
  }, []);

  const handleUpdateDestino = useCallback(
    (id: number, nuevoDestino: string, codigoDestino: string) => {
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
    },
    [],
  );

  const stableHandleRefrescarDatos = useCallback(() => {
    setShouldRefetch(true);
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Selección y movimiento entre grupos                                     */
  /* ---------------------------------------------------------------------- */

  // Agrupado por uid a propósito: seleccionar en un grupo solo cambia la
  // referencia de ESE grupo, así los demás no se re-renderizan.
  const [seleccion, setSeleccion] = useState<Record<string, string[]>>({});
  const [modalMoverAbierto, setModalMoverAbierto] = useState(false);

  const totalSeleccionados = useMemo(
    () => Object.values(seleccion).reduce((acc, ids) => acc + ids.length, 0),
    [seleccion],
  );

  const handleToggleSeleccion = useCallback((itemId: string) => {
    const grupo = gruposRef.current.find((g) =>
      g.personas.some((p: any) => String(p.idCliente) === itemId),
    );
    if (!grupo) return;

    setSeleccion((prev) => {
      const actuales = prev[grupo.uid] ?? [];
      const nuevos = actuales.includes(itemId)
        ? actuales.filter((id) => id !== itemId)
        : [...actuales, itemId];

      if (nuevos.length === 0) {
        const { [grupo.uid]: _descartado, ...resto } = prev;
        return resto;
      }
      return { ...prev, [grupo.uid]: nuevos };
    });
  }, []);

  const limpiarSeleccion = useCallback(() => setSeleccion({}), []);

  // Descarta de la selección lo que ya no existe (pasajeros eliminados, grupos
  // que se vaciaron) para que el contador de la barra nunca mienta.
  useEffect(() => {
    setSeleccion((prev) => {
      const uidsPrevios = Object.keys(prev);
      if (uidsPrevios.length === 0) return prev;

      const siguiente: Record<string, string[]> = {};

      for (const grupo of grupos) {
        const ids = prev[grupo.uid];
        if (!ids) continue;

        const validos = ids.filter((id) =>
          grupo.personas.some((p: any) => String(p.idCliente) === id),
        );
        if (validos.length === 0) continue;

        // Conservar la referencia si no cambió nada, para no re-renderizar.
        siguiente[grupo.uid] = validos.length === ids.length ? ids : validos;
      }

      const cambio =
        Object.keys(siguiente).length !== uidsPrevios.length ||
        uidsPrevios.some((uid) => siguiente[uid] !== prev[uid]);

      return cambio ? siguiente : prev;
    });
  }, [grupos]);

  // Lista de destinos para el modal, con la ocupación actual de cada grupo.
  const gruposDestino = useMemo(
    () =>
      grupos.map((grupo) => ({
        uid: grupo.uid,
        id: grupo.id,
        empresa: grupo.empresa,
        destinoGrupo: grupo.destinoGrupo,
        fecha: grupo.fecha,
        horaprog: grupo.horaprog,
        ocupacion: grupo.personas?.length ?? 0,
      })),
    [grupos],
  );

  const moverSeleccionAGrupo = useCallback(
    (uidDestino: string) => {
      const idsSeleccionados = new Set(Object.values(seleccion).flat());
      if (idsSeleccionados.size === 0) return;

      // Se calcula fuera del updater: el de setGrupos se ejecuta más tarde (y
      // dos veces en StrictMode), así que no sirve para producir valores que
      // necesitamos aquí y ahora.
      const movidos = gruposRef.current
        .filter((grupo) => grupo.uid !== uidDestino)
        .flatMap((grupo) =>
          grupo.personas.filter((persona: any) =>
            idsSeleccionados.has(String(persona.idCliente)),
          ),
        )
        .map((persona: any) => String(persona.idCliente));

      if (movidos.length === 0) {
        setSeleccion({});
        setModalMoverAbierto(false);
        return;
      }

      setGrupos((prevGrupos) => {
        if (!prevGrupos.some((g) => g.uid === uidDestino)) return prevGrupos;

        // 1. Sacar los seleccionados de sus grupos de origen. Los grupos que no
        //    pierden a nadie se devuelven por referencia, sin tocar.
        const extraidos: any[] = [];
        const sinExtraidos = prevGrupos.map((grupo) => {
          if (grupo.uid === uidDestino) return grupo;

          const quedan = grupo.personas.filter((persona: any) => {
            if (idsSeleccionados.has(String(persona.idCliente))) {
              extraidos.push(persona);
              return false;
            }
            return true;
          });

          if (quedan.length === grupo.personas.length) return grupo;
          return { ...grupo, personas: quedan };
        });

        if (extraidos.length === 0) return prevGrupos;

        // 2. Anexarlos al destino, respetando el orden en que aparecían.
        const conDestino = sinExtraidos.map((grupo) =>
          grupo.uid === uidDestino
            ? { ...grupo, personas: [...grupo.personas, ...extraidos] }
            : grupo,
        );

        const gruposLimpios = limpiarGruposVacios(conDestino);


        return gruposLimpios;
      });

      setSeleccion({});
      setModalMoverAbierto(false);

      // Confirmación visual: bajar al destino y resaltar lo que acaba de llegar.
      setResaltados({ [uidDestino]: movidos });
      setTimeout(() => {
        document
          .getElementById(`grupo-${uidDestino}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 0);
      setTimeout(() => setResaltados({}), 3000);

      toast.success(
        movidos.length === 1
          ? 'Pasajero movido de grupo.'
          : `${movidos.length} pasajeros movidos de grupo.`,
      );
    },
    [seleccion, onActualizarDatos],
  );

  // Modal de direcciones centralizado: una sola instancia para toda la lista,
  // en vez de una por pasajero.
  const [pasajeroDirecciones, setPasajeroDirecciones] =
    useState<PasajeroDirecciones | null>(null);

  const handleAbrirDirecciones = useCallback((pasajero: PasajeroDirecciones) => {
    setPasajeroDirecciones(pasajero);
  }, []);

  const handleCerrarDirecciones = useCallback(() => {
    setPasajeroDirecciones(null);
  }, []);

  // Objeto estable de callbacks de acciones (referencia constante)
  const actionCallbacks = useMemo<ItemActionCallbacks>(
    () => ({
      onCopiarLink: handleCopiarLink,
      onMoverAGrupoNuevo: handleMoverAGrupoNuevo,
      onEliminar: handleEliminarDelArray,
      onAbrirDirecciones: handleAbrirDirecciones,
      onToggleSeleccion: handleToggleSeleccion,
    }),
    [
      handleCopiarLink,
      handleMoverAGrupoNuevo,
      handleEliminarDelArray,
      handleAbrirDirecciones,
      handleToggleSeleccion,
    ],
  );

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
          collisionDetection={detectarColisiones}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          {modoVista === 'Eliminados' ? (
            <>
              {gruposFiltrados.map((grupo) => (
                <Container
                  key={grupo.uid}
                  uid={grupo.uid}
                  items={items[grupo.uid] || []}
                  grupo={grupo}
                  esGrupoActivo={arrastre?.uidGrupo === grupo.uid}
                  hayArrastre={arrastre !== null}
                  onUpdateDestino={handleUpdateDestino}
                  onUpdateGrupoHoraProg={handleUpdateGrupoHoraProg}
                  onUpdateConductor={handleUpdateConductor}
                  onUpdateUnidad={handleUpdateUnidad}
                  onRefrescarDatos={handleRefrescarDatos}
                  actionCallbacks={actionCallbacks}
                  seleccionados={seleccion[grupo.uid]}
                  resaltados={resaltados[grupo.uid]}
                />
              ))}
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
            {arrastre
              ? (() => {
                  const item = items[arrastre.uidGrupo]?.find(
                    (i) => i.id === arrastre.itemId,
                  );
                  return item ? <Item {...item} /> : null;
                })()
              : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Barra de acciones: solo aparece cuando hay algo seleccionado */}
      {totalSeleccionados > 0 && (
        <div className="sticky bottom-3 z-40 flex w-fit self-center items-center gap-3 rounded-lg border border-blue-200 bg-white px-4 py-2 shadow-lg">
          <span className="text-[13px] font-medium text-gray-700">
            {totalSeleccionados}{' '}
            {totalSeleccionados === 1
              ? 'pasajero seleccionado'
              : 'pasajeros seleccionados'}
          </span>

          <button
            type="button"
            onClick={() => setModalMoverAbierto(true)}
            className="inline-flex h-8 items-center gap-x-2 rounded bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none"
          >
            <TbArrowsExchange size={16} />
            Mover a grupo
          </button>

          <button
            type="button"
            onClick={limpiarSeleccion}
            className="text-[13px] text-gray-500 underline hover:text-gray-700"
          >
            Limpiar
          </button>
        </div>
      )}

      <ModalMoverGrupo
        isOpen={modalMoverAbierto}
        onClose={() => setModalMoverAbierto(false)}
        grupos={gruposDestino}
        uidsOrigen={Object.keys(seleccion)}
        cantidadSeleccionada={totalSeleccionados}
        onConfirmar={moverSeleccionAGrupo}
      />

      {/* Única instancia del modal de direcciones para toda la lista */}
      <ModalDirecciones
        isOpen={pasajeroDirecciones !== null}
        onClose={handleCerrarDirecciones}
        codCliente={pasajeroDirecciones?.codCliente ?? ''}
        nombrePasajero={pasajeroDirecciones?.nombre ?? ''}
        codigo={pasajeroDirecciones?.codigo ?? ''}
        setShouldRefetch={stableHandleRefrescarDatos}
      />
    </div>
  );
}
