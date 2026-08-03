'use client';
import React, { useState, useEffect } from 'react';
import {
  Trash2,
  FileCheck,
  Loader2,
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
  const [eliminandoLoading, setEliminandoLoading] = useState<number | null>(null);
  const { username, isReady } = useUsername();

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

      const transformedData: Conductor[] = data.map((conductor: ConductorAPI) => ({
        id: conductor.codigo,
        nombre: conductor.apellidos.trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
        telefono: conductor.telefono || '',
        correo: conductor.email || '',
        tipo: conductor.tipo || null,
      }));

      setConductores(transformedData);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const eliminarConductor = async (id: number) => {
    try {
      setEliminandoLoading(id);
      const response = await fetch(
        `https://do.velsat.pe:2083/api/Preplan/Eliminar/${id}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        },
      );

      if (!response.ok) {
        throw new Error('Error al eliminar el conductor');
      }

      await fetchConductores();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      alert('Error al eliminar el conductor: ' + errorMessage);
    } finally {
      setEliminandoLoading(null);
    }
  };

  const handleConductorAdded = () => {
    fetchConductores();
  };

  const handleConductorModified = (modifiedConductor: ConductorAPI) => {
    setConductoresAPI((prev) =>
      prev.map((conductor) =>
        conductor.codigo === modifiedConductor.codigo ? modifiedConductor : conductor,
      ),
    );

    setConductores((prev) =>
      prev.map((conductor) =>
        conductor.id === modifiedConductor.codigo
          ? {
              id: modifiedConductor.codigo,
              nombre: modifiedConductor.apellidos.trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
              telefono: modifiedConductor.telefono || '',
              correo: modifiedConductor.email || '',
              tipo: modifiedConductor.tipo || '',
            }
          : conductor,
      ),
    );
  };

  const getConductorData = (conductorId: number): ConductorAPI | null => {
    return conductoresAPI.find((conductor) => conductor.codigo === conductorId) || null;
  };

  useEffect(() => {
    fetchConductores();
  }, [isReady, username]);

  const filteredConductores = conductores.filter((conductor) =>
    conductor.nombre.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <Toaster richColors />

      {/* Header + búsqueda en una sola barra */}
      <div className="border-b border-gray-200 bg-[#efeff0] px-4 py-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 border-r border-gray-200 pr-4">
            <div className="h-5 w-1 bg-[#113EB9]"></div>
            <h1 className="text-[13px] font-bold uppercase tracking-wide text-gray-800">
              Conductores
            </h1>
            <span className="rounded-md bg-[#113EB9] px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {conductores.length}
            </span>
          </div>

          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Buscar por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={loading}
              className="block w-full rounded-md border border-gray-200 bg-gray-50 py-1.5 pl-9 pr-3 text-[12px] placeholder-gray-400 transition-colors focus:border-[#113EB9] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#113EB9] disabled:opacity-50"
            />
          </div>

          <ConductorDialog onConductorAdded={handleConductorAdded} />
        </div>
      </div>

      {/* Tabla */}
      <div className="p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Spinner color="primary" size="md" />
            <span className="mt-3 text-[12px] text-gray-500">Cargando conductores...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="mb-2 text-sm font-medium text-red-600">Error al cargar los datos</p>
              <p className="mb-3 text-[12px] text-gray-500">{error}</p>
              <button
                onClick={fetchConductores}
                className="rounded-md bg-[#113EB9] px-4 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-blue-700"
              >
                Reintentar
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm">
            <div className="max-h-[calc(100vh-80px)] overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 z-10 bg-[#113eb9]">
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-50">
                      #
                    </th>
                    <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-50">
                      Nombre
                    </th>
                    <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-50">
                      Teléfono
                    </th>
                    <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-50">
                      Correo
                    </th>
                    <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-50">
                      Tipo
                    </th>
                    <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-50">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredConductores.map((conductor, index) => (
                    <tr
                      key={conductor.id}
                      className="transition-colors hover:bg-blue-50/40"
                    >
                      <td className="whitespace-nowrap px-4 py-1.5 text-[12px] font-medium text-gray-500">
                        {index + 1}
                      </td>
                      <td className="whitespace-nowrap px-4 py-1.5">
                        <span className="text-[12px] font-medium text-gray-900">
                          {conductor.nombre}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-1.5 text-[12px] text-gray-600">
                        {conductor.telefono || (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-1.5 text-[12px] text-gray-600">
                        {conductor.correo || (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-1.5 text-[12px] text-gray-600">
                        {conductor.tipo ? (
                          <span className="inline-block rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-[#113EB9]">
                            {conductor.tipo}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-1.5">
                        <div className="flex gap-1">
                          <ConductorDialogModificar
                            conductorData={getConductorData(conductor.id)}
                            onConductorModified={handleConductorModified}
                          />

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button
                                className="inline-flex h-7 items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 text-[11px] font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                                disabled={eliminandoLoading === conductor.id}
                              >
                                {eliminandoLoading === conductor.id ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <Trash2 size={12} />
                                )}
                                Eliminar
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. Esto eliminará permanentemente al
                                  conductor &quot;{conductor.nombre}&quot; del sistema.
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

                          <button
                            onClick={() =>
                              window.open(
                                `/trackvelnew/gestionconductores/gestiondocs?codtaxi=${conductor.id}&nombre=${encodeURIComponent(conductor.nombre)}`,
                                '_blank',
                              )
                            }
                            className="inline-flex h-7 items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 text-[11px] font-medium text-[#113EB9] transition-colors hover:bg-blue-50"
                          >
                            <FileCheck size={12} />
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
  );
}
