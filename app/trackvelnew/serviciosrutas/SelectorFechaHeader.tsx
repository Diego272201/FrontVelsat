'use client';

import React, { useEffect, useMemo, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';

interface SelectorFechaHeaderProps {
  fechaIso: string; // 'yyyy-MM-dd'
  onFechaChange: (fecha: string) => void;
  esHoy: boolean;
  onHoy: () => void;
}

const DIAS_SEMANA = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

const capitalizar = (str: string) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1) : '';

/** Parsea 'yyyy-MM-dd' en fecha local exacta evitando desplazamientos por zona horaria UTC */
const parseIsoLocal = (iso: string): Date => {
  if (!iso) return new Date();
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

/** Formatea una fecha local a 'yyyy-MM-dd' */
const toIsoLocal = (dt: Date): string => {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const SelectorFechaHeader: React.FC<SelectorFechaHeaderProps> = ({
  fechaIso,
  onFechaChange,
  esHoy,
  onHoy,
}) => {
  const [abierto, setAbierto] = useState(false);

  // Fecha seleccionada como objeto Date local
  const fechaSeleccionada = useMemo(() => parseIsoLocal(fechaIso), [fechaIso]);

  // Mes que se está visualizando en el calendario
  const [mesVista, setMesVista] = useState<Date>(() => parseIsoLocal(fechaIso));

  // Al cambiar la fecha externamente o al abrir el popover, se alinea la vista al mes correspondiente
  useEffect(() => {
    setMesVista(parseIsoLocal(fechaIso));
  }, [fechaIso]);

  // Fecha de hoy local
  const hoyIso = useMemo(() => toIsoLocal(new Date()), []);
  const hoyDate = useMemo(() => parseIsoLocal(hoyIso), [hoyIso]);

  // Ayer y Mañana en formato ISO
  const ayerIso = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return toIsoLocal(d);
  }, []);

  const mananaIso = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return toIsoLocal(d);
  }, []);

  // Textos para mostrar en el botón
  const fechaTextoCorto = useMemo(() => {
    return format(fechaSeleccionada, 'dd/MM/yyyy');
  }, [fechaSeleccionada]);

  const diaSemanaTexto = useMemo(() => {
    return capitalizar(format(fechaSeleccionada, 'EEEE', { locale: es }));
  }, [fechaSeleccionada]);

  const mesAnoTexto = useMemo(() => {
    return capitalizar(format(mesVista, 'MMMM yyyy', { locale: es }));
  }, [mesVista]);

  // Navegación de días (+1 / -1)
  const retrocederDia = () => {
    const d = parseIsoLocal(fechaIso);
    d.setDate(d.getDate() - 1);
    onFechaChange(toIsoLocal(d));
  };

  const avanzarDia = () => {
    const d = parseIsoLocal(fechaIso);
    d.setDate(d.getDate() + 1);
    onFechaChange(toIsoLocal(d));
  };

  // Navegación de mes en el calendario
  const retrocederMes = () => {
    setMesVista((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const avanzarMes = () => {
    setMesVista((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Generación de celdas para el mes actual (lunes como primer día)
  const celdasMes = useMemo(() => {
    const year = mesVista.getFullYear();
    const month = mesVista.getMonth();

    const primerDia = new Date(year, month, 1);
    const totalDiasMes = new Date(year, month + 1, 0).getDate();
    const totalDiasMesAnterior = new Date(year, month, 0).getDate();

    // Offset para empezar en Lunes (0 = Lunes, 6 = Domingo)
    const offsetInicio = (primerDia.getDay() + 6) % 7;

    const celdas: Array<{
      dia: number;
      mesOffset: number; // -1 mes anterior, 0 mes actual, 1 mes siguiente
      iso: string;
      esHoy: boolean;
      esSeleccionada: boolean;
    }> = [];

    // Días del mes anterior
    for (let i = offsetInicio - 1; i >= 0; i--) {
      const diaNum = totalDiasMesAnterior - i;
      const dt = new Date(year, month - 1, diaNum);
      const iso = toIsoLocal(dt);
      celdas.push({
        dia: diaNum,
        mesOffset: -1,
        iso,
        esHoy: iso === hoyIso,
        esSeleccionada: iso === fechaIso,
      });
    }

    // Días del mes actual
    for (let d = 1; d <= totalDiasMes; d++) {
      const dt = new Date(year, month, d);
      const iso = toIsoLocal(dt);
      celdas.push({
        dia: d,
        mesOffset: 0,
        iso,
        esHoy: iso === hoyIso,
        esSeleccionada: iso === fechaIso,
      });
    }

    // Días del mes siguiente para completar la cuadrícula (hasta múltiplos de 7)
    const faltantes = (7 - (celdas.length % 7)) % 7;
    for (let d = 1; d <= faltantes; d++) {
      const dt = new Date(year, month + 1, d);
      const iso = toIsoLocal(dt);
      celdas.push({
        dia: d,
        mesOffset: 1,
        iso,
        esHoy: iso === hoyIso,
        esSeleccionada: iso === fechaIso,
      });
    }

    return celdas;
  }, [mesVista, fechaIso, hoyIso]);

  const seleccionarDia = (iso: string) => {
    onFechaChange(iso);
    setAbierto(false);
  };

  return (
    <div className="flex items-center gap-1.5">
      {/* Contenedor compacto con flechas prev/next y trigger central */}
      <div className="flex items-center rounded-lg border border-white/25 bg-black/20 p-0.5 text-white shadow-inner backdrop-blur-xs transition hover:border-white/35">
        {/* Flecha día anterior */}
        <button
          type="button"
          onClick={retrocederDia}
          title="Día anterior"
          className="flex h-7 w-6 items-center justify-center rounded text-white/80 transition hover:bg-white/15 hover:text-white"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>

        {/* Trigger del Popover */}
        <Popover.Root open={abierto} onOpenChange={setAbierto}>
          <Popover.Trigger asChild>
            <button
              type="button"
              className="flex h-7 items-center gap-2 rounded px-2.5 text-[12px] font-semibold text-white transition hover:bg-white/15 focus:outline-none"
              title="Seleccionar fecha de servicios"
            >
              <CalendarDays className="h-3.5 w-3.5 text-blue-200 shrink-0" />
              <span className="font-bold tracking-tight">{fechaTextoCorto}</span>
              <span className="hidden text-[11px] font-medium text-blue-200 capitalize xl:inline">
                {diaSemanaTexto}
              </span>
              <ChevronDown
                className={`h-3 w-3 text-white/60 transition-transform duration-200 ${
                  abierto ? 'rotate-180 text-white' : ''
                }`}
              />
            </button>
          </Popover.Trigger>

          <Popover.Portal>
            <Popover.Content
              sideOffset={8}
              align="end"
              className="z-[9999] w-[300px] select-none rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xl outline-none animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
            >
              {/* Barra de accesos directos rápidos */}
              <div className="mb-3 grid grid-cols-3 gap-1.5 border-b border-slate-100 pb-2.5">
                <button
                  type="button"
                  onClick={() => seleccionarDia(ayerIso)}
                  className={`rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                    fechaIso === ayerIso
                      ? 'bg-blue-50 text-[#113EB9] ring-1 ring-blue-300 font-bold'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Ayer
                </button>
                <button
                  type="button"
                  onClick={() => seleccionarDia(hoyIso)}
                  className={`rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                    fechaIso === hoyIso
                      ? 'bg-[#113EB9] text-white shadow-xs font-bold'
                      : 'bg-blue-50 text-[#113EB9] hover:bg-blue-100/70'
                  }`}
                >
                  Hoy
                </button>
                <button
                  type="button"
                  onClick={() => seleccionarDia(mananaIso)}
                  className={`rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                    fechaIso === mananaIso
                      ? 'bg-blue-50 text-[#113EB9] ring-1 ring-blue-300 font-bold'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Mañana
                </button>
              </div>

              {/* Encabezado del mes con navegación */}
              <div className="mb-2 flex items-center justify-between px-1">
                <button
                  type="button"
                  onClick={retrocederMes}
                  title="Mes anterior"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <span className="text-[13px] font-bold text-slate-800">
                  {mesAnoTexto}
                </span>

                <button
                  type="button"
                  onClick={avanzarMes}
                  title="Mes siguiente"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Días de la semana */}
              <div className="grid grid-cols-7 mb-1 text-center">
                {DIAS_SEMANA.map((d) => (
                  <div
                    key={d}
                    className="py-1 text-[10.5px] font-bold text-slate-400 uppercase"
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Cuadrícula de días */}
              <div className="grid grid-cols-7 gap-1">
                {celdasMes.map((c, idx) => {
                  const esDelMes = c.mesOffset === 0;

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => seleccionarDia(c.iso)}
                      className={`h-8 w-8 mx-auto flex items-center justify-center rounded-lg text-[12px] transition ${
                        c.esSeleccionada
                          ? 'bg-[#113EB9] text-white font-bold shadow-md shadow-blue-500/25 ring-2 ring-blue-400/30'
                          : c.esHoy
                            ? 'font-bold text-[#113EB9] bg-blue-50 ring-1 ring-[#113EB9]'
                            : esDelMes
                              ? 'text-slate-700 hover:bg-slate-100 font-medium'
                              : 'text-slate-300 hover:bg-slate-50 hover:text-slate-400'
                      }`}
                      title={c.iso}
                    >
                      {c.dia}
                    </button>
                  );
                })}
              </div>

              {/* Pie con fecha completa y botón directo a hoy si no está en hoy */}
              <div className="mt-3.5 border-t border-slate-100 pt-2.5 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-medium truncate">
                  {capitalizar(format(fechaSeleccionada, "EEEE, d 'de' MMMM", { locale: es }))}
                </span>

                {!esHoy && (
                  <button
                    type="button"
                    onClick={() => {
                      onHoy();
                      setAbierto(false);
                    }}
                    className="shrink-0 text-[11px] font-bold text-[#113EB9] hover:underline ml-2"
                  >
                    Ir a hoy
                  </button>
                )}
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        {/* Flecha día siguiente */}
        <button
          type="button"
          onClick={avanzarDia}
          title="Día siguiente"
          className="flex h-7 w-6 items-center justify-center rounded text-white/80 transition hover:bg-white/15 hover:text-white"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Botón rápido "Hoy" si estamos visualizando otro día */}
      {!esHoy && (
        <button
          type="button"
          onClick={onHoy}
          className="hidden sm:flex h-8 items-center rounded-md border border-white/30 bg-white/10 px-2.5 text-[12px] font-semibold text-white transition hover:bg-white/15"
          title="Volver a los servicios de hoy"
        >
          Hoy
        </button>
      )}
    </div>
  );
};

export default SelectorFechaHeader;
