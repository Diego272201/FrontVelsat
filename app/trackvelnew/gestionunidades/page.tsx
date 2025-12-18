"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  FileText,
  Settings,
  Trash2,
  CheckCircle,
  AlertCircle,
  X,
  Users,
  Car,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/app/components/ui/alert-dialog";
import { useUsername } from "@/hooks/useUsername";

interface UnidadAPI {
  codunidad: string;
  habilitado: string;
}

interface Unidad {
  codunidad: string;
  habilitado: string;
}

interface Notification {
  id: string;
  type: "success" | "error";
  message: string;
}

export default function Page() {
  const { username, isReady } = useUsername();

  const [searchText, setSearchText] = useState("");
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [selectedUnidad, setSelectedUnidad] = useState<string | null>(null);
  const [accion, setAccion] = useState<"habilitar" | "deshabilitar" | null>(null);
  const [loading, setLoading] = useState(false);
  const tableRef = useRef(null);
  const [selectedUnidadLiberar, setSelectedUnidadLiberar] = useState<string | null>(null);
  const [showLiberarDialog, setShowLiberarDialog] = useState(false);
  const [loadingLiberar, setLoadingLiberar] = useState(false);
  const [showLiberarTodasDialog, setShowLiberarTodasDialog] = useState(false);
  const [loadingLiberarTodas, setLoadingLiberarTodas] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = (type: "success" | "error", message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newNotification: Notification = { id, type, message };

    setNotifications((prev) => [...prev, newNotification]);

    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 4000);
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  useEffect(() => {
    fetchUnidades();
  }, [username, isReady]);

  const fetchUnidades = async () => {
    if (!isReady) return;

    const res = await fetch(`https://do.velsat.pe:2083/api/Preplan/carros/${username}`);
    const data = await res.json();
    setUnidades(
      data
        .map((u: UnidadAPI) => ({
          codunidad: u.codunidad,
          habilitado: u.habilitado,
        }))
        .sort((a: Unidad, b: Unidad) => Number(b.habilitado) - Number(a.habilitado))
    );
  };

  const handleLiberarTodasUnidades = async () => {
    setLoadingLiberarTodas(true);

    try {
      const response = await fetch("https://do.velsat.pe:2083/api/Preplan/LiberarTotal", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        showNotification("success", "Todas las unidades han sido liberadas exitosamente");
        fetchUnidades();
      } else {
        showNotification("error", "Error al liberar todas las unidades");
      }
    } catch {
      showNotification("error", "Error de conexión al liberar todas las unidades");
    } finally {
      setLoadingLiberarTodas(false);
      setShowLiberarTodasDialog(false);
    }
  };

  const handleLiberarUnidad = async (placa: string) => {
    setLoadingLiberar(true);

    try {
      const response = await fetch(
        `https://do.velsat.pe:2083/api/Caja/LiberarUnidad/${placa}`,
        { method: "PUT", headers: { "Content-Type": "application/json" } }
      );

      if (response.ok) {
        showNotification("success", `Unidad ${placa} liberada exitosamente`);
        fetchUnidades();
      } else {
        showNotification("error", `Error al liberar la unidad ${placa}`);
      }
    } catch {
      showNotification("error", `Error de conexión al liberar la unidad ${placa}`);
    } finally {
      setLoadingLiberar(false);
      setShowLiberarDialog(false);
      setSelectedUnidadLiberar(null);
    }
  };

  const handleHabilitarDeshabilitar = async () => {
    if (!selectedUnidad || !accion) return;
    setLoading(true);

    try {
      const url =
        accion === "habilitar"
          ? `https://do.velsat.pe:2083/api/Preplan/HabilitarUnidad/${selectedUnidad}`
          : `https://do.velsat.pe:2083/api/Preplan/DeshabilitarUnidad/${selectedUnidad}`;

      const response = await fetch(url, { method: "POST" });

      if (response.ok) {
        showNotification(
          "success",
          `Unidad ${selectedUnidad} ${accion === "habilitar" ? "habilitada" : "deshabilitada"
          } exitosamente`
        );
        fetchUnidades();
      } else {
        showNotification("error", `Error al ${accion} la unidad ${selectedUnidad}`);
      }
    } catch {
      showNotification("error", `Error de conexión al ${accion} la unidad`);
    } finally {
      setSelectedUnidad(null);
      setAccion(null);
      setLoading(false);
    }
  };

  const unidadesFiltradas = unidades
    .filter((unidad) =>
      unidad.codunidad.toLowerCase().includes(searchText.toLowerCase())
    )
    .sort((a, b) => Number(b.habilitado) - Number(a.habilitado));

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      {/* 🔔 Notificaciones */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`flex items-center gap-3 p-4 rounded-xl shadow-xl border backdrop-blur-sm animate-in slide-in-from-right duration-300 ${notification.type === "success"
                ? "bg-emerald-50/95 border-emerald-300 text-emerald-900"
                : "bg-rose-50/95 border-rose-300 text-rose-900"
              }`}
          >
            {notification.type === "success" ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            )}
            <span className="flex-1 text-sm font-medium">{notification.message}</span>
            <button
              onClick={() => removeNotification(notification.id)}
              className="text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>



      <div className="bg-[#113EB9] shadow-lg border-b border-gray-200">
        <div className="px-4 py-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-10 h-10  bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 shadow-xl">
                <Car className="h-6 w-6 text-white drop-shadow-md" />
              </div>

              <div>
                <h1 className="text-[14px] font-bold text-white tracking-tight uppercase">
                  Gestión de Unidades
                </h1>
                <p className="text-gray-200 mt-0 text-[12px]">
                  Administra y controla todas las unidades del sistema
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className=" px-4 py-1 ">
                <span className="text-sm font-medium text-white">
                  Total: {unidadesFiltradas.length} conductores
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>


<div className="mx-auto px-4 py-2 w-full">
  <div className="p-0 mb-0">
    <div className="flex flex-col sm:flex-row gap-4 items-center w-full">
      <div className="relative w-full">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Buscar por código de unidad..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:opacity-50 transition-all duration-200"
        />
      </div>
    </div>
  </div>
</div>


      {/* 📋 Tabla con scroll y header sticky */}
      <div className="flex-1 overflow-hidden px-4 max-h-[calc(100vh-150px)]">
        <div className="h-full bg-white shadow-lg border border-gray-200 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-auto relative" ref={tableRef}>
            <table className="min-w-full border-collapse">
              <thead className="sticky top-0 z-20 bg-gradient-to-r from-[#33415c] to-[#33415c]">
                <tr>
                  <th className="text-white text-center font-semibold py-2 w-20 text-xs">ITEM</th>
                  <th className="text-white text-center font-semibold py-2 text-xs">
                    CÓDIGO UNIDAD
                  </th>
                  <th className="text-white text-center font-semibold py-2 text-xs">ESTADO</th>
                  <th className="text-white text-center font-semibold py-2 text-xs">ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {unidadesFiltradas.map((unidad, index) => (
                  <tr
                    key={unidad.codunidad}
                    className="hover:bg-blue-50 transition-colors border-b border-gray-100"
                  >
                        <td className="px-6 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                      {index + 1}
                    </td>
                    <td className="text-center py-2 text-xs">
                        {unidad.codunidad}
                    </td>
                    <td className="text-center py-2">
                      <Badge
                        className={`font-medium px-3 py-1 ${unidad.habilitado === "1"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : "bg-gray-100 text-gray-800 border border-gray-300"
                          }`}
                      >
                        {unidad.habilitado === "1"
                          ? "Habilitada"
                          : "Deshabilitada"}
                      </Badge>
                    </td>
                    <td className="text-center py-2">
                      <div className="flex justify-center gap-2 flex-wrap">
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-md transition-all"
                          onClick={() => {
                            setSelectedUnidadLiberar(unidad.codunidad);
                            setShowLiberarDialog(true);
                          }}
                          disabled={loadingLiberar || loadingLiberarTodas}
                        >
                          <FileText className="w-4 h-4 mr-1" />
                          Liberar
                        </Button>

                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md transition-all"
                        >
                          <FileText className="w-4 h-4 mr-1" />
                          Documentos
                        </Button>

                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-md transition-all"
                        >
                          <Settings className="w-4 h-4 mr-1" />
                          Mantenimientos
                        </Button>

                        <Button
                          size="sm"
                          className={`shadow-md transition-all ${unidad.habilitado === "1"
                              ? "bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white"
                              : "bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white"
                            }`}
                          onClick={() => {
                            setSelectedUnidad(unidad.codunidad);
                            setAccion(
                              unidad.habilitado === "1"
                                ? "deshabilitar"
                                : "habilitar"
                            );
                          }}
                          disabled={loading || loadingLiberarTodas}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          {unidad.habilitado === "1"
                            ? "Deshabilitar"
                            : "Habilitar"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {unidadesFiltradas.length === 0 && (
              <div className="flex-1 flex items-center justify-center text-gray-500 p-8">
                <div className="text-center">
                  <Search className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">No se encontraron unidades</p>
                  <p className="text-sm mt-2">Intenta con otro término de búsqueda</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 🧩 Diálogos */}
      <AlertDialog open={showLiberarTodasDialog} onOpenChange={setShowLiberarTodasDialog}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg text-gray-900">
              ¿Estás seguro que deseas liberar <strong>TODAS</strong> las unidades?
              <br />
              <span className="text-rose-600 font-normal text-base">
                Esta acción eliminará las rutas actuales de todas las unidades.
              </span>
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLiberarTodasUnidades}
              disabled={loadingLiberarTodas}
              className="bg-rose-600 hover:bg-rose-700 rounded-lg"
            >
              {loadingLiberarTodas ? "Liberando todas..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showLiberarDialog} onOpenChange={setShowLiberarDialog}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg text-gray-900">
              ¿Estás seguro que deseas liberar la unidad{" "}
              <strong>{selectedUnidadLiberar}</strong>?
              <br />
              <span className="text-amber-600 text-base">
                Esto eliminará la ruta actual.
              </span>
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                selectedUnidadLiberar && handleLiberarUnidad(selectedUnidadLiberar)
              }
              disabled={loadingLiberar || loadingLiberarTodas}
              className="bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              {loadingLiberar ? "Liberando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!selectedUnidad} onOpenChange={() => setSelectedUnidad(null)}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg text-gray-900">
              ¿Estás seguro que deseas {accion} la unidad{" "}
              <strong>{selectedUnidad}</strong>?
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleHabilitarDeshabilitar}
              disabled={loading || loadingLiberarTodas}
              className="bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              {loading ? "Procesando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
