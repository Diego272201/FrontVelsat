'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  FileText,
  Settings,
  Trash2,
  CheckCircle,
  AlertCircle,
  X,
  Car,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
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
  const [accion, setAccion] = useState<'habilitar' | 'deshabilitar' | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const tableRef = useRef(null);
  const [selectedUnidadLiberar, setSelectedUnidadLiberar] = useState<
    string | null
  >(null);
  const [showLiberarDialog, setShowLiberarDialog] = useState(false);
  const [loadingLiberar, setLoadingLiberar] = useState(false);
  const [showLiberarTodasDialog, setShowLiberarTodasDialog] = useState(false);
  const [loadingLiberarTodas, setLoadingLiberarTodas] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingInicial, setLoadingInicial] = useState(true);

  const showNotification = (type: 'success' | 'error', message: string) => {
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

    setLoadingInicial(true);

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
        .sort(
          (a: Unidad, b: Unidad) => Number(b.habilitado) - Number(a.habilitado),
        ),
    );

    setLoadingInicial(false);
  };

  const handleLiberarTodasUnidades = async () => {
    setLoadingLiberarTodas(true);

    try {
      const response = await fetch(
        'https://do.velsat.pe:2083/api/Preplan/LiberarTotal',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
        },
      );

      if (response.ok) {
        showNotification(
          'success',
          'Todas las unidades han sido liberadas exitosamente',
        );
        fetchUnidades();
      } else {
        showNotification('error', 'Error al liberar todas las unidades');
      }
    } catch {
      showNotification(
        'error',
        'Error de conexión al liberar todas las unidades',
      );
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
      showNotification(
        'error',
        `Error de conexión al liberar la unidad ${placa}`,
      );
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
          `Unidad ${selectedUnidad} ${
            accion === 'habilitar' ? 'habilitada' : 'deshabilitada'
          } exitosamente`,
        );
        fetchUnidades();
      } else {
        showNotification(
          'error',
          `Error al ${accion} la unidad ${selectedUnidad}`,
        );
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
    <div className="flex h-screen flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      {/* 🔔 Notificaciones */}
      <div className="fixed right-4 top-4 z-50 max-w-md space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`animate-in slide-in-from-right flex items-center gap-3 rounded-xl border p-4 shadow-xl backdrop-blur-sm duration-300 ${
              notification.type === 'success'
                ? 'border-emerald-300 bg-emerald-50/95 text-emerald-900'
                : 'border-rose-300 bg-rose-50/95 text-rose-900'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle className="h-5 w-5 flex-shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-rose-600" />
            )}
            <span className="flex-1 text-sm font-medium">
              {notification.message}
            </span>
            <button
              onClick={() => removeNotification(notification.id)}
              className="flex-shrink-0 text-gray-500 transition-colors hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="border-b border-gray-200 bg-[#113EB9] shadow-lg">
        <div className="px-4 py-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex h-10 w-10 items-center justify-center  bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 shadow-xl">
                <Car className="h-6 w-6 text-white drop-shadow-md" />
              </div>

              <div>
                <h1 className="text-[14px] font-bold uppercase tracking-tight text-white">
                  Gestión de Unidades
                </h1>
                <p className="mt-0 text-[12px] text-gray-200">
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

      <div className="mx-auto w-full px-4 py-2">
        <div className="mb-0 p-0">
          <div className="flex w-full flex-col items-center gap-4 sm:flex-row">
            <div className="relative w-full">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Buscar por código de unidad..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="block w-full border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm leading-5 placeholder-gray-500 transition-all duration-200 focus:border-transparent focus:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 📋 Tabla con scroll y header sticky */}
      <div className="max-h-[calc(100vh-150px)] flex-1 overflow-hidden px-4">
        <div className="flex h-full flex-col overflow-hidden border border-gray-200 bg-white shadow-lg">
          <div className="relative flex-1 overflow-auto" ref={tableRef}>
            <table className="min-w-full border-collapse">
              <thead className="sticky top-0 z-20 bg-gray-100">
                <tr>
                  <th className="w-20 py-2 text-center text-xs font-semibold text-gray-800">
                    ITEM
                  </th>
                  <th className="py-2 text-center text-xs font-semibold text-gray-800">
                    CÓDIGO UNIDAD
                  </th>
                  <th className="py-2 text-center text-xs font-semibold text-gray-800">
                    ESTADO
                  </th>
                  <th className="py-2 text-center text-xs font-semibold text-gray-800">
                    ACCIONES
                  </th>
                </tr>
              </thead>
              <tbody>
                {unidadesFiltradas.map((unidad, index) => (
                  <tr
                    key={unidad.codunidad}
                    className="border-b border-gray-100 transition-colors hover:bg-blue-50"
                  >
                    <td className="whitespace-nowrap px-6 py-2 text-sm font-medium text-gray-900">
                      {index + 1}
                    </td>
                    <td className="py-2 text-center text-xs">
                      {unidad.codunidad}
                    </td>
                    <td className="py-2 text-center">
                      <Badge
                        className={`px-3 py-1 font-medium ${
                          unidad.habilitado === '1'
                            ? 'border border-emerald-300 bg-emerald-100 text-emerald-800'
                            : 'border border-gray-300 bg-gray-100 text-gray-800'
                        }`}
                      >
                        {unidad.habilitado === '1'
                          ? 'Habilitada'
                          : 'Deshabilitada'}
                      </Badge>
                    </td>
                    <td className="py-2 text-center">
                      <div className="flex flex-wrap justify-center gap-2">
                        <Button
                          onClick={() =>
                            window.open(
                              `/trackvelnew/gestionunidades/gestiondocs?deviceID=${unidad.codunidad}`,
                              '_blank',
                            )
                          }
                          size="sm"
                          className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md transition-all hover:from-blue-700 hover:to-blue-800"
                        >
                          <FileText className="mr-1 h-4 w-4" />
                          Documentos
                        </Button>

                        <Button
                          size="sm"
                          className={`shadow-md transition-all ${
                            unidad.habilitado === '1'
                              ? 'bg-gradient-to-r from-rose-600 to-rose-700 text-white hover:from-rose-700 hover:to-rose-800'
                              : 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white hover:from-emerald-700 hover:to-emerald-800'
                          }`}
                          onClick={() => {
                            setSelectedUnidad(unidad.codunidad);
                            setAccion(
                              unidad.habilitado === '1'
                                ? 'deshabilitar'
                                : 'habilitar',
                            );
                          }}
                          disabled={loading || loadingLiberarTodas}
                        >
                          <Trash2 className="mr-1 h-4 w-4" />
                          {unidad.habilitado === '1'
                            ? 'Deshabilitar'
                            : 'Habilitar'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {loadingInicial ? (
              <div className="flex flex-1 items-center justify-center p-8">
                <div className="text-center">
                  <Spinner className="mx-auto mb-4 h-12 w-12 text-gray-500" />
                  <p className="text-sm font-medium text-gray-700">
                    Cargando unidades...
                  </p>
                </div>
              </div>
            ) : unidadesFiltradas.length === 0 ? (
              <div className="flex flex-1 items-center justify-center p-8 text-gray-500">
                <div className="text-center">
                  <Search className="mx-auto mb-4 h-16 w-16 opacity-30" />
                  <p className="text-lg font-medium">
                    No se encontraron unidades
                  </p>
                  <p className="mt-2 text-sm">
                    Intenta con otro término de búsqueda
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* 🧩 Diálogos */}
      <AlertDialog
        open={showLiberarTodasDialog}
        onOpenChange={setShowLiberarTodasDialog}
      >
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg text-gray-900">
              ¿Estás seguro que deseas liberar <strong>TODAS</strong> las
              unidades?
              <br />
              <span className="text-base font-normal text-rose-600">
                Esta acción eliminará las rutas actuales de todas las unidades.
              </span>
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLiberarTodasUnidades}
              disabled={loadingLiberarTodas}
              className="rounded-lg bg-rose-600 hover:bg-rose-700"
            >
              {loadingLiberarTodas ? 'Liberando todas...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showLiberarDialog} onOpenChange={setShowLiberarDialog}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg text-gray-900">
              ¿Estás seguro que deseas liberar la unidad{' '}
              <strong>{selectedUnidadLiberar}</strong>?
              <br />
              <span className="text-base text-amber-600">
                Esto eliminará la ruta actual.
              </span>
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                selectedUnidadLiberar &&
                handleLiberarUnidad(selectedUnidadLiberar)
              }
              disabled={loadingLiberar || loadingLiberarTodas}
              className="rounded-lg bg-blue-600 hover:bg-blue-700"
            >
              {loadingLiberar ? 'Liberando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!selectedUnidad}
        onOpenChange={() => setSelectedUnidad(null)}
      >
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg text-gray-900">
              ¿Estás seguro que deseas {accion} la unidad{' '}
              <strong>{selectedUnidad}</strong>?
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleHabilitarDeshabilitar}
              disabled={loading || loadingLiberarTodas}
              className="rounded-lg bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Procesando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
