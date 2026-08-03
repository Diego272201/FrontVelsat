'use client';

import React, { useState, useEffect } from 'react';
import {
  Upload,
  Search,
  Download,
  Eye,
  Trash2,
  Calendar,
  Loader2,
  AlertCircle,
  FileText,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import Tesseract from 'tesseract.js';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import BaseModal from '@/app/components/ui/BaseModal';
import { Toaster, toast } from 'sonner';

interface Document {
  id: string;
  name: string;
  fileName: string;
  size: number;
  expiryDate: Date | null;
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

const DocumentManagement = () => {
  const { data: session, status } = useSession();
  const username = session?.user?.username || '';

  const searchParams = useSearchParams();
  const deviceID = searchParams.get('deviceID');

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [ocrDate, setOcrDate] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [skipImage, setSkipImage] = useState(false);

  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
  const [docToDelete, setDocToDelete] = useState<Document | null>(null);

  const [tipoDocumento, setTipoDocumento] = useState<string>('');
  const [observaciones, setObservaciones] = useState<string>('');

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
    if (diffDays < 0) return `Vencido hace ${Math.abs(diffDays)} días`;
    if (diffDays <= 30) return `Faltan ${diffDays} días para vencer`;
    return 'Vigente';
  };

  const uploadToCloudflare = async (file: File) => {
    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        '/trackvelnew/gestionunidades/gestiondocs/api/upload-image',
        {
          method: 'POST',
          body: formData,
        },
      );

      const result = await response.json();
      if (result.success) {
        return {
          id: result.imageId,
          url: result.imageUrl,
        };
      } else {
        toast.error('Error al subir el documento');
        return null;
      }
    } catch (error) {
      toast.error('Error al subir el documento');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const deleteFromCloudflare = async (imageId: string) => {
    try {
      const response = await fetch(
        '/trackvelnew/gestionunidades/gestiondocs/api/delete-image',
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageId }),
        },
      );
      const result = await response.json();
      return result.success;
    } catch (error) {
      return false;
    }
  };

  // Cargar PDF.js
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
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const fetchDocuments = async () => {
    if (!deviceID) {
      setError('No se proporcionó el código de unidad (deviceID) en la URL');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `https://do.velsat.pe:2083/api/Doc/GetByDeviceID?deviceID=${deviceID}`,
      );

      if (!response.ok) {
        setDocuments([]);
        return;
      }

      const result = await response.json();

      const docArray = result?.data || (Array.isArray(result) ? result : []);

      if (Array.isArray(docArray) && docArray.length > 0) {
        const mappedDocuments: Document[] = docArray.map(
          (doc: DocumentAPI) => {
            const expiryDate = doc.fecha_vencimiento
              ? new Date(doc.fecha_vencimiento)
              : null;
            const status = calculateStatus(expiryDate);

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
              expiryDate: expiryDate,
              status: status,
              daysMessage: calculateDaysMessage(expiryDate),
              archivo_url: imageUrl,
              observaciones: doc.observaciones,
              cloudflareImageId: imageUrl ? imageUrl.split('/').slice(-2, -1)[0] || '' : '',
              cloudflareImageUrl: imageUrl,
            };
          },
        );

        setDocuments(mappedDocuments);
      } else {
        setDocuments([]);
      }
    } catch (err: unknown) {
      console.log('Error o sin documentos para deviceID:', deviceID, err);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [deviceID]);

  const handleDeleteDocument = async () => {
    if (!docToDelete) return;

    setDeletingDocId(docToDelete.id);

    try {
      const response = await fetch(
        `https://do.velsat.pe:2083/api/Doc/DeleteDocUnidad?id=${docToDelete.id}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.ok) {
        if (docToDelete.cloudflareImageId) {
          await deleteFromCloudflare(docToDelete.cloudflareImageId);
        }

        setDocuments(documents.filter((doc) => doc.id !== docToDelete.id));
        toast.success('Documento eliminado correctamente');
      } else {
        toast.error('Error al eliminar el documento');
      }
    } catch (error) {
      console.error('Error al eliminar documento:', error);
      toast.error('Error de conexión al eliminar el documento');
    } finally {
      setDeletingDocId(null);
      setShowDeleteDialog(false);
      setDocToDelete(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'vencido':
        return 'border-red-500 bg-red-50/20';
      case 'proximo':
        return 'border-amber-500 bg-amber-50/20';
      case 'vigente':
        return 'border-emerald-500 bg-emerald-50/20';
      case 'sin_vencimiento':
        return 'border-slate-300 bg-slate-50/20';
      default:
        return 'border-slate-300';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'vencido':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-[11px] font-semibold text-red-700">
            <AlertCircle className="h-3 w-3" />
            Vencido
          </span>
        );
      case 'proximo':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
            <AlertTriangle className="h-3 w-3" />
            Próximo a vencer
          </span>
        );
      case 'vigente':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
            <CheckCircle className="h-3 w-3" />
            Vigente
          </span>
        );
      case 'sin_vencimiento':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
            Sin vencimiento
          </span>
        );
    }
  };

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
      }

      if (extractedText) {
        const detectedDate = findExpiryDateInText(extractedText);
        if (detectedDate) {
          setOcrDate(detectedDate);
          toast.success('Fecha de vencimiento detectada automáticamente');
        }
      }
    } catch (err) {
      console.error('Error en OCR:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const findExpiryDateInText = (text: string): string | null => {
    const dateRegexes = [
      /(?:vencimiento|vence|hasta|vigencia)[:\s]*(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})/i,
      /(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})/,
    ];

    for (const regex of dateRegexes) {
      const match = text.match(regex);
      if (match) {
        const day = match[1].padStart(2, '0');
        const month = match[2].padStart(2, '0');
        let year = match[3];
        if (year.length === 2) year = `20${year}`;
        return `${year}-${month}-${day}`;
      }
    }
    return null;
  };

  const handleSaveDocument = async () => {
    if (status !== 'authenticated' || !username) {
      toast.error('Debes iniciar sesión para guardar documentos');
      return;
    }

    if ((!uploadedFile && !skipImage) || !tipoDocumento || !deviceID) {
      toast.warning('Completa todos los campos requeridos');
      return;
    }

    let cloudflareResult: { id: string; url: string } | null = null;

    if (!skipImage && uploadedFile) {
      cloudflareResult = await uploadToCloudflare(uploadedFile);
      if (!cloudflareResult) {
        toast.error('Error al subir el archivo. Intenta nuevamente.');
        return;
      }
    }

    try {
      const response = await fetch(
        'https://do.velsat.pe:2083/api/Doc/CreateDocUnidad',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            deviceID: deviceID,
            tipo_documento: tipoDocumento,
            archivo_url: cloudflareResult?.url || '',
            fecha_vencimiento: ocrDate ? new Date(ocrDate).toISOString() : null,
            observaciones: observaciones || '',
            usuario: username || '',
          }),
        },
      );

      if (!response.ok) {
        throw new Error('Error al guardar en la base de datos');
      }

      handleCloseModal();
      await fetchDocuments();
      toast.success('¡Documento guardado exitosamente!');
    } catch (error) {
      console.error('Error al guardar documento:', error);
      toast.error('Error al guardar el documento en la base de datos.');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setUploadedFile(null);
    setOcrDate('');
    setTipoDocumento('');
    setObservaciones('');
    setIsProcessing(false);
    setSkipImage(false);
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.fileName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 font-sans">
      <Toaster richColors position="top-right" />

      {/* Top Banner / Title */}
      <div className="mx-auto mb-6 max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl bg-white border border-slate-200 p-5 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-[#113eb9]">
                <FileText className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-lg font-bold text-slate-800 uppercase tracking-wide">
                  GESTIÓN DE DOCUMENTOS
                </h1>
                <p className="text-xs text-slate-500">
                  {deviceID
                    ? `Documentación asignada a la unidad ${deviceID}`
                    : 'Administra y organiza los documentos legales de la unidad'}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowModal(true)}
            disabled={status !== 'authenticated'}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brandSecondary px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:bg-brandSecondary-hover disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            Cargar Documento
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="mx-auto mb-6 max-w-7xl rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por tipo de documento..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#113eb9] focus:outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 w-full sm:w-[180px] rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-800 focus:border-[#113eb9] focus:outline-none"
          >
            <option value="all">Todos los estados</option>
            <option value="vencido">Vencido</option>
            <option value="proximo">Próximo a vencer</option>
            <option value="vigente">Vigente</option>
            <option value="sin_vencimiento">Sin vencimiento</option>
          </select>
        </div>
      </div>

      {/* Documents Grid */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full flex items-center justify-center py-16">
            <div className="text-center">
              <Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-[#113eb9]" />
              <p className="text-xs font-medium text-slate-600">Cargando documentos de la unidad...</p>
            </div>
          </div>
        ) : error ? (
          <div className="col-span-full flex items-center justify-center py-16">
            <div className="text-center">
              <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-600" />
              <p className="mb-1 text-xs font-bold text-red-600">Error al cargar documentos</p>
              <p className="text-xs text-slate-500">{error}</p>
            </div>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="col-span-full flex items-center justify-center py-16 bg-white rounded-xl border border-slate-200">
            <div className="text-center">
              <FileText className="mx-auto mb-2 h-10 w-10 text-slate-300" />
              <p className="text-xs font-medium text-slate-500">
                No se encontraron documentos registrados para esta unidad
              </p>
            </div>
          </div>
        ) : (
          filteredDocuments.map((doc) => (
            <div
              key={doc.id}
              className={`rounded-xl border-t-4 bg-white shadow-xs border border-slate-200 ${getStatusColor(
                doc.status,
              )} overflow-hidden transition-all hover:shadow-md flex flex-col justify-between`}
            >
              <div className="p-4">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-[#113eb9] border border-blue-100 flex-shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>{getStatusBadge(doc.status)}</div>
                </div>

                <h3 className="mb-2 text-xs font-bold text-slate-800 uppercase tracking-wide">
                  {doc.name}
                </h3>

                {/* Preview de la imagen */}
                {doc.cloudflareImageUrl ? (
                  <div className="mb-3 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                    <img
                      src={doc.cloudflareImageUrl}
                      alt={doc.name}
                      className="h-36 w-full cursor-pointer object-cover transition-transform hover:scale-105"
                      onClick={() =>
                        window.open(doc.cloudflareImageUrl, '_blank')
                      }
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                ) : null}

                {doc.expiryDate && (
                  <div className="mb-2 flex items-center gap-1.5 text-xs text-slate-600">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>Vence:</span>
                    <span className="font-semibold text-slate-800">
                      {doc.expiryDate.toLocaleDateString('es-PE', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                      })}
                    </span>
                  </div>
                )}

                <p
                  className={`mb-2 text-[11px] font-semibold ${
                    doc.status === 'vencido'
                      ? 'text-red-600'
                      : doc.status === 'proximo'
                        ? 'text-amber-600'
                        : doc.status === 'vigente'
                          ? 'text-emerald-600'
                          : 'text-slate-400'
                  }`}
                >
                  {doc.daysMessage}
                </p>

                {doc.observaciones && (
                  <p className="mb-3 text-[11px] italic text-slate-500 bg-slate-50 p-2 rounded border border-slate-100">
                    {doc.observaciones}
                  </p>
                )}
              </div>

              <div className="border-t border-slate-100 bg-slate-50/60 p-3 flex items-center gap-2">
                <button
                  onClick={async () => {
                    if (!doc.cloudflareImageUrl && !doc.archivo_url) return;

                    try {
                      const url = doc.cloudflareImageUrl || doc.archivo_url;
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
                    } catch (error) {
                      console.error('Error al descargar:', error);
                      toast.error('Error al descargar el documento');
                    }
                  }}
                  className="flex flex-1 items-center justify-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
                >
                  <Download className="h-3.5 w-3.5 text-slate-500" />
                  Descargar
                </button>

                <a
                  href={doc.cloudflareImageUrl || doc.archivo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
                >
                  <Eye className="h-3.5 w-3.5 text-slate-500" />
                  Ver
                </a>

                <button
                  onClick={() => {
                    setDocToDelete(doc);
                    setShowDeleteDialog(true);
                  }}
                  disabled={deletingDocId === doc.id}
                  className="flex items-center justify-center rounded-md border border-red-200 bg-red-50 p-1.5 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                  title="Eliminar documento"
                >
                  {deletingDocId === doc.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Upload Modal (BaseModal) */}
      <BaseModal
        isOpen={showModal}
        onClose={handleCloseModal}
        title="CARGAR NUEVO DOCUMENTO"
        subtitle={deviceID ? `Unidad: ${deviceID}` : undefined}
        icon={<Upload className="h-4 w-4 text-[#113eb9]" />}
        iconBgColor="bg-blue-100"
        size="2xl"
        onConfirm={handleSaveDocument}
        onCancel={handleCloseModal}
        confirmText="Guardar Documento"
        cancelText="Cancelar"
        isConfirmDisabled={
          (!uploadedFile && !skipImage) ||
          !tipoDocumento ||
          isProcessing ||
          isUploading
        }
        isLoading={isUploading}
      >
        <div className="space-y-4 text-xs">
          {!deviceID && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-red-700">
              ⚠️ No se detectó un deviceID. Asegúrate de acceder desde el botón Documentos de una unidad.
            </div>
          )}

          {/* Toggle: omitir imagen */}
          <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5">
            <span className="font-medium text-slate-700">
              Subir archivo/imagen del documento
            </span>
            <button
              type="button"
              onClick={() => {
                setSkipImage((v) => !v);
                setUploadedFile(null);
                setOcrDate('');
                setOcrProgress(0);
              }}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                skipImage ? 'bg-slate-300' : 'bg-[#113eb9]'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                  skipImage ? 'translate-x-1' : 'translate-x-4.5'
                }`}
              />
            </button>
          </div>

          {/* Upload Dropzone */}
          {!skipImage && (
            <div>
              <label className="mb-1 block font-semibold text-slate-700">
                Imagen o PDF
              </label>
              <div className="rounded-lg border-2 border-dashed border-slate-300 p-6 text-center transition-colors hover:border-[#113eb9] bg-white">
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                  <Upload className="mb-2 h-8 w-8 text-slate-400" />
                  <p className="text-xs text-slate-600">
                    {uploadedFile ? (
                      <span className="font-semibold text-[#113eb9]">
                        {uploadedFile.name}
                      </span>
                    ) : (
                      <>
                        <span className="font-semibold text-[#113eb9]">
                          Haz clic para subir
                        </span>{' '}
                        o arrastra el archivo aquí
                      </>
                    )}
                  </p>
                </label>
              </div>
            </div>
          )}

          {/* Processing Indicator */}
          {isProcessing && (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
              <div className="mb-1.5 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-[#113eb9]" />
                <p className="font-medium text-[#113eb9]">
                  Procesando con OCR... {ocrProgress}%
                </p>
              </div>
              <div className="h-1.5 w-full rounded-full bg-blue-200">
                <div
                  className="h-1.5 rounded-full bg-[#113eb9] transition-all duration-300"
                  style={{ width: `${ocrProgress}%` }}
                />
              </div>
            </div>
          )}

          {(skipImage || uploadedFile) && !isProcessing && (
            <>
              {/* Tipo de Documento */}
              <div>
                <label className="mb-1 block font-semibold text-slate-700">
                  Tipo de Documento <span className="text-red-500">*</span>
                </label>
                <select
                  value={tipoDocumento}
                  onChange={(e) => setTipoDocumento(e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-800 focus:border-[#113eb9] focus:outline-none"
                >
                  <option value="">Selecciona un tipo</option>
                  <option value="TARJETA DE PROPIEDAD">TARJETA DE PROPIEDAD</option>
                  <option value="SOAT">SOAT</option>
                  <option value="REVISIÓN TÉCNICA">REVISIÓN TÉCNICA</option>
                  <option value="PÓLIZA DE SEGURO">PÓLIZA DE SEGURO</option>
                </select>
              </div>

              {/* Observaciones */}
              <div>
                <label className="mb-1 block font-semibold text-slate-700">
                  Observaciones <span className="font-normal text-slate-400">(Opcional)</span>
                </label>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Ej: Documento renovado, Pendiente de actualización, etc."
                  rows={2}
                  className="w-full rounded-md border border-slate-300 bg-white p-2 text-xs text-slate-800 focus:border-[#113eb9] focus:outline-none"
                />
              </div>

              {/* Fecha de vencimiento */}
              <div>
                <label className="mb-1 block font-semibold text-slate-700">
                  Fecha de Vencimiento <span className="font-normal text-slate-400">(Opcional)</span>
                </label>
                {ocrDate && !skipImage && (
                  <div className="mb-2 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-emerald-700">
                    ✓ Fecha detectada automáticamente por OCR. Puedes modificarla si es necesario.
                  </div>
                )}
                <input
                  type="date"
                  value={ocrDate}
                  onChange={(e) => setOcrDate(e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-800 focus:border-[#113eb9] focus:outline-none"
                />
              </div>
            </>
          )}
        </div>
      </BaseModal>

      {/* Delete Confirmation Modal (BaseModal) */}
      <BaseModal
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setDocToDelete(null);
        }}
        title="CONFIRMAR ELIMINACIÓN"
        icon={<AlertCircle className="h-4 w-4 text-red-600" />}
        iconBgColor="bg-red-100"
        size="md"
        onConfirm={handleDeleteDocument}
        onCancel={() => {
          setShowDeleteDialog(false);
          setDocToDelete(null);
        }}
        confirmText="Eliminar"
        cancelText="Cancelar"
        confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
        confirmIcon={<Trash2 className="h-3.5 w-3.5" />}
        isLoading={deletingDocId !== null}
        loadingText="Eliminando..."
      >
        <div className="text-xs text-slate-700">
          <p>
            ¿Estás seguro de que deseas eliminar el documento{' '}
            <span className="font-bold text-slate-900">{docToDelete?.name}</span>?
          </p>
          <p className="mt-2 text-red-600 font-semibold">
            Esta acción no se puede deshacer.
          </p>
        </div>
      </BaseModal>
    </div>
  );
};

export default DocumentManagement;
