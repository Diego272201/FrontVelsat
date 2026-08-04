'use client';

import React, { useState, useRef } from 'react';
import { toast, Toaster } from 'sonner';
import '@/app/styles/sonner.css';
import {
  CheckCircle,
  FileSpreadsheet,
  Upload,
  AlertTriangle,
  X,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import BaseModal from '@/app/components/ui/BaseModal';

interface ServicioTurismoLote {
  fechainicio: string;
  instrucciones: string;
  horainicio: string;
  indicaciones: string;
  horaretorno: string;
  bus: string;
  placa: string;
  brevete: string;
  piloto: string;
  celular: string;
  cobrevete: string;
  copiloto: string;
  cocelular: string;
  tipounidad: string;
  cliente: string;
  grupo: string;
  numpax: string;
  origen: string;
  destino: string;
  guiaturista: string;
  vuelocliente: string;
  observaciones: string;
  ejecutivo: string;
  cotizacion: string;
}

interface ModalCargaExcelTurismoProps {
  isOpen: boolean;
  onClose: () => void;
  onUploaded: () => void;
}

const API_LOTE_URL = 'https://do.velsat.pe:2083/api/ServTurismo/lote';

// Layout real de la plantilla Excel (encabezados tal cual los envió el usuario):
// A FECHA INICIO | B H. TALLER | C H. INICIO | D FECHA RETORNO | E H. DE RETORNO | F BUS | G PLACA
// H BREVETE | I PILOTO | J CELULAR | K BREVETE (copiloto) | L PILOTO (copiloto) | M CELULAR (copiloto)
// N TIPO/UNID | O CLIENTE | P GRUPO | Q N° PAX | R ORIGEN | S DESTINO | T GUIA | U VUELO
// V OBSERVACIONES | W UUNN | X FOR1 | Y EJECUTIVO | Z COTIZACION
// Columnas B (H. TALLER), D (FECHA RETORNO), W (UUNN) y X (FOR1) no tienen campo equivalente
// en la tabla servturismo, así que se ignoran al leer el Excel.
// "instrucciones" e "indicaciones" tampoco tienen columna en esta plantilla, quedan vacíos.
const COLUMN_MAP: { index: number; campo: keyof ServicioTurismoLote }[] = [
  { index: 0, campo: 'fechainicio' },
  { index: 1, campo: 'instrucciones' },
  { index: 2, campo: 'horainicio' },
  { index: 3, campo: 'indicaciones' },
  { index: 4, campo: 'horaretorno' },
  { index: 5, campo: 'bus' },
  { index: 6, campo: 'placa' },
  { index: 7, campo: 'brevete' },
  { index: 8, campo: 'piloto' },
  { index: 9, campo: 'celular' },
  { index: 10, campo: 'cobrevete' },
  { index: 11, campo: 'copiloto' },
  { index: 12, campo: 'cocelular' },
  { index: 13, campo: 'tipounidad' },
  { index: 14, campo: 'cliente' },
  { index: 15, campo: 'grupo' },
  { index: 16, campo: 'numpax' },
  { index: 17, campo: 'origen' },
  { index: 18, campo: 'destino' },
  { index: 19, campo: 'guiaturista' },
  { index: 20, campo: 'vuelocliente' },
  { index: 21, campo: 'observaciones' },
  { index: 24, campo: 'ejecutivo' },
  { index: 25, campo: 'cotizacion' },
];

const CAMPOS_FECHA: (keyof ServicioTurismoLote)[] = ['fechainicio'];

const MAX_COLUMNAS = 26;

function excelSerialToDdMmYyyy(valor: any): string {
  if (valor === undefined || valor === null || valor === '') return '';

  if (typeof valor === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + valor * 24 * 60 * 60 * 1000);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  if (valor instanceof Date && !isNaN(valor.getTime())) {
    const day = String(valor.getDate()).padStart(2, '0');
    const month = String(valor.getMonth() + 1).padStart(2, '0');
    const year = valor.getFullYear();
    return `${day}/${month}/${year}`;
  }

  const str = String(valor).trim();

  // dd/mm/yyyy ya viene correcto
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    return str;
  }

  // dd-mm-yyyy
  const dashMatch = str.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dashMatch) {
    const [, d, m, y] = dashMatch;
    return `${d}/${m}/${y}`;
  }

  // yyyy-mm-dd (ISO)
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${d}/${m}/${y}`;
  }

  return str;
}

function excelValorToHoraHm(valor: any): string {
  if (valor === undefined || valor === null || valor === '') return '';

  if (typeof valor === 'number') {
    const totalMinutos = Math.round(valor * 24 * 60);
    const horas = Math.floor(totalMinutos / 60) % 24;
    const minutos = totalMinutos % 60;
    return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
  }

  if (valor instanceof Date && !isNaN(valor.getTime())) {
    return `${String(valor.getHours()).padStart(2, '0')}:${String(valor.getMinutes()).padStart(2, '0')}`;
  }

  const str = String(valor).trim();
  const match = str.match(/^(\d{1,2}):(\d{2})/);
  if (match) {
    const [, h, m] = match;
    return `${h.padStart(2, '0')}:${m}`;
  }

  return str;
}

function celda(valor: any): string {
  if (valor === undefined || valor === null) return '';
  return String(valor).trim();
}

const ModalCargaExcelTurismo: React.FC<ModalCargaExcelTurismoProps> = ({
  isOpen,
  onClose,
  onUploaded,
}) => {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [registros, setRegistros] = useState<ServicioTurismoLote[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reporte, setReporte] = useState<{
    exitoso: boolean;
    mensaje: string;
    insertados: number;
  }>({ exitoso: false, mensaje: '', insertados: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleReset = () => {
    setArchivo(null);
    setRegistros([]);
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
      setArchivo(file);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndSetFile(file);
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
    if (files.length > 0) validateAndSetFile(files[0]);
  };

  const handleCargarArchivo = () => {
    fileInputRef.current?.click();
  };

  const handleProcesarArchivo = async () => {
    if (!archivo) {
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
      const data = await archivo.arrayBuffer();
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
      // Matriz de filas/columnas; fila 0 = encabezados (fila 1 de Excel), datos desde fila 1 (fila 2 de Excel = A2).
      const filas: any[][] = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        range: 0,
      });

      const nuevosRegistros: ServicioTurismoLote[] = [];

      for (let i = 1; i < filas.length; i++) {
        const fila = (filas[i] || []).slice(0, MAX_COLUMNAS);
        const fecha = celda(fila[0]);

        // Termina el contenido cuando la columna A (fecha) llega vacía.
        if (!fecha) {
          break;
        }

        // "instrucciones" e "indicaciones" no tienen columna en esta plantilla; se inicializan vacíos.
        const registro: ServicioTurismoLote = {
          fechainicio: '',
          instrucciones: '',
          horainicio: '',
          indicaciones: '',
          horaretorno: '',
          bus: '',
          placa: '',
          brevete: '',
          piloto: '',
          celular: '',
          cobrevete: '',
          copiloto: '',
          cocelular: '',
          tipounidad: '',
          cliente: '',
          grupo: '',
          numpax: '',
          origen: '',
          destino: '',
          guiaturista: '',
          vuelocliente: '',
          observaciones: '',
          ejecutivo: '',
          cotizacion: '',
        };

        COLUMN_MAP.forEach(({ index, campo }) => {
          const valorCrudo = fila[index];

          if (CAMPOS_FECHA.includes(campo)) {
            registro[campo] = excelSerialToDdMmYyyy(valorCrudo);
          } else if (campo === 'horainicio') {
            registro[campo] = excelValorToHoraHm(valorCrudo);
          } else {
            registro[campo] = celda(valorCrudo);
          }
        });

        nuevosRegistros.push(registro);
      }

      if (nuevosRegistros.length === 0) {
        toast.error('No se encontraron registros a partir de la celda A2', {
          id: loadingToastId,
          className: 'toast-slide-in',
          richColors: true,
        });
        setIsProcessing(false);
        return;
      }

      setRegistros(nuevosRegistros);
      setIsProcessing(false);
      setShowPreview(true);

      toast.success(`Se procesaron ${nuevosRegistros.length} servicios`, {
        id: loadingToastId,
        className: 'toast-slide-in',
        richColors: true,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Error desconocido al procesar el archivo';

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
    setShowPreview(false);

    try {
      const response = await fetch(API_LOTE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registros),
      });

      const data = await response.json().catch(() => null);

      if (response.ok) {
        setReporte({
          exitoso: true,
          mensaje: data?.mensaje || 'Servicios insertados correctamente.',
          insertados: data?.insertados ?? registros.length,
        });
      } else {
        console.error('Error al insertar servicios de turismo:', data);
        setReporte({
          exitoso: false,
          mensaje:
            data?.error || data?.mensaje || 'Ocurrió un error al insertar los servicios.',
          insertados: 0,
        });
      }
    } catch (error) {
      console.error('Error de conexión al enviar servicios de turismo:', error);
      setReporte({
        exitoso: false,
        mensaje: 'Error de conexión al enviar los servicios.',
        insertados: 0,
      });
    } finally {
      setIsSending(false);
      setShowReport(true);
    }
  };

  return (
    <>
      {isOpen && !showPreview && !showReport && (
        <BaseModal
          isOpen={true}
          onClose={handleModalClose}
          title="Cargar Servicios desde Excel"
          subtitle="Seleccione o arrastre el archivo Excel con los servicios de turismo"
          icon={<FileSpreadsheet className="h-4 w-4 text-blue-600" />}
          iconBgColor="bg-blue-100"
          size="xl"
          confirmText={isProcessing ? 'Procesando...' : 'Procesar Archivo'}
          confirmIcon={<CheckCircle className="h-3.5 w-3.5" />}
          onConfirm={handleProcesarArchivo}
          onCancel={handleModalClose}
          isLoading={isProcessing}
          isConfirmDisabled={!archivo}
          confirmButtonClass="bg-brandSecondary hover:bg-brandSecondary-hover text-white font-medium"
        >
          <div className="space-y-3 py-1">
            <div
              className={`group relative cursor-pointer rounded-xl border-2 border-dashed p-5 text-center transition-all duration-300 ${
                isProcessing
                  ? 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-50'
                  : isDragOver
                    ? 'scale-[1.01] border-blue-500 bg-blue-50 shadow-md'
                    : archivo
                      ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-sm'
                      : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50 hover:shadow-sm'
              }`}
              onDragOver={!isProcessing ? handleDragOver : undefined}
              onDragLeave={!isProcessing ? handleDragLeave : undefined}
              onDrop={!isProcessing ? handleDrop : undefined}
              onClick={!isProcessing ? handleCargarArchivo : undefined}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                disabled={isProcessing}
                className="hidden"
              />

              {archivo ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="rounded-full bg-green-100 p-2.5">
                    <CheckCircle className="h-10 w-10 text-green-600" />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-green-700">
                      {archivo.name}
                    </p>
                    <p className="text-xs font-medium text-green-600">
                      {(archivo.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="rounded-full bg-gray-100 p-3 transition-all group-hover:scale-105 group-hover:bg-blue-100">
                    <Upload className="h-8 w-8 text-gray-400 transition-colors group-hover:text-blue-500" />
                  </div>
                  <div>
                    <p className="mb-1 text-sm font-bold text-gray-700">
                      Arrastra tu archivo Excel aquí
                    </p>
                    <p className="mb-3 text-xs text-gray-500">
                      o haz clic para seleccionar desde tu dispositivo
                    </p>
                    <div className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow transition-all hover:scale-105">
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

            <p className="text-center text-[11px] text-gray-400">
              La lectura inicia en la celda A2 (fila 1 son encabezados) y se detiene
              en la primera fila donde la columna A (fecha) esté vacía.
            </p>

            {isProcessing && (
              <div className="flex items-center justify-center gap-3 rounded-lg bg-blue-50 p-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                <p className="text-xs font-bold text-blue-700">
                  Procesando archivo Excel...
                </p>
              </div>
            )}
          </div>
        </BaseModal>
      )}

      <Toaster />

      {/* Vista previa */}
      {showPreview && registros.length > 0 && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPreview(false);
          }}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 bg-[#113EB9] px-6 py-4">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-white">
                  Vista Previa de Servicios
                </h3>
                <span className="rounded bg-white/20 px-3 py-1 text-xs font-medium text-white">
                  {registros.length} servicios
                </span>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="rounded-full p-1 text-white transition-colors hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-6">
              <table className="w-full whitespace-nowrap text-left text-xs">
                <thead className="sticky top-0 bg-slate-200 text-slate-700">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Fecha</th>
                    <th className="px-3 py-2">Hora Inicio</th>
                    <th className="px-3 py-2">Hora Retorno</th>
                    <th className="px-3 py-2">Bus</th>
                    <th className="px-3 py-2">Placa</th>
                    <th className="px-3 py-2">Brevete</th>
                    <th className="px-3 py-2">Piloto</th>
                    <th className="px-3 py-2">Celular</th>
                    <th className="px-3 py-2">Brevete Cop.</th>
                    <th className="px-3 py-2">Copiloto</th>
                    <th className="px-3 py-2">Celular Cop.</th>
                    <th className="px-3 py-2">Tipo Unidad</th>
                    <th className="px-3 py-2">Cliente</th>
                    <th className="px-3 py-2">Grupo</th>
                    <th className="px-3 py-2">N° Pax</th>
                    <th className="px-3 py-2">Origen</th>
                    <th className="px-3 py-2">Destino</th>
                    <th className="px-3 py-2">Guía</th>
                    <th className="px-3 py-2">Vuelo</th>
                    <th className="px-3 py-2">Ejecutivo</th>
                    <th className="px-3 py-2">Cotización</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {registros.map((registro, index) => (
                    <tr key={index} className="transition-colors hover:bg-blue-50">
                      <td className="px-3 py-2">{index + 1}</td>
                      <td className="px-3 py-2 font-semibold text-slate-700">
                        {registro.fechainicio || 'SIN FECHA'}
                      </td>
                      <td className="px-3 py-2">{registro.horainicio}</td>
                      <td className="px-3 py-2">{registro.horaretorno}</td>
                      <td className="px-3 py-2">{registro.bus}</td>
                      <td className="px-3 py-2">{registro.placa}</td>
                      <td className="px-3 py-2">{registro.brevete}</td>
                      <td className="px-3 py-2">{registro.piloto}</td>
                      <td
                        className={`px-3 py-2 ${registro.celular.length > 9 ? 'font-bold text-red-600' : ''}`}
                      >
                        {registro.celular}
                      </td>
                      <td className="px-3 py-2">{registro.cobrevete}</td>
                      <td className="px-3 py-2">{registro.copiloto}</td>
                      <td
                        className={`px-3 py-2 ${registro.cocelular.length > 9 ? 'font-bold text-red-600' : ''}`}
                      >
                        {registro.cocelular}
                      </td>
                      <td className="px-3 py-2">{registro.tipounidad}</td>
                      <td className="px-3 py-2">{registro.cliente}</td>
                      <td className="px-3 py-2">{registro.grupo}</td>
                      <td className="px-3 py-2">{registro.numpax}</td>
                      <td className="px-3 py-2">{registro.origen}</td>
                      <td className="px-3 py-2">{registro.destino}</td>
                      <td className="px-3 py-2">{registro.guiaturista}</td>
                      <td className="px-3 py-2">{registro.vuelocliente}</td>
                      <td className="px-3 py-2">{registro.ejecutivo}</td>
                      <td className="px-3 py-2">{registro.cotizacion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                onClick={() => setShowPreview(false)}
                className="flex items-center gap-2 rounded-md bg-slate-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-slate-700 active:scale-95"
              >
                Cancelar
              </button>
              <button
                onClick={handleEnviarDatos}
                className="flex items-center gap-2 rounded-md bg-brandSecondary px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-brandSecondary-hover active:scale-95"
              >
                Cargar Servicios
              </button>
            </div>
          </div>
        </div>
      )}

      {isSending && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-white p-8 shadow-2xl">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            <p className="text-sm font-bold text-blue-700">
              Enviando servicios a la API...
            </p>
          </div>
        </div>
      )}

      {/* Reporte final */}
      {showReport && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="rounded-t-2xl border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-5">
              <h3 className="text-center text-lg font-bold text-gray-800">
                Reporte de Carga
              </h3>
            </div>

            <div className="space-y-4 p-6">
              {reporte.exitoso ? (
                <div className="flex items-center gap-3 rounded-xl bg-green-50 p-4">
                  <CheckCircle className="h-6 w-6 flex-shrink-0 text-green-600" />
                  <div>
                    <p className="font-bold text-green-700">{reporte.mensaje}</p>
                    <p className="text-sm text-green-600">
                      {reporte.insertados} servicios insertados
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-xl bg-red-50 p-4">
                  <AlertTriangle className="h-6 w-6 flex-shrink-0 text-red-600" />
                  <p className="font-bold text-red-700">{reporte.mensaje}</p>
                </div>
              )}
            </div>

            <div className="rounded-b-2xl border-t border-gray-200 bg-gray-50 px-6 py-4">
              <button
                onClick={() => {
                  setShowReport(false);
                  const exitoso = reporte.exitoso;
                  handleReset();
                  onClose();
                  if (exitoso) {
                    onUploaded();
                  }
                }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-2.5 font-bold text-white shadow-lg transition-all hover:from-blue-700 hover:to-indigo-700"
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

export default ModalCargaExcelTurismo;
