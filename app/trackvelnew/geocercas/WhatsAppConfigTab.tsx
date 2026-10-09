'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Edit2,
  Info,
  Loader2,
  LogIn,
  LogOut,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  Trash2,
  Truck,
  User,
  X,
} from 'lucide-react';
import { WhatsAppIcon } from './WhatsAppIcon';
import { toast } from 'sonner';
import {
  DestinoWhatsAppDto,
  addDestinoWhatsApp,
  deleteDestinoWhatsApp,
  getGeocercaWhatsAppConfig,
  sendWhatsAppTest,
  updateDestinoWhatsApp,
  updateGeocercaWhatsAppConfig,
} from './whatsappApi';
import { Vehicle } from './types';

interface WhatsAppConfigTabProps {
  geofenceID?: number;
  geofenceName: string;
  allVehicles: Vehicle[];
  assignedVehicleIds: string[];
}

/** Extrae únicamente los 9 dígitos locales de Perú */
const extractPeruDigits = (raw: string): string => {
  let digits = (raw || '').replace(/\D/g, '');
  if (digits.startsWith('51') && digits.length >= 11) {
    digits = digits.slice(2);
  }
  return digits.slice(0, 9);
};

/** Formatea el teléfono de Perú para mostrar en la tabla: +51 987 654 321 */
const formatPeruDisplayPhone = (raw: string): string => {
  const digits = (raw || '').replace(/\D/g, '');
  const local = digits.startsWith('51') && digits.length >= 11 ? digits.slice(2) : digits;
  if (local.length === 9) {
    return `+51 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
  }
  return raw;
};

/** Obtiene las iniciales del contacto para el avatar circular (ej: 'Jefe de turno' -> 'JD', sin nombre -> '—') */
const getContactInitials = (nombre?: string | null): string => {
  if (!nombre || !nombre.trim()) return '—';
  const parts = nombre.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

export default function WhatsAppConfigTab({
  geofenceID,
  geofenceName,
  allVehicles,
  assignedVehicleIds,
}: WhatsAppConfigTabProps) {
  // General config state
  const [loading, setLoading] = useState<boolean>(true);
  const [savingConfig, setSavingConfig] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [whatsappActivo, setWhatsappActivo] = useState<boolean>(false);
  const [destinos, setDestinos] = useState<DestinoWhatsAppDto[]>([]);

  // Sub-modal for Add/Edit Destino
  const [destinoModalOpen, setDestinoModalOpen] = useState<boolean>(false);
  const [editingDestino, setEditingDestino] = useState<DestinoWhatsAppDto | null>(null);
  const [destinoNombre, setDestinoNombre] = useState<string>('');
  const [destinoPhone, setDestinoPhone] = useState<string>(''); // Exactly 9 digits local
  const [destinoActivo, setDestinoActivo] = useState<boolean>(true);
  const [destinoEventos, setDestinoEventos] = useState<'ambos' | 'entrada' | 'salida'>('ambos');
  const [destinoScope, setDestinoScope] = useState<'todos' | 'personalizado'>('todos');
  const [destinoVehiculos, setDestinoVehiculos] = useState<string[]>([]);
  const [destinoVehicleSearch, setDestinoVehicleSearch] = useState<string>('');
  const [savingDestino, setSavingDestino] = useState<boolean>(false);

  // Destino deleting state
  const [deletingDestinoId, setDeletingDestinoId] = useState<number | null>(null);

  // Quick test state
  const [testingPhone, setTestingPhone] = useState<string | null>(null);

  // Fetch data from backend
  const loadConfig = useCallback(async () => {
    if (!geofenceID) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getGeocercaWhatsAppConfig(geofenceID);
      setWhatsappActivo(data.whatsappActivo ?? false);
      setDestinos(data.destinos || []);
    } catch (err: any) {
      console.error('Error al cargar configuración de WhatsApp:', err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'No se pudo conectar con el servicio de WhatsApp en https://do.velsat.pe:8443/notificaciones-trackbell';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [geofenceID]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Combine vehicles from geocerca assigned list
  const availableVehiclesList = useMemo(() => {
    const listMap = new Map<string, string>();
    assignedVehicleIds.forEach((id) => {
      const found = allVehicles.find((v) => v.id === id);
      listMap.set(id, found ? found.label : id);
    });
    return Array.from(listMap.entries()).map(([id, label]) => ({ id, label }));
  }, [assignedVehicleIds, allVehicles]);

  // Save General Master Switch (whatsappActivo)
  const handleToggleMasterSwitch = async (newValue: boolean) => {
    if (!geofenceID) return;
    setWhatsappActivo(newValue);
    setSavingConfig(true);
    const toastId = toast.loading(
      newValue
        ? 'Activando alertas de WhatsApp para la geocerca...'
        : 'Desactivando alertas de WhatsApp...',
    );
    try {
      await updateGeocercaWhatsAppConfig(geofenceID, {
        whatsappActivo: newValue,
      });
      toast.success(
        newValue
          ? 'Alertas de WhatsApp activadas para esta geocerca'
          : 'Alertas de WhatsApp desactivadas',
        { id: toastId },
      );
    } catch (err: any) {
      console.error('Error al actualizar switch de WhatsApp:', err);
      // Revert optimistic update
      setWhatsappActivo(!newValue);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Error al guardar el estado';
      toast.error(msg, { id: toastId });
    } finally {
      setSavingConfig(false);
    }
  };

  // Quick Test WhatsApp Send
  const handleTestSend = async (phoneOrDigits: string, nombre?: string | null) => {
    const digits = phoneOrDigits.replace(/\D/g, '');
    const cleanPhone = digits.startsWith('51') ? digits : '51' + digits;
    if (cleanPhone.length < 11) {
      toast.error('El número de teléfono debe tener 9 dígitos');
      return;
    }

    setTestingPhone(phoneOrDigits);
    const toastId = toast.loading(`Enviando alerta de prueba a +${cleanPhone}...`);
    try {
      const res = await sendWhatsAppTest(cleanPhone);
      if (res.success) {
        toast.success(
          `Alerta enviada exitosamente a +${res.normalizedPhone || cleanPhone}`,
          {
            id: toastId,
            description: nombre ? `Contacto: ${nombre}` : undefined,
          },
        );
      } else {
        toast.error(
          res.errorMessage || 'El servidor devolvió un error al enviar el mensaje',
          {
            id: toastId,
            description: `Destino: +${res.normalizedPhone || cleanPhone}`,
          },
        );
      }
    } catch (err: any) {
      console.error('Error al enviar prueba de WhatsApp:', err);
      const msg =
        err?.response?.data?.errorMessage ||
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Error al enviar mensaje de prueba';
      toast.error(msg, { id: toastId });
    } finally {
      setTestingPhone(null);
    }
  };

  // Open Modal to Add Destino
  const handleOpenAddDestino = () => {
    setEditingDestino(null);
    setDestinoNombre('');
    setDestinoPhone('');
    setDestinoActivo(true);
    setDestinoEventos('ambos');
    setDestinoScope('todos');
    setDestinoVehiculos([]);
    setDestinoVehicleSearch('');
    setDestinoModalOpen(true);
  };

  // Open Modal to Edit Destino
  const handleOpenEditDestino = (dest: DestinoWhatsAppDto) => {
    setEditingDestino(dest);
    setDestinoNombre(dest.nombre || '');
    setDestinoPhone(extractPeruDigits(dest.phone));
    setDestinoActivo(dest.activo ?? true);
    setDestinoEventos(
      dest.eventos === 'entrada' || dest.eventos === 'salida' ? dest.eventos : 'ambos',
    );
    const hasSpecificVehicles = Boolean(
      dest.vehiculosAsignados && dest.vehiculosAsignados.length > 0,
    );
    setDestinoScope(hasSpecificVehicles ? 'personalizado' : 'todos');
    setDestinoVehiculos(dest.vehiculosAsignados ? [...dest.vehiculosAsignados] : []);
    setDestinoVehicleSearch('');
    setDestinoModalOpen(true);
  };

  // Save Destino (POST or PUT)
  const handleSaveDestino = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!geofenceID) return;

    const cleanDigits = destinoPhone.replace(/\D/g, '').trim();
    if (cleanDigits.length !== 9) {
      toast.error('El número de celular debe tener exactamente 9 dígitos');
      return;
    }

    // Always internally prefix with 51 for Peru
    const phoneToSend = '51' + cleanDigits;
    const vehiculosPayload = destinoScope === 'todos' ? [] : destinoVehiculos;

    setSavingDestino(true);
    const toastId = toast.loading(
      editingDestino ? 'Actualizando contacto...' : 'Agregando número de destino...',
    );

    try {
      if (editingDestino) {
        const updated = await updateDestinoWhatsApp(geofenceID, editingDestino.id, {
          nombre: destinoNombre.trim() || undefined,
          phone: phoneToSend,
          activo: destinoActivo,
          eventos: destinoEventos,
          vehiculos: vehiculosPayload,
        });
        setDestinos((prev) =>
          prev.map((d) => (d.id === editingDestino.id ? updated : d)),
        );
        toast.success('Contacto actualizado correctamente', { id: toastId });
      } else {
        const created = await addDestinoWhatsApp(geofenceID, {
          nombre: destinoNombre.trim() || undefined,
          phone: phoneToSend,
          activo: destinoActivo,
          eventos: destinoEventos,
          vehiculos: vehiculosPayload,
        });
        setDestinos((prev) => [...prev, created]);
        toast.success('Número de destino agregado correctamente', { id: toastId });
      }
      setDestinoModalOpen(false);
    } catch (err: any) {
      console.error('Error al guardar contacto:', err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Error al guardar el contacto';
      toast.error(msg, { id: toastId });
    } finally {
      setSavingDestino(false);
    }
  };

  // Delete Destino
  const handleDeleteDestino = async (destinoId: number, nombre?: string | null) => {
    if (!geofenceID) return;
    if (!window.confirm(`¿Estás seguro de eliminar el contacto "${nombre || 'seleccionado'}"?`)) {
      return;
    }

    setDeletingDestinoId(destinoId);
    const toastId = toast.loading('Eliminando contacto...');
    try {
      await deleteDestinoWhatsApp(geofenceID, destinoId);
      setDestinos((prev) => prev.filter((d) => d.id !== destinoId));
      toast.success('Contacto eliminado correctamente', { id: toastId });
    } catch (err: any) {
      console.error('Error al eliminar contacto:', err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Error al eliminar el contacto';
      toast.error(msg, { id: toastId });
    } finally {
      setDeletingDestinoId(null);
    }
  };

  // If geofenceID is missing (e.g. create mode)
  if (!geofenceID) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 ring-1 ring-emerald-200">
          <WhatsAppIcon size={28} colored />
        </div>
        <h3 className="text-[14px] font-bold text-slate-800">
          Guarda la geocerca para configurar WhatsApp
        </h3>
        <p className="mt-1.5 max-w-sm text-[12px] leading-relaxed text-slate-500">
          Primero debes guardar los datos básicos y la forma de la geocerca. Una vez creada
          en el sistema, podrás registrar los contactos y sus reglas de alerta.
        </p>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#25D366]" />
        <span className="text-[12.5px] font-medium text-slate-600">
          Cargando configuración de WhatsApp...
        </span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div className="min-w-0 flex-1">
              <h4 className="text-[13px] font-bold">Error al conectar con WhatsApp</h4>
              <p className="mt-1 text-[12px] text-red-700">{error}</p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadConfig}
                  className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-[11.5px] font-semibold text-white transition hover:bg-red-700"
                >
                  <RefreshCw size={13} /> Reintentar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="geocercas-scroll flex-1 space-y-4 overflow-y-auto px-4 py-3.5 text-slate-800">
        {/* 1. SWITCH MAESTRO */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 shadow-sm transition-all hover:bg-slate-50">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
              whatsappActivo
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                : 'bg-slate-200 text-slate-500'
            }`}
          >
            <WhatsAppIcon size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[13.5px] font-bold text-slate-900">
                Activar alertas de WhatsApp para esta geocerca
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  whatsappActivo
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {whatsappActivo ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            <p className="text-[11.5px] text-slate-500">
              Notifica instantáneamente por WhatsApp cuando los vehículos ingresen o salgan
            </p>
          </div>
        </div>

        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            checked={whatsappActivo}
            disabled={savingConfig}
            onChange={(e) => handleToggleMasterSwitch(e.target.checked)}
            className="peer sr-only"
          />
          <div className="peer h-6 w-11 rounded-full bg-slate-300 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none disabled:opacity-50"></div>
        </label>
      </div>

      {/* 2. LISTA DE CONTACTOS DE DESTINO */}
      <div
        className={`transition-all duration-200 ${
          whatsappActivo ? 'opacity-100' : 'pointer-events-none opacity-40 grayscale select-none'
        }`}
      >
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          {/* HEADER: CONTACTOS DE DESTINO 2 + BOTÓN + AGREGAR NÚMERO */}
          <div className="flex items-center justify-between pb-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                Contactos de destino
              </span>
              <span className="text-[10px] font-extrabold text-[#113EB9]">
                {destinos.length}
              </span>
            </div>

            <button
              type="button"
              disabled={!whatsappActivo}
              onClick={handleOpenAddDestino}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#113EB9] px-3.5 py-1.5 text-[12px] font-bold text-white shadow-sm transition hover:bg-[#0d3094] disabled:opacity-50"
            >
              <Plus size={14} /> Agregar número
            </button>
          </div>

          {destinos.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Phone size={18} />
              </div>
              <p className="text-[13px] font-semibold text-slate-700">
                No hay contactos registrados para esta geocerca
              </p>
              <p className="mt-1 text-[11.5px] text-slate-400">
                Haz clic en &ldquo;+ Agregar número&rdquo; para registrar a los supervisores o choferes que recibirán alertas.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border-t border-slate-100">
              {destinos.map((dest) => {
                const isAllVehicles =
                  !dest.vehiculosAsignados || dest.vehiculosAsignados.length === 0;
                const isTesting = testingPhone === dest.phone;
                const eventType = dest.eventos || 'ambos';
                const initials = getContactInitials(dest.nombre);
                const hasName = Boolean(dest.nombre && dest.nombre.trim());

                return (
                  <div
                    key={dest.id}
                    className="flex items-center justify-between py-3 transition hover:bg-slate-50/50"
                  >
                    {/* IZQUIERDA: AVATAR + DATOS */}
                    <div className="flex items-center gap-3 min-w-0">
                      {/* AVATAR CIRCULAR */}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[12px] font-bold text-slate-600">
                        {initials}
                      </div>

                      {/* TEXTOS */}
                      <div className="min-w-0">
                        {/* FILA SUPERIOR: NOMBRE + TELÉFONO */}
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[13px] truncate ${
                              hasName
                                ? 'font-bold text-slate-900'
                                : 'font-semibold text-slate-600'
                            }`}
                          >
                            {dest.nombre || 'Sin nombre'}
                          </span>
                          <span className="text-[12.5px] font-medium text-slate-600">
                            {formatPeruDisplayPhone(dest.phone)}
                          </span>
                        </div>

                        {/* FILA INFERIOR: EVENTOS · VEHÍCULOS */}
                        <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-slate-500">
                          {/* EVENTOS */}
                          {eventType === 'entrada' ? (
                            <span className="flex items-center gap-1 font-medium">
                              <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                              <span>Solo entradas</span>
                            </span>
                          ) : eventType === 'salida' ? (
                            <span className="flex items-center gap-1 font-medium">
                              <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
                              <span>Solo salidas</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 font-medium">
                              <span className="flex items-center gap-0.5 shrink-0">
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                <span className="h-2 w-2 rounded-full bg-red-500" />
                              </span>
                              <span>Entradas y salidas</span>
                            </span>
                          )}

                          <span className="text-slate-300 font-bold">·</span>

                          {/* VEHÍCULOS */}
                          {isAllVehicles ? (
                            <span className="text-slate-500">Todos los vehículos</span>
                          ) : (
                            <span
                              className="text-slate-500 cursor-help"
                              title={dest.vehiculosAsignados?.join(', ')}
                            >
                              {dest.vehiculosAsignados!.length === 1
                                ? '1 vehículo'
                                : `${dest.vehiculosAsignados!.length} vehículos`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* DERECHA: ESTADO + SEPARADOR + BOTONES DE ACCIÓN */}
                    <div className="flex items-center gap-2 shrink-0 pl-3">
                      {/* BADGE DE ESTADO */}
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          dest.activo
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            dest.activo ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        {dest.activo ? 'Activo' : 'Inactivo'}
                      </span>

                      {/* SEPARADOR VERTICAL */}
                      <div className="h-5 w-px bg-slate-200 mx-0.5" />

                      {/* BOTÓN PROBAR */}
                      <button
                        type="button"
                        disabled={isTesting}
                        onClick={() => handleTestSend(dest.phone, dest.nombre)}
                        title="Enviar mensaje de prueba en vivo"
                        className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[11.5px] font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50"
                      >
                        {isTesting ? (
                          <Loader2 size={12} className="animate-spin text-emerald-600" />
                        ) : (
                          <Send size={11} className="text-slate-600" />
                        )}
                        <span>Probar</span>
                      </button>

                      {/* EDITAR */}
                      <button
                        type="button"
                        onClick={() => handleOpenEditDestino(dest)}
                        title="Editar destino"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-blue-600"
                      >
                        <Edit2 size={14} />
                      </button>

                      {/* ELIMINAR */}
                      <button
                        type="button"
                        disabled={deletingDestinoId === dest.id}
                        onClick={() => handleDeleteDestino(dest.id, dest.nombre)}
                        title="Eliminar destino"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      >
                        {deletingDestinoId === dest.id ? (
                          <Loader2 size={13} className="animate-spin text-red-500" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* FOOTER */}
      <div className="flex items-center justify-between border-t border-slate-200 pt-3">
        <div className="flex items-center gap-1.5 text-[11.5px] text-slate-500">
          <Info size={13} className="text-slate-400" />
          <span>Canal de WhatsApp: {whatsappActivo ? 'Operativo en esta geocerca' : 'Desactivado'}</span>
        </div>
        <span className="text-[11px] text-slate-400">
          Los cambios se sincronizan en vivo
        </span>
      </div>
    </div>

    {/* MODAL AGREGAR / EDITAR DESTINO (ALTO DINÁMICO) */}
    {destinoModalOpen && (
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px] animate-in fade-in duration-150">
        <div
          className="absolute inset-0"
          onClick={() => setDestinoModalOpen(false)}
          aria-hidden
        />

        <div className="relative flex max-h-[90vh] w-full max-w-[700px] flex-col overflow-hidden rounded-xl bg-white shadow-2xl transition-all duration-200">
          {/* MODAL HEADER (Fondo blanco, ícono whatsapp redondeado en verde claro, título y subtítulo) */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-3.5 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                <WhatsAppIcon size={22} colored />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-slate-900 leading-tight">
                  {editingDestino ? 'Editar número destino' : 'Agregar número destino'}
                </h3>
                <p className="text-[12px] text-slate-400 font-normal leading-tight mt-0.5">
                  Notificaciones por WhatsApp
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDestinoModalOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              <X size={18} />
            </button>
          </div>

          {/* FORM CON ALTO DINÁMICO */}
          <form
            onSubmit={handleSaveDestino}
            className="flex flex-col overflow-hidden"
          >
            <div className="geocercas-scroll space-y-3.5 overflow-y-auto px-6 py-4 w-full max-h-[calc(90vh-130px)]">
              {/* FILA 1: NOMBRE + TELÉFONO EN 2 COLUMNAS */}
              <div className="grid grid-cols-2 gap-3.5">
                {/* NOMBRE */}
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Nombre <span className="font-normal text-slate-400 lowercase">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={destinoNombre}
                    onChange={(e) => setDestinoNombre(e.target.value)}
                    placeholder="Supervisor central"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-800 placeholder-slate-400 outline-none transition focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                {/* TELÉFONO */}
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Teléfono / WhatsApp <span className="text-red-500">*</span>
                  </label>
                  <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600">
                    <span className="flex items-center bg-slate-50 border-r border-slate-200 px-3 text-[13px] font-semibold text-slate-700 select-none">
                      +51
                    </span>
                    <input
                      type="tel"
                      required
                      maxLength={9}
                      value={destinoPhone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 9);
                        setDestinoPhone(val);
                      }}
                      placeholder="987 654 321"
                      className="w-full bg-white px-3 py-2 text-[13px] font-medium text-slate-800 placeholder-slate-400 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* FILA 2: EVENTOS A NOTIFICAR */}
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Eventos a notificar
                </label>
                <div className="flex rounded-xl bg-slate-100 p-1 gap-1">
                  {/* AMBOS */}
                  <button
                    type="button"
                    onClick={() => setDestinoEventos('ambos')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[12.5px] transition ${
                      destinoEventos === 'ambos'
                        ? 'bg-white font-bold text-blue-900 shadow-sm border border-slate-200/60'
                        : 'text-slate-600 font-semibold hover:text-slate-900'
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                    </span>
                    <span>Ambos</span>
                  </button>

                  {/* ENTRADAS */}
                  <button
                    type="button"
                    onClick={() => setDestinoEventos('entrada')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[12.5px] transition ${
                      destinoEventos === 'entrada'
                        ? 'bg-white font-bold text-blue-900 shadow-sm border border-slate-200/60'
                        : 'text-slate-600 font-semibold hover:text-slate-900'
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>Entradas</span>
                  </button>

                  {/* SALIDAS */}
                  <button
                    type="button"
                    onClick={() => setDestinoEventos('salida')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[12.5px] transition ${
                      destinoEventos === 'salida'
                        ? 'bg-white font-bold text-blue-900 shadow-sm border border-slate-200/60'
                        : 'text-slate-600 font-semibold hover:text-slate-900'
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    <span>Salidas</span>
                  </button>
                </div>
              </div>

              {/* FILA 3: VEHÍCULOS */}
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Vehículos
                </label>
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden divide-y divide-slate-100">
                  {/* TODOS LOS VEHÍCULOS */}
                  <button
                    type="button"
                    onClick={() => {
                      setDestinoScope('todos');
                      setDestinoVehiculos([]);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition ${
                      destinoScope === 'todos'
                        ? 'bg-blue-50/50 border-l-4 border-l-[#113EB9]'
                        : 'bg-white hover:bg-slate-50 border-l-4 border-l-transparent'
                    }`}
                  >
                    <div
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition ${
                        destinoScope === 'todos'
                          ? 'border-[#113EB9] bg-[#113EB9]'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {destinoScope === 'todos' && (
                        <span className="h-1.5 w-1.5 rounded-full bg-white" />
                      )}
                    </div>
                    <div>
                      <div className="text-[13px] font-bold text-slate-900 leading-tight">
                        Todos los vehículos
                      </div>
                      <div className="text-[11.5px] text-slate-500 leading-tight mt-0.5">
                        Cualquier unidad vinculada a la geocerca
                      </div>
                    </div>
                  </button>

                  {/* VEHÍCULOS ESPECÍFICOS */}
                  <button
                    type="button"
                    onClick={() => setDestinoScope('personalizado')}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition ${
                      destinoScope === 'personalizado'
                        ? 'bg-blue-50/50 border-l-4 border-l-[#113EB9]'
                        : 'bg-white hover:bg-slate-50 border-l-4 border-l-transparent'
                    }`}
                  >
                    <div
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition ${
                        destinoScope === 'personalizado'
                          ? 'border-[#113EB9] bg-[#113EB9]'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {destinoScope === 'personalizado' && (
                        <span className="h-1.5 w-1.5 rounded-full bg-white" />
                      )}
                    </div>
                    <div>
                      <div className="text-[13px] font-bold text-slate-900 leading-tight">
                        Vehículos específicos
                      </div>
                      <div className="text-[11.5px] text-slate-500 leading-tight mt-0.5">
                        Solo las placas que elijas
                      </div>
                    </div>
                  </button>
                </div>

                {/* LISTA EXPANDIBLE SI SELECCIONA ESPECÍFICOS */}
                {destinoScope === 'personalizado' && (
                  <div className="mt-2 space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                        Selecciona las placas ({availableVehiclesList.length})
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setDestinoVehiculos(availableVehiclesList.map((v) => v.id))
                          }
                          className="text-[10.5px] font-bold text-[#113EB9] hover:underline"
                        >
                          Seleccionar todas
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => setDestinoVehiculos([])}
                          className="text-[10.5px] font-bold text-slate-500 hover:underline"
                        >
                          Limpiar
                        </button>
                      </div>
                    </div>

                    <div className="relative">
                      <Search
                        size={13}
                        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        type="text"
                        value={destinoVehicleSearch}
                        onChange={(e) => setDestinoVehicleSearch(e.target.value)}
                        placeholder="Buscar placa..."
                        className="w-full rounded-md border border-slate-200 bg-white py-1.5 pl-7 pr-2 text-[11.5px] outline-none transition focus:border-blue-600"
                      />
                    </div>

                    <div className="geocercas-scroll max-h-[130px] space-y-1 overflow-y-auto pr-1">
                      {availableVehiclesList.length === 0 ? (
                        <p className="p-3 text-center text-[11px] text-slate-400">
                          No hay vehículos vinculados a esta geocerca
                        </p>
                      ) : (
                        availableVehiclesList
                          .filter((v) => {
                            const term = destinoVehicleSearch.trim().toLowerCase();
                            if (!term) return true;
                            return (
                              v.id.toLowerCase().includes(term) ||
                              v.label.toLowerCase().includes(term)
                            );
                          })
                          .map((v) => {
                            const checked = destinoVehiculos.includes(v.id);
                            return (
                              <button
                                key={v.id}
                                type="button"
                                onClick={() => {
                                  setDestinoVehiculos((prev) =>
                                    prev.includes(v.id)
                                      ? prev.filter((id) => id !== v.id)
                                      : [...prev, v.id],
                                  );
                                }}
                                className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-[12px] transition ${
                                  checked
                                    ? 'bg-blue-50 font-semibold text-blue-900'
                                    : 'bg-white text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`flex h-3.5 w-3.5 items-center justify-center rounded border transition ${
                                      checked
                                        ? 'border-[#113EB9] bg-[#113EB9] text-white'
                                        : 'border-slate-300 bg-white'
                                    }`}
                                  >
                                    {checked && <Check size={10} />}
                                  </span>
                                  <Truck
                                    size={12}
                                    className={checked ? 'text-[#113EB9]' : 'text-slate-400'}
                                  />
                                  <span className="truncate">{v.label}</span>
                                </div>
                                <span className="font-mono text-[10px] text-slate-400">{v.id}</span>
                              </button>
                            );
                          })
                      )}
                    </div>

                    <div className="text-[11px] text-slate-500">
                      {destinoVehiculos.length === 0 ? (
                        <span className="inline-flex items-center gap-1.5 font-medium text-amber-600">
                          <AlertCircle size={13} className="shrink-0 text-amber-500" />
                          <span>Sin placas seleccionadas</span>
                        </span>
                      ) : (
                        <span>
                          Supervisando <strong>{destinoVehiculos.length}</strong> de {availableVehiclesList.length} placa(s)
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* FILA 4: CONTACTO ACTIVO */}
              <div className="flex items-center justify-between pt-0.5">
                <div>
                  <div className="text-[13px] font-bold text-slate-900 leading-tight">
                    Contacto activo
                  </div>
                  <div className="text-[11.5px] text-slate-500 leading-tight mt-0.5">
                    Si lo desactivas no recibirá notificaciones
                  </div>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={destinoActivo}
                    onChange={(e) => setDestinoActivo(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-slate-300 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#113EB9] peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none"></div>
                </label>
              </div>

            </div>

            {/* FILA 5: BOTONES DE ACCIÓN (PINNED FOOTER) */}
            <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/50 px-6 py-3 shrink-0">
              <button
                type="button"
                onClick={() => setDestinoModalOpen(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-[12.5px] font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingDestino}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#113EB9] px-5 py-2 text-[12.5px] font-bold text-white shadow-sm transition hover:bg-[#0d3094] disabled:opacity-50"
              >
                {savingDestino ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
                <span>{editingDestino ? 'Guardar cambios' : 'Guardar destino'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  );
}
