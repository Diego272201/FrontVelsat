"use client";
import React, { useState, useEffect } from "react";
import {
  Image,
  Trash2,
  FileCheck,
  Eye,
  UserX,
  ChevronLeft,
  ChevronRight,
  Loader2,
  UserCheck,
} from "lucide-react";
import ConductorDialog from "@/app/components/modal/addConductor";
import ConductorDialogModificar from "@/app/components/modal/editConductor";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/app/components/ui/alert-dialog";

// Definir tipos
interface Conductor {
  id: number;
  nombre: string;
  telefono: string;
  correo: string;
}

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

export default function Page() {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [conductores, setConductores] = useState<Conductor[]>([]);
  const [conductoresAPI, setConductoresAPI] = useState<ConductorAPI[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [eliminandoLoading, setEliminandoLoading] = useState<number | null>(
    null
  );
  const [liberandoLoading, setLiberandoLoading] = useState<number | null>(null);
  const [habilitandoLoading, setHabilitandoLoading] = useState<number | null>(
    null
  );

  // Función para obtener datos de la API
  const fetchConductores = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        "https://velsat.pe:2096/api/Preplan/conductores/movilbus"
      );

      if (!response.ok) {
        throw new Error("Error al obtener los datos");
      }

      const data: ConductorAPI[] = await response.json();

      setConductoresAPI(data);

      const transformedData: Conductor[] = data.map(
        (conductor: ConductorAPI) => ({
          id: conductor.codigo,
          nombre: conductor.apellidos.trim(),
          telefono: conductor.telefono || "",
          correo: conductor.email || "",
        })
      );

      setConductores(transformedData);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Error desconocido";
      setError(errorMessage);
      console.error("Error fetching conductores:", err);
    } finally {
      setLoading(false);
    }
  };

  // Función para liberar conductor
  const liberarConductor = async (id: number) => {
    try {
      setLiberandoLoading(id);
      const response = await fetch(
        `https://velsat.pe:2096/api/Preplan/Liberar/${id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Error al liberar el conductor");
      }

      // Actualizar los datos después de la operación exitosa
      await fetchConductores();
      console.log("Conductor liberado exitosamente");
    } catch (err: unknown) {
      console.error("Error liberando conductor:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Error desconocido";
      alert("Error al liberar el conductor: " + errorMessage);
    } finally {
      setLiberandoLoading(null);
    }
  };

  // Función para deshabilitar conductor
  const deshabilitarConductor = async (id: number) => {
    try {
      setHabilitandoLoading(id);
      const response = await fetch(
        `https://velsat.pe:2096/api/Preplan/DeshabilitarCond/${id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Error al deshabilitar el conductor");
      }

      // Actualizar visualmente: mover al final del array
      setConductores((prevConductores) => {
        const conductorIndex = prevConductores.findIndex((c) => c.id === id);
        if (conductorIndex !== -1) {
          const conductor = prevConductores[conductorIndex];
          const newConductores = [...prevConductores];
          newConductores.splice(conductorIndex, 1);
          newConductores.push(conductor);
          return newConductores;
        }
        return prevConductores;
      });

      // Actualizar también el estado de la API
      setConductoresAPI((prevAPI) =>
        prevAPI.map((c) => (c.codigo === id ? { ...c, habilitado: "0" } : c))
      );

      console.log("Conductor deshabilitado exitosamente");
    } catch (err: unknown) {
      console.error("Error deshabilitando conductor:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Error desconocido";
      alert("Error al deshabilitar el conductor: " + errorMessage);
    } finally {
      setHabilitandoLoading(null);
    }
  };

  // Función para habilitar conductor
  const habilitarConductor = async (id: number) => {
    try {
      setHabilitandoLoading(id);
      const response = await fetch(
        `https://velsat.pe:2096/api/Preplan/HabilitarCond/${id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Error al habilitar el conductor");
      }

      // Actualizar visualmente: mover a su posición original
      setConductores((prevConductores) => {
        const conductorIndex = prevConductores.findIndex((c) => c.id === id);
        if (conductorIndex !== -1) {
          const conductor = prevConductores[conductorIndex];
          const newConductores = [...prevConductores];
          newConductores.splice(conductorIndex, 1);
          // Insertar en una posición que no sea al final
          const insertPosition = Math.max(0, newConductores.length - 5);
          newConductores.splice(insertPosition, 0, conductor);
          return newConductores;
        }
        return prevConductores;
      });

      // Actualizar también el estado de la API
      setConductoresAPI((prevAPI) =>
        prevAPI.map((c) => (c.codigo === id ? { ...c, habilitado: "1" } : c))
      );

      console.log("Conductor habilitado exitosamente");
    } catch (err: unknown) {
      console.error("Error habilitando conductor:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Error desconocido";
      alert("Error al habilitar el conductor: " + errorMessage);
    } finally {
      setHabilitandoLoading(null);
    }
  };

  // Función para eliminar conductor
  const eliminarConductor = async (id: number) => {
    try {
      setEliminandoLoading(id);
      const response = await fetch(
        `https://velsat.pe:2096/api/Preplan/Eliminar/${id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Error al eliminar el conductor");
      }

      // Actualizar los datos después de la operación exitosa
      await fetchConductores();
      console.log("Conductor eliminado exitosamente");
    } catch (err: unknown) {
      console.error("Error eliminando conductor:", err);
      const errorMessage = err instanceof Error ? err.message : "Error desconocido";
      alert("Error al eliminar el conductor: " + errorMessage);
    } finally {
      setEliminandoLoading(null);
    }
  };

  // Función para manejar cuando se agrega un nuevo conductor
  const handleConductorAdded = () => {
    fetchConductores();
    console.log("Conductor agregado, actualizando lista...");
  };

  // Función para manejar cuando se modifica un conductor
  const handleConductorModified = (modifiedConductor: ConductorAPI) => {
    // Actualizar la lista de conductores API
    setConductoresAPI((prev) =>
      prev.map((conductor) =>
        conductor.codigo === modifiedConductor.codigo
          ? modifiedConductor
          : conductor
      )
    );

    // Actualizar la lista de conductores para la vista
    setConductores((prev) =>
      prev.map((conductor) =>
        conductor.id === modifiedConductor.codigo
          ? {
              id: modifiedConductor.codigo,
              nombre: modifiedConductor.apellidos.trim(),
              telefono: modifiedConductor.telefono || "",
              correo: modifiedConductor.email || "",
            }
          : conductor
      )
    );
  };

  // Función para obtener los datos completos de un conductor
  const getConductorData = (conductorId: number): ConductorAPI | null => {
    return (
      conductoresAPI.find((conductor) => conductor.codigo === conductorId) ||
      null
    );
  };

  // Función para verificar si un conductor está habilitado
  const isConductorHabilitado = (conductorId: number): boolean => {
    const conductor = getConductorData(conductorId);
    return conductor?.habilitado === "1";
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    fetchConductores();
  }, []);

  // Calcular items por página basado en el alto de pantalla
  useEffect(() => {
    const calculateItemsPerPage = () => {
      const headerHeight = 60;
      const searchBarHeight = 80;
      const paginationHeight = 60;
      const tableHeaderHeight = 40;
      const rowHeight = 40;
      const containerPadding = 32;
      const marginBetween = 8;
      const extraBuffer = 30;

      const availableHeight =
        window.innerHeight -
        headerHeight -
        searchBarHeight -
        paginationHeight -
        tableHeaderHeight -
        containerPadding -
        marginBetween -
        extraBuffer;

      const calculatedItems = Math.floor(availableHeight / rowHeight);
      const items = Math.max(8, Math.min(20, calculatedItems));
      setItemsPerPage(items);
    };

    calculateItemsPerPage();

    const handleResize = () => {
      calculateItemsPerPage();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const filteredConductores = conductores.filter((conductor) =>
    conductor.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calcular paginación
  const totalPages = Math.ceil(filteredConductores.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentConductores = filteredConductores.slice(startIndex, endIndex);

  // Resetear a página 1 cuando se cambia la búsqueda o items per page
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Componente de loading
  const LoadingSpinner = () => (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      <span className="ml-2 text-gray-600">
        Cargando conductores...
      </span>
    </div>
  );

  // Componente de error
  const ErrorMessage = () => (
    <div className="flex items-center justify-center py-8">
      <div className="text-center">
        <p className="text-red-600 mb-2">
          Error al cargar los datos
        </p>
        <p className="text-gray-600 text-sm">{error}</p>
        <button
          onClick={fetchConductores}
          className="mt-2 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 h-8 px-3"
        >
          Reintentar
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-2 flex flex-col overflow-hidden">
      <div className="flex flex-col h-full">
        <div className="mb-2 bg-white border border-gray-200 p-2  shadow-sm flex-shrink-0">
          <h3 className="text-sm text-gray-800 mb-1 font-semibold">
            Buscar Conductores
          </h3>

          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <input
                placeholder="Buscar conductor..."
                value={searchTerm}
                onChange={handleSearchChange}
                disabled={loading}
                className="flex h-8 w-full border border-gray-300 bg-white px-3 py-1 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              />
            </div>

            <ConductorDialog onConductorAdded={handleConductorAdded} />

            {/* <button
              disabled={loading}
              className="inline-flex items-center justify-center text-sm font-medium transition-colors border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 h-8 px-3 py-1 disabled:opacity-50"
            >
              <FileText className="h-4 w-4 mr-1" />
              Exportar
            </button> */}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 shadow-sm overflow-hidden flex-shrink-0">
          <div
            className="overflow-auto"
            style={{ height: `${itemsPerPage * 40 + 40}px` }}
          >
            {loading ? (
              <LoadingSpinner />
            ) : error ? (
              <ErrorMessage />
            ) : (
              <table className="w-full">
                <thead className="sticky top-0 bg-gray-600 z-10 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">
                      ITEM
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">
                      NOMBRE
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">
                      TELEFONO
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">
                      CORREO
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">
                      ACCIONES
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentConductores.map((conductor, index) => (
                    <tr
                      key={conductor.id}
                      className={`transition-colors hover:bg-gray-50 `}
                      style={{ height: "40px" }}
                    >
                      <td className="px-3 py-1 text-sm text-gray-900">
                        {startIndex + index + 1}
                      </td>
                      <td className="px-3 py-1 text-xs text-gray-900 uppercase">
                        {conductor.nombre}
                      </td>
                      <td className="px-3 py-1 text-sm text-gray-600">
                        {conductor.telefono || "-"}
                      </td>
                      <td className="px-3 py-1 text-sm text-gray-600">
                        {conductor.correo || "-"}
                      </td>
                      <td className="px-3 py-1">
                        <div className="flex flex-wrap gap-1">
                          <ConductorDialogModificar
                            conductorData={getConductorData(conductor.id)}
                            onConductorModified={handleConductorModified}
                          />

                          <button className="inline-flex items-center justify-center rounded text-xs font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 h-7 px-3">
                            <Image size={12} className="mr-1" />
                            Imagen
                          </button>

                          {/* Eliminar Conductor */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button
                                className="inline-flex items-center justify-center rounded text-xs font-medium transition-colors bg-red-600 text-white hover:bg-red-700 h-7 px-3 disabled:opacity-50"
                                disabled={eliminandoLoading === conductor.id}
                              >
                                {eliminandoLoading === conductor.id ? (
                                  <Loader2
                                    size={12}
                                    className="mr-1 animate-spin"
                                  />
                                ) : (
                                  <Trash2 size={12} className="mr-1" />
                                )}
                                Eliminar
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  ¿Estás seguro?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. Esto
                                  eliminará permanentemente el conductor &quot;
                                  {conductor.nombre}&quot; del sistema.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="bg-red-700">Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    eliminarConductor(conductor.id)
                                  }
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                          {/* Liberar Conductor */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button
                                className="inline-flex items-center justify-center rounded text-xs font-medium transition-colors bg-yellow-400 text-yellow-800 hover:bg-yellow-200 h-7 px-3 disabled:opacity-50"
                                disabled={liberandoLoading === conductor.id}
                              >
                                {liberandoLoading === conductor.id ? (
                                  <Loader2
                                    size={12}
                                    className="mr-1 animate-spin"
                                  />
                                ) : (
                                  <Eye size={12} className="mr-1" />
                                )}
                                Liberar
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  ¿Estás seguro?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  ¿Deseas liberar al conductor &quot;
                                  {conductor.nombre}&quot;? Esta acción liberará
                                  al conductor de su unidad actual.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="bg-red-600">Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => liberarConductor(conductor.id)}
                                  className="bg-yellow-600 hover:bg-yellow-700"
                                >
                                  Liberar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                          <button className="inline-flex items-center justify-center rounded text-xs font-medium transition-colors bg-purple-100 text-purple-800 hover:bg-purple-200 h-7 px-3">
                            <FileCheck size={12} className="mr-1" />
                            Documentos
                          </button>

                          {/* Habilitar/Deshabilitar Conductor */}
                          {isConductorHabilitado(conductor.id) ? (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button
                                  className="inline-flex items-center justify-center rounded text-xs font-medium transition-colors bg-gray-300 text-gray-800 hover:bg-gray-400 h-7 px-3 disabled:opacity-50"
                                  disabled={habilitandoLoading === conductor.id}
                                >
                                  {habilitandoLoading === conductor.id ? (
                                    <Loader2
                                      size={12}
                                      className="mr-1 animate-spin"
                                    />
                                  ) : (
                                    <UserX size={12} className="mr-1" />
                                  )}
                                  Deshabilitar
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    ¿Estás seguro?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    ¿Deseas deshabilitar al conductor &quot;
                                    {conductor.nombre}&quot;? El conductor no
                                    podrá ser asignado a unidades mientras esté
                                    deshabilitado.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="bg-red-600">
                                    Cancelar
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      deshabilitarConductor(conductor.id)
                                    }
                                    className="bg-gray-500 hover:bg-gray-400"
                                  >
                                    Deshabilitar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          ) : (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button
                                  className="inline-flex items-center justify-center rounded text-sm font-medium transition-colors bg-green-600 text-white hover:bg-green-700 h-7 px-3 disabled:opacity-50"
                                  disabled={habilitandoLoading === conductor.id}
                                >
                                  {habilitandoLoading === conductor.id ? (
                                    <Loader2
                                      size={12}
                                      className="mr-1 animate-spin"
                                    />
                                  ) : (
                                    <UserCheck size={12} className="mr-1" />
                                  )}
                                  Habilitar
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    ¿Estás seguro?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    ¿Deseas habilitar al conductor &quot;
                                    {conductor.nombre}&quot;? El conductor podrá
                                    ser asignado a unidades una vez habilitado.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>
                                    Cancelar
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      habilitarConductor(conductor.id)
                                    }
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    Habilitar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Pagination Controls */}
        {!loading && !error && totalPages > 1 && (
          <div className="mt-4 bg-white border border-gray-200 ">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">
                    Mostrando {startIndex + 1} a{" "}
                    {Math.min(endIndex, filteredConductores.length)} de{" "}
                    {filteredConductores.length} conductores
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 h-9 px-3"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Anterior
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                      let page: number;
                      if (totalPages <= 7) {
                        page = i + 1;
                      } else if (currentPage <= 4) {
                        page = i + 1;
                      } else if (currentPage >= totalPages - 3) {
                        page = totalPages - 6 + i;
                      } else {
                        page = currentPage - 3 + i;
                      }

                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none w-8 h-8 ${
                            currentPage === page
                              ? "bg-blue-600 text-white hover:bg-blue-700"
                              : "border border-gray-300 bg-white text-gray-900 hover:bg-gray-50"
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 h-9 px-3"
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}