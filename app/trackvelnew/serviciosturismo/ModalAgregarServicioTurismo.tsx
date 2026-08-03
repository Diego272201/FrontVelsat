'use client';

import React, { useMemo, useRef, useState } from 'react';
import { toast, Toaster } from 'sonner';
import '@/app/styles/sonner.css';
import { ChevronDown, Eye, PlusCircle } from 'lucide-react';
import BaseModal from '@/app/components/ui/BaseModal';

interface FormServicioTurismo {
  fechainicio: string; // yyyy-MM-dd (input date)
  horainicio: string; // HH:mm (input time)
  horaretorno: string;
  placa: string; // codunidad combinado (bus-placa), seleccionado de la lista de unidades
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
  onCreated: () => void;
  unidades: string[]; // codunidad ya obtenidos por la página (bus-placa), no se vuelve a consultar
}

const API_URL = 'https://do.velsat.pe:2083/api/ServTurismo';

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
}> = ({ label, value, onChange, placeholder, required, type = 'text', textarea }) => (
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
        className="w-full rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 text-[12px] focus:border-[#113EB9] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#113EB9]"
      />
    ) : (
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 text-[12px] focus:border-[#113EB9] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#113EB9]"
      />
    )}
  </div>
);

const SelectPlacaBuscable: React.FC<{
  value: string;
  opciones: string[];
  onChange: (valor: string) => void;
}> = ({ value, opciones, onChange }) => {
  const [query, setQuery] = useState(value);
  const [abierto, setAbierto] = useState(false);
  const cerrandoPorClickRef = useRef(false);

  const opcionesFiltradas = useMemo(() => {
    const texto = query.trim().toLowerCase();
    if (texto === '') return opciones;
    return opciones.filter((op) => op.toLowerCase().includes(texto));
  }, [opciones, query]);

  const seleccionar = (opcion: string) => {
    setQuery(opcion);
    onChange(opcion);
    setAbierto(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onFocus={() => setAbierto(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(''); // hasta que no seleccione una opción de la lista, no hay placa válida
            setAbierto(true);
          }}
          onBlur={() => {
            // pequeño delay para que el click en una opción se registre antes de cerrar
            setTimeout(() => {
              if (!cerrandoPorClickRef.current) {
                setAbierto(false);
                // si lo que quedó escrito no coincide con la selección, se limpia
                if (query !== value) {
                  setQuery(value);
                }
              }
              cerrandoPorClickRef.current = false;
            }, 120);
          }}
          placeholder="Buscar unidad (bus-placa)..."
          className="w-full rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 pr-7 text-[12px] focus:border-[#113EB9] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#113EB9]"
        />
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
      </div>

      {abierto && (
        <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
          {opcionesFiltradas.length === 0 ? (
            <div className="px-3 py-2 text-[12px] text-gray-400">
              Sin coincidencias
            </div>
          ) : (
            opcionesFiltradas.map((opcion) => (
              <div
                key={opcion}
                onMouseDown={() => {
                  cerrandoPorClickRef.current = true;
                  seleccionar(opcion);
                }}
                className={`cursor-pointer px-3 py-1.5 text-[12px] hover:bg-blue-50 ${
                  opcion === value ? 'bg-blue-50 font-semibold text-[#113EB9]' : 'text-gray-700'
                }`}
              >
                {opcion}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

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
  onCreated,
  unidades,
}) => {
  const [form, setForm] = useState<FormServicioTurismo>(construirFormularioInicial());
  const [isSaving, setIsSaving] = useState(false);

  const actualizarCampo = (campo: keyof FormServicioTurismo) => (valor: string) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
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

      // form.placa guarda el codunidad combinado (ej. "H442-BXR197"); se separa en bus/placa
      // para que quede igual que en la tabla y coincida con la unidad seleccionada.
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

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);

      if (response.ok) {
        toast.success(data?.mensaje || 'Servicio creado correctamente', {
          className: 'toast-slide-in',
          richColors: true,
        });
        handleReset();
        onClose();
        onCreated();
      } else {
        toast.error(data?.error || data?.mensaje || 'Error al crear el servicio', {
          className: 'toast-slide-in',
          richColors: true,
        });
      }
    } catch {
      toast.error('Error de conexión al crear el servicio', {
        className: 'toast-slide-in',
        richColors: true,
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <>
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
        confirmButtonClass="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
          {/* Formulario */}
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
                <CampoTexto
                  label="Tipo unidad"
                  value={form.tipounidad}
                  onChange={actualizarCampo('tipounidad')}
                />
                <CampoTexto
                  label="Piloto"
                  value={form.piloto}
                  onChange={actualizarCampo('piloto')}
                />
                <CampoTexto
                  label="Brevete"
                  value={form.brevete}
                  onChange={actualizarCampo('brevete')}
                />
                <CampoTexto
                  label="Celular"
                  value={form.celular}
                  onChange={actualizarCampo('celular')}
                />
                <CampoTexto
                  label="Copiloto"
                  value={form.copiloto}
                  onChange={actualizarCampo('copiloto')}
                />
                <CampoTexto
                  label="Brevete copiloto"
                  value={form.cobrevete}
                  onChange={actualizarCampo('cobrevete')}
                />
                <CampoTexto
                  label="Celular copiloto"
                  value={form.cocelular}
                  onChange={actualizarCampo('cocelular')}
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

          {/* Vista previa */}
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

      <Toaster />
    </>
  );
};

export default ModalAgregarServicioTurismo;
