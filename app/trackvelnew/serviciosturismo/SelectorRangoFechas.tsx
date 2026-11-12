'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { getIsoToday, isoToDdMmYyyy } from './utils';

export const MAX_DIAS_RANGO = 31;

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function aFecha(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function aIso(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function sumarDias(iso: string, dias: number): string {
  const d = aFecha(iso);
  d.setDate(d.getDate() + dias);
  return aIso(d);
}

function diasEntre(a: string, b: string): number {
  return Math.round((aFecha(b).getTime() - aFecha(a).getTime()) / 86400000);
}

// Ordena y limita el rango a MAX_DIAS_RANGO días (inclusive) contando desde el ancla.
function normalizarRango(ancla: string, extremo: string): [string, string] {
  const dif = diasEntre(ancla, extremo);
  const limitado =
    Math.abs(dif) >= MAX_DIAS_RANGO
      ? sumarDias(ancla, dif > 0 ? MAX_DIAS_RANGO - 1 : -(MAX_DIAS_RANGO - 1))
      : extremo;
  return ancla <= limitado ? [ancla, limitado] : [limitado, ancla];
}

function primerDiaMes(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

function sumarMeses(primerDia: string, n: number): string {
  const d = aFecha(primerDia);
  d.setMonth(d.getMonth() + n, 1);
  return aIso(d);
}

interface MesProps {
  primerDia: string;
  inicio: string;
  fin: string;
  hoy: string;
  onPointerDownDia: (iso: string, e: React.PointerEvent) => void;
}

const Mes: React.FC<MesProps> = ({ primerDia, inicio, fin, hoy, onPointerDownDia }) => {
  const d = aFecha(primerDia);
  const offset = (d.getDay() + 6) % 7; // lunes = 0
  const diasMes = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const celdas: (string | null)[] = [
    ...Array<null>(offset).fill(null),
    ...Array.from({ length: diasMes }, (_, i) => sumarDias(primerDia, i)),
  ];

  return (
    <div className="w-[224px]">
      <div className="mb-1 text-center text-[12px] font-bold text-gray-700">
        {MESES[d.getMonth()]} {d.getFullYear()}
      </div>
      <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-gray-400">
        {DIAS_SEMANA.map((l) => (
          <div key={l} className="h-6 leading-6">{l}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {celdas.map((iso, i) => {
          if (!iso) return <div key={`v${i}`} className="h-8" />;
          const enRango = iso >= inicio && iso <= fin;
          const esExtremo = iso === inicio || iso === fin;
          return (
            <div
              key={iso}
              data-iso={iso}
              onPointerDown={(e) => onPointerDownDia(iso, e)}
              className={`flex h-8 cursor-pointer select-none items-center justify-center text-[12px] ${
                esExtremo
                  ? 'bg-[#113EB9] font-bold text-white'
                  : enRango
                    ? 'bg-blue-100 text-[#113EB9]'
                    : iso === hoy
                      ? 'font-bold text-[#113EB9] hover:bg-gray-100'
                      : 'text-gray-700 hover:bg-gray-100'
              } ${iso === inicio ? 'rounded-l-md' : ''} ${iso === fin ? 'rounded-r-md' : ''}`}
            >
              {Number(iso.slice(8))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface SelectorRangoFechasProps {
  inicio: string;
  fin: string;
  deshabilitado?: boolean;
  onCambiar: (inicio: string, fin: string) => void;
}

const SelectorRangoFechas: React.FC<SelectorRangoFechasProps> = ({
  inicio,
  fin,
  deshabilitado,
  onCambiar,
}) => {
  const [abierto, setAbierto] = useState(false);
  const [mesBase, setMesBase] = useState(primerDiaMes(inicio));
  const [ancla, setAncla] = useState<string | null>(null);
  const [vista, setVista] = useState<[string, string] | null>(null);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const vistaRef = useRef<[string, string] | null>(null);

  const arrastrando = ancla !== null;
  const [vInicio, vFin] = vista ?? [inicio, fin];
  const hoy = getIsoToday();

  const actualizarVista = (v: [string, string] | null) => {
    vistaRef.current = v;
    setVista(v);
  };

  const iniciarArrastre = (iso: string, e: React.PointerEvent) => {
    if (e.shiftKey && inicio === fin && iso !== inicio) {
      const [a, b] = normalizarRango(inicio, iso);
      onCambiar(a, b);
      setAbierto(false);
      return;
    }
    setAncla(iso);
    actualizarVista([iso, iso]);
  };

  const finalizar = useCallback(() => {
    const v = vistaRef.current;
    setAncla(null);
    actualizarVista(null);
    if (v) {
      onCambiar(v[0], v[1]);
      setAbierto(false);
    }
  }, [onCambiar]);

  useEffect(() => {
    if (ancla === null) return;

    const mover = (e: PointerEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      const iso = el?.closest<HTMLElement>('[data-iso]')?.dataset.iso;
      if (iso) actualizarVista(normalizarRango(ancla, iso));
    };

    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', finalizar);
    return () => {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', finalizar);
    };
  }, [ancla, finalizar]);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    };
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, [abierto]);

  const dias = diasEntre(inicio, fin) + 1;
  const texto =
    inicio === fin
      ? isoToDdMmYyyy(inicio)
      : `${isoToDdMmYyyy(inicio)} – ${isoToDdMmYyyy(fin)}`;

  return (
    <div ref={contenedorRef} className="relative">
      <button
        type="button"
        disabled={deshabilitado}
        onClick={() => {
          setMesBase(primerDiaMes(inicio));
          setAbierto((a) => !a);
        }}
        className="inline-flex h-8 items-center gap-2 rounded-md border border-gray-200 bg-white px-2.5 text-[12px] text-gray-700 focus:border-[#113EB9] focus:outline-none focus:ring-1 focus:ring-[#113EB9] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Calendar className="h-3.5 w-3.5 text-gray-500" />
        <span>{texto}</span>
        {dias > 1 && (
          <span className="rounded-full bg-blue-50 px-1.5 text-[10px] font-bold text-[#113EB9]">
            {dias} días
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute left-0 top-9 z-[60] rounded-lg border border-gray-200 bg-white p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMesBase((m) => sumarMeses(m, -1))}
              className="rounded p-1 text-gray-600 hover:bg-gray-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-[11px] text-gray-500">
              Arrastra para elegir un rango (máx. {MAX_DIAS_RANGO} días) o haz clic para un solo día
            </span>
            <button
              type="button"
              onClick={() => setMesBase((m) => sumarMeses(m, 1))}
              className="rounded p-1 text-gray-600 hover:bg-gray-100"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div
            className="flex gap-4"
            style={{ touchAction: 'none' }}
          >
            <Mes
              primerDia={mesBase}
              inicio={vInicio}
              fin={vFin}
              hoy={hoy}
              onPointerDownDia={iniciarArrastre}
            />
            <Mes
              primerDia={sumarMeses(mesBase, 1)}
              inicio={vInicio}
              fin={vFin}
              hoy={hoy}
              onPointerDownDia={iniciarArrastre}
            />
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2 text-[11px] text-gray-500">
            <span>
              {arrastrando && vista
                ? `${isoToDdMmYyyy(vista[0])} – ${isoToDdMmYyyy(vista[1])} · ${diasEntre(vista[0], vista[1]) + 1} día(s)`
                : 'Shift + clic extiende desde el día actual'}
            </span>
            <button
              type="button"
              onClick={() => {
                onCambiar(hoy, hoy);
                setAbierto(false);
              }}
              className="rounded border border-gray-300 px-2 py-0.5 font-medium text-gray-700 hover:bg-gray-50"
            >
              Hoy
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SelectorRangoFechas;
