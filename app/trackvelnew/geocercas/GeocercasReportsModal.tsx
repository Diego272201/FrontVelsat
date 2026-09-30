'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart2,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Filter,
  Layers,
  MapPin,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  VisitaItem,
  VisitasFilterParams,
  ResumenItem,
  ResumenFilterParams,
  getVisitasReport,
  getResumenReport,
  getVisitaById,
} from './reportsApi';
import {
  exportVisitasToExcel,
  exportVisitasToPdf,
  exportResumenToExcel,
  exportResumenToPdf,
} from './reportsExport';
import { Geofence, Vehicle } from './types';

interface GeocercasReportsModalProps {
  open: boolean;
  onClose: () => void;
  token?: string;
  accountID?: string;
  geofences: Geofence[];
  vehicles: Vehicle[];
  onViewVisitOnMap?: (visit: VisitaItem) => void;
}

// Formateador de fechas para los inputs (YYYY-MM-DD)
const getDefaultDates = () => {
  const now = new Date();
  const past = new Date();
  past.setDate(now.getDate() - 7);

  const format = (d: Date) => d.toISOString().split('T')[0];
  return {
    desde: format(past),
    hasta: format(now),
  };
};

// Formato visual corto para fechas en tabla: DD/MM HH:mm
function formatTableDate(dateStr?: string | null): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month} ${hours}:${mins}`;
  } catch {
    return dateStr;
  }
}

// Formato visual corto para footer: DD/MM/YYYY
function formatDateOnly(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

// Formateador de duración exacto (ej: "2 h 28 min", "44 min", "7 s", "En curso")
function formatDuration(
  minutes?: number | null,
  isInside?: boolean,
  fechaEntrada?: string | null,
  fechaSalida?: string | null,
): { text: string; isLive: boolean } {
  if (isInside || (!fechaSalida && (minutes === null || minutes === undefined))) {
    return { text: 'En curso', isLive: true };
  }

  // 1. Si tenemos fechas válidas de entrada y salida, calculamos segundos exactos
  if (fechaEntrada && fechaSalida) {
    const tEntrada = new Date(fechaEntrada).getTime();
    const tSalida = new Date(fechaSalida).getTime();
    if (!isNaN(tEntrada) && !isNaN(tSalida) && tSalida >= tEntrada) {
      const diffSec = Math.floor((tSalida - tEntrada) / 1000);

      // Si duró menos de 1 minuto, mostramos los segundos exactos (ej: "7 s", "45 s")
      if (diffSec < 60) {
        return { text: `${diffSec} s`, isLive: false };
      }

      // Si duró menos de 1 hora
      if (diffSec < 3600) {
        const m = Math.floor(diffSec / 60);
        const s = diffSec % 60;
        return {
          text: s > 0 ? `${m} min ${s} s` : `${m} min`,
          isLive: false,
        };
      }

      // Si duró 1 hora o más
      const h = Math.floor(diffSec / 3600);
      const remSec = diffSec % 3600;
      const m = Math.floor(remSec / 60);
      return {
        text: m > 0 ? `${h} h ${m} min` : `${h} h`,
        isLive: false,
      };
    }
  }

  // 2. Si sólo hay salida registrada sin entrada previa
  if (!fechaEntrada && fechaSalida) {
    return { text: 'Solo salida', isLive: false };
  }

  // 3. Fallback usando minutos si no hay fechas válidas
  if (minutes === null || minutes === undefined) {
    return { text: 'En curso', isLive: true };
  }

  const m = Math.round(minutes);
  if (m <= 0) return { text: '0 s', isLive: false };
  if (m < 60) return { text: `${m} min`, isLive: false };
  const hrs = Math.floor(m / 60);
  const rem = m % 60;
  return {
    text: rem > 0 ? `${hrs} h ${rem} min` : `${hrs} h`,
    isLive: false,
  };
}

export default function GeocercasReportsModal({
  open,
  onClose,
  token,
  accountID,
  geofences,
  vehicles,
  onViewVisitOnMap,
}: GeocercasReportsModalProps) {
  const [activeTab, setActiveTab] = useState<'visitas' | 'resumen'>('visitas');

  const defaultDates = useMemo(() => getDefaultDates(), []);
  const currentAccountID = accountID || 'movilbus';

  /* ------------------------------------------------------------------ */
  /* Estado: Reporte de Visitas                                         */
  /* ------------------------------------------------------------------ */
  const [visitasFilters, setVisitasFilters] = useState<VisitasFilterParams>({
    accountID: currentAccountID,
    deviceID: '',
    geofenceID: '',
    fechaDesde: defaultDates.desde,
    fechaHasta: defaultDates.hasta,
    page: 1,
    pageSize: 15,
  });

  const [visitasList, setVisitasList] = useState<VisitaItem[]>([]);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [loadingVisitas, setLoadingVisitas] = useState(false);

  /* ------------------------------------------------------------------ */
  /* Estado: Resumen de Visitas                                         */
  /* ------------------------------------------------------------------ */
  const [resumenFilters, setResumenFilters] = useState<ResumenFilterParams>({
    accountID: currentAccountID,
    fechaDesde: defaultDates.desde,
    fechaHasta: defaultDates.hasta,
    geofenceID: '',
    deviceID: '',
  });

  const [resumenList, setResumenList] = useState<ResumenItem[]>([]);
  const [loadingResumen, setLoadingResumen] = useState(false);

  /* ------------------------------------------------------------------ */
  /* Estado: Modal de Detalle de Visita                                  */
  /* ------------------------------------------------------------------ */
  const [selectedVisitId, setSelectedVisitId] = useState<string | number | null>(null);
  const [visitDetail, setVisitDetail] = useState<VisitaItem | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  /* ------------------------------------------------------------------ */
  /* Estado: Menús de Exportación                                       */
  /* ------------------------------------------------------------------ */
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exportResumenMenuOpen, setExportResumenMenuOpen] = useState(false);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);

  /* ------------------------------------------------------------------ */
  /* Manejo centralizado de Errores HTTP                                */
  /* ------------------------------------------------------------------ */
  const handleApiError = useCallback((error: any, defaultMsg: string) => {
    if (error?.response?.status === 401) {
      toast.error('Sesión no autorizada o expirada (401). Inicia sesión nuevamente.');
      return;
    }
    if (error?.response?.status === 404) {
      toast.error('Visita o recurso no encontrado (404).');
      return;
    }
    const msg = error?.response?.data?.message || error?.message || defaultMsg;
    toast.error(`Error: ${msg}`);
  }, []);

  /* ------------------------------------------------------------------ */
  /* Carga de Visitas (GET /visitas)                                    */
  /* ------------------------------------------------------------------ */
  const fetchVisitas = useCallback(
    async (paramsToUse?: VisitasFilterParams) => {
      setLoadingVisitas(true);
      try {
        const query: VisitasFilterParams = {
          accountID: currentAccountID,
          ...(paramsToUse || visitasFilters),
        };
        const res = await getVisitasReport(token, query);
        setVisitasList(res.visitas || []);
        setTotalRegistros(res.totalRegistros || 0);
        setTotalPaginas(res.totalPaginas || 1);
      } catch (err: any) {
        handleApiError(err, 'No se pudo obtener el reporte de visitas');
      } finally {
        setLoadingVisitas(false);
      }
    },
    [token, currentAccountID, visitasFilters, handleApiError],
  );

  /* ------------------------------------------------------------------ */
  /* Carga de Resumen (GET /resumen)                                    */
  /* ------------------------------------------------------------------ */
  const fetchResumen = useCallback(
    async (paramsToUse?: ResumenFilterParams) => {
      setLoadingResumen(true);
      try {
        const query: ResumenFilterParams = {
          accountID: currentAccountID,
          ...(paramsToUse || resumenFilters),
        };
        const data = await getResumenReport(token, query);
        setResumenList(data || []);
      } catch (err: any) {
        handleApiError(err, 'No se pudo obtener el resumen de geocercas');
      } finally {
        setLoadingResumen(false);
      }
    },
    [token, currentAccountID, resumenFilters, handleApiError],
  );

  // Ejecutar carga inicial al abrir el drawer
  useEffect(() => {
    if (open) {
      if (activeTab === 'visitas') {
        fetchVisitas();
      } else {
        fetchResumen();
      }
    }
  }, [open, activeTab]);

  /* ------------------------------------------------------------------ */
  /* Carga de Detalle Individual (GET /visitas/{id})                     */
  /* ------------------------------------------------------------------ */
  const openVisitDetail = async (id: number | string) => {
    setSelectedVisitId(id);
    setLoadingDetail(true);
    setVisitDetail(null);
    try {
      const data = await getVisitaById(token, id, currentAccountID);
      setVisitDetail(data);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        toast.error('Visita no encontrada');
      } else {
        handleApiError(err, 'No se pudo obtener el detalle de la visita');
      }
      setSelectedVisitId(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Exportación Profesional a Excel y PDF                              */
  /* ------------------------------------------------------------------ */
  const getAllVisitasForExport = async (): Promise<VisitaItem[]> => {
    if (totalRegistros <= visitasList.length) {
      return visitasList;
    }
    try {
      const res = await getVisitasReport(token, {
        ...visitasFilters,
        page: 1,
        pageSize: 1000,
      });
      return res.visitas && res.visitas.length > 0 ? res.visitas : visitasList;
    } catch {
      return visitasList;
    }
  };

  const handleExportExcel = async () => {
    if (visitasList.length === 0) {
      toast.info('No hay visitas para exportar');
      return;
    }
    setExporting('excel');
    const toastId = toast.loading('Generando Excel corporativo Velsat...');
    try {
      const allData = await getAllVisitasForExport();
      const selectedGeo = geofences.find(
        (g) =>
          (g.geofenceID && g.geofenceID === visitasFilters.geofenceID) ||
          g.numericId === visitasFilters.geofenceID,
      );

      await exportVisitasToExcel(allData, {
        accountID: currentAccountID,
        geofenceName: selectedGeo ? selectedGeo.name : 'Todas',
        vehicleName: visitasFilters.deviceID || 'Todos',
        fechaDesde: visitasFilters.fechaDesde,
        fechaHasta: visitasFilters.fechaHasta,
        formatDurationText: (m, inside, inDate, outDate) =>
          formatDuration(m, inside, inDate, outDate).text,
      });

      toast.success('Excel descargado exitosamente', { id: toastId });
    } catch (err) {
      console.error('Error al exportar Excel:', err);
      toast.error('Error al generar el archivo Excel', { id: toastId });
    } finally {
      setExporting(null);
    }
  };

  const handleExportPdf = async () => {
    if (visitasList.length === 0) {
      toast.info('No hay visitas para exportar');
      return;
    }
    setExporting('pdf');
    const toastId = toast.loading('Generando PDF membretado Velsat...');
    try {
      const allData = await getAllVisitasForExport();
      const selectedGeo = geofences.find(
        (g) =>
          (g.geofenceID && g.geofenceID === visitasFilters.geofenceID) ||
          g.numericId === visitasFilters.geofenceID,
      );

      await exportVisitasToPdf(allData, {
        accountID: currentAccountID,
        geofenceName: selectedGeo ? selectedGeo.name : 'Todas',
        vehicleName: visitasFilters.deviceID || 'Todos',
        fechaDesde: visitasFilters.fechaDesde,
        fechaHasta: visitasFilters.fechaHasta,
        formatDurationText: (m, inside, inDate, outDate) =>
          formatDuration(m, inside, inDate, outDate).text,
      });

      toast.success('PDF descargado exitosamente', { id: toastId });
    } catch (err) {
      console.error('Error al exportar PDF:', err);
      toast.error('Error al generar el archivo PDF', { id: toastId });
    } finally {
      setExporting(null);
    }
  };

  const handleExportResumenExcel = async () => {
    if (resumenList.length === 0) {
      toast.info('No hay datos en el resumen para exportar');
      return;
    }
    setExporting('excel');
    const toastId = toast.loading('Generando Excel de Resumen...');
    try {
      const selectedGeo = geofences.find(
        (g) =>
          (g.geofenceID && g.geofenceID === resumenFilters.geofenceID) ||
          g.numericId === resumenFilters.geofenceID,
      );
      await exportResumenToExcel(resumenList, {
        accountID: currentAccountID,
        geofenceName: selectedGeo ? selectedGeo.name : 'Todas',
        fechaDesde: resumenFilters.fechaDesde,
        fechaHasta: resumenFilters.fechaHasta,
      });
      toast.success('Resumen Excel descargado exitosamente', { id: toastId });
    } catch (err) {
      console.error('Error al exportar Excel resumen:', err);
      toast.error('Error al exportar Excel', { id: toastId });
    } finally {
      setExporting(null);
    }
  };

  const handleExportResumenPdf = async () => {
    if (resumenList.length === 0) {
      toast.info('No hay datos en el resumen para exportar');
      return;
    }
    setExporting('pdf');
    const toastId = toast.loading('Generando PDF de Resumen...');
    try {
      const selectedGeo = geofences.find(
        (g) =>
          (g.geofenceID && g.geofenceID === resumenFilters.geofenceID) ||
          g.numericId === resumenFilters.geofenceID,
      );
      await exportResumenToPdf(resumenList, {
        accountID: currentAccountID,
        geofenceName: selectedGeo ? selectedGeo.name : 'Todas',
        fechaDesde: resumenFilters.fechaDesde,
        fechaHasta: resumenFilters.fechaHasta,
      });
      toast.success('Resumen PDF descargado exitosamente', { id: toastId });
    } catch (err) {
      console.error('Error al exportar PDF resumen:', err);
      toast.error('Error al exportar PDF', { id: toastId });
    } finally {
      setExporting(null);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Métricas calculadas para la pestaña de Resumen                      */
  /* ------------------------------------------------------------------ */
  const totalVisitasGlobal = resumenList.reduce((acc, r) => acc + (Number(r.totalVisitas) || 0), 0);
  const totalMinutosGlobal = resumenList.reduce((acc, r) => acc + (Number(r.minutosTotales) || 0), 0);
  const promedioGlobal =
    totalVisitasGlobal > 0 ? (totalMinutosGlobal / totalVisitasGlobal).toFixed(1) : '0';

  if (!open) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-40 flex w-full max-w-[660px] lg:max-w-[700px] flex-col bg-white shadow-2xl border-l border-gray-200 transition-transform duration-300">
      {/* ============================================================ */}
      {/* CABECERA (Estilo exacto de la referencia)                    */}
      {/* ============================================================ */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 px-5 bg-white">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-[#113EB9]">
            <BarChart2 size={20} />
          </div>
          <div>
            <h2 className="text-[14px] font-bold text-gray-900 leading-tight">
              Reportes de geocercas
            </h2>
            <p className="text-[11px] text-gray-500 leading-normal">
              Visitas y permanencia por vehículo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Segmented Control de Pestañas */}
          <div className="flex items-center rounded-lg border border-gray-200 bg-slate-50 p-0.5 text-[11.5px] font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('visitas')}
              className={`rounded-md px-3 py-1 transition ${
                activeTab === 'visitas'
                  ? 'bg-white text-[#113EB9] font-bold shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Registro de visitas
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('resumen')}
              className={`rounded-md px-3 py-1 transition ${
                activeTab === 'resumen'
                  ? 'bg-white text-[#113EB9] font-bold shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Resumen
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            title="Cerrar panel de reportes"
            className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* CONTENIDO: PESTAÑA VISITAS                                   */}
      {/* ============================================================ */}
      {activeTab === 'visitas' && (
        <div className="flex flex-1 flex-col overflow-hidden bg-white">
          {/* BARRA DE FILTROS COMPACTA (Estilo exacto de la referencia) */}
          <div className="shrink-0 border-b border-gray-200 px-5 py-3 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11.5px]">
              {/* Filtros Izquierda */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Vehículo */}
                <div className="relative flex items-center">
                  <span className="text-[11px] text-gray-500 mr-1.5 font-medium">Vehículo</span>
                  <select
                    value={visitasFilters.deviceID || ''}
                    onChange={(e) =>
                      setVisitasFilters((prev) => ({ ...prev, deviceID: e.target.value, page: 1 }))
                    }
                    className="h-8 rounded-md border border-gray-300 bg-white px-2.5 text-[11.5px] font-semibold text-gray-800 outline-none hover:border-gray-400 focus:border-[#113EB9]"
                  >
                    <option value="">Todos</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.label || v.id}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Geocerca */}
                <div className="relative flex items-center">
                  <span className="text-[11px] text-gray-500 mr-1.5 font-medium">Geocerca</span>
                  <select
                    value={visitasFilters.geofenceID ?? ''}
                    onChange={(e) =>
                      setVisitasFilters((prev) => ({
                        ...prev,
                        geofenceID: e.target.value ? Number(e.target.value) : '',
                        page: 1,
                      }))
                    }
                    className="h-8 rounded-md border border-gray-300 bg-white px-2.5 text-[11.5px] font-semibold text-gray-800 outline-none hover:border-gray-400 focus:border-[#113EB9]"
                  >
                    <option value="">Todas</option>
                    {geofences.map((g) => {
                      const geoIdVal = g.geofenceID && g.geofenceID > 0 ? g.geofenceID : g.numericId || '';
                      return (
                        <option key={g.id} value={geoIdVal}>
                          {g.name}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Fecha Desde */}
                <div className="relative flex items-center">
                  <span className="text-[11px] text-gray-500 mr-1.5 font-medium">Desde</span>
                  <input
                    type="date"
                    value={visitasFilters.fechaDesde || ''}
                    onChange={(e) =>
                      setVisitasFilters((prev) => ({ ...prev, fechaDesde: e.target.value, page: 1 }))
                    }
                    className="h-8 rounded-md border border-gray-300 bg-white px-2 text-[11.5px] font-medium text-gray-800 outline-none hover:border-gray-400 focus:border-[#113EB9]"
                  />
                </div>

                {/* Fecha Hasta */}
                <div className="relative flex items-center">
                  <span className="text-[11px] text-gray-500 mr-1.5 font-medium">Hasta</span>
                  <input
                    type="date"
                    value={visitasFilters.fechaHasta || ''}
                    onChange={(e) =>
                      setVisitasFilters((prev) => ({ ...prev, fechaHasta: e.target.value, page: 1 }))
                    }
                    className="h-8 rounded-md border border-gray-300 bg-white px-2 text-[11.5px] font-medium text-gray-800 outline-none hover:border-gray-400 focus:border-[#113EB9]"
                  />
                </div>
              </div>

              {/* Botones Derecha */}
              <div className="flex items-center gap-1.5">
                {/* Menú Desplegable de Exportación Profesional */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setExportMenuOpen(!exportMenuOpen)}
                    disabled={loadingVisitas || visitasList.length === 0 || exporting !== null}
                    className="h-8 inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 text-[11.5px] font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 transition disabled:opacity-50"
                  >
                    <Download size={13} className="text-[#113EB9]" />
                    <span>{exporting ? 'Generando...' : 'Exportar'}</span>
                    <ChevronDown size={12} className="text-gray-400" />
                  </button>

                  {exportMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-30"
                        onClick={() => setExportMenuOpen(false)}
                      />
                      <div className="absolute left-0 mt-1 w-52 rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl z-40 text-xs animate-in fade-in zoom-in-95 duration-100">
                        <button
                          type="button"
                          onClick={() => {
                            setExportMenuOpen(false);
                            handleExportExcel();
                          }}
                          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-800 transition"
                        >
                          <div className="flex h-6 w-6 items-center justify-center rounded bg-emerald-100 text-emerald-700 font-bold text-[10px]">
                            XLS
                          </div>
                          <div>
                            <div className="font-bold text-gray-900">Excel (.xlsx)</div>
                            <div className="text-[10px] text-gray-500">Logo y colores corporativos</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setExportMenuOpen(false);
                            handleExportPdf();
                          }}
                          className="mt-0.5 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left font-medium text-gray-700 hover:bg-rose-50 hover:text-rose-800 transition"
                        >
                          <div className="flex h-6 w-6 items-center justify-center rounded bg-rose-100 text-rose-700 font-bold text-[10px]">
                            PDF
                          </div>
                          <div>
                            <div className="font-bold text-gray-900">PDF (.pdf)</div>
                            <div className="text-[10px] text-gray-500">Documento membretado</div>
                          </div>
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => fetchVisitas({ ...visitasFilters, page: 1 })}
                  disabled={loadingVisitas}
                  className="h-8 rounded-md bg-[#113EB9] px-4 text-[11.5px] font-bold text-white shadow-2xs hover:bg-blue-800 transition disabled:opacity-50"
                >
                  {loadingVisitas ? 'Buscando...' : 'Buscar'}
                </button>
              </div>
            </div>
          </div>

          {/* TABLA DE VISITAS (Estilo exacto de la referencia) */}
          <div className="flex-1 overflow-auto">
            <table className="w-full border-collapse text-left text-[12px]">
              <thead className="sticky top-0 z-10 border-b border-gray-200 bg-white text-[10px] font-bold uppercase tracking-wider text-gray-400">
                <tr>
                  <th className="py-2.5 px-5">Vehículo</th>
                  <th className="py-2.5 px-3">Geocerca</th>
                  <th className="py-2.5 px-3">Entrada</th>
                  <th className="py-2.5 px-3">Salida</th>
                  <th className="py-2.5 px-3">Duración</th>
                  <th className="py-2.5 px-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {loadingVisitas ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-gray-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw size={22} className="animate-spin text-[#113EB9]" />
                        <span className="text-xs">Cargando registros...</span>
                      </div>
                    </td>
                  </tr>
                ) : visitasList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-gray-400 text-xs">
                      No se encontraron visitas con los filtros seleccionados
                    </td>
                  </tr>
                ) : (
                  visitasList.map((item) => {
                    const isInside = !item.fechaSalida;
                    const dur = formatDuration(item.duracionMinutos, isInside, item.fechaEntrada, item.fechaSalida);

                    return (
                      <tr
                        key={item.id}
                        onClick={() => openVisitDetail(item.id)}
                        className="group transition-colors hover:bg-slate-50 cursor-pointer"
                      >
                        {/* Vehículo */}
                        <td className="py-3 px-5 font-mono font-bold text-gray-900">
                          {item.deviceID}
                        </td>

                        {/* Geocerca */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5 font-medium text-gray-800">
                            <span className="inline-block h-2 w-2 rounded-full bg-[#113EB9]" />
                            <span className="truncate max-w-[130px]">
                              {item.geofenceName || `Geocerca #${item.geofenceID}`}
                            </span>
                          </div>
                        </td>

                        {/* Entrada */}
                        <td className="py-3 px-3 text-gray-600 font-medium">
                          {formatTableDate(item.fechaEntrada)}
                        </td>

                        {/* Salida */}
                        <td className="py-3 px-3 font-medium">
                          {isInside ? (
                            <span className="font-bold text-emerald-600">Dentro</span>
                          ) : (
                            <span className="text-gray-600">{formatTableDate(item.fechaSalida)}</span>
                          )}
                        </td>

                        {/* Duración */}
                        <td className="py-3 px-3 font-bold text-gray-900">
                          {dur.isLive ? (
                            <span className="font-semibold text-gray-500 italic">En curso</span>
                          ) : (
                            dur.text
                          )}
                        </td>

                        {/* Acción Mapa */}
                        <td
                          className="py-3 px-4 text-right"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onViewVisitOnMap) {
                              onViewVisitOnMap(item);
                            } else {
                              openVisitDetail(item.id);
                            }
                          }}
                        >
                          <button
                            type="button"
                            title="Ver en el mapa"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-blue-50 hover:text-[#113EB9] transition"
                          >
                            <MapPin size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* PIE DE TABLA (Estilo exacto de la referencia) */}
          <div className="shrink-0 flex items-center justify-between border-t border-gray-200 px-5 py-3 text-[11.5px] text-gray-500 bg-white">
            <div>
              <span className="font-bold text-gray-800">{totalRegistros}</span> registros ·{' '}
              {formatDateOnly(visitasFilters.fechaDesde)} – {formatDateOnly(visitasFilters.fechaHasta)}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={loadingVisitas || (visitasFilters.page || 1) <= 1}
                onClick={() => {
                  const newPage = Math.max(1, (visitasFilters.page || 1) - 1);
                  setVisitasFilters((prev) => ({ ...prev, page: newPage }));
                  fetchVisitas({ ...visitasFilters, page: newPage });
                }}
                className="rounded-md border border-gray-200 px-3 py-1 text-[11.5px] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition"
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={loadingVisitas || (visitasFilters.page || 1) >= totalPaginas}
                onClick={() => {
                  const newPage = (visitasFilters.page || 1) + 1;
                  setVisitasFilters((prev) => ({ ...prev, page: newPage }));
                  fetchVisitas({ ...visitasFilters, page: newPage });
                }}
                className="rounded-md border border-gray-200 px-3 py-1 text-[11.5px] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition"
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* CONTENIDO: PESTAÑA RESUMEN                                   */}
      {/* ============================================================ */}
      {activeTab === 'resumen' && (
        <div className="flex flex-1 flex-col overflow-hidden bg-slate-50/50">
          {/* Filtros de Resumen */}
          <div className="shrink-0 border-b border-gray-200 px-5 py-3 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11.5px]">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center">
                  <span className="text-[11px] text-gray-500 mr-1.5 font-medium">Desde</span>
                  <input
                    type="date"
                    required
                    value={resumenFilters.fechaDesde}
                    onChange={(e) =>
                      setResumenFilters((prev) => ({ ...prev, fechaDesde: e.target.value }))
                    }
                    className="h-8 rounded-md border border-gray-300 bg-white px-2 text-[11.5px] font-medium text-gray-800 outline-none focus:border-[#113EB9]"
                  />
                </div>

                <div className="flex items-center">
                  <span className="text-[11px] text-gray-500 mr-1.5 font-medium">Hasta</span>
                  <input
                    type="date"
                    required
                    value={resumenFilters.fechaHasta}
                    onChange={(e) =>
                      setResumenFilters((prev) => ({ ...prev, fechaHasta: e.target.value }))
                    }
                    className="h-8 rounded-md border border-gray-300 bg-white px-2 text-[11.5px] font-medium text-gray-800 outline-none focus:border-[#113EB9]"
                  />
                </div>

                <div className="flex items-center">
                  <span className="text-[11px] text-gray-500 mr-1.5 font-medium">Geocerca</span>
                  <select
                    value={resumenFilters.geofenceID ?? ''}
                    onChange={(e) =>
                      setResumenFilters((prev) => ({
                        ...prev,
                        geofenceID: e.target.value ? Number(e.target.value) : '',
                      }))
                    }
                    className="h-8 rounded-md border border-gray-300 bg-white px-2 text-[11.5px] font-semibold text-gray-800 outline-none focus:border-[#113EB9]"
                  >
                    <option value="">Todas</option>
                    {geofences.map((g) => {
                      const geoIdVal = g.geofenceID && g.geofenceID > 0 ? g.geofenceID : g.numericId || '';
                      return (
                        <option key={g.id} value={geoIdVal}>
                          {g.name}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Menú Desplegable de Exportación Resumen */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setExportResumenMenuOpen(!exportResumenMenuOpen)}
                    disabled={loadingResumen || resumenList.length === 0 || exporting !== null}
                    className="h-8 inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 text-[11.5px] font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 transition disabled:opacity-50"
                  >
                    <Download size={13} className="text-[#113EB9]" />
                    <span>{exporting ? 'Generando...' : 'Exportar'}</span>
                    <ChevronDown size={12} className="text-gray-400" />
                  </button>

                  {exportResumenMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-30"
                        onClick={() => setExportResumenMenuOpen(false)}
                      />
                      <div className="absolute left-0 mt-1 w-52 rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl z-40 text-xs animate-in fade-in zoom-in-95 duration-100">
                        <button
                          type="button"
                          onClick={() => {
                            setExportResumenMenuOpen(false);
                            handleExportResumenExcel();
                          }}
                          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-800 transition"
                        >
                          <div className="flex h-6 w-6 items-center justify-center rounded bg-emerald-100 text-emerald-700 font-bold text-[10px]">
                            XLS
                          </div>
                          <div>
                            <div className="font-bold text-gray-900">Excel (.xlsx)</div>
                            <div className="text-[10px] text-gray-500">Resumen consolidado</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setExportResumenMenuOpen(false);
                            handleExportResumenPdf();
                          }}
                          className="mt-0.5 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left font-medium text-gray-700 hover:bg-rose-50 hover:text-rose-800 transition"
                        >
                          <div className="flex h-6 w-6 items-center justify-center rounded bg-rose-100 text-rose-700 font-bold text-[10px]">
                            PDF
                          </div>
                          <div>
                            <div className="font-bold text-gray-900">PDF (.pdf)</div>
                            <div className="text-[10px] text-gray-500">Documento membretado</div>
                          </div>
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => fetchResumen()}
                  disabled={loadingResumen}
                  className="h-8 rounded-md bg-[#113EB9] px-4 text-[11.5px] font-bold text-white shadow-2xs hover:bg-blue-800 transition disabled:opacity-50"
                >
                  {loadingResumen ? 'Calculando...' : 'Actualizar'}
                </button>
              </div>
            </div>
          </div>

          {/* KPI Cards Resumen */}
          <div className="grid grid-cols-3 gap-3 p-5">
            <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-xs">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                Total Visitas
              </span>
              <p className="mt-1 text-2xl font-black text-[#113EB9]">{totalVisitasGlobal}</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-xs">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                Permanencia Total
              </span>
              <p className="mt-1 text-2xl font-black text-emerald-700">
                {totalMinutosGlobal >= 60
                  ? `${(totalMinutosGlobal / 60).toFixed(1)} h`
                  : `${totalMinutosGlobal} min`}
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-xs">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                Promedio / Visita
              </span>
              <p className="mt-1 text-2xl font-black text-amber-600">{promedioGlobal} min</p>
            </div>
          </div>

          {/* Tabla Resumen */}
          <div className="flex-1 overflow-auto px-5 pb-5">
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
              <table className="w-full border-collapse text-left text-[12px]">
                <thead className="border-b border-gray-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  <tr>
                    <th className="py-2.5 px-4">Vehículo</th>
                    <th className="py-2.5 px-4">Geocerca</th>
                    <th className="py-2.5 px-4 text-center">Visitas</th>
                    <th className="py-2.5 px-4 text-center">Tiempo Total</th>
                    <th className="py-2.5 px-4 text-center">Promedio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {loadingResumen ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-gray-400 text-xs">
                        Calculando métricas...
                      </td>
                    </tr>
                  ) : resumenList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-gray-400 text-xs">
                        No hay datos de resumen para el rango seleccionado
                      </td>
                    </tr>
                  ) : (
                    resumenList.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-4 font-mono font-bold text-gray-900">
                          {item.deviceID || 'Todos'}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-gray-800">
                          {item.geofenceName || `#${item.geofenceID}`}
                        </td>
                        <td className="py-2.5 px-4 text-center font-bold text-[#113EB9]">
                          {item.totalVisitas}
                        </td>
                        <td className="py-2.5 px-4 text-center font-semibold text-emerald-700">
                          {item.minutosTotales} min
                        </td>
                        <td className="py-2.5 px-4 text-center font-medium text-amber-700">
                          {item.minutosPromedioPorVisita !== undefined
                            ? Number(item.minutosPromedioPorVisita).toFixed(1)
                            : '-'}{' '}
                          min
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* DETALLE DE VISITA POPUP OVERLAY                              */}
      {/* ============================================================ */}
      {selectedVisitId !== null && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-2xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-[#113EB9]">
                  <Clock size={16} />
                </div>
                <h3 className="text-sm font-bold text-gray-900">
                  Detalle de Visita #{selectedVisitId}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedVisitId(null)}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            </div>

            {loadingDetail ? (
              <div className="flex flex-col items-center justify-center py-8">
                <RefreshCw size={22} className="animate-spin text-[#113EB9]" />
                <span className="mt-2 text-xs text-gray-500">Cargando información...</span>
              </div>
            ) : visitDetail ? (
              <div className="mt-3 space-y-2.5 text-xs">
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3">
                  <div>
                    <span className="font-semibold text-gray-400 text-[10px] uppercase">Vehículo</span>
                    <p className="font-mono font-bold text-gray-900 text-[13px]">
                      {visitDetail.deviceID}
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-400 text-[10px] uppercase">Geocerca</span>
                    <p className="font-bold text-gray-900 text-[13px]">
                      {visitDetail.geofenceName || `#${visitDetail.geofenceID}`}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Entrada:</span>
                    <span className="font-semibold text-emerald-700">
                      {visitDetail.fechaEntrada
                        ? new Date(visitDetail.fechaEntrada).toLocaleString('es-PE')
                        : '-'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Salida:</span>
                    <span className="font-semibold text-rose-700">
                      {visitDetail.fechaSalida
                        ? new Date(visitDetail.fechaSalida).toLocaleString('es-PE')
                        : 'Dentro de geocerca'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Permanencia:</span>
                    <span className="font-bold text-gray-900">
                      {
                        formatDuration(
                          visitDetail.duracionMinutos,
                          !visitDetail.fechaSalida,
                          visitDetail.fechaEntrada,
                          visitDetail.fechaSalida,
                        ).text
                      }
                    </span>
                  </div>

                  {visitDetail.latitudEntrada != null && visitDetail.longitudEntrada != null && (
                    <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-[11px]">
                      <span className="text-gray-400">Coordenadas Entrada:</span>
                      <span className="font-mono text-gray-700">
                        {visitDetail.latitudEntrada.toFixed(5)}, {visitDetail.longitudEntrada.toFixed(5)}
                      </span>
                    </div>
                  )}

                  {visitDetail.latitudSalida != null && visitDetail.longitudSalida != null && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-400">Coordenadas Salida:</span>
                      <span className="font-mono text-gray-700">
                        {visitDetail.latitudSalida.toFixed(5)}, {visitDetail.longitudSalida.toFixed(5)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex gap-2 pt-2">
                  {Boolean(
                    (visitDetail.latitudEntrada != null && visitDetail.longitudEntrada != null) ||
                      (visitDetail.latitudSalida != null && visitDetail.longitudSalida != null),
                  ) && (
                    <button
                      type="button"
                      onClick={() => {
                        if (onViewVisitOnMap && visitDetail) {
                          onViewVisitOnMap(visitDetail);
                          setSelectedVisitId(null);
                        }
                      }}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#FB7B0F] py-2 font-bold text-white shadow-xs hover:bg-[#e56d09] transition"
                    >
                      <MapPin size={15} />
                      <span>Ver puntos en el mapa</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedVisitId(null)}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-600 hover:bg-gray-100 transition"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-gray-500">Visita no encontrada</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
