import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Edit, Eye, EyeOff, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { useUsername } from '@/hooks/useUsername';
import BaseModal from '@/app/components/ui/BaseModal';

type FormField =
  | 'apellidos'
  | 'dni'
  | 'sexo'
  | 'login'
  | 'clave'
  | 'telefono'
  | 'email'
  | 'unidadasig'
  | 'tipo';

interface ConductorAPI {
  codigo: number;
  nombres: string;
  apellidos: string;
  login: string;
  clave: string;
  telefono: string;
  dni: string;
  turno: string;
  horainicio: string;
  email: string;
  brevete: string | null;
  sctr: string | null;
  direccion: string | null;
  imagen: string | null;
  catBrevete: string;
  fecValidBrevete: string | null;
  estBrevete: string | null;
  sexo: string;
  unidadActual: string | null;
  habilitado: string;
  unidadasig: string | null;
  tipo: string | null;
}

interface ConductorDialogProps {
  conductorData: ConductorAPI | null;
  onConductorModified?: (conductor: ConductorAPI) => void;
}

const SectionLabel = ({ index, title }: { index: string; title: string }) => (
  <div className="flex items-center gap-2">
    <span className="whitespace-nowrap text-[10.5px] font-bold uppercase tracking-wider text-gray-500">
      {index} · {title}
    </span>
    <div className="h-px flex-1 bg-gray-200" />
  </div>
);

export default function ConductorDialogModificar({
  conductorData,
  onConductorModified,
}: ConductorDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { username } = useUsername();

  const [formData, setFormData] = useState<Record<FormField, string>>({
    apellidos: '',
    dni: '',
    sexo: '',
    login: '',
    clave: '',
    telefono: '',
    email: '',
    unidadasig: '',
    tipo: '',
  });

  const handleInputChange = (field: FormField, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      apellidos: '',
      dni: '',
      sexo: '',
      login: '',
      clave: '',
      telefono: '',
      email: '',
      unidadasig: '',
      tipo: '',
    });
    setShowPassword(false);
  };

  const getFieldLabel = (field: FormField): string => {
    const labels: Record<FormField, string> = {
      apellidos: 'Nombre Completo',
      dni: 'DNI',
      sexo: 'Género',
      login: 'Usuario',
      clave: 'Contraseña',
      telefono: 'Teléfono',
      email: 'Email',
      unidadasig: 'Unidad Asignada',
      tipo: 'Tipo',
    };
    return labels[field];
  };

  const validateForm = () => {
    const requiredFields: FormField[] = ['apellidos', 'login', 'clave'];
    for (const field of requiredFields) {
      if (!formData[field] || !formData[field].trim()) {
        toast.error(`El campo ${getFieldLabel(field)} es obligatorio`);
        return false;
      }
    }
    return true;
  };

  const handleGuardar = async () => {
    if (!conductorData) {
      toast.error('No hay datos del conductor para modificar');
      return;
    }

    if (!validateForm()) return;

    setLoading(true);
    const loadingToast = toast.loading('Modificando conductor...');

    try {
      const sexoAPI =
        formData.sexo === 'masculino' ? 'M' : formData.sexo === 'femenino' ? 'F' : 'M';

      const payload: any = {
        codigo: conductorData.codigo,
        nombres: conductorData.nombres || '',
        apellidos: formData.apellidos.trim(),
        login: formData.login.trim(),
        clave: formData.clave.trim(),
        telefono: formData.telefono.trim(),
        dni: formData.dni.trim(),
        email: formData.email.trim(),
        unidadasig: formData.unidadasig.trim(),
        tipo: formData.tipo.trim(),
        brevete: conductorData.brevete || '',
        direccion: conductorData.direccion || '',
        sctr: conductorData.sctr || '',
        catBrevete: conductorData.catBrevete || '',
        estBrevete: conductorData.estBrevete || '',
        fecValidBrevete: conductorData.fecValidBrevete || '',
        sexo: sexoAPI,
      };

      const response = await fetch(
        `https://do.velsat.pe:2083/api/Preplan/ModificarConductor/${conductorData.codigo}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Error ${response.status}: ${errorData}`);
      }

      await response.json();
      toast.dismiss(loadingToast);
      toast.success('Conductor modificado exitosamente');

      const updatedConductor: ConductorAPI = {
        ...conductorData,
        apellidos: formData.apellidos.trim(),
        login: formData.login.trim(),
        clave: formData.clave.trim(),
        telefono: formData.telefono.trim(),
        dni: formData.dni.trim(),
        email: formData.email.trim(),
        unidadasig: formData.unidadasig.trim(),
        tipo: formData.tipo.trim(),
        sexo: sexoAPI,
      };

      setIsOpen(false);
      onConductorModified?.(updatedConductor);
    } catch (error: unknown) {
      toast.dismiss(loadingToast);
      const errorMessage = error instanceof Error ? error.message : 'Error al modificar el conductor';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCerrar = () => {
    if (!loading) {
      setIsOpen(false);
      resetForm();
    }
  };

  const handleOpenModal = () => {
    if (!conductorData) {
      toast.error('No se encontraron datos del conductor');
      return;
    }

    setFormData({
      apellidos: conductorData.apellidos || '',
      dni: conductorData.dni || '',
      sexo: conductorData.sexo === 'M' ? 'masculino' : conductorData.sexo === 'F' ? 'femenino' : '',
      login: conductorData.login || '',
      clave: conductorData.clave || '',
      telefono: conductorData.telefono || '',
      email: conductorData.email || '',
      unidadasig: conductorData.unidadasig || '',
      tipo: conductorData.tipo || '',
    });

    setIsOpen(true);
  };

  const inputClass =
    'w-full rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-[12px] transition-colors focus:border-[#113EB9] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#113EB9] disabled:opacity-50';
  const selectClass =
    'w-full rounded-md border border-gray-200 bg-gray-50 pl-2.5 pr-7 py-1 text-[12px] text-gray-800 transition-colors focus:border-[#113EB9] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#113EB9] disabled:opacity-50 appearance-none cursor-pointer';
  const labelClass = 'text-[12px] font-semibold text-gray-800';

  return (
    <div>
      <button
        onClick={handleOpenModal}
        title="Modificar"
        className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white text-[#113EB9] transition-colors hover:bg-blue-50"
      >
        <Edit size={13} />
      </button>

      <BaseModal
        isOpen={isOpen}
        onClose={handleCerrar}
        title="Modificar conductor"
        subtitle="Edite la información del registro. Los campos con asterisco son obligatorios."
        variant="brand"
        size="2xl"
        isDismissable={false}
        confirmText="Guardar cambios"
        loadingText="Modificando..."
        onConfirm={handleGuardar}
        onCancel={handleCerrar}
        isLoading={loading}
        confirmButtonClass="bg-[#113EB9] hover:bg-[#0d2f8c] text-white"
        cancelButtonClass="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
      >
        <div className="space-y-2">
          <SectionLabel index="01" title="Datos personales" />

          <div className="space-y-1">
            <Label htmlFor="apellidos" className={labelClass}>
              Nombre completo <span className="text-red-500">*</span>
            </Label>
            <Input
              id="apellidos"
              type="text"
              value={formData.apellidos}
              onChange={(e) => handleInputChange('apellidos', e.target.value)}
              disabled={loading}
              className={inputClass}
              placeholder="Apellidos y nombres"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="dni" className={labelClass}>
                DNI
              </Label>
              <Input
                id="dni"
                type="text"
                value={formData.dni}
                onChange={(e) => handleInputChange('dni', e.target.value)}
                disabled={loading}
                className={inputClass}
                placeholder="8 dígitos"
                maxLength={8}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="sexo" className={labelClass}>
                Género <span className="text-red-500">*</span>
              </Label>
<<<<<<< HEAD
              <div className="relative">
                <select
                  id="sexo"
                  value={formData.sexo}
                  onChange={(e) => handleInputChange('sexo', e.target.value)}
                  disabled={loading}
                  className={selectClass}
                >
                  <option value="">Seleccione</option>
                  <option value="masculino">Masculino</option>
                  <option value="femenino">Femenino</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              </div>
=======
              <Select
                value={formData.sexo}
                onValueChange={(value) => handleInputChange('sexo', value)}
                disabled={loading}
              >
                <SelectTrigger className={inputClass}>
                  <SelectValue placeholder="Seleccione" />
                </SelectTrigger>
                <SelectContent portal={false} className="border-gray-200 bg-white shadow-lg">
                  <SelectItem value="masculino" className="text-[12px] hover:bg-blue-50 focus:bg-blue-50">
                    Masculino
                  </SelectItem>
                  <SelectItem value="femenino" className="text-[12px] hover:bg-blue-50 focus:bg-blue-50">
                    Femenino
                  </SelectItem>
                </SelectContent>
              </Select>
>>>>>>> 747484d4780da778f2fe0b33ac367fa7c51487fb
            </div>
          </div>

          <SectionLabel index="02" title="Credenciales de acceso" />

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="login" className={labelClass}>
                Usuario <span className="text-red-500">*</span>
              </Label>
              <Input
                id="login"
                type="text"
                value={formData.login}
                onChange={(e) => handleInputChange('login', e.target.value)}
                disabled={loading}
                className={inputClass}
                placeholder="usuario.conductor"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="clave" className={labelClass}>
                Contraseña <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="clave"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.clave}
                  onChange={(e) => handleInputChange('clave', e.target.value)}
                  disabled={loading}
                  className={inputClass}
                  placeholder="Mínimo 4 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-[#113EB9]"
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <SectionLabel index="03" title="Contacto y asignación" />

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="telefono" className={labelClass}>
                Teléfono
              </Label>
              <Input
                id="telefono"
                type="tel"
                value={formData.telefono}
                onChange={(e) => handleInputChange('telefono', e.target.value)}
                disabled={loading}
                className={inputClass}
                placeholder="9 dígitos"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="email" className={labelClass}>
                Correo electrónico
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                disabled={loading}
                className={inputClass}
                placeholder="nombre@empresa.pe"
              />
            </div>
          </div>

          {username === 'movilbus' && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="unidadasig" className={labelClass}>
                  Unidad asignada
                </Label>
                <Input
                  id="unidadasig"
                  type="text"
                  value={formData.unidadasig}
                  onChange={(e) => handleInputChange('unidadasig', e.target.value)}
                  disabled={loading}
                  className={inputClass}
                  placeholder="Placa de la unidad"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="tipo" className={labelClass}>
                  Tipo
                </Label>
<<<<<<< HEAD
                <div className="relative">
                  <select
                    id="tipo"
                    value={formData.tipo}
                    onChange={(e) => handleInputChange('tipo', e.target.value)}
                    disabled={loading}
                    className={selectClass}
                  >
                    <option value="">Seleccione</option>
                    <option value="Tdp Menores">Tdp Menores</option>
                    <option value="Turismo">Turismo</option>
                    <option value="Tdp Mayores">Tdp Mayores</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                </div>
=======
                <Select
                  value={formData.tipo}
                  onValueChange={(value) => handleInputChange('tipo', value)}
                  disabled={loading}
                >
                  <SelectTrigger className={inputClass}>
                    <SelectValue placeholder="Seleccione" />
                  </SelectTrigger>
                  <SelectContent portal={false} className="border-gray-200 bg-white shadow-lg">
                    <SelectItem value="Tdp Menores" className="text-[12px] hover:bg-blue-50 focus:bg-blue-50">
                      Tdp Menores
                    </SelectItem>
                    <SelectItem value="Turismo" className="text-[12px] hover:bg-blue-50 focus:bg-blue-50">
                      Turismo
                    </SelectItem>
                    <SelectItem value="Tdp Mayores" className="text-[12px] hover:bg-blue-50 focus:bg-blue-50">
                      Tdp Mayores
                    </SelectItem>
                  </SelectContent>
                </Select>
>>>>>>> 747484d4780da778f2fe0b33ac367fa7c51487fb
              </div>
            </div>
          )}
        </div>
      </BaseModal>
    </div>
  );
}
