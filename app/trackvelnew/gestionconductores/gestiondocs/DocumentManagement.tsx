'use client';

import React, { useState, useEffect } from 'react';
import {
  Upload,
  Search,
  Download,
  Eye,
  Trash2,
  X,
  Calendar,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import Tesseract from 'tesseract.js';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';

// ─── Toast ────────────────────────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'warning';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

const ToastContainer = ({
  toasts,
  onRemove,
}: {
  toasts: ToastItem[];
  onRemove: (id: number) => void;
}) => {
  const icons = {
    success: <span className="text-green-500">✓</span>,
    error: <span className="text-red-500">✕</span>,
    warning: <span className="text-yellow-500">⚠</span>,
  };
  const bars = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="relative w-80 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-gray-100"
        >
          {/* barra de color arriba */}
          <div className={`h-1 w-full ${bars[toast.type]}`} />
          <div className="flex items-start gap-3 px-4 py-3">
            <span className="mt-0.5 text-base">{icons[toast.type]}</span>
            <p className="flex-1 text-sm text-gray-700">{toast.message}</p>
            <button
              onClick={() => onRemove(toast.id)}
              className="text-gray-300 transition-colors hover:text-gray-500"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Document {
  id: string;
  name: string;
  fileName: string;
  size: number;
  expiryDate: Date;
  status: 'vencido' | 'proximo' | 'vigente' | 'sin_vencimiento';
  daysMessage: string;
  archivo_url: string;
  observaciones: string;
  cloudflareImageId?: string;
  cloudflareImageUrl?: string;
}

interface DocumentAPI {
  id: number;
  deviceID: string;
  tipo_documento: string;
  archivo_url: string;
  fecha_vencimiento: string | null;
  observaciones: string;
  estado: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const calculateStatus = (
  expiryDate: Date | null,
): 'vencido' | 'proximo' | 'vigente' | 'sin_vencimiento' => {
  if (!expiryDate) return 'sin_vencimiento';
  const diffDays = Math.ceil(
    (expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays < 0) return 'vencido';
  if (diffDays <= 30) return 'proximo';
  return 'vigente';
};

const calculateDaysMessage = (expiryDate: Date | null): string => {
  if (!expiryDate) return 'Sin fecha de vencimiento';
  const diffDays = Math.ceil(
    (expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays < 0) return `VENCIDO HACE ${Math.abs(diffDays)} DÍAS`;
  if (diffDays <= 30) return `Faltan ${diffDays} días`;
  return 'Vigente';
};

// ─── Componente principal ─────────────────────────────────────────────────────

const DocumentManagement = () => {
  const { data: session, status } = useSession();
  const username = session?.user?.username || '';

  const searchParams = useSearchParams();
  const codtaxi = searchParams.get('codtaxi');
  const nombre = searchParams.get('nombre');

  // Estado de documentos
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Estado del modal de carga
  const [showModal, setShowModal] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [ocrDate, setOcrDate] = useState<string>('');
  const [documentName, setDocumentName] = useState<string>('');
  const [tipoDocumento, setTipoDocumento] = useState<string>('');
  const [observaciones, setObservaciones] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [skipImage, setSkipImage] = useState(false);

  // Estado de búsqueda y filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Estado de eliminación
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
  const [docToDelete, setDocToDelete] = useState<Document | null>(null);
  // ── Toasts ────────────────────────────────────────────────────────────────────
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = (message: string, type: ToastType = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      4000,
    );
  };

  const removeToast = (id: number) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  // ── Cargar PDF.js ─────────────────────────────────────────────────────────

  useEffect(() => {
    const script = document.createElement('script');
    script.src =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.async = true;
    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      }
    };
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // ── Fetch de documentos desde la API ─────────────────────────────────────

  // CAMBIO 1 y 2: Extraer la función y simplificar el useEffect
  const fetchDocuments = async () => {
    if (!codtaxi) {
      setError('No se proporcionó codtaxi en la URL');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `https://do.velsat.pe:2083/api/Doc/GetByCodtaxi?codtaxi=${codtaxi}`,
      );
      if (!response.ok) throw new Error('Error al obtener los documentos');
      const result = await response.json();
      if (result.success && result.data) {
        const mappedDocuments: Document[] = result.data.map(
          (doc: DocumentAPI) => {
            const expiryDate = doc.fecha_vencimiento
              ? new Date(doc.fecha_vencimiento)
              : null;
            let imageUrl = doc.archivo_url;
            if (
              imageUrl &&
              !imageUrl.endsWith('/public') &&
              !imageUrl.endsWith('/thumbnail')
            ) {
              imageUrl = `${imageUrl}/public`;
            }
            return {
              id: doc.id.toString(),
              name: doc.tipo_documento,
              fileName: 'documento.pdf',
              size: 0,
              expiryDate,
              status: calculateStatus(expiryDate),
              daysMessage: calculateDaysMessage(expiryDate),
              archivo_url: imageUrl,
              observaciones: doc.observaciones,
              cloudflareImageId: imageUrl.split('/').slice(-2, -1)[0] || '',
              cloudflareImageUrl: imageUrl,
            };
          },
        );
        setDocuments(mappedDocuments);
      } else {
        setDocuments([]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [codtaxi]);

  // ── Cloudflare: subir ─────────────────────────────────────────────────────

  const uploadToCloudflare = async (file: File) => {
    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      // TODO: Cambia la ruta por la de tu proyecto
      const response = await fetch(
        '/trackvelnew/gestionconductores/gestiondocs/api/upload-image',
        { method: 'POST', body: formData },
      );

      const result = await response.json();
      if (result.success) {
        return { id: result.imageId, url: result.imageUrl };
      } else {
        toast('Error al subir el documento', 'error');
        return null;
      }
    } catch {
      toast('Error al subir el documento', 'error');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  // ── Cloudflare: eliminar ──────────────────────────────────────────────────

  const deleteFromCloudflare = async (imageId: string) => {
    try {
      // TODO: Cambia la ruta por la de tu proyecto
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

  // ── OCR: procesar archivo ─────────────────────────────────────────────────

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setIsProcessing(true);
    setOcrProgress(0);

    try {
      let extractedText = '';

      if (file.type.startsWith('image/')) {
        const result = await Tesseract.recognize(file, 'spa', {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setOcrProgress(Math.round(m.progress * 100));
            }
          },
        });
        extractedText = result.data.text;
      } else if (file.type === 'application/pdf') {
        setOcrProgress(10);
        const arrayBuffer = await file.arrayBuffer();
        if (!window.pdfjsLib) throw new Error('PDF.js no está cargado');

        setOcrProgress(20);
        const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer })
          .promise;
        const page = await pdf.getPage(1);

        setOcrProgress(30);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport }).promise;
        setOcrProgress(50);

        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((b) => resolve(b!), 'image/png');
        });

        const result = await Tesseract.recognize(blob, 'spa', {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setOcrProgress(50 + Math.round(m.progress * 50));
            }
          },
        });
        extractedText = result.data.text;
      }

      const detectedDate = extractDateFromText(extractedText);
      if (detectedDate) {
        setOcrDate(detectedDate);
      } else {
        toast(
          'No se detectó fecha automáticamente. Ingrésala manualmente.',
          'warning',
        );
      }

      setIsProcessing(false);
      setOcrProgress(100);
    } catch {
      toast(
        'Error al procesar el documento. Ingresa la fecha manualmente.',
        'error',
      );
      setIsProcessing(false);
      setOcrProgress(0);
    }
  };

  // ── OCR: extraer fecha del texto ──────────────────────────────────────────

  const extractDateFromText = (text: string): string | null => {
    const keywords = [
      'vence',
      'vencimiento',
      'vigencia',
      'válido hasta',
      'expira',
    ];
    const monthNames: { [key: string]: number } = {
      enero: 1,
      febrero: 2,
      marzo: 3,
      abril: 4,
      mayo: 5,
      junio: 6,
      julio: 7,
      agosto: 8,
      septiembre: 9,
      octubre: 10,
      noviembre: 11,
      diciembre: 12,
    };
    const lines = text.split('\n');
    const dates: Array<{ date: Date; score: number }> = [];

    for (const line of lines) {
      const hasKeyword = keywords.some((k) => line.toLowerCase().includes(k));

      // DD/MM/YYYY o DD-MM-YYYY
      let match = line.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/);
      if (match) {
        const day = parseInt(match[1]),
          month = parseInt(match[2]),
          year = parseInt(match[3]);
        if (
          day >= 1 &&
          day <= 31 &&
          month >= 1 &&
          month <= 12 &&
          year >= 2020 &&
          year <= 2040
        ) {
          dates.push({
            date: new Date(year, month - 1, day),
            score: hasKeyword ? 10 : 5,
          });
        }
      }

      // DD de MMMM de YYYY
      match = line.match(/\b(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})\b/i);
      if (match) {
        const day = parseInt(match[1]);
        const month = monthNames[match[2].toLowerCase()];
        const year = parseInt(match[3]);
        if (month && day >= 1 && day <= 31 && year >= 2020 && year <= 2040) {
          dates.push({
            date: new Date(year, month - 1, day),
            score: hasKeyword ? 10 : 5,
          });
        }
      }

      // YYYY-MM-DD
      match = line.match(/\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/);
      if (match) {
        const year = parseInt(match[1]),
          month = parseInt(match[2]),
          day = parseInt(match[3]);
        if (
          day >= 1 &&
          day <= 31 &&
          month >= 1 &&
          month <= 12 &&
          year >= 2020 &&
          year <= 2040
        ) {
          dates.push({
            date: new Date(year, month - 1, day),
            score: hasKeyword ? 10 : 5,
          });
        }
      }
    }

    dates.sort((a, b) =>
      a.score !== b.score
        ? b.score - a.score
        : b.date.getTime() - a.date.getTime(),
    );

    if (dates.length > 0) {
      const d = dates[0].date;
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    return null;
  };

  // ── Guardar documento ─────────────────────────────────────────────────────

  const handleSaveDocument = async () => {
    if (status !== 'authenticated' || !username) {
      toast('Debes iniciar sesión para guardar documentos', 'error');
      return;
    }

    if ((!uploadedFile && !skipImage) || !tipoDocumento || !codtaxi) {
      toast('Completa todos los campos', 'warning');
      return;
    }

    let cloudflareResult: { id: string; url: string } | null = null;

    if (!skipImage && uploadedFile) {
      cloudflareResult = await uploadToCloudflare(uploadedFile);
      if (!cloudflareResult) {
        toast('Error al subir. Intenta nuevamente.', 'error');
        return;
      }
    }

    try {
      const response = await fetch(
        'https://do.velsat.pe:2083/api/Doc/Create',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            codtaxi: codtaxi,
            tipo_documento: tipoDocumento,
            archivo_url: cloudflareResult?.url || '',
            fecha_vencimiento: ocrDate ? new Date(ocrDate).toISOString() : null,
            observaciones: observaciones || '',
            usuario: username || '',
          }),
        },
      );

      if (!response.ok) throw new Error('Error al guardar en la base de datos');

      handleCloseModal();
      await fetchDocuments();
      toast('¡Documento guardado exitosamente!');
    } catch {
      toast('Error al guardar en la base de datos.', 'error');
      if (cloudflareResult?.id) await deleteFromCloudflare(cloudflareResult.id);
    }
  };

  // ── Eliminar documento ────────────────────────────────────────────────────

  const handleDeleteDocument = async () => {
    if (!docToDelete) return;
    setDeletingDocId(docToDelete.id);

    try {
      // TODO: Reemplaza esta URL con tu endpoint real
      const response = await fetch(
        `https://do.velsat.pe:2083/api/Doc/DeleteConductor?id=${docToDelete.id}`,
        { method: 'DELETE', headers: { 'Content-Type': 'application/json' } },
      );

      if (response.ok) {
        if (docToDelete.cloudflareImageId) {
          await deleteFromCloudflare(docToDelete.cloudflareImageId);
        }
        setDocuments(documents.filter((doc) => doc.id !== docToDelete.id));
        toast('Documento eliminado');
      } else {
        toast('Error al eliminar el documento', 'error');
      }
    } catch {
      toast('Error de conexión al eliminar el documento', 'error');
    } finally {
      setDeletingDocId(null);
      setShowDeleteDialog(false);
      setDocToDelete(null);
    }
  };

  // ── Acciones de tarjeta ───────────────────────────────────────────────────

  const handleViewDocument = (doc: Document) => {
    const url = doc.cloudflareImageUrl || doc.archivo_url;
    if (url) window.open(url, '_blank');
  };

  const handleDownloadDocument = async (doc: Document) => {
    const url = doc.cloudflareImageUrl || doc.archivo_url;
    if (!url) return;
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${doc.name.replace(/\s+/g, '_')}_${doc.id}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
    } catch {
      toast('Error al descargar el documento', 'error');
    }
  };

  // ── Reset modal ───────────────────────────────────────────────────────────

  const handleCloseModal = () => {
    setShowModal(false);
    setUploadedFile(null);
    setOcrDate('');
    setDocumentName('');
    setTipoDocumento('');
    setObservaciones('');
    setIsProcessing(false);
    setOcrProgress(0);
    setSkipImage(false);
  };

  // ── Helpers de UI ─────────────────────────────────────────────────────────

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'vencido':
        return 'border-red-500';
      case 'proximo':
        return 'border-yellow-500';
      case 'vigente':
        return 'border-green-500';
      case 'sin_vencimiento':
        return 'border-gray-300';
      default:
        return 'border-gray-300';
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      vencido: (
        <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
          <X className="h-3 w-3" /> Vencido
        </span>
      ),
      proximo: (
        <span className="inline-flex items-center gap-1 rounded-full border border-yellow-200 bg-yellow-50 px-3 py-1 text-xs font-medium text-yellow-700">
          ⚠ Próximo a vencer
        </span>
      ),
      vigente: (
        <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
          ✓ Vigente
        </span>
      ),
      sin_vencimiento: (
        <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-500">
          — Sin vencimiento
        </span>
      ),
    };
    return badges[status as keyof typeof badges];
  };

  // ── Filtrado ──────────────────────────────────────────────────────────────

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.fileName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <div className="mx-auto mb-8 max-w-7xl">
        <div className="mb-2 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Repositorio Central
            </h1>
            <p className="mt-1 text-gray-600">
              {nombre
                ? `Documentos de ${nombre}`
                : 'Administra tu documentación con Cloudflare Images'}
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            disabled={status !== 'authenticated'}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white shadow-lg shadow-indigo-200 transition-colors hover:bg-indigo-700"
          >
            <Upload className="h-5 w-5" />
            Cargar Documento
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="mx-auto mb-6 max-w-7xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-bold text-gray-900">Mis Documentos</h2>
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-gray-400" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Todos los estados</option>
            <option value="vencido">Vencido</option>
            <option value="proximo">Próximo a vencer</option>
            <option value="vigente">Vigente</option>
            <option value="sin_vencimiento">Sin vencimiento</option>
          </select>
        </div>
      </div>

      {/* Grid de documentos */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-indigo-600" />
              <p className="text-gray-600">Cargando documentos...</p>
            </div>
          </div>
        ) : error ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-600" />
              <p className="mb-2 font-semibold text-red-600">
                Error al cargar documentos
              </p>
              <p className="text-sm text-gray-600">{error}</p>
            </div>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="col-span-full py-12 text-center">
            <p className="text-gray-500">
              {documents.length === 0
                ? '¡Sube tu primer documento!'
                : 'No se encontraron documentos para esta unidad'}
            </p>
          </div>
        ) : (
          filteredDocuments.map((doc) => (
            <div
              key={doc.id}
              className={`rounded-xl border-t-4 bg-white shadow-sm ${getStatusColor(doc.status)} overflow-hidden transition-shadow hover:shadow-md`}
            >
              <div className="p-6">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100">
                    <svg
                      className="h-6 w-6 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  {getStatusBadge(doc.status)}
                </div>

                <h3 className="mb-2 text-lg font-bold text-gray-900">
                  {doc.name}
                </h3>

                {/* Preview imagen */}
                {doc.cloudflareImageUrl && (
                  <div className="mb-4 overflow-hidden rounded-lg border border-gray-200">
                    <img
                      src={doc.cloudflareImageUrl}
                      alt={doc.name}
                      className="h-32 w-full cursor-pointer object-cover transition-opacity hover:opacity-90"
                      onClick={() => handleViewDocument(doc)}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}

                {doc.expiryDate && (
                  <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>Vence:</span>
                    <span className="font-medium">
                      {doc.expiryDate.toLocaleDateString('es-PE', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                      })}
                    </span>
                  </div>
                )}

                {/* Barra de estado */}
                <div className="mb-3 h-1 rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full ${
                      doc.status === 'vencido'
                        ? 'bg-red-500'
                        : doc.status === 'proximo'
                          ? 'bg-yellow-500'
                          : doc.status === 'vigente'
                            ? 'bg-green-500'
                            : 'bg-gray-300'
                    }`}
                    style={{ width: '100%' }}
                  />
                </div>

                <p
                  className={`mb-4 text-xs font-semibold ${
                    doc.status === 'vencido'
                      ? 'text-red-600'
                      : doc.status === 'proximo'
                        ? 'text-yellow-600'
                        : 'text-green-600'
                  }`}
                >
                  {doc.daysMessage}
                </p>

                {doc.observaciones && (
                  <p className="mb-4 text-xs italic text-gray-500">
                    {doc.observaciones}
                  </p>
                )}

                {/* Acciones */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownloadDocument(doc)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <Download className="h-4 w-4" />
                    Bajar
                  </button>
                  <button
                    onClick={() => handleViewDocument(doc)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <Eye className="h-4 w-4" />
                    Ver
                  </button>
                  <button
                    onClick={() => {
                      setDocToDelete(doc);
                      setShowDeleteDialog(true);
                    }}
                    disabled={deletingDocId === doc.id}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  >
                    {deletingDocId === doc.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Modal: Cargar documento ──────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Cargar Documento
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6 p-6">
              {!codtaxi && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <p className="text-sm font-medium text-red-700">
                    ⚠️ No se detectó un codtaxi.
                  </p>
                </div>
              )}

              {/* Toggle: omitir imagen */}
              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <span className="text-sm font-medium text-gray-700">
                  Subir imagen del documento
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSkipImage((v) => !v);
                    setUploadedFile(null);
                    setOcrDate('');
                    setOcrProgress(0);
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    skipImage ? 'bg-gray-300' : 'bg-indigo-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      skipImage ? 'translate-x-1' : 'translate-x-6'
                    }`}
                  />
                </button>
              </div>

              {/* Upload de archivo — solo si NO se omite */}
              {!skipImage && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Imagen (JPG o PNG)
                  </label>
                  <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center transition-colors hover:border-indigo-500">
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Upload className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                      <p className="text-sm text-gray-600">
                        {uploadedFile ? (
                          <span className="font-medium text-indigo-600">
                            {uploadedFile.name}
                          </span>
                        ) : (
                          <>
                            <span className="font-medium text-indigo-600">
                              Haz clic para subir
                            </span>{' '}
                            o arrastra el archivo
                          </>
                        )}
                      </p>
                    </label>
                  </div>
                </div>
              )}

              {/* Progreso OCR */}
              {isProcessing && (
                <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
                  <div className="mb-2 flex items-center gap-3">
                    <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-indigo-600" />
                    <p className="text-sm font-medium text-indigo-700">
                      Procesando con OCR... {ocrProgress}%
                    </p>
                  </div>
                  <div className="h-2 w-full rounded-full bg-indigo-200">
                    <div
                      className="h-2 rounded-full bg-indigo-600 transition-all duration-300"
                      style={{ width: `${ocrProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Progreso subida */}
              {isUploading && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-green-600" />
                    <p className="text-sm font-medium text-green-700">
                      Subiendo a Cloudflare...
                    </p>
                  </div>
                </div>
              )}

              {/* Campos: siempre visibles si skipImage, o si ya hay archivo */}
              {(skipImage || uploadedFile) && !isProcessing && (
                <>
                  {/* Tipo de documento */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Tipo de Documento
                    </label>
                    <select
                      value={tipoDocumento}
                      onChange={(e) => setTipoDocumento(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Selecciona un tipo</option>
                      <option value="DNI">DNI</option>
                      <option value="LICENCIA DE CONDUCIR">LICENCIA DE CONDUCIR</option>
                      <option value="ANTECEDENTES POLICIALES">ANTECEDENTES POLICIALES</option>
                      <option value="ANTECEDENTES PENALES">ANTECEDENTES PENALES</option>
                      <option value="CERTIFICADO MÉDICO">CERTIFICADO MÉDICO</option>
                    </select>
                  </div>

                  {/* Observaciones */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Observaciones{' '}
                      <span className="font-normal text-gray-400">
                        (Opcional)
                      </span>
                    </label>
                    <textarea
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      placeholder="Ej: Documento renovado, Pendiente de actualización, etc."
                      rows={3}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Fecha de vencimiento */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Fecha de Vencimiento{' '}
                      <span className="font-normal text-gray-400">
                        (Opcional)
                      </span>
                    </label>
                    {ocrDate && !skipImage && (
                      <div className="mb-2 rounded-lg border border-green-200 bg-green-50 p-3">
                        <p className="text-sm text-green-700">
                          ✓ Fecha detectada automáticamente por OCR. Puedes
                          modificarla si es incorrecta.
                        </p>
                      </div>
                    )}
                    <input
                      type="date"
                      value={ocrDate}
                      onChange={(e) => setOcrDate(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                    />
                    {ocrDate && (
                      <button
                        type="button"
                        onClick={() => setOcrDate('')}
                        className="mt-1 text-xs text-gray-400 hover:text-gray-600"
                      >
                        × Quitar fecha
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-200 p-6">
              <button
                onClick={handleCloseModal}
                className="rounded-lg border border-gray-300 px-6 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveDocument}
                disabled={
                  (!uploadedFile && !skipImage) ||
                  !tipoDocumento ||
                  isProcessing ||
                  isUploading
                }
                className="rounded-lg bg-indigo-600 px-6 py-2 font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                Guardar Documento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Confirmar eliminación ─────────────────────────────────────── */}
      {showDeleteDialog && docToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900">
                Confirmar Eliminación
              </h2>
            </div>
            <div className="p-6">
              <p className="text-gray-700">
                ¿Estás seguro de que deseas eliminar el documento{' '}
                <span className="font-bold">{docToDelete.name}</span>?
              </p>
              <p className="mt-2 text-sm text-red-600">
                Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-200 p-6">
              <button
                onClick={() => {
                  setShowDeleteDialog(false);
                  setDocToDelete(null);
                }}
                disabled={deletingDocId !== null}
                className="rounded-lg border border-gray-300 px-6 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteDocument}
                disabled={deletingDocId !== null}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-6 py-2 font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {deletingDocId ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Eliminar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

export default DocumentManagement;
