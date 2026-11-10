'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Spinner } from '@nextui-org/react';
import { toast, Toaster } from 'sonner';
import '@/app/styles/sonner.css';
import ExcelJS from 'exceljs';
import { mensajeError, useServiciosRutasApi } from '../api';
import { Ruta } from '../types';
import EncabezadoRutas from './EncabezadoRutas';
import ModalRuta, { RutaForm, rutaFormAGuardar } from './ModalRuta';
import TablaRutas from './TablaRutas';

const BRAND_BLUE = 'FF113EB9';
const BRAND_BLUE_DARK = 'FF0C2D78';
const HEADER_ROW_INDEX = 4;

const EXPORT_COLUMNS: { header: string; key: string; width: number }[] = [
  { header: '#', key: 'num', width: 6 },
  { header: 'Código', key: 'codigo', width: 16 },
  { header: 'Nombre', key: 'nombre', width: 30 },
  { header: 'Grupo', key: 'grupo', width: 18 },
  { header: 'Sentido', key: 'sentido', width: 14 },
  { header: 'Ruta Pareja', key: 'rutaParejaCodigo', width: 16 },
  { header: 'Paraderos', key: 'cantidadParaderos', width: 12 },
  { header: 'Duración (min)', key: 'duracionMin', width: 16 },
  { header: 'Distancia (km)', key: 'distanciaKm', width: 16 },
  { header: 'Estado', key: 'estado', width: 14 },
];

const exportarExcel = async (data: Ruta[], filename: string) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Velsat';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Rutas', {
    views: [{ state: 'frozen', ySplit: HEADER_ROW_INDEX }],
  });

  sheet.columns = EXPORT_COLUMNS.map((c) => ({ key: c.key, width: c.width }));
  const lastCol = EXPORT_COLUMNS.length;

  sheet.mergeCells(1, 1, 1, lastCol);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = 'VELSAT — Reporte de Rutas';
  titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_BLUE } };
  sheet.getRow(1).height = 30;

  sheet.mergeCells(2, 1, 2, lastCol);
  const subtitleCell = sheet.getCell(2, 1);
  subtitleCell.value = `Generado el ${new Date().toLocaleString('es-PE')} · ${data.length} ruta(s)`;
  subtitleCell.font = { italic: true, size: 9, color: { argb: 'FF6B7280' } };
  sheet.getRow(2).height = 18;

  const headerRow = sheet.getRow(HEADER_ROW_INDEX);
  headerRow.values = EXPORT_COLUMNS.map((c) => c.header);
  headerRow.height = 22;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_BLUE } };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
    cell.border = {
      top: { style: 'thin', color: { argb: BRAND_BLUE_DARK } },
      bottom: { style: 'thin', color: { argb: BRAND_BLUE_DARK } },
    };
  });

  data.forEach((r, i) => {
    const row = sheet.getRow(HEADER_ROW_INDEX + 1 + i);
    row.values = [
      i + 1,
      r.codigo || '—',
      r.nombre || '—',
      r.grupo || '—',
      r.sentido === 'REGRESO' ? 'Regreso' : 'Ida',
      r.rutaParejaCodigo || '—',
      r.cantidadParaderos ?? 0,
      r.duracionMin ?? 0,
      r.distanciaKm != null ? `${r.distanciaKm} km` : '—',
      r.activo ? 'Activa' : 'Inactiva',
    ];
    row.eachCell((cell, colNumber) => {
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
      cell.alignment = {
        vertical: 'middle',
        horizontal: colNumber === 1 || colNumber === 7 || colNumber === 8 ? 'center' : 'left',
      };
      if (i % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
      }
    });
  });

  if (data.length > 0) {
    sheet.autoFilter = {
      from: { row: HEADER_ROW_INDEX, column: 1 },
      to: { row: HEADER_ROW_INDEX + data.length, column: lastCol },
    };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

// Administración de rutas y paraderos (api/servicios-rutas: rutas).
const AdministrarRutasPage: React.FC = () => {
  const api = useServiciosRutasApi();
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [grupoFiltro, setGrupoFiltro] = useState<string>('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [rutaEditando, setRutaEditando] = useState<Ruta | null>(null);

  const cargarRutas = useCallback(async () => {
    if (!api.listo) return;
    try {
      setRutas(await api.getRutas(true));
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudieron cargar las rutas'));
    } finally {
      setCargando(false);
    }
  }, [api]);

  useEffect(() => {
    cargarRutas();
  }, [cargarRutas]);

  // Los grupos salen de las rutas existentes, así un grupo nuevo aparece solo.
  const grupos = Array.from(new Set(rutas.map((r) => r.grupo))).sort();

  const texto = busqueda.trim().toLowerCase();
  const rutasVisibles = rutas.filter(
    (r) =>
      (grupoFiltro === 'TODOS' || r.grupo === grupoFiltro) &&
      (texto === '' ||
        r.codigo.toLowerCase().includes(texto) ||
        r.nombre.toLowerCase().includes(texto)),
  );

  const abrirNueva = () => {
    setRutaEditando(null);
    setModalAbierto(true);
  };

  // El listado no trae los paraderos: se pide el detalle de la ruta antes de editar.
  const abrirEdicion = async (ruta: Ruta) => {
    try {
      setRutaEditando(await api.getRuta(ruta.id));
      setModalAbierto(true);
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo cargar la ruta'));
    }
  };

  // No se borran rutas: se activan / desactivan (conservan su historial de servicios).
  const toggleActivo = async (ruta: Ruta) => {
    try {
      await api.setRutaActiva(ruta.id, !ruta.activo);
      setRutas((prev) =>
        prev.map((r) =>
          r.id === ruta.id ? { ...r, activo: !ruta.activo } : r,
        ),
      );
    } catch (error) {
      toast.error(
        mensajeError(error, 'No se pudo cambiar el estado de la ruta'),
      );
    }
  };

  const handleGuardar = async (form: RutaForm) => {
    const datos = rutaFormAGuardar(form);

    setGuardando(true);
    try {
      if (rutaEditando) {
        await api.actualizarRuta(rutaEditando.id, datos);
      } else {
        await api.crearRuta(datos);
      }
      setModalAbierto(false);
      toast.success('Ruta guardada');
      await cargarRutas();
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo guardar la ruta'));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Toaster position="top-right" richColors />

      {/* Header institucional idéntico a Gestión de Conductores */}
      <EncabezadoRutas
        totalRutas={rutas.length}
        nuevaDeshabilitada={!api.listo}
        onNueva={abrirNueva}
        onExportar={() =>
          exportarExcel(
            rutasVisibles,
            `rutas_${new Date().toISOString().slice(0, 10)}.xlsx`,
          ).catch(() => toast.error('Error al generar el Excel'))
        }
        exportandoDeshabilitado={cargando || rutasVisibles.length === 0}
      />

      <div className="p-4">
        {cargando ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Spinner color="primary" size="md" />
            <span className="mt-3 text-[12px] text-gray-500">Cargando rutas...</span>
          </div>
        ) : (
          <div className="flex h-[calc(100vh-80px)] flex-col rounded-lg border border-gray-200 bg-white shadow-sm">
            {/* Tabs de grupos */}
            <div className="flex shrink-0 items-center gap-6 overflow-x-auto border-b border-gray-200 px-4">
              <button
                type="button"
                onClick={() => setGrupoFiltro('TODOS')}
                className={`flex shrink-0 items-center gap-1.5 border-b-2 py-3 text-[12px] font-semibold transition-colors ${
                  grupoFiltro === 'TODOS'
                    ? 'border-[#113EB9] text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Todos los grupos
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    grupoFiltro === 'TODOS' ? 'bg-blue-50 text-[#113EB9]' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {rutas.length}
                </span>
              </button>
              {grupos.map((grupo) => {
                const count = rutas.filter((r) => r.grupo === grupo).length;
                return (
                  <button
                    key={grupo}
                    type="button"
                    onClick={() => setGrupoFiltro(grupo)}
                    className={`flex shrink-0 items-center gap-1.5 border-b-2 py-3 text-[12px] font-semibold transition-colors ${
                      grupoFiltro === grupo
                        ? 'border-[#113EB9] text-gray-900'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {grupo}
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                        grupoFiltro === grupo ? 'bg-blue-50 text-[#113EB9]' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Búsqueda + contador */}
            <div className="flex shrink-0 items-center gap-3 px-4 py-3">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por código o nombre..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  disabled={cargando}
                  className="block w-full rounded-md border border-gray-200 bg-gray-50 py-1.5 pl-9 pr-3 text-[12px] placeholder-gray-400 transition-colors focus:border-[#113EB9] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#113EB9] disabled:opacity-50"
                />
              </div>
              <span className="whitespace-nowrap text-[11px] text-gray-500">
                {rutasVisibles.length} de {rutas.length}
              </span>
            </div>

            {/* Contenido / Tabla */}
            <div className="min-h-0 flex-1 overflow-auto">
              <TablaRutas
                rutas={rutasVisibles}
                cargando={cargando}
                hayRutas={rutas.length > 0}
                onEditar={abrirEdicion}
                onToggleActivo={toggleActivo}
              />
            </div>
          </div>
        )}
      </div>

      <ModalRuta
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        ruta={rutaEditando}
        grupos={grupos}
        rutas={rutas}
        guardando={guardando}
        onGuardar={handleGuardar}
      />
    </div>
  );
};

export default AdministrarRutasPage;
