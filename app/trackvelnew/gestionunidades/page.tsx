'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  FileCheck,
  CheckCircle,
  Ban,
  Car,
  Download,
} from 'lucide-react';

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/app/components/ui/alert-dialog';
import { useUsername } from '@/hooks/useUsername';
import { Spinner } from '@nextui-org/react';
import { Toaster, toast } from 'sonner';
import ExcelJS from 'exceljs';
import Image from 'next/image';

interface UnidadAPI {
  codunidad: string;
  habilitado: string;
}

interface Unidad {
  codunidad: string;
  habilitado: string;
}

const TODOS_KEY = '__todos__';
const HABILITADAS_KEY = '__habilitadas__';
const DESHABILITADAS_KEY = '__deshabilitadas__';
const PAGE_SIZE = 24;

const BRAND_BLUE = 'FF113EB9';
const BRAND_BLUE_DARK = 'FF0C2D78';
const HEADER_ROW_INDEX = 4;

const EXPORT_COLUMNS: { header: string; key: string; width: number }[] = [
  { header: '#', key: 'num', width: 6 },
  { header: 'Código Unidad', key: 'codunidad', width: 20 },
  { header: 'Estado', key: 'habilitado', width: 16 },
];

const exportarExcel = async (data: Unidad[], filename: string) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Velsat';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Unidades', {
    views: [{ state: 'frozen', ySplit: HEADER_ROW_INDEX }],
  });

  sheet.columns = EXPORT_COLUMNS.map((c) => ({ key: c.key, width: c.width }));
  const lastCol = EXPORT_COLUMNS.length;

  sheet.mergeCells(1, 1, 1, lastCol);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = 'VELSAT — Reporte de Unidades';
  titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_BLUE } };
  sheet.getRow(1).height = 30;

  sheet.mergeCells(2, 1, 2, lastCol);
  const subtitleCell = sheet.getCell(2, 1);
  subtitleCell.value = `Generado el ${new Date().toLocaleString('es-PE')}  ·  ${data.length} unidad(es)`;
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

  data.forEach((u, i) => {
    const row = sheet.getRow(HEADER_ROW_INDEX + 1 + i);
    row.values = [i + 1, u.codunidad || '—', u.habilitado === '1' ? 'Habilitada' : 'Deshabilitada'];
    row.eachCell((cell, colNumber) => {
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
      cell.alignment = { vertical: 'middle', horizontal: colNumber === 1 ? 'center' : 'left' };
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
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const getPageNumbers = (current: number, total: number): (number | 'ellipsis')[] => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | 'ellipsis')[] = [1];
  if (current > 3) pages.push('ellipsis');
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p);
  if (current < total - 2) pages.push('ellipsis');
  pages.push(total);
  return pages;
};

export default function Page() {
  const { username, isReady } = useUsername();

  const [searchText, setSearchText] = useState('');
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [selectedUnidad, setSelectedUnidad] = useState<string | null>(null);
  const [accion, setAccion] = useState<'habilitar' | 'deshabilitar' | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedUnidadLiberar, setSelectedUnidadLiberar] = useState<string | null>(null);
  const [showLiberarDialog, setShowLiberarDialog] = useState(false);
  const [loadingLiberar, setLoadingLiberar] = useState(false);
  const [showLiberarTodasDialog, setShowLiberarTodasDialog] = useState(false);
  const [loadingLiberarTodas, setLoadingLiberarTodas] = useState(false);
  const [loadingInicial, setLoadingInicial] = useState(true);
  const [selectedTab, setSelectedTab] = useState<string>(TODOS_KEY);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    fetchUnidades();
  }, [username, isReady]);

  const fetchUnidades = async () => {
    if (!isReady) return;
    setLoadingInicial(true);

    try {
      const res = await fetch(
        `https://do.velsat.pe:2083/api/Preplan/carros/${username}`,
      );
      const data = await res.json();
      setUnidades(
        data
          .map((u: UnidadAPI) => ({
            codunidad: u.codunidad,
            habilitado: u.habilitado,
          }))
          .sort((a: Unidad, b: Unidad) => Number(b.habilitado) - Number(a.habilitado)),
      );
    } catch {
      toast.error('Error al cargar las unidades');
    } finally {
      setLoadingInicial(false);
    }
  };

  const handleLiberarTodasUnidades = async () => {
    setLoadingLiberarTodas(true);
    try {
      const response = await fetch(
        'https://do.velsat.pe:2083/api/Preplan/LiberarTotal',
        { method: 'PUT', headers: { 'Content-Type': 'application/json' } },
      );
      if (response.ok) {
        toast.success('Todas las unidades han sido liberadas exitosamente');
        fetchUnidades();
      } else {
        toast.error('Error al liberar todas las unidades');
      }
    } catch {
      toast.error('Error de conexión al liberar todas las unidades');
    } finally {
      setLoadingLiberarTodas(false);
      setShowLiberarTodasDialog(false);
    }
  };

  const handleLiberarUnidad = async (placa: string) => {
    setLoadingLiberar(true);
    try {
      const response = await fetch(
        `https://do.velsat.pe:2083/api/Caja/LiberarUnidad/${placa}`,
        { method: 'PUT', headers: { 'Content-Type': 'application/json' } },
      );
      if (response.ok) {
        toast.success(`Unidad ${placa} liberada exitosamente`);
        fetchUnidades();
      } else {
        toast.error(`Error al liberar la unidad ${placa}`);
      }
    } catch {
      toast.error(`Error de conexión al liberar la unidad ${placa}`);
    } finally {
      setLoadingLiberar(false);
      setShowLiberarDialog(false);
      setSelectedUnidadLiberar(null);
    }
  };

  const handleHabilitarDeshabilitar = async () => {
    if (!selectedUnidad || !accion) return;
    setLoading(true);
    try {
      const url =
        accion === 'habilitar'
          ? `https://do.velsat.pe:2083/api/Preplan/HabilitarUnidad/${selectedUnidad}`
          : `https://do.velsat.pe:2083/api/Preplan/DeshabilitarUnidad/${selectedUnidad}`;

      const response = await fetch(url, { method: 'POST' });
      if (response.ok) {
        toast.success(
          `Unidad ${selectedUnidad} ${accion === 'habilitar' ? 'habilitada' : 'deshabilitada'} exitosamente`,
        );
        fetchUnidades();
      } else {
        toast.error(`Error al ${accion} la unidad ${selectedUnidad}`);
      }
    } catch {
      toast.error(`Error de conexión al ${accion} la unidad`);
    } finally {
      setSelectedUnidad(null);
      setAccion(null);
      setLoading(false);
    }
  };

  const tabs = useMemo(() => {
    const habilitadas = unidades.filter((u) => u.habilitado === '1').length;
    const deshabilitadas = unidades.length - habilitadas;
    return [
      { key: TODOS_KEY, label: 'Todos', count: unidades.length },
      { key: HABILITADAS_KEY, label: 'Habilitadas', count: habilitadas },
      { key: DESHABILITADAS_KEY, label: 'Deshabilitadas', count: deshabilitadas },
    ];
  }, [unidades]);

  const unidadesFiltradas = useMemo(() => {
    const byTab =
      selectedTab === HABILITADAS_KEY
        ? unidades.filter((u) => u.habilitado === '1')
        : selectedTab === DESHABILITADAS_KEY
          ? unidades.filter((u) => u.habilitado !== '1')
          : unidades;

    const term = searchText.toLowerCase();
    const filtered = term
      ? byTab.filter((u) => u.codunidad.toLowerCase().includes(term))
      : byTab;

    return [...filtered].sort((a, b) => Number(b.habilitado) - Number(a.habilitado));
  }, [unidades, selectedTab, searchText]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [selectedTab, searchText]);

  const totalPages = Math.max(1, Math.ceil(unidadesFiltradas.length / PAGE_SIZE));

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const paginatedUnidades = unidadesFiltradas.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const allOnPageSelected =
    paginatedUnidades.length > 0 &&
    paginatedUnidades.every((u) => selectedIds.includes(u.codunidad));

  const toggleSelectAllOnPage = () => {
    if (allOnPageSelected) {
      const pageIds = new Set(paginatedUnidades.map((u) => u.codunidad));
      setSelectedIds((prev) => prev.filter((id) => !pageIds.has(id)));
    } else {
      setSelectedIds((prev) =>
        Array.from(new Set([...prev, ...paginatedUnidades.map((u) => u.codunidad)])),
      );
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Toaster richColors />

      {/* Header principal */}
      <div className="bg-[#113EB9]">
        <div className="flex h-12 items-stretch justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-full items-center bg-gradient-to-r from-orange-500 to-red-500 px-4">
              <Image src="/LogoWeb.png" alt="Velsat" width={44} height={44} className="h-9 w-9 object-contain" />
            </div>
            <div className="h-7 w-[2px] rounded-full bg-white/40 self-center" />
            <div className="flex flex-col justify-center">
              <span className="text-[9.5px] font-bold uppercase tracking-wider text-blue-200 leading-none mb-0.5">
                SERVICIOS / UNIDADES
              </span>
              <h1 className="text-[14px] font-bold leading-none tracking-[0.01em] text-white flex items-center gap-1.5 uppercase">
                <span>GESTIÓN DE UNIDADES</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 pr-4">
            <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[14px] font-semibold text-white">
              <Car className="h-3.5 w-3.5" />
              {unidades.length}
            </div>

            <button
              onClick={() =>
                exportarExcel(
                  unidadesFiltradas,
                  `unidades_${new Date().toISOString().slice(0, 10)}.xlsx`,
                ).catch(() => toast.error('Error al generar el Excel'))
              }
              disabled={loadingInicial || unidadesFiltradas.length === 0}
              className="flex items-center gap-1.5 rounded-md border border-white/20 px-3.5 py-2 text-[12px] font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              Exportar
            </button>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="p-4">
        {loadingInicial ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Spinner color="primary" size="md" />
            <span className="mt-3 text-[12px] text-gray-500">Cargando unidades...</span>
          </div>
        ) : (
          <div className="flex h-[calc(100vh-80px)] flex-col rounded-lg border border-gray-200 bg-white shadow-sm">
            {/* Tabs por estado */}
            <div className="flex shrink-0 items-center gap-6 overflow-x-auto border-b border-gray-200 px-4">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setSelectedTab(tab.key)}
                  className={`flex shrink-0 items-center gap-1.5 border-b-2 py-3 text-[12px] font-semibold transition-colors ${
                    selectedTab === tab.key
                      ? 'border-[#113EB9] text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      selectedTab === tab.key ? 'bg-blue-50 text-[#113EB9]' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Búsqueda + contador */}
            <div className="flex shrink-0 items-center gap-3 px-4 py-3">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por código de unidad..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="block w-full rounded-md border border-gray-200 bg-gray-50 py-1.5 pl-9 pr-3 text-[12px] placeholder-gray-400 transition-colors focus:border-[#113EB9] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#113EB9]"
                />
              </div>
              <span className="whitespace-nowrap text-[11px] text-gray-500">
                {paginatedUnidades.length} de {unidadesFiltradas.length}
              </span>
            </div>

            {/* Barra de acciones masivas */}
            {selectedIds.length > 0 && (
              <div className="flex shrink-0 items-center justify-between border-t border-blue-100 bg-blue-50 px-4 py-2">
                <span className="text-[12px] font-medium text-[#113EB9]">
                  {selectedIds.length} seleccionado{selectedIds.length > 1 ? 's' : ''}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      exportarExcel(
                        unidades.filter((u) => selectedIds.includes(u.codunidad)),
                        `unidades_seleccionadas_${new Date().toISOString().slice(0, 10)}.xlsx`,
                      ).catch(() => toast.error('Error al generar el Excel'))
                    }
                    className="flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-[#113EB9] transition-colors hover:bg-blue-50"
                  >
                    <Download size={12} />
                    Exportar
                  </button>
                </div>
              </div>
            )}

            {/* Tabla */}
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-10 bg-gray-200">
                  <tr className="border-b border-gray-200">
                    <th className="w-10 px-4 py-2">
                      <input
                        type="checkbox"
                        checked={allOnPageSelected}
                        onChange={toggleSelectAllOnPage}
                        className="h-3.5 w-3.5 rounded border-gray-300 text-[#113EB9] focus:ring-[#113EB9]"
                      />
                    </th>
                    <th className="px-2 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-gray-600">
                      #
                    </th>
                    <th className="px-4 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-gray-600">
                      Código Unidad
                    </th>
                    <th className="px-4 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-gray-600">
                      Estado
                    </th>
                    <th className="px-4 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-gray-600">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {paginatedUnidades.map((unidad, index) => {
                    const habilitada = unidad.habilitado === '1';
                    return (
                      <tr key={unidad.codunidad} className="transition-colors hover:bg-gray-50">
                        <td className="px-4 py-2">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(unidad.codunidad)}
                            onChange={() => toggleSelectOne(unidad.codunidad)}
                            className="h-3.5 w-3.5 rounded border-gray-300 text-[#113EB9] focus:ring-[#113EB9]"
                          />
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 text-[12px] font-medium text-gray-400">
                          {(currentPage - 1) * PAGE_SIZE + index + 1}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                                habilitada ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              <Car className="h-3.5 w-3.5" />
                            </div>
                            <span className="text-[12px] font-semibold text-gray-900">
                              {unidad.codunidad}
                            </span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2">
                          <span className="text-[12px] font-medium text-gray-900">
                            {habilitada ? 'Habilitada' : 'Deshabilitada'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2">
                          <div className="flex gap-1.5">
                            <button
                              title="Documentos"
                              onClick={() =>
                                window.open(
                                  `/trackvelnew/gestionunidades/gestiondocs?deviceID=${unidad.codunidad}`,
                                  '_blank',
                                )
                              }
                              className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white text-[#113EB9] transition-colors hover:bg-blue-50"
                            >
                              <FileCheck size={13} />
                            </button>

                            <button
                              title={habilitada ? 'Deshabilitar' : 'Habilitar'}
                              onClick={() => {
                                setSelectedUnidad(unidad.codunidad);
                                setAccion(habilitada ? 'deshabilitar' : 'habilitar');
                              }}
                              disabled={loading || loadingLiberarTodas}
                              className={`flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white transition-colors disabled:opacity-50 ${
                                habilitada
                                  ? 'text-red-600 hover:bg-red-50'
                                  : 'text-emerald-600 hover:bg-emerald-50'
                              }`}
                            >
                              {habilitada ? <Ban size={13} /> : <CheckCircle size={13} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {unidadesFiltradas.length === 0 && (
                <div className="flex items-center justify-center bg-white py-12">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-500">No se encontraron unidades</p>
                    <p className="mt-1 text-[12px] text-gray-400">Intenta con otro término de búsqueda</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer + paginación */}
            <div className="flex shrink-0 items-center justify-between border-t border-gray-200 px-4 py-3">
              <span className="text-[11px] text-gray-500">
                Mostrando <span className="font-semibold text-gray-700">{paginatedUnidades.length}</span> de{' '}
                {unidadesFiltradas.length} unidades
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
                >
                  Anterior
                </button>
                {getPageNumbers(currentPage, totalPages).map((p, i) =>
                  p === 'ellipsis' ? (
                    <span key={`ellipsis-${i}`} className="px-1.5 text-[11px] text-gray-400">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      className={`h-6 w-6 rounded-md text-[11px] font-medium transition-colors ${
                        currentPage === p
                          ? 'bg-[#113EB9] text-white'
                          : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {p}
                    </button>
                  ),
                )}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Diálogos */}
      <AlertDialog open={showLiberarTodasDialog} onOpenChange={setShowLiberarTodasDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Estás seguro que deseas liberar <strong>TODAS</strong> las unidades?
              <br />
              <span className="text-sm font-normal text-red-600">
                Esta acción eliminará las rutas actuales de todas las unidades.
              </span>
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLiberarTodasUnidades}
              disabled={loadingLiberarTodas}
              className="bg-red-600 hover:bg-red-700"
            >
              {loadingLiberarTodas ? 'Liberando todas...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showLiberarDialog} onOpenChange={setShowLiberarDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Estás seguro que deseas liberar la unidad <strong>{selectedUnidadLiberar}</strong>?
              <br />
              <span className="text-sm font-normal text-amber-600">
                Esto eliminará la ruta actual.
              </span>
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedUnidadLiberar && handleLiberarUnidad(selectedUnidadLiberar)}
              disabled={loadingLiberar || loadingLiberarTodas}
              className="bg-[#113EB9] hover:bg-blue-700"
            >
              {loadingLiberar ? 'Liberando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!selectedUnidad} onOpenChange={() => setSelectedUnidad(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Estás seguro que deseas {accion} la unidad <strong>{selectedUnidad}</strong>?
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleHabilitarDeshabilitar}
              disabled={loading || loadingLiberarTodas}
              className="bg-[#113EB9] hover:bg-blue-700"
            >
              {loading ? 'Procesando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
