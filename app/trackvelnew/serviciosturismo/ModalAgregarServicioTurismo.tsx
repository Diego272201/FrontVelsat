'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { toast, Toaster } from 'sonner';
import '@/app/styles/sonner.css';
import { CheckCircle, Eye, MessageCircle, PlusCircle } from 'lucide-react';
import BaseModal from '@/app/components/ui/BaseModal';
import { useUsername } from '@/hooks/useUsername';
import { API_TAXI } from './constants';
import {
  Conductor,
  SelectConductorBuscable,
  SelectPlacaBuscable,
  SelectTipoUnidad,
} from './SelectBuscable';
import { ResultadoAlertasWhatsapp } from './whatsappAlerta';

interface FormServicioTurismo {
  fechainicio: string;
  horainicio: string;
  horaretorno: string;
  placa: string;
  brevete: string;
  piloto: string;
  celular: string;
  cobrevete: string;
  copiloto: string;
  cocelular: string;
  tipounidad: string;
  cliente: string;
  grupo: string;
  numpax: string;
  origen: string;
  destino: string;
  guiaturista: string;
  vuelocliente: string;
  observaciones: string;
  ejecutivo: string;
  cotizacion: string;
  instrucciones: string;
  indicaciones: string;
}

interface ModalAgregarServicioTurismoProps {
  isOpen: boolean;
  onClose: () => void;
  crearServicio: (
    payload: Record<string, unknown>,
    celularPiloto: string,
  ) => Promise<{
    ok: boolean;
    offline: boolean;
    mensaje: string;
    whatsapp: ResultadoAlertasWhatsapp | null;
  }>;
  unidades: string[];
}

function getIsoToday(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function isoToDdMmYyyy(iso: string): string {
  if (!iso) return '';
  const [yyyy, mm, dd] = iso.split('-');
  return `${dd}/${mm}/${yyyy}`;
}

function ddMmYyyyLegible(iso: string): string {
  if (!iso) return '—';
  const [yyyy, mm, dd] = iso.split('-');
  return `${dd}/${mm}/${yyyy}`;
}

const construirFormularioInicial = (): FormServicioTurismo => ({
  fechainicio: getIsoToday(),
  horainicio: '',
  horaretorno: '',
  placa: '',
  brevete: '',
  piloto: '',
  celular: '',
  cobrevete: '',
  copiloto: '',
  cocelular: '',
  tipounidad: '',
  cliente: '',
  grupo: '',
  numpax: '',
  origen: '',
  destino: '',
  guiaturista: '',
  vuelocliente: '',
  observaciones: '',
  ejecutivo: '',
  cotizacion: '',
  instrucciones: '',
  indicaciones: '',
});

const CampoTexto: React.FC<{
  label: string;
  value: string;
  onChange: (valor: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  textarea?: boolean;
  readOnly?: boolean;
}> = ({ label, value, onChange, placeholder, required, type = 'text', textarea, readOnly }) => (
  <div className="space-y-1">
    <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">
      {label}
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
    {textarea ? (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        readOnly={readOnly}
        className={`w-full rounded-md border border-gray-200 px-2 py-1.5 text-[12px] focus:border-[#113EB9] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#113EB9] ${
          readOnly ? 'cursor-not-allowed bg-gray-100 text-gray-500' : 'bg-gray-50'
        }`}
      />
    ) : (
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        className={`w-full rounded-md border border-gray-200 px-2 py-1.5 text-[12px] focus:border-[#113EB9] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#113EB9] ${
          readOnly ? 'cursor-not-allowed bg-gray-100 text-gray-500' : 'bg-gray-50'
        }`}
      />
    )}
  </div>
);

const FilaPreview: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-1.5 last:border-0">
    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
      {label}
    </span>
    <span
      className={`text-right text-[12px] ${value ? 'text-slate-800' : 'text-slate-300'}`}
    >
      {value || '—'}
    </span>
  </div>
);

const ModalAgregarServicioTurismo: React.FC<ModalAgregarServicioTurismoProps> = ({
  isOpen,
  onClose,
  crearServicio,
  unidades,
}) => {
  const [form, setForm] = useState<FormServicioTurismo>(construirFormularioInicial());
  const [isSaving, setIsSaving] = useState(false);
  const [conductores, setConductores] = useState<Conductor[]>([]);
  const [showReporte, setShowReporte] = useState(false);
  const [reporte, setReporte] = useState<{
    mensaje: string;
    whatsapp: ResultadoAlertasWhatsapp | null;
    offline: boolean;
  }>({ mensaje: '', whatsapp: null, offline: false });
  const { username, isReady } = useUsername();

  const actualizarCampo = (campo: keyof FormServicioTurismo) => (valor: string) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  };

  useEffect(() => {
    if (!isOpen || !isReady || !username) return;

    const fetchConductores = async () => {
      try {
        const res = await fetch(`${API_TAXI}?codusuario=${username}`);
        if (!res.ok) {
          setConductores([]);
          return;
        }
        const data = await res.json();
        setConductores(Array.isArray(data) ? data : []);
      } catch {
        setConductores([]);
      }
    };

    fetchConductores();
  }, [isOpen, isReady, username]);

  const seleccionarPiloto = (conductor: Conductor) => {
    setForm((prev) => ({
      ...prev,
      piloto: conductor.apellidos || '',
      brevete: conductor.brevete || '',
      celular: conductor.telefono || '',
    }));
  };

  const seleccionarCopiloto = (conductor: Conductor) => {
    setForm((prev) => ({
      ...prev,
      copiloto: conductor.apellidos || '',
      cobrevete: conductor.brevete || '',
      cocelular: conductor.telefono || '',
    }));
  };

  const manejarCambioPiloto = (valor: string) => {
    setForm((prev) => ({
      ...prev,
      piloto: valor,
      ...(valor.trim() === '' ? { brevete: '', celular: '' } : {}),
    }));
  };

  const manejarCambioCopiloto = (valor: string) => {
    setForm((prev) => ({
      ...prev,
      copiloto: valor,
      ...(valor.trim() === '' ? { cobrevete: '', cocelular: '' } : {}),
    }));
  };

  const camposRequeridosCompletos = useMemo(
    () =>
      form.cliente.trim() !== '' &&
      form.origen.trim() !== '' &&
      form.destino.trim() !== '',
    [form.cliente, form.origen, form.destino],
  );

  const handleReset = () => {
    setForm(construirFormularioInicial());
  };

  const handleModalClose = () => {
    if (!isSaving) {
      handleReset();
      onClose();
    }
  };

  const handleGuardar = async () => {
    if (!camposRequeridosCompletos) {
      toast.error('Cliente, origen y destino son obligatorios', {
        className: 'toast-slide-in',
        richColors: true,
      });
      return;
    }

    setIsSaving(true);

    try {
      const valorOVacio = (valor: string) => (valor.trim() === '' ? null : valor.trim());

      const [busSeleccionado, placaSeleccionada] = form.placa
        ? (() => {
            const idx = form.placa.indexOf('-');
            return idx === -1
              ? [form.placa, '']
              : [form.placa.slice(0, idx), form.placa.slice(idx + 1)];
          })()
        : ['', ''];

      const payload = {
        fechainicio: isoToDdMmYyyy(form.fechainicio),
        instrucciones: valorOVacio(form.instrucciones),
        horainicio: form.horainicio || null,
        indicaciones: valorOVacio(form.indicaciones),
        horaretorno: valorOVacio(form.horaretorno),
        bus: valorOVacio(busSeleccionado),
        placa: valorOVacio(placaSeleccionada),
        brevete: valorOVacio(form.brevete),
        piloto: valorOVacio(form.piloto),
        celular: valorOVacio(form.celular),
        cobrevete: valorOVacio(form.cobrevete),
        copiloto: valorOVacio(form.copiloto),
        cocelular: valorOVacio(form.cocelular),
        tipounidad: valorOVacio(form.tipounidad),
        cliente: form.cliente.trim(),
        grupo: valorOVacio(form.grupo),
        numpax: valorOVacio(form.numpax),
        origen: form.origen.trim(),
        destino: form.destino.trim(),
        guiaturista: valorOVacio(form.guiaturista),
        vuelocliente: valorOVacio(form.vuelocliente),
        observaciones: valorOVacio(form.observaciones),
        ejecutivo: valorOVacio(form.ejecutivo),
        cotizacion: valorOVacio(form.cotizacion),
      };

      const resultado = await crearServicio(payload, form.celular);

      if (resultado.ok) {
        setReporte({
          mensaje: resultado.mensaje,
          whatsapp: resultado.whatsapp,
          offline: resultado.offline,
        });
        setShowReporte(true);
      } else {
        toast.error(resultado.mensaje, {
          className: 'toast-slide-in',
          richColors: true,
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCerrarReporte = () => {
    setShowReporte(false);
    handleReset();
    onClose();
  };

  if (!isOpen && !showReporte) {
    return null;
  }

  return (
    <>
      {isOpen && !showReporte && (
      <BaseModal
        isOpen={isOpen}
        onClose={handleModalClose}
        title="Agregar Servicio de Turismo"
        subtitle="Completa el formulario; a la derecha verás una vista previa del servicio"
        icon={<PlusCircle className="h-4 w-4 text-blue-600" />}
        iconBgColor="bg-blue-100"
        size="5xl"
        confirmText={isSaving ? 'Guardando...' : 'Guardar Servicio'}
        onConfirm={handleGuardar}
        onCancel={handleModalClose}
        isLoading={isSaving}
        isConfirmDisabled={!camposRequeridosCompletos}
        confirmButtonClass="bg-brandSecondary hover:bg-brandSecondary-hover text-white font-medium"
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#113EB9]">
                Fecha y horarios
              </p>
              <div className="grid grid-cols-3 gap-3">
                <CampoTexto
                  label="Fecha inicio"
                  type="date"
                  value={form.fechainicio}
                  onChange={actualizarCampo('fechainicio')}
                  required
                />
                <CampoTexto
                  label="Hora inicio"
                  type="time"
                  value={form.horainicio}
                  onChange={actualizarCampo('horainicio')}
                />
                <CampoTexto
                  label="Hora retorno"
                  value={form.horaretorno}
                  onChange={actualizarCampo('horaretorno')}
                  placeholder="Ej. 18:00"
                />
              </div>
            </div>

            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#113EB9]">
                Unidad y piloto
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                    Placa
                  </label>
                  <SelectPlacaBuscable
                    value={form.placa}
                    opciones={unidades}
                    onChange={actualizarCampo('placa')}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                    Tipo unidad
                  </label>
                  <SelectTipoUnidad
                    value={form.tipounidad}
                    onChange={actualizarCampo('tipounidad')}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                    Piloto
                  </label>
                  <SelectConductorBuscable
                    value={form.piloto}
                    conductores={conductores}
                    onSeleccionar={seleccionarPiloto}
                    onChangeTexto={manejarCambioPiloto}
                  />
                </div>
                <CampoTexto
                  label="Brevete"
                  value={form.brevete}
                  onChange={actualizarCampo('brevete')}
                  readOnly
                />
                <CampoTexto
                  label="Celular"
                  value={form.celular}
                  onChange={actualizarCampo('celular')}
                  readOnly
                />
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                    Copiloto
                  </label>
                  <SelectConductorBuscable
                    value={form.copiloto}
                    conductores={conductores}
                    onSeleccionar={seleccionarCopiloto}
                    onChangeTexto={manejarCambioCopiloto}
                  />
                </div>
                <CampoTexto
                  label="Brevete copiloto"
                  value={form.cobrevete}
                  onChange={actualizarCampo('cobrevete')}
                  readOnly
                />
                <CampoTexto
                  label="Celular copiloto"
                  value={form.cocelular}
                  onChange={actualizarCampo('cocelular')}
                  readOnly
                />
              </div>
            </div>

            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#113EB9]">
                Cliente y servicio
              </p>
              <div className="grid grid-cols-2 gap-3">
                <CampoTexto
                  label="Cliente"
                  value={form.cliente}
                  onChange={actualizarCampo('cliente')}
                  required
                />
                <CampoTexto label="Grupo" value={form.grupo} onChange={actualizarCampo('grupo')} />
                <CampoTexto
                  label="N° Pax"
                  value={form.numpax}
                  onChange={actualizarCampo('numpax')}
                />
                <CampoTexto
                  label="Guía turista"
                  value={form.guiaturista}
                  onChange={actualizarCampo('guiaturista')}
                />
                <CampoTexto
                  label="Origen"
                  value={form.origen}
                  onChange={actualizarCampo('origen')}
                  required
                />
                <CampoTexto
                  label="Destino"
                  value={form.destino}
                  onChange={actualizarCampo('destino')}
                  required
                />
                <CampoTexto
                  label="Vuelo cliente"
                  value={form.vuelocliente}
                  onChange={actualizarCampo('vuelocliente')}
                />
                <CampoTexto
                  label="Ejecutivo"
                  value={form.ejecutivo}
                  onChange={actualizarCampo('ejecutivo')}
                />
                <CampoTexto
                  label="Cotización"
                  value={form.cotizacion}
                  onChange={actualizarCampo('cotizacion')}
                />
              </div>
            </div>

            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#113EB9]">
                Notas
              </p>
              <div className="grid grid-cols-1 gap-3">
                <CampoTexto
                  label="Instrucciones"
                  value={form.instrucciones}
                  onChange={actualizarCampo('instrucciones')}
                  textarea
                />
                <CampoTexto
                  label="Indicaciones"
                  value={form.indicaciones}
                  onChange={actualizarCampo('indicaciones')}
                  textarea
                />
                <CampoTexto
                  label="Observaciones"
                  value={form.observaciones}
                  onChange={actualizarCampo('observaciones')}
                  textarea
                />
              </div>
            </div>
          </div>

          <div className="lg:sticky lg:top-0 lg:self-start">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center gap-2 border-b border-slate-200 pb-2">
                <Eye className="h-4 w-4 text-[#113EB9]" />
                <p className="text-[12px] font-bold uppercase tracking-wide text-slate-700">
                  Vista previa del servicio
                </p>
              </div>

              <FilaPreview label="Fecha inicio" value={ddMmYyyyLegible(form.fechainicio)} />
              <FilaPreview label="Hora inicio" value={form.horainicio} />
              <FilaPreview label="Hora retorno" value={form.horaretorno} />
              <FilaPreview label="Placa" value={form.placa} />
              <FilaPreview label="Tipo unidad" value={form.tipounidad} />
              <FilaPreview label="Piloto" value={form.piloto} />
              <FilaPreview label="Brevete" value={form.brevete} />
              <FilaPreview label="Celular" value={form.celular} />
              <FilaPreview label="Copiloto" value={form.copiloto} />
              <FilaPreview label="Brevete copiloto" value={form.cobrevete} />
              <FilaPreview label="Celular copiloto" value={form.cocelular} />
              <FilaPreview label="Cliente" value={form.cliente} />
              <FilaPreview label="Grupo" value={form.grupo} />
              <FilaPreview label="N° Pax" value={form.numpax} />
              <FilaPreview label="Origen" value={form.origen} />
              <FilaPreview label="Destino" value={form.destino} />
              <FilaPreview label="Guía turista" value={form.guiaturista} />
              <FilaPreview label="Vuelo cliente" value={form.vuelocliente} />
              <FilaPreview label="Ejecutivo" value={form.ejecutivo} />
              <FilaPreview label="Cotización" value={form.cotizacion} />
              <FilaPreview label="Instrucciones" value={form.instrucciones} />
              <FilaPreview label="Indicaciones" value={form.indicaciones} />
              <FilaPreview label="Observaciones" value={form.observaciones} />

              {!camposRequeridosCompletos && (
                <p className="mt-3 rounded-md bg-amber-50 px-2 py-1.5 text-[11px] font-medium text-amber-700">
                  Completa Cliente, Origen y Destino para poder guardar.
                </p>
              )}
            </div>
          </div>
        </div>
      </BaseModal>
      )}

      {showReporte && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="rounded-t-2xl border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-5">
              <h3 className="text-center text-lg font-bold text-gray-800">
                Reporte de Carga
              </h3>
            </div>

            <div className="space-y-4 p-6">
              <div className="flex items-center gap-3 rounded-xl bg-green-50 p-4">
                <CheckCircle className="h-6 w-6 flex-shrink-0 text-green-600" />
                <p className="font-bold text-green-700">{reporte.mensaje}</p>
              </div>

              <div
                className={`flex items-center gap-3 rounded-xl p-4 ${
                  reporte.offline
                    ? 'bg-amber-50'
                    : reporte.whatsapp === null
                      ? 'bg-gray-50'
                      : reporte.whatsapp.enviados > 0
                        ? 'bg-green-50'
                        : 'bg-red-50'
                }`}
              >
                <MessageCircle
                  className={`h-6 w-6 flex-shrink-0 ${
                    reporte.offline
                      ? 'text-amber-600'
                      : reporte.whatsapp === null
                        ? 'text-gray-500'
                        : reporte.whatsapp.enviados > 0
                          ? 'text-green-600'
                          : 'text-red-600'
                  }`}
                />
                <p
                  className={`font-bold ${
                    reporte.offline
                      ? 'text-amber-700'
                      : reporte.whatsapp === null
                        ? 'text-gray-700'
                        : reporte.whatsapp.enviados > 0
                          ? 'text-green-700'
                          : 'text-red-700'
                  }`}
                >
                  {reporte.offline
                    ? 'Sin conexión: la alerta de WhatsApp se enviará cuando el servicio se sincronice'
                    : reporte.whatsapp === null
                      ? 'No hay celular del piloto: no se envió alerta de WhatsApp'
                      : reporte.whatsapp.enviados > 0
                        ? 'Alerta de WhatsApp enviada al piloto'
                        : 'No se pudo enviar la alerta de WhatsApp al piloto'}
                </p>
              </div>
            </div>

            <div className="rounded-b-2xl border-t border-gray-200 bg-gray-50 px-6 py-4">
              <button
                onClick={handleCerrarReporte}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 font-bold text-white shadow-lg transition-all hover:bg-red-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <Toaster />
    </>
  );
};

export default ModalAgregarServicioTurismo;
