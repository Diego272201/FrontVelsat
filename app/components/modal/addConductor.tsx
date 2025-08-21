import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/app/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "lucide-react";
import { toast } from "sonner";

type FormField =
  | "apellidos"
  | "dni"
  | "sexo"
  | "login"
  | "clave"
  | "telefono"
  | "email";

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

  const [formData, setFormData] = useState<Record<FormField, string>>({
    apellidos: "",
    dni: "",
    sexo: "",
    login: "",
    clave: "",
    telefono: "",
    email: "",
  });

  const handleInputChange = (field: FormField, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setFormData({
      apellidos: "",
      dni: "",
      sexo: "",
      login: "",
      clave: "",
      telefono: "",
      email: "",
    });
    setShowPassword(false);
  };

  const validateForm = () => {
    const requiredFields: FormField[] = ["apellidos", "login", "clave", "dni"];

    for (const field of requiredFields) {
      if (!formData[field].trim()) {
        toast.error(`El campo ${getFieldLabel(field)} es obligatorio`);
        return false;
      }
    }

    // Validar DNI (8 dígitos)
    if (formData.dni.length !== 8 || !/^\d+$/.test(formData.dni)) {
      toast.error("El DNI debe tener 8 dígitos");
      return false;
    }

    // Validar email si se proporciona
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error("Ingrese un email válido");
      return false;
    }

    return true;
  };

  const getFieldLabel = (field: FormField): string => {
    const labels: Record<FormField, string> = {
      apellidos: "Nombre Completo",
      dni: "DNI",
      sexo: "Género",
      login: "Usuario",
      clave: "Contraseña",
      telefono: "Teléfono",
      email: "Email",
    };
    return labels[field];
  };

  const handleGuardar = async () => {
    if (!validateForm()) return;

    setLoading(true);
    const loadingToast = toast.loading("Guardando conductor...");

    try {
      // Transformar sexo a formato API (M/F)
      const sexoAPI =
        formData.sexo === "masculino"
          ? "M"
          : formData.sexo === "femenino"
          ? "F"
          : "M";

      const payload = {
        apellidos: formData.apellidos.trim(),
        login: formData.login.trim(),
        clave: formData.clave.trim(),
        telefono: formData.telefono.trim(),
        dni: formData.dni.trim(),
        email: formData.email.trim(),
        sexo: sexoAPI,
      };

      const response = await fetch(
        `https://velsat.pe:2096/api/Preplan/NuevoConductor/movilbus`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      console.log(payload);

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Error ${response.status}: ${errorData}`);
      }

      // Éxito
      toast.dismiss(loadingToast);
      toast.success("Conductor guardado exitosamente");

      // Cerrar modal y resetear formulario
      setIsOpen(false);
      resetForm();

      // Llamar función para actualizar la lista
      if (onConductorAdded) {
        onConductorAdded();
      }
    } catch (error: unknown) {
      toast.dismiss(loadingToast);
      console.error("Error al guardar conductor:", error);

      let errorMessage = "Error al guardar el conductor";

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
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
    { id: "apellidos", label: "Nombre Completo", icon: User, type: "text" },
    { id: "dni", label: "DNI", icon: CreditCard, type: "text" },
    { id: "login", label: "Login", icon: Key, type: "text" },
    { id: "clave", label: "Contraseña", icon: Lock, type: "password" },
    { id: "telefono", label: "Teléfono", icon: Phone, type: "tel" },
    { id: "email", label: "Correo Electrónico", icon: Mail, type: "email" },
  ];

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-[9px] px-6 text-sm shadow-lg transition-all duration-300 transform disabled:opacity-50"
      >
        Nuevo Conductor
      </button>

      <Dialog open={isOpen} onOpenChange={!loading ? setIsOpen : undefined}>
        <DialogContent className="sm:max-w-[550px] border-0 shadow-2xl bg-white/95 backdrop-blur-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-orange-500 rounded-lg shadow-lg">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-blue-600">
                  Nuevo Conductor
                </DialogTitle>
                <p className="text-gray-500 text-sm mt-1">
                  Complete la información del conductor
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {inputFields.map((field) => (
              <div key={field.id} className="space-y-2">
                <Label
                  htmlFor={field.id}
                  className="text-sm font-medium text-gray-700 flex items-center gap-2"
                >
                  <field.icon className="w-4 h-4 text-orange-500" />
                  {field.label}
                  {["apellidos", "dni", "login", "clave"].includes(
                    field.id
                  ) && <span className="text-red-500">*</span>}
                </Label>
                <div className="relative">
                  <Input
                    id={field.id}
                    type={field.id === "clave" && showPassword ? "text" : field.type}
                    value={formData[field.id]}
                    onChange={(e) =>
                      handleInputChange(field.id, e.target.value)
                    }
                    disabled={loading}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm hover:bg-white/70 disabled:opacity-50"
                    placeholder={`Ingrese ${field.label.toLowerCase()}`}
                    maxLength={field.id === "dni" ? 8 : undefined}
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center">
                    {field.id === "clave" ? (
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={loading}
                        className="text-gray-500 hover:text-orange-500 transition-colors disabled:opacity-50"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    ) : (
                      <div className="w-2 h-2 bg-blue-400 rounded-full opacity-50 pointer-events-none"></div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <div className="space-y-2">
              <Label
                htmlFor="sexo"
                className="text-sm font-medium text-gray-700 flex items-center gap-2"
              >
                <Users className="w-4 h-4 text-orange-500" />
                Género
                <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.sexo}
                onValueChange={(value) => handleInputChange("sexo", value)}
                disabled={loading}
              >
                <SelectTrigger className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm hover:bg-white/70 disabled:opacity-50">
                  <SelectValue placeholder="Seleccione el género" />
                </SelectTrigger>
                <SelectContent className="bg-white/95 backdrop-blur-lg border-gray-200 shadow-xl">
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

          <DialogFooter className="gap-3 pt-6">
            <Button
              onClick={handleCerrar}
              disabled={loading}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>

            <Button
              onClick={handleGuardar}
              disabled={loading}
              className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {loading ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}