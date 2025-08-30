'use client';
import React, { useState, useEffect } from 'react';
import {
  Image,
  Trash2,
  FileCheck,
  Eye,
  UserX,
  Loader2,
  UserCheck,
  Users,
  Search,
} from 'lucide-react';
import ConductorDialog from '@/app/components/modal/addConductor';
import ConductorDialogModificar from '@/app/components/modal/editConductor';
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
} from '@/app/components/ui/alert-dialog';
import { useUsername } from '@/hooks/useUsername';

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
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [conductores, setConductores] = useState<Conductor[]>([]);
  const [conductoresAPI, setConductoresAPI] = useState<ConductorAPI[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [eliminandoLoading, setEliminandoLoading] = useState<number | null>(null);
  const [liberandoLoading, setLiberandoLoading] = useState<number | null>(null);
  const [habilitandoLoading, setHabilitandoLoading] = useState<number | null>(null);
  const { username, isReady } = useUsername(); // ✅ Agregar esta línea

  // Función para obtener datos de la API
  const fetchConductores = async () => {
    if (!isReady) return; 

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `https://velsat.pe:2096/api/Preplan/conductores/${username}`,
      );

      if (!response.ok) {
        throw new Error('Error al obtener los datos');
      }

      const data: ConductorAPI[] = await response.json();

      setConductoresAPI(data);

      const transformedData: Conductor[] = data.map(
        (conductor: ConductorAPI) => ({
          id: conductor.codigo,
          nombre: conductor.apellidos.trim(),
          telefono: conductor.telefono || '',
          correo: conductor.email || '',
        }),
      );

      setConductores(transformedData);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      console.error('Error fetching conductores:', err);
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
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error('Error al liberar el conductor');
      }

      await fetchConductores();
      console.log('Conductor liberado exitosamente');
    } catch (err: unknown) {
      console.error('Error liberando conductor:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Error desconocido';
      alert('Error al liberar el conductor: ' + errorMessage);
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
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error('Error al deshabilitar el conductor');
      }

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

      setConductoresAPI((prevAPI) =>
        prevAPI.map((c) => (c.codigo === id ? { ...c, habilitado: '0' } : c)),
      );

      console.log('Conductor deshabilitado exitosamente');
    } catch (err: unknown) {
      console.error('Error deshabilitando conductor:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Error desconocido';
      alert('Error al deshabilitar el conductor: ' + errorMessage);
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
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error('Error al habilitar el conductor');
      }

      setConductores((prevConductores) => {
        const conductorIndex = prevConductores.findIndex((c) => c.id === id);
        if (conductorIndex !== -1) {
          const conductor = prevConductores[conductorIndex];
          const newConductores = [...prevConductores];
          newConductores.splice(conductorIndex, 1);
          const insertPosition = Math.max(0, newConductores.length - 5);
          newConductores.splice(insertPosition, 0, conductor);
          return newConductores;
        }
        return prevConductores;
      });

      setConductoresAPI((prevAPI) =>
        prevAPI.map((c) => (c.codigo === id ? { ...c, habilitado: '1' } : c)),
      );

      console.log('Conductor habilitado exitosamente');
    } catch (err: unknown) {
      console.error('Error habilitando conductor:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Error desconocido';
      alert('Error al habilitar el conductor: ' + errorMessage);
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
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error('Error al eliminar el conductor');
      }

      await fetchConductores();
      console.log('Conductor eliminado exitosamente');
    } catch (err: unknown) {
      console.error('Error eliminando conductor:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Error desconocido';
      alert('Error al eliminar el conductor: ' + errorMessage);
    } finally {
      setEliminandoLoading(null);
    }
  };

  // Función para manejar cuando se agrega un nuevo conductor
  const handleConductorAdded = () => {
    fetchConductores();
    console.log('Conductor agregado, actualizando lista...');
  };

  // Función para manejar cuando se modifica un conductor
  const handleConductorModified = (modifiedConductor: ConductorAPI) => {
    setConductoresAPI((prev) =>
      prev.map((conductor) =>
        conductor.codigo === modifiedConductor.codigo
          ? modifiedConductor
          : conductor,
      ),
    );

    setConductores((prev) =>
      prev.map((conductor) =>
        conductor.id === modifiedConductor.codigo
          ? {
              id: modifiedConductor.codigo,
              nombre: modifiedConductor.apellidos.trim(),
              telefono: modifiedConductor.telefono || '',
              correo: modifiedConductor.email || '',
            }
          : conductor,
      ),
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
    return conductor?.habilitado === '1';
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    fetchConductores();
  }, [isReady, username]);

  const filteredConductores = conductores.filter((conductor) =>
    conductor.nombre.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Componente de loading
  const LoadingSpinner = () => (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      <span className="ml-3 text-gray-600 text-lg">Cargando conductores...</span>
    </div>
  );

  // Componente de error
  const ErrorMessage = () => (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <p className="mb-3 text-red-600 text-lg font-medium">Error al cargar los datos</p>
        <p className="text-sm text-gray-600 mb-4">{error}</p>
        <button
          onClick={fetchConductores}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-6 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Reintentar
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header moderno */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-[14px] font-bold text-gray-900 tracking-tight uppercase">
                  Gestión de Conductores
                </h1>
                <p className="text-gray-600 mt-1 text-[12px]">
                  Administra y controla la información de todos los conductores
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="bg-blue-50 px-4 py-2 border border-blue-200">
                <span className="text-sm font-medium text-blue-700">
                  Total: {conductores.length} conductores
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className=" mx-auto px-4 py-2">
        {/* Barra de búsqueda y acciones */}
        <div className="shadow-sm border border-gray-200 p-0 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                placeholder="Buscar conductor por nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={loading}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:opacity-50 transition-all duration-200"
              />
            </div>
            <div className="flex-shrink-0">
              <ConductorDialog onConductorAdded={handleConductorAdded} />
            </div>
          </div>


          {searchTerm && (
            <div className="mt-3 text-sm text-gray-600">
              Mostrando {filteredConductores.length} de {conductores.length} conductores
            </div>
          )}
        </div>

        {/* Tabla con scroll */}
        <div className="bg-white  shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <LoadingSpinner />
          ) : error ? (
            <ErrorMessage />
          ) : (
            <div className="overflow-x-auto">
              <div className="max-h-[calc(100vh-160px)] overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 z-10 bg-gradient-to-r from-gray-800 to-gray-700 shadow-sm">
                    <tr>
                      <th className="px-6 py-2 text-left text-xs font-semibold uppercase tracking-wider text-white">
                        #
                      </th>
                      <th className="px-6 py-2 text-left text-xs font-semibold uppercase tracking-wider text-white">
                        Nombre
                      </th>
                      <th className="px-6 py-2 text-left text-xs font-semibold uppercase tracking-wider text-white">
                        Teléfono
                      </th>
                      <th className="px-6 py-2 text-left text-xs font-semibold uppercase tracking-wider text-white">
                        Correo
                      </th>
                      <th className="px-6 py-2 text-left text-xs font-semibold uppercase tracking-wider text-white">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredConductores.map((conductor, index) => (
                      <tr
                        key={conductor.id}
                        className="transition-all duration-200 hover:bg-gray-50 hover:shadow-sm"
                      >
                        <td className="px-6 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                          {index + 1}
                        </td>
                        <td className="px-6 py-2 whitespace-nowrap">
                          <div className="text-[12px] text-gray-900 uppercase">
                            {conductor.nombre}
                          </div>
                        </td>
                        <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-600">
                          {conductor.telefono || (
                            <span className="text-gray-400 italic">No disponible</span>
                          )}
                        </td>
                        <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-600">
                          {conductor.correo || (
                            <span className="text-gray-400 italic">No disponible</span>
                          )}
                        </td>
                        <td className="px-6 py-2 whitespace-nowrap">
                          <div className="flex flex-wrap gap-2">
                            <ConductorDialogModificar
                              conductorData={getConductorData(conductor.id)}
                              onConductorModified={handleConductorModified}
                            />

                            <button className="inline-flex items-center justify-center h-8 px-3 rounded-lg bg-blue-600 text-xs font-medium text-white transition-all duration-200 hover:bg-blue-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1">
                              <Image size={14} className="mr-1" />
                              Imagen
                            </button>

                            {/* Eliminar Conductor */}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button
                                  className="inline-flex items-center justify-center h-8 px-3 rounded-lg bg-red-600 text-xs font-medium text-white transition-all duration-200 hover:bg-red-700 hover:shadow-md disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                                  disabled={eliminandoLoading === conductor.id}
                                >
                                  {eliminandoLoading === conductor.id ? (
                                    <Loader2 size={14} className="mr-1 animate-spin" />
                                  ) : (
                                    <Trash2 size={14} className="mr-1" />
                                  )}
                                  Eliminar
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta acción no se puede deshacer. Esto eliminará permanentemente el conductor &quot;{conductor.nombre}&quot; del sistema.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => eliminarConductor(conductor.id)}
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
                                  className="inline-flex items-center justify-center h-8 px-3 rounded-lg bg-yellow-500 text-xs font-medium text-white transition-all duration-200 hover:bg-yellow-600 hover:shadow-md disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-1"
                                  disabled={liberandoLoading === conductor.id}
                                >
                                  {liberandoLoading === conductor.id ? (
                                    <Loader2 size={14} className="mr-1 animate-spin" />
                                  ) : (
                                    <Eye size={14} className="mr-1" />
                                  )}
                                  Liberar
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    ¿Deseas liberar al conductor &quot;{conductor.nombre}&quot;? Esta acción liberará al conductor de su unidad actual.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => liberarConductor(conductor.id)}
                                    className="bg-yellow-600 hover:bg-yellow-700"
                                  >
                                    Liberar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>

                            <button className="inline-flex items-center justify-center h-8 px-3 rounded-lg bg-purple-600 text-xs font-medium text-white transition-all duration-200 hover:bg-purple-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1">
                              <FileCheck size={14} className="mr-1" />
                              Documentos
                            </button>

                            {/* Habilitar/Deshabilitar Conductor */}
                            {isConductorHabilitado(conductor.id) ? (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <button
                                    className="inline-flex items-center justify-center h-8 px-3 rounded-lg bg-gray-500 text-xs font-medium text-white transition-all duration-200 hover:bg-gray-600 hover:shadow-md disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1"
                                    disabled={habilitandoLoading === conductor.id}
                                  >
                                    {habilitandoLoading === conductor.id ? (
                                      <Loader2 size={14} className="mr-1 animate-spin" />
                                    ) : (
                                      <UserX size={14} className="mr-1" />
                                    )}
                                    Deshabilitar
                                  </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      ¿Deseas deshabilitar al conductor &quot;{conductor.nombre}&quot;? El conductor no podrá ser asignado a unidades mientras esté deshabilitado.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deshabilitarConductor(conductor.id)}
                                      className="bg-gray-600 hover:bg-gray-700"
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
                                    className="inline-flex items-center justify-center h-8 px-3 rounded-lg bg-green-600 text-xs font-medium text-white transition-all duration-200 hover:bg-green-700 hover:shadow-md disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1"
                                    disabled={habilitandoLoading === conductor.id}
                                  >
                                    {habilitandoLoading === conductor.id ? (
                                      <Loader2 size={14} className="mr-1 animate-spin" />
                                    ) : (
                                      <UserCheck size={14} className="mr-1" />
                                    )}
                                    Habilitar
                                  </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      ¿Deseas habilitar al conductor &quot;{conductor.nombre}&quot;? El conductor podrá ser asignado a unidades una vez habilitado.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => habilitarConductor(conductor.id)}
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
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}