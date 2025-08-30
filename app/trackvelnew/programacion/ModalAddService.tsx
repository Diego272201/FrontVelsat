import React, { useState } from 'react';
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
} from '@nextui-org/react';
import { Plus, Search, Trash2, Save, Plane, User } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import PasajeroAutocompleteInput from './PasajeroAutocompleteInputProps';

interface ModalAddServiceProps {
  onServiceAdded?: () => void;
}

export default function ModalAddService({
  onServiceAdded,
}: ModalAddServiceProps) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const targetRef = React.useRef(null);
  const { moveProps } = useDraggable({
    targetRef,
    canOverflow: true,
    isDisabled: !isOpen,
  });

  const [formData, setFormData] = useState({
    numero: '',
    aireTierra: '',
    tipo: '',
    horaAeropuerto: '',
    horaProgramada: '',
    aerolinea: '',
  });

  const [pasajeros, setPasajeros] = useState<string[]>([]);
  const [codigosPasajeros, setCodigosPasajeros] = useState<
    Array<{ codigo: string; codlugar: number }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);

  const aireTierraOptions = [
    { key: 'tierra', label: 'Tierra' },
    { key: 'aire', label: 'Aire' },
    { key: 'ninguno', label: 'Ninguno' },
  ];

  const tipoOptions = [
    { key: 'entrada', label: 'Entrada' },
    { key: 'salida', label: 'Salida' },
  ];

  const aerolineaOptions = [
    { key: 'atsa', label: 'ATSA' },
    { key: 'avianca', label: 'AVIANCA' },
    { key: 'dhl', label: 'DHL' },
    { key: 'latam', label: 'LATAM' },
    { key: 'talma', label: 'TALMA' },
    { key: 'terpel', label: 'TERPEL' },
  ];

  interface Pasajero {
    codigo: string;
    nombre: string | null;
    codlan: string;
    apepate: string;
    login: string | null;
    clave: string | null;
    sexo: string | null;
    telefono: string | null;
    empresa: string | null;
    lugar: {
      codlugar: number;
      codcli: string | null;
      direccion: string;
      distrito: string;
      wy: string;
      wx: string;
      estado: string | null;
      codcliente: string | null;
      referencia: string | null;
      zona: string;
    };
    servicioactual: any;
  }

  // Función para parsear fecha al formato que espera la API (dd/MM/yyyy HH:mm)
  const parseFecha = (fechaString: string) => {
    if (!fechaString) return '';
    const fecha = new Date(fechaString);

    const dia = fecha.getDate().toString().padStart(2, '0');
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const año = fecha.getFullYear();
    const horas = fecha.getHours().toString().padStart(2, '0');
    const minutos = fecha.getMinutes().toString().padStart(2, '0');

    return `${dia}/${mes}/${año} ${horas}:${minutos}`;
  };

  const handleSelectPasajero = (pasajero: Pasajero) => {
    const nombreCompleto = pasajero.apepate;
    if (!pasajeros.includes(nombreCompleto)) {
      setPasajeros((prev) => [...prev, nombreCompleto]);

      const nuevoCodigo = {
        codigo: pasajero.codigo,
        codlugar: pasajero.lugar.codlugar,
      };

      setCodigosPasajeros((prev) => {
        const nuevosCodeos = [...prev, nuevoCodigo];
        console.log('Códigos de pasajeros actualizados:', nuevosCodeos);
        return nuevosCodeos;
      });
    }
  };

  const handleManualInput = (input: string) => {
    if (!pasajeros.includes(input)) {
      setPasajeros((prev) => [...prev, input]);

      const nuevoCodigo = {
        codigo: 'MANUAL',
        codlugar: 0,
      };

      setCodigosPasajeros((prev) => {
        const nuevosCodeos = [...prev, nuevoCodigo];
        console.log(
          'Códigos de pasajeros actualizados (entrada manual):',
          nuevosCodeos,
        );
        return nuevosCodeos;
      });
    }
  };

  const eliminarPasajero = (index: number) => {
    setPasajeros((prev) => prev.filter((_, i) => i !== index));
    setCodigosPasajeros((prev) => {
      const nuevosCodeos = prev.filter((_, i) => i !== index);
      console.log('Códigos de pasajeros después de eliminar:', nuevosCodeos);
      return nuevosCodeos;
    });
  };

  const validarFormulario = () => {
    if (!formData.numero.trim()) {
      toast.error('El número de vuelo es obligatorio');
      return false;
    }
    if (!formData.aireTierra) {
      toast.error('Debe seleccionar Aire/Tierra');
      return false;
    }
    if (!formData.tipo) {
      toast.error('Debe seleccionar el tipo (Entrada/Salida)');
      return false;
    }
    if (!formData.horaAeropuerto) {
      toast.error('La hora del aeropuerto es obligatoria');
      return false;
    }
    if (!formData.horaProgramada) {
      toast.error('La hora programada es obligatoria');
      return false;
    }
    if (!formData.aerolinea) {
      toast.error('Debe seleccionar una aerolínea');
      return false;
    }
    if (pasajeros.length === 0) {
      toast.error('Debe agregar al menos un pasajero');
      return false;
    }
    return true;
  };

  const handleGuardar = async (onClose: () => void) => {
    if (!validarFormulario()) {
      return;
    }

    setIsLoading(true);

    try {
      // Mapear los datos del modal a la estructura de la API
      const datosServicio = {
        empresa: formData.aerolinea.toUpperCase(),
        fecha: parseFecha(formData.horaAeropuerto),
        fecpreplan: parseFecha(formData.horaProgramada),
        grupo:
          formData.aireTierra === 'aire'
            ? 'A'
            : formData.aireTierra === 'tierra'
              ? 'T'
              : 'N',

        destino: '4175',
        listapuntos: [
          // Mapear los pasajeros agregados (orden 1, 2, 3, etc.)
          ...codigosPasajeros.map((pasajero, index) => ({
            lugar: {
              codlugar: pasajero.codlugar.toString(), // Convertir a string
            },
            pasajero: {
              codigo: pasajero.codigo,
            },
            numerolan: formData.numero,
            orden: (index + 1).toString(), // 1, 2, 3, etc.
          })),
          // Punto adicional con orden 0 (siempre al final)
          {
            fecha: parseFecha(formData.horaAeropuerto),
            lugar: {
              codlugar: '4175', // Como string
            },
            pasajero: {
              codigo: '4175', // Como string
            },
            numerolan: formData.numero,
            orden: '0',
          },
        ],
        numero: formData.numero,
        tipo: formData.tipo === 'entrada' ? 'I' : 'S', // Entrada = I, Salida = S
        unidad: {
          codunidad: '',
        },
        conductor: {
          codigo: null,
        },
      };

      console.log('Datos a enviar a la API:', datosServicio);

      const response = await fetch(
        'https://velsat.pe:2096/api/Preplan/AgregarServicio?usuario=cgacela',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(datosServicio),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.message ||
            `Error ${response.status}: ${response.statusText}`,
        );
      }

      const resultado = await response.json();
      console.log('Respuesta de la API:', resultado);

      // Mostrar mensaje de éxito
      toast.success('Servicio guardado exitosamente', {
        description: `Se agregó el servicio ${formData.numero} con ${pasajeros.length} pasajero(s)`,
        duration: 4000,
      });

      if (onServiceAdded) {
        onServiceAdded();
      }

      // Limpiar el formulario
      setFormData({
        numero: '',
        aireTierra: '',
        tipo: '',
        horaAeropuerto: '',
        horaProgramada: '',
        aerolinea: '',
      });
      setPasajeros([]);
      setCodigosPasajeros([]);

      // Cerrar el modal
      onClose();
    } catch (error) {
      console.error('Error al guardar el servicio:', error);

      toast.error('Error al guardar el servicio', {
        description:
          error instanceof Error
            ? error.message
            : 'Error desconocido. Intente nuevamente.',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={onOpen}
        className="flex flex-1 items-center justify-center gap-1 rounded-md bg-green-600 px-3 py-[12px] text-xs font-medium leading-none text-white transition-colors hover:bg-green-700"
      >
        <Plus className="h-3 w-3" />
        Nuevo Servicio
      </button>

      <Modal
        ref={targetRef}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        size="5xl"
        scrollBehavior="inside"
        isDismissable={!isLoading}
        classNames={{
          base: 'bg-white',
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
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800">
                      Ingreso de Nuevo Servicio
                    </h2>
                    <p className="text-sm text-gray-500">
                      Complete la información y agregue los pasajeros
                    </p>
                  </div>
                </div>
              </ModalHeader>

              <ModalBody>
                <div className="space-y-6">
                  {/* Información del Vuelo */}
                  <div className="rounded-lg bg-gray-50 p-4">
                    <h3 className="mb-4 text-lg font-semibold text-gray-800">
                      Información del Vuelo
                    </h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <Input
                        label="Número"
                        placeholder="Ingrese el número de vuelo"
                        value={formData.numero}
                        onValueChange={(value) =>
                          setFormData((prev) => ({ ...prev, numero: value }))
                        }
                        variant="bordered"
                        size="md"
                        isRequired
                        classNames={{
                          input: 'text-center font-semibold',
                          label: 'text-gray-700 font-medium',
                        }}
                      />

                      <Select
                        label="Aire/Tierra"
                        placeholder="Seleccione tipo"
                        selectedKeys={[formData.aireTierra]}
                        onSelectionChange={(keys) => {
                          const selected = Array.from(keys)[0] as string;
                          setFormData((prev) => ({
                            ...prev,
                            aireTierra: selected,
                          }));
                        }}
                        variant="bordered"
                        size="md"
                        isRequired
                        classNames={{
                          label: 'text-gray-700 font-medium',
                        }}
                      >
                        {aireTierraOptions.map((option) => (
                          <SelectItem key={option.key} value={option.key}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </Select>

                      <Select
                        label="Tipo"
                        placeholder="Seleccione tipo"
                        selectedKeys={[formData.tipo]}
                        onSelectionChange={(keys) => {
                          const selected = Array.from(keys)[0] as string;
                          setFormData((prev) => ({ ...prev, tipo: selected }));
                        }}
                        variant="bordered"
                        size="md"
                        isRequired
                        classNames={{
                          label: 'text-gray-700 font-medium',
                        }}
                      >
                        {tipoOptions.map((option) => (
                          <SelectItem key={option.key} value={option.key}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </Select>
                    </div>

                    <div className="mt-4 grid grid-cols-1 items-end gap-4 md:grid-cols-3">
                      <div className="relative">
                        <label
                          htmlFor="horaAeropuerto"
                          className="mb-2 block text-sm font-medium text-gray-500"
                        >
                          Hora Aeropuerto{' '}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="horaAeropuerto"
                          type="datetime-local"
                          value={formData.horaAeropuerto}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              horaAeropuerto: e.target.value,
                            }))
                          }
                          className="w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2 text-gray-900 transition-all duration-200 hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          placeholder="dd/mm/yyyy --:-- --"
                          required
                        />
                      </div>

                      <div className="relative">
                        <label
                          htmlFor="horaProgramada"
                          className="mb-2 block text-sm font-medium text-gray-500"
                        >
                          Hora Programada{' '}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="horaProgramada"
                          type="datetime-local"
                          value={formData.horaProgramada}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              horaProgramada: e.target.value,
                            }))
                          }
                          className="w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2 text-gray-900 transition-all duration-200 hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          placeholder="dd/mm/yyyy --:-- --"
                          required
                        />
                      </div>

                      <Select
                        label="Aerolínea"
                        placeholder="Seleccione aerolínea"
                        selectedKeys={[formData.aerolinea]}
                        onSelectionChange={(keys) => {
                          const selected = Array.from(keys)[0] as string;
                          setFormData((prev) => ({
                            ...prev,
                            aerolinea: selected,
                          }));
                        }}
                        variant="bordered"
                        size="md"
                        isRequired
                        classNames={{
                          label: 'text-gray-700 font-medium',
                        }}
                      >
                        {aerolineaOptions.map((option) => (
                          <SelectItem key={option.key} value={option.key}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </Select>
                    </div>
                  </div>

                  {/* Buscar Pasajero */}
                  <div className="rounded-lg bg-blue-50 p-4">
                    <div className="mb-4 flex items-center gap-2">
                      <Search className="h-5 w-5 text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-800">
                        Buscar Pasajero
                      </h3>
                    </div>

                    <PasajeroAutocompleteInput
                      placeholder="Ingresa el nombre del pasajero..."
                      onSelectPasajero={handleSelectPasajero}
                      onManualInput={handleManualInput}
                      showSearchIcon={false}
                      allowManualEntry={true}
                      variant="nextui"
                      className="w-full"
                    />
                  </div>

                  {/* Lista de Pasajeros */}
                  <div className="rounded-lg bg-gray-50 p-4">
                    <h3 className="mb-4 text-lg font-semibold text-gray-800">
                      Lista de Pasajeros ({pasajeros.length})
                    </h3>

                    {pasajeros.length === 0 ? (
                      <div className="py-8 text-center text-gray-500">
                        <User className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                        <p>No hay pasajeros agregados</p>
                        <p className="text-sm">
                          Use el campo de búsqueda para agregar pasajeros
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {pasajeros.map((pasajero, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 transition-all hover:shadow-md"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                                <span className="text-sm font-semibold text-blue-600">
                                  {index + 1}
                                </span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-800">
                                  {pasajero}
                                </span>
                                <div className="text-xs text-gray-500">
                                  Código: {codigosPasajeros[index]?.codigo} |
                                  Lugar: {codigosPasajeros[index]?.codlugar}
                                </div>
                              </div>
                            </div>
                            <Button
                              isIconOnly
                              color="danger"
                              variant="light"
                              onPress={() => eliminarPasajero(index)}
                              className="h-8 min-w-8"
                              isDisabled={isLoading}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </ModalBody>

              <ModalFooter>
                <Button
                  color="danger"
                  variant="light"
                  onPress={onClose}
                  isDisabled={isLoading}
                >
                  Cancelar
                </Button>
                <Button
                  color="success"
                  onPress={() => handleGuardar(onClose)}
                  startContent={isLoading ? null : <Save className="h-4 w-4" />}
                  isLoading={isLoading}
                  isDisabled={isLoading}
                >
                  {isLoading ? 'Guardando...' : 'Guardar Servicio'}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
