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
  Clock,
  Truck,
  Calendar,
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
  | 'turno'
  | 'horainicio'
  | 'unidadasig';

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
  const { username, isReady } = useUsername(); // ✅ Agregar esta línea

  const [formData, setFormData] = useState<Record<FormField, string>>({
    apellidos: '',
    dni: '',
    sexo: '',
    login: '',
    clave: '',
    telefono: '',
    email: '',
    turno: '',
    horainicio: '',
    unidadasig: '',
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
      turno: '',
      horainicio: '',
      unidadasig: '',
    });
    setShowPassword(false);
  };

  const validateForm = () => {
    const requiredFields: FormField[] = ['apellidos', 'login', 'clave']; // ⬅️ Quitamos "dni"

    for (const field of requiredFields) {
      if (!formData[field].trim()) {
        toast.error(`El campo ${getFieldLabel(field)} es obligatorio`);
        return false;
      }
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
      turno: 'Turno',
      horainicio: 'Hora de Inicio',
      unidadasig: 'Unidad Asignada',
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

      // ✅ Payload base
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

      // ✅ Solo agregar turno, horainicio y unidadasig si el usuario es "movilbus"
      if (username === 'movilbus') {
        const turnoAPI =
          formData.turno === 'dia'
            ? 'D'
            : formData.turno === 'noche'
              ? 'N'
              : 'D';
        payload.turno = turnoAPI;
        payload.horainicio = formData.horainicio.trim();
        payload.unidadasig = formData.unidadasig.trim();
      }

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

  const inputFields: FieldConfig[] = [
    { id: 'apellidos', label: 'Nombre Completo', icon: User, type: 'text' },
    { id: 'dni', label: 'DNI', icon: CreditCard, type: 'text' },
    { id: 'login', label: 'Login', icon: Key, type: 'text' },
    { id: 'clave', label: 'Contraseña', icon: Lock, type: 'password' },
    { id: 'telefono', label: 'Teléfono', icon: Phone, type: 'tel' },
    { id: 'email', label: 'Correo Electrónico', icon: Mail, type: 'email' },
  ];

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
        <DialogContent className="max-h-[90vh] overflow-y-auto border-0 bg-white/95 shadow-2xl backdrop-blur-lg sm:max-w-[550px]">
          <DialogHeader className="pb-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500 shadow-lg">
                <User className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-blue-600">
                  Nuevo Conductor
                </DialogTitle>
                <p className="mt-1 text-sm text-gray-500">
                  Complete la información del conductor
                </p>
              </div>
            </div>
          </DialogHeader>

          {/* 👇 Envuelve todo en un form con autoComplete="off" */}
          <form autoComplete="off" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-4 py-2">
              {inputFields.map((field) => (
                <div key={field.id} className="space-y-2">
                  <Label
                    htmlFor={field.id}
                    className="flex items-center gap-2 text-sm font-medium text-gray-700"
                  >
                    <field.icon className="h-4 w-4 text-orange-500" />
                    {field.label}
                    {['apellidos', 'login', 'clave'].includes(field.id) && (
                      <span className="text-red-500">*</span>
                    )}
                  </Label>
                  <div className="relative">
                    <Input
                      id={field.id}
                      name={`conductor-${field.id}`} // 👈 Nombre único
                      type={
                        field.id === 'clave' && showPassword
                          ? 'text'
                          : field.type
                      }
                      value={formData[field.id]}
                      onChange={(e) =>
                        handleInputChange(field.id, e.target.value)
                      }
                      disabled={loading}
                      autoComplete="off" // 👈 Desactivar autocompletado
                      data-form-type="other" // 👈 Hint adicional
                      readOnly
                      onFocus={(e) =>
                        e.currentTarget.removeAttribute('readonly')
                      } // 👈 Y esto
                      className="w-full rounded-lg border border-gray-200 bg-white/50 px-4 py-3 backdrop-blur-sm transition-all duration-200 hover:bg-white/70 focus:border-transparent focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                      placeholder={`Ingrese ${field.label.toLowerCase()}`}
                      maxLength={field.id === 'dni' ? 8 : undefined}
                    />
                    <div className="absolute inset-y-0 right-3 flex items-center">
                      {field.id === 'clave' ? (
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
                      ) : (
                        <div className="pointer-events-none h-2 w-2 rounded-full bg-blue-400 opacity-50"></div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* ⭐ Solo mostrar Turno, Hora de Inicio y Unidad Asignada si el usuario es "movilbus" */}
              {username === 'movilbus' && (
                <>
                  {/* Select de Turno */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="turno"
                      className="flex items-center gap-2 text-sm font-medium text-gray-700"
                    >
                      <Calendar className="h-4 w-4 text-orange-500" />
                      Turno
                    </Label>
                    <Select
                      value={formData.turno}
                      onValueChange={(value) =>
                        handleInputChange('turno', value)
                      }
                      disabled={loading}
                    >
                      <SelectTrigger className="w-full rounded-lg border border-gray-200 bg-white/50 px-4 py-3 backdrop-blur-sm transition-all duration-200 hover:bg-white/70 focus:border-transparent focus:ring-2 focus:ring-orange-500 disabled:opacity-50">
                        <SelectValue placeholder="Seleccione el turno" />
                      </SelectTrigger>
                      <SelectContent className="border-gray-200 bg-white/95 shadow-xl backdrop-blur-lg">
                        <SelectItem
                          value="dia"
                          className="hover:bg-orange-50 focus:bg-orange-50"
                        >
                          Día
                        </SelectItem>
                        <SelectItem
                          value="noche"
                          className="hover:bg-orange-50 focus:bg-orange-50"
                        >
                          Noche
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Campo de Hora de Inicio */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="horainicio"
                      className="flex items-center gap-2 text-sm font-medium text-gray-700"
                    >
                      <Clock className="h-4 w-4 text-orange-500" />
                      Hora de Inicio
                    </Label>
                    <div className="relative">
                      <Input
                        id="horainicio"
                        type="time"
                        value={formData.horainicio}
                        onChange={(e) =>
                          handleInputChange('horainicio', e.target.value)
                        }
                        disabled={loading}
                        autoComplete="off"
                        className="w-full rounded-lg border border-gray-200 bg-white/50 px-4 py-3 backdrop-blur-sm transition-all duration-200 hover:bg-white/70 focus:border-transparent focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                        placeholder="Ingrese hora de inicio"
                      />
                      <div className="absolute inset-y-0 right-3 flex items-center">
                        <div className="pointer-events-none h-2 w-2 rounded-full bg-blue-400 opacity-50"></div>
                      </div>
                    </div>
                  </div>

                  {/* Campo de Unidad Asignada */}
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
                </>
              )}

              <div className="space-y-2">
                <Label
                  htmlFor="sexo"
                  className="flex items-center gap-2 text-sm font-medium text-gray-700"
                >
                  <Users className="h-4 w-4 text-orange-500" />
                  Género
                  <span className="text-red-500">*</span>
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
          </form>
          {/* 👆 Cierra el form aquí */}

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
