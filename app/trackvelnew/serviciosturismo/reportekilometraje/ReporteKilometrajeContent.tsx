'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useSearchParams, useRouter } from 'next/navigation';
import { Download, Gauge, RefreshCw, Route, Search } from 'lucide-react';
import { Spinner } from '@nextui-org/react';
import { useApi } from '@/context/ApiContext';
import { useUsername } from '@/hooks/useUsername';
import { API_BASE } from '../constants';
import { ServicioTurismo } from '../types';
import { combinarPlaca, convertirUtcALima, getIsoToday, isoToDdMmYyyy } from '../utils';
import { exportarExcelEstilizado, type ColumnaExcel } from '../exportarExcel';

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

interface KmDiarioRow {
  deviceId: string;
  maximo: number;
  minimo: number;
}

interface FilaReporte {
  idservicio: number;
  unidad: string;
  cliente: string | null;
  horaInicio: string | null;
  horaIniciado: string | null;
  horaFin: string | null;
  origenHoraFin: 'finalizado' | 'retorno' | null;
  duracionMin: number | null;
  kilometros: number | null;
  kmDiario: number | null;
  puedeCalcular: boolean;
}

// El resto de este archivo trabaja con Dates "de pared" (construidos con getters locales:
// getDate/getHours/getTime), como fechaInicioDate armado desde fechainicio+horainicio.
// horafinalizado en cambio llega del backend en UTC, así que se ajusta a hora de Lima y se
// reconstruye como Date local con esos mismos componentes para poder compararlo/restarlo
// contra fechaInicioDate sin importar la zona horaria del navegador.
function convertirUtcALimaComoLocal(iso: string): Date | null {
  const fechaLima = convertirUtcALima(iso);
  if (!fechaLima) return null;

  return new Date(
    fechaLima.getUTCFullYear(),
    fechaLima.getUTCMonth(),
    fechaLima.getUTCDate(),
    fechaLima.getUTCHours(),
    fechaLima.getUTCMinutes(),
    fechaLima.getUTCSeconds(),
  );
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
    const d = convertirUtcALimaComoLocal(servicio.horafinalizado);
    if (d) {
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
  kmDiarioPorUnidad: Map<string, number>;
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
  const [kmDiarioPorUnidad, setKmDiarioPorUnidad] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mensajeBackend, setMensajeBackend] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [busquedaTexto, setBusquedaTexto] = useState('');

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
      setKmDiarioPorUnidad(cacheado.kmDiarioPorUnidad);
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
      setKmDiarioPorUnidad(new Map());

      try {
        const fechaParamApi = isoToDdMmYyyy(fecha);

        // El kilometraje diario por unidad no depende de los servicios del día (es un solo
        // min/max por dispositivo entre 00:00 y 23:59), así que se pide en paralelo con los
        // servicios en vez de esperarlos: un único request para TODAS las unidades de la
        // cuenta, en lugar de uno por servicio.
        // Importante: la ruta del backend es kilometerall/{fechaini}/{fechafin}/{accountID}, con
        // cada fecha como UN segmento de URL. Si se manda "dd/MM/yyyy HH:mm" las barras de la
        // fecha se interpretan como separadores de ruta (o quedan como "%2F", que muchos
        // servidores rechazan/normalizan), partiendo la URL en más segmentos de los que espera
        // la ruta y devolviendo 404 en silencio (se ve como "Sin datos" en toda la tabla). Por
        // eso se usa formato ISO "yyyy-MM-ddTHH:mm" (sin barras): el backend igual lo parsea bien
        // con DateTime.TryParse.
        const kmDiarioPromise: Promise<Map<string, number>> = !username
          ? Promise.resolve(new Map<string, number>())
          : axios
              .get(
                `${baseUrl}/api/Kilometer/kilometerall/${encodeURIComponent(`${fecha}T00:00`)}/${encodeURIComponent(`${fecha}T23:59`)}/${encodeURIComponent(username)}`,
              )
              .then((response) => {
                const filas: KmDiarioRow[] = response.data?.listaKilometros || [];
                return new Map(
                  filas
                    .filter((f) => f.deviceId)
                    .map((f) => [f.deviceId.trim().toUpperCase(), Math.max(0, f.maximo - f.minimo)] as const),
                );
              })
              .catch(() => new Map<string, number>());

        const res = await fetch(`${API_BASE}?fechaInicio=${fechaParamApi}&fechaFin=${fechaParamApi}`);

        if (res.status === 404) {
          if (!cancelado) {
            const kmDiario = await kmDiarioPromise;
            if (cancelado) return;
            setServicios([]);
            setKmDiarioPorUnidad(kmDiario);
            cacheRef.current.set(fecha, { servicios: [], resultados: new Map(), kmDiarioPorUnidad: kmDiario, mensaje: null });
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

        const kmDiario = await kmDiarioPromise;
        if (cancelado) return;
        setKmDiarioPorUnidad(kmDiario);

        cacheRef.current.set(fecha, { servicios: lista, resultados: mapa, kmDiarioPorUnidad: kmDiario, mensaje });
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

      const horaIniciado = servicio.horainiciado
        ? formatHora(convertirUtcALimaComoLocal(servicio.horainiciado))
        : null;

      const kmDiario = unidad ? kmDiarioPorUnidad.get(unidad) : undefined;

      return {
        idservicio: servicio.idservicio,
        unidad: unidad || '—',
        cliente: servicio.cliente,
        horaInicio: formatHora(fechaInicioDate),
        horaIniciado,
        horaFin: formatHora(fechaFinDate),
        origenHoraFin,
        duracionMin,
        kilometros: resultado ? Math.max(0, resultado.kilometros) : null,
        kmDiario: kmDiario !== undefined ? kmDiario : null,
        puedeCalcular,
      };
    });
  }, [servicios, resultados, kmDiarioPorUnidad]);

  // Filtro global: busca el texto en cualquier campo visible de la fila (unidad, cliente,
  // horas, origen de la hora fin, duración y kilometraje).
  const filasFiltradas = useMemo(() => {
    const texto = busquedaTexto.trim().toLowerCase();
    if (!texto) return filas;

    return filas.filter((f) => {
      const origenHoraFinTexto =
        f.origenHoraFin === 'finalizado' ? 'finalización' : f.origenHoraFin === 'retorno' ? 'retorno' : '';

      const campos = [
        f.unidad,
        f.cliente,
        f.horaInicio,
        f.horaIniciado,
        f.horaFin,
        origenHoraFinTexto,
        formatDuracion(f.duracionMin),
        f.kilometros !== null ? f.kilometros.toFixed(2) : '',
        f.kmDiario !== null ? f.kmDiario.toFixed(2) : '',
      ];

      return campos.some((campo) => (campo || '').toString().toLowerCase().includes(texto));
    });
  }, [filas, busquedaTexto]);

  const totalKm = useMemo(
    () => filasFiltradas.reduce((acc, f) => acc + (f.kilometros || 0), 0),
    [filasFiltradas],
  );

  const conDatos = filasFiltradas.filter((f) => f.kilometros !== null).length;
  const sinDatos = filasFiltradas.length - conDatos;

  const handleDescargarExcel = () => {
    const filas = filasFiltradas;
    if (filas.length === 0) return;

    const columnas: ColumnaExcel[] = [
      { header: '#', width: 6, align: 'center' },
      { header: 'Unidad', width: 16 },
      { header: 'KM Diario recorrido', width: 18, align: 'right', numFmt: '#,##0.00' },
      { header: 'Hora Inicio', width: 12, align: 'center' },
      { header: 'Hora Iniciada (conductor)', width: 22, align: 'center' },
      { header: 'Cliente', width: 26 },
      { header: 'KM Servicio', width: 18, align: 'right', numFmt: '#,##0.00' },
      { header: 'Hora Finalizada (conductor)', width: 22, align: 'center' },
      { header: 'Duración', width: 14, align: 'center' },
    ];

    const datos = filas.map((f, i) => [
      i + 1,
      f.unidad,
      f.kmDiario !== null ? Number(f.kmDiario.toFixed(2)) : null,
      f.horaInicio || '',
      f.horaIniciado || '',
      f.cliente || '',
      f.kilometros !== null ? Number(f.kilometros.toFixed(2)) : null,
      f.horaFin || '',
      f.duracionMin !== null ? formatDuracion(f.duracionMin) : '',
    ]);

    const fechaTexto = isoToDdMmYyyy(fecha);
    const generado = `Generado el ${new Date().toLocaleString('es-PE')}`;

    // Resumen agrupado por unidad, ordenado por kilometraje descendente.
    const porUnidad = new Map<string, { servicios: number; minutos: number; km: number }>();
    filas.forEach((f) => {
      const acc = porUnidad.get(f.unidad) ?? { servicios: 0, minutos: 0, km: 0 };
      acc.servicios += 1;
      acc.minutos += f.duracionMin ?? 0;
      acc.km += f.kilometros ?? 0;
      porUnidad.set(f.unidad, acc);
    });
    const resumenUnidades = [...porUnidad.entries()].sort((a, b) => b[1].km - a[1].km);

    const columnasResumen: ColumnaExcel[] = [
      { header: '#', width: 6, align: 'center' },
      { header: 'Unidad', width: 16 },
      { header: 'Servicios', width: 12, align: 'center' },
      { header: 'Duración total', width: 16, align: 'center' },
      { header: 'Kilometraje total (km)', width: 22, align: 'right', numFmt: '#,##0.00' },
      { header: 'Promedio por servicio (km)', width: 26, align: 'right', numFmt: '#,##0.00' },
    ];
    const datosResumen = resumenUnidades.map(([unidad, r], i) => [
      i + 1,
      unidad,
      r.servicios,
      formatDuracion(r.minutos),
      Number(r.km.toFixed(2)),
      Number((r.km / r.servicios).toFixed(2)),
    ]);
    const minutosTotales = filas.reduce((acc, f) => acc + (f.duracionMin ?? 0), 0);

    exportarExcelEstilizado(
      [
        {
          sheetName: 'Kilometraje',
          titulo: `VELSAT — Reporte de Kilometraje Turismo · ${fechaTexto}`,
          subtitulo: `${generado}  ·  ${filas.length} servicio(s)  ·  ${conDatos} con datos  ·  ${sinDatos} sin datos`,
          columnas,
          filas: datos,
          totales: ['', 'TOTAL', '', '', '', '', Number(totalKm.toFixed(2)), '', formatDuracion(minutosTotales)],
        },
        {
          sheetName: 'Resumen por Unidad',
          titulo: `VELSAT — Kilometraje por Unidad · ${fechaTexto}`,
          subtitulo: `${generado}  ·  ${porUnidad.size} unidad(es)`,
          columnas: columnasResumen,
          filas: datosResumen,
          totales: ['', 'TOTAL', filas.length, formatDuracion(minutosTotales), Number(totalKm.toFixed(2)), null],
        },
      ],
      `Reporte_Kilometraje_${fecha}.xlsx`,
    );
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

      <div className="flex flex-shrink-0 flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-2">
        <div className="relative flex items-center">
          <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar en cualquier campo (unidad, cliente, horas, duración...)"
            value={busquedaTexto}
            onChange={(e) => setBusquedaTexto(e.target.value)}
            className="h-8 w-72 sm:w-96 rounded-md border border-gray-300 bg-white py-1 pl-8 pr-2 text-[12px] text-gray-700 placeholder-gray-400 focus:border-[#113EB9] focus:outline-none focus:ring-1 focus:ring-[#113EB9]"
          />
        </div>
        {busquedaTexto && (
          <button
            type="button"
            onClick={() => setBusquedaTexto('')}
            className="h-8 rounded-md border border-gray-300 bg-white px-2.5 text-[11px] font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            Limpiar
          </button>
        )}
      </div>

      <div className="flex flex-shrink-0 flex-wrap items-center gap-4 border-b border-slate-200 bg-white px-4 py-2 text-xs">
        <div className="flex flex-col">
          <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500">Servicios</span>
          <span className="text-[13px] font-bold text-slate-900">{filasFiltradas.length}</span>
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
        ) : filasFiltradas.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <Search className="mb-2 h-8 w-8 text-slate-300" />
            <p className="text-sm font-semibold text-gray-600">Sin resultados para “{busquedaTexto}”</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full border-separate border-spacing-0 text-xs text-gray-700">
              <thead className="sticky top-0 z-10 text-[10px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th
                    colSpan={2}
                    className="border-b border-slate-200 bg-slate-100 p-1.5 text-center font-bold text-slate-500"
                  >
                    Unidad
                  </th>
                  <th
                    colSpan={6}
                    style={{ borderLeft: '3px solid #113EB9' }}
                    className="border-b bg-blue-50 p-1.5 text-center font-bold text-[#113EB9]"
                  >
                    Servicio
                  </th>
                </tr>
                <tr className="bg-gray-100 text-gray-600">
                  <th className="p-2 text-center font-semibold">Unidad</th>
                  <th className="p-2 text-center font-semibold">KM Diario recorrido</th>
                  <th style={{ borderLeft: '3px solid #113EB9' }} className="p-2 text-center font-semibold">
                    Hora Inicio
                  </th>
                  <th className="p-2 text-center font-semibold">Hora Iniciada (conductor)</th>
                  <th className="p-2 text-center font-semibold">Cliente</th>
                  <th className="p-2 text-center font-semibold">KM Servicio</th>
                  <th className="p-2 text-center font-semibold">Hora Finalizada (conductor)</th>
                  <th className="p-2 text-center font-semibold">Duración</th>
                </tr>
              </thead>
              <tbody>
                {filasFiltradas.map((fila, idx) => (
                  <tr
                    key={fila.idservicio}
                    className={`transition-colors hover:bg-blue-50/60 ${
                      idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'
                    }`}
                  >
                    <td className="border-t border-slate-100 bg-slate-50/60 p-2 text-center font-semibold text-slate-800">
                      {fila.unidad}
                    </td>
                    <td className="border-t border-slate-100 bg-slate-50/60 p-2 text-center">
                      {fila.kmDiario !== null ? (
                        <span className="font-medium text-slate-700">{fila.kmDiario.toFixed(2)} km</span>
                      ) : (
                        <span className="text-slate-300">Sin datos</span>
                      )}
                    </td>
                    <td
                      style={{ borderLeft: '3px solid #113EB9' }}
                      className="border-t border-slate-100 p-2 text-center"
                    >
                      {fila.horaInicio || '—'}
                    </td>
                    <td className="border-t border-slate-100 p-2 text-center">{fila.horaIniciado || '—'}</td>
                    <td className="border-t border-slate-100 p-2 text-center">{fila.cliente || '—'}</td>
                    <td className="border-t border-slate-100 p-2 text-center font-semibold">
                      {fila.kilometros !== null ? (
                        `${fila.kilometros.toFixed(2)} km`
                      ) : (
                        <span className="font-normal text-slate-300">Sin datos</span>
                      )}
                    </td>
                    <td className="border-t border-slate-100 p-2 text-center">
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
                    <td className="border-t border-slate-100 p-2 text-center">{formatDuracion(fila.duracionMin)}</td>
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
