'use client';
import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { HiTruck } from 'react-icons/hi2';
import { API_BASE_URL125 } from '@/app/components/urlsApi/urlApi';
import { IoTimeOutline } from 'react-icons/io5';
import { createPortal } from 'react-dom';

interface ConductorTurno {
  codTaxi: number;
  apellidos: string;
  turno: string;
  horaInicio: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  conductores: { codigo: number; apellidos: string }[];
  onGuardado?: (codigos: number[]) => Promise<void>;
  tipo?: string | null;
}

const HORAS = Array.from(
  { length: 24 },
  (_, i) => `${i.toString().padStart(2, '0')}:00`,
);

function HoraSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [inputVal, setInputVal] = useState(value);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputVal(value);
  }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleFocus = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
    setOpen(true);
  };

  const handleSelect = (h: string) => {
    setInputVal(h);
    onChange(h);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative w-28">
      <div className="flex items-center rounded-md border border-gray-200 bg-white transition focus-within:border-red-400 focus-within:ring-1 focus-within:ring-red-400/20">
        <IoTimeOutline className="ml-2 h-3 w-3 flex-shrink-0 text-gray-400" />
        <input
          value={inputVal}
          onChange={(e) => {
            setInputVal(e.target.value);
            onChange(e.target.value);
          }}
          onFocus={handleFocus}
          placeholder="HH:MM"
          className="w-full bg-transparent py-1.5 pl-1.5 pr-2 text-[11px] text-gray-700 focus:outline-none"
        />
      </div>

      {open &&
        typeof window !== 'undefined' &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: dropdownPos.top,
              left: dropdownPos.left,
              width: dropdownPos.width,
              zIndex: 99999,
            }}
            className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-lg"
          >
            <div className="max-h-44 overflow-y-auto">
              {HORAS.map((h) => (
                <button
                  key={h}
                  type="button"
                  onMouseDown={() => handleSelect(h)}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] transition-colors hover:bg-red-50 hover:text-red-600 ${
                    inputVal === h
                      ? 'bg-red-50 font-semibold text-red-600'
                      : 'text-gray-600'
                  }`}
                >
                  <span className="w-4 text-center font-mono">
                    {h.split(':')[0]}
                  </span>
                  <span className="text-gray-300">:</span>
                  <span className="font-mono">00</span>
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

export default function ModalTurnoConductor({
  isOpen,
  onClose,
  conductores,
  onGuardado,
  tipo,
}: Props) {
  const [datos, setDatos] = useState<ConductorTurno[]>([]);
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const conductoresKey = conductores.map((c) => c.codigo).join(',');

  useEffect(() => {
    if (!isOpen || conductores.length === 0) {
      setDatos([]);
      return;
    }

    let cancelled = false;

    const fetchTurnos = async () => {
      setLoading(true);
      setDatos([]);
      try {
        const params = conductores.map((c) => `codtaxis=${c.codigo}`).join('&');
        const tipoParam = tipo ? `&tipo=${encodeURIComponent(tipo)}` : '';
        const res = await fetch(
          `${API_BASE_URL125}/api/Preplan/turno?${params}${tipoParam}`,
        );
        const data: { codTaxi: number; turno: string; horaInicio: string }[] =
          await res.json();

        if (cancelled) return;

        const merged = data.map((d) => ({
          ...d,
          turno: d.turno ?? '',
          horaInicio: d.horaInicio ?? '',
          apellidos:
            conductores.find((c) => c.codigo === d.codTaxi)?.apellidos ?? '',
        }));
        setDatos(merged);
      } catch {
        if (!cancelled) toast.error('Error al obtener los turnos');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchTurnos();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, conductoresKey, tipo]);

  const handleChange = (
    codTaxi: number,
    campo: 'turno' | 'horaInicio',
    valor: string,
  ) => {
    setDatos((prev) =>
      prev.map((d) => (d.codTaxi === codTaxi ? { ...d, [campo]: valor } : d)),
    );
  };

  const handleGuardar = async () => {
    setGuardando(true);
    try {
      // 1. PATCH turnos
      const res = await fetch(`${API_BASE_URL125}/api/Preplan/turno`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          datos.map(({ codTaxi, turno, horaInicio }) => ({
            codTaxi,
            turno,
            horaInicio,
          })),
        ),
      });
      if (!res.ok) throw new Error('Error al actualizar turnos');

      toast.success('Turnos actualizados correctamente');
      onClose();

      // 2. Generar Excel después de cerrar el modal
      if (onGuardado) {
        await onGuardado(datos.map((d) => d.codTaxi));
      }
    } catch {
      toast.error('Error al guardar los turnos');
    } finally {
      setGuardando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div
        className="flex w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl"
        style={{ maxHeight: '85vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between rounded-t-2xl border-b border-red-100 bg-red-50 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500">
              <HiTruck className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-red-700">
              Turnos de Conductores
            </span>
          </div>
          <button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded-full text-red-300 transition hover:bg-red-100 hover:text-red-600"
          >
            ✕
          </button>
        </div>

        {/* Columnas header */}
        <div className="grid grid-cols-[1fr_110px_112px] gap-3 border-b border-gray-100 bg-gray-50 px-5 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Conductor
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Turno
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Hora inicio
          </span>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-1.5">
              {datos.map((d, idx) => (
                <div
                  key={d.codTaxi}
                  className="grid grid-cols-[1fr_110px_112px] items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5 transition hover:border-gray-200 hover:bg-gray-100/60"
                >
                  {/* Conductor */}
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-500 to-slate-700 text-[10px] font-bold text-white">
                      {d.apellidos.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-semibold text-gray-700">
                        {d.apellidos}
                      </p>
                      <p className="text-[9px] text-gray-400">
                        ID: {d.codTaxi}
                      </p>
                    </div>
                  </div>

                  {/* Turno */}
                  <select
                    value={d.turno}
                    onChange={(e) =>
                      handleChange(d.codTaxi, 'turno', e.target.value)
                    }
                    className={`w-full rounded-lg border px-2 py-1.5 text-[11px] font-medium focus:outline-none focus:ring-1 focus:ring-red-400/30 ${
                      d.turno === 'D'
                        ? 'border-amber-200 bg-amber-50 text-amber-700 focus:border-amber-400'
                        : d.turno === 'N'
                          ? 'border-indigo-200 bg-indigo-50 text-indigo-700 focus:border-indigo-400'
                          : 'border-gray-200 bg-white text-gray-500'
                    }`}
                  >
                    <option value="">Turno</option>
                    <option value="D">Día</option>
                    <option value="N">Noche</option>
                  </select>

                  {/* Hora */}
                  <HoraSelect
                    value={d.horaInicio}
                    onChange={(v) => handleChange(d.codTaxi, 'horaInicio', v)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between rounded-b-2xl border-t border-gray-100 bg-gray-50 px-5 py-3">
          <span className="text-[10px] text-gray-400">
            {datos.length} conductor{datos.length !== 1 ? 'es' : ''} cargado
            {datos.length !== 1 ? 's' : ''}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-1.5 text-[11px] text-gray-600 transition hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              onClick={handleGuardar}
              disabled={guardando || loading}
              className="rounded-lg bg-red-500 px-4 py-1.5 text-[11px] font-medium text-white transition hover:bg-red-600 disabled:opacity-50"
            >
              {guardando ? 'Generando...' : `Generar (${datos.length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
