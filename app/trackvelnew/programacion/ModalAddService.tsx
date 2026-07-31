import React, { useState } from 'react';
import { useDisclosure, Button } from '@nextui-org/react';
import { Plus, Search, Trash2, Plane, User } from 'lucide-react';
import { toast } from 'sonner';
import PasajeroAutocompleteInput from './PasajeroAutocompleteInputProps';
import { useUsername } from '@/hooks/useUsername';
import BaseModal from '@/app/components/ui/BaseModal';

interface ModalAddServiceProps {
  onServiceAdded?: () => void;
}

export default function ModalAddService({
  onServiceAdded,
}: ModalAddServiceProps) {
  const { isOpen, onOpen, onClose, onOpenChange } = useDisclosure();

  const [formData, setFormData] = useState({
    numero: '',
    aireTierra: '',
    tipo: '',
    horaAeropuerto: '',
    horaProgramada: '',
    aerolinea: '',
  });

  const { username, isReady } = useUsername();
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
    { key: 'lagardere', label: 'LAGARDERE ' }
  ];

  const aerolineaAremys = [{ key: 'sasaa', label: 'SASAA' }];

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

  const getAerolineaOptions = () => {
    if (username?.toLowerCase() === 'aremys') {
      return aerolineaAremys;
    }
    return aerolineaOptions;
  };

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

    // Validar que el username esté disponible
    if (!username) {
      toast.error('Error de autenticación', {
        description: 'No se pudo obtener el nombre de usuario',
        duration: 5000,
      });
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
        `https://do.velsat.pe:2083/api/Preplan/AgregarServicio?usuario=${encodeURIComponent(username)}`,
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
        className="flex flex-1 items-center justify-center gap-1 rounded-md bg-brandSecondary px-3 py-[12px] text-xs font-medium leading-none text-white transition-colors hover:bg-brandSecondary-hover"
      >
        <Plus className="h-3 w-3" />
        Nuevo Servicio
      </button>

      <BaseModal
        isOpen={isOpen}
        onClose={onClose}
        title="Ingreso de Nuevo Servicio"
        subtitle="Complete la información y agregue los pasajeros"
        icon={<Plane className="h-4 w-4 text-blue-600" />}
        iconBgColor="bg-blue-100"
        size="3xl"
        confirmText="Guardar Servicio"
        onConfirm={() => handleGuardar(onClose)}
        isLoading={isLoading}
      >
        <div className="space-y-3">
          {/* Información del Vuelo */}
          <div className="rounded-md border border-slate-200 bg-slate-50/60 p-2.5">
            <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-700">
              Información del Vuelo
            </h3>

            {/* Fila 1: Datos principales */}
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-3">
                <label className="mb-1 block text-[11px] font-medium text-slate-600">
                  Número <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="N° Vuelo"
                  value={formData.numero}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, numero: e.target.value }))
                  }
                  className="h-8 w-full rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-800 transition-colors hover:border-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="col-span-3">
                <label className="mb-1 block text-[11px] font-medium text-slate-600">
                  Aire/Tierra <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.aireTierra}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      aireTierra: e.target.value,
                    }))
                  }
                  className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-800 transition-colors hover:border-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                >
                  <option value="">Seleccionar</option>
                  {aireTierraOptions.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-3">
                <label className="mb-1 block text-[11px] font-medium text-slate-600">
                  Tipo <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.tipo}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, tipo: e.target.value }))
                  }
                  className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-800 transition-colors hover:border-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                >
                  <option value="">Seleccionar</option>
                  {tipoOptions.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-3">
                <label className="mb-1 block text-[11px] font-medium text-slate-600">
                  Aerolínea <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.aerolinea}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      aerolinea: e.target.value,
                    }))
                  }
                  className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-800 transition-colors hover:border-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                >
                  <option value="">Seleccionar</option>
                  {getAerolineaOptions().map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Fila 2: Fechas y Horas */}
            <div className="mt-2 grid grid-cols-12 gap-2">
              <div className="col-span-6">
                <label
                  htmlFor="horaAeropuerto"
                  className="mb-1 block text-[11px] font-medium text-slate-600"
                >
                  Hora Aeropuerto <span className="text-red-500">*</span>
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
                  className="h-8 w-full rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-800 transition-colors hover:border-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="col-span-6">
                <label
                  htmlFor="horaProgramada"
                  className="mb-1 block text-[11px] font-medium text-slate-600"
                >
                  Hora Programada <span className="text-red-500">*</span>
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
                  className="h-8 w-full rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-800 transition-colors hover:border-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Buscar Pasajero */}
          <div className="rounded-md border border-blue-200 bg-blue-50/50 p-2.5">
            <div className="mb-1.5 flex items-center gap-1.5">
              <Search className="h-3.5 w-3.5 text-blue-600" />
              <h3 className="text-[11px] font-bold uppercase tracking-wide text-blue-900">
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
              size="sm"
              className="w-full"
            />
          </div>

          {/* Lista de Pasajeros */}
          <div className="rounded-md border border-slate-200 bg-slate-50/60 p-2.5">
            <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-700">
              Lista de Pasajeros ({pasajeros.length})
            </h3>

            {pasajeros.length === 0 ? (
              <div className="py-3 text-center text-slate-400">
                <User className="mx-auto mb-1 h-5 w-5 text-slate-300" />
                <p className="text-[11px]">No hay pasajeros agregados</p>
              </div>
            ) : (
              <div className="max-h-[150px] space-y-1 overflow-y-auto pr-1">
                {pasajeros.map((pasajero, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded border border-slate-200 bg-white px-2.5 py-1 transition-colors hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
                        {index + 1}
                      </div>
                      <div>
                        <span className="text-xs font-medium text-slate-800">
                          {pasajero}
                        </span>
                        <span className="ml-2 text-[10px] text-slate-500">
                          (Cód: {codigosPasajeros[index]?.codigo} | Lugar: {codigosPasajeros[index]?.codlugar})
                        </span>
                      </div>
                    </div>
                    <Button
                      isIconOnly
                      color="danger"
                      variant="light"
                      size="sm"
                      onPress={() => eliminarPasajero(index)}
                      className="h-6 min-w-6 w-6 p-0"
                      isDisabled={isLoading}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </BaseModal>
    </>
  );
}
