'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Plus,
  Trash2,
  Download,
  FileText,
  Truck,
  User,
  Calendar,
  X,
  Upload,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Spinner } from '@nextui-org/react';
import { useSession } from 'next-auth/react';

interface Document {
  id: string;
  type: string;
  expiryDate?: string;
  base64: string;
  fileName: string;
  cloudflareImageId?: string;
  cloudflareImageUrl?: string;
}

interface Unit {
  id: string;
  plate: string;
  documents: Document[];
}

interface ModalConfig {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'confirm' | 'prompt' | 'alert';
  onConfirm?: (value?: string) => void;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'danger' | 'primary';
  placeholder?: string;
}

const DRIVER_DOC_TYPES = [
  'Licencia de conducir',
  'DNI/Cédula',
  'Antecedentes penales',
  'Certificado médico',
  'Otros',
];
const UNIT_DOC_TYPES = [
  'Revisión técnica',
  'SOAT',
  'Tarjeta de propiedad',
  'Permiso de circulación',
  'Otros',
];

// ── Modal genérico ─────────────────────────────────────────────────────────────
const GenericModal: React.FC<{ config: ModalConfig; onClose: () => void }> = ({
  config,
  onClose,
}) => {
  const [inputValue, setInputValue] = useState('');
  if (!config.isOpen) return null;

  const handleConfirm = () => {
    config.onConfirm?.(config.type === 'prompt' ? inputValue : undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div
              className={`shrink-0 rounded-xl p-2.5 ${config.confirmVariant === 'danger' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}
            >
              {config.confirmVariant === 'danger' ? (
                <AlertTriangle size={20} />
              ) : (
                <CheckCircle size={20} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="mb-1 text-sm font-bold text-slate-900">
                {config.title}
              </h3>
              <p className="text-xs leading-relaxed text-slate-500">
                {config.message}
              </p>
              {config.type === 'prompt' && (
                <input
                  autoFocus
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && inputValue.trim()) handleConfirm();
                  }}
                  placeholder={config.placeholder || ''}
                  className="mt-3 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 pb-5">
          {config.type !== 'alert' && (
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-xs font-bold text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900"
            >
              {config.cancelLabel || 'Cancelar'}
            </button>
          )}
          <button
            onClick={handleConfirm}
            disabled={config.type === 'prompt' && !inputValue.trim()}
            className={`rounded-lg px-5 py-2 text-xs font-bold text-white shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-40 ${config.confirmVariant === 'danger' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {config.confirmLabel || 'Aceptar'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ── Document Card ──────────────────────────────────────────────────────────────
const DocumentCard = React.forwardRef<
  HTMLDivElement,
  {
    doc: Document;
    onDelete: () => void;
    onDownload: () => void;
    isDeleting?: boolean;
  }
>(({ doc, onDelete, onDownload, isDeleting }, ref) => {
  const displayUrl = doc.cloudflareImageUrl || doc.base64;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="relative flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow duration-300 hover:shadow-md"
    >
      {/* Overlay spinner al eliminar */}
      {isDeleting && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-xl bg-white/80 backdrop-blur-sm">
          <Spinner color="danger" />

          <p className="text-[10px] font-bold text-rose-500">Eliminando...</p>
        </div>
      )}
      <div className="group relative flex aspect-video items-center justify-center overflow-hidden bg-slate-100">
        <img
          src={displayUrl}
          alt={doc.type}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={onDownload}
            className="transform rounded-full bg-white/90 p-2 text-slate-900 shadow-lg transition-all hover:scale-110 hover:bg-white"
          >
            <Download size={16} />
          </button>
        </div>
      </div>
      <div className="flex flex-grow flex-col p-4">
        <div className="mb-1.5 flex items-start justify-between">
          <h4 className="text-xm line-clamp-2 font-bold leading-tight text-slate-900">
            {doc.type}
          </h4>
          <div className="ml-2 shrink-0 rounded bg-slate-100 p-1 text-slate-400">
            <FileText size={15} />
          </div>
        </div>
        {doc.expiryDate &&
          (() => {
            const today = new Date();
            const expiry = new Date(doc.expiryDate);
            const diffDays = Math.ceil(
              (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
            );

            let badge = {
              label: 'Vigente',
              classes: 'bg-emerald-50 text-emerald-600 border-emerald-200',
            };
            if (diffDays < 0)
              badge = {
                label: 'Vencido',
                classes: 'bg-rose-50 text-rose-600 border-rose-200',
              };
            else if (diffDays <= 30)
              badge = {
                label: 'Por vencer',
                classes: 'bg-amber-50 text-amber-600 border-amber-200',
              };

            return (
              <div className="mb-3 space-y-1.5">
                <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
                  <Calendar size={12} className="text-slate-400" />
                  <span>
                    Vence: {doc.expiryDate.split('-').reverse().join('/')}
                  </span>
                </div>
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[13px] font-bold ${badge.classes}`}
                >
                  {badge.label}
                  {diffDays >= 0 && diffDays <= 30 && (
                    <span className="ml-1 opacity-70">({diffDays}d)</span>
                  )}
                </span>
              </div>
            );
          })()}
        {doc.cloudflareImageId && (
          <div className="mb-1 flex items-center gap-1 text-[10px] text-slate-300">
            <span>☁ Cloudflare</span>
          </div>
        )}
        <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3">
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="flex items-center gap-1 text-[12px] font-bold text-rose-600 transition-colors hover:text-rose-700 disabled:opacity-40"
          >
            {isDeleting ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Trash2 size={12} />
            )}
            Eliminar
          </button>
        </div>
      </div>
    </motion.div>
  );
});
DocumentCard.displayName = 'DocumentCard';

// ── Selector de tipo con opción "Otro (escribir)" ──────────────────────────────
const DocTypeSelector: React.FC<{
  value: string;
  onChange: (v: string) => void;
  options: string[];
}> = ({ value, onChange, options }) => {
  const isCustom = value !== '' && !options.includes(value);
  const [showCustom, setShowCustom] = useState(isCustom);
  const [customValue, setCustomValue] = useState(isCustom ? value : '');

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    if (v === '__custom__') {
      setShowCustom(true);
      setCustomValue('');
      onChange('');
    } else {
      setShowCustom(false);
      onChange(v);
    }
  };

  return (
    <div className="space-y-2">
      <select
        value={showCustom ? '__custom__' : value}
        onChange={handleSelect}
        className="w-full cursor-pointer appearance-none rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-900 transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      >
        {options.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
        <option value="__custom__"> Escribir tipo personalizado...</option>
      </select>
      {showCustom && (
        <input
          autoFocus
          type="text"
          value={customValue}
          onChange={(e) => {
            setCustomValue(e.target.value);
            onChange(e.target.value);
          }}
          placeholder="Ej: Seguro vehicular, Permiso especial..."
          className="w-full rounded-lg border border-blue-300 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-900 transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      )}
    </div>
  );
};

// ── App ────────────────────────────────────────────────────────────────────────
export default function App() {
  const { data: session } = useSession();
  const username = session?.user?.username || '';
  const [driverDocs, setDriverDocs] = useState<Document[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);

  const [units, setUnits] = useState<Unit[]>([]);
  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>(
    {},
  );

  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [modalTarget, setModalTarget] = useState<'driver' | 'unit'>('driver');
  const [activeUnitId, setActiveUnitId] = useState<string | null>(null);
  const [formDocType, setFormDocType] = useState('');
  const [formExpiryDate, setFormExpiryDate] = useState('');
  const [formFile, setFormFile] = useState<string | null>(null);
  const [formFileName, setFormFileName] = useState('');
  const [formRawFile, setFormRawFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  // Track which doc IDs are being deleted
  const [deletingDocIds, setDeletingDocIds] = useState<Set<string>>(new Set());

  const [genericModal, setGenericModal] = useState<ModalConfig>({
    isOpen: false,
    title: '',
    message: '',
    type: 'confirm',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = useCallback(async () => {
    if (!username) return;
    setIsLoadingDocs(true);
    try {
      const res = await fetch(
        `https://sub.velsat.pe:2096/api/Admin/GetDocumento?accountID=${username}`,
      );
      const json = await res.json();
      if (json.success && json.data) {
        const conductorDocs: Document[] = json.data
          .filter((d: any) => d.tipo_documento === '1')
          .map((d: any) => ({
            id: String(d.id),
            type: d.nombre_documento,
            expiryDate: d.fecha_vencimiento
              ? d.fecha_vencimiento.split('T')[0]
              : '',
            base64: d.archivo_url,
            fileName: d.nombre_documento,
            cloudflareImageUrl: d.archivo_url,
          }));
        setDriverDocs(conductorDocs);

        const unidadDocs = json.data.filter(
          (d: any) => d.tipo_documento === '2',
        );
        const grouped: Record<string, Unit> = {};
        unidadDocs.forEach((d: any) => {
          if (!grouped[d.deviceID]) {
            grouped[d.deviceID] = {
              id: d.deviceID,
              plate: d.deviceID,
              documents: [],
            };
          }
          grouped[d.deviceID].documents.push({
            id: String(d.id),
            type: d.nombre_documento,
            expiryDate: d.fecha_vencimiento
              ? d.fecha_vencimiento.split('T')[0]
              : '',
            base64: d.archivo_url,
            fileName: d.nombre_documento,
            cloudflareImageUrl: d.archivo_url,
          });
        });
        setUnits(Object.values(grouped));
      }
    } catch (e) {
      console.error('Error al cargar documentos:', e);
    } finally {
      setIsLoadingDocs(false);
    }
  }, [username]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // ── Cloudflare ─────────────────────────────────────────────────────────────

  const uploadToCloudflare = async (
    file: File,
  ): Promise<{ id: string; url: string } | null> => {
    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(
        '/trackvelnew/gestionconductores/gestiondocs/api/upload-image',
        { method: 'POST', body: formData },
      );
      const result = await response.json();
      if (result.success) return { id: result.imageId, url: result.imageUrl };
      return null;
    } catch {
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const deleteFromCloudflare = async (imageId: string): Promise<boolean> => {
    try {
      const response = await fetch(
        '/trackvelnew/gestionconductores/gestiondocs/api/delete-image',
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageId }),
        },
      );
      const result = await response.json();
      return result.success;
    } catch {
      return false;
    }
  };

  // ── Modales genéricos ──────────────────────────────────────────────────────

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
  ) => {
    setGenericModal({
      isOpen: true,
      title,
      message,
      type: 'confirm',
      onConfirm,
      confirmVariant: 'danger',
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
    });
  };
  const showPrompt = (
    title: string,
    message: string,
    placeholder: string,
    onConfirm: (v: string) => void,
  ) => {
    setGenericModal({
      isOpen: true,
      title,
      message,
      type: 'prompt',
      placeholder,
      onConfirm: (v) => v && onConfirm(v),
      confirmLabel: 'Agregar',
      cancelLabel: 'Cancelar',
      confirmVariant: 'primary',
    });
  };
  const closeGenericModal = () =>
    setGenericModal((prev) => ({ ...prev, isOpen: false }));

  // ── Archivo ────────────────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormRawFile(file);
      setFormFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => setFormFile(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // ── Abrir modales de documento ─────────────────────────────────────────────

  const openAddModal = (
    target: 'driver' | 'unit',
    unitId: string | null = null,
  ) => {
    setModalTarget(target);
    setActiveUnitId(unitId);
    setFormDocType(
      target === 'driver' ? DRIVER_DOC_TYPES[0] : UNIT_DOC_TYPES[0],
    );
    setFormExpiryDate('');
    setFormFile(null);
    setFormFileName('');
    setFormRawFile(null);
    setIsDocModalOpen(true);
  };

  // ── Guardar ────────────────────────────────────────────────────────────────

  const saveDocument = async () => {
    if (!formFile || !formDocType) return;

    let cloudflareImageUrl: string | undefined;

    if (formRawFile) {
      const cfResult = await uploadToCloudflare(formRawFile);
      if (cfResult) cloudflareImageUrl = cfResult.url;
    }

    if (!cloudflareImageUrl) {
      console.error('No se pudo obtener URL de Cloudflare');
      setIsDocModalOpen(false);
      return;
    }
    const finalUrl = cloudflareImageUrl;

    try {
      const body = {
        accountID: username,
        deviceID: modalTarget === 'unit' ? activeUnitId : '',
        tipo_documento: modalTarget === 'driver' ? '1' : '2',
        nombre_documento: formDocType,
        archivo_url: finalUrl,
        fecha_vencimiento: formExpiryDate
          ? new Date(formExpiryDate).toISOString()
          : new Date().toISOString(),
      };

      const res = await fetch(
        'https://sub.velsat.pe:2096/api/Admin/CreateDocumento',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      );

      const json = await res.json();

      if (json.success) {
        const newDoc: Document = {
          id: String(json.data?.id || Math.random().toString(36).substr(2, 9)),
          type: formDocType,
          expiryDate: formExpiryDate,
          base64: finalUrl,
          fileName: formFileName,
          cloudflareImageUrl: finalUrl,
        };

        if (modalTarget === 'driver') {
          setDriverDocs((prev) => [...prev, newDoc]);
        } else if (modalTarget === 'unit' && activeUnitId) {
          setUnits((prev) =>
            prev.map((u) =>
              u.id !== activeUnitId
                ? u
                : {
                    ...u,
                    documents: [...u.documents, newDoc],
                  },
            ),
          );
        }
      } else {
        console.error('Error al crear documento:', json);
      }
    } catch (e) {
      console.error('Error al crear documento:', e);
    }

    setIsDocModalOpen(false);
    await fetchDocuments();
  };

  // ── Eliminar documento (con spinner en la card) ────────────────────────────

  const deleteDocument = (
    target: 'driver' | 'unit',
    docId: string,
    unitId: string | null = null,
  ) => {
    showConfirm(
      'Eliminar documento',
      '¿Estás seguro? Esta acción no se puede deshacer.',
      async () => {
        setDeletingDocIds((prev) => new Set(prev).add(docId));
        try {
          await fetch(
            `https://sub.velsat.pe:2096/api/Admin/DeleteDocumento?id=${docId}`,
            {
              method: 'DELETE',
            },
          );
        } catch (e) {
          console.error('Error al eliminar documento:', e);
        }
        if (target === 'driver')
          setDriverDocs((prev) => prev.filter((d) => d.id !== docId));
        else if (target === 'unit' && unitId)
          setUnits((prev) =>
            prev.map((u) =>
              u.id === unitId
                ? { ...u, documents: u.documents.filter((d) => d.id !== docId) }
                : u,
            ),
          );
        setDeletingDocIds((prev) => {
          const s = new Set(prev);
          s.delete(docId);
          return s;
        });
      },
    );
  };

  const downloadDocument = (doc: Document) => {
    const url = doc.cloudflareImageUrl || doc.base64;
    const link = document.createElement('a');
    link.href = url;
    link.download = `${doc.type}_${doc.fileName}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const addUnit = () => {
    showPrompt(
      'Nueva Unidad',
      'Ingrese el código o placa de la nueva unidad:',
      'Ej: XYZ-456',
      (plate) => {
        setUnits((prev) => [...prev, { id: plate, plate, documents: [] }]);
        setExpandedUnits((prev) => ({ ...prev, [plate]: true }));
      },
    );
  };

  const deleteUnit = (unitId: string) => {
    showConfirm(
      'Eliminar unidad',
      '¿Eliminar esta unidad y todos sus documentos?',
      async () => {
        const unit = units.find((u) => u.id === unitId);
        if (unit) {
          await Promise.all(
            unit.documents.map((d) =>
              fetch(
                `https://sub.velsat.pe:2096/api/Admin/DeleteDocumento?id=${d.id}`,
                {
                  method: 'DELETE',
                },
              ).catch((e) => console.error('Error al eliminar documento:', e)),
            ),
          );
        }
        setUnits((prev) => prev.filter((u) => u.id !== unitId));
      },
    );
  };

  const toggleUnit = (unitId: string) =>
    setExpandedUnits((prev) => ({ ...prev, [unitId]: !prev[unitId] }));

  return (
    <div
      className="flex h-screen flex-col bg-slate-50 font-sans text-slate-900"
      style={{ overflow: 'hidden' }}
    >
      <header className="z-30 shrink-0 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 shadow-lg shadow-blue-100">
              <FileText className="text-white" size={18} />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">
              Mis Documentos
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-slate-500 sm:inline">
              Bienvenido,{' '}
              <span className="font-bold text-slate-900">
                {username.toUpperCase()}
              </span>
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-600">
              <User size={16} />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl space-y-12 px-4 py-8 sm:px-6 lg:px-8">
          {/* Conductor */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
                  <User size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">
                    Conductor
                  </h2>
                  <p className="text-xs font-medium text-slate-400">
                    Identificación y licencias personales
                  </p>
                </div>
              </div>
              <button
                onClick={() => openAddModal('driver')}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-blue-100 transition-all hover:bg-blue-700 active:scale-95"
              >
                <Plus size={16} />
                Agregar Documento
              </button>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              {isLoadingDocs ? (
                <div className="flex items-center justify-center py-16">
                  <Spinner color="primary" />
                </div>
              ) : driverDocs.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  <AnimatePresence mode="popLayout">
                    {driverDocs.map((doc) => (
                      <DocumentCard
                        key={doc.id}
                        doc={doc}
                        isDeleting={deletingDocIds.has(doc.id)}
                        onDelete={() => deleteDocument('driver', doc.id)}
                        onDownload={() => downloadDocument(doc)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-3 py-16 text-slate-300">
                  <div className="rounded-full bg-slate-50 p-4">
                    <FileText size={40} strokeWidth={1} />
                  </div>
                  <p className="text-sm font-medium">
                    No hay documentos registrados
                  </p>
                  <button
                    onClick={() => openAddModal('driver')}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    Subir el primero
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Unidades */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-orange-50 p-2.5 text-orange-600">
                  <Truck size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">
                    Unidades
                  </h2>
                  <p className="text-xs font-medium text-slate-400">
                    Documentación técnica de su flota
                  </p>
                </div>
              </div>
              <button
                onClick={addUnit}
                className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-slate-200 transition-all hover:bg-slate-800 active:scale-95"
              >
                <Plus size={16} />
                Nueva Unidad
              </button>
            </div>
            <div className="space-y-5">
              {units.length > 0 ? (
                units.map((unit) => (
                  <div
                    key={unit.id}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:border-slate-300"
                  >
                    <div
                      className="flex cursor-pointer items-center justify-between p-5 transition-colors hover:bg-slate-50"
                      onClick={() => toggleUnit(unit.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                          <Truck size={20} />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-900">
                            Placa:{' '}
                            <span className="text-orange-600">
                              {unit.plate}
                            </span>
                          </h3>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            {unit.documents.length} documentos
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteUnit(unit.id);
                          }}
                          className="rounded-lg p-2 text-slate-300 transition-all hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 size={18} />
                        </button>
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                          {expandedUnits[unit.id] ? (
                            <ChevronDown size={16} />
                          ) : (
                            <ChevronRight size={16} />
                          )}
                        </div>
                      </div>
                    </div>
                    <AnimatePresence>
                      {expandedUnits[unit.id] && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-slate-100 p-6 pt-0">
                            <div className="mb-6 mt-4 flex justify-end">
                              <button
                                onClick={() => openAddModal('unit', unit.id)}
                                className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-600 transition-colors hover:text-blue-700"
                              >
                                <Plus size={14} />
                                Agregar Documento
                              </button>
                            </div>
                            {unit.documents.length > 0 ? (
                              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                                {unit.documents.map((doc) => (
                                  <DocumentCard
                                    key={doc.id}
                                    doc={doc}
                                    isDeleting={deletingDocIds.has(doc.id)}
                                    onDelete={() =>
                                      deleteDocument('unit', doc.id, unit.id)
                                    }
                                    onDownload={() => downloadDocument(doc)}
                                  />
                                ))}
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center space-y-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 py-10 text-slate-300">
                                <FileText size={32} strokeWidth={1} />
                                <p className="text-xs font-medium">
                                  Sin documentos para esta unidad
                                </p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center space-y-5 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-slate-400">
                  <div className="rounded-full bg-slate-50 p-5">
                    <Truck size={56} strokeWidth={1} />
                  </div>
                  <div className="space-y-1 text-center">
                    <p className="text-lg font-bold text-slate-900">
                      No hay unidades registradas
                    </p>
                    <p className="text-xs">
                      Agregue su primera unidad para gestionar su documentación
                    </p>
                  </div>
                  <button
                    onClick={addUnit}
                    className="rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-white shadow-xl shadow-slate-200 transition-all hover:bg-slate-800"
                  >
                    Agregar Unidad
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* ── Modal documento ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isDocModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => !isUploading && setIsDocModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 p-5">
                <h3 className="text-base font-bold text-slate-900">
                  Nuevo Documento
                </h3>
                <button
                  onClick={() => !isUploading && setIsDocModalOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-900"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-5 p-6">
                {/* Tipo de documento con opción personalizada */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Tipo de Documento
                  </label>
                  <DocTypeSelector
                    value={formDocType}
                    onChange={setFormDocType}
                    options={
                      modalTarget === 'driver'
                        ? DRIVER_DOC_TYPES
                        : UNIT_DOC_TYPES
                    }
                  />
                </div>

                {/* Fecha */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Fecha de Vencimiento{' '}
                    <span className="font-normal normal-case text-slate-300">
                      (opcional)
                    </span>
                  </label>
                  <input
                    type="date"
                    value={formExpiryDate}
                    onChange={(e) => setFormExpiryDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-900 transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                {/* Upload */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Archivo / Imagen
                  </label>
                  <div
                    onClick={() =>
                      !isUploading && fileInputRef.current?.click()
                    }
                    className={`relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-all ${formFile ? 'border-blue-500 bg-blue-50/30' : 'border-slate-200 bg-slate-50/50 hover:border-slate-400 hover:bg-slate-50'}`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="hidden"
                    />

                    {/* Overlay de carga sobre la zona de upload */}
                    {isUploading && (
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-xl bg-white/90">
                        <div className="relative h-14 w-14">
                          <svg
                            className="h-14 w-14 -rotate-90"
                            viewBox="0 0 56 56"
                          >
                            <circle
                              cx="28"
                              cy="28"
                              r="24"
                              fill="none"
                              stroke="#e2e8f0"
                              strokeWidth="4"
                            />
                            <circle
                              cx="28"
                              cy="28"
                              r="24"
                              fill="none"
                              stroke="#3b82f6"
                              strokeWidth="4"
                              strokeDasharray="150.8"
                              strokeDashoffset="37.7"
                              className="transition-all duration-300"
                              style={{ strokeLinecap: 'round' }}
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Spinner color="primary" />
                          </div>
                        </div>
                        <p className="text-xs font-bold text-blue-700">
                          Subiendo a Cloudflare...
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Por favor espera
                        </p>
                      </div>
                    )}

                    {formFile ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-20 w-20 overflow-hidden rounded-xl border-2 border-white shadow-lg">
                          <img
                            src={formFile}
                            alt="Preview"
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-bold text-blue-600">
                            ¡Imagen cargada!
                          </p>
                          <p className="max-w-[200px] truncate text-[10px] font-medium text-slate-400">
                            {formFileName}
                          </p>
                        </div>
                        {!isUploading && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setFormFile(null);
                              setFormFileName('');
                              setFormRawFile(null);
                            }}
                            className="rounded-lg border border-rose-100 bg-white px-3 py-1 text-[10px] font-bold text-rose-500 transition-colors hover:bg-rose-50"
                          >
                            Cambiar archivo
                          </button>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="rounded-xl bg-white p-3 text-blue-600 shadow-sm">
                          <Upload size={22} />
                        </div>
                        <div className="space-y-0.5 text-center">
                          <p className="text-xs font-bold text-slate-900">
                            Seleccionar imagen
                          </p>
                          <p className="text-[10px] font-medium text-slate-400">
                            PNG, JPG o JPEG (Máx. 5MB)
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50 p-5">
                <button
                  onClick={() => !isUploading && setIsDocModalOpen(false)}
                  disabled={isUploading}
                  className="rounded-lg px-5 py-2 text-xs font-bold text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveDocument}
                  disabled={!formFile || !formDocType || isUploading}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-8 py-2 text-xs font-bold text-white shadow-lg shadow-blue-100 transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Subiendo...
                    </>
                  ) : (
                    'Guardar'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal genérico */}
      <AnimatePresence>
        {genericModal.isOpen && (
          <GenericModal config={genericModal} onClose={closeGenericModal} />
        )}
      </AnimatePresence>
    </div>
  );
}
