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
import { mensajeError, useServiciosRutasApi } from '../api';
import { EstadoPuntualidad, ReporteServicio } from './types';
import { aReporteServicios, calcularKpis } from './construirReporte';
import { exportarExcelReporte, exportarPdfReporte } from './exportUtils';
import FiltrosReporte, { FiltroEstadoServicio } from './FiltrosReporte';
import ResumenKpis from './ResumenKpis';
import TablaReporteParadas from './TablaReporteParadas';
import { getIsoToday, isoToDdMmYyyy } from '../utils';

const ReportesView: React.FC = () => {
  const api = useServiciosRutasApi();

  // Filtros: los reportes son por servicio (rango de fechas, estado del servicio y unidad).
  const [desdeIso, setDesdeIso] = useState<string>(getIsoToday());
  const [hastaIso, setHastaIso] = useState<string>(getIsoToday());
  const [estadoServicio, setEstadoServicio] = useState<FiltroEstadoServicio>('TODOS');
  const [unidad, setUnidad] = useState<string>('');
  const [estadoFiltro, setEstadoFiltro] = useState<'TODOS' | EstadoPuntualidad>('TODOS');
  const [busqueda, setBusqueda] = useState<string>('');

  // Datos
  const [toleranciaMin, setToleranciaMin] = useState<number>(5);
  // Todo lo que trajo el API para el rango de fechas. Estado, unidad y puntualidad filtran sobre esto.
  const [cargados, setCargados] = useState<ReporteServicio[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [exportandoExcel, setExportandoExcel] = useState<boolean>(false);
  const [exportandoPdf, setExportandoPdf] = useState<boolean>(false);

  const cambiarRango = (desde: string, hasta: string) => {
    setDesdeIso(desde);
    setHastaIso(hasta < desde ? desde : hasta);
  };

  // El API se consulta solo al entrar, al cambiar el rango de fechas o con el botón de actualizar:
  // una llamada trae los servicios del rango con sus paraderos. Los demás filtros se aplican en pantalla.
  const cargarDatos = useCallback(async () => {
    if (!api.listo) return;
    setCargando(true);
    try {
      const reporte = await api.getReporteServicios(desdeIso, hastaIso);
      setCargados(aReporteServicios(reporte));
      setToleranciaMin(reporte.toleranciaMin);
    } catch (error) {
      setCargados([]);
      toast.error(mensajeError(error, 'No se pudo cargar el reporte'));
    } finally {
      setCargando(false);
    }
  }, [api, desdeIso, hastaIso]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Unidades presentes en lo cargado (para el filtro).
  const unidades = useMemo(
    () => Array.from(new Set(cargados.map((s) => s.deviceID))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [cargados],
  );

  // Si al cambiar de rango la unidad elegida ya no aparece, se quita el filtro.
  useEffect(() => {
    if (unidad && !cargando && !unidades.includes(unidad)) setUnidad('');
  }, [unidad, unidades, cargando]);

  const servicios = useMemo(
    () =>
      cargados.filter(
        (s) => (estadoServicio === 'TODOS' || s.estadoServicio === estadoServicio) && (!unidad || s.deviceID === unidad),
      ),
    [cargados, estadoServicio, unidad],
  );

  const kpis = useMemo(() => calcularKpis(servicios), [servicios]);

  const fechaTexto = useMemo(
    () =>
      desdeIso === hastaIso
        ? isoToDdMmYyyy(desdeIso)
        : `${isoToDdMmYyyy(desdeIso)} al ${isoToDdMmYyyy(hastaIso)}`,
    [desdeIso, hastaIso],
  );

  const filtroTexto = useMemo(() => {
    const partes = [
      estadoServicio === 'TODOS'
        ? 'Todos los servicios'
        : `Servicios ${estadoServicio.toLowerCase().replace('_', ' ')}`,
      unidad ? `Unidad ${unidad}` : 'Todas las unidades',
    ];
    return partes.join(', ');
  }, [estadoServicio, unidad]);

  // Acciones de Exportación
  const handleExportarExcel = async () => {
    if (servicios.length === 0) {
      toast.warning('No hay datos disponibles para exportar');
      return;
    }
    setExportandoExcel(true);
    try {
      await exportarExcelReporte(servicios, fechaTexto, filtroTexto, kpis);
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
      await exportarPdfReporte(servicios, fechaTexto, filtroTexto, kpis);
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
          desdeIso={desdeIso}
          hastaIso={hastaIso}
          onRangoChange={cambiarRango}
          estadoServicio={estadoServicio}
          onEstadoServicioChange={setEstadoServicio}
          unidad={unidad}
          onUnidadChange={setUnidad}
          unidades={unidades}
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
        <ResumenKpis kpis={kpis} toleranciaMin={toleranciaMin} />

        {/* 3. Un bloque por servicio, con el detalle de sus paradas */}
        {cargando ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-12 text-center shadow-xs">
            <RotateCw className="h-7 w-7 animate-spin text-[#113EB9]" />
            <p className="mt-2 text-[13px] font-semibold text-slate-700">Cargando servicios y paradas…</p>
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
