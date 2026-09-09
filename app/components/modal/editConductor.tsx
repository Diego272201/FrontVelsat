import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/app/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  User,
  CreditCard,
  Users,
  Lock,
  Key,
  Phone,
  Mail,
  Edit,
  Eye,
  EyeOff,
  Truck,
  Route,
} from 'lucide-react';
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
    'w-full rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-[12px] transition-colors focus:border-[#113EB9] focus:outline-none focus:ring-1 focus:ring-[#113EB9] disabled:opacity-50';
  const labelClass = 'flex items-center gap-1.5 text-[12px] font-medium text-gray-700';

  return (
    <div>
      <button
        onClick={handleOpenModal}
        className="inline-flex h-7 items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 text-[11px] font-medium text-[#113EB9] transition-colors hover:bg-blue-50"
      >
        <Edit size={12} />
        Modificar
      </button>

      <BaseModal
        isOpen={isOpen}
        onClose={handleCerrar}
        title="Modificar Conductor"
        subtitle="Edite la información del conductor"
        icon={<Edit className="h-4 w-4 text-[#113EB9]" />}
        iconBgColor="bg-[#e8eeff]"
        size="2xl"
        confirmText="Guardar Cambios"
        loadingText="Modificando..."
        onConfirm={handleGuardar}
        onCancel={handleCerrar}
        isLoading={loading}
        confirmButtonClass="bg-[#008000] hover:bg-[#006600] text-white"
      >
        <div className="space-y-2 py-1">
          <div className="space-y-1">
            <Label htmlFor="apellidos" className={labelClass}>
              <User className="h-3.5 w-3.5 text-[#fb7b0f]" />
              Nombre Completo <span className="text-red-500">*</span>
            </Label>
            <Input
              id="apellidos"
              type="text"
              value={formData.apellidos}
              onChange={(e) => handleInputChange('apellidos', e.target.value)}
              disabled={loading}
              className={inputClass}
              placeholder="Ingrese nombre completo"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="dni" className={labelClass}>
                <CreditCard className="h-3.5 w-3.5 text-[#fb7b0f]" />
                DNI
              </Label>
              <Input
                id="dni"
                type="text"
                value={formData.dni}
                onChange={(e) => handleInputChange('dni', e.target.value)}
                disabled={loading}
                className={inputClass}
                placeholder="Ingrese dni"
                maxLength={8}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="sexo" className={labelClass}>
                <Users className="h-3.5 w-3.5 text-[#fb7b0f]" />
                Género <span className="text-red-500">*</span>
              </Label>
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
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="login" className={labelClass}>
                <Key className="h-3.5 w-3.5 text-[#fb7b0f]" />
                Usuario <span className="text-red-500">*</span>
              </Label>
              <Input
                id="login"
                type="text"
                value={formData.login}
                onChange={(e) => handleInputChange('login', e.target.value)}
                disabled={loading}
                className={inputClass}
                placeholder="Ingrese usuario"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="clave" className={labelClass}>
                <Lock className="h-3.5 w-3.5 text-[#fb7b0f]" />
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
                  placeholder="Ingrese contraseña"
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="telefono" className={labelClass}>
                <Phone className="h-3.5 w-3.5 text-[#fb7b0f]" />
                Teléfono
              </Label>
              <Input
                id="telefono"
                type="tel"
                value={formData.telefono}
                onChange={(e) => handleInputChange('telefono', e.target.value)}
                disabled={loading}
                className={inputClass}
                placeholder="Ingrese teléfono"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="email" className={labelClass}>
                <Mail className="h-3.5 w-3.5 text-[#fb7b0f]" />
                Correo Electrónico
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                disabled={loading}
                className={inputClass}
                placeholder="Ingrese correo"
              />
            </div>
          </div>

          {username === 'movilbus' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="unidadasig" className={labelClass}>
                  <Truck className="h-3.5 w-3.5 text-[#fb7b0f]" />
                  Unidad Asignada
                </Label>
                <Input
                  id="unidadasig"
                  type="text"
                  value={formData.unidadasig}
                  onChange={(e) => handleInputChange('unidadasig', e.target.value)}
                  disabled={loading}
                  className={inputClass}
                  placeholder="Ingrese unidad"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="tipo" className={labelClass}>
                  <Route className="h-3.5 w-3.5 text-[#fb7b0f]" />
                  Tipo
                </Label>
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
              </div>
            </div>
          )}
        </div>
      </BaseModal>
    </div>
  );
}
