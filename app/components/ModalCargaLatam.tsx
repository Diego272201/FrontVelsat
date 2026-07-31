'use client';
import React, { useState, useRef, useMemo } from 'react';
import { toast, Toaster } from 'sonner';
import '@/app/styles/sonner.css';
import {
  XMarkIcon,
} from '@heroicons/react/24/outline';
import * as XLSX from 'xlsx';
import { AlertTriangle, Briefcase, CheckCircle, FileSpreadsheet, Upload, Users, X } from 'lucide-react';
import BaseModal from '@/app/components/ui/BaseModal';

interface LatamPassenger {
  idunico: string;
  fecha: string;
  accion: string;
  proveedor: string;
  hora_llegada: string;
  hora_parada: string;
  bp: string;
  nombre: string;
  celular: string;
  direccion: string;
  comuna: string;
  lat: string;
  long: string;
  depot: string;
  numero_vuelo: string;
  pasajeros: string;
  orden: string;
}

type LatamGroup = LatamPassenger[];

interface AppModalCargaLatamProps {
  isOpen: boolean;
  onClose: () => void;
  titulo: string;
  useSelectAll?: boolean;
  icono?: React.ReactNode;
}

const AppModalCargaLatam: React.FC<AppModalCargaLatamProps> = ({
  isOpen,
  onClose,
  titulo,
  useSelectAll = false,
  icono,
}) => {
  const [archivoExcel, setArchivoExcel] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [processedGroups, setProcessedGroups] = useState<LatamGroup[]>([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);


  const [uploadProgress, setUploadProgress] = useState({
  current: 0,
  total: 0,
  percentage: 0,
});
const [showReportModal, setShowReportModal] = useState(false);
const [uploadReport, setUploadReport] = useState({
  success: 0,
  failed: 0,
  total: 0,
});

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const previewGroups = useMemo(() => {
    return showPreviewModal && processedGroups.length > 0 
      ? [...processedGroups] 
      : [];
  }, [showPreviewModal, processedGroups]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file: File) => {
    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    const isValidType =
      validTypes.includes(file.type) ||
      file.name.toLowerCase().endsWith('.xlsx') ||
      file.name.toLowerCase().endsWith('.xls');

    if (isValidType) {
      setArchivoExcel(file);
      toast.success(`Archivo ${file.name} cargado exitosamente`, {
        className: 'toast-slide-in',
        richColors: true,
      });
    } else {
      toast.error('Solo se permiten archivos Excel (.xlsx o .xls)', {
        className: 'toast-slide-in',
        richColors: true,
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  const handleCargarArchivo = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const excelSerialToDate = (serial: any): string => {
    if (!serial) return '';

    if (typeof serial === 'string') {
      // Formato DD-MM-YYYY (con guiones)
      const dashDateMatch = serial.match(/^(\d{2})-(\d{2})-(\d{4})/);
      if (dashDateMatch) {
        const [, day, month, year] = dashDateMatch;
        return `${day}/${month}/${year}`;
      }

      // Formato ISO: YYYY-MM-DD
      const isoDateMatch = serial.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (isoDateMatch) {
        const [, year, month, day] = isoDateMatch;
        return `${day}/${month}/${year}`;
      }

      // Ya está en formato DD/MM/YYYY
      if (serial.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        return serial;
      }

      const date = new Date(serial);
      if (!isNaN(date.getTime())) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      }

      return '';
    }

    if (typeof serial === 'number') {
      const excelEpoch = new Date(1900, 0, 1);
      const daysOffset = serial - 2;
      const date = new Date(
        excelEpoch.getTime() + daysOffset * 24 * 60 * 60 * 1000
      );

      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();

      return `${day}/${month}/${year}`;
    }

    if (serial instanceof Date && !isNaN(serial.getTime())) {
      const day = String(serial.getDate()).padStart(2, '0');
      const month = String(serial.getMonth() + 1).padStart(2, '0');
      const year = serial.getFullYear();
      return `${day}/${month}/${year}`;
    }

    return '';
  };

  const excelTimeToString = (time: any): string => {
    if (!time) return '00:00';

    if (typeof time === 'string') {
      if (time.match(/^\d{2}:\d{2}(:\d{2})?$/)) {
        return time.substring(0, 5);
      }
      return time;
    }

    if (typeof time === 'number') {
      const totalMinutes = Math.round(time * 24 * 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }

    return '00:00';
  };

  const normalizeCoordinate = (coord: any): string => {
    if (!coord) return '';
    const coordStr = String(coord).trim();
    return coordStr.replace(',', '.');
  };

  const getColumnIndexByName = (headers: any[], columnName: string): number => {
    const normalizedName = columnName.toLowerCase().trim();
    const index = headers.findIndex(
      (header) =>
        header && String(header).toLowerCase().trim() === normalizedName
    );
    
    // Log para debug
    if (columnName.toLowerCase() === 'fecha') {
      console.log('🔍 Buscando columna FECHA:');
      console.log('Headers disponibles:', headers);
      console.log('Índice encontrado:', index);
    }
    
    return index;
  };

  const handleCargarDatos = async () => {
    if (!archivoExcel) {
      toast.error('Por favor, selecciona un archivo Excel primero', {
        className: 'toast-slide-in',
        richColors: true,
      });
      return;
    }

    setIsProcessing(true);

    const loadingToastId = toast.loading('Procesando archivo Excel...', {
      className: 'toast-slide-in',
    });

    try {
      const data = await archivoExcel.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });

      const sheetName = workbook.SheetNames[0];

      if (!sheetName) {
        toast.error('El archivo no tiene hojas', {
          id: loadingToastId,
          className: 'toast-slide-in',
          richColors: true,
        });
        setIsProcessing(false);
        return;
      }

      const worksheet = workbook.Sheets[sheetName];
      const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
      });

      if (jsonData.length < 2) {
        toast.error('El archivo no tiene datos', {
          id: loadingToastId,
          className: 'toast-slide-in',
          richColors: true,
        });
        setIsProcessing(false);
        return;
      }

      const headers = jsonData[0];

      console.log('Headers encontrados:', headers);

      const colIndices = {
        idunico: getColumnIndexByName(headers, 'Id unico'),
        fecha: getColumnIndexByName(headers, 'Fecha'),
        accion: getColumnIndexByName(headers, 'Accion'),
        proveedor: getColumnIndexByName(headers, 'Proveedor'),
        hora_llegada: getColumnIndexByName(headers, 'Hora llegada'),
        hora_parada: getColumnIndexByName(headers, 'Hora parada'),
        bp: getColumnIndexByName(headers, 'BP'),
        nombre: getColumnIndexByName(headers, 'Nombre'),
        pasajeros: getColumnIndexByName(headers, 'Pasajeros'),
        orden: getColumnIndexByName(headers, 'Orden'),
        direccion: getColumnIndexByName(headers, 'Direccion'),
        comuna: getColumnIndexByName(headers, 'Comuna'),
        celular: getColumnIndexByName(headers, 'Celular'),
        lat: getColumnIndexByName(headers, 'Lat'),
        long: getColumnIndexByName(headers, 'Long'),
        depot: getColumnIndexByName(headers, 'Depot'),
        numero_vuelo: getColumnIndexByName(headers, 'Numero vuelo'),
      };

      console.log('Índices de columnas:', colIndices);
      console.log('🔍 Índice de FECHA:', colIndices.fecha);
      console.log('🔍 Valor primera fila FECHA:', jsonData[1]?.[colIndices.fecha]);

      const missingColumns = Object.entries(colIndices)
        .filter(([key, value]) => value === -1 && key !== 'numero_vuelo')
        .map(([key]) => key);

      if (missingColumns.length > 0) {
        toast.error(`Columnas faltantes: ${missingColumns.join(', ')}`, {
          id: loadingToastId,
          className: 'toast-slide-in',
          richColors: true,
        });
        setIsProcessing(false);
        return;
      }

      const records: LatamPassenger[] = [];

      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];

        const idunico = row[colIndices.idunico];

        if (!idunico || idunico === '') {
          break;
        }

        const accionRaw = row[colIndices.accion]
          ? String(row[colIndices.accion]).toLowerCase().trim()
          : '';
        const accion = accionRaw === 'zarpe' ? 'S' : 'I';

        // Debug para la primera fila
        if (i === 1) {
          console.log('DEBUG PRIMERA FILA:');
          console.log('Fila completa:', row);
          console.log('Valor en colIndices.fecha:', row[colIndices.fecha]);
          console.log('Tipo de dato:', typeof row[colIndices.fecha]);
          console.log('Fecha convertida:', excelSerialToDate(row[colIndices.fecha]));
        }

        const record: LatamPassenger = {
          idunico: String(idunico || ''),
          fecha: excelSerialToDate(row[colIndices.fecha]),
          accion: accion,
          proveedor: String(row[colIndices.proveedor] || ''),
          hora_llegada: excelTimeToString(row[colIndices.hora_llegada]),
          hora_parada: excelTimeToString(row[colIndices.hora_parada]),
          bp: String(row[colIndices.bp] || ''),
          nombre: String(row[colIndices.nombre] || ''),
          celular: String(row[colIndices.celular] || ''),
          direccion: String(row[colIndices.direccion] || ''),
          comuna: String(row[colIndices.comuna] || ''),
          lat: normalizeCoordinate(row[colIndices.lat]),
          long: normalizeCoordinate(row[colIndices.long]),
          depot: String(row[colIndices.depot] || ''),
          numero_vuelo: String(row[colIndices.numero_vuelo] || ''),
          pasajeros: String(row[colIndices.pasajeros] || ''),
          orden: String(row[colIndices.orden] || ''),
        };

        records.push(record);
      }

      console.log(`Total de registros procesados: ${records.length}`);

      const groupedMap = new Map<string, LatamPassenger[]>();

      records.forEach((record) => {
        const key = record.idunico;
        if (!groupedMap.has(key)) {
          groupedMap.set(key, []);
        }
        groupedMap.get(key)!.push(record);
      });

      const groups: LatamGroup[] = Array.from(groupedMap.values());

      console.log(`Total de grupos creados: ${groups.length}`);
      console.log('Vista previa de grupos:', groups.slice(0, 2));

      setProcessedGroups(groups);
      setIsProcessing(false);
      setShowPreviewModal(true);

      toast.success(
        `Procesados ${records.length} registros en ${groups.length} servicios`,
        {
          id: loadingToastId,
          className: 'toast-slide-in',
          richColors: true,
        }
      );
    } catch (error) {
      console.error('Error al procesar el archivo:', error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Error desconocido al procesar los datos';

      toast.error(`Error: ${errorMessage}`, {
        id: loadingToastId,
        className: 'toast-slide-in',
        richColors: true,
      });
      setIsProcessing(false);
    }
  };

const handleEnviarDatos = async () => {
  setIsSending(true);
  setShowPreviewModal(false);

  try {
    const username = 'movilbus';
    const API_URL = `https://do.velsat.pe:2083/api/Preplan/insertLatam?usuario=${username}`;
    const BATCH_SIZE = 10;
    const CONCURRENT_REQUESTS = 3;

    let successCount = 0;
    let failedCount = 0;
    let processedCount = 0;

    const batches: LatamGroup[][] = [];
    for (let i = 0; i < processedGroups.length; i += BATCH_SIZE) {
      batches.push(processedGroups.slice(i, i + BATCH_SIZE));
    }

    // Inicializar progreso
    setUploadProgress({
      current: 0,
      total: batches.length,
      percentage: 0,
    });

    console.log('========================================');
    console.log('INICIANDO ENVÍO A LA API');
    console.log('========================================');
    console.log('URL:', API_URL);
    console.log('Total de servicios:', processedGroups.length);
    console.log('Número de lotes:', batches.length);
    console.log('========================================\n');

    for (let i = 0; i < batches.length; i += CONCURRENT_REQUESTS) {
      const currentBatches = batches.slice(i, i + CONCURRENT_REQUESTS);

      const promises = currentBatches.map(async (batch, batchIndex) => {
        const actualBatchNumber = i + batchIndex + 1;

        console.log(`\nEnviando Lote ${actualBatchNumber}/${batches.length}`);
        console.log('Datos a enviar:', JSON.stringify(batch, null, 2));

        try {
          const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(batch),
          });

          console.log(`Lote ${actualBatchNumber} - Status:`, response.status);
          console.log(`Lote ${actualBatchNumber} - OK:`, response.ok);

          if (response.ok) {
            const responseData = await response.json();
            console.log(`Lote ${actualBatchNumber} - Respuesta:`, responseData);

            let batchSuccess = 0;
            let batchFailed = 0;

            if (responseData.serviciosProcesados !== undefined) {
              batchSuccess = responseData.serviciosProcesados || 0;
              batchFailed = responseData.serviciosConError || 0;
            } else if (responseData.exitoso === true) {
              batchSuccess = batch.length;
              batchFailed = 0;
            } else if (responseData.exitoso === false) {
              batchSuccess = 0;
              batchFailed = batch.length;
            } else {
              batchSuccess = batch.length;
              batchFailed = 0;
            }

            console.log(
              `Lote ${actualBatchNumber} - Exitosos: ${batchSuccess},  Fallidos: ${batchFailed}`
            );

            return { success: batchSuccess, failed: batchFailed };
          } else {
            const errorText = await response.text();
            console.error(`Lote ${actualBatchNumber} - Error:`, errorText);
            return { success: 0, failed: batch.length };
          }
        } catch (error) {
          console.error(`Lote ${actualBatchNumber} - Exception:`, error);
          return { success: 0, failed: batch.length };
        }
      });

      const results = await Promise.all(promises);

      results.forEach((result) => {
        successCount += result.success;
        failedCount += result.failed;
        processedCount += result.success + result.failed;
      });

      // Actualizar progreso
      const batchesProcessed = Math.min(i + CONCURRENT_REQUESTS, batches.length);
      setUploadProgress({
        current: batchesProcessed,
        total: batches.length,
        percentage: Math.round((batchesProcessed / batches.length) * 100),
      });

      console.log(
        `\n Progreso: ${processedCount}/${processedGroups.length} servicios procesados (✅ ${successCount} exitosos, ❌ ${failedCount} fallidos)`
      );
    }

    console.log('\n========================================');
    console.log('ENVÍO COMPLETADO');
    console.log('========================================');
    console.log('Exitosos:', successCount);
    console.log('Fallidos:', failedCount);
    console.log('Total:', successCount + failedCount);
    console.log('========================================\n');

    // Guardar reporte
    setUploadReport({
      success: successCount,
      failed: failedCount,
      total: successCount + failedCount,
    });

    setIsSending(false);
    setShowReportModal(true);
    handleReset();

  } catch (error) {
    console.error('Error al enviar datos:', error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Error desconocido al enviar los datos';

    toast.error(`Error: ${errorMessage}`, {
      className: 'toast-slide-in',
      richColors: true,
    });
    
    setIsSending(false);
    setUploadProgress({
      current: 0,
      total: 0,
      percentage: 0,
    });
  }
};
  const handleReset = () => {
    setArchivoExcel(null);
    setProcessedGroups([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleModalClose = () => {
    if (!isProcessing && !isSending) {
      handleReset();
      onClose();
    }
  };

  return (
    <>
      {/* Modal Principal con Tailwind */}
      {/* Modal Principal con BaseModal */}
      {isOpen && !showPreviewModal && !showReportModal && (
        <BaseModal
          isOpen={true}
          onClose={handleModalClose}
          title={titulo || 'Carga Latam'}
          subtitle="Seleccione o arrastre el archivo Excel de datos Latam"
          icon={<FileSpreadsheet className="h-4 w-4 text-blue-600" />}
          iconBgColor="bg-blue-100"
          size="2xl"
          confirmText={isProcessing ? 'Procesando...' : 'Procesar Datos'}
          confirmIcon={<CheckCircle className="h-3.5 w-3.5" />}
          onConfirm={handleCargarDatos}
          onCancel={handleModalClose}
          isLoading={isProcessing || isSending}
          isConfirmDisabled={!archivoExcel}
          confirmButtonClass="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
        >
          <div className="space-y-3 py-1">
            <div
              className={`group relative cursor-pointer rounded-xl border-2 border-dashed p-5 text-center transition-all duration-300 ${
                isProcessing || isSending
                  ? 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-50'
                  : isDragOver
                    ? 'border-blue-500 bg-blue-50 shadow-md scale-[1.01]'
                    : archivoExcel
                      ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-sm'
                      : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50 hover:shadow-sm'
              }`}
              onDragOver={!isProcessing && !isSending ? handleDragOver : undefined}
              onDragLeave={!isProcessing && !isSending ? handleDragLeave : undefined}
              onDrop={!isProcessing && !isSending ? handleDrop : undefined}
              onClick={!isProcessing && !isSending ? handleCargarArchivo : undefined}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                disabled={isProcessing || isSending}
                className="hidden"
              />

              {archivoExcel ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="rounded-full bg-green-100 p-2.5">
                    <CheckCircle className="h-10 w-10 text-green-600" />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-green-700">
                      {archivoExcel.name}
                    </p>
                    <p className="text-xs font-medium text-green-600">
                      {(archivoExcel.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-green-600 px-3 py-1">
                    <CheckCircle className="h-3.5 w-3.5 text-white" />
                    <span className="text-xs font-semibold text-white">
                      Archivo cargado exitosamente
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="rounded-full bg-gray-100 p-3 transition-all group-hover:bg-blue-100 group-hover:scale-105">
                    <Upload className="h-8 w-8 text-gray-400 transition-colors group-hover:text-blue-500" />
                  </div>
                  <div>
                    <p className="mb-1 text-sm font-bold text-gray-700">
                      Arrastra tu archivo Excel aquí
                    </p>
                    <p className="mb-3 text-xs text-gray-500">
                      o haz clic para seleccionar desde tu dispositivo
                    </p>
                    <div className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow transition-all hover:from-blue-700 hover:to-indigo-700 hover:scale-105">
                      <FileSpreadsheet className="h-4 w-4" />
                      Seleccionar Archivo
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-2 text-xs font-medium text-gray-500">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Formatos soportados: .xlsx, .xls</span>
            </div>

            {isProcessing && (
              <div className="flex items-center justify-center gap-3 rounded-lg bg-blue-50 p-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                <p className="text-xs font-bold text-blue-700">
                  Procesando archivo Excel...
                </p>
              </div>
            )}

            {isSending && (
              <div className="flex flex-col items-center justify-center gap-3 rounded-lg bg-blue-50 p-4">
                <div className="relative h-16 w-16">
                  <svg className="h-16 w-16 -rotate-90 transform">
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="currentColor"
                      strokeWidth="6"
                      fill="transparent"
                      className="text-gray-200"
                    />
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="currentColor"
                      strokeWidth="6"
                      fill="transparent"
                      strokeDasharray={175.9}
                      strokeDashoffset={175.9 - (175.9 * uploadProgress.percentage) / 100}
                      className="text-blue-600 transition-all duration-500"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-black text-blue-600">
                      {uploadProgress.percentage}%
                    </span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-blue-700">
                    Enviando datos a la API...
                  </p>
                  <p className="text-[11px] font-medium text-blue-600">
                    Lote {uploadProgress.current} de {uploadProgress.total}
                  </p>
                </div>
              </div>
            )}

            {processedGroups.length > 0 && !isProcessing && !isSending && (
              <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3">
                <div className="flex flex-col items-center gap-1 text-center">
                  <div className="rounded-full bg-blue-100 p-1.5">
                    <Briefcase className="h-4 w-4 text-blue-600" />
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                    Servicios
                  </p>
                  <p className="text-xl font-black text-blue-600">
                    {processedGroups.length}
                  </p>
                </div>
                <div className="flex flex-col items-center gap-1 text-center">
                  <div className="rounded-full bg-emerald-100 p-1.5">
                    <Users className="h-4 w-4 text-emerald-600" />
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                    Pasajeros
                  </p>
                  <p className="text-xl font-black text-emerald-600">
                    {processedGroups.reduce((sum, group) => sum + group.length, 0)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </BaseModal>
      )}

      <Toaster />

      {/* Modal de Vista Previa */}
      {showPreviewModal && previewGroups.length > 0 && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            // Solo cerrar si se hace clic en el fondo negro
            if (e.target === e.currentTarget) {
              setShowPreviewModal(false);
            }
          }}
        >
          <div 
            className="w-full max-w-7xl rounded-lg bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => {
              // Prevenir que el clic dentro cierre el modal
              e.stopPropagation();
            }}
          >
            <div className="flex items-center justify-between border-b border-slate-200 bg-[#113EB9] px-6 py-4">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-white">
                  Vista Previa de Servicios
                </h3>
                <span className="rounded bg-white/20 px-3 py-1 text-xs font-medium text-white">
                  {previewGroups.length} servicios -{' '}
                  {previewGroups.reduce((sum, group) => sum + group.length, 0)}{' '}
                  pasajeros
                </span>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="rounded-full p-1 text-white transition-colors hover:bg-white/20"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 min-h-0">
              <div className="space-y-4">
                {previewGroups.map((group, groupIndex) => (
                  <div
                    key={`service-${group[0]?.idunico}-${groupIndex}`}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-slate-800">
                        Servicio {groupIndex + 1} - ID: {group[0].idunico}
                      </h4>
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                        {group.length} pasajeros
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead className="bg-slate-200 text-slate-700 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 min-w-[60px]">Orden</th>
                            <th className="px-3 py-2 min-w-[200px]">Nombre</th>
                            <th className="px-3 py-2 min-w-[80px]">BP</th>
                            <th className="px-3 py-2 min-w-[100px]">Celular</th>
                            <th className="px-3 py-2 min-w-[100px]">Fecha</th>
                            <th className="px-3 py-2 min-w-[80px]">H. Llegada</th>
                            <th className="px-3 py-2 min-w-[80px]">H. Parada</th>
                            <th className="px-3 py-2 min-w-[100px]">Acción</th>
                            <th className="px-3 py-2 min-w-[120px]">Proveedor</th>
                            <th className="px-3 py-2 min-w-[250px]">Dirección</th>
                            <th className="px-3 py-2 min-w-[150px]">Comuna</th>
                            <th className="px-3 py-2 min-w-[100px]">Lat</th>
                            <th className="px-3 py-2 min-w-[100px]">Long</th>
                            <th className="px-3 py-2 min-w-[100px]">Depot</th>
                            <th className="px-3 py-2 min-w-[100px]">Nro Vuelo</th>
                            <th className="px-3 py-2 min-w-[80px]">Pasajeros</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {group.length > 0 && group.map((passenger, passengerIndex) => (
                            <tr
                              key={`passenger-${passenger.bp}-${passengerIndex}`}
                              className="hover:bg-blue-50 transition-colors"
                            >
                              <td className="px-3 py-2">{passenger.orden}</td>
                              <td className="px-3 py-2 font-medium">
                                {passenger.nombre}
                              </td>
                              <td className="px-3 py-2">{passenger.bp}</td>
                              <td className="px-3 py-2">{passenger.celular}</td>
                              <td className="px-3 py-2 font-semibold text-slate-700">
                                {passenger.fecha || 'SIN FECHA'}
                              </td>
                              <td className="px-3 py-2">
                                {passenger.hora_llegada}
                              </td>
                              <td className="px-3 py-2">
                                {passenger.hora_parada}
                              </td>
                              <td className="px-3 py-2">
                                <span
                                  className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                    passenger.accion === 'S'
                                      ? 'bg-purple-100 text-purple-800'
                                      : 'bg-green-100 text-green-800'
                                  }`}
                                >
                                  {passenger.accion === 'S' ? 'Zarpe' : 'Recogida'}
                                </span>
                              </td>
                              <td className="px-3 py-2">{passenger.proveedor}</td>
                              <td className="px-3 py-2">
                                {passenger.direccion}
                              </td>
                              <td className="px-3 py-2">{passenger.comuna}</td>
                              <td className="px-3 py-2">{passenger.lat}</td>
                              <td className="px-3 py-2">{passenger.long}</td>
                              <td className="px-3 py-2">{passenger.depot}</td>
                              <td className="px-3 py-2">{passenger.numero_vuelo || '-'}</td>
                              <td className="px-3 py-2">{passenger.pasajeros}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="flex items-center gap-2 rounded-md bg-slate-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-slate-700 active:scale-95"
              >
                Cancelar
              </button>
              <button
                onClick={handleEnviarDatos}
                className="flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-95"
              >
                Cargar Servicios
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Modal de Reporte */}
{showReportModal && (
  <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
    <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
      <div className="rounded-t-2xl border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-5">
        <h3 className="text-center text-lg font-bold text-gray-800">
          Reporte de Envío
        </h3>
      </div>
      
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 rounded-xl bg-blue-50">
            <Briefcase className="h-8 w-8 mx-auto text-blue-600 mb-2" />
            <p className="text-2xl font-black text-blue-600">
              {uploadReport.total}
            </p>
            <p className="text-xs font-semibold text-blue-700">Total</p>
          </div>
          
          <div className="text-center p-4 rounded-xl bg-green-50">
            <CheckCircle className="h-8 w-8 mx-auto text-green-600 mb-2" />
            <p className="text-2xl font-black text-green-600">
              {uploadReport.success}
            </p>
            <p className="text-xs font-semibold text-green-700">Exitosos</p>
          </div>
          
          <div className="text-center p-4 rounded-xl bg-red-50">
            <X className="h-8 w-8 mx-auto text-red-600 mb-2" />
            <p className="text-2xl font-black text-red-600">
              {uploadReport.failed}
            </p>
            <p className="text-xs font-semibold text-red-700">Fallidos</p>
          </div>
        </div>

        {uploadReport.failed === 0 ? (
          <div className="flex items-center gap-3 rounded-xl bg-green-50 p-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <p className="font-bold text-green-700">
              ¡Todos los servicios se enviaron exitosamente!
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-xl bg-yellow-50 p-4">
            <AlertTriangle className="h-6 w-6 text-yellow-600" />
            <p className="font-bold text-yellow-700">
              Algunos servicios no pudieron enviarse
            </p>
          </div>
        )}
      </div>

      <div className="rounded-b-2xl border-t border-gray-200 bg-gray-50 px-6 py-4">
        <button
          onClick={() => {
            setShowReportModal(false);
            handleModalClose();
          }}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-2.5 font-bold text-white shadow-lg transition-all hover:from-blue-700 hover:to-indigo-700"
        >
          Cerrar
        </button>
      </div>
    </div>
  </div>
)}
    </>
  );
};

export default AppModalCargaLatam;