"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  FileText,
  Settings,
  Trash2,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
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
  type: 'success' | 'error';
  message: string;
}

export default function Page() {
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [unidades, setUnidades] = useState<
    { codunidad: string; habilitado: string }[]
  >([]);
  const [selectedUnidad, setSelectedUnidad] = useState<string | null>(null);
  const [accion, setAccion] = useState<"habilitar" | "deshabilitar" | null>(
    null
  );
  const [loading, setLoading] = useState(false);

  const tableRef = useRef(null);

  const [selectedUnidadLiberar, setSelectedUnidadLiberar] = useState<
    string | null
  >(null);
  const [showLiberarDialog, setShowLiberarDialog] = useState(false);
  const [loadingLiberar, setLoadingLiberar] = useState(false);
  
  // Estados para liberar todas las unidades
  const [showLiberarTodasDialog, setShowLiberarTodasDialog] = useState(false);
  const [loadingLiberarTodas, setLoadingLiberarTodas] = useState(false);

  // Estado para notificaciones
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Función para mostrar notificaciones
  const showNotification = (type: 'success' | 'error', message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newNotification: Notification = { id, type, message };
    
    setNotifications(prev => [...prev, newNotification]);
    
    // Auto-remover después de 4 segundos
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  };

  // Función para remover notificación manualmente
  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  useEffect(() => {
    const calculateItemsPerPage = () => {
      const windowHeight = window.innerHeight;
      const headerHeight = 280;
      const footerHeight = 120;
      const availableHeight = windowHeight - headerHeight - footerHeight;
      const rowHeight = 35;

      const calculatedItems = Math.floor(availableHeight / rowHeight);
      setItemsPerPage(Math.max(5, Math.min(calculatedItems, 20)));
    };

    calculateItemsPerPage();
    window.addEventListener("resize", calculateItemsPerPage);

    return () => window.removeEventListener("resize", calculateItemsPerPage);
  }, []);

  useEffect(() => {
    fetchUnidades();
  }, []);

  const fetchUnidades = async () => {
    const res = await fetch(
      "https://velsat.pe:2096/api/Preplan/carros/movilbus"
    );
    const data = await res.json();
    setUnidades(
      data
        .map((u: UnidadAPI) => ({
          codunidad: u.codunidad,
          habilitado: u.habilitado,
        }))
        .sort(
          (a: Unidad, b: Unidad) => Number(b.habilitado) - Number(a.habilitado)
        )
    );
  };

  const handleLiberarTodasUnidades = async () => {
    setLoadingLiberarTodas(true);

    try {
      const response = await fetch(
        'https://velsat.pe:2096/api/Preplan/LiberarTotal',
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        showNotification('success', 'Todas las unidades han sido liberadas exitosamente');
        fetchUnidades(); // Refrescar la lista
      } else {
        showNotification('error', 'Error al liberar todas las unidades');
      }
    } catch (error) {
      showNotification('error', 'Error de conexión al liberar todas las unidades');
      console.error("Error en la petición:", error);
    } finally {
      setLoadingLiberarTodas(false);
      setShowLiberarTodasDialog(false);
    }
  };

  const handleLiberarUnidad = async (placa: string) => {
    setLoadingLiberar(true);

    try {
      const response = await fetch(
        `https://velsat.pe:2096/api/Caja/LiberarUnidad/${placa}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        showNotification('success', `Unidad ${placa} liberada exitosamente`);
        fetchUnidades(); // Refrescar la lista
      } else {
        showNotification('error', `Error al liberar la unidad ${placa}`);
      }
    } catch (error) {
      showNotification('error', `Error de conexión al liberar la unidad ${placa}`);
      console.error("Error en la petición:", error);
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
          ? `https://velsat.pe:2096/api/Preplan/HabilitarUnidad/${selectedUnidad}`
          : `https://velsat.pe:2096/api/Preplan/DeshabilitarUnidad/${selectedUnidad}`;

      const response = await fetch(url, { method: "POST" });
      
      if (response.ok) {
        showNotification('success', `Unidad ${selectedUnidad} ${accion === 'habilitar' ? 'habilitada' : 'deshabilitada'} exitosamente`);
        fetchUnidades(); // refrescar
      } else {
        showNotification('error', `Error al ${accion} la unidad ${selectedUnidad}`);
      }
    } catch (error) {
      showNotification('error', `Error de conexión al ${accion} la unidad`);
      console.error("Error en la petición:", error);
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

  const totalPages = Math.ceil(unidadesFiltradas.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const unidadesPaginadas = unidadesFiltradas.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchText]);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  return (
    <div className="p-2 space-y-6">
      {/* Sistema de notificaciones */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`flex items-center gap-3 p-4 rounded-lg shadow-lg border min-w-[300px] animate-in slide-in-from-right duration-300 ${
              notification.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            )}
            
            <span className="flex-1 text-sm font-medium">
              {notification.message}
            </span>
            
            <button
              onClick={() => removeNotification(notification.id)}
              className="text-gray-500 hover:text-gray-700 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="mb-2 bg-white border border-gray-200 p-2 shadow-sm flex-shrink-0">
        <h3 className="text-sm text-gray-800 mb-1 font-semibold">
          Buscar Unidades
        </h3>

        <div className="flex flex-col sm:flex-row gap-4 items-center">
          {/* Buscador */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 w-4 h-4 text-gray-400 top-1/2 transform -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Buscar unidades..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-10 pr-4"
            />
          </div>
          {/* <Button
            size="sm"
            variant="outline"
            className="text-blue-100 bg-green-700 border-blue-200"
            onClick={() => setShowLiberarTodasDialog(true)}
            disabled={loadingLiberarTodas || loadingLiberar}
          >
            <FileText className="w-4 h-4 mr-1" />
            Liberar Unidades
          </Button> */}
        </div>
      </div>

      <div className="shadow-lg border overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto" ref={tableRef}>
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-600">
                <TableHead className="text-white text-center w-16">
                  ITEM
                </TableHead>
                <TableHead className="text-white text-center">
                  Unidades
                </TableHead>
                <TableHead className="text-white text-center">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unidadesPaginadas.map((unidad, index) => (
                <TableRow
                  key={unidad.codunidad}
                  className="hover:bg-gray-200 transition-colors"
                >
                  <TableCell className="text-center">
                    {startIndex + index + 1}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="font-mono">
                      {unidad.codunidad}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-blue-100 bg-green-700 border-blue-200"
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
                        variant="outline"
                        className="text-blue-100 bg-blue-700 border-blue-200"
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        Documentos
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-gray-800 bg-yellow-500 border-purple-200"
                      >
                        <Settings className="w-4 h-4 mr-1" />
                        Mantenimientos
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className={`${
                          unidad.habilitado === "1"
                            ? "text-red-100 bg-red-600 border-red-200"
                            : "text-green-100 bg-green-600 border-green-200"
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {unidadesFiltradas.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No se encontraron unidades que coincidan con: {searchText}</p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="border bg-white px-6 py-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Mostrando {startIndex + 1}-
            {Math.min(endIndex, unidadesFiltradas.length)} de{" "}
            {unidadesFiltradas.length} unidades
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNumber: number;
                if (totalPages <= 5) {
                  pageNumber = i + 1;
                } else if (currentPage <= 3) {
                  pageNumber = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNumber = totalPages - 4 + i;
                } else {
                  pageNumber = currentPage - 2 + i;
                }

                return (
                  <Button
                    key={pageNumber}
                    variant={currentPage === pageNumber ? "default" : "outline"}
                    size="sm"
                    onClick={() => goToPage(pageNumber)}
                    className="h-8 w-8 p-0"
                  >
                    {pageNumber}
                  </Button>
                );
              })}

              {totalPages > 5 && currentPage < totalPages - 2 && (
                <>
                  <span className="text-gray-400 px-1">...</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(totalPages)}
                    className="h-8 w-8 p-0"
                  >
                    {totalPages}
                  </Button>
                </>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={showLiberarTodasDialog} onOpenChange={setShowLiberarTodasDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm text-gray-800">
              ¿Estás seguro que deseas liberar <strong>TODAS</strong> las unidades?
              <br />
              <span className="text-red-600 font-normal">
                Esta acción eliminará las rutas actuales de todas las unidades.
              </span>
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLiberarTodasUnidades}
              disabled={loadingLiberarTodas}
              className="bg-red-600 hover:bg-red-700"
            >
              {loadingLiberarTodas ? "Liberando todas..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showLiberarDialog} onOpenChange={setShowLiberarDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm text-gray-800">
              ¿Estás seguro que deseas liberar la unidad{" "}
              <strong>{selectedUnidadLiberar}</strong>
              ?, esto eliminará la ruta actual.
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                selectedUnidadLiberar &&
                handleLiberarUnidad(selectedUnidadLiberar)
              }
              disabled={loadingLiberar || loadingLiberarTodas}
            >
              {loadingLiberar ? "Liberando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!selectedUnidad}
        onOpenChange={() => setSelectedUnidad(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm text-gray-800">
              ¿Estás seguro que deseas {accion} la unidad{" "}
              <strong>{selectedUnidad}</strong>?
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleHabilitarDeshabilitar}
              disabled={loading || loadingLiberarTodas}
            >
              {loading ? "Procesando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}