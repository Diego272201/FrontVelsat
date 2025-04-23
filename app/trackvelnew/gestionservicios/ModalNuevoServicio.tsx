import { closestCenter, DndContext } from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
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
import { FaCar } from 'react-icons/fa';
import { toast } from 'sonner';

interface NuevoServicioModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onServicioAgregado: () => void;
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
      {children({ listeners })} {/* Pasamos los listeners como prop */}
    </tr>
  );
}

export default function NuevoServicioModal({
  isOpen,
  onOpenChange,
  onServicioAgregado ,
}: NuevoServicioModalProps) {
  const parseFecha = (fechaISO: string | null): string | null => {
    if (!fechaISO) return null;

    const fecha = new Date(fechaISO);
    if (isNaN(fecha.getTime())) {
      return null;
    }

    const dia = String(fecha.getDate()).padStart(2, '0');
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const año = fecha.getFullYear();
    const horas = String(fecha.getHours()).padStart(2, '0');
    const minutos = String(fecha.getMinutes()).padStart(2, '0');

    const fechaFormateada = `${dia}/${mes}/${año} ${horas}:${minutos}`;

    return fechaFormateada;
  };

  const [loading, setLoading] = useState(false);

  const [clienteSeleccionado, setClienteSeleccionado] = useState('');

  const [tipoServicio, setTipoServicio] = useState('');
  const [horaDestino, setHoraDestino] = useState('');
  const [horaProgramada, setHoraProgramada] = useState('');
  const [pasajeros, setPasajeros] = useState<any[]>([]);
  const [horaAtencion, setHoraAtencion] = useState('');

  const [unidadA, setUnidadA] = useState('');
  const [unidadesA, setUnidadesA] = useState<
    { id: number; codunidad: string }[]
  >([]);
  const [showDropdownUnidadA, setShowDropdownUnidadA] = useState(false);

  const [unidadSeleccionadaA, setUnidadSeleccionadaA] = useState<string | null>(
    null,
  );

  const [conductor, setConductor] = useState<string>('');
  const [conductores, setConductores] = useState<
    { codigo: number; apepate: string }[]
  >([]);
  const [filteredOptions, setFilteredOptions] = useState<
    { codigo: number; apepate: string }[]
  >([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [conductorSeleccionado, setConductorSeleccionado] = useState<
    string | null
  >(null);

  useEffect(() => {
    const fetchConductores = async () => {
      try {
        const response = await axios.get(
          'https://velsat.pe:8586/api/Preplan/conductores?usuario=movilbus',
        );
        setConductores(response.data);
      } catch (error) {
        console.error('Error al obtener conductores:', error);
      }
    };

    fetchConductores();
  }, []);

  useEffect(() => {
    const fetchUnidades = async () => {
      try {
        const response = await axios.get(
          'https://velsat.pe:8586/api/Preplan/unidades',
        );
        setUnidadesA(response.data);
      } catch (error) {
        console.error('Error al obtener unidades:', error);
      }
    };

    fetchUnidades();
  }, []);

  const handleUnidadAChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUnidadA(e.target.value);
    setShowDropdownUnidadA(true);
  };

  const handleSelectUnidadA = (codunidad: string) => {
    setUnidadA(codunidad);
    setUnidadSeleccionadaA(codunidad);
    setShowDropdownUnidadA(false);
  };

  const handleConductorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setConductor(value);

    if (value.length > 0) {
      const filtered = conductores.filter((c) =>
        c.apepate.toLowerCase().includes(value.toLowerCase()),
      );
      setFilteredOptions(filtered);
      setShowDropdown(true);
    } else {
      setFilteredOptions([]);
      setShowDropdown(false);
    }
  };

  const handleSelectConductor = (codigo: number, apepate: string) => {
    setConductor(apepate);
    setConductorSeleccionado(codigo.toString());
    setShowDropdown(false);
  };

  useEffect(() => {
    if (conductorSeleccionado) {
      console.log('Conductor codigo:', conductorSeleccionado);
      console.log('Conductor nombre completo :', conductor);
    }
  }, [conductorSeleccionado, conductor]);

  useEffect(() => {
    if (unidadSeleccionadaA) {
      console.log('Unidad seleccionada:', unidadSeleccionadaA);
    }
  }, [unidadSeleccionadaA]);

  const filteredUnidadesA =
    unidadA.length > 0
      ? unidadesA.filter((u) =>
          (u.codunidad ?? '').toLowerCase().includes(unidadA.toLowerCase()),
        )
      : [];

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setClienteSeleccionado(event.target.value);
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
    console.log('Pasajero seleccionado:', nombre, 'Código:', codigo);
    console.log(
      'Lugar:',
      'CodLugar:',
      codlugar,
      'Dirección:',
      direccion,
      'Distrito:',
      distrito,
      'Latitud',
      wx,
      'Longitud',
      wy,
    );

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
      if (pasajero.trim() === '') {
        setSugerencias([]);
        setMostrarSugerencias(false);

        return;
      }

      try {
        const response = await axios.get(
          `https://velsat.pe:8586/api/Preplan/GetPasajeros?palabra=${pasajero}`,
        );

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
  }, [pasajero, seleccionado]);

  const agregarPasajero = () => {
    if (!pasajero || !horaAtencion) return;

    setPasajeros((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        codigo: codigoPasajero,
        nombre: pasajero,
        direccion: direccionPasajero,
        distrito: distritoPasajero,
        hora: horaAtencion,
        codLugar: codigoLugar,
      },
    ]);
    setPasajero('');
    setHoraAtencion('');
  };

  useEffect(() => {
    console.log(pasajeros);
  }, [pasajeros]);

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

    // 🔹 Reasignamos los IDs en orden
    const pasajerosOrdenados = newPasajeros.map((p, index) => ({
      ...p,
      id: index + 1, // IDs secuenciales
    }));

    setPasajeros(pasajerosOrdenados);
  };
  async function agregarServicio(
    datos: any,
    onClose: () => void,
    setLoading: (loading: boolean) => void,
    resetForm: () => void,
    onServicioAgregado: () => void
  ) {
    // Verificación de datos obligatorios
    if (
      !datos.conductor?.codigo ||
      !datos.empresa ||
      !datos.fecha ||
      !datos.fecpreplan ||
      !datos.tipo ||
      !datos.unidad?.codunidad ||
      !datos.listapuntos.length
    ) {
      toast.error("Todos los campos son obligatorios, incluyendo al menos un pasajero en la lista.");
      return;
    }
  
    const url = "https://velsat.pe:8586/api/Preplan/AgregarServicio?usuario=movilbus";
  
    try {
      setLoading(true);
      console.log("📤 Enviando datos a la API:", JSON.stringify(datos, null, 2));
  
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(datos),
      });
  
      if (!response.ok) {
        throw new Error(`Error en la solicitud: ${response.status} - ${response.statusText}`);
      }
  
      const data = await response.json();
      console.log("✅ Respuesta de la API:", data);
      toast.success("Datos guardados correctamente");
      resetForm();
      onClose();
      onServicioAgregado();
      return data;
    } catch (error) {
      toast.error("Error al enviar los datos");
      console.error("⛔ Error:", error);
      return null;
    } finally {
      setLoading(false);
    }
  }
  



  // Ejemplo de uso
  const datosServicio = {
    conductor: { codigo: conductorSeleccionado },
    empresa: clienteSeleccionado ,
    fecha: parseFecha(horaDestino),
    fecpreplan: parseFecha(horaProgramada),
    grupo: clienteSeleccionado == 'LATAM' ? 'T' : 'N',
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
    tipo: tipoServicio == 'RECOJO' ? 'I' : 'S',
    unidad: { codunidad: unidadSeleccionadaA },
  };

  // Llamar a la función

  const resetForm = () => {
    setClienteSeleccionado('');
    setTipoServicio('');
    setHoraDestino('');
    setHoraProgramada('');
    setUnidadSeleccionadaA('');
    setUnidadA(''),
    setConductorSeleccionado('');
    setConductor(''),
    setPasajeros([]); // Si tienes una lista de pasajeros, límpiala también
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
                        setTimeout(() => setMostrarSugerencias(false), 100)
                      }
                    />

                    {mostrarSugerencias && sugerencias.length > 0 && (
                      <ul className="fixed z-[9999] mt-10 max-h-60 overflow-y-auto rounded-lg border border-gray-300 bg-white shadow-lg ">
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

                    <input
                      type="time"
                      placeholder="Hora Atención"
                      className="w-1/4 rounded-md border border-gray-300 bg-gray-100 p-1 text-sm shadow-sm focus:border-gray-400 focus:outline-none focus:ring-0"
                      value={horaAtencion}
                      onChange={(e) => setHoraAtencion(e.target.value)}
                    />
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
                    <input
                      type="text"
                      className="mt-1 w-full rounded-md border bg-gray-100 p-1 text-sm focus:border-gray-400 focus:outline-none focus:ring-0"
                      placeholder="Escriba Unidad"
                      value={unidadA}
                      onChange={handleUnidadAChange}
                      onFocus={() => setShowDropdownUnidadA(true)}
                      onBlur={() =>
                        setTimeout(() => setShowDropdownUnidadA(false), 200)
                      }
                    />

                    {showDropdownUnidadA && filteredUnidadesA.length > 0 && (
                      <ul className="fixed z-[9999] mt-1 max-h-60 overflow-y-auto rounded-lg border border-gray-300 bg-white shadow-lg">
                        {filteredUnidadesA.map((unidad) => (
                          <li
                            key={unidad.id}
                            className="cursor-pointer px-4 py-2 hover:bg-gray-200"
                            onClick={() =>
                              handleSelectUnidadA(unidad.codunidad)
                            }
                          >
                            {unidad.codunidad}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="w-full">
                    <input
                      type="text"
                      className="mt-1 w-full rounded-md border bg-gray-100 p-1 text-sm focus:border-gray-400 focus:outline-none focus:ring-0"
                      placeholder="Escriba el Nombre del Conductor"
                      value={conductor}
                      onChange={handleConductorChange}
                      onFocus={() => setShowDropdown(true)}
                      onBlur={() =>
                        setTimeout(() => setShowDropdown(false), 200)
                      }
                    />

                    {showDropdown && filteredOptions.length > 0 && (
                      <ul className="fixed z-[9999] mt-1 max-h-60 overflow-y-auto rounded-lg border border-gray-300 bg-white shadow-lg">
                        {filteredOptions.map((c) => (
                          <li
                            key={c.codigo}
                            className="cursor-pointer px-4 py-2 hover:bg-gray-200"
                            onClick={() =>
                              handleSelectConductor(c.codigo, c.apepate)
                            }
                          >
                            {c.apepate}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>

              {/* Mensaje de Pasajeros */}
              <div className="mt-4 p-3 text-sm  text-gray-600">
                <DndContext
                  collisionDetection={closestCenter}
                  onDragEnd={onDragEnd}
                >
                  <SortableContext
                    items={pasajeros.map((p) => p.id)}
                    strategy={verticalListSortingStrategy}
                  >
               {pasajeros.length > 0 ? (
  <table className="w-full border-collapse overflow-hidden rounded-lg shadow-lg">
    <thead>
      <tr className="bg-gray-800 text-white">
        <th className="px-4 py-2 text-left">Orden</th>
        <th className="px-4 py-2 text-left">Código</th>
        <th className="px-4 py-2 text-left">Nombre</th>
        <th className="px-4 py-2 text-left">Dirección</th>
        <th className="px-4 py-2 text-left">Distrito</th>
        <th className="px-4 py-2 text-left">Hora</th>
        <th className="px-4 py-2 text-center">Acciones</th>
      </tr>
    </thead>
    <tbody className="bg-slate-100">
      {pasajeros.map((pasajero, index) => (
        <SortableItem key={pasajero.id} id={pasajero.id}>
          {({ listeners }) => (
            <>
              <td className="px-4 py-3" {...listeners}>{index + 1}</td>
              <td className="px-4 py-3" {...listeners}>{pasajero.codigo}</td>
              <td className="px-4 py-3" {...listeners}>{pasajero.nombre}</td>
              <td className="px-4 py-3" {...listeners}>{pasajero.direccion}</td>
              <td className="px-4 py-3" {...listeners}>{pasajero.distrito}</td>
              <td className="px-4 py-3" {...listeners}>{pasajero.hora}</td>
              <td className="px-4 py-3 text-center">
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
  <div className="text-center py-4 text-gray-500">
    No se han agregado pasajeros.
  </div>
)}

                  </SortableContext>
                </DndContext>
              </div>
            </div>
            <ModalFooter>
              <Button color="danger" onPress={onClose}>
                Cerrar
              </Button>
              <Button
                color="primary"
                onPress={() =>
                  agregarServicio(
                    datosServicio,
                    () => onOpenChange(false),
                    setLoading,
                    resetForm,
                    onServicioAgregado  
                  )
                }
                isDisabled={loading}
              >
                {loading ? 'Guardando...' : 'Guardar'}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
