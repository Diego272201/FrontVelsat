'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeft,
  BarChart2,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Download,
  Filter,
  Layers,
  MapPin,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
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

// Formateador de fechas para los inputs con hora (YYYY-MM-DDTHH:mm)
const formatDateTimeLocal = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const getDefaultDates = () => {
  const now = new Date();
  now.setHours(23, 59, 0, 0);

  const past = new Date();
  past.setDate(now.getDate() - 7);
  past.setHours(0, 0, 0, 0);

  return {
    desde: formatDateTimeLocal(past),
    hasta: formatDateTimeLocal(now),
  };
};

// Rango para la pestaña Resumen: desde las 00:00 de hoy hasta la hora actual
const getTodayResumenDates = () => {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  return {
    desde: formatDateTimeLocal(startOfDay),
    hasta: formatDateTimeLocal(now),
  };
};

// Formateador de duración para el resumen (ej: "148 h 58 min", "51 h", "10 min")
function formatDurationSummary(minutesInput?: number | null): string {
  const mins = Number(minutesInput) || 0;
  if (mins <= 0) return '0 min';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);

  if (h > 0 && m > 0) {
    return `${h.toLocaleString('en-US')} h ${m} min`;
  }
  if (h > 0) {
    return `${h.toLocaleString('en-US')} h`;
  }
  return `${m} min`;
}

// Renderizador visual para las tarjetas KPI de resumen
function renderKpiDuration(totalMinutes: number) {
  if (!totalMinutes || totalMinutes <= 0) {
    return (
      <span className="text-[18px] sm:text-[19px] font-extrabold text-slate-900 tabular-nums">
        0 min
      </span>
    );
  }
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);

  if (h > 0 && m > 0) {
    return (
      <div className="flex items-baseline gap-1 whitespace-nowrap">
        <span className="text-[18px] sm:text-[19px] font-extrabold text-slate-900 tabular-nums">
          {h.toLocaleString('en-US')} h {m}
        </span>
        <span className="text-[11px] font-semibold text-slate-500">min</span>
      </div>
    );
  }
  if (h > 0) {
    return (
      <div className="flex items-baseline gap-1 whitespace-nowrap">
        <span className="text-[18px] sm:text-[19px] font-extrabold text-slate-900 tabular-nums">
          {h.toLocaleString('en-US')}
        </span>
        <span className="text-[11px] font-semibold text-slate-500">h</span>
      </div>
    );
  }
  return (
    <div className="flex items-baseline gap-1 whitespace-nowrap">
      <span className="text-[18px] sm:text-[19px] font-extrabold text-slate-900 tabular-nums">{m}</span>
      <span className="text-[11px] font-semibold text-slate-500">min</span>
    </div>
  );
}

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

// Renderiza fecha y hora: Fecha primero (DD/MM), luego hora (HH:mm), con estilo y tipografía uniforme
function renderTableDateTime(dateStr?: string | null) {
  if (!dateStr) {
    return <span className="text-gray-400 font-medium">—</span>;
  }
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      return <span className="text-gray-700 font-medium text-[11.5px]">{dateStr}</span>;
    }
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return (
      <span className="text-gray-700 font-medium text-[11.5px] whitespace-nowrap">
        {day}/{month} {hours}:{mins}
      </span>
    );
  } catch {
    return <span className="text-gray-700 font-medium text-[11.5px]">{dateStr}</span>;
  }
}

// Formato visual corto para footer: DD/MM/YYYY HH:mm o DD/MM/YYYY
function formatDateOnly(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      const datePart = dateStr.split('T')[0];
      const parts = datePart.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    }
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    if (dateStr.includes('T')) {
      return `${day}/${month}/${year} ${hours}:${mins}`;
    }
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

// Formateador de duración exacto (ej: "18 h 13 min", "11 min 43 s", "Solo salida", "En curso")
function formatDuration(
  minutes?: number | null,
  isInside?: boolean,
  fechaEntrada?: string | null,
  fechaSalida?: string | null,
): { text: string; isLive: boolean; isSoloSalida?: boolean } {
  // 1. Si sólo hay salida registrada sin entrada previa
  if (!fechaEntrada && fechaSalida) {
    return { text: 'Solo salida', isLive: false, isSoloSalida: true };
  }

  if (isInside || (!fechaSalida && (minutes === null || minutes === undefined))) {
    return { text: 'En curso', isLive: true };
  }

  // 2. Si tenemos fechas válidas de entrada y salida, calculamos segundos exactos
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
    pageSize: 25,
  });

  const [visitasList, setVisitasList] = useState<VisitaItem[]>([]);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [loadingVisitas, setLoadingVisitas] = useState(false);

  /* ------------------------------------------------------------------ */
  /* Estado: Resumen de Visitas                                         */
  /* ------------------------------------------------------------------ */
  const [resumenFilters, setResumenFilters] = useState<ResumenFilterParams>(() => {
    const today = getTodayResumenDates();
    return {
      accountID: currentAccountID,
      fechaDesde: today.desde,
      fechaHasta: today.hasta,
      geofenceID: '',
      deviceID: '',
    };
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

  // Ejecutar carga inicial al abrir el drawer o cambiar de pestaña
  useEffect(() => {
    if (open) {
      if (activeTab === 'visitas') {
        fetchVisitas();
      } else {
        const today = getTodayResumenDates();
        setResumenFilters((prev) => {
          const next = {
            ...prev,
            fechaDesde: today.desde,
            fechaHasta: today.hasta,
          };
          fetchResumen(next);
          return next;
        });
      }
    }
  }, [open, activeTab]);

  // Cerrar con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        if (selectedVisitId !== null) {
          setSelectedVisitId(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, selectedVisitId]);

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
  const totalVehiculosGlobal = useMemo(() => {
    return new Set(resumenList.map((r) => r.deviceID).filter(Boolean)).size;
  }, [resumenList]);

  // Ordenamiento de tabla de Resumen (por defecto Tiempo Total descendente)
  const [resumenSortKey, setResumenSortKey] = useState<
    'vehiculo' | 'geocerca' | 'visitas' | 'tiempo' | 'promedio'
  >('tiempo');
  const [resumenSortAsc, setResumenSortAsc] = useState<boolean>(false);

  const handleSortResumen = (key: 'vehiculo' | 'geocerca' | 'visitas' | 'tiempo' | 'promedio') => {
    if (resumenSortKey === key) {
      setResumenSortAsc((prev) => !prev);
    } else {
      setResumenSortKey(key);
      setResumenSortAsc(false); // descendente por defecto
    }
  };

  const sortedResumenList = useMemo(() => {
    return [...resumenList].sort((a, b) => {
      let comp = 0;
      if (resumenSortKey === 'tiempo') {
        comp = (Number(a.minutosTotales) || 0) - (Number(b.minutosTotales) || 0);
      } else if (resumenSortKey === 'visitas') {
        comp = (Number(a.totalVisitas) || 0) - (Number(b.totalVisitas) || 0);
      } else if (resumenSortKey === 'promedio') {
        const avgA =
          a.minutosPromedioPorVisita !== undefined
            ? Number(a.minutosPromedioPorVisita)
            : a.totalVisitas
            ? (Number(a.minutosTotales) || 0) / Number(a.totalVisitas)
            : 0;
        const avgB =
          b.minutosPromedioPorVisita !== undefined
            ? Number(b.minutosPromedioPorVisita)
            : b.totalVisitas
            ? (Number(b.minutosTotales) || 0) / Number(b.totalVisitas)
            : 0;
        comp = avgA - avgB;
      } else if (resumenSortKey === 'vehiculo') {
        comp = (a.deviceID || '').localeCompare(b.deviceID || '');
      } else if (resumenSortKey === 'geocerca') {
        comp = (a.geofenceName || '').localeCompare(b.geofenceName || '');
      }
      return resumenSortAsc ? comp : -comp;
    });
  }, [resumenList, resumenSortKey, resumenSortAsc]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-40 overflow-hidden pointer-events-none">
          {/* Backdrop sutil */}
          <motion.div
            key="geocercas-reports-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-[0.5px] pointer-events-auto"
          />

          {/* Panel deslizante de derecha a izquierda suave sin golpes */}
          <motion.div
            key="geocercas-reports-drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[680px] lg:max-w-[740px] xl:max-w-[780px] flex-col bg-white shadow-2xl border-l border-gray-200 overflow-hidden pointer-events-auto"
          >
            {/* ============================================================ */}
            {/* CABECERA (Estilo exacto de la referencia: Flecha Regresar + Título) */}
            {/* ============================================================ */}
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 px-4 sm:px-5 bg-white">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  title="Regresar"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition active:scale-95"
                >
                  <ArrowLeft size={20} className="stroke-[2.2]" />
                </button>
                <div>
                  <h2 className="text-[15px] font-bold text-gray-900 leading-tight">
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
                    onClick={() => {
                      if (activeTab === 'resumen') {
                        const today = getTodayResumenDates();
                        setResumenFilters((prev) => {
                          const next = {
                            ...prev,
                            fechaDesde: today.desde,
                            fechaHasta: today.hasta,
                          };
                          fetchResumen(next);
                          return next;
                        });
                      } else {
                        setActiveTab('resumen');
                      }
                    }}
                    className={`rounded-md px-3 py-1 transition ${
                      activeTab === 'resumen'
                        ? 'bg-white text-[#113EB9] font-bold shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Resumen
                  </button>
                </div>
              </div>
            </div>

      {/* ============================================================ */}
      {/* CONTENIDO: PESTAÑA VISITAS                                   */}
      {/* ============================================================ */}
      {activeTab === 'visitas' && (
        <div className="flex flex-1 flex-col overflow-hidden bg-white">
          {/* BARRA DE FILTROS COMPACTA */}
          <div className="shrink-0 border-b border-gray-200 px-4 py-2.5 bg-white space-y-2">
            {/* Fila 1: VEHÍCULO, GEOCERCA, DESDE, HASTA */}
            <div className="flex flex-wrap items-end gap-2">
              {/* Vehículo */}
              <div className="flex-1 min-w-[125px]">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
                  Vehículo
                </label>
                <div className="relative">
                  <select
                    value={visitasFilters.deviceID || ''}
                    onChange={(e) =>
                      setVisitasFilters((prev) => ({ ...prev, deviceID: e.target.value, page: 1 }))
                    }
                    className="w-full h-8 rounded-lg border border-gray-300 bg-white px-2.5 pr-7 text-[11.5px] font-medium text-gray-800 outline-none hover:border-gray-400 focus:border-[#113EB9] transition appearance-none cursor-pointer"
                  >
                    <option value="">Todos</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.label || v.id}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={13}
                    className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                </div>
              </div>

              {/* Geocerca */}
              <div className="flex-1 min-w-[125px]">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
                  Geocerca
                </label>
                <div className="relative">
                  <select
                    value={visitasFilters.geofenceID ?? ''}
                    onChange={(e) =>
                      setVisitasFilters((prev) => ({
                        ...prev,
                        geofenceID: e.target.value ? Number(e.target.value) : '',
                        page: 1,
                      }))
                    }
                    className="w-full h-8 rounded-lg border border-gray-300 bg-white px-2.5 pr-7 text-[11.5px] font-medium text-gray-800 outline-none hover:border-gray-400 focus:border-[#113EB9] transition appearance-none cursor-pointer"
                  >
                    <option value="">Todas</option>
                    {geofences.map((g) => {
                      const geoIdVal =
                        g.geofenceID && g.geofenceID > 0 ? g.geofenceID : g.numericId || '';
                      return (
                        <option key={g.id} value={geoIdVal}>
                          {g.name}
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown
                    size={13}
                    className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                </div>
              </div>

              {/* Fecha Desde con Hora */}
              <div className="w-[170px] sm:w-[175px]">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
                  Desde
                </label>
                <input
                  type="datetime-local"
                  value={visitasFilters.fechaDesde || ''}
                  onChange={(e) =>
                    setVisitasFilters((prev) => ({ ...prev, fechaDesde: e.target.value, page: 1 }))
                  }
                  className="w-full h-8 rounded-lg border border-gray-300 bg-white px-2 text-[11px] font-medium text-gray-800 outline-none hover:border-gray-400 focus:border-[#113EB9] transition"
                />
              </div>

              {/* Fecha Hasta con Hora */}
              <div className="w-[170px] sm:w-[175px]">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
                  Hasta
                </label>
                <input
                  type="datetime-local"
                  value={visitasFilters.fechaHasta || ''}
                  onChange={(e) =>
                    setVisitasFilters((prev) => ({ ...prev, fechaHasta: e.target.value, page: 1 }))
                  }
                  className="w-full h-8 rounded-lg border border-gray-300 bg-white px-2 text-[11px] font-medium text-gray-800 outline-none hover:border-gray-400 focus:border-[#113EB9] transition"
                />
              </div>
            </div>

            {/* Fila 2: Botones Buscar y Exportar juntos en la MISMA fila */}
            <div className="flex items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => fetchVisitas({ ...visitasFilters, page: 1 })}
                disabled={loadingVisitas}
                className="h-8 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#113EB9] px-3.5 text-[11.5px] font-bold text-white shadow-2xs hover:bg-[#0e339b] active:scale-95 transition disabled:opacity-50"
              >
                <Search size={13} className="stroke-[2.5]" />
                <span>{loadingVisitas ? 'Buscando...' : 'Buscar'}</span>
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setExportMenuOpen(!exportMenuOpen)}
                  disabled={loadingVisitas || visitasList.length === 0 || exporting !== null}
                  className="h-8 inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-[11.5px] font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 transition disabled:opacity-50"
                >
                  <Download size={13} className="text-gray-500" />
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
            </div>
          </div>

          {/* TABLA DE VISITAS COMPACTA */}
          <div
            className={`flex-1 ${
              selectedVisitId !== null ? 'overflow-hidden' : 'overflow-auto'
            } custom-scrollbar-reportes [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-thumb]:rounded-full`}
          >
            <table className="w-full border-collapse text-left text-[12px]">
              <thead className="sticky top-0 z-10 border-b border-gray-200 bg-[#F8FAFC] text-[10px] font-bold uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="py-2 px-4">Vehículo</th>
                  <th className="py-2 px-3">Geocerca</th>
                  <th className="py-2 px-3">Entrada</th>
                  <th className="py-2 px-3">Salida</th>
                  <th className="py-2 px-3">Duración</th>
                  <th className="py-2 px-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {loadingVisitas ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw size={20} className="animate-spin text-[#113EB9]" />
                        <span className="text-xs">Cargando registros...</span>
                      </div>
                    </td>
                  </tr>
                ) : visitasList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400 text-xs">
                      No se encontraron visitas con los filtros seleccionados
                    </td>
                  </tr>
                ) : (
                  visitasList.map((item) => {
                    const isInside = !item.fechaSalida;
                    const dur = formatDuration(item.duracionMinutos, isInside, item.fechaEntrada, item.fechaSalida);
                    const isSelected = selectedVisitId === item.id;

                    return (
                      <tr
                        key={item.id}
                        onClick={() => openVisitDetail(item.id)}
                        className={`group transition-colors hover:bg-slate-50 cursor-pointer ${
                          isSelected ? 'bg-blue-50/40' : ''
                        }`}
                      >
                        {/* Vehículo: Azul corporativo en negrita SIN subrayado */}
                        <td className="py-1.5 px-4 font-mono font-bold text-[12px] text-[#113EB9]">
                          {item.deviceID}
                        </td>

                        {/* Geocerca: Punto azul + Nombre */}
                        <td className="py-1.5 px-3">
                          <div className="flex items-center gap-1.5 font-medium text-gray-800 text-[12px]">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#113EB9] shrink-0" />
                            <span className="truncate max-w-[130px]">
                              {item.geofenceName || `Geocerca #${item.geofenceID}`}
                            </span>
                          </div>
                        </td>

                        {/* Entrada: Hora en negrita + fecha en gris claro */}
                        <td className="py-1.5 px-3">
                          {renderTableDateTime(item.fechaEntrada)}
                        </td>

                        {/* Salida: Hora en negrita + fecha en gris claro o Dentro */}
                        <td className="py-1.5 px-3">
                          {isInside ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Dentro
                            </span>
                          ) : (
                            renderTableDateTime(item.fechaSalida)
                          )}
                        </td>

                        {/* Duración: Solo salida en cápsula ámbar suave, En curso en verde o texto en negrita */}
                        <td className="py-1.5 px-3">
                          {dur.isSoloSalida ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]">
                              Solo salida
                            </span>
                          ) : dur.isLive ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              En curso
                            </span>
                          ) : (
                            <span className="font-bold text-gray-900 text-[12px]">{dur.text}</span>
                          )}
                        </td>

                        {/* Acción Mapa: Botón de pin compacto */}
                        <td
                          className="py-1.5 px-3 text-right"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onViewVisitOnMap) {
                              onViewVisitOnMap(item);
                              onClose();
                            } else {
                              openVisitDetail(item.id);
                            }
                          }}
                        >
                          <button
                            type="button"
                            title="Ver en el mapa"
                            className={`inline-flex h-7 w-7 items-center justify-center rounded-md transition ${
                              isSelected
                                ? 'bg-[#113EB9] text-white shadow-xs'
                                : 'border border-gray-200 text-gray-400 hover:text-[#113EB9] hover:border-blue-300 hover:bg-blue-50/50'
                            }`}
                          >
                            <MapPin size={13.5} className="stroke-[2]" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* PIE DE TABLA (Paginación y cantidad de registros) */}
          <div className="shrink-0 flex items-center justify-between border-t border-gray-200 px-5 py-2.5 text-[11.5px] text-gray-500 bg-white">
            <div className="flex items-center gap-2">
              <span>
                <span className="font-bold text-gray-800">{totalRegistros}</span> registros ·{' '}
                {formatDateOnly(visitasFilters.fechaDesde)} – {formatDateOnly(visitasFilters.fechaHasta)}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                <span>Filas:</span>
                <select
                  value={visitasFilters.pageSize || 25}
                  onChange={(e) => {
                    const newSize = Number(e.target.value);
                    setVisitasFilters((prev) => ({ ...prev, pageSize: newSize, page: 1 }));
                    fetchVisitas({ ...visitasFilters, pageSize: newSize, page: 1 });
                  }}
                  className="h-6 rounded border border-gray-300 bg-white px-1.5 text-[11px] font-semibold text-gray-700 outline-none hover:border-gray-400 focus:border-[#113EB9] cursor-pointer"
                >
                  <option value={20}>20</option>
                  <option value={25}>25</option>
                  <option value={30}>30</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={loadingVisitas || (visitasFilters.page || 1) <= 1}
                  onClick={() => {
                    const newPage = Math.max(1, (visitasFilters.page || 1) - 1);
                    setVisitasFilters((prev) => ({ ...prev, page: newPage }));
                    fetchVisitas({ ...visitasFilters, page: newPage });
                  }}
                  className="rounded-md border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition"
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
                  className="rounded-md border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition"
                >
                  Siguiente
                </button>
              </div>
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
          <div className="shrink-0 border-b border-gray-200 px-4 py-2.5 bg-white space-y-2">
            <div className="flex flex-wrap items-end gap-2">
              {/* Vehículo */}
              <div className="flex-1 min-w-[125px]">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
                  Vehículo
                </label>
                <div className="relative">
                  <select
                    value={resumenFilters.deviceID || ''}
                    onChange={(e) =>
                      setResumenFilters((prev) => ({ ...prev, deviceID: e.target.value }))
                    }
                    className="w-full h-8 rounded-lg border border-gray-300 bg-white px-2.5 pr-7 text-[11.5px] font-medium text-gray-800 outline-none hover:border-gray-400 focus:border-[#113EB9] transition appearance-none cursor-pointer"
                  >
                    <option value="">Todos</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.label || v.id}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={13}
                    className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                </div>
              </div>

              {/* Geocerca */}
              <div className="flex-1 min-w-[125px]">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
                  Geocerca
                </label>
                <div className="relative">
                  <select
                    value={resumenFilters.geofenceID ?? ''}
                    onChange={(e) =>
                      setResumenFilters((prev) => ({
                        ...prev,
                        geofenceID: e.target.value ? Number(e.target.value) : '',
                      }))
                    }
                    className="w-full h-8 rounded-lg border border-gray-300 bg-white px-2.5 pr-7 text-[11.5px] font-medium text-gray-800 outline-none hover:border-gray-400 focus:border-[#113EB9] transition appearance-none cursor-pointer"
                  >
                    <option value="">Todas</option>
                    {geofences.map((g) => {
                      const geoIdVal =
                        g.geofenceID && g.geofenceID > 0 ? g.geofenceID : g.numericId || '';
                      return (
                        <option key={g.id} value={geoIdVal}>
                          {g.name}
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown
                    size={13}
                    className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                </div>
              </div>

              {/* Fecha Desde con Hora */}
              <div className="w-[170px] sm:w-[175px]">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
                  Desde
                </label>
                <input
                  type="datetime-local"
                  required
                  value={resumenFilters.fechaDesde}
                  onChange={(e) =>
                    setResumenFilters((prev) => ({ ...prev, fechaDesde: e.target.value }))
                  }
                  className="w-full h-8 rounded-lg border border-gray-300 bg-white px-2 text-[11px] font-medium text-gray-800 outline-none hover:border-gray-400 focus:border-[#113EB9] transition"
                />
              </div>

              {/* Fecha Hasta con Hora */}
              <div className="w-[170px] sm:w-[175px]">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
                  Hasta
                </label>
                <input
                  type="datetime-local"
                  required
                  value={resumenFilters.fechaHasta}
                  onChange={(e) =>
                    setResumenFilters((prev) => ({ ...prev, fechaHasta: e.target.value }))
                  }
                  className="w-full h-8 rounded-lg border border-gray-300 bg-white px-2 text-[11px] font-medium text-gray-800 outline-none hover:border-gray-400 focus:border-[#113EB9] transition"
                />
              </div>
            </div>

            {/* Fila 2: Botones Buscar y Exportar juntos en la MISMA fila */}
            <div className="flex items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => fetchResumen()}
                disabled={loadingResumen}
                className="h-8 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#113EB9] px-3.5 text-[11.5px] font-bold text-white shadow-2xs hover:bg-[#0e339b] active:scale-95 transition disabled:opacity-50"
              >
                <Search size={13} className="stroke-[2.5]" />
                <span>{loadingResumen ? '...' : 'Buscar'}</span>
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setExportResumenMenuOpen(!exportResumenMenuOpen)}
                  disabled={loadingResumen || resumenList.length === 0 || exporting !== null}
                  className="h-8 inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-[11.5px] font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 transition disabled:opacity-50"
                >
                  <Download size={13} className="text-gray-500" />
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
            </div>
          </div>

          {/* KPI Cards Resumen (diseño compacto, sin desborde de texto) */}
          <div className="px-5 pt-3 pb-2.5">
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
              <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
                {/* 1. VISITAS */}
                <div className="px-4 py-2 sm:py-2.5">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Visitas
                  </span>
                  <div className="mt-0.5 text-[18px] sm:text-[19px] font-extrabold text-slate-900 tabular-nums leading-tight">
                    {totalVisitasGlobal.toLocaleString('en-US')}
                  </div>
                </div>

                {/* 2. PERMANENCIA TOTAL */}
                <div className="px-4 py-2 sm:py-2.5">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Permanencia Total
                  </span>
                  <div className="mt-0.5 leading-tight">
                    {renderKpiDuration(totalMinutosGlobal)}
                  </div>
                </div>

                {/* 3. PROMEDIO POR VISITA */}
                <div className="px-4 py-2 sm:py-2.5">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Promedio por Visita
                  </span>
                  <div className="mt-0.5 leading-tight">
                    {renderKpiDuration(
                      totalVisitasGlobal > 0 ? totalMinutosGlobal / totalVisitasGlobal : 0,
                    )}
                  </div>
                </div>

                {/* 4. VEHÍCULOS */}
                <div className="px-4 py-2 sm:py-2.5">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Vehículos
                  </span>
                  <div className="mt-0.5 text-[18px] sm:text-[19px] font-extrabold text-slate-900 tabular-nums leading-tight">
                    {totalVehiculosGlobal}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabla Resumen con scroll vertical personalizado y encabezado/pie sticky */}
          <div className="flex-1 min-h-0 px-5 pb-4 flex flex-col">
            <div className="flex-1 min-h-0 rounded-xl border border-gray-200 bg-white shadow-xs overflow-hidden flex flex-col">
              <div
                className={`flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar-reportes [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-thumb]:rounded-full ${
                  selectedVisitId !== null ? 'pointer-events-none' : ''
                }`}
              >
                <table className="w-full border-collapse text-left text-[12.5px]">
                  <thead className="sticky top-0 z-10 border-b border-gray-200 bg-white text-[10.5px] font-bold uppercase tracking-wider text-slate-500 shadow-2xs">
                    <tr>
                      <th
                        onClick={() => handleSortResumen('vehiculo')}
                        className={`py-2.5 px-4 text-left cursor-pointer transition select-none ${
                          resumenSortKey === 'vehiculo' ? 'text-[#113EB9]' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <div className="inline-flex items-center gap-1">
                          <span>Vehículo</span>
                          {resumenSortKey === 'vehiculo' && (
                            resumenSortAsc ? <ChevronUp size={12} className="text-[#113EB9]" /> : <ChevronDown size={12} className="text-[#113EB9]" />
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSortResumen('geocerca')}
                        className={`py-2.5 px-4 text-left cursor-pointer transition select-none ${
                          resumenSortKey === 'geocerca' ? 'text-[#113EB9]' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <div className="inline-flex items-center gap-1">
                          <span>Geocerca</span>
                          {resumenSortKey === 'geocerca' && (
                            resumenSortAsc ? <ChevronUp size={12} className="text-[#113EB9]" /> : <ChevronDown size={12} className="text-[#113EB9]" />
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSortResumen('visitas')}
                        className={`py-2.5 px-4 text-right cursor-pointer transition select-none ${
                          resumenSortKey === 'visitas' ? 'text-[#113EB9]' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <div className="inline-flex items-center justify-end gap-1">
                          <span>Visitas</span>
                          {resumenSortKey === 'visitas' && (
                            resumenSortAsc ? <ChevronUp size={12} className="text-[#113EB9]" /> : <ChevronDown size={12} className="text-[#113EB9]" />
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSortResumen('tiempo')}
                        className={`py-2.5 px-4 text-right cursor-pointer transition select-none ${
                          resumenSortKey === 'tiempo' ? 'text-[#113EB9]' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <div className="inline-flex items-center justify-end gap-1">
                          <span>Tiempo Total</span>
                          {resumenSortKey === 'tiempo' && (
                            resumenSortAsc ? <ChevronUp size={12} className="text-[#113EB9]" /> : <ChevronDown size={12} className="text-[#113EB9]" />
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSortResumen('promedio')}
                        className={`py-2.5 px-4 text-right cursor-pointer transition select-none ${
                          resumenSortKey === 'promedio' ? 'text-[#113EB9]' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <div className="inline-flex items-center justify-end gap-1">
                          <span>Promedio</span>
                          {resumenSortKey === 'promedio' && (
                            resumenSortAsc ? <ChevronUp size={12} className="text-[#113EB9]" /> : <ChevronDown size={12} className="text-[#113EB9]" />
                          )}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {loadingResumen ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-gray-400 text-xs">
                          Calculando métricas...
                        </td>
                      </tr>
                    ) : sortedResumenList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-gray-400 text-xs">
                          No hay datos de resumen para el rango seleccionado
                        </td>
                      </tr>
                    ) : (
                      sortedResumenList.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-4 font-bold text-[12.5px] text-[#113EB9]">
                            {item.deviceID || 'Todos'}
                          </td>
                          <td className="py-2.5 px-4 font-medium text-[12.5px] text-slate-700">
                            {item.geofenceName || `#${item.geofenceID}`}
                          </td>
                          <td className="py-2.5 px-4 text-right font-bold text-[12.5px] text-slate-900 tabular-nums">
                            {item.totalVisitas}
                          </td>
                          <td className="py-2.5 px-4 text-right font-bold text-[12.5px] text-slate-900 tabular-nums">
                            {formatDurationSummary(item.minutosTotales)}
                          </td>
                          <td className="py-2.5 px-4 text-right font-normal text-[12.5px] text-slate-600 tabular-nums">
                            {formatDurationSummary(
                              item.minutosPromedioPorVisita !== undefined
                                ? item.minutosPromedioPorVisita
                                : item.totalVisitas
                                ? (Number(item.minutosTotales) || 0) / Number(item.totalVisitas)
                                : 0,
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {!loadingResumen && sortedResumenList.length > 0 && (
                    <tfoot className="sticky bottom-0 z-10 border-t-2 border-slate-200 bg-white shadow-2xs">
                      <tr>
                        <td className="py-2.5 px-4 text-left text-[11px] font-bold text-slate-500 tracking-wider uppercase">
                          TOTAL · {totalVehiculosGlobal} {totalVehiculosGlobal === 1 ? 'VEHÍCULO' : 'VEHÍCULOS'}
                        </td>
                        <td className="py-2.5 px-4"></td>
                        <td className="py-2.5 px-4 text-right font-bold text-[12.5px] text-slate-900 tabular-nums">
                          {totalVisitasGlobal.toLocaleString('en-US')}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-[12.5px] text-slate-900 tabular-nums">
                          {formatDurationSummary(totalMinutosGlobal)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-[12.5px] text-slate-900 tabular-nums">
                          {formatDurationSummary(
                            totalVisitasGlobal > 0 ? totalMinutosGlobal / totalVisitasGlobal : 0,
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* DETALLE DE VISITA POPUP OVERLAY (Centrado dentro del panel)  */}
      {/* ============================================================ */}
      {selectedVisitId !== null && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-[0.5px] p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedVisitId(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
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
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 border border-slate-100">
                  <div>
                    <span className="font-semibold text-gray-500 text-[10px] uppercase tracking-wider">
                      Vehículo
                    </span>
                    <p className="font-mono font-bold text-gray-900 text-[13px]">
                      {visitDetail.deviceID}
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-500 text-[10px] uppercase tracking-wider">
                      Geocerca
                    </span>
                    <p className="font-bold text-gray-900 text-[13px]">
                      {visitDetail.geofenceName || `#${visitDetail.geofenceID}`}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 font-medium">Entrada:</span>
                    <span className="font-semibold text-emerald-700">
                      {visitDetail.fechaEntrada
                        ? new Date(visitDetail.fechaEntrada).toLocaleString('es-PE')
                        : '-'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 font-medium">Salida:</span>
                    <span className="font-semibold text-rose-700">
                      {visitDetail.fechaSalida
                        ? new Date(visitDetail.fechaSalida).toLocaleString('es-PE')
                        : 'Dentro de geocerca'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 font-medium">Permanencia:</span>
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
                      <span className="text-gray-600 font-medium">Coordenadas Entrada:</span>
                      <span className="font-mono text-gray-800 font-medium">
                        {visitDetail.latitudEntrada.toFixed(5)}, {visitDetail.longitudEntrada.toFixed(5)}
                      </span>
                    </div>
                  )}

                  {visitDetail.latitudSalida != null && visitDetail.longitudSalida != null && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-600 font-medium">Coordenadas Salida:</span>
                      <span className="font-mono text-gray-800 font-medium">
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
                          onClose();
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
    </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
