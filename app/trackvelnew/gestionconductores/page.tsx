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
import { Spinner } from '@nextui-org/react';
import { Toaster } from 'sonner';

// Definir tipos
interface Conductor {
  id: number;
  nombre: string;
  telefono: string;
  correo: string;
  tipo: string | null;
}

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
  unidadasig: string | null;
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
  tipo: string | null;
}

export default function Page() {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [conductores, setConductores] = useState<Conductor[]>([]);
  const [conductoresAPI, setConductoresAPI] = useState<ConductorAPI[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [eliminandoLoading, setEliminandoLoading] = useState<number | null>(
    null,
  );
  const { username, isReady } = useUsername();

  // Función para obtener datos de la API
  const fetchConductores = async () => {
    if (!isReady) return;

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `https://do.velsat.pe:2083/api/Preplan/conductores/${username}`,
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
          tipo: conductor.tipo || null,
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

  // Función para eliminar conductor
  const eliminarConductor = async (id: number) => {
    try {
      setEliminandoLoading(id);
      const response = await fetch(
        `https://do.velsat.pe:2083/api/Preplan/Eliminar/${id}`,
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
              tipo: modifiedConductor.tipo || '',
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
    <div className="flex flex-col items-center justify-center py-12">
      <Spinner color="primary" size="md" />
      <span className="text-md mt-3 text-gray-600">
        Cargando conductores...
      </span>
    </div>
  );
  // Componente de error
  const ErrorMessage = () => (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <p className="mb-3 text-lg font-medium text-red-600">
          Error al cargar los datos
        </p>
        <p className="mb-4 text-sm text-gray-600">{error}</p>
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
      <Toaster richColors />
      {/* Header moderno */}
      <div className="border-b border-gray-200 bg-[#113EB9] shadow-lg">
        <div className="px-4 py-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex h-10 w-10 items-center justify-center  bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 shadow-xl">
                <Users className="h-6 w-6 text-white drop-shadow-md" />
              </div>

              <div>
                <h1 className="text-[14px] font-bold uppercase tracking-tight text-white">
                  Gestión de Conductores
                </h1>
                <p className="mt-0 text-[12px] text-gray-200">
                  Administra y controla la información de todos los conductores
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className=" px-4 py-1 ">
                <span className="text-sm font-medium text-white">
                  Total: {conductores.length} conductores
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="mx-auto px-4 py-2">
        {/* Barra de búsqueda y acciones */}
        <div className="mb-3 p-0">
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                placeholder="Buscar conductor por nombre"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={loading}
                className="block w-full border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm leading-5 placeholder-gray-500 transition-all duration-200 focus:border-transparent focus:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>
            <div className="flex-shrink-0">
              <ConductorDialog onConductorAdded={handleConductorAdded} />
            </div>
          </div>

          {searchTerm && (
            <div className="mt-3 text-sm text-gray-600">
              Mostrando {filteredConductores.length} de {conductores.length}{' '}
              conductores
            </div>
          )}
        </div>

        {/* Tabla con scroll */}
        <div className="overflow-hidden  border border-gray-200 bg-white shadow-sm">
          {loading ? (
            <LoadingSpinner />
          ) : error ? (
            <ErrorMessage />
          ) : (
            <div className="overflow-x-auto">
              <div className="max-h-[calc(100vh-150px)] overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 z-10 bg-gray-100">
                    <tr>
                      <th className="px-6 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-800">
                        #
                      </th>
                      <th className="px-6 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-800">
                        Nombre
                      </th>
                      <th className="px-6 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-800">
                        Teléfono
                      </th>
                      <th className="px-6 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-800">
                        Correo
                      </th>
                      <th className="px-6 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-800">
                        Tipo
                      </th>
                      <th className="px-6 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-800">
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
                        <td className="whitespace-nowrap px-6 py-2 text-sm font-medium text-gray-900">
                          {index + 1}
                        </td>
                        <td className="whitespace-nowrap px-6 py-2">
                          <div className="text-[12px] uppercase text-gray-900">
                            {conductor.nombre}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-2 text-sm text-gray-600">
                          {conductor.telefono || (
                            <span className="italic text-gray-400">
                              No disponible
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-2 text-sm text-gray-600">
                          {conductor.correo || (
                            <span className="italic text-gray-400">
                              No disponible
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-2 text-sm text-gray-600">
                          {conductor.tipo || (
                            <span className="italic text-gray-400">
                              No disponible
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-2">
                          <div className="flex min-w-max gap-1 overflow-x-auto">
                            <ConductorDialogModificar
                              conductorData={getConductorData(conductor.id)}
                              onConductorModified={handleConductorModified}
                            />

                            {/* Eliminar Conductor */}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button
                                  className="inline-flex h-8 items-center justify-center rounded-lg bg-red-600 px-3 text-xs font-medium text-white transition-all duration-200 hover:bg-red-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 disabled:opacity-50"
                                  disabled={eliminandoLoading === conductor.id}
                                >
                                  {eliminandoLoading === conductor.id ? (
                                    <Loader2
                                      size={14}
                                      className="mr-1 animate-spin"
                                    />
                                  ) : (
                                    <Trash2 size={14} className="mr-1" />
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
                                    eliminará permanentemente el conductor
                                    &quot;{conductor.nombre}&quot; del sistema.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>
                                    Cancelar
                                  </AlertDialogCancel>
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

                            <button
                              onClick={() =>
                                window.open(
                                  `/trackvelnew/gestionconductores/gestiondocs?codtaxi=${conductor.id}&nombre=${encodeURIComponent(conductor.nombre)}`,
                                  '_blank',
                                )
                              }
                              className="inline-flex h-8 items-center justify-center rounded-lg bg-purple-600 px-3 text-xs font-medium text-white transition-all duration-200 hover:bg-purple-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1"
                            >
                              <FileCheck size={14} className="mr-1" />
                              Documentos
                            </button>
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
