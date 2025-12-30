'use client';
import React, { useState } from 'react';
import {
  Upload,
  X,
  Download,
  Filter,
  Users,
  Briefcase,
  Trash2,
  Plus,
  ChevronDown,
  ChevronUp,
  Eye,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface PassengerRecord {
  codlan: string;
  tipo: string;
  fecha: string;
  hora: string;
  usuario: string;
}

export default function Header() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedService, setSelectedService] = useState('Entrada');
  const [selectedDate, setSelectedDate] = useState('2025-12-16');
  const [selectedTime, setSelectedTime] = useState('00:00');
  const [filterType, setFilterType] = useState('Todos');
  const [passengerFilter, setPassengerFilter] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [processedData, setProcessedData] = useState<PassengerRecord[]>([]);
  const [sendProgress, setSendProgress] = useState({ current: 0, total: 0 });
  const [apiResults, setApiResults] = useState<{ success: number; failed: number }>({
    success: 0,
    failed: 0,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Validar que sea un archivo Excel
      const validExtensions = ['.xlsx', '.xls'];
      const fileExtension = file.name
        .substring(file.name.lastIndexOf('.'))
        .toLowerCase();

      if (!validExtensions.includes(fileExtension)) {
        alert('Por favor, selecciona un archivo Excel válido (.xlsx o .xls)');
        return;
      }

      setSelectedFile(file);
    }
  };

  // Convertir número serial de Excel a fecha DD/MM/YYYY
  const excelSerialToDate = (serial: number): string => {
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);

    const day = String(date_info.getUTCDate()).padStart(2, '0');
    const month = String(date_info.getUTCMonth() + 1).padStart(2, '0');
    const year = date_info.getUTCFullYear();

    return `${day}/${month}/${year}`;
  };

  // Convertir hora de Excel a HH:MM
  const excelTimeToString = (time: any): string => {
    if (typeof time === 'string') return time;

    // Si es un número decimal (0.5 = 12:00 PM)
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
      alert('Por favor, selecciona un archivo Excel primero');
      return;
    }

    setIsLoading(true);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });

      // Leer la Hoja 2 (índice 1)
      const sheetName = workbook.SheetNames[1];

      if (!sheetName) {
        alert('El archivo no tiene una segunda hoja');
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

        // Si no hay DNI, terminamos la lectura
        if (!dni || dni === '') {
          break;
        }

        // Extraer datos
        const codlan = `TA${dni}`;
        const tipo = row[4] ? String(row[4]).toUpperCase() : ''; // Columna E (índice 4) - TIPO SERVICIO

        // Columna G (índice 6) - FECHA
        let fecha = '';
        if (typeof row[6] === 'number') {
          fecha = excelSerialToDate(row[6]);
        } else if (row[6]) {
          fecha = String(row[6]);
        }

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
      alert('Hubo un error al procesar el archivo Excel');
      setIsLoading(false);
    }
  };

const handleSendToAPI = async () => {
  setIsSending(true);
  setShowPreviewModal(false);
  setSendProgress({ current: 0, total: processedData.length });
  setApiResults({ success: 0, failed: 0 });

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
    console.log('📊 INICIANDO ENVÍO A LA API');
    console.log('========================================');
    console.log('🔗 URL:', API_URL);
    console.log('📦 Total de registros:', processedData.length);
    console.log('📋 Número de lotes:', batches.length);
    console.log('⚙️ Tamaño de cada lote:', BATCH_SIZE);
    console.log('⚡ Requests concurrentes:', CONCURRENT_REQUESTS);
    console.log('========================================\n');

    // Procesar lotes con concurrencia limitada
    for (let i = 0; i < batches.length; i += CONCURRENT_REQUESTS) {
      const currentBatches = batches.slice(i, i + CONCURRENT_REQUESTS);

      const promises = currentBatches.map(async (batch, batchIndex) => {
        const actualBatchNumber = i + batchIndex + 1;
        
        console.log(`\n🚀 Enviando Lote ${actualBatchNumber}/${batches.length}`);
        console.log('📝 Datos a enviar:', JSON.stringify(batch, null, 2));
        
        try {
          const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(batch),
          });

          console.log(`✅ Lote ${actualBatchNumber} - Status:`, response.status);
          console.log(`✅ Lote ${actualBatchNumber} - OK:`, response.ok);

          if (response.ok) {
            const responseData = await response.json();
            console.log(`✅ Lote ${actualBatchNumber} - Respuesta:`, responseData);
            return { success: batch.length, failed: 0 };
          } else {
            const errorText = await response.text();
            console.error(`❌ Lote ${actualBatchNumber} - Error:`, errorText);
            return { success: 0, failed: batch.length };
          }
        } catch (error) {
          console.error(`❌ Lote ${actualBatchNumber} - Exception:`, error);
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

      console.log(`\n📊 Progreso: ${processedCount}/${processedData.length} registros procesados`);
    }

    console.log('\n========================================');
    console.log('✅ ENVÍO COMPLETADO');
    console.log('========================================');
    console.log('✔️ Exitosos:', successCount);
    console.log('❌ Fallidos:', failedCount);
    console.log('📊 Total:', successCount + failedCount);
    console.log('========================================\n');

    setIsSending(false);
    setShowResultModal(true);
  } catch (error) {
    console.error('💥 ERROR GENERAL:', error);
    alert('Hubo un error al enviar los datos a la API');
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
        <div className="px-4 pt-2 pb-2">
          {/* FILA 1: Carga + Controles + Filtros + Estadísticas */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr_1fr_0.5fr] justify-between">
            {' '}
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
                      <Eye className="h-4 w-4" />
                      Subir
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Controles */}
            <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4 text-blue-600" />
                  <h2 className="text-[12px] font-semibold text-slate-800">
                    Obtener Datos
                  </h2>
                </div>
              </div>

              <div className="mb-2 grid grid-cols-3 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Servicio
                  </label>
                  <select
                    value={selectedService}
                    onChange={(e) => setSelectedService(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                  >
                    <option>Entrada</option>
                    <option>Salida</option>
                    <option>Conexión</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Hora
                  </label>
                  <input
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button className="flex items-center justify-center gap-1 rounded-md bg-emerald-600 px-2 py-1.5 text-xs font-medium text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-95">
                  <Download className="h-3 w-3" />
                  Cargar
                </button>
                <button className="flex items-center justify-center gap-1 rounded-md bg-red-600 px-2 py-1.5 text-xs font-medium text-white shadow-sm transition-all hover:bg-red-700 active:scale-95">
                  <X className="h-3 w-3" />
                  Eliminar
                </button>
              </div>
            </div>

            {/* Filtros */}
            <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Filter className="h-4 w-4 text-blue-600" />
                <h2 className="text-[12px] font-semibold text-slate-800">
                  Filtrar Datos
                </h2>
              </div>

              <div className="mb-2 grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Tipo
                  </label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                  >
                    <option>Todos</option>
                    <option>VIP</option>
                    <option>Regular</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Pasajero
                  </label>
                  <input
                    type="text"
                    value={passengerFilter}
                    onChange={(e) => setPassengerFilter(e.target.value)}
                    placeholder="Buscar..."
                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1">
                <button className="flex items-center justify-center gap-1 rounded-md bg-red-100 px-2 py-1.5 text-xs font-medium text-red-700 transition-all hover:bg-red-200 active:scale-95">
                  <Trash2 className="h-3 w-3" />
                  Elim.
                </button>
                <button className="flex items-center justify-center gap-1 rounded-md bg-amber-100 px-2 py-1.5 text-xs font-medium text-amber-700 transition-all hover:bg-amber-200 active:scale-95">
                  <X className="h-3 w-3" />
                  Limpiar
                </button>
                <button className="flex items-center justify-center gap-1 rounded-md bg-emerald-600 px-2 py-1.5 text-xs font-medium text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-95">
                  <Plus className="h-3 w-3" />
                  Grupo
                </button>
              </div>
            </div>

            {/* Estadísticas - En una sola columna */}
            <div className="flex flex-col gap-3 ">
              {/* Total Servicios */}
              <div className="flex-1 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 p-2 text-white shadow-md">
                <div className="flex h-full items-center justify-between">
                  <div>
                    <p className="mb-0.5 text-xs font-medium text-blue-100">
                      Servicios
                    </p>
                    <p className="text-xl font-bold">3</p>
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
                    <p className="text-xl font-bold">3</p>
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
                <Eye className="h-5 w-5 text-white" />
                <h3 className="text-lg font-semibold text-white">
                  Vista Previa de Registros
                </h3>
                <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-medium text-white">
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
                      className={`${
                        index % 2 === 0 ? 'bg-white' : 'bg-slate-50'
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
                className="flex items-center gap-2 rounded-md bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-all hover:bg-slate-300 active:scale-95"
              >
                <X className="h-4 w-4" />
                Cancelar
              </button>
              <button
                onClick={handleSendToAPI}
                className="flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-95"
              >
                <Send className="h-4 w-4" />
                Enviar a API
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
              <Loader2 className="mx-auto h-16 w-16 animate-spin text-blue-600" />
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
            <div className="border-b border-slate-200 bg-gradient-to-r from-emerald-500 to-blue-500 px-6 py-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-white" />
                <h3 className="text-lg font-semibold text-white">
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
            </div>
          </div>
        </div>
      )}
    </>
  );
}