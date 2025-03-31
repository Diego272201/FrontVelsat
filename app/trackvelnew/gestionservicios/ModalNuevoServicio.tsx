import { closestCenter, DndContext } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from '@nextui-org/react';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { CSS } from '@dnd-kit/utilities';

interface NuevoServicioModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const clientes = [
  'AJINOMOTO',
  'AMERICAN',
  'AMERICAN TIERRA',
  'AVIANCA',
  'AVIANCA ADM',
  'CHINALCO',
  'DELTA',
  'ECONOMICO',
  'EJECUTIVO VIP 2',
  'EJECUTIVO VIP 1',
  'INDECOPI',
  'KLM',
  'LATAM',
  'LATAM ADM',
  'LCP',
  'MAPFRE',
  'METSO',
  'METSO SSGG',
  'MKCOLLEQUE',
  'MOVIL-BUS-MANTTO',
  'MOVILBUS',
  'NEXA',
  'NEXA CJM',
  'OI LURIN',
  'OI PERU',
  'PLUSPETROL',
  'PLUSPETROL-PISCO',
  'PREMIER',
  'PRESIDENCIAL',
  'PROSEGUR',
  'Quality Products',
  'REP',
  'SIEMENS',
  'TALMA',
];

function SortableItem({ id, children }: { id: number; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = { transform: CSS.Transform.toString(transform), transition };
  
  return (
    <tr ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </tr>
  );
}

export default function NuevoServicioModal({
  isOpen,
  onOpenChange,
}: NuevoServicioModalProps) {
  const [clienteSeleccionado, setClienteSeleccionado] = useState('');

  const [tipoServicio, setTipoServicio] = useState('');
  const [horaDestino, setHoraDestino] = useState('');
  const [horaProgramada, setHoraProgramada] = useState('');
  const [pasajeros, setPasajeros] = useState<any[]>([]);
  const [horaAtencion, setHoraAtencion] = useState("");


  

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setClienteSeleccionado(event.target.value);
  };

  const [pasajero, setPasajero] = useState('');

const [sugerencias, setSugerencias] = useState<
  { apepate: string; codigo: string; codlugar: number; direccion: string; distrito: string, wx:string,wy:string }[]
>([]);

  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [seleccionado, setSeleccionado] = useState(false);

  const seleccionarPasajero = (nombre: string, codigo: string, codlugar: number, direccion: string, distrito: string, wx:string, wy:string) => {
    console.log('Pasajero seleccionado:', nombre, 'Código:', codigo);
    console.log('Lugar:', 'CodLugar:', codlugar, 'Dirección:', direccion, 'Distrito:', distrito, "Latitud",wx, "Longitud", wy);
    
    setPasajero(nombre);
    setSugerencias([]);
    setMostrarSugerencias(false);
    setSeleccionado(true);
  };

  useEffect(() => {
    const fetchPasajeros = async () => {
      if (pasajero.trim() === "") { 
        setSugerencias([]);
        setMostrarSugerencias(false);

        return;
      }

      try {
        const response = await axios.get(
          `http://66.240.210.125:8586/api/Preplan/GetPasajeros?palabra=${pasajero}`,
        );

        const resultados = response.data.map((item: any) => ({
          apepate: item.apepate,
          codigo: item.codigo,
          codlugar: item.lugar?.codlugar || 0, 
        direccion: item.lugar?.direccion || 'No disponible',
        distrito: item.lugar?.distrito || 'No disponible',
        wx:item.lugar?.wx  || "",
        wy:item.lugar?.wy  || "",
        }));

        setSugerencias(resultados);
      } catch (error) {
        console.error('Error al obtener pasajeros:', error);
      }
    };

    const delayDebounce = setTimeout(() => {
      fetchPasajeros();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [pasajero, seleccionado]);


  const agregarPasajero = () => {
    if (!pasajero || !horaAtencion) return;
    
    setPasajeros((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        codigo: '123',
        nombre: pasajero,
        direccion: 'Dirección Ejemplo',
        distrito: 'Distrito Ejemplo',
        hora: horaAtencion,
      },
    ]);
    setPasajero('');
    setHoraAtencion('');
  };

  const eliminarPasajero = (id: number) => {
    setPasajeros((prev) => prev.filter((p) => p.id !== id));
  };

  const onDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = pasajeros.findIndex((p) => p.id === active.id);
    const newIndex = pasajeros.findIndex((p) => p.id === over.id);
    
    const newPasajeros = [...pasajeros];
    const [moved] = newPasajeros.splice(oldIndex, 1);
    newPasajeros.splice(newIndex, 0, moved);
    setPasajeros(newPasajeros);
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      className="w-[60%] max-w-none"
    >
      <ModalContent>
        {(onClose) => (
          <>
            <div className="rounded-md border border-gray-200 bg-white p-4">
              <h2 className="mb-4 text-lg font-bold text-gray-800">
                Crear Nuevo Servicio
              </h2>

              <div className="grid grid-cols-2 gap-4">
                {/* Cliente y Tipo de Servicio */}
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Cliente:
                  </label>
                  <select
                    className="mt-1 w-full rounded-md border bg-gray-100 p-1 text-sm focus:border-gray-400 focus:outline-none focus:ring-0"
                    value={clienteSeleccionado}
                    onChange={handleChange}
                  >
                    <option value="" disabled>
                      Seleccione un cliente
                    </option>
                    {clientes.map((cliente) => (
                      <option key={cliente} value={cliente}>
                        {cliente}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Tipo de Servicio:
                  </label>
                  <select
                    className="mt-1 w-full rounded-md border bg-gray-100 p-1 text-sm focus:border-gray-400 focus:outline-none focus:ring-0"
                    value={tipoServicio}
                    onChange={(e) => setTipoServicio(e.target.value)}
                  >
                    <option value="" disabled>
                      Seleccione un tipo
                    </option>

                    <option value="I">RECOJO</option>
                    <option value="S">REPARTO</option>
                  </select>
                </div>

                {/* Hora Destino y Hora Programada */}
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Hora Destino:
                  </label>
                  <input
                    type="datetime-local"
                    className="mt-1 w-full rounded-md border bg-gray-100 p-1 text-sm focus:border-gray-400 focus:outline-none focus:ring-0"
                    value={horaDestino}
                    onChange={(e) => setHoraDestino(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Hora Programada:
                  </label>
                  <input
                    type="datetime-local"
                   className="mt-1 w-full rounded-md border bg-gray-100 p-1 text-sm focus:border-gray-400 focus:outline-none focus:ring-0"
                    value={horaProgramada}
                    onChange={(e) => setHoraProgramada(e.target.value)}
                  />
                </div>

                {/* Buscar Pasajero */}
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Buscar Pasajero:
                  </label>
                  <div className="flex gap-2">
                
                                <input
                                  id="inputPasajero"
                                  type="text"
                                  className="mt-1 w-full rounded-md border bg-gray-100 p-1 text-sm focus:border-gray-400 focus:outline-none focus:ring-0"

                                  placeholder="Ingrese Nombre del Pasajero"
                                  value={pasajero}
                                  onChange={(e) => {
                                    if (seleccionado) {
                                      setSeleccionado(false);
                                      return;
                                    }
                                    setPasajero(e.target.value);
                                    setMostrarSugerencias(true);
                                  }}
                                  onFocus={() => {
                                    if (sugerencias.length > 0 && !seleccionado)
                                      setMostrarSugerencias(true);
                                  }}
                                  onBlur={() =>
                                    setTimeout(
                                      () => setMostrarSugerencias(false),
                                      100,
                                    )
                                  }
                                />

                                {mostrarSugerencias &&
                                  sugerencias.length > 0 && (
                                    <ul className="fixed z-[9999] mt-10 max-h-60 overflow-y-auto rounded-lg border border-gray-300 bg-white shadow-lg ">
                                      {sugerencias.map((item, index) => (
                                        <li
                                          key={index}
                                          className="cursor-pointer px-4 py-2 hover:bg-gray-100"
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                            seleccionarPasajero(item.apepate, item.codigo, item.codlugar, item.direccion, item.distrito, item.wx, item.wy);


                                            setMostrarSugerencias(false);
                                            setSugerencias([]); 

                                            setTimeout(() => {
                                              const input =
                                                document.getElementById(
                                                  'inputPasajero',
                                                );
                                              input?.blur(); 
                                            }, 100); 
                                          }}
                                        >
                                          {item.apepate}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                         
                    <input
                       type="time"

                      placeholder="Hora Atención"
                      className="w-1/4 rounded-md border border-gray-300 bg-gray-100 p-1 text-sm shadow-sm focus:border-gray-400 focus:outline-none focus:ring-0"
                      value={horaAtencion} onChange={(e) => setHoraAtencion(e.target.value)}
                    />
                    <button className="rounded-md bg-blue-600 px-3 py-1 text-xs text-white transition hover:bg-blue-700" onClick={agregarPasajero}>
                      Agregar
                    </button>
                  </div>
                </div>

             
             
              </div>

              {/* Mensaje de Pasajeros */}
              <div className="mt-4 text-xs italic text-gray-600">

              <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={pasajeros.map(p => p.id)} strategy={verticalListSortingStrategy}>
                  <table>
                    <thead>
                      <tr>
                        <th>Orden</th>
                        <th>Código</th>
                        <th>Nombre</th>
                        <th>Dirección</th>
                        <th>Distrito</th>
                        <th>Hora</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pasajeros.map((pasajero, index) => (
                        <SortableItem key={pasajero.id} id={pasajero.id}>
                          <td>{index + 1}</td>
                          <td>{pasajero.codigo}</td>
                          <td>{pasajero.nombre}</td>
                          <td>{pasajero.direccion}</td>
                          <td>{pasajero.distrito}</td>
                          <td>{pasajero.hora}</td>
                          <td>
                            <button onClick={() => eliminarPasajero(pasajero.id)}>Eliminar</button>
                          </td>
                        </SortableItem>
                      ))}
                    </tbody>
                  </table>
                </SortableContext>
              </DndContext>
              </div>
            </div>
            <ModalFooter>
              <Button color="danger" variant="light" onPress={onClose}>
                Cerrar
              </Button>
              <Button color="primary" onPress={onClose}>
                Guardar
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
