import { closestCenter, DndContext } from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Modal, ModalContent, ModalFooter } from '@nextui-org/react';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'sonner';
import { parseFecha } from '@/app/components/dates/convertToCustomFormat ';
import InputUnidad from '@/app/components/inputs/InputUnidad';
import InputConductor from '@/app/components/inputs/InputConductor';
import InputDestino from '@/app/components/inputs/InputDestino';
import { IDestino } from '@/app/components/inputs/IDestino';
import { API_BASE_URL125 } from '@/app/components/urlsApi/urlApi';
import { MdAddBox } from 'react-icons/md';
import { FiLoader } from 'react-icons/fi';
import { useUsername } from '@/hooks/useUsername';

interface NuevoServicioModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onServicioAgregado: () => void;
}

const clientes = [
  'AMERICAN',
  'AMERICAN TIERRA',
  'DELTA',
  'KLM',
  'LATAM',
  'LATAM ADM',
  'REP SI',
  'REP'
];

const empresasG = [
  'ATSA',
  'AVIANCA',
  'DHL',
  'LATAM',
  'TALMA',
  'TERPEL',
  'LAGARDERE',
];

function SortableItem({
  id,
  children,
}: {
  id: number;
  children: (props: { listeners: any }) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: transform ? CSS.Transform.toString(transform) : undefined,
    transition,
  };

  return (
    <tr ref={setNodeRef} style={style} {...attributes}>
      {children({ listeners })}
    </tr>
  );
}

export default function NuevoServicioModal({
  isOpen,
  onOpenChange,
  onServicioAgregado,
}: NuevoServicioModalProps) {
  const { username, isReady } = useUsername();
  const [loading, setLoading] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState('');
  const [tipoServicio, setTipoServicio] = useState('');
  const [horaDestino, setHoraDestino] = useState('');
  const [horaProgramada, setHoraProgramada] = useState('');
  const [pasajeros, setPasajeros] = useState<any[]>([]);

  const [inputValue, setInputValue] = useState('');
  const [codUnidadSeleccionado, setCodUnidadSeleccionado] =
    useState<string>('');

  const [apepateConductor, setApepateConductor] = useState('');
  const [codConductor, setCodConductor] = useState<number | null>(null);

  // ← CAMBIAR ESTOS ESTADOS PARA MANEJAR EL DESTINO
  const [destinoSeleccionado, setDestinoSeleccionado] =
    useState<IDestino | null>(null);
  const [codigoDestino, setCodigoDestino] = useState('4175'); // ← VALOR POR DEFECTO

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setClienteSeleccionado(event.target.value);
  };

  // ← NUEVA FUNCIÓN PARA MANEJAR LA SELECCIÓN DEL DESTINO
  const handleSelectDestino = (destino: IDestino) => {
    setDestinoSeleccionado(destino);
    setCodigoDestino(destino.codigo); // Solo guardamos el código para enviar a la API
  };

  const [pasajero, setPasajero] = useState('');
  const [codigoPasajero, setCodigoPasajero] = useState('');
  const [codigoLugar, setCodigoLugar] = useState('');

  const [direccionPasajero, setDireccionPasajero] = useState('');
  const [distritoPasajero, setDistritoPasajero] = useState('');

  const [sugerencias, setSugerencias] = useState<
    {
      apepate: string;
      codigo: string;
      codlugar: number;
      direccion: string;
      distrito: string;
      wx: string;
      wy: string;
    }[]
  >([]);

  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [seleccionado, setSeleccionado] = useState(false);

  const seleccionarPasajero = (
    nombre: string,
    codigo: string,
    codlugar: number,
    direccion: string,
    distrito: string,
    wx: string,
    wy: string,
  ) => {
    setPasajero(nombre);
    setCodigoPasajero(codigo);
    setDireccionPasajero(direccion);
    setDistritoPasajero(distrito);
    setCodigoLugar(codlugar.toString());
    setSugerencias([]);
    setMostrarSugerencias(false);
    setSeleccionado(true);
  };

  useEffect(() => {
    const fetchPasajeros = async () => {
      if (!isReady || pasajero.trim() === '') {
        setSugerencias([]);
        setMostrarSugerencias(false);
        return;
      }

      try {
        // ✅ Usar API diferente según el usuario
        const apiUrl =
          username === 'movilbus'
            ? `${API_BASE_URL125}/api/Preplan/GetPasajerosEmpresa?palabra=${pasajero}&codusuario=${username}&empresa=${clienteSeleccionado}`
            : `${API_BASE_URL125}/api/Preplan/GetPasajeros?palabra=${pasajero}&codusuario=${username}`;

        const response = await axios.get(apiUrl);

        const resultados = response.data.map((item: any) => ({
          apepate: item.apepate,
          codigo: item.codigo,
          codlugar: item.lugar?.codlugar || 0,
          direccion: item.lugar?.direccion || 'No disponible',
          distrito: item.lugar?.distrito || 'No disponible',
          wx: item.lugar?.wx || '',
          wy: item.lugar?.wy || '',
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
  }, [pasajero, seleccionado, username, isReady, clienteSeleccionado]); // ✅ Agregar clienteSeleccionado a las dependencias

  const agregarPasajero = () => {
    if (!pasajero) {
      toast.error('Debe ingresar el nombre del pasajero.');
      return;
    }

    setPasajeros((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        codigo: codigoPasajero,
        nombre: pasajero,
        direccion: direccionPasajero,
        distrito: distritoPasajero,
        codLugar: codigoLugar,
      },
    ]);
    setPasajero('');
  };

  const eliminarPasajero = (id: number) => {
    setPasajeros((prev) =>
      prev
        .filter((p) => p.id !== id)
        .map((p, index) => ({ ...p, id: index + 1 })),
    );
  };

  const onDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = pasajeros.findIndex((p) => p.id === active.id);
    const newIndex = pasajeros.findIndex((p) => p.id === over.id);

    const newPasajeros = [...pasajeros];
    const [moved] = newPasajeros.splice(oldIndex, 1);
    newPasajeros.splice(newIndex, 0, moved);

    const pasajerosOrdenados = newPasajeros.map((p, index) => ({
      ...p,
      id: index + 1,
    }));

    setPasajeros(pasajerosOrdenados);
  };

  async function agregarServicio(
    datos: any,
    onClose: () => void,
    setLoading: (loading: boolean) => void,
    resetForm: () => void,
    onServicioAgregado: () => void,
  ) {
    if (
      !datos.empresa ||
      !datos.fecha ||
      !datos.fecpreplan ||
      !datos.tipo ||
      !datos.listapuntos.length
      // ← REMOVIDA LA VALIDACIÓN OBLIGATORIA DEL DESTINO
    ) {
      toast.error(
        'Todos los campos son obligatorios, incluyendo al menos un pasajero en la lista.',
      );
      return;
    }

    const url = `${API_BASE_URL125}/api/Preplan/AgregarServicio?usuario=${username}`;

    try {
      setLoading(true);

      console.log('Enviando datos a la API:', JSON.stringify(datos, null, 2));

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(datos),
      });

      if (!response.ok) {
        throw new Error(
          `Error en la solicitud: ${response.status} - ${response.statusText}`,
        );
      }
      const data = await response.json();
      toast.success('Datos guardados correctamente');
      resetForm();
      onClose();
      onServicioAgregado();
      return data;
    } catch (error) {
      toast.error('Error al enviar los datos');
      return null;
    } finally {
      setLoading(false);
    }
  }

  const datosServicio = {
    conductor: { codigo: codConductor },
    empresa: clienteSeleccionado,
    fecha: parseFecha(horaDestino),
    fecpreplan: parseFecha(horaProgramada),
    grupo: clienteSeleccionado == 'LATAM' ? 'T' : 'N',
    destino: codigoDestino || '4175', // ← USAR '4175' SI NO HAY DESTINO SELECCIONADO
    listapuntos: [
      ...pasajeros.map((pasajero, index) => ({
        fecha: parseFecha(horaProgramada),
        lugar: { codlugar: pasajero.codLugar },
        pasajero: { codigo: pasajero.codigo },
        numerolan: '',
        orden: pasajero.id.toString(),
      })),
      {
        fecha: '31/03/2025 01:00',
        lugar: { codlugar: '4175' },
        pasajero: { codigo: '4175' },
        numerolan: '',
        orden: '0',
      },
    ],
    numero: '',
    tipo: tipoServicio, // ← Ya viene 'I' o 'S' directamente del select
    unidad: { codunidad: codUnidadSeleccionado },
  };

  const resetForm = () => {
    setClienteSeleccionado('');
    setTipoServicio('');
    setHoraDestino('');
    setHoraProgramada('');
    setPasajeros([]);
    setCodUnidadSeleccionado('');
    setInputValue('');
    setPasajero('');
    setApepateConductor('');
    setCodConductor(null);
    // ← RESETEAR LOS ESTADOS DEL DESTINO AL VALOR POR DEFECTO
    setDestinoSeleccionado(null);
    setCodigoDestino('4175');
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      className="w-[70%] max-w-none"
    >
      <ModalContent>
        {(onClose) => (
          <>
            <div className="rounded-md border border-gray-200 bg-white p-4">
              <h2 className="mb-4 flex items-center gap-2 text-[14px] font-bold text-gray-800">
                <MdAddBox size={20} />
                CREAR NUEVO SERVICIO
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Cliente:
                  </label>
                  <select
                    className="mt-1 w-full rounded-md border bg-gray-100 p-2 text-[12px] focus:border-gray-400 focus:outline-none focus:ring-0"
                    value={clienteSeleccionado}
                    onChange={handleChange}
                  >
                    <option value="" disabled>
                      Seleccione un cliente
                    </option>
                    {(username === 'movilbus' ? clientes : empresasG).map(
                      (cliente) => (
                        <option key={cliente} value={cliente}>
                          {cliente}
                        </option>
                      ),
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Tipo de Servicio:
                  </label>
                  <select
                    className="mt-1 w-full rounded-md border bg-gray-100 p-2 text-[12px] focus:border-gray-400 focus:outline-none focus:ring-0"
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

                {/* ← REEMPLAZAR EL INPUT DE DESTINO CON EL COMPONENTE */}
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Destino (Opcional):
                  </label>
                  <InputDestino onSelectDestino={handleSelectDestino} />
                </div>

                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-700 ">
                    Buscar Pasajero:
                  </label>

                  <div className="flex gap-2">
                    <input
                      id="inputPasajero"
                      type="text"
                      className="w-full rounded-md border border-gray-300 bg-gray-100 p-1.5 text-[12px] focus:border-gray-400 focus:outline-none focus:ring-0 dark:placeholder:text-gray-700"
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
                        setTimeout(() => setMostrarSugerencias(false), 100)
                      }
                    />

                    {mostrarSugerencias && sugerencias.length > 0 && (
                      <ul className="fixed z-[9999] mt-10 max-h-60 w-96 overflow-y-auto rounded-lg border border-gray-300 bg-white text-[12px] shadow-lg">
                        {sugerencias.map((item, index) => (
                          <li
                            key={index}
                            className="cursor-pointer px-4 py-2 hover:bg-gray-100"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              seleccionarPasajero(
                                item.apepate,
                                item.codigo,
                                item.codlugar,
                                item.direccion,
                                item.distrito,
                                item.wx,
                                item.wy,
                              );

                              setMostrarSugerencias(false);
                              setSugerencias([]);

                              setTimeout(() => {
                                const input =
                                  document.getElementById('inputPasajero');
                                input?.blur();
                              }, 100);
                            }}
                          >
                            {item.apepate}
                          </li>
                        ))}
                      </ul>
                    )}

                    <button
                      className="rounded-md bg-blue-600 px-3 py-1 text-xs text-white transition hover:bg-blue-700"
                      onClick={agregarPasajero}
                    >
                      Agregar
                    </button>
                  </div>
                </div>
              </div>

              <div className="col-span-2 my-3">
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Asignar Unidad:
                </label>
                <div className="flex gap-2">
                  <div className="w-full">
                    {username && (
                      <InputUnidad
                        value={inputValue}
                        onChange={setInputValue}
                        onSelect={(codunidad) => {
                          setInputValue(codunidad);
                          setCodUnidadSeleccionado(codunidad);
                        }}
                        usuario={username}
                      />
                    )}
                  </div>

                  <div className="w-full">
                    <InputConductor
                      value={apepateConductor}
                      onChange={setApepateConductor}
                      onSelect={(codigo, apepate) => {
                        setCodConductor(codigo);
                        setApepateConductor(apepate);
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 text-[12px] text-gray-600">
                <DndContext
                  collisionDetection={closestCenter}
                  onDragEnd={onDragEnd}
                >
                  <SortableContext
                    items={pasajeros.map((p) => p.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {pasajeros.length > 0 ? (
                      <table className="w-full border-collapse overflow-hidden  rounded">
                        <thead>
                          <tr className="bg-[#f3ae24] text-gray-900">
                            <th className="px-4 py-2 text-left">Orden</th>
                            <th className="px-4 py-2 text-left">Código</th>
                            <th className="px-4 py-2 text-left">Nombre</th>
                            <th className="px-4 py-2 text-left">Dirección</th>
                            <th className="px-4 py-2 text-left">Distrito</th>
                            <th className="px-4 py-2 text-center">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="bg-gray-200 text-[12px]">
                          {pasajeros.map((pasajero, index) => (
                            <SortableItem key={pasajero.id} id={pasajero.id}>
                              {({ listeners }) => (
                                <>
                                  <td
                                    className="border-b border-gray-300 px-4 py-2"
                                    {...listeners}
                                  >
                                    {index + 1}
                                  </td>
                                  <td
                                    className="border-b border-gray-300 px-4 py-2"
                                    {...listeners}
                                  >
                                    {pasajero.codigo}
                                  </td>
                                  <td
                                    className="border-b border-gray-300 px-4 py-2"
                                    {...listeners}
                                  >
                                    {pasajero.nombre}
                                  </td>
                                  <td
                                    className="border-b border-gray-300 px-4 py-2"
                                    {...listeners}
                                  >
                                    {pasajero.direccion}
                                  </td>
                                  <td
                                    className="border-b border-gray-300 px-4 py-2"
                                    {...listeners}
                                  >
                                    {pasajero.distrito}
                                  </td>
                                  <td className="border-b border-gray-300 px-4 py-2 text-center">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        eliminarPasajero(pasajero.id);
                                      }}
                                      className="rounded-lg bg-red-500 px-3 py-1 text-white transition hover:bg-red-600"
                                    >
                                      Eliminar
                                    </button>
                                  </td>
                                </>
                              )}
                            </SortableItem>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="py-4 text-center text-gray-500">
                        No se han agregado pasajeros.
                      </div>
                    )}
                  </SortableContext>
                </DndContext>
              </div>
            </div>
            <ModalFooter>
              <button
                className="rounded bg-red-600 px-4 py-2 text-sm text-white transition duration-200 hover:bg-red-600"
                onClick={() => {
                  resetForm();
                  onClose();
                }}
              >
                Cerrar
              </button>

              <button
                className={`rounded-md bg-blue-500 px-4 py-2 text-sm text-white transition duration-200 hover:bg-blue-600 ${
                  loading ? 'cursor-not-allowed opacity-50' : ''
                }`}
                onClick={() =>
                  agregarServicio(
                    datosServicio,
                    () => onOpenChange(false),
                    setLoading,
                    resetForm,
                    onServicioAgregado,
                  )
                }
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <FiLoader className="h-4 w-4 animate-spin" />
                    Guardando...
                  </div>
                ) : (
                  'Guardar'
                )}
              </button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
