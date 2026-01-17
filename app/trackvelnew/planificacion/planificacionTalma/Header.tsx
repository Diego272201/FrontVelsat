'use client';
import React, { useEffect, useState } from 'react';
import {
  Upload,
  X,
  Users,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  MonitorUp,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { Spinner } from '@nextui-org/react';
import ObtenerDatos from './Obtenerdatos';

interface HeaderProps {
  tablaListRef: React.RefObject<any>;
}

interface PassengerRecord {
  codlan: string;
  tipo: string;
  fecha: string;
  hora: string;
  usuario: string;
}

export default function Header({ tablaListRef }: HeaderProps) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [isExpanded, setIsExpanded] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [processedData, setProcessedData] = useState<PassengerRecord[]>([]);
  const [sendProgress, setSendProgress] = useState({ current: 0, total: 0 });
  const [apiResults, setApiResults] = useState<{
    success: number;
    failed: number;
  }>({
    success: 0,
    failed: 0,
  });

  const [errorDetails, setErrorDetails] = useState<any[]>([]);
const [estadisticas, setEstadisticas] = useState({ totalGrupos: 0, totalPasajeros: 0 });

useEffect(() => {
  const interval = setInterval(() => {
    if (tablaListRef.current?.getEstadisticas) {
      const stats = tablaListRef.current.getEstadisticas();
      setEstadisticas(stats);
    }
  }, 500);

  return () => clearInterval(interval);
}, []);


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validExtensions = ['.xlsx', '.xls'];
      const fileExtension = file.name
        .substring(file.name.lastIndexOf('.'))
        .toLowerCase();

      if (!validExtensions.includes(fileExtension)) {
        toast.error('Por favor, selecciona un archivo Excel válido (.xlsx o .xls)');
        return;
      }

      setSelectedFile(file);
    }
  };

  const excelSerialToDate = (serial: any): string => {
    if (!serial) return '';

    if (typeof serial === 'string') {
      const isoDateMatch = serial.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (isoDateMatch) {
        const [, year, month, day] = isoDateMatch;
        return `${day}/${month}/${year}`;
      }

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
      const date = new Date(excelEpoch.getTime() + daysOffset * 24 * 60 * 60 * 1000);

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
    if (typeof time === 'string') return time;

    if (typeof time === 'number') {
      const totalMinutes = Math.round(time * 24 * 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }

    return '00:00';
  };

  const handleUploadFile = async () => {
    if (!selectedFile) {
      toast.warning('Por favor, selecciona un archivo Excel primero');
      return;
    }

    setIsLoading(true);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });

      const sheetName = workbook.SheetNames[0];

      if (!sheetName) {
        toast.error('El archivo no tiene una segunda hoja');
        setIsLoading(false);
        return;
      }

      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      const records: PassengerRecord[] = [];

      // Empezar desde la fila 2 (índice 1, ya que 0 son los headers)
      for (let i = 1; i < jsonData.length; i++) {
        const row: any = jsonData[i];

        // Columna C es índice 2 (DNI)
        const dni = row[2];

        if (!dni || dni === '') {
          break;
        }

        // Extraer datos
        const codlan = `TA${dni}`;
        const tipo = row[4] ? String(row[4]).toUpperCase() : ''; 

        // Columna G (índice 6) - FECHA
        const fecha = row[6] ? excelSerialToDate(row[6]) : '';

        // Columna F (índice 5) - HORA
        const hora = excelTimeToString(row[5]);

        const usuario = 'cgacela';

        records.push({
          codlan,
          tipo,
          fecha,
          hora,
          usuario,
        });
      }

      setProcessedData(records);
      setShowPreviewModal(true);
      setIsLoading(false);
    } catch (error) {
      console.error('Error al procesar el archivo:', error);
      toast.error('Hubo un error al procesar el archivo Excel');
      setIsLoading(false);
    }
  };

  const handleSendToAPI = async () => {
    setIsSending(true);
    setShowPreviewModal(false);
    setSendProgress({ current: 0, total: processedData.length });
    setApiResults({ success: 0, failed: 0 });

    setErrorDetails([]);

    const API_URL = 'https://do.velsat.pe:2083/api/Talma/InsertPedidoTalma';
    const BATCH_SIZE = 50; // Enviar en lotes de 50
    const CONCURRENT_REQUESTS = 5; // Máximo 5 requests simultáneos

    try {
      let successCount = 0;
      let failedCount = 0;
      let processedCount = 0;

      // Dividir en lotes
      const batches: PassengerRecord[][] = [];
      for (let i = 0; i < processedData.length; i += BATCH_SIZE) {
        batches.push(processedData.slice(i, i + BATCH_SIZE));
      }

      console.log('========================================');
      console.log('INICIANDO ENVÍO A LA API');
      console.log('========================================');
      console.log('URL:', API_URL);
      console.log('Total de registros:', processedData.length);
      console.log('Número de lotes:', batches.length);
      console.log('Tamaño de cada lote:', BATCH_SIZE);
      console.log('Requests concurrentes:', CONCURRENT_REQUESTS);
      console.log('========================================\n');

      // Procesar lotes con concurrencia limitada
      for (let i = 0; i < batches.length; i += CONCURRENT_REQUESTS) {
        const currentBatches = batches.slice(i, i + CONCURRENT_REQUESTS);

        const promises = currentBatches.map(async (batch, batchIndex) => {
          const actualBatchNumber = i + batchIndex + 1;

          console.log(
            `\nEnviando Lote ${actualBatchNumber}/${batches.length}`
          );
          console.log('Datos a enviar:', JSON.stringify(batch, null, 2));

          try {
            const response = await fetch(API_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(batch),
            });

            console.log(
              `Lote ${actualBatchNumber} - Status:`,
              response.status
            );
            console.log(`Lote ${actualBatchNumber} - OK:`, response.ok);

            if (response.ok) {
              const responseData = await response.json();
              console.log(
                `Lote ${actualBatchNumber} - Respuesta:`,
                responseData
              );

              if (responseData.errores && Array.isArray(responseData.errores)) {
                errorDetails.push(...responseData.errores);
              }

              let batchSuccess = 0;
              let batchFailed = 0;

              if (responseData.registrosProcesados !== undefined) {
                batchSuccess = responseData.registrosProcesados || 0;
                batchFailed = responseData.registrosConError || 0;
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
                `Lote ${actualBatchNumber} - Exitosos: ${batchSuccess}, Fallidos: ${batchFailed}`
              );

              return { success: batchSuccess, failed: batchFailed };
            } else {
              const errorText = await response.text();
              console.error(
                `Lote ${actualBatchNumber} - Error:`,
                errorText
              );
              return { success: 0, failed: batch.length };
            }
          } catch (error) {
            console.error(
              `Lote ${actualBatchNumber} - Exception:`,
              error
            );
            return { success: 0, failed: batch.length };
          }
        });

        const results = await Promise.all(promises);

        results.forEach((result) => {
          successCount += result.success;
          failedCount += result.failed;
          processedCount += result.success + result.failed;

          setSendProgress({
            current: processedCount,
            total: processedData.length,
          });

          setApiResults({
            success: successCount,
            failed: failedCount,
          });
        });

        console.log(
          `\nProgreso: ${processedCount}/${processedData.length} registros procesados (✅ ${successCount} exitosos, ❌ ${failedCount} fallidos)`
        );
      }

      console.log('\n========================================');
      console.log('ENVÍO COMPLETADO');
      console.log('========================================');
      console.log('Exitosos:', successCount);
      console.log('Fallidos:', failedCount);
      console.log('Total:', successCount + failedCount);
      console.log('========================================\n');

      if (failedCount > 0) {
        localStorage.setItem('talmaErrors', JSON.stringify(errorDetails));
      }
      setIsSending(false);
      setShowResultModal(true);
    } catch (error) {
      console.error('ERROR GENERAL:', error);
      toast.error('Hubo un error al enviar los datos a la API');
      setIsSending(false);
    }
  };

 

  return (
    <>
      {/* Header Compacto */}
      <div className="bg-[#113EB9]">
        <div className=" flex items-center justify-between px-4 py-[5px]">
          <h1 className="text-[12.5px] font-bold uppercase text-white">
            Módulo de Planificación de Servicios Talma
          </h1>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-white/20 active:scale-95"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Ocultar
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Mostrar
              </>
            )}
          </button>
        </div>
      </div>

      {/* Contenido colapsable */}
      {isExpanded && (
        <div className="px-4 pt-2 pb-0">
          {/* FILA 1: Carga + Controles + Filtros + Estadísticas */}
         <div className="grid grid-cols-1 gap-3 lg:grid-cols-[2fr_2fr_1fr]">

            {/* Carga de Archivos */}
            <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Upload className="h-4 w-4 text-blue-600" />
                <h2 className="text-[12px] font-semibold text-slate-800">
                  Carga de Archivos
                </h2>
              </div>

              <div className="space-y-2">
                <label className="block">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept=".xlsx,.xls"
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="flex cursor-pointer items-center gap-2 rounded-md border-2 border-dashed border-slate-300 bg-slate-50 px-3 py-[14px] transition-all hover:border-blue-400 hover:bg-blue-50"
                  >
                    <Upload className="h-4 w-4 text-slate-400" />
                    <span className="truncate text-xs text-slate-600">
                      {selectedFile
                        ? selectedFile.name
                        : 'Ningún archivo seleccionado'}
                    </span>
                  </label>
                </label>

                <button
                  onClick={handleUploadFile}
                  disabled={!selectedFile || isLoading}
                  className="w-full rounded-md bg-blue-600 px-4 py-2 text-xs font-medium text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <MonitorUp className="h-4 w-4" />
                      Subir
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Controles */}

            <ObtenerDatos tablaListRef={tablaListRef} />
             


            {/* Estadísticas - En una sola columna */}
            <div className="flex flex-col gap-3 ">
              {/* Total Servicios */}
              <div className="flex-1 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 p-2 text-white shadow-md">
                <div className="flex h-full items-center justify-between">
                  <div>
                    <p className="mb-0.5 text-xs font-medium text-blue-100">
                      Servicios
                    </p>
                    <p className="text-xl font-bold">{estadisticas.totalGrupos}</p>
                  </div>
                  <div className="rounded-full bg-white/20 p-2 backdrop-blur-sm">
                    <Briefcase className="h-4 w-4" />
                  </div>
                </div>
              </div>

              {/* Total Pasajeros */}
              <div className="flex-1 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 p-2 text-white shadow-md">
                <div className="flex h-full items-center justify-between">
                  <div>
                    <p className="mb-0.5 text-xs font-medium text-emerald-100">
                      Pasajeros
                    </p>
                    <p className="text-xl font-bold">{estadisticas.totalPasajeros}</p>
                  </div>
                  <div className="rounded-full bg-white/20 p-2 backdrop-blur-sm">
                    <Users className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Vista Previa */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-6xl rounded-lg bg-white shadow-2xl">
            {/* Header del Modal */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-[#113EB9] px-6 py-4">
              <div className="flex items-center gap-3">
                <h3 className="text-[14px] font-semibold text-white">
                  Vista Previa de Registros
                </h3>
                <span className="rounded bg-white/20 px-3 py-1 text-sm font-medium text-white">
                  Total: {processedData.length} registros
                </span>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="rounded-full p-1 text-white transition-colors hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tabla con Scroll */}
            <div className="max-h-[60vh] overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-100 text-xs uppercase text-slate-700">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">CODLAN</th>
                    <th className="px-4 py-3">TIPO</th>
                    <th className="px-4 py-3">FECHA</th>
                    <th className="px-4 py-3">HORA</th>
                    <th className="px-4 py-3">USUARIO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {processedData.map((record, index) => (
                    <tr
                      key={index}
                      className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                        } hover:bg-blue-50 transition-colors`}
                    >
                      <td className="px-4 py-3 text-slate-500">{index + 1}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {record.codlan}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
                          {record.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {record.fecha}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{record.hora}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {record.usuario}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer del Modal */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-slate-50 transition-all hover:bg-red-300 active:scale-95"
              >
                <X className="h-4 w-4" />
                Cancelar
              </button>
              <button
                onClick={handleSendToAPI}
                className="flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-emerald-500 active:scale-95"
              >
                <Send className="h-4 w-4" />
                Enviar Datos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Progreso de Envío */}
      {isSending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-2xl">
            <div className="text-center">
              <Spinner color="primary" size='md' />
              <h3 className="mt-4 text-xl font-semibold text-slate-800">
                Enviando datos a la API
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Por favor espera mientras se procesan los registros...
              </p>

              {/* Barra de progreso */}
              <div className="mt-6">
                <div className="mb-2 flex justify-between text-sm font-medium text-slate-700">
                  <span>Progreso</span>
                  <span>
                    {sendProgress.current} / {sendProgress.total}
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-300"
                    style={{
                      width: `${(sendProgress.current / sendProgress.total) * 100}%`,
                    }}
                  ></div>

                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {Math.round(
                    (sendProgress.current / sendProgress.total) * 100
                  )}
                  % completado
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Resultados */}
      {showResultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-2xl">
            {/* Header */}
            <div className="border-b border-slate-200 bg-[#e7ecef]
           px-6 py-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-black" />
                <h3 className="text-[15px] font-semibold text-black">
                  Proceso Completado
                </h3>
              </div>
            </div>

            {/* Contenido */}
            <div className="p-6">
              <div className="space-y-4">
                {/* Éxitos */}
                <div className="flex items-center justify-between rounded-lg bg-emerald-50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-emerald-500 p-2">
                      <CheckCircle2 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        Registros enviados
                      </p>
                      <p className="text-xs text-slate-500">
                        Procesados correctamente
                      </p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-emerald-600">
                    {apiResults.success}
                  </span>
                </div>

                {/* Fallos */}
                {apiResults.failed > 0 && (
                  <div className="flex items-center justify-between rounded-lg bg-red-50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-red-500 p-2">
                        <AlertCircle className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700">
                          Registros fallidos
                        </p>
                        <p className="text-xs text-slate-500">
                          No se pudieron procesar
                        </p>
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-red-600">
                      {apiResults.failed}
                    </span>
                  </div>
                )}

                {/* Total */}
                <div className="rounded-lg border-2 border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-700">
                      Total de registros procesados
                    </p>
                    <span className="text-2xl font-bold text-slate-800">
                      {apiResults.success + apiResults.failed}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 bg-slate-50 px-6 py-4">
              {apiResults.failed > 0 ? (
                <div className="space-y-2">
                  <button
                    onClick={() => {
                   
                      window.open('/trackvelnew/planificacion/planificacionTalma/erroresTalma', '_blank');
                    }}
                    className="w-full rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-red-700 active:scale-95 flex items-center justify-center gap-2"
                  >
                    <AlertCircle className="h-4 w-4" />
                    Ver Errores ({apiResults.failed})
                  </button>
                  <button
                    onClick={() => {
                      setShowResultModal(false);
                      setProcessedData([]);
                      setSelectedFile(null);
                    }}
                    className="w-full rounded-md bg-slate-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-slate-700 active:scale-95"
                  >
                    Cerrar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setShowResultModal(false);
                    setProcessedData([]);
                    setSelectedFile(null);
                  }}
                  className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95"
                >
                  Cerrar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}