import React, { useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input, Select, SelectItem } from '@nextui-org/react';
import { toast } from 'sonner';

interface ModalNuevoGrupoProps {
  isOpen: boolean;
  onClose: () => void;
  onAgregarGrupo: (nuevoGrupo: any) => void;
  empresaActual: string;
  fechaActual?: string;
}

const ModalNuevoGrupo: React.FC<ModalNuevoGrupoProps> = ({
  isOpen,
  onClose,
  onAgregarGrupo,
  empresaActual,
  fechaActual
}) => {
  const [formData, setFormData] = useState({
    nombre: '',
    distrito: '',
    direccion: '',
    area: '',
    tipo: 'I', // Por defecto tipo "I" (Ingreso)
    destinoGrupo: '',
    fechaInicio: '', // Fecha y hora de inicio
    fechaFin: '' // Fecha y hora de fin
  });

  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Limpiar error cuando el usuario empiece a escribir
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es obligatorio';
    }
    if (!formData.distrito.trim()) {
      newErrors.distrito = 'El distrito es obligatorio';
    }
    if (!formData.direccion.trim()) {
      newErrors.direccion = 'La dirección es obligatoria';
    }
    if (!formData.area.trim()) {
      newErrors.area = 'El área es obligatoria';
    }
    if (!formData.destinoGrupo.trim()) {
      newErrors.destinoGrupo = 'El destino es obligatorio';
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
        newErrors.fechaInicio = 'La fecha de inicio es obligatoria';
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

  const handleSubmit = () => {
    if (!validateForm()) {
      toast.error('Por favor, completa todos los campos obligatorios');
      return;
    }

    // Formatear las fechas al formato esperado
    const fechaInicioFormateada = formData.fechaInicio ? formatearFechaHora(formData.fechaInicio) : '';
    const fechaFinFormateada = formData.fechaFin ? formatearFechaHora(formData.fechaFin) : '';

    console.log('Fechas formateadas:', {
      tipo: formData.tipo,
      fechaInicio: fechaInicioFormateada,
      fechaFin: fechaFinFormateada
    });

    // Crear el nuevo grupo con la estructura esperada
    // Lógica corregida basada en Container.tsx:
    // Tipo I (Ingreso): fechaInicio = horaprog, fechaFin = fecha
    // Tipo S (Salida): fechaInicio = fecha, fechaFin = horaprog
    let fechaPrincipal, horaprog;
    
    if (formData.tipo === 'I') {
      // Tipo Ingreso: fecha = fechaFin (obligatoria), horaprog = fechaInicio (opcional)
      fechaPrincipal = fechaFinFormateada;
      horaprog = fechaInicioFormateada; // Puede estar vacío
    } else {
      // Tipo Salida: fecha = fechaInicio (obligatoria), horaprog = fechaFin (opcional)
      fechaPrincipal = fechaInicioFormateada;
      horaprog = fechaFinFormateada; // Puede estar vacío
    }

    const nuevoGrupo = {
      id: Date.now(), // ID temporal único
      empresa: empresaActual,
      fecha: fechaPrincipal,
      tipo: formData.tipo,
      horaprog: horaprog,
      destinoGrupo: formData.destinoGrupo,
      destino: {
        coddestino: '', // Se puede completar después
        nomdestino: formData.destinoGrupo
      },
      conductor: '', // Inicializar vacío
      unidad: '', // Inicializar vacío
      personas: [
        {
          idCliente: Date.now(), // ID temporal único para la persona
          codigo: Date.now().toString(),
          codCliente: Date.now().toString(),
          nombre: formData.nombre,
          distrito: formData.distrito,
          direccion: formData.direccion,
          area: formData.area,
          eliminado: '0',
          wx: null,
          wy: null
        }
      ]
    };

    console.log('Nuevo grupo a crear:', nuevoGrupo);

    onAgregarGrupo(nuevoGrupo);
    toast.success('Nuevo grupo agregado correctamente');
    
    // Resetear formulario
    setFormData({
      nombre: '',
      distrito: '',
      direccion: '',
      area: '',
      tipo: 'I',
      destinoGrupo: '',
      fechaInicio: '',
      fechaFin: ''
    });
    setErrors({});
    onClose();
  };

  const tiposGrupo = [
    { key: 'I', label: 'Ingreso (I)' },
    { key: 'S', label: 'Salida (S)' }
  ];

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      size="2xl"
      scrollBehavior="inside"
      classNames={{
        base: "bg-white",
        header: "border-b border-gray-200",
        footer: "border-t border-gray-200"
      }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold text-gray-800">
            Agregar Nuevo Grupo
          </h2>
          <p className="text-sm text-gray-600">
            Completa los datos del pasajero para crear un nuevo grupo
          </p>
        </ModalHeader>
        
        <ModalBody className="gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Datos del Pasajero */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-800 border-b pb-2">
                Datos del Pasajero
              </h3>
              
              <Input
                label="Nombre completo"
                placeholder="Ingresa el nombre del pasajero"
                value={formData.nombre}
                onChange={(e) => handleInputChange('nombre', e.target.value)}
                isInvalid={!!errors.nombre}
                errorMessage={errors.nombre}
                isRequired
              />

              <Input
                label="Distrito"
                placeholder="Ingresa el distrito"
                value={formData.distrito}
                onChange={(e) => handleInputChange('distrito', e.target.value)}
                isInvalid={!!errors.distrito}
                errorMessage={errors.distrito}
                isRequired
              />

              <Input
                label="Dirección"
                placeholder="Ingresa la dirección completa"
                value={formData.direccion}
                onChange={(e) => handleInputChange('direccion', e.target.value)}
                isInvalid={!!errors.direccion}
                errorMessage={errors.direccion}
                isRequired
              />

              <Input
                label="Área"
                placeholder="Ingresa el área"
                value={formData.area}
                onChange={(e) => handleInputChange('area', e.target.value)}
                isInvalid={!!errors.area}
                errorMessage={errors.area}
                isRequired
              />
            </div>

            {/* Datos del Grupo */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-800 border-b pb-2">
                Datos del Grupo
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

              <Input
                label="Destino del grupo"
                placeholder="Ingresa el destino"
                value={formData.destinoGrupo}
                onChange={(e) => handleInputChange('destinoGrupo', e.target.value)}
                isInvalid={!!errors.destinoGrupo}
                errorMessage={errors.destinoGrupo}
                isRequired
              />

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600">
                  Fecha Inicio {formData.tipo === 'S' ? '*' : '(opcional)'}
                </label>
                <input
                  type="datetime-local"
                  value={formData.fechaInicio}
                  onChange={(e) => handleInputChange('fechaInicio', e.target.value)}
                  className={`w-full px-3 py-3 text-sm border-2 rounded-xl bg-gray-50 hover:bg-gray-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                    errors.fechaInicio ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  style={{ lineHeight: '1.5' }}
                />
                {errors.fechaInicio && (
                  <p className="text-red-500 text-xs mt-1">{errors.fechaInicio}</p>
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
                  className={`w-full px-3 py-3 text-sm border-2 rounded-xl bg-gray-50 hover:bg-gray-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                    errors.fechaFin ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  style={{ lineHeight: '1.5' }}
                />
                {errors.fechaFin && (
                  <p className="text-red-500 text-xs mt-1">{errors.fechaFin}</p>
                )}
              </div>
            </div>
          </div>

          {/* Información adicional */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">Información:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Se creará un nuevo grupo con el pasajero especificado</li>
              <li>• Puedes agregar más pasajeros al grupo después de crearlo</li>
              <li>• La empresa será: <strong>{empresaActual}</strong></li>
              {formData.tipo === 'I' ? (
                <li>• <strong>Tipo Ingreso:</strong> Solo fecha de fin es obligatoria</li>
              ) : (
                <li>• <strong>Tipo Salida:</strong> Solo fecha de inicio es obligatoria</li>
              )}
            </ul>
          </div>
        </ModalBody>
        
        <ModalFooter>
          <Button 
            variant="ghost" 
            onPress={onClose}
            className="text-gray-600"
          >
            Cancelar
          </Button>
          <Button 
            color="primary" 
            onPress={handleSubmit}
            className="bg-blue-600 text-white"
          >
            Crear Grupo
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ModalNuevoGrupo;