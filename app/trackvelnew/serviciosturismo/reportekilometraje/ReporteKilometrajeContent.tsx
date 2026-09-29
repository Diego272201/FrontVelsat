'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { useSearchParams, useRouter } from 'next/navigation';
import { Download, Gauge, RefreshCw, Route } from 'lucide-react';
import { Spinner } from '@nextui-org/react';
import { useApi } from '@/context/ApiContext';
import { useUsername } from '@/hooks/useUsername';
import { API_BASE } from '../constants';
import { ServicioTurismo } from '../types';
import { combinarPlaca, getIsoToday, isoToDdMmYyyy } from '../utils';

interface RangoKilometrajeRequest {
  rangoId: string;
  deviceID: string;
  fechaIni: string;
  fechaFin: string;
}

interface ResultadoKilometraje {
  rangoId: string;
  deviceId: string;
  maximo: number;
  minimo: number;
  kilometros: number;
}

interface FilaReporte {
  idservicio: number;
  unidad: string;
  piloto: string | null;
  horaInicio: string | null;
  horaFin: string | null;
  origenHoraFin: 'finalizado' | 'retorno' | null;
  duracionMin: number | null;
  kilometros: number | null;
  puedeCalcular: boolean;
}

function combinarFechaHora(fechaDdMmYyyy: string, horaHhMm: string): Date | null {
  const partesFecha = fechaDdMmYyyy.split('/');
  const partesHora = horaHhMm.split(':');
  if (partesFecha.length !== 3 || partesHora.length < 2) return null;

  const [dd, mm, yyyy] = partesFecha.map(Number);
  const [hh, min] = partesHora.map(Number);

  if (!dd || !mm || !yyyy || Number.isNaN(hh) || Number.isNaN(min)) return null;

  return new Date(yyyy, mm - 1, dd, hh, min);
}

function formatFechaHoraParaApi(fecha: Date): string {
  const dd = String(fecha.getDate()).padStart(2, '0');
  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  const yyyy = fecha.getFullYear();
  const hh = String(fecha.getHours()).padStart(2, '0');
  const min = String(fecha.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

function formatHora(fecha: Date | null): string | null {
  if (!fecha) return null;
  const hh = String(fecha.getHours()).padStart(2, '0');
  const min = String(fecha.getMinutes()).padStart(2, '0');
  return `${hh}:${min}`;
}

function formatDuracion(minutos: number | null): string {
  if (minutos === null) return '—';
  const horas = Math.floor(minutos / 60);
  const restoMin = Math.round(minutos % 60);
  return `${horas}h ${restoMin}min`;
}

interface RangoServicio {
  unidad: string;
  fechaInicioDate: Date | null;
  fechaFinDate: Date | null;
  origenHoraFin: 'finalizado' | 'retorno' | null;
  puedeCalcular: boolean;
}

function calcularRangoServicio(servicio: ServicioTurismo): RangoServicio {
  const unidad = combinarPlaca(servicio.bus, servicio.placa).toUpperCase();
  const fechaInicioDate =
    servicio.fechainicio && servicio.horainicio
      ? combinarFechaHora(servicio.fechainicio, servicio.horainicio)
      : null;

  let fechaFinDate: Date | null = null;
  let origenHoraFin: 'finalizado' | 'retorno' | null = null;

  if (servicio.horafinalizado) {
    const d = new Date(servicio.horafinalizado);
    if (!Number.isNaN(d.getTime())) {
      fechaFinDate = d;
      origenHoraFin = 'finalizado';
    }
  }

  if (!fechaFinDate && servicio.horaretorno && servicio.fechainicio) {
    const d = combinarFechaHora(servicio.fechainicio, servicio.horaretorno);
    if (d && fechaInicioDate && d.getTime() < fechaInicioDate.getTime()) {
      d.setDate(d.getDate() + 1);
    }
    fechaFinDate = d;
    origenHoraFin = 'retorno';
  }

  const puedeCalcular = Boolean(
    unidad && fechaInicioDate && fechaFinDate && fechaFinDate.getTime() > fechaInicioDate.getTime(),
  );

  return { unidad, fechaInicioDate, fechaFinDate, origenHoraFin, puedeCalcular };
}

interface DatosFecha {
  servicios: ServicioTurismo[];
  resultados: Map<string, ResultadoKilometraje>;
  mensaje: string | null;
}

export default function ReporteKilometrajeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { baseUrl } = useApi();
  const { username, isReady } = useUsername();

  const fechaParam = searchParams.get('fecha') || getIsoToday();
  const [fecha, setFecha] = useState(fechaParam);

  const [servicios, setServicios] = useState<ServicioTurismo[]>([]);
  const [resultados, setResultados] = useState<Map<string, ResultadoKilometraje>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mensajeBackend, setMensajeBackend] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  // Caché en memoria por fecha: al cambiar de fecha con el selector y volver a una
  // ya consultada, se reutiliza lo guardado acá en vez de volver a pegarle a la API.
  const cacheRef = useRef<Map<string, DatosFecha>>(new Map());
  const forzarRecargaRef = useRef(false);

  useEffect(() => {
    setFecha(fechaParam);
  }, [fechaParam]);

  useEffect(() => {
    if (!isReady || !baseUrl) return;

    const forzar = forzarRecargaRef.current;
    forzarRecargaRef.current = false;

    const cacheado = !forzar ? cacheRef.current.get(fecha) : undefined;
    if (cacheado) {
      setServicios(cacheado.servicios);
      setResultados(cacheado.resultados);
      setMensajeBackend(cacheado.mensaje);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelado = false;

    const cargar = async () => {
      setLoading(true);
      setError(null);
      setMensajeBackend(null);
      setResultados(new Map());

      try {
        const fechaParamApi = isoToDdMmYyyy(fecha);
        const res = await fetch(`${API_BASE}?fechaInicio=${fechaParamApi}&fechaFin=${fechaParamApi}`);

        if (res.status === 404) {
          if (!cancelado) {
            setServicios([]);
            cacheRef.current.set(fecha, { servicios: [], resultados: new Map(), mensaje: null });
          }
          return;
        }

        if (!res.ok) throw new Error('Error al obtener los servicios de turismo');

        const data = await res.json();
        const lista: ServicioTurismo[] = Array.isArray(data) ? data : [];
        if (cancelado) return;
        setServicios(lista);

        const rangos: RangoKilometrajeRequest[] = [];

        lista.forEach((servicio) => {
          const { unidad, fechaInicioDate, fechaFinDate, puedeCalcular } = calcularRangoServicio(servicio);

          if (puedeCalcular && fechaInicioDate && fechaFinDate) {
            rangos.push({
              rangoId: String(servicio.idservicio),
              deviceID: unidad,
              fechaIni: formatFechaHoraParaApi(fechaInicioDate),
              fechaFin: formatFechaHoraParaApi(fechaFinDate),
            });
          }
        });

        let mapa = new Map<string, ResultadoKilometraje>();
        let mensaje: string | null = null;

        if (rangos.length > 0) {
          const response = await axios.post(`${baseUrl}/api/Kilometer/kilometerbatch`, {
            accountID: username,
            rangos,
          });

          if (cancelado) return;

          const listaResultados: ResultadoKilometraje[] = response.data?.resultados || [];
          mapa = new Map(listaResultados.map((r) => [r.rangoId, r]));
          setResultados(mapa);

          if (listaResultados.length === 0 && response.data?.mensaje) {
            mensaje = response.data.mensaje;
            setMensajeBackend(mensaje);
          }
        }

        cacheRef.current.set(fecha, { servicios: lista, resultados: mapa, mensaje });
      } catch {
        if (!cancelado) setError('Error al cargar el reporte de kilometraje');
      } finally {
        if (!cancelado) setLoading(false);
      }
    };

    cargar();

    return () => {
      cancelado = true;
    };
  }, [baseUrl, fecha, isReady, username, nonce]);

  const recargar = () => {
    forzarRecargaRef.current = true;
    setNonce((n) => n + 1);
  };

  const filas = useMemo<FilaReporte[]>(() => {
    return servicios.map((servicio) => {
      const { unidad, fechaInicioDate, fechaFinDate, origenHoraFin, puedeCalcular } =
        calcularRangoServicio(servicio);

      const duracionMin =
        puedeCalcular && fechaInicioDate && fechaFinDate
          ? (fechaFinDate.getTime() - fechaInicioDate.getTime()) / 60000
          : null;

      const resultado = puedeCalcular ? resultados.get(String(servicio.idservicio)) : undefined;

      return {
        idservicio: servicio.idservicio,
        unidad: unidad || '—',
        piloto: servicio.piloto,
        horaInicio: formatHora(fechaInicioDate),
        horaFin: formatHora(fechaFinDate),
        origenHoraFin,
        duracionMin,
        kilometros: resultado ? Math.max(0, resultado.kilometros) : null,
        puedeCalcular,
      };
    });
  }, [servicios, resultados]);

  const totalKm = useMemo(
    () => filas.reduce((acc, f) => acc + (f.kilometros || 0), 0),
    [filas],
  );

  const conDatos = filas.filter((f) => f.kilometros !== null).length;
  const sinDatos = filas.length - conDatos;

  const handleDescargarExcel = () => {
    if (filas.length === 0) return;

    const dataExcel = filas.map((f) => ({
      Unidad: f.unidad,
      Piloto: f.piloto || '',
      'Hora Inicio': f.horaInicio || '',
      'Hora Fin': f.horaFin || '',
      'Origen Hora Fin':
        f.origenHoraFin === 'finalizado' ? 'Finalización' : f.origenHoraFin === 'retorno' ? 'Retorno' : '',
      Duración: formatDuracion(f.duracionMin),
      'Kilometraje (km)': f.kilometros !== null ? Number(f.kilometros.toFixed(2)) : '',
    }));

    const ws = XLSX.utils.json_to_sheet(dataExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Kilometraje');
    XLSX.writeFile(wb, `Reporte_Kilometraje_${fecha}.xlsx`);
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-100">
      <div className="flex flex-shrink-0 items-center justify-between bg-[#113EB9] px-4 py-3">
        <div className="flex items-center gap-2">
          <Gauge className="h-5 w-5 text-white" />
          <h1 className="text-[14px] font-bold uppercase tracking-[0.01em] text-white">
            Reporte Kilometraje — Servicios Turismo
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={fecha}
            onChange={(e) => {
              const nuevaFecha = e.target.value;
              setFecha(nuevaFecha);
              router.replace(`?fecha=${nuevaFecha}`);
            }}
            className="h-8 rounded-md border border-white/30 bg-white/10 px-2 text-[12px] text-white focus:outline-none [color-scheme:dark]"
          />

          <button
            type="button"
            onClick={handleDescargarExcel}
            disabled={loading || filas.length === 0}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-white px-3 text-[11px] font-bold text-[#113EB9] transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Descargar Excel</span>
          </button>
        </div>
      </div>

      <div className="flex flex-shrink-0 flex-wrap items-center gap-4 border-b border-slate-200 bg-white px-4 py-2 text-xs">
        <div className="flex flex-col">
          <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500">Servicios</span>
          <span className="text-[13px] font-bold text-slate-900">{filas.length}</span>
        </div>
        <div className="flex flex-col border-l border-slate-200 pl-4">
          <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500">Con kilometraje</span>
          <span className="text-[13px] font-bold text-slate-900">{conDatos}</span>
        </div>
        <div className="flex flex-col border-l border-slate-200 pl-4">
          <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500">Sin datos</span>
          <span className="text-[13px] font-bold text-slate-900">{sinDatos}</span>
        </div>
        <div className="flex flex-col border-l border-slate-200 pl-4">
          <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500">Kilometraje total</span>
          <span className="text-[13px] font-bold text-[#113EB9]">{totalKm.toFixed(2)} km</span>
        </div>
      </div>

      {mensajeBackend && (
        <div className="flex-shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2 text-[12px] font-medium text-amber-700">
          {mensajeBackend}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <Spinner color="primary" size="lg" />
          </div>
        ) : error ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
            <p className="mb-1 text-sm font-semibold text-red-600">{error}</p>
            <button
              type="button"
              onClick={recargar}
              className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-[#113EB9] px-3 py-1.5 text-[12px] font-semibold text-white"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reintentar
            </button>
          </div>
        ) : filas.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <Route className="mb-2 h-8 w-8 text-slate-300" />
            <p className="text-sm font-semibold text-gray-600">No hay servicios para esta fecha</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-xs text-gray-700">
              <thead className="bg-gray-200 text-[10px] uppercase text-gray-600">
                <tr>
                  <th className="p-2 text-center">Unidad</th>
                  <th className="p-2 text-center">Piloto</th>
                  <th className="p-2 text-center">Hora Inicio</th>
                  <th className="p-2 text-center">Hora Fin</th>
                  <th className="p-2 text-center">Duración</th>
                  <th className="p-2 text-center">Kilometraje</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((fila) => (
                  <tr key={fila.idservicio} className="border-t border-gray-200 hover:bg-slate-50">
                    <td className="p-2 text-center font-semibold">{fila.unidad}</td>
                    <td className="p-2 text-center">{fila.piloto || '—'}</td>
                    <td className="p-2 text-center">{fila.horaInicio || '—'}</td>
                    <td className="p-2 text-center">
                      {fila.horaFin || '—'}
                      {fila.origenHoraFin && (
                        <span
                          className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                            fila.origenHoraFin === 'finalizado'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {fila.origenHoraFin === 'finalizado' ? 'Finalización' : 'Retorno'}
                        </span>
                      )}
                    </td>
                    <td className="p-2 text-center">{formatDuracion(fila.duracionMin)}</td>
                    <td className="p-2 text-center font-semibold">
                      {fila.kilometros !== null ? (
                        `${fila.kilometros.toFixed(2)} km`
                      ) : (
                        <span className="text-slate-300">Sin datos</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
