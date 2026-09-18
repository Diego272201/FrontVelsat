'use client';

import React, { useMemo, useRef, useState } from 'react';
import { toast, Toaster } from 'sonner';
import '@/app/styles/sonner.css';
import {
  CheckCircle,
  FileSpreadsheet,
  Upload,
  AlertTriangle,
  MessageCircle,
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
  cargarServiciosExcel: (registros: ServicioTurismoLote[]) => Promise<{
    ok: boolean;
    offline: boolean;
    mensaje: string;
    insertados: number;
    notificacionesEnviadas: number;
  }>;
}

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

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    return str;
  }

  const dashMatch = str.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dashMatch) {
    const [, d, m, y] = dashMatch;
    return `${d}/${m}/${y}`;
  }

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

// faltantes: datos incompletos que se pueden cargar igual, previa confirmación del usuario.
// errores: problemas de formato que bloquean la carga hasta corregir el Excel.
interface ValidacionRegistro {
  faltantes: string[];
  errores: string[];
}

function validarCelular(valor: string, etiqueta: string): string | null {
  if (!valor) return null;
  return /^\d{9}$/.test(valor)
    ? null
    : `${etiqueta} inválido: "${valor}" (debe tener 9 dígitos)`;
}

function validarRegistro(registro: ServicioTurismoLote): ValidacionRegistro {
  const faltantes: string[] = [];
  if (!registro.fechainicio) faltantes.push('Fecha');
  if (!registro.bus && !registro.placa) faltantes.push('Unidad (bus/placa)');
  if (!registro.piloto) faltantes.push('Conductor (piloto)');

  const errores: string[] = [];
  const errorCelular = validarCelular(registro.celular, 'Celular');
  const errorCocelular = validarCelular(registro.cocelular, 'Celular Copiloto');
  if (errorCelular) errores.push(errorCelular);
  if (errorCocelular) errores.push(errorCocelular);

  return { faltantes, errores };
}

const ModalCargaExcelTurismo: React.FC<ModalCargaExcelTurismoProps> = ({
  isOpen,
  onClose,
  cargarServiciosExcel,
}) => {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [registros, setRegistros] = useState<ServicioTurismoLote[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [confirmandoFaltantes, setConfirmandoFaltantes] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reporte, setReporte] = useState<{
    exitoso: boolean;
    mensaje: string;
    insertados: number;
    offline: boolean;
    notificacionesEnviadas: number;
  }>({ exitoso: false, mensaje: '', insertados: 0, offline: false, notificacionesEnviadas: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const validaciones = useMemo(
    () => registros.map((registro) => validarRegistro(registro)),
    [registros],
  );
  const filasConErrores = useMemo(
    () =>
      validaciones
        .map((v, index) => ({ ...v, index }))
        .filter((v) => v.errores.length > 0),
    [validaciones],
  );
  const filasConFaltantes = useMemo(
    () =>
      validaciones
        .map((v, index) => ({ ...v, index }))
        .filter((v) => v.faltantes.length > 0),
    [validaciones],
  );
  const hayErrores = filasConErrores.length > 0;
  const hayFaltantes = filasConFaltantes.length > 0;

  const handleReset = () => {
    setArchivo(null);
    setRegistros([]);
    setConfirmandoFaltantes(false);
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

  const cerrarPreview = () => {
    setShowPreview(false);
    setConfirmandoFaltantes(false);
  };

  const handleClickCargarServicios = () => {
    if (hayErrores) return;
    if (hayFaltantes && !confirmandoFaltantes) {
      setConfirmandoFaltantes(true);
      return;
    }
    handleEnviarDatos();
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
      const filas: any[][] = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        range: 0,
      });

      const nuevosRegistros: ServicioTurismoLote[] = [];

      for (let i = 1; i < filas.length; i++) {
        const fila = (filas[i] || []).slice(0, MAX_COLUMNAS);
        const fecha = celda(fila[0]);

        if (!fecha) {
          break;
        }

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
    setConfirmandoFaltantes(false);

    const resultado = await cargarServiciosExcel(registros);

    setReporte({
      exitoso: resultado.ok,
      mensaje: resultado.mensaje,
      insertados: resultado.insertados,
      offline: resultado.offline,
      notificacionesEnviadas: resultado.notificacionesEnviadas,
    });
    setIsSending(false);
    setShowReport(true);
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

      {showPreview && registros.length > 0 && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) cerrarPreview();
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
                onClick={cerrarPreview}
                className="rounded-full p-1 text-white transition-colors hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {(hayErrores || hayFaltantes) && (
              <div className="space-y-2 border-b border-slate-200 bg-slate-50 px-6 py-3">
                {hayErrores && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                    <p className="flex items-center gap-1.5 text-xs font-bold text-red-700">
                      <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                      {filasConErrores.length} registro{filasConErrores.length === 1 ? '' : 's'} con
                      errores de formato: corrígelos en el Excel y vuelve a cargarlo
                    </p>
                    <ul className="mt-1.5 max-h-20 space-y-0.5 overflow-y-auto text-[11px] text-red-600">
                      {filasConErrores.map(({ index, errores }) => (
                        <li key={index}>
                          Fila {index + 1}: {errores.join(' · ')}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {hayFaltantes && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="flex items-center gap-1.5 text-xs font-bold text-amber-700">
                      <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                      {filasConFaltantes.length} registro{filasConFaltantes.length === 1 ? '' : 's'}{' '}
                      con datos incompletos
                    </p>
                    <ul className="mt-1.5 max-h-20 space-y-0.5 overflow-y-auto text-[11px] text-amber-700">
                      {filasConFaltantes.map(({ index, faltantes }) => (
                        <li key={index}>
                          Fila {index + 1}: falta {faltantes.join(', ')}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

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
                  {registros.map((registro, index) => {
                    const { faltantes, errores } = validaciones[index];
                    const faltaFecha = faltantes.includes('Fecha');
                    const faltaUnidad = faltantes.includes('Unidad (bus/placa)');
                    const faltaPiloto = faltantes.includes('Conductor (piloto)');
                    const errorCelular = validarCelular(registro.celular, 'Celular');
                    const errorCocelular = validarCelular(registro.cocelular, 'Celular Copiloto');
                    const claseFaltante = 'bg-amber-50 font-semibold text-amber-700';
                    const claseError = 'bg-red-50 font-bold text-red-600';

                    return (
                      <tr
                        key={index}
                        className={`transition-colors hover:bg-blue-50 ${errores.length > 0 ? 'bg-red-50/40' : ''}`}
                      >
                        <td className="px-3 py-2">{index + 1}</td>
                        <td className={`px-3 py-2 ${faltaFecha ? claseFaltante : 'font-semibold text-slate-700'}`}>
                          {registro.fechainicio || 'SIN FECHA'}
                        </td>
                        <td className="px-3 py-2">{registro.horainicio}</td>
                        <td className="px-3 py-2">{registro.horaretorno}</td>
                        <td className={`px-3 py-2 ${faltaUnidad ? claseFaltante : ''}`}>
                          {registro.bus || (faltaUnidad ? 'SIN UNIDAD' : '')}
                        </td>
                        <td className={`px-3 py-2 ${faltaUnidad ? claseFaltante : ''}`}>
                          {registro.placa}
                        </td>
                        <td className="px-3 py-2">{registro.brevete}</td>
                        <td className={`px-3 py-2 ${faltaPiloto ? claseFaltante : ''}`}>
                          {registro.piloto || (faltaPiloto ? 'SIN CONDUCTOR' : '')}
                        </td>
                        <td
                          title={errorCelular || undefined}
                          className={`px-3 py-2 ${errorCelular ? claseError : ''}`}
                        >
                          {registro.celular}
                        </td>
                        <td className="px-3 py-2">{registro.cobrevete}</td>
                        <td className="px-3 py-2">{registro.copiloto}</td>
                        <td
                          title={errorCocelular || undefined}
                          className={`px-3 py-2 ${errorCocelular ? claseError : ''}`}
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
                    );
                  })}
                </tbody>
              </table>
            </div>

            {confirmandoFaltantes && !hayErrores && (
              <div className="flex items-center justify-between gap-3 border-t border-amber-200 bg-amber-50 px-6 py-3">
                <p className="text-xs font-semibold text-amber-700">
                  {filasConFaltantes.length} servicio{filasConFaltantes.length === 1 ? '' : 's'} sin
                  fecha, unidad o conductor asignado. ¿Deseas cargarlos de todas formas?
                </p>
                <button
                  onClick={() => setConfirmandoFaltantes(false)}
                  className="flex-shrink-0 text-xs font-medium text-amber-700 underline hover:text-amber-900"
                >
                  Revisar de nuevo
                </button>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              {hayErrores && (
                <p className="mr-auto text-xs font-medium text-red-600">
                  Corrige los errores de formato antes de continuar
                </p>
              )}
              <button
                onClick={cerrarPreview}
                className="flex items-center gap-2 rounded-md bg-slate-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-slate-700 active:scale-95"
              >
                Cancelar
              </button>
              <button
                onClick={handleClickCargarServicios}
                disabled={hayErrores}
                className="flex items-center gap-2 rounded-md bg-brandSecondary px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-brandSecondary-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-brandSecondary"
              >
                {confirmandoFaltantes && !hayErrores ? 'Sí, cargar de todas formas' : 'Cargar Servicios'}
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

      {showReport && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="rounded-t-2xl border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-5">
              <h3 className="text-center text-lg font-bold text-gray-800">
                Reporte de Carga
              </h3>
            </div>

            <div className="space-y-4 p-6">
              {reporte.exitoso && (
                <div className="flex items-center gap-3 rounded-xl bg-green-50 p-4">
                  <CheckCircle className="h-6 w-6 flex-shrink-0 text-green-600" />
                  <div>
                    <p className="font-bold text-green-700">{reporte.mensaje}</p>
                    <p className="text-sm text-green-600">
                      {reporte.insertados} servicios insertados
                    </p>
                  </div>
                </div>
              )}

              {reporte.exitoso && (
                <div
                  className={`flex items-center gap-3 rounded-xl p-4 ${
                    reporte.offline
                      ? 'bg-amber-50'
                      : reporte.notificacionesEnviadas > 0
                        ? 'bg-green-50'
                        : 'bg-gray-50'
                  }`}
                >
                  <MessageCircle
                    className={`h-6 w-6 flex-shrink-0 ${
                      reporte.offline
                        ? 'text-amber-600'
                        : reporte.notificacionesEnviadas > 0
                          ? 'text-green-600'
                          : 'text-gray-500'
                    }`}
                  />
                  <p
                    className={`font-bold ${
                      reporte.offline
                        ? 'text-amber-700'
                        : reporte.notificacionesEnviadas > 0
                          ? 'text-green-700'
                          : 'text-gray-700'
                    }`}
                  >
                    {reporte.offline
                      ? 'Sin conexión: las notificaciones se enviarán cuando se sincronice'
                      : reporte.notificacionesEnviadas > 0
                        ? `${reporte.notificacionesEnviadas} conductor(es) notificado(s) por WhatsApp`
                        : 'No se encontraron celulares válidos en la BD para notificar'}
                  </p>
                </div>
              )}

              {!reporte.exitoso && (
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
                  handleReset();
                  onClose();
                }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 font-bold text-white shadow-lg transition-all hover:bg-red-700"
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
