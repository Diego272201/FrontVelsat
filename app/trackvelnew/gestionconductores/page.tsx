'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Trash2,
  FileCheck,
  Loader2,
  Users,
  Search,
  Download,
  User,
  Eye,
  ImagePlus,
  ImageOff,
  X,
} from 'lucide-react';
import ConductorDialog from '@/app/components/modal/addConductor';
import ConductorDialogModificar from '@/app/components/modal/editConductor';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/app/components/ui/alert-dialog';
import { useUsername } from '@/hooks/useUsername';
import { Spinner } from '@nextui-org/react';
import { Toaster, toast } from 'sonner';
import ExcelJS from 'exceljs';
import Image from 'next/image';

interface Conductor {
  id: number;
  nombre: string;
  telefono: string;
  correo: string;
  tipo: string | null;
  imagen: string | null;
}

interface ConductorAPI {
  codigo: number;
  nombres: string;
  apellidos: string;
  login: string;
  clave: string;
  telefono: string;
  dni: string;
  turno: string;
  horainicio: string;
  unidadasig: string | null;
  email: string;
  brevete: string | null;
  sctr: string | null;
  direccion: string | null;
  imagen: string | null;
  catBrevete: string;
  fecValidBrevete: string | null;
  estBrevete: string | null;
  sexo: string;
  unidadActual: string | null;
  habilitado: string;
  tipo: string | null;
}

const TODOS_KEY = '__todos__';
const PAGE_SIZE = 24;

const DriverAvatar = ({ src, alt }: { src: string | null; alt: string }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-20 w-20 rounded-full border border-gray-200 object-cover"
      />
    );
  }
  return (
    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 text-gray-400">
      <User size={40} />
    </div>
  );
};

const BRAND_BLUE = 'FF113EB9';
const BRAND_BLUE_DARK = 'FF0C2D78';
const HEADER_ROW_INDEX = 4;

const EXPORT_COLUMNS: { header: string; key: string; width: number }[] = [
  { header: '#', key: 'num', width: 6 },
  { header: 'Nombre', key: 'apellidos', width: 28 },
  { header: 'DNI', key: 'dni', width: 12 },
  { header: 'Género', key: 'sexo', width: 12 },
  { header: 'Usuario', key: 'login', width: 16 },
  { header: 'Contraseña', key: 'clave', width: 16 },
  { header: 'Teléfono', key: 'telefono', width: 16 },
  { header: 'Correo', key: 'email', width: 28 },
  { header: 'Unidad Asignada', key: 'unidadasig', width: 16 },
  { header: 'Tipo', key: 'tipo', width: 16 },
];

const exportarExcel = async (data: ConductorAPI[], filename: string) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Velsat';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Conductores', {
    views: [{ state: 'frozen', ySplit: HEADER_ROW_INDEX }],
  });

  sheet.columns = EXPORT_COLUMNS.map((c) => ({ key: c.key, width: c.width }));
  const lastCol = EXPORT_COLUMNS.length;

  sheet.mergeCells(1, 1, 1, lastCol);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = 'VELSAT — Reporte de Conductores';
  titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_BLUE } };
  sheet.getRow(1).height = 30;

  sheet.mergeCells(2, 1, 2, lastCol);
  const subtitleCell = sheet.getCell(2, 1);
  subtitleCell.value = `Generado el ${new Date().toLocaleString('es-PE')}  ·  ${data.length} conductor(es)  ·  Incluye datos de acceso, uso interno`;
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

  data.forEach((c, i) => {
    const row = sheet.getRow(HEADER_ROW_INDEX + 1 + i);
    row.values = [
      i + 1,
      c.apellidos.trim().toLowerCase().replace(/\b\w/g, (ch) => ch.toUpperCase()) || '—',
      c.dni || '—',
      c.sexo === 'M' ? 'Masculino' : c.sexo === 'F' ? 'Femenino' : '—',
      c.login || '—',
      c.clave || '—',
      c.telefono || '—',
      c.email || '—',
      c.unidadasig || '—',
      c.tipo || '—',
    ];
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

const DELIVERY_URL = process.env.NEXT_PUBLIC_CLOUDFLARE_DELIVERY_URL || '';
const IMAGE_FOLDER = 'conductores/';

// Devuelve el ID de Cloudflare solo si la imagen está en la carpeta de conductores.
const getCloudflareId = (url: string | null): string | null => {
  if (!url || !DELIVERY_URL || !url.startsWith(`${DELIVERY_URL}/`)) return null;
  const id = url.slice(DELIVERY_URL.length + 1).replace(/\/[^/]+$/, '');
  return id.startsWith(IMAGE_FOLDER) ? id : null;
};

const deleteCloudflareImage = async (imageId: string) => {
  const res = await fetch('/trackvelnew/gestionconductores/api/imagen', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageId }),
  });
  return res.ok;
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
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [conductores, setConductores] = useState<Conductor[]>([]);
  const [conductoresAPI, setConductoresAPI] = useState<ConductorAPI[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [eliminandoLoading, setEliminandoLoading] = useState<number | null>(null);
  const [imageBusyId, setImageBusyId] = useState<number | null>(null);
  const [viewer, setViewer] = useState<{ src: string; nombre: string } | null>(null);
  const [selectedTab, setSelectedTab] = useState<string>(TODOS_KEY);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState<boolean>(false);
  const { username, isReady } = useUsername();

  const fetchConductores = useCallback(async () => {
    if (!isReady) return;

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `https://do.velsat.pe:2083/api/Preplan/conductores/${username}`,
      );

      if (!response.ok) {
        throw new Error('Error al obtener los datos');
      }

      const data: ConductorAPI[] = await response.json();
      setConductoresAPI(data);

      const transformedData: Conductor[] = data.map((conductor: ConductorAPI) => ({
        id: conductor.codigo,
        nombre: conductor.apellidos.trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
        telefono: conductor.telefono || '',
        correo: conductor.email || '',
        tipo: conductor.tipo || null,
        imagen: conductor.imagen?.trim() || null,
      }));

      setConductores(transformedData);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [isReady, username]);

  const eliminarConductor = async (id: number) => {
    try {
      setEliminandoLoading(id);
      const response = await fetch(
        `https://do.velsat.pe:2083/api/Preplan/Eliminar/${id}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        },
      );

      if (!response.ok) {
        throw new Error('Error al eliminar el conductor');
      }

      await fetchConductores();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      alert('Error al eliminar el conductor: ' + errorMessage);
    } finally {
      setEliminandoLoading(null);
    }
  };

  const eliminarSeleccionados = async () => {
    if (selectedIds.length === 0) return;
    const ok = window.confirm(
      `¿Eliminar ${selectedIds.length} conductor(es) seleccionados? Esta acción no se puede deshacer.`,
    );
    if (!ok) return;

    setBulkDeleting(true);
    try {
      await Promise.all(
        selectedIds.map((id) =>
          fetch(`https://do.velsat.pe:2083/api/Preplan/Eliminar/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
      );
      toast.success(`${selectedIds.length} conductor(es) eliminados`);
      setSelectedIds([]);
      await fetchConductores();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      toast.error('Error al eliminar conductores seleccionados: ' + errorMessage);
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleConductorAdded = () => {
    fetchConductores();
  };

  const handleConductorModified = (modifiedConductor: ConductorAPI) => {
    setConductoresAPI((prev) =>
      prev.map((conductor) =>
        conductor.codigo === modifiedConductor.codigo ? modifiedConductor : conductor,
      ),
    );

    setConductores((prev) =>
      prev.map((conductor) =>
        conductor.id === modifiedConductor.codigo
          ? {
              id: modifiedConductor.codigo,
              nombre: modifiedConductor.apellidos.trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
              telefono: modifiedConductor.telefono || '',
              correo: modifiedConductor.email || '',
              tipo: modifiedConductor.tipo || '',
              imagen: modifiedConductor.imagen?.trim() || null,
            }
          : conductor,
      ),
    );
  };

  const getConductorData = (conductorId: number): ConductorAPI | null => {
    return conductoresAPI.find((conductor) => conductor.codigo === conductorId) || null;
  };

  const guardarImagen = async (data: ConductorAPI, imagen: string) => {
    const response = await fetch(
      `https://do.velsat.pe:2083/api/Preplan/ActualizarImagenConductor/${data.codigo}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagen }),
      },
    );
    if (!response.ok) throw new Error(`Error ${response.status} al guardar la imagen`);
    handleConductorModified({ ...data, imagen: imagen || null });
  };

  const reemplazarImagen = async (conductorId: number, file: File) => {
    const data = getConductorData(conductorId);
    if (!data) return;
    if (!file.type.startsWith('image/')) return toast.error('El archivo debe ser una imagen');
    if (file.size > 5 * 1024 * 1024) return toast.error('La imagen no puede superar los 5 MB');

    setImageBusyId(conductorId);
    const loadingToast = toast.loading('Subiendo imagen...');
    let nuevoId: string | null = null;
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('codigo', String(conductorId));
      const res = await fetch('/trackvelnew/gestionconductores/api/imagen', {
        method: 'POST',
        body: form,
      });
      const result = await res.json();
      if (!result.success) throw new Error(typeof result.error === 'string' ? result.error : 'Error al subir la imagen');
      nuevoId = result.imageId;

      await guardarImagen(data, result.imageUrl);

      const anteriorId = getCloudflareId(data.imagen);
      if (anteriorId) deleteCloudflareImage(anteriorId).catch(() => undefined);
      toast.success('Imagen actualizada');
    } catch (err: unknown) {
      if (nuevoId) deleteCloudflareImage(nuevoId).catch(() => undefined);
      toast.error(err instanceof Error ? err.message : 'Error al reemplazar la imagen');
    } finally {
      toast.dismiss(loadingToast);
      setImageBusyId(null);
    }
  };

  const eliminarImagen = async (conductorId: number) => {
    const data = getConductorData(conductorId);
    if (!data?.imagen) return;

    setImageBusyId(conductorId);
    try {
      await guardarImagen(data, '');
      const id = getCloudflareId(data.imagen);
      if (id) await deleteCloudflareImage(id);
      toast.success('Imagen eliminada');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar la imagen');
    } finally {
      setImageBusyId(null);
    }
  };

  const buildExportRows = (list: Conductor[]): ConductorAPI[] =>
    list
      .map((c) => getConductorData(c.id))
      .filter((c): c is ConductorAPI => c !== null);

  useEffect(() => {
    fetchConductores();
  }, [fetchConductores]);

  const tabs = useMemo(() => {
    const map = new Map<string, number>();
    conductores.forEach((c) => {
      if (c.tipo) map.set(c.tipo, (map.get(c.tipo) || 0) + 1);
    });
    const tipoTabs = Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tipo, count]) => ({ key: tipo, label: tipo, count }));

    return [
      { key: TODOS_KEY, label: 'Todos', count: conductores.length },
      ...tipoTabs,
    ];
  }, [conductores]);

  const filteredConductores = useMemo(() => {
    const byTab =
      selectedTab === TODOS_KEY
        ? conductores
        : conductores.filter((c) => c.tipo === selectedTab);

    const term = searchTerm.toLowerCase();
    if (!term) return byTab;

    return byTab.filter(
      (c) =>
        c.nombre.toLowerCase().includes(term) ||
        c.telefono.toLowerCase().includes(term) ||
        c.correo.toLowerCase().includes(term),
    );
  }, [conductores, selectedTab, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [selectedTab, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredConductores.length / PAGE_SIZE));

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const paginatedConductores = filteredConductores.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const allOnPageSelected =
    paginatedConductores.length > 0 &&
    paginatedConductores.every((c) => selectedIds.includes(c.id));

  const toggleSelectAllOnPage = () => {
    if (allOnPageSelected) {
      const pageIds = new Set(paginatedConductores.map((c) => c.id));
      setSelectedIds((prev) => prev.filter((id) => !pageIds.has(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...paginatedConductores.map((c) => c.id)])));
    }
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Toaster richColors />
      {viewer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setViewer(null)}
        >
          <div className="relative max-h-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setViewer(null)}
              title="Cerrar"
              className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white text-gray-700 shadow"
            >
              <X size={14} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={viewer.src}
              alt={viewer.nombre}
              className="max-h-[85vh] rounded-lg bg-white object-contain"
            />
            <p className="mt-2 text-center text-[12px] font-medium text-white">{viewer.nombre}</p>
          </div>
        </div>
      )}
      <div className="bg-[#113EB9]">
        <div className="flex h-12 items-stretch justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-full items-center bg-gradient-to-r from-orange-500 to-red-500 px-4">
              <Image src="/LogoWeb.png" alt="Velsat" width={44} height={44} className="h-9 w-9 object-contain" />
            </div>
            <div className="h-7 w-[2px] rounded-full bg-white/40 self-center" />
            <div className="flex flex-col justify-center">
              <span className="text-[9.5px] font-bold uppercase tracking-wider text-blue-200 leading-none mb-0.5">
                SERVICIOS / CONDUCTORES
              </span>
              <h1 className="text-[14px] font-bold leading-none tracking-[0.01em] text-white flex items-center gap-1.5 uppercase">
                <span>GESTIÓN DE CONDUCTORES</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 pr-4">
            <div className="flex items-center gap-1.5 rounded-full  px-3 py-1.5 text-[14px] font-semibold text-white">
              <Users className="h-3.5 w-3.5" />
              {conductores.length}
            </div>

            <button
              onClick={() =>
                exportarExcel(
                  buildExportRows(filteredConductores),
                  `conductores_${new Date().toISOString().slice(0, 10)}.xlsx`,
                ).catch(() => toast.error('Error al generar el Excel'))
              }
              disabled={loading || filteredConductores.length === 0}
              className="flex items-center gap-1.5 rounded-md  px-3.5 py-2 text-[12px] font-medium text-[#fff] transition-colors hover:bg-white/10 disabled:opacity-50 border border-white/20"
            >
              <Download className="h-3.5 w-3.5" />
              Exportar
            </button>

            <ConductorDialog onConductorAdded={handleConductorAdded} />
          </div>
        </div>
      </div>
      <div className="p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Spinner color="primary" size="md" />
            <span className="mt-3 text-[12px] text-gray-500">Cargando conductores...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="mb-2 text-sm font-medium text-red-600">Error al cargar los datos</p>
              <p className="mb-3 text-[12px] text-gray-500">{error}</p>
              <button
                onClick={fetchConductores}
                className="rounded-md bg-[#113EB9] px-4 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-blue-700"
              >
                Reintentar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex h-[calc(100vh-80px)] flex-col rounded-lg border border-gray-200 bg-white shadow-sm">
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
            <div className="flex shrink-0 items-center gap-3 px-4 py-3">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <input
                  placeholder="Buscar por nombre, teléfono o correo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={loading}
                  className="block w-full rounded-md border border-gray-200 bg-gray-50 py-1.5 pl-9 pr-3 text-[12px] placeholder-gray-400 transition-colors focus:border-[#113EB9] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#113EB9] disabled:opacity-50"
                />
              </div>
              <span className="whitespace-nowrap text-[11px] text-gray-500">
                {paginatedConductores.length} de {filteredConductores.length}
              </span>
            </div>
            {selectedIds.length > 0 && (
              <div className="flex shrink-0 items-center justify-between border-t border-blue-100 bg-blue-50 px-4 py-2">
                <span className="text-[12px] font-medium text-[#113EB9]">
                  {selectedIds.length} seleccionado{selectedIds.length > 1 ? 's' : ''}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      exportarExcel(
                        buildExportRows(conductores.filter((c) => selectedIds.includes(c.id))),
                        `conductores_seleccionados_${new Date().toISOString().slice(0, 10)}.xlsx`,
                      ).catch(() => toast.error('Error al generar el Excel'))
                    }
                    className="flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-[#113EB9] transition-colors hover:bg-blue-50"
                  >
                    <Download size={12} />
                    Exportar
                  </button>
                  <button
                    onClick={eliminarSeleccionados}
                    disabled={bulkDeleting}
                    className="flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                  >
                    {bulkDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    Eliminar
                  </button>
                </div>
              </div>
            )}
            <div className="flex shrink-0 items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-1.5">
              <input
                type="checkbox"
                checked={allOnPageSelected}
                onChange={toggleSelectAllOnPage}
                className="h-3.5 w-3.5 rounded border-gray-300 text-[#113EB9] focus:ring-[#113EB9]"
              />
              <span className="text-[11px] font-medium text-gray-500">Seleccionar todos en esta página</span>
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-gray-50 p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
                {paginatedConductores.map((conductor) => {
                  const selected = selectedIds.includes(conductor.id);
                  return (
                    <div
                      key={conductor.id}
                      className={`relative flex flex-col items-center rounded-lg border bg-white p-4 shadow-sm transition-shadow hover:shadow-md ${
                        selected ? 'border-[#113EB9] ring-1 ring-[#113EB9]' : 'border-gray-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleSelectOne(conductor.id)}
                        className="absolute left-3 top-3 h-3.5 w-3.5 rounded border-gray-300 text-[#113EB9] focus:ring-[#113EB9]"
                      />
                      <DriverAvatar src={conductor.imagen} alt={conductor.nombre} />
                      <span
                        className="mt-2 w-full truncate text-center text-[12px] font-semibold text-gray-900"
                        title={conductor.nombre}
                      >
                        {conductor.nombre}
                      </span>
                      {conductor.tipo && (
                        <span className="text-[11px] font-medium text-[#113EB9]">{conductor.tipo}</span>
                      )}
                      <span className="mt-1 w-full truncate text-center text-[11px] text-gray-600">
                        {conductor.telefono || <span className="text-gray-300">—</span>}
                      </span>
                      <span
                        className="w-full truncate text-center text-[11px] text-gray-600"
                        title={conductor.correo}
                      >
                        {conductor.correo || <span className="text-gray-300">—</span>}
                      </span>
                      <div className="mt-3 flex gap-1.5">
                            <ConductorDialogModificar
                              conductorData={getConductorData(conductor.id)}
                              onConductorModified={handleConductorModified}
                            />

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button
                                  title="Eliminar"
                                  className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                                  disabled={eliminandoLoading === conductor.id}
                                >
                                  {eliminandoLoading === conductor.id ? (
                                    <Loader2 size={13} className="animate-spin" />
                                  ) : (
                                    <Trash2 size={13} />
                                  )}
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta acción no se puede deshacer. Esto eliminará permanentemente al
                                    conductor &quot;{conductor.nombre}&quot; del sistema.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => eliminarConductor(conductor.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Eliminar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>

                            <button
                              title="Documentos"
                              onClick={() =>
                                window.open(
                                  `/trackvelnew/gestionconductores/gestiondocs?codtaxi=${conductor.id}&nombre=${encodeURIComponent(conductor.nombre)}`,
                                  '_blank',
                                )
                              }
                              className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white text-[#113EB9] transition-colors hover:bg-blue-50"
                            >
                              <FileCheck size={13} />
                            </button>
                      </div>
                      <div className="mt-1.5 flex gap-1.5">
                        <button
                          title={conductor.imagen ? 'Ver imagen' : 'Sin imagen'}
                          disabled={!conductor.imagen}
                          onClick={() =>
                            conductor.imagen &&
                            setViewer({ src: conductor.imagen, nombre: conductor.nombre })
                          }
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
                        >
                          <Eye size={13} />
                        </button>

                        <label
                          title={conductor.imagen ? 'Reemplazar imagen' : 'Subir imagen'}
                          className={`flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white text-[#113EB9] transition-colors hover:bg-blue-50 ${
                            imageBusyId === conductor.id ? 'pointer-events-none opacity-50' : 'cursor-pointer'
                          }`}
                        >
                          {imageBusyId === conductor.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <ImagePlus size={13} />
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={imageBusyId === conductor.id}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              e.target.value = '';
                              if (file) reemplazarImagen(conductor.id, file);
                            }}
                          />
                        </label>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button
                              title="Eliminar imagen"
                              disabled={!conductor.imagen || imageBusyId === conductor.id}
                              className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white text-red-600 transition-colors hover:bg-red-50 disabled:opacity-40"
                            >
                              <ImageOff size={13} />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar imagen?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Se eliminará la foto de &quot;{conductor.nombre}&quot;. El conductor se mantiene y
                                volverá a mostrarse el ícono por defecto.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => eliminarImagen(conductor.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex shrink-0 items-center justify-between border-t border-gray-200 px-4 py-3">
              <span className="text-[11px] text-gray-500">
                Mostrando <span className="font-semibold text-gray-700">{paginatedConductores.length}</span> de{' '}
                {filteredConductores.length} conductores
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
    </div>
  );
}
