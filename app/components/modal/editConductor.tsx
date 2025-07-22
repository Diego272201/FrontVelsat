import React, { useState, useEffect } from "react";
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
  Edit,
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

interface ConductorAPI {
  codigo: number;
  nombres: string;
  apellidos: string;
  login: string;
  clave: string;
  telefono: string;
  dni: string;
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

  const [formData, setFormData] = useState<Record<FormField, string>>({
    apellidos: "",
    dni: "",
    sexo: "",
    login: "",
    clave: "",
    telefono: "",
    email: "",
  });

  // Cargar datos del conductor cuando se abre el modal
  useEffect(() => {
    if (isOpen && conductorData) {
      setFormData({
        apellidos: conductorData.apellidos || "",
        dni: conductorData.dni || "",
        sexo:
          conductorData.sexo === "M"
            ? "masculino"
            : conductorData.sexo === "F"
            ? "femenino"
            : "",
        login: conductorData.login || "",
        clave: conductorData.clave || "",
        telefono: conductorData.telefono || "",
        email: conductorData.email || "",
      });
    }
  }, [isOpen, conductorData]);

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
    if (!validateForm() || !conductorData) return;

    setLoading(true);
    const loadingToast = toast.loading("Modificando conductor...");

    try {
      // Transformar sexo a formato API (M/F)
      const sexoAPI =
        formData.sexo === "masculino"
          ? "M"
          : formData.sexo === "femenino"
          ? "F"
          : "M";

      const payload = {
        codigo: conductorData.codigo,
        apellidos: formData.apellidos.trim(),
        login: formData.login.trim(),
        clave: formData.clave.trim(),
        telefono: formData.telefono.trim(),
        dni: formData.dni.trim(),
        email: formData.email.trim(),
        sexo: sexoAPI,
      };

      const response = await fetch(
        `https://velsat.pe:2096/api/Preplan/ModificarConductor/${conductorData.codigo}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      console.log("Payload enviado:", payload);

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Error ${response.status}: ${errorData}`);
      }

      // Éxito
      toast.dismiss(loadingToast);
      toast.success("Conductor modificado exitosamente");

      // Crear el objeto conductor actualizado para actualizar la vista
      const updatedConductor: ConductorAPI = {
        ...conductorData,
        apellidos: formData.apellidos.trim(),
        login: formData.login.trim(),
        clave: formData.clave.trim(),
        telefono: formData.telefono.trim(),
        dni: formData.dni.trim(),
        email: formData.email.trim(),
        sexo: sexoAPI,
      };

      // Cerrar modal
      setIsOpen(false);

      // Llamar función para actualizar la vista
      if (onConductorModified) {
        onConductorModified(updatedConductor);
      }
    } catch (error: unknown) {
      toast.dismiss(loadingToast);
      console.error("Error al modificar conductor:", error);

      let errorMessage = "Error al modificar el conductor";

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

  const handleOpenModal = () => {
    if (!conductorData) {
      toast.error("No se encontraron datos del conductor");
      return;
    }
    setIsOpen(true);
  };

  const inputFields: FieldConfig[] = [
    { id: "apellidos", label: "Nombre Completo", icon: User, type: "text" },
    { id: "dni", label: "DNI", icon: CreditCard, type: "text" },
    { id: "login", label: "Usuario", icon: Key, type: "text" },
    { id: "clave", label: "Contraseña", icon: Lock, type: "password" },
    { id: "telefono", label: "Teléfono", icon: Phone, type: "tel" },
    { id: "email", label: "Correo Electrónico", icon: Mail, type: "email" },
  ];

  return (
    <div>
      <button
        onClick={handleOpenModal}
        className="inline-flex items-center justify-center rounded text-xs font-medium transition-colors bg-green-700 text-white hover:bg-green-600 h-7 px-3"
      >
        <Edit size={12} className="mr-1" />
        Modificar
      </button>

      <Dialog open={isOpen} onOpenChange={!loading ? setIsOpen : undefined}>
        <DialogContent className="sm:max-w-[550px] border-0 shadow-2xl bg-white/95 backdrop-blur-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-green-500 rounded-lg shadow-lg">
                <Edit className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-green-600">
                  Modificar Conductor
                </DialogTitle>
                <p className="text-gray-500 text-sm mt-1">
                  Edite la información del conductor
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
                  <field.icon className="w-4 h-4 text-green-500" />
                  {field.label}
                  {["apellidos", "dni", "login", "clave"].includes(
                    field.id
                  ) && <span className="text-red-500">*</span>}
                </Label>
                <div className="relative">
                  <Input
                    id={field.id}
                    type={field.type}
                    value={formData[field.id]}
                    onChange={(e) =>
                      handleInputChange(field.id, e.target.value)
                    }
                    disabled={loading}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm hover:bg-white/70 disabled:opacity-50"
                    placeholder={`Ingrese ${field.label.toLowerCase()}`}
                    maxLength={field.id === "dni" ? 8 : undefined}
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                    <div className="w-2 h-2 bg-green-400 rounded-full opacity-50"></div>
                  </div>
                </div>
              </div>
            ))}

            <div className="space-y-2">
              <Label
                htmlFor="sexo"
                className="text-sm font-medium text-gray-700 flex items-center gap-2"
              >
                <Users className="w-4 h-4 text-green-500" />
                Género
                <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.sexo}
                onValueChange={(value) => handleInputChange("sexo", value)}
                disabled={loading}
              >
                <SelectTrigger className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm hover:bg-white/70 disabled:opacity-50">
                  <SelectValue placeholder="Seleccione el género" />
                </SelectTrigger>
                <SelectContent className="bg-white/95 backdrop-blur-lg border-gray-200 shadow-xl">
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
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {loading ? "Modificando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
