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
import NavegadorGruposRutas, { GrupoItemInfo, RutaItemInfo } from './NavegadorGruposRutas';
import { getIsoToday, isoToDdMmYyyy } from '../utils';

const ReportesView: React.FC = () => {
  const api = useServiciosRutasApi();

  // Filtros: rango de fechas, estado del servicio, unidad, estado de puntualidad y búsqueda
  const [desdeIso, setDesdeIso] = useState<string>(getIsoToday());
  const [hastaIso, setHastaIso] = useState<string>(getIsoToday());
  const [estadoServicio, setEstadoServicio] = useState<FiltroEstadoServicio>('TODOS');
  const [unidad, setUnidad] = useState<string>('');
  const [estadoFiltro, setEstadoFiltro] = useState<'TODOS' | EstadoPuntualidad>('TODOS');
  const [busqueda, setBusqueda] = useState<string>('');

  // Filtro jerárquico por Grupo y por Ruta
  const [grupoFiltro, setGrupoFiltro] = useState<string | 'TODOS'>('TODOS');
  const [rutaFiltro, setRutaFiltro] = useState<number | 'TODOS'>('TODOS');

  // Datos
  const [toleranciaMin, setToleranciaMin] = useState<number>(5);
  // Todo lo que trajo el API para el rango de fechas. Estado, unidad y puntualidad filtran sobre esto.
  const [cargados, setCargados] = useState<ReporteServicio[]>([]);
  // Rutas activas de la cuenta con su grupo.
  const [rutasCuenta, setRutasCuenta] = useState<{ id: number; codigo: string; nombre: string; grupo: string }[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [exportandoExcel, setExportandoExcel] = useState<boolean>(false);
  const [exportandoPdf, setExportandoPdf] = useState<boolean>(false);

  const cambiarRango = (desde: string, hasta: string) => {
    setDesdeIso(desde);
    setHastaIso(hasta < desde ? desde : hasta);
  };

  const handleLimpiarFiltros = useCallback(() => {
    setEstadoServicio('TODOS');
    setUnidad('');
    setEstadoFiltro('TODOS');
    setBusqueda('');
    setGrupoFiltro('TODOS');
    setRutaFiltro('TODOS');
  }, []);

  useEffect(() => {
    if (!api.listo) return;
    api
      .getRutas(false)
      .then((lista) =>
        setRutasCuenta(
          lista.map((r) => ({
            id: r.id,
            codigo: r.codigo,
            nombre: r.nombre,
            grupo: r.grupo?.trim() ? r.grupo.trim() : 'Sin grupo',
          })),
        ),
      )
      .catch(() => undefined);
  }, [api]);

  // El API se consulta al entrar, al cambiar el rango de fechas o con el botón de actualizar.
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

  // Unidades presentes en lo cargado (para el filtro de vehículos).
  const unidades = useMemo(
    () => Array.from(new Set(cargados.map((s) => s.deviceID))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [cargados],
  );

  // Si al cambiar de rango la unidad elegida ya no aparece, se quita el filtro.
  useEffect(() => {
    if (unidad && !cargando && !unidades.includes(unidad)) setUnidad('');
  }, [unidad, unidades, cargando]);

  // Estado del servicio y unidad filtran sobre lo cargado.
  const filtrados = useMemo(
    () =>
      cargados.filter(
        (s) => (estadoServicio === 'TODOS' || s.estadoServicio === estadoServicio) && (!unidad || s.deviceID === unidad),
      ),
    [cargados, estadoServicio, unidad],
  );

  // Construcción de la jerarquía de Grupos y sus Rutas
  const gruposInfo = useMemo<GrupoItemInfo[]>(() => {
    const mapaRutas = new Map<number, { codigo: string; nombre: string; grupo: string }>();
    rutasCuenta.forEach((r) => {
      mapaRutas.set(r.id, { codigo: r.codigo, nombre: r.nombre, grupo: r.grupo });
    });
    cargados.forEach((s) => {
      if (!mapaRutas.has(s.rutaId)) {
        mapaRutas.set(s.rutaId, { codigo: s.rutaCodigo, nombre: s.rutaNombre, grupo: s.grupo || 'Sin grupo' });
      }
    });

    const cuentaServicios = new Map<number, number>();
    filtrados.forEach((s) => {
      cuentaServicios.set(s.rutaId, (cuentaServicios.get(s.rutaId) ?? 0) + 1);
    });

    const mapaGrupos = new Map<string, RutaItemInfo[]>();
    mapaRutas.forEach((info, rutaId) => {
      const g = info.grupo || 'Sin grupo';
      if (!mapaGrupos.has(g)) mapaGrupos.set(g, []);
      mapaGrupos.get(g)!.push({
        id: rutaId,
        codigo: info.codigo,
        nombre: info.nombre,
        grupo: g,
        cantidadServicios: cuentaServicios.get(rutaId) ?? 0,
      });
    });

    return Array.from(mapaGrupos.entries())
      .map(([nombre, rutas]) => {
        rutas.sort((a, b) => {
          if (a.cantidadServicios > 0 && b.cantidadServicios === 0) return -1;
          if (a.cantidadServicios === 0 && b.cantidadServicios > 0) return 1;
          return a.codigo.localeCompare(b.codigo, undefined, { numeric: true });
        });
        const cantidadServicios = rutas.reduce((acc, r) => acc + r.cantidadServicios, 0);
        return {
          nombre,
          cantidadServicios,
          totalRutas: rutas.length,
          rutas,
        };
      })
      .sort((a, b) => {
        if (a.cantidadServicios > 0 && b.cantidadServicios === 0) return -1;
        if (a.cantidadServicios === 0 && b.cantidadServicios > 0) return 1;
        return a.nombre.localeCompare(b.nombre, undefined, { numeric: true });
      });
  }, [rutasCuenta, cargados, filtrados]);

  // Si el grupo seleccionado ya no existe, volver a TODOS
  useEffect(() => {
    if (grupoFiltro !== 'TODOS' && !gruposInfo.some((g) => g.nombre === grupoFiltro)) {
      setGrupoFiltro('TODOS');
    }
  }, [grupoFiltro, gruposInfo]);

  // Servicios filtrados por Grupo y por Ruta
  const servicios = useMemo(() => {
    return filtrados.filter((s) => {
      if (grupoFiltro !== 'TODOS' && s.grupo !== grupoFiltro) return false;
      if (rutaFiltro !== 'TODOS' && s.rutaId !== rutaFiltro) return false;
      return true;
    });
  }, [filtrados, grupoFiltro, rutaFiltro]);

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
        ? 'Todos los estados'
        : `Servicios ${estadoServicio.toLowerCase().replace('_', ' ')}`,
      unidad ? `Unidad ${unidad}` : 'Todas las unidades',
    ];
    if (grupoFiltro !== 'TODOS') {
      partes.unshift(`Grupo: ${grupoFiltro}`);
    }
    if (rutaFiltro !== 'TODOS') {
      const r = rutasCuenta.find((x) => x.id === rutaFiltro);
      if (r) partes.unshift(`Ruta: ${r.codigo} - ${r.nombre}`);
    }
    return partes.join(', ');
  }, [estadoServicio, unidad, grupoFiltro, rutaFiltro, rutasCuenta]);

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
    // h-screen overflow-y-auto asegura que el scroll vertical funcione sin restricciones
    <div className="flex h-screen w-full flex-col overflow-y-auto bg-slate-100/80">
      <Toaster position="top-right" richColors />

      {/* Encabezado (#113EB9 + Logo corporativo) */}
      <header className="sticky top-0 z-50 flex-shrink-0 bg-[#113EB9] shadow-sm">
        <div className="flex h-12 items-stretch justify-between">
          {/* Lado izquierdo: Logo naranja, separador y títulos */}
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

      {/* 1. Navegador de Pestañas por GRUPOS y RUTAS (Igual que en Servicios Turismo) */}
      <NavegadorGruposRutas
        grupos={gruposInfo}
        totalServicios={filtrados.length}
        grupoSeleccionado={grupoFiltro}
        onSeleccionarGrupo={setGrupoFiltro}
        rutaSeleccionada={rutaFiltro}
        onSeleccionarRuta={setRutaFiltro}
      />

      {/* 2. Barra de Filtros, Búsqueda y Botones de Exportación (Compacta y a todo el ancho) */}
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
        onLimpiarFiltros={handleLimpiarFiltros}
      />

      {/* 3. Tarjetas de Resumen y KPIs (Tira compacta a todo el ancho) */}
      <ResumenKpis kpis={kpis} toleranciaMin={toleranciaMin} />

      {/* 4. Bloques de servicios organizados por Grupo y por Ruta con detalle de paradas */}
      <div className="w-full flex-1 pb-24">
        {cargando ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <RotateCw className="h-6 w-6 animate-spin text-[#113EB9]" />
            <p className="mt-2 text-[12.5px] font-bold text-slate-700">Cargando servicios y paradas…</p>
            <p className="text-[11px] text-slate-400">Procesando tiempos de llegada, estancia y puntualidad</p>
          </div>
        ) : (
          <TablaReporteParadas
            servicios={servicios}
            estadoFiltro={estadoFiltro}
            busqueda={busqueda}
            onRestablecerFiltros={handleLimpiarFiltros}
          />
        )}
      </div>
    </div>
  );
};

export default ReportesView;
