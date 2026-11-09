'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast, Toaster } from 'sonner';
import '@/app/styles/sonner.css';
import {
  ArrowLeft,
  FileBarChart2,
  RefreshCw,
  Route as RouteIcon,
} from 'lucide-react';
import { useServiciosRutasApi } from '../api';
import { EstadoPuntualidad, ReporteServicio } from './types';
import { calcularKpis, generarReporteServicios } from './mockData';
import { exportarExcelReporte, exportarPdfReporte } from './exportUtils';
import FiltrosReporte from './FiltrosReporte';
import ResumenKpis from './ResumenKpis';
import TablaReporteParadas from './TablaReporteParadas';
import { getIsoToday } from '../utils';

const ReportesView: React.FC = () => {
  const api = useServiciosRutasApi();

  // Estados de filtrado
  const [fechaIso, setFechaIso] = useState<string>(getIsoToday());
  const [rutaId, setRutaId] = useState<number | 'TODAS'>('TODAS');
  const [estadoFiltro, setEstadoFiltro] = useState<'TODOS' | EstadoPuntualidad>('TODOS');
  const [busqueda, setBusqueda] = useState<string>('');

  // Estados de datos
  const [rutasOpciones, setRutasOpciones] = useState<{ id: number; codigo: string; nombre: string }[]>([]);
  const [servicios, setServicios] = useState<ReporteServicio[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [exportandoExcel, setExportandoExcel] = useState<boolean>(false);
  const [exportandoPdf, setExportandoPdf] = useState<boolean>(false);

  // Carga de opciones de rutas reales del backend si está disponible
  useEffect(() => {
    if (!api.listo) return;
    api
      .getRutas(false)
      .then((lista) => {
        if (lista && lista.length > 0) {
          setRutasOpciones(
            lista.map((r) => ({
              id: r.id,
              codigo: r.codigo,
              nombre: r.nombre,
            })),
          );
        }
      })
      .catch(() => undefined);
  }, [api]);

  // Si no hay rutas cargadas desde la API, usamos las rutas base por defecto
  const opcionesFinales = useMemo(() => {
    if (rutasOpciones.length > 0) return rutasOpciones;
    return [
      { id: 3, codigo: 'RT-001', nombre: 'Ruta 1' },
      { id: 4, codigo: 'RT-002', nombre: 'Ruta 2' },
      { id: 5, codigo: 'RT-003', nombre: 'Ruta 3' },
      { id: 6, codigo: 'RT-004', nombre: 'Ruta 4' },
      { id: 7, codigo: 'RT-005', nombre: 'Ruta 5' },
    ];
  }, [rutasOpciones]);

  // Cargar datos del reporte según fecha y ruta seleccionada
  const cargarDatos = useCallback(() => {
    setCargando(true);
    const timer = setTimeout(() => {
      const data = generarReporteServicios(fechaIso, rutaId);
      setServicios(data);
      setCargando(false);
    }, 150);
    return () => clearTimeout(timer);
  }, [fechaIso, rutaId]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Métricas y KPIs
  const kpis = useMemo(() => calcularKpis(servicios), [servicios]);

  // Formato legible de fecha
  const fechaTexto = useMemo(() => {
    const [yyyy, mm, dd] = fechaIso.split('-');
    return `${dd}/${mm}/${yyyy}`;
  }, [fechaIso]);

  const rutaFiltroTexto = useMemo(() => {
    if (rutaId === 'TODAS') return 'Todas las rutas';
    const r = opcionesFinales.find((opt) => opt.id === rutaId);
    return r ? `${r.codigo} - ${r.nombre}` : `Ruta #${rutaId}`;
  }, [rutaId, opcionesFinales]);

  // Acciones de Exportación
  const handleExportarExcel = async () => {
    if (servicios.length === 0) {
      toast.warning('No hay datos disponibles para exportar');
      return;
    }
    setExportandoExcel(true);
    try {
      await exportarExcelReporte(servicios, fechaTexto, rutaFiltroTexto, kpis);
      toast.success('Reporte Excel generado correctamente');
    } catch {
      toast.error('Error al generar el archivo Excel');
    } finally {
      setExportandoExcel(false);
    }
  };

  const handleExportarPdf = async () => {
    if (servicios.length === 0) {
      toast.warning('No hay datos disponibles para exportar');
      return;
    }
    setExportandoPdf(true);
    try {
      await exportarPdfReporte(servicios, fechaTexto, rutaFiltroTexto, kpis);
      toast.success('Reporte PDF descargado correctamente');
    } catch {
      toast.error('Error al generar el archivo PDF');
    } finally {
      setExportandoPdf(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-100">
      <Toaster position="top-right" richColors />

      {/* Encabezado Principal idéntico a Servicios Rutas (#1E40AF + #0B1F4D) */}
      <header className="sticky top-0 z-20 flex h-14 shrink-0 items-stretch bg-[#1E40AF] text-white shadow-sm">
        <div className="flex items-center gap-2.5 bg-[#0B1F4D] px-4">
          <RouteIcon className="h-5 w-5 text-amber-400" />
          <div className="leading-tight">
            <div className="text-[9.5px] font-semibold tracking-[0.18em] text-blue-200">TRACKVEL SYSTEM</div>
            <div className="text-[13px] font-bold tracking-wide">SERVICIOS RUTAS</div>
          </div>
        </div>

        <div className="ml-4 hidden flex-col justify-center border-l-2 border-white/25 pl-3 leading-tight md:flex">
          <div className="text-[9.5px] font-semibold tracking-[0.18em] text-blue-200">REPORTE DETALLADO</div>
          <div className="text-[13px] font-semibold">Cumplimiento de Rutas y Paradas</div>
        </div>

        <div className="ml-auto flex items-center gap-2 px-3">
          <Link
            href="/trackvelnew/serviciosrutas"
            className="flex h-8 items-center gap-1.5 rounded-md border border-white/40 px-3 text-[12px] font-semibold hover:bg-white/10"
            title="Volver a la pantalla de Monitoreo en Mapa"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Monitoreo en Mapa</span>
          </Link>

          <button
            type="button"
            onClick={cargarDatos}
            className="flex h-8 items-center gap-1.5 rounded-md bg-white px-3 text-[12px] font-semibold text-[#1E40AF] shadow-sm hover:bg-blue-50"
            title="Actualizar datos del reporte"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${cargando ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 space-y-4 p-4 lg:p-6">
        {/* Tarjetas de Métricas y KPIs con colores vivos */}
        <ResumenKpis kpis={kpis} />

        {/* Barra de Filtros, Búsqueda y Botones Excel / PDF con colores propios */}
        <FiltrosReporte
          fechaIso={fechaIso}
          onFechaChange={setFechaIso}
          rutaId={rutaId}
          onRutaChange={setRutaId}
          rutasOpciones={opcionesFinales}
          estadoFiltro={estadoFiltro}
          onEstadoFiltroChange={setEstadoFiltro}
          busqueda={busqueda}
          onBusquedaChange={setBusqueda}
          onExportarExcel={handleExportarExcel}
          onExportarPdf={handleExportarPdf}
          exportandoExcel={exportandoExcel}
          exportandoPdf={exportandoPdf}
        />

        {/* Tabla Detallada de Paradas con color distinto por ruta */}
        {cargando ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-12 text-center shadow-xs">
            <RefreshCw className="h-7 w-7 animate-spin text-[#1E40AF]" />
            <p className="mt-2 text-[13px] font-semibold text-slate-700">Calculando reporte de paradas…</p>
            <p className="text-[11.5px] text-slate-400">Procesando tiempos de llegada, estancia y puntualidad</p>
          </div>
        ) : (
          <TablaReporteParadas
            servicios={servicios}
            estadoFiltro={estadoFiltro}
            busqueda={busqueda}
          />
        )}
      </main>
    </div>
  );
};

export default ReportesView;
