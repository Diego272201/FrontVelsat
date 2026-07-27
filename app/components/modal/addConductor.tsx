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

  const validateForm = () => {
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
    if (formData.dni.trim() && formData.dni.trim().length !== 8) {
      toast.error('El DNI debe tener 8 dígitos');
      return false;
    }
    if (formData.dni.trim() && !/^\d+$/.test(formData.dni.trim())) {
      toast.error('El DNI solo debe contener números');
      return false;
    }
    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        toast.error('El formato del correo electrónico no es válido');
        return false;
      }
    }
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
    if (formData.clave.trim().length < 4) {
      toast.error('La contraseña debe tener al menos 4 caracteres');
      return false;
    }
    return true;
  };

  const handleGuardar = async () => {
    if (!validateForm() || !isReady) return;

    setLoading(true);
    const loadingToast = toast.loading('Guardando conductor...');

    try {
      const sexoAPI =
        formData.sexo === 'masculino' ? 'M' : formData.sexo === 'femenino' ? 'F' : 'M';

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
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Error ${response.status}: ${errorData}`);
      }

      toast.dismiss(loadingToast);
      toast.success('Conductor guardado exitosamente');

      setIsOpen(false);
      resetForm();
      onConductorAdded?.();
    } catch (error: unknown) {
      toast.dismiss(loadingToast);
      const errorMessage = error instanceof Error ? error.message : 'Error al guardar el conductor';
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

  const inputClass = "w-full border border-gray-200 bg-white px-3 py-2 text-[12px] transition-colors focus:border-[#113EB9] focus:outline-none focus:ring-1 focus:ring-[#113EB9] disabled:opacity-50";
  const labelClass = "flex items-center gap-1.5 text-[12px] font-medium text-gray-700";

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={loading}
        className="flex items-center gap-1.5 bg-[#f35b04] px-4 py-[7px] text-[12px] font-medium text-white transition-colors hover:bg-[#e06a00] disabled:opacity-50"
      >
        <Plus className="h-3.5 w-3.5" />
        Nuevo Conductor
      </button>

      <Dialog open={isOpen} onOpenChange={!loading ? setIsOpen : undefined}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border border-gray-200 bg-white shadow-lg sm:max-w-[600px]">
          <DialogHeader className="pb-0">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center bg-[#fb7b0f]">
                <User className="h-4 w-4 text-white" />
              </div>
              <div>
                <DialogTitle className="text-[14px] font-bold uppercase text-[#113EB9]">
                  Nuevo Conductor
                </DialogTitle>
                <p className="text-[11px] text-gray-500">
                  Complete la información del conductor
                </p>
              </div>
            </div>
          </DialogHeader>

          <form autoComplete="off" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label htmlFor="apellidos" className={labelClass}>
                  <User className="h-3.5 w-3.5 text-[#fb7b0f]" />
                  Nombre Completo <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="apellidos"
                  name="conductor-apellidos"
                  type="text"
                  value={formData.apellidos}
                  onChange={(e) => handleInputChange('apellidos', e.target.value)}
                  disabled={loading}
                  autoComplete="off"
                  data-form-type="other"
                  readOnly
                  onFocus={(e) => e.currentTarget.removeAttribute('readonly')}
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
                    name="conductor-dni"
                    type="text"
                    value={formData.dni}
                    onChange={(e) => handleInputChange('dni', e.target.value)}
                    disabled={loading}
                    autoComplete="off"
                    data-form-type="other"
                    readOnly
                    onFocus={(e) => e.currentTarget.removeAttribute('readonly')}
                    className={inputClass}
                    placeholder="Ingrese dni"
                    maxLength={8}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="sexo" className={labelClass}>
                    <Users className="h-3.5 w-3.5 text-[#fb7b0f]" />
                    Género
                  </Label>
                  <Select
                    value={formData.sexo}
                    onValueChange={(value) => handleInputChange('sexo', value)}
                    disabled={loading}
                  >
                    <SelectTrigger className={inputClass}>
                      <SelectValue placeholder="Seleccione" />
                    </SelectTrigger>
                    <SelectContent className="border-gray-200 bg-white shadow-lg">
                      <SelectItem value="masculino" className="text-[12px] hover:bg-blue-50 focus:bg-blue-50">Masculino</SelectItem>
                      <SelectItem value="femenino" className="text-[12px] hover:bg-blue-50 focus:bg-blue-50">Femenino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="login" className={labelClass}>
                    <Key className="h-3.5 w-3.5 text-[#fb7b0f]" />
                    Login <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="login"
                    name="conductor-login"
                    type="text"
                    value={formData.login}
                    onChange={(e) => handleInputChange('login', e.target.value)}
                    disabled={loading}
                    autoComplete="off"
                    data-form-type="other"
                    readOnly
                    onFocus={(e) => e.currentTarget.removeAttribute('readonly')}
                    className={inputClass}
                    placeholder="Ingrese login"
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
                      name="conductor-clave"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.clave}
                      onChange={(e) => handleInputChange('clave', e.target.value)}
                      disabled={loading}
                      autoComplete="off"
                      data-form-type="other"
                      readOnly
                      onFocus={(e) => e.currentTarget.removeAttribute('readonly')}
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
                    name="conductor-telefono"
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => handleInputChange('telefono', e.target.value)}
                    disabled={loading}
                    autoComplete="off"
                    data-form-type="other"
                    readOnly
                    onFocus={(e) => e.currentTarget.removeAttribute('readonly')}
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
                    name="conductor-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    disabled={loading}
                    autoComplete="off"
                    data-form-type="other"
                    readOnly
                    onFocus={(e) => e.currentTarget.removeAttribute('readonly')}
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
                      autoComplete="off"
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
                      <SelectContent className="border-gray-200 bg-white shadow-lg">
                        <SelectItem value="Tdp Menores" className="text-[12px] hover:bg-blue-50 focus:bg-blue-50">Tdp Menores</SelectItem>
                        <SelectItem value="Turismo" className="text-[12px] hover:bg-blue-50 focus:bg-blue-50">Turismo</SelectItem>
                        <SelectItem value="Tdp Mayores" className="text-[12px] hover:bg-blue-50 focus:bg-blue-50">Tdp Mayores</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </form>

          <DialogFooter className="gap-2 pt-3">
            <Button
              onClick={handleCerrar}
              disabled={loading}
              className="bg-gray-100 px-4 py-2 text-[12px] font-medium text-gray-700 shadow-none hover:bg-gray-200"
            >
              <X className="mr-1.5 h-3.5 w-3.5" />
              Cancelar
            </Button>

            <Button
              onClick={handleGuardar}
              disabled={loading}
              className="bg-[#fb7b0f] px-4 py-2 text-[12px] font-medium text-white shadow-none hover:bg-orange-500"
            >
              {loading ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="mr-1.5 h-3.5 w-3.5" />
              )}
              {loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
