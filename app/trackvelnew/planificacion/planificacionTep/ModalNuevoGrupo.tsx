import React, { useState } from 'react';
import { Select, SelectItem } from '@nextui-org/react';
import { toast } from 'sonner';
import InputPasajero from '@/app/components/inputs/InputPasajero';
import { API_BASE_URL125 } from '@/app/components/urlsApi/urlApi';
import { MdLibraryAdd, MdDelete } from 'react-icons/md';
import { useUsername } from '@/hooks/useUsername';
import InputPasajeroEmpresa from '@/app/components/inputs/InputPasajeroEmpresa';
import BaseModal from '@/app/components/ui/BaseModal';

interface ModalNuevoGrupoProps {
  isOpen: boolean;
  onClose: () => void;
  onRefrescarDatos: () => void; // Cambio: función para refrescar datos
  empresaActual: string;
  totalGruposActuales: number; // Nuevo: recibir el total de grupos actuales
}

interface PasajeroSeleccionado {
  apepate: string;
  codlan: string;
  codlugar: number;
}

const ModalNuevoGrupo: React.FC<ModalNuevoGrupoProps> = ({
  isOpen,
  onClose,
  onRefrescarDatos,
  empresaActual,
  totalGruposActuales = 0,
}) => {
  const { username, isReady } = useUsername();

  const [formData, setFormData] = useState({
    tipo: 'I', // Por defecto tipo "I" (Ingreso)
    fechaInicio: '', // Fecha y hora de inicio
    fechaFin: '', // Fecha y hora de fin
  });

  const [pasajerosSeleccionados, setPasajerosSeleccionados] = useState<
    PasajeroSeleccionado[]
  >([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Limpiar error cuando el usuario empiece a escribir
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const handleAgregarPasajero = (pasajero: PasajeroSeleccionado) => {
    // Verificar si el pasajero ya está en la lista
    const yaExiste = pasajerosSeleccionados.some(
      (p) => p.codlan === pasajero.codlan,
    );
    if (yaExiste) {
      toast.warning('Este pasajero ya está en la lista');
      return;
    }

    setPasajerosSeleccionados((prev) => [...prev, pasajero]);
    toast.success('Pasajero agregado a la lista');
  };

  const handleEliminarPasajero = (codlan: string) => {
    setPasajerosSeleccionados((prev) =>
      prev.filter((p) => p.codlan !== codlan),
    );
    toast.info('Pasajero eliminado de la lista');
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (pasajerosSeleccionados.length === 0) {
      newErrors.pasajeros = 'Debe agregar al menos un pasajero';
    }

    // Validación condicional de fechas según el tipo
    if (formData.tipo === 'I') {
      // Tipo Ingreso: solo fecha de fin es obligatoria
      if (!formData.fechaFin.trim()) {
        newErrors.fechaFin = 'La fecha de fin es obligatoria para tipo Ingreso';
      }
    } else if (formData.tipo === 'S') {
      // Tipo Salida: solo fecha de inicio es obligatoria
      if (!formData.fechaInicio.trim()) {
        newErrors.fechaInicio =
          'La fecha de inicio es obligatoria para tipo Salida';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Función para convertir datetime-local a formato DD/MM/YYYY HH:mm
  const formatearFechaHora = (datetimeLocal: string) => {
    if (!datetimeLocal) return '';

    // datetimeLocal viene en formato: YYYY-MM-DDTHH:mm
    const [fecha, hora] = datetimeLocal.split('T');
    const [year, month, day] = fecha.split('-');

    return `${day}/${month}/${year} ${hora}`;
  };

  const handleSubmit = async () => {
    if (!isReady) {
      return;
    }

    if (!validateForm()) {
      toast.error('Por favor, completa todos los campos obligatorios');
      return;
    }

    const toastId = toast.loading('Creando grupo...');

    try {
      // Formatear las fechas al formato esperado
      const fechaInicioFormateada = formData.fechaInicio
        ? formatearFechaHora(formData.fechaInicio)
        : '';
      const fechaFinFormateada = formData.fechaFin
        ? formatearFechaHora(formData.fechaFin)
        : '';

      // Determinar fecha principal y horaprog según el tipo
      let fechaPrincipal, horaprog;

      if (formData.tipo === 'I') {
        // Tipo Ingreso: fecha = fechaFin (obligatoria), horaprog = fechaInicio (opcional)
        fechaPrincipal = fechaFinFormateada;
        horaprog = fechaInicioFormateada;
      } else {
        // Tipo Salida: fecha = fechaInicio (obligatoria), horaprog = fechaFin (opcional)
        fechaPrincipal = fechaInicioFormateada;
        horaprog = fechaFinFormateada;
      }

      // Calcular el número del nuevo grupo
      // Si hay 3 grupos (índices 0, 1, 2), el nuevo grupo será el número 3
      const numeroNuevoGrupo = totalGruposActuales.toString();

      // Agregar cada pasajero usando la API
      for (let i = 0; i < pasajerosSeleccionados.length; i++) {
        const pasajero = pasajerosSeleccionados[i];

        const payload = {
          arealan: empresaActual,
          destinocodlugar: pasajero.codlugar.toString(),
          distancia: 0,
          empresa: empresaActual,
          fecha: fechaPrincipal,
          horaprog: horaprog, // Si no hay horaprog, usar fecha principal
          numero: numeroNuevoGrupo, // Usar el número calculado correctamente
          orden: i.toString(), // Orden dentro del grupo (0, 1, 2, etc.)
          pasajero: {
            codlan: pasajero.codlan,
            nombre: pasajero.apepate,
          },
          rol: 'Ninguno',
          tipo: formData.tipo,
        };

        const response = await fetch(
          `${API_BASE_URL125}/api/Preplan/AgregarPasajero?usuario=${username}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          },
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Error al agregar pasajero ${pasajero.apepate}: ${errorText}`,
          );
        }

        await response.json();
      }

      toast.success(
        `Grupo ${parseInt(numeroNuevoGrupo) + 1} creado correctamente con ${pasajerosSeleccionados.length} pasajero(s)`,
        { id: toastId },
      );

      // Resetear formulario
      setFormData({
        tipo: 'I',
        fechaInicio: '',
        fechaFin: '',
      });
      setPasajerosSeleccionados([]);
      setErrors({});
      onClose();

      // Refrescar los datos después de un breve delay para que la API procese
      setTimeout(() => {
        onRefrescarDatos();
      }, 1000);
    } catch (error) {
      toast.error(`Error al crear el grupo`, { id: toastId });
    }
  };

  const tiposGrupo = [
    { key: 'I', label: 'Ingreso (I)' },
    { key: 'S', label: 'Salida (S)' },
  ];

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Crear Nuevo Grupo"
      subtitle="Selecciona pasajeros para crear un nuevo grupo de servicio"
      icon={<MdLibraryAdd className="h-4 w-4 text-[#113eb9]" />}
      iconBgColor="bg-blue-100"
      size="3xl"
      confirmText={`Crear Grupo (${pasajerosSeleccionados.length} pasajeros)`}
      onConfirm={handleSubmit}
      onCancel={onClose}
      isConfirmDisabled={pasajerosSeleccionados.length === 0}
      confirmButtonClass="bg-[#113eb9] hover:bg-blue-700 text-white"
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Configuración del Grupo */}
        <div className="space-y-4">
          <h3 className="border-b pb-2 text-[14px] font-medium text-gray-800">
            Configuración del Grupo
          </h3>

          <Select
            label="Tipo de grupo"
            placeholder="Selecciona el tipo"
            selectedKeys={[formData.tipo]}
            onChange={(e) => handleInputChange('tipo', e.target.value)}
          >
            {tiposGrupo.map((tipo) => (
              <SelectItem key={tipo.key} value={tipo.key}>
                {tipo.label}
              </SelectItem>
            ))}
          </Select>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-600">
              Fecha Inicio {formData.tipo === 'S' ? '*' : '(opcional)'}
            </label>
            <input
              type="datetime-local"
              value={formData.fechaInicio}
              onChange={(e) => handleInputChange('fechaInicio', e.target.value)}
              className={`w-full rounded-xl border-2 bg-gray-50 px-3 py-3 text-sm transition-all duration-200 hover:bg-gray-100 focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.fechaInicio
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-300'
              }`}
            />
            {errors.fechaInicio && (
              <p className="mt-1 text-xs text-red-500">{errors.fechaInicio}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-600">
              Fecha Fin {formData.tipo === 'I' ? '*' : '(opcional)'}
            </label>
            <input
              type="datetime-local"
              value={formData.fechaFin}
              onChange={(e) => handleInputChange('fechaFin', e.target.value)}
              className={`w-full rounded-xl border-2 bg-gray-50 px-3 py-3 text-sm transition-all duration-200 hover:bg-gray-100 focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.fechaFin ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
            />
            {errors.fechaFin && (
              <p className="mt-1 text-xs text-red-500">{errors.fechaFin}</p>
            )}
          </div>
        </div>

        {/* Selección de Pasajeros */}
        <div className="space-y-4">
          <h3 className="border-b pb-2 text-[14px] font-medium text-gray-800">
            Seleccionar Pasajeros
          </h3>

          {username === 'movilbus' ? (
            <InputPasajeroEmpresa
              onSelectPasajero={handleAgregarPasajero}
              clearAfterSelect={true}
              empresa={empresaActual}
            />
          ) : (
            <InputPasajero
              onSelectPasajero={handleAgregarPasajero}
              clearAfterSelect={true}
            />
          )}

          {errors.pasajeros && (
            <p className="text-xs text-red-500">{errors.pasajeros}</p>
          )}

          {/* Lista de pasajeros seleccionados */}
          {pasajerosSeleccionados.length > 0 ? (
            <div className="mt-4">
              <h4 className="mb-2 text-sm font-medium text-gray-700">
                Pasajeros seleccionados ({pasajerosSeleccionados.length}):
              </h4>
              <div className="max-h-40 space-y-2 overflow-y-auto">
                {pasajerosSeleccionados.map((pasajero, index) => (
                  <div
                    key={pasajero.codlan}
                    className="flex items-center justify-between rounded-lg border bg-gray-50 p-3"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">
                        {index + 1}. {pasajero.apepate}
                      </p>
                      <p className="text-xs text-gray-600">
                        Código: {pasajero.codlan} | Lugar: {pasajero.codlugar}
                      </p>
                    </div>
                    <button
                      onClick={() => handleEliminarPasajero(pasajero.codlan)}
                      className="ml-2 rounded p-1 text-red-600 hover:bg-red-100"
                      title="Eliminar pasajero"
                    >
                      <MdDelete size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
              <p className="text-center text-sm text-gray-600">
                Aún no has agregado pasajeros al grupo. Por favor selecciona
                algunos pasajeros.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Información adicional */}
      <div className="rounded-lg bg-blue-50 p-4">
        <h4 className="mb-2 font-medium text-blue-800">Información:</h4>
        <ul className="space-y-1 text-sm text-blue-700">
          <li>
            • Se creará el un<strong> Nuevo Grupo</strong>
          </li>

          <li>
            • La empresa será: <strong>{empresaActual}</strong>
          </li>
          {formData.tipo === 'I' ? (
            <li>
              • <strong>Tipo Ingreso:</strong> Solo fecha de fin es obligatoria
            </li>
          ) : (
            <li>
              • <strong>Tipo Salida:</strong> Solo fecha de inicio es
              obligatoria
            </li>
          )}
        </ul>
      </div>
    </BaseModal>
  );
};

export default ModalNuevoGrupo;
