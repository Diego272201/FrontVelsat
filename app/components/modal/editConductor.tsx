import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/app/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
  Save,
  X,
  Loader2,
  Edit,
  Eye,
  EyeOff,
  Truck,
  Route,
} from 'lucide-react';
import { toast } from 'sonner';
import { useUsername } from '@/hooks/useUsername';

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

type FieldConfig = {
  id: FormField;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  type: string;
};

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
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
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

  const validateForm = () => {
    console.log('🔍 Iniciando validación...');
    console.log('formData actual:', formData);

    const requiredFields: FormField[] = ['apellidos', 'login', 'clave'];

    for (const field of requiredFields) {
      console.log(`Validando campo ${field}:`, formData[field]);

      if (!formData[field] || !formData[field].trim()) {
        const errorMsg = `El campo ${getFieldLabel(field)} es obligatorio`;
        toast.error(errorMsg);
        return false;
      }
    }

    console.log('✅ Validación exitosa');
    return true;
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

  const handleGuardar = async () => {
    if (!conductorData) {
      toast.error('No hay datos del conductor para modificar');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('Modificando conductor...');

    try {
      const sexoAPI =
        formData.sexo === 'masculino'
          ? 'M'
          : formData.sexo === 'femenino'
            ? 'F'
            : 'M';

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
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Error ${response.status}: ${errorData}`);
      }

      const result = await response.json();
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

      if (onConductorModified) {
        onConductorModified(updatedConductor);
      }
    } catch (error: unknown) {
      toast.dismiss(loadingToast);

      let errorMessage = 'Error al modificar el conductor';

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

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

    const turnoFormato =
      conductorData.turno === 'D'
        ? 'dia'
        : conductorData.turno === 'N'
          ? 'noche'
          : '';

    setFormData({
      apellidos: conductorData.apellidos || '',
      dni: conductorData.dni || '',
      sexo:
        conductorData.sexo === 'M'
          ? 'masculino'
          : conductorData.sexo === 'F'
            ? 'femenino'
            : '',
      login: conductorData.login || '',
      clave: conductorData.clave || '',
      telefono: conductorData.telefono || '',
      email: conductorData.email || '',
      unidadasig: conductorData.unidadasig || '',
      tipo: conductorData.tipo || '',
    });

    setIsOpen(true);
  };

  return (
    <div>
      <button
        onClick={handleOpenModal}
        className="inline-flex h-8 items-center justify-center rounded-lg bg-green-700 px-3 text-xs font-medium text-white transition-colors hover:bg-green-600"
      >
        <Edit size={12} className="mr-1" />
        Modificar
      </button>

      <Dialog open={isOpen} onOpenChange={!loading ? setIsOpen : undefined}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-0 bg-white/95 shadow-2xl backdrop-blur-lg sm:max-w-[650px]">
          <DialogHeader className="pb-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500 shadow-lg">
                <Edit className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-green-600">
                  Modificar Conductor
                </DialogTitle>
                <p className="mt-1 text-sm text-gray-500">
                  Edite la información del conductor
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Nombre Completo - Línea completa */}
            <div className="space-y-2">
              <Label
                htmlFor="apellidos"
                className="flex items-center gap-2 text-sm font-medium text-gray-700"
              >
                <User className="h-4 w-4 text-green-500" />
                Nombre Completo
                <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="apellidos"
                  type="text"
                  value={formData.apellidos}
                  onChange={(e) =>
                    handleInputChange('apellidos', e.target.value)
                  }
                  disabled={loading}
                  className="w-full rounded-lg border border-gray-200 bg-white/50 px-4 py-3 backdrop-blur-sm transition-all duration-200 hover:bg-white/70 focus:border-transparent focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                  placeholder="Ingrese nombre completo"
                />
                <div className="absolute inset-y-0 right-3 flex items-center">
                  <div className="pointer-events-none h-2 w-2 rounded-full bg-green-400 opacity-50"></div>
                </div>
              </div>
            </div>

            {/* DNI y Género - Dos columnas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="dni"
                  className="flex items-center gap-2 text-sm font-medium text-gray-700"
                >
                  <CreditCard className="h-4 w-4 text-green-500" />
                  DNI
                </Label>
                <div className="relative">
                  <Input
                    id="dni"
                    type="text"
                    value={formData.dni}
                    onChange={(e) => handleInputChange('dni', e.target.value)}
                    disabled={loading}
                    className="w-full rounded-lg border border-gray-200 bg-white/50 px-4 py-3 backdrop-blur-sm transition-all duration-200 hover:bg-white/70 focus:border-transparent focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                    placeholder="Ingrese dni"
                    maxLength={8}
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center">
                    <div className="pointer-events-none h-2 w-2 rounded-full bg-green-400 opacity-50"></div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="sexo"
                  className="flex items-center gap-2 text-sm font-medium text-gray-700"
                >
                  <Users className="h-4 w-4 text-green-500" />
                  Género
                  <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.sexo}
                  onValueChange={(value) => handleInputChange('sexo', value)}
                  disabled={loading}
                >
                  <SelectTrigger className="w-full rounded-lg border border-gray-200 bg-white/50 px-4 py-3 backdrop-blur-sm transition-all duration-200 hover:bg-white/70 focus:border-transparent focus:ring-2 focus:ring-green-500 disabled:opacity-50">
                    <SelectValue placeholder="Seleccione el género" />
                  </SelectTrigger>
                  <SelectContent className="border-gray-200 bg-white/95 shadow-xl backdrop-blur-lg">
                    <SelectItem
                      value="masculino"
                      className="hover:bg-green-50 focus:bg-green-50"
                    >
                      Masculino
                    </SelectItem>
                    <SelectItem
                      value="femenino"
                      className="hover:bg-green-50 focus:bg-green-50"
                    >
                      Femenino
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Login y Contraseña - Dos columnas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="login"
                  className="flex items-center gap-2 text-sm font-medium text-gray-700"
                >
                  <Key className="h-4 w-4 text-green-500" />
                  Usuario
                  <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="login"
                    type="text"
                    value={formData.login}
                    onChange={(e) => handleInputChange('login', e.target.value)}
                    disabled={loading}
                    className="w-full rounded-lg border border-gray-200 bg-white/50 px-4 py-3 backdrop-blur-sm transition-all duration-200 hover:bg-white/70 focus:border-transparent focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                    placeholder="Ingrese usuario"
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center">
                    <div className="pointer-events-none h-2 w-2 rounded-full bg-green-400 opacity-50"></div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="clave"
                  className="flex items-center gap-2 text-sm font-medium text-gray-700"
                >
                  <Lock className="h-4 w-4 text-green-500" />
                  Contraseña
                  <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="clave"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.clave}
                    onChange={(e) => handleInputChange('clave', e.target.value)}
                    disabled={loading}
                    className="w-full rounded-lg border border-gray-200 bg-white/50 px-4 py-3 backdrop-blur-sm transition-all duration-200 hover:bg-white/70 focus:border-transparent focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                    placeholder="Ingrese contraseña"
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading}
                      className="text-gray-500 transition-colors hover:text-green-500 disabled:opacity-50"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Teléfono y Correo Electrónico - Dos columnas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="telefono"
                  className="flex items-center gap-2 text-sm font-medium text-gray-700"
                >
                  <Phone className="h-4 w-4 text-green-500" />
                  Teléfono
                </Label>
                <div className="relative">
                  <Input
                    id="telefono"
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) =>
                      handleInputChange('telefono', e.target.value)
                    }
                    disabled={loading}
                    className="w-full rounded-lg border border-gray-200 bg-white/50 px-4 py-3 backdrop-blur-sm transition-all duration-200 hover:bg-white/70 focus:border-transparent focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                    placeholder="Ingrese teléfono"
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center">
                    <div className="pointer-events-none h-2 w-2 rounded-full bg-green-400 opacity-50"></div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="flex items-center gap-2 text-sm font-medium text-gray-700"
                >
                  <Mail className="h-4 w-4 text-green-500" />
                  Correo Electrónico
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    disabled={loading}
                    className="w-full rounded-lg border border-gray-200 bg-white/50 px-4 py-3 backdrop-blur-sm transition-all duration-200 hover:bg-white/70 focus:border-transparent focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                    placeholder="Ingrese correo electrónico"
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center">
                    <div className="pointer-events-none h-2 w-2 rounded-full bg-green-400 opacity-50"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Campos condicionales para movilbus */}
            {username === 'movilbus' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="unidadasig"
                    className="flex items-center gap-2 text-sm font-medium text-gray-700"
                  >
                    <Truck className="h-4 w-4 text-green-500" />
                    Unidad Asignada
                  </Label>
                  <div className="relative">
                    <Input
                      id="unidadasig"
                      type="text"
                      value={formData.unidadasig}
                      onChange={(e) =>
                        handleInputChange('unidadasig', e.target.value)
                      }
                      disabled={loading}
                      className="w-full rounded-lg border border-gray-200 bg-white/50 px-4 py-3 backdrop-blur-sm transition-all duration-200 hover:bg-white/70 focus:border-transparent focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                      placeholder="Ingrese unidad asignada"
                    />
                    <div className="absolute inset-y-0 right-3 flex items-center">
                      <div className="pointer-events-none h-2 w-2 rounded-full bg-green-400 opacity-50"></div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="tipo"
                    className="flex items-center gap-2 text-sm font-medium text-gray-700"
                  >
                    <Route className="h-4 w-4 text-green-500" />
                    Tipo
                  </Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value) => handleInputChange('tipo', value)}
                    disabled={loading}
                  >
                    <SelectTrigger className="w-full rounded-lg border border-gray-200 bg-white/50 px-4 py-3 backdrop-blur-sm transition-all duration-200 hover:bg-white/70 focus:border-transparent focus:ring-2 focus:ring-green-500 disabled:opacity-50">
                      <SelectValue placeholder="Seleccione el tipo" />
                    </SelectTrigger>
                    <SelectContent className="border-gray-200 bg-white/95 shadow-xl backdrop-blur-lg">
                      <SelectItem
                        value="Tdp Menores"
                        className="hover:bg-green-50 focus:bg-green-50"
                      >
                        Tdp Menores
                      </SelectItem>
                      <SelectItem
                        value="Turismo"
                        className="hover:bg-green-50 focus:bg-green-50"
                      >
                        Turismo
                      </SelectItem>
                      <SelectItem
                        value="Tdp Mayores"
                        className="hover:bg-green-50 focus:bg-green-50"
                      >
                        Tdp Mayores
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-3 pt-6">
            <Button
              onClick={handleCerrar}
              disabled={loading}
              className="transform rounded-lg bg-red-600 px-6 py-3 font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:bg-red-700 hover:shadow-xl disabled:transform-none disabled:opacity-50"
            >
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>

            <Button
              onClick={handleGuardar}
              disabled={loading}
              className="transform rounded-lg bg-green-600 px-6 py-3 font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:bg-green-700 hover:shadow-xl disabled:transform-none disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {loading ? 'Modificando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
