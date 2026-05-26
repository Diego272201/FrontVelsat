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
  Eye,
  EyeOff,
  Plus,
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

interface ConductorDialogProps {
  onConductorAdded?: () => void;
}

export default function ConductorDialog({
  onConductorAdded,
}: ConductorDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { username, isReady } = useUsername();

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
    // Validar campos obligatorios básicos
    if (!formData.apellidos.trim()) {
      toast.error('El campo Nombre Completo es obligatorio');
      return false;
    }

    if (!formData.login.trim()) {
      toast.error('El campo Login es obligatorio');
      return false;
    }

    if (!formData.clave.trim()) {
      toast.error('El campo Contraseña es obligatorio');
      return false;
    }

    // Validar DNI si está lleno (debe tener 8 dígitos)
    if (formData.dni.trim() && formData.dni.trim().length !== 8) {
      toast.error('El DNI debe tener 8 dígitos');
      return false;
    }

    // Validar DNI solo números
    if (formData.dni.trim() && !/^\d+$/.test(formData.dni.trim())) {
      toast.error('El DNI solo debe contener números');
      return false;
    }

    // Validar email si está lleno
    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        toast.error('El formato del correo electrónico no es válido');
        return false;
      }
    }

    // Validar teléfono si está lleno (solo números y mínimo 7 dígitos)
    if (formData.telefono.trim()) {
      if (!/^\d+$/.test(formData.telefono.trim())) {
        toast.error('El teléfono solo debe contener números');
        return false;
      }
      if (formData.telefono.trim().length < 7) {
        toast.error('El teléfono debe tener al menos 7 dígitos');
        return false;
      }
    }

    // Validar contraseña (mínimo 4 caracteres)
    if (formData.clave.trim().length < 4) {
      toast.error('La contraseña debe tener al menos 4 caracteres');
      return false;
    }

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
    if (!validateForm() || !isReady) return;

    setLoading(true);
    const loadingToast = toast.loading('Guardando conductor...');

    try {
      const sexoAPI =
        formData.sexo === 'masculino'
          ? 'M'
          : formData.sexo === 'femenino'
            ? 'F'
            : 'M';

      const payload: any = {
        nombres: '',
        apellidos: formData.apellidos.trim(),
        login: formData.login.trim(),
        clave: formData.clave.trim(),
        telefono: formData.telefono.trim(),
        dni: formData.dni.trim(),
        email: formData.email.trim(),
        sexo: sexoAPI,
        brevete: '',
        direccion: '',
        sctr: '',
        catBrevete: '',
        estBrevete: '',
        fecValidBrevete: '',
        unidadActual: '',
      };

      const response = await fetch(
        `https://do.velsat.pe:2083/api/Preplan/NuevoConductor/${username}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        },
      );

      console.log('Payload enviado:', payload);

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Error del servidor:', errorData);
        throw new Error(`Error ${response.status}: ${errorData}`);
      }

      toast.dismiss(loadingToast);
      toast.success('Conductor guardado exitosamente');

      setIsOpen(false);
      resetForm();

      if (onConductorAdded) {
        onConductorAdded();
      }
    } catch (error: unknown) {
      toast.dismiss(loadingToast);
      console.error('Error al guardar conductor:', error);

      let errorMessage = 'Error al guardar el conductor';

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

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={loading}
        className="flex w-full transform items-center justify-center 
             gap-2 bg-gradient-to-r from-orange-600
             to-orange-600 px-6
             py-[9px] text-sm font-medium text-white shadow-lg 
             transition-all duration-300 hover:from-orange-600 hover:to-orange-700 
             disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus className="h-4 w-4" />
        Nuevo Conductor
      </button>

      <Dialog open={isOpen} onOpenChange={!loading ? setIsOpen : undefined}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-0 bg-white/95 shadow-2xl backdrop-blur-lg sm:max-w-[650px]">
          <DialogHeader className="pb-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500 shadow-lg">
                <User className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-blue-700">
                  Nuevo Conductor
                </DialogTitle>
                <p className="mt-1 text-[12px] text-gray-500">
                  Complete la información del conductor
                </p>
              </div>
            </div>
          </DialogHeader>

          <form autoComplete="off" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-4 py-2">
              {/* Nombre Completo - Línea completa */}
              <div className="space-y-2">
                <Label
                  htmlFor="apellidos"
                  className="flex items-center gap-2 text-sm font-medium text-gray-700"
                >
                  <User className="h-4 w-4 text-orange-500" />
                  Nombre Completo
                  <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="apellidos"
                    name="conductor-apellidos"
                    type="text"
                    value={formData.apellidos}
                    onChange={(e) =>
                      handleInputChange('apellidos', e.target.value)
                    }
                    disabled={loading}
                    autoComplete="off"
                    data-form-type="other"
                    readOnly
                    onFocus={(e) => e.currentTarget.removeAttribute('readonly')}
                    className="w-full rounded-lg border border-gray-200 bg-white/50 px-4 py-3 backdrop-blur-sm transition-all duration-200 hover:bg-white/70 focus:border-transparent focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                    placeholder="Ingrese nombre completo"
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center">
                    <div className="pointer-events-none h-2 w-2 rounded-full bg-blue-400 opacity-50"></div>
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
                    <CreditCard className="h-4 w-4 text-orange-500" />
                    DNI
                  </Label>
                  <div className="relative">
                    <Input
                      id="dni"
                      name="conductor-dni"
                      type="text"
                      value={formData.dni}
                      onChange={(e) => handleInputChange('dni', e.target.value)}
                      disabled={loading}
                      autoComplete="off"
                      data-form-type="other"
                      readOnly
                      onFocus={(e) =>
                        e.currentTarget.removeAttribute('readonly')
                      }
                      className="w-full rounded-lg border border-gray-200 bg-white/50 px-4 py-3 backdrop-blur-sm transition-all duration-200 hover:bg-white/70 focus:border-transparent focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                      placeholder="Ingrese dni"
                      maxLength={8}
                    />
                    <div className="absolute inset-y-0 right-3 flex items-center">
                      <div className="pointer-events-none h-2 w-2 rounded-full bg-blue-400 opacity-50"></div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="sexo"
                    className="flex items-center gap-2 text-sm font-medium text-gray-700"
                  >
                    <Users className="h-4 w-4 text-orange-500" />
                    Género
                  </Label>
                  <Select
                    value={formData.sexo}
                    onValueChange={(value) => handleInputChange('sexo', value)}
                    disabled={loading}
                  >
                    <SelectTrigger className="w-full rounded-lg border border-gray-200 bg-white/50 px-4 py-3 backdrop-blur-sm transition-all duration-200 hover:bg-white/70 focus:border-transparent focus:ring-2 focus:ring-orange-500 disabled:opacity-50">
                      <SelectValue placeholder="Seleccione el género" />
                    </SelectTrigger>
                    <SelectContent className="border-gray-200 bg-white/95 shadow-xl backdrop-blur-lg">
                      <SelectItem
                        value="masculino"
                        className="hover:bg-orange-50 focus:bg-orange-50"
                      >
                        Masculino
                      </SelectItem>
                      <SelectItem
                        value="femenino"
                        className="hover:bg-orange-50 focus:bg-orange-50"
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
                    <Key className="h-4 w-4 text-orange-500" />
                    Login
                    <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="login"
                      name="conductor-login"
                      type="text"
                      value={formData.login}
                      onChange={(e) =>
                        handleInputChange('login', e.target.value)
                      }
                      disabled={loading}
                      autoComplete="off"
                      data-form-type="other"
                      readOnly
                      onFocus={(e) =>
                        e.currentTarget.removeAttribute('readonly')
                      }
                      className="w-full rounded-lg border border-gray-200 bg-white/50 px-4 py-3 backdrop-blur-sm transition-all duration-200 hover:bg-white/70 focus:border-transparent focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                      placeholder="Ingrese login"
                    />
                    <div className="absolute inset-y-0 right-3 flex items-center">
                      <div className="pointer-events-none h-2 w-2 rounded-full bg-blue-400 opacity-50"></div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="clave"
                    className="flex items-center gap-2 text-sm font-medium text-gray-700"
                  >
                    <Lock className="h-4 w-4 text-orange-500" />
                    Contraseña
                    <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="clave"
                      name="conductor-clave"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.clave}
                      onChange={(e) =>
                        handleInputChange('clave', e.target.value)
                      }
                      disabled={loading}
                      autoComplete="off"
                      data-form-type="other"
                      readOnly
                      onFocus={(e) =>
                        e.currentTarget.removeAttribute('readonly')
                      }
                      className="w-full rounded-lg border border-gray-200 bg-white/50 px-4 py-3 backdrop-blur-sm transition-all duration-200 hover:bg-white/70 focus:border-transparent focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                      placeholder="Ingrese contraseña"
                    />
                    <div className="absolute inset-y-0 right-3 flex items-center">
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={loading}
                        className="text-gray-500 transition-colors hover:text-orange-500 disabled:opacity-50"
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
                    <Phone className="h-4 w-4 text-orange-500" />
                    Teléfono
                  </Label>
                  <div className="relative">
                    <Input
                      id="telefono"
                      name="conductor-telefono"
                      type="tel"
                      value={formData.telefono}
                      onChange={(e) =>
                        handleInputChange('telefono', e.target.value)
                      }
                      disabled={loading}
                      autoComplete="off"
                      data-form-type="other"
                      readOnly
                      onFocus={(e) =>
                        e.currentTarget.removeAttribute('readonly')
                      }
                      className="w-full rounded-lg border border-gray-200 bg-white/50 px-4 py-3 backdrop-blur-sm transition-all duration-200 hover:bg-white/70 focus:border-transparent focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                      placeholder="Ingrese teléfono"
                    />
                    <div className="absolute inset-y-0 right-3 flex items-center">
                      <div className="pointer-events-none h-2 w-2 rounded-full bg-blue-400 opacity-50"></div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="flex items-center gap-2 text-sm font-medium text-gray-700"
                  >
                    <Mail className="h-4 w-4 text-orange-500" />
                    Correo Electrónico
                  </Label>
                  <div className="relative">
                    <Input
                      id="email"
                      name="conductor-email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        handleInputChange('email', e.target.value)
                      }
                      disabled={loading}
                      autoComplete="off"
                      data-form-type="other"
                      readOnly
                      onFocus={(e) =>
                        e.currentTarget.removeAttribute('readonly')
                      }
                      className="w-full rounded-lg border border-gray-200 bg-white/50 px-4 py-3 backdrop-blur-sm transition-all duration-200 hover:bg-white/70 focus:border-transparent focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                      placeholder="Ingrese correo electrónico"
                    />
                    <div className="absolute inset-y-0 right-3 flex items-center">
                      <div className="pointer-events-none h-2 w-2 rounded-full bg-blue-400 opacity-50"></div>
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
                      <Truck className="h-4 w-4 text-orange-500" />
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
                        autoComplete="off"
                        className="w-full rounded-lg border border-gray-200 bg-white/50 px-4 py-3 backdrop-blur-sm transition-all duration-200 hover:bg-white/70 focus:border-transparent focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                        placeholder="Ingrese unidad asignada"
                      />
                      <div className="absolute inset-y-0 right-3 flex items-center">
                        <div className="pointer-events-none h-2 w-2 rounded-full bg-blue-400 opacity-50"></div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="tipo"
                      className="flex items-center gap-2 text-sm font-medium text-gray-700"
                    >
                      <Route className="h-4 w-4 text-orange-500" />
                      Tipo
                    </Label>
                    <Select
                      value={formData.tipo}
                      onValueChange={(value) =>
                        handleInputChange('tipo', value)
                      }
                      disabled={loading}
                    >
                      <SelectTrigger className="w-full rounded-lg border border-gray-200 bg-white/50 px-4 py-3 backdrop-blur-sm transition-all duration-200 hover:bg-white/70 focus:border-transparent focus:ring-2 focus:ring-orange-500 disabled:opacity-50">
                        <SelectValue placeholder="Seleccione el tipo" />
                      </SelectTrigger>
                      <SelectContent className="border-gray-200 bg-white/95 shadow-xl backdrop-blur-lg">
                        <SelectItem
                          value="Tdp Menores"
                          className="hover:bg-orange-50 focus:bg-orange-50"
                        >
                          Tdp Menores
                        </SelectItem>
                        <SelectItem
                          value="Turismo"
                          className="hover:bg-orange-50 focus:bg-orange-50"
                        >
                          Turismo
                        </SelectItem>
                        <SelectItem
                          value="Tdp Mayores"
                          className="hover:bg-orange-50 focus:bg-orange-50"
                        >
                          Tdp Mayores
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </form>

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
              className="transform rounded-lg bg-orange-600 px-6 py-3 font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:bg-orange-700 hover:shadow-xl disabled:transform-none disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
