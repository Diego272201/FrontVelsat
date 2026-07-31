'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  FileText,
  Trash2,
  CheckCircle,
  AlertCircle,
  X,
  Car,
  Loader2,
} from 'lucide-react';

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/app/components/ui/alert-dialog';
import { useUsername } from '@/hooks/useUsername';
import { Spinner } from '@nextui-org/react';

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
  const { username, isReady } = useUsername();

  const [searchText, setSearchText] = useState('');
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [selectedUnidad, setSelectedUnidad] = useState<string | null>(null);
  const [accion, setAccion] = useState<'habilitar' | 'deshabilitar' | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedUnidadLiberar, setSelectedUnidadLiberar] = useState<string | null>(null);
  const [showLiberarDialog, setShowLiberarDialog] = useState(false);
  const [loadingLiberar, setLoadingLiberar] = useState(false);
  const [showLiberarTodasDialog, setShowLiberarTodasDialog] = useState(false);
  const [loadingLiberarTodas, setLoadingLiberarTodas] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingInicial, setLoadingInicial] = useState(true);

  const showNotification = (type: 'success' | 'error', message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications((prev) => [...prev, { id, type, message }]);
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
    setLoadingInicial(true);

    try {
      const res = await fetch(
        `https://do.velsat.pe:2083/api/Preplan/carros/${username}`,
      );
      const data = await res.json();
      setUnidades(
        data
          .map((u: UnidadAPI) => ({
            codunidad: u.codunidad,
            habilitado: u.habilitado,
          }))
          .sort((a: Unidad, b: Unidad) => Number(b.habilitado) - Number(a.habilitado)),
      );
    } catch {
      showNotification('error', 'Error al cargar las unidades');
    } finally {
      setLoadingInicial(false);
    }
  };

  const handleLiberarTodasUnidades = async () => {
    setLoadingLiberarTodas(true);
    try {
      const response = await fetch(
        'https://do.velsat.pe:2083/api/Preplan/LiberarTotal',
        { method: 'PUT', headers: { 'Content-Type': 'application/json' } },
      );
      if (response.ok) {
        showNotification('success', 'Todas las unidades han sido liberadas exitosamente');
        fetchUnidades();
      } else {
        showNotification('error', 'Error al liberar todas las unidades');
      }
    } catch {
      showNotification('error', 'Error de conexión al liberar todas las unidades');
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
        { method: 'PUT', headers: { 'Content-Type': 'application/json' } },
      );
      if (response.ok) {
        showNotification('success', `Unidad ${placa} liberada exitosamente`);
        fetchUnidades();
      } else {
        showNotification('error', `Error al liberar la unidad ${placa}`);
      }
    } catch {
      showNotification('error', `Error de conexión al liberar la unidad ${placa}`);
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
        accion === 'habilitar'
          ? `https://do.velsat.pe:2083/api/Preplan/HabilitarUnidad/${selectedUnidad}`
          : `https://do.velsat.pe:2083/api/Preplan/DeshabilitarUnidad/${selectedUnidad}`;

      const response = await fetch(url, { method: 'POST' });
      if (response.ok) {
        showNotification(
          'success',
          `Unidad ${selectedUnidad} ${accion === 'habilitar' ? 'habilitada' : 'deshabilitada'} exitosamente`,
        );
        fetchUnidades();
      } else {
        showNotification('error', `Error al ${accion} la unidad ${selectedUnidad}`);
      }
    } catch {
      showNotification('error', `Error de conexión al ${accion} la unidad`);
    } finally {
      setSelectedUnidad(null);
      setAccion(null);
      setLoading(false);
    }
  };

  const unidadesFiltradas = unidades
    .filter((unidad) =>
      unidad.codunidad.toLowerCase().includes(searchText.toLowerCase()),
    )
    .sort((a, b) => Number(b.habilitado) - Number(a.habilitado));

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Notificaciones */}
      <div className="fixed right-4 top-4 z-50 max-w-md space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`flex items-center gap-2 rounded-md border px-3 py-2 text-[12px] font-medium shadow-sm ${
              notification.type === 'success'
                ? 'border-green-200 bg-green-50 text-green-800'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-600" />
            )}
            <span className="flex-1">{notification.message}</span>
            <button
              onClick={() => removeNotification(notification.id)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Header + búsqueda en una sola barra */}
      <div className="border-b border-gray-200 bg-[#efeff0] px-4 py-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 border-r border-gray-200 pr-4">
            <div className="h-5 w-1 bg-[#113EB9]"></div>
            <h1 className="text-[13px] font-bold uppercase tracking-wide text-gray-800">
              Unidades
            </h1>
            <span className="rounded-md bg-[#113EB9] px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {unidades.length}
            </span>
          </div>

          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por código de unidad..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="block w-full rounded-md border border-gray-200 bg-gray-50 py-1.5 pl-9 pr-3 text-[12px] placeholder-gray-400 transition-colors focus:border-[#113EB9] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#113EB9]"
            />
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="p-4">
        {loadingInicial ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Spinner color="primary" size="md" />
            <span className="mt-3 text-[12px] text-gray-500">Cargando unidades...</span>
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm">
            <div className="max-h-[calc(100vh-80px)] overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 z-10 bg-[#113eb9]">
                  <tr>
                    <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-50">
                      #
                    </th>
                    <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-50">
                      Código Unidad
                    </th>
                    <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-50">
                      Estado
                    </th>
                    <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-50">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {unidadesFiltradas.map((unidad, index) => (
                    <tr
                      key={unidad.codunidad}
                      className="transition-colors hover:bg-blue-50/40"
                    >
                      <td className="whitespace-nowrap px-4 py-1.5 text-[12px] font-medium text-gray-500">
                        {index + 1}
                      </td>
                      <td className="whitespace-nowrap px-4 py-1.5 text-[12px] font-medium text-gray-900">
                        {unidad.codunidad}
                      </td>
                      <td className="whitespace-nowrap px-4 py-1.5 text-[12px] text-gray-900">
                        {unidad.habilitado === '1' ? 'Habilitada' : 'Deshabilitada'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-1.5">
                        <div className="flex gap-1">
                          <button
                            onClick={() =>
                              window.open(
                                `/trackvelnew/gestionunidades/gestiondocs?deviceID=${unidad.codunidad}`,
                                '_blank',
                              )
                            }
                            className="inline-flex h-7 items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 text-[11px] font-medium text-[#fb7b0f] transition-colors hover:bg-orange-50"
                          >
                            <FileText size={12} />
                            Documentos
                          </button>

                          <button
                            onClick={() => {
                              setSelectedUnidad(unidad.codunidad);
                              setAccion(unidad.habilitado === '1' ? 'deshabilitar' : 'habilitar');
                            }}
                            disabled={loading || loadingLiberarTodas}
                            className={`inline-flex h-7 items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 text-[11px] font-medium transition-colors disabled:opacity-50 ${
                              unidad.habilitado === '1'
                                ? 'text-red-600 hover:bg-red-50'
                                : 'text-green-600 hover:bg-green-50'
                            }`}
                          >
                            {unidad.habilitado === '1' ? (
                              <Trash2 size={12} />
                            ) : (
                              <CheckCircle size={12} />
                            )}
                            {unidad.habilitado === '1' ? 'Deshabilitar' : 'Habilitar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!loadingInicial && unidadesFiltradas.length === 0 && (
                <div className="flex items-center justify-center bg-white py-12">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-500">No se encontraron unidades</p>
                    <p className="mt-1 text-[12px] text-gray-400">Intenta con otro término de búsqueda</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Diálogos */}
      <AlertDialog open={showLiberarTodasDialog} onOpenChange={setShowLiberarTodasDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Estás seguro que deseas liberar <strong>TODAS</strong> las unidades?
              <br />
              <span className="text-sm font-normal text-red-600">
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
              {loadingLiberarTodas ? 'Liberando todas...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showLiberarDialog} onOpenChange={setShowLiberarDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Estás seguro que deseas liberar la unidad <strong>{selectedUnidadLiberar}</strong>?
              <br />
              <span className="text-sm font-normal text-amber-600">
                Esto eliminará la ruta actual.
              </span>
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedUnidadLiberar && handleLiberarUnidad(selectedUnidadLiberar)}
              disabled={loadingLiberar || loadingLiberarTodas}
              className="bg-[#113EB9] hover:bg-blue-700"
            >
              {loadingLiberar ? 'Liberando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!selectedUnidad} onOpenChange={() => setSelectedUnidad(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Estás seguro que deseas {accion} la unidad <strong>{selectedUnidad}</strong>?
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleHabilitarDeshabilitar}
              disabled={loading || loadingLiberarTodas}
              className="bg-[#113EB9] hover:bg-blue-700"
            >
              {loading ? 'Procesando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
