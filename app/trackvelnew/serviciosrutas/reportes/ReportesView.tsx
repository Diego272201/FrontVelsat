'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { toast, Toaster } from 'sonner';
import '@/app/styles/sonner.css';
import {
  Columns,
  RotateCw,
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
    <div className="flex min-h-screen w-full flex-col bg-slate-100/80">
      <Toaster position="top-right" richColors />

      {/* Encabezado idéntico a las páginas corporativas de Trackvel (#113EB9 + Logo naranja) */}
      <header className="sticky top-0 z-50 flex-shrink-0 bg-[#113EB9] shadow-sm">
        <div className="flex h-12 items-stretch justify-between">
          {/* Lado izquierdo: Logo naranja, separador y subtítulo/título */}
          <div className="flex items-center gap-3">
            <div className="flex h-full items-center bg-gradient-to-r from-orange-500 to-red-500 px-4">
              <Image
                src="/LogoWeb.png"
                alt="Velsat"
                width={44}
                height={44}
                className="h-9 w-9 object-contain"
                priority
              />
            </div>

            <div className="h-7 w-[2px] rounded-full bg-white/40 self-center" />

            <div className="flex flex-col justify-center">
              <span className="text-[9.5px] font-bold uppercase tracking-wider text-blue-200 leading-none mb-0.5">
                SERVICIOS RUTAS / REPORTES
              </span>
              <h1 className="text-[14px] font-bold leading-none tracking-[0.01em] text-white flex items-center gap-1.5 uppercase">
                <span>CUMPLIMIENTO DE RUTAS Y PARADAS</span>
              </h1>
            </div>
          </div>

          {/* Lado derecho: Botón Monitoreo en mapa y Refrescar */}
          <div className="flex items-center gap-2 pr-4">
            <Link
              href="/trackvelnew/serviciosrutas"
              className="flex items-center gap-1.5 rounded-md bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1.5 text-[12px] font-semibold text-white transition-colors"
              title="Volver a la vista de Monitoreo en mapa"
            >
              <Columns className="h-3.5 w-3.5" />
              <span>Monitoreo en mapa</span>
            </Link>

            <button
              type="button"
              onClick={cargarDatos}
              className="rounded-md bg-white/10 hover:bg-white/20 border border-white/20 p-2 text-white transition-colors"
              title="Actualizar datos del reporte"
            >
              <RotateCw className={`h-3.5 w-3.5 ${cargando ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 space-y-3.5 p-4 lg:p-5">
        {/* 1. Barra de Filtros, Búsqueda y Botones de Exportación */}
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

        {/* 2. Tarjetas de Resumen y KPIs (Una sola barra blanca subdividida) */}
        <ResumenKpis kpis={kpis} />

        {/* 3. Acordeón / Tablas Detalladas por Ruta */}
        {cargando ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-12 text-center shadow-xs">
            <RotateCw className="h-7 w-7 animate-spin text-[#113EB9]" />
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
