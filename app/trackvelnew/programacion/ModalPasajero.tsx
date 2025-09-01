import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  useDisclosure,
  useDraggable,
  Input,
  Select,
  SelectItem,
  Spinner,
} from '@nextui-org/react';
import {
  Plus,
  Search,
  Trash2,
  Save,
  Plane,
  User,
  GripVertical,
  Eye,
} from 'lucide-react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import ModalAddPasajeros from './ModalAddPasajeros';

interface PasajeroData {
  id: string;
  orden: number;
  nombre: string;
  lugar: string;
  distrito: string;
  distanciaAeropuerto: string;
  distanciaAeropuertoReal: string;
  horaAprox: string;
  ordenAten: string;
  codigo: string;
  codlugar: string;
}

interface ApiPasajero {
  codigo: string;
  codlugar: string;
  fecha: string;
  orden: string;
  pasajero: {
    nombre: string;
  };
  lugar: {
    direccion: string;
    distrito: string;
    wy: string;
    wx: string;
  };
}

interface ModalPasajeroProps {
  servicioData: {
    codservicio: string;
    numero: string;
    grupo: string;
    tipo: string;
    fechaAeropuerto: string;
    aerolinea: string;
  };
}

// Componente SortableRow para cada pasajero
const SortablePasajeroRow = ({
  pasajero,
  onEliminar,
  onUpdateHora,
  eliminandoPasajero,
}: {
  pasajero: PasajeroData;
  onEliminar: (pasajero: PasajeroData) => void;
  onUpdateHora: (id: string, nuevaHora: string) => void;
  eliminandoPasajero: string | null;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: pasajero.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleHoraChange = (value: string) => {
    onUpdateHora(pasajero.id, value);
  };

  const isEliminando = eliminandoPasajero === pasajero.id;

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`cursor-grab border bg-white hover:bg-gray-50 active:cursor-grabbing ${
        isEliminando ? 'opacity-50' : ''
      }`}
    >
      <td className="border p-2 text-center">
        <div className="flex items-center justify-center gap-2">
          <div {...attributes} {...listeners} className="cursor-grab p-1">
            <GripVertical className="h-4 w-4 text-gray-400" />
          </div>
          <span className="font-medium">{pasajero.orden}</span>
        </div>
      </td>
      <td className="border p-2 text-sm font-medium">{pasajero.nombre}</td>
      <td className="border p-2 text-sm">{pasajero.lugar}</td>
      <td className="border p-2 text-sm">{pasajero.distrito}</td>
      <td className="border p-2 text-center text-sm">
        {pasajero.distanciaAeropuerto}
      </td>
      <td className="border p-2 text-center">
        <Input
          type="datetime-local"
          size="sm"
          variant="bordered"
          value={pasajero.horaAprox}
          onChange={(e) => handleHoraChange(e.target.value)}
          className="min-w-[180px]"
          classNames={{
            input: 'text-xs',
            inputWrapper: 'min-h-unit-8 h-8',
          }}
          isDisabled={isEliminando}
        />
      </td>
      <td className="border p-2 text-center">
        <Button
          isIconOnly
          color="danger"
          variant="light"
          size="sm"
          onPress={() => onEliminar(pasajero)}
          className="h-8 min-w-8"
          isDisabled={isEliminando}
          isLoading={isEliminando}
        >
          {!isEliminando && <Trash2 className="h-4 w-4" />}
        </Button>
      </td>
    </tr>
  );
};

export default function App({ servicioData }: ModalPasajeroProps) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const targetRef = React.useRef(null);
  const { moveProps } = useDraggable({
    targetRef,
    canOverflow: true,
    isDisabled: !isOpen,
  });

  // Estados
  const [pasajeros, setPasajeros] = useState<PasajeroData[]>([]);
  const [loading, setLoading] = useState(false);
  const [guardandoServicio, setGuardandoServicio] = useState(false);
  const [eliminandoPasajero, setEliminandoPasajero] = useState<string | null>(null);
  const [aeropuertoCoords, setAeropuertoCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Función para formatear fecha actual a DD/MM/YYYY HH:mm
  const formatearFechaActual = (): string => {
    const now = new Date();
    const dia = String(now.getDate()).padStart(2, '0');
    const mes = String(now.getMonth() + 1).padStart(2, '0');
    const año = now.getFullYear();
    const horas = String(now.getHours()).padStart(2, '0');
    const minutos = String(now.getMinutes()).padStart(2, '0');
    
    return `${dia}/${mes}/${año} ${horas}:${minutos}`;
  };

  // Función para eliminar pasajero con confirmación
  const eliminarPasajeroConConfirmacion = async (pasajero: PasajeroData) => {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar al pasajero "${pasajero.nombre}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      await eliminarPasajero(pasajero);
    }
  };

  // Función para eliminar pasajero mediante API
  const eliminarPasajero = async (pasajero: PasajeroData) => {
    setEliminandoPasajero(pasajero.id);

    try {
      const datosEliminacion = {
        codigo: parseInt(pasajero.codigo),
        feccancelpas: formatearFechaActual()
      };

      console.log('Eliminando pasajero:', datosEliminacion);

      const response = await fetch('https://velsat.pe:2096/api/Gacela/UpdateEstado', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(datosEliminacion)
      });

      if (response.ok) {
        const resultado = await response.json();
        console.log('Pasajero eliminado exitosamente:', resultado);
        
        // Remover el pasajero de la lista local y reordenar
        setPasajeros((prev) => {
          const filtrados = prev.filter((p) => p.id !== pasajero.id);
          // Reordenar después de eliminar
          const reordenados = filtrados.map((p, index) => ({
            ...p,
            orden: index + 1,
          }));
          
          console.log('Pasajero eliminado. Lista actualizada:', reordenados);
          return reordenados;
        });

        toast.success(`Pasajero "${pasajero.nombre}" eliminado exitosamente`);
        
        // Mostrar confirmación con SweetAlert2
        Swal.fire({
          title: 'Eliminado',
          text: `El pasajero "${pasajero.nombre}" ha sido eliminado correctamente.`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
        
      } else {
        const errorData = await response.text();
        console.error('Error del servidor al eliminar:', errorData);
        toast.error(`Error del servidor: ${response.status}`);
        
        Swal.fire({
          title: 'Error',
          text: 'No se pudo eliminar el pasajero. Intente nuevamente.',
          icon: 'error',
        });
      }
      
    } catch (error) {
      console.error('Error al eliminar pasajero:', error);
      toast.error('Error de conexión al eliminar el pasajero');
      
      Swal.fire({
        title: 'Error de conexión',
        text: 'No se pudo conectar con el servidor. Verifique su conexión a internet.',
        icon: 'error',
      });
    } finally {
      setEliminandoPasajero(null);
    }
  };

  // Función para formatear fecha a datetime-local
  const formatToDatetimeLocal = (dateString: string) => {
    if (!dateString) return '';

    try {
      // Si ya está en formato datetime-local, devolverlo tal como está
      if (dateString.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)) {
        return dateString;
      }

      // Si está en formato DD/MM/YYYY HH:mm, convertirlo
      if (dateString.includes('/')) {
        const [datePart, timePart] = dateString.split(' ');
        const [day, month, year] = datePart.split('/');
        const time = timePart || '00:00';
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${time}`;
      }

      // Si es una fecha válida, formatearla
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      }
    } catch (error) {
      console.error('Error al formatear fecha:', error);
    }

    return '';
  };

  // Función para formatear fecha de datetime-local a DD/MM/YYYY HH:mm
  const formatToApiDate = (datetimeLocal: string) => {
    if (!datetimeLocal) return '';

    try {
      // Si está en formato datetime-local (YYYY-MM-DDTHH:mm)
      if (datetimeLocal.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)) {
        const [datePart, timePart] = datetimeLocal.split('T');
        const [year, month, day] = datePart.split('-');
        return `${day}/${month}/${year} ${timePart}`;
      }
      
      return datetimeLocal;
    } catch (error) {
      console.error('Error al formatear fecha para API:', error);
      return '';
    }
  };

  // Función para calcular distancia usando OSRM
  const calcularDistancia = async (
    origen: { lat: number; lng: number },
    destino: { lat: number; lng: number },
  ): Promise<string> => {
    try {
      // OSRM usa formato lng,lat (primero longitud, luego latitud)
      const url = `http://router.project-osrm.org/route/v1/driving/${origen.lng},${origen.lat};${destino.lng},${destino.lat}?overview=false`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.code === 'Ok' && data.routes.length > 0) {
        const distanciaMetros = data.routes[0].distance; // en metros
        const distanciaKm = (distanciaMetros / 1000).toFixed(2);
        return `${distanciaKm} km`;
      } else {
        console.warn('No se pudo calcular ruta con OSRM, usando fallback');
        return calcularDistanciaFallback(origen, destino);
      }
    } catch (error) {
      console.error('Error con OSRM API:', error);
      return calcularDistanciaFallback(origen, destino);
    }
  };

  // Función de respaldo para calcular distancia directa
  const calcularDistanciaFallback = (
    origen: { lat: number; lng: number },
    destino: { lat: number; lng: number },
  ): string => {
    const R = 6371;
    const dLat = ((destino.lat - origen.lat) * Math.PI) / 180;
    const dLon = ((destino.lng - origen.lng) * Math.PI) / 180;

    const lat1 = (origen.lat * Math.PI) / 180;
    const lat2 = (destino.lat * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distancia = R * c;

    return `${distancia.toFixed(2)} km (aprox.)`;
  };

  // Función para cargar pasajeros desde la API
  const cargarPasajeros = async () => {
    if (!servicioData.codservicio) return;

    setLoading(true);
    try {
      const response = await fetch(
        `https://velsat.pe:2096/api/Gacela/PasajeroList?codservicio=${servicioData.codservicio}`,
      );
      const data: ApiPasajero[] = await response.json();

      console.log(response)

      // Filtrar el registro con orden "0" para obtener coordenadas del aeropuerto
      const aeropuertoData = data.find((item) => item.orden === '0');
      let coordsAeropuerto = null;

      if (
        aeropuertoData &&
        aeropuertoData.lugar.wy &&
        aeropuertoData.lugar.wx
      ) {
        coordsAeropuerto = {
          lat: parseFloat(aeropuertoData.lugar.wy),
          lng: parseFloat(aeropuertoData.lugar.wx),
        };
        setAeropuertoCoords(coordsAeropuerto);
      }

      // Filtrar pasajeros (orden != "0") y convertir a formato local
      const pasajerosApi = data.filter((item) => item.orden !== '0');

      const pasajerosFormateados: PasajeroData[] = await Promise.all(
        pasajerosApi.map(async (item, index) => {
          let distanciaCalculada = '0 km';

          // Calcular distancia si tenemos coordenadas
          if (coordsAeropuerto && item.lugar.wy && item.lugar.wx) {
            const coordsPasajero = {
              lat: parseFloat(item.lugar.wy),
              lng: parseFloat(item.lugar.wx),
            };

            console.log(
              'Calculando distancia desde aeropuerto:',
              coordsAeropuerto,
              'hasta pasajero:',
              coordsPasajero,
            );
            distanciaCalculada = await calcularDistancia(
              coordsAeropuerto,
              coordsPasajero,
            );
          }

          return {
            id: item.codigo || `pasajero_${index + 1}`,
            orden: parseInt(item.orden) || index + 1,
            nombre: item.pasajero?.nombre || 'Sin nombre',
            lugar: item.lugar?.direccion || 'Sin dirección',
            distrito: item.lugar?.distrito || 'Sin distrito',
            distanciaAeropuerto: distanciaCalculada,
            distanciaAeropuertoReal: '',
            horaAprox: formatToDatetimeLocal(item.fecha || ''),
            ordenAten: 'no-definido',
            codigo: item.codigo || '',
            codlugar: item.codlugar || '',
          };
        }),
      );

      pasajerosFormateados.sort((a, b) => a.orden - b.orden);

      setPasajeros(pasajerosFormateados);
      console.log('Lista de pasajeros cargada inicialmente:', pasajerosFormateados);

    } catch (error) {
      console.error('Error al cargar pasajeros:', error);
      toast.error('Error al cargar los pasajeros');
    } finally {
      setLoading(false);
    }
  };

  // Función para extraer solo el número de la distancia
  const extraerNumeroDistancia = (distanciaString: string): number | null => {
    if (!distanciaString) return null;
    
    // Extraer solo el número de strings como "22.61 km" o "22.61 km (aprox.)"
    const match = distanciaString.match(/(\d+\.?\d*)/);
    if (match) {
      return parseFloat(match[1]);
    }
    
    return null;
  };

  // Función para guardar servicio mediante API
  const guardarServicio = async () => {
    if (pasajeros.length === 0) {
      toast.warning('No hay pasajeros para guardar');
      return;
    }

    setGuardandoServicio(true);
    
    try {
      // Preparar datos para la API según la estructura requerida
      const datosParaApi = pasajeros.map((pasajero) => ({
        codigo: pasajero.codigo.toString(), // Enviar código como string
        fecha: formatToApiDate(pasajero.horaAprox), // Convierte datetime-local a DD/MM/YYYY HH:mm
        distancia: extraerNumeroDistancia(pasajero.distanciaAeropuerto), // Solo el número
        orden: pasajero.orden.toString()
      }));

      console.log('=== GUARDANDO SERVICIO ===');
      console.log('Datos del servicio:', servicioData);
      console.log('Lista final de pasajeros para guardar:', pasajeros);
      console.log('Datos formateados para API:', datosParaApi);
      console.log('Cantidad de pasajeros:', pasajeros.length);

      const response = await fetch('https://velsat.pe:2096/api/Gacela/GuardarServicio', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(datosParaApi)
      });

      if (response.ok) {
        const resultado = await response.json();
        console.log('Servicio guardado exitosamente:', resultado);
        toast.success('Servicio guardado exitosamente');
        return true;
      } else {
        const errorData = await response.text();
        console.error('Error del servidor:', errorData);
        toast.error(`Error del servidor: ${response.status}`);
        return false;
      }
      
    } catch (error) {
      console.error('Error al guardar servicio:', error);
      toast.error('Error de conexión al guardar el servicio');
      return false;
    } finally {
      setGuardandoServicio(false);
    }
  };

  // Cargar pasajeros cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      cargarPasajeros();
    }
  }, [isOpen, servicioData.codservicio]);

  // Función para imprimir la lista actualizada cada vez que cambie
  useEffect(() => {
    if (pasajeros.length > 0) {
      console.log('Lista de pasajeros actualizada:', pasajeros);
    }
  }, [pasajeros]);

  const grupoOptions = [
    { key: 'atc', label: 'ATC' },
    { key: 'vip', label: 'VIP' },
    { key: 'regular', label: 'Regular' },
  ];

  const tipoOptions = [
    { key: 'salida', label: 'Salida' },
    { key: 'llegada', label: 'Llegada' },
  ];

  const actualizarHoraPasajero = (id: string, nuevaHora: string) => {
    setPasajeros((prev) => {
      const actualizada = prev.map((pasajero) =>
        pasajero.id === id ? { ...pasajero, horaAprox: nuevaHora } : pasajero,
      );
      
      console.log(`Hora actualizada para pasajero ${id}:`, nuevaHora);
      console.log('Lista de pasajeros con hora actualizada:', actualizada);
      return actualizada;
    });
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    
    if (active.id !== over?.id) {
      setPasajeros((prev) => {
        const oldIndex = prev.findIndex((item) => item.id === active.id);
        const newIndex = prev.findIndex((item) => item.id === over?.id);

        const newPasajeros = arrayMove(prev, oldIndex, newIndex);

        // Actualizar el orden después del reordenamiento
        const updatedPasajeros = newPasajeros.map((item, index) => ({
          ...item,
          orden: index + 1,
        }));

        console.log('Orden cambiado. Lista reordenada:', updatedPasajeros);
        return updatedPasajeros;
      });
    }
  };

  const handleGuardar = async (onClose: () => void) => {
    const success = await guardarServicio();
    if (success) {
      onClose();
    }
  };

  return (
    <>
      <button
        onClick={onOpen}
        className="flex items-center gap-1 rounded bg-emerald-600 px-2 py-1 text-[11px] text-white transition-colors hover:bg-emerald-700"
        title="Ver Pasajeros"
      >
        <Eye className="h-3 w-3" />
        Pasajero
      </button>

      <Modal
        ref={targetRef}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        size="5xl"
        scrollBehavior="inside"
        classNames={{
          base: 'bg-white',
          backdrop: 'bg-black/50',
          header: 'border-b border-gray-200',
          body: 'py-6',
          footer: 'border-t border-gray-200',
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader {...moveProps} className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-100 p-2">
                    <Plane className="h-6 w-6 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-800">
                    Datos Pasajeros
                  </h2>
                </div>
              </ModalHeader>

              <ModalBody>
                <div className="space-y-6">
                  {/* Datos del Servicio */}
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <h3 className="mb-4 text-lg font-semibold text-gray-800">
                      Datos Servicio
                    </h3>
                    <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-4">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Número
                        </label>
                        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-semibold">
                          {servicioData.numero}
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Grupo
                        </label>
                        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                          {grupoOptions.find(
                            (option) =>
                              option.key === servicioData.grupo.toLowerCase(),
                          )?.label || servicioData.grupo}
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Tipo
                        </label>
                        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                          {tipoOptions.find(
                            (option) => option.key === servicioData.tipo,
                          )?.label || servicioData.tipo}
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Fecha y Hora
                        </label>
                        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                          {servicioData.fechaAeropuerto}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <ModalAddPasajeros
                        codservicio={servicioData.codservicio}
                        aerolinea={servicioData.aerolinea}
                        proximoOrden={pasajeros.length + 1}
                        onPasajeroAgregado={cargarPasajeros}
                      ></ModalAddPasajeros>
                      <Button
                        color="primary"
                        variant="bordered"
                        size="sm"
                        onPress={cargarPasajeros}
                        isLoading={loading}
                        startContent={
                          !loading && <Search className="h-4 w-4" />
                        }
                      >
                        {loading ? 'Cargando...' : 'Recargar Pasajeros'}
                      </Button>
                    </div>
                  </div>

                  {/* Lista de Pasajeros */}
                  <div className="rounded-lg bg-gray-50 p-4">
                    <h3 className="mb-4 text-lg font-semibold text-gray-800">
                      Lista de Pasajeros ({pasajeros.length})
                    </h3>

                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <Spinner size="lg" />
                        <span className="ml-2">
                          Cargando pasajeros y calculando distancias...
                        </span>
                      </div>
                    ) : (
                      <DndContext
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext
                          items={pasajeros.map((item) => ({ id: item.id }))}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-gray-300 bg-white">
                              <thead>
                                <tr className="bg-blue-300">
                                  <th className="border p-2 text-sm font-semibold">
                                    #
                                  </th>
                                  <th className="border p-2 text-sm font-semibold">
                                    Nombre
                                  </th>
                                  <th className="border p-2 text-sm font-semibold">
                                    Lugar
                                  </th>
                                  <th className="border p-2 text-sm font-semibold">
                                    Distrito
                                  </th>
                                  <th className="border p-2 text-sm font-semibold">
                                    Distancia Aeropuerto (Aprox.)
                                  </th>
                                  <th className="border p-2 text-sm font-semibold">
                                    Hora Aprox.
                                  </th>
                                  <th className="border p-2 text-sm font-semibold">
                                    Acción
                                  </th>
                                </tr>
                              </thead>
                              <tbody style={{ fontSize: '13px' }}>
                                {pasajeros.length === 0 ? (
                                  <tr>
                                    <td
                                      colSpan={7}
                                      className="border p-8 text-center text-gray-500"
                                    >
                                      <User className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                                      <p>No hay pasajeros agregados</p>
                                      <p className="text-sm">
                                        Los datos se cargarán automáticamente
                                        desde la API
                                      </p>
                                    </td>
                                  </tr>
                                ) : (
                                  pasajeros.map((pasajero) => (
                                    <SortablePasajeroRow
                                      key={pasajero.id}
                                      pasajero={pasajero}
                                      onEliminar={eliminarPasajeroConConfirmacion}
                                      onUpdateHora={actualizarHoraPasajero}
                                      eliminandoPasajero={eliminandoPasajero}
                                    />
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </SortableContext>
                      </DndContext>
                    )}
                  </div>
                </div>
              </ModalBody>

              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  Cerrar
                </Button>
                <Button
                  color="success"
                  onPress={() => handleGuardar(onClose)}
                  startContent={<Save className="h-4 w-4" />}
                  isDisabled={loading || guardandoServicio}
                  isLoading={guardandoServicio}
                >
                  {guardandoServicio ? 'Guardando...' : 'Guardar Servicio'}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}