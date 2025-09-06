import React, { useState, useRef } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from '@nextui-org/react';
import { toast, Toaster } from 'sonner';
import '@/app/styles/sonner.css';
import { useSession } from 'next-auth/react';
import {
  ChevronDownIcon,
  DocumentArrowUpIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

interface AppModalProps {
  isOpen: boolean;
  onClose: () => void;
  titulo: string;
  useSelectAll?: boolean;
  icono?: React.ReactNode;
}

const AppModalCargaDatos: React.FC<AppModalProps> = ({
  isOpen,
  onClose,
  titulo,
  useSelectAll = false,
  icono,
}) => {
  const [selectedProveedor, setSelectedProveedor] = useState<string>('');
  const [tipoTransporte, setTipoTransporte] = useState<string>('');
  const [archivoExcel, setArchivoExcel] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: session } = useSession();

  const proveedores = [
    'Remisse',
    'Eslesac',
    'Gacela',
    'Movibus',
    'MovibusREP',
    'MovibusAVIANCA',
    'MovibusMKC',
    'MovibusSIEMENS',
    'MovibusMAFRE',
    'MovibusCJM',
    'GacelaTERPEL',
    'GacelaDHL',
  ];

  const handleProveedorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedProveedor(e.target.value);
  };

  const handleTipoTransporteChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    setTipoTransporte(e.target.value);
  };

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

  const getUsuarioFromProveedor = (proveedor: string): string => {
    // Convertir a minúsculas
    const proveedorLower = proveedor.toLowerCase();

    // Caso especial para Gacela
    if (proveedorLower === 'gacela') {
      return 'cgacela';
    }

    return proveedorLower;
  };

  const getTipoGrupo = (tipoTransporte: string): string => {
    return tipoTransporte.toLowerCase() === 'aire' ? 'A' : 'T';
  };

  const handleCargarDatos = async () => {
    if (!selectedProveedor || !tipoTransporte || !archivoExcel) {
      toast.error('Completa todos los campos requeridos', {
        className: 'toast-slide-in',
        richColors: true,
      });
      return;
    }

    setIsProcessing(true);

    // Mostrar toast de loading
    const loadingToastId = toast.loading('Procesando archivo Excel...', {
      className: 'toast-slide-in',
    });

    try {
      // Preparar los parámetros de la URL
      const tipoGrupo = getTipoGrupo(tipoTransporte);
      const usuario = getUsuarioFromProveedor(selectedProveedor);

      // Crear FormData para enviar el archivo
      const formData = new FormData();
      formData.append('file', archivoExcel);

      // Construir la URL con los parámetros
      const apiUrl = `https://velsat.pe:2096/api/Gacela/ProcessExcel?tipoGrupo=${tipoGrupo}&usuario=${usuario}`;

      // Realizar la llamada a la API
      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      // Obtener la respuesta como texto primero
      const responseText = await response.text();

      // Log para debug (puedes remover esto después)
      console.log('Response text length:', responseText.length);
      console.log('Response starts with:', responseText.substring(0, 100));
      console.log(
        'Response ends with:',
        responseText.substring(responseText.length - 100),
      );

      // Intentar parsear como JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('JSON Parse Error:', jsonError);
        console.error(
          'Problematic area (±20 chars):',
          responseText.substring(14739, 14779),
        );

        // Intentar extraer el mensaje si existe en el JSON malformado
        let mensaje = 'Datos procesados correctamente';
        const mensajeMatch = responseText.match(/"mensaje"\s*:\s*"([^"]+)"/);
        if (mensajeMatch && mensajeMatch[1]) {
          mensaje = mensajeMatch[1];
        }

        // Actualizar el toast de loading a success
        toast.success(mensaje, {
          id: loadingToastId,
          className: 'toast-slide-in',
          richColors: true,
        });

        // Solo limpiar el formulario, NO cerrar el modal
        handleReset();
        return;
      }

      // Mostrar solo el mensaje de la respuesta
      if (data && data.mensaje) {
        // Actualizar el toast de loading a success
        toast.success(data.mensaje, {
          id: loadingToastId,
          className: 'toast-slide-in',
          richColors: true,
        });
      } else {
        // Actualizar el toast de loading a success
        toast.success('¡Datos procesados correctamente!', {
          id: loadingToastId,
          className: 'toast-slide-in',
          richColors: true,
        });
      }

      handleReset();
      setTimeout(() => {
        handleModalClose();
      }, 1500);
    } catch (error) {
      console.error('Error al procesar datos:', error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Error desconocido al procesar los datos';

      // Actualizar el toast de loading a error
      toast.error(`Error al procesar los datos: ${errorMessage}`, {
        id: loadingToastId,
        className: 'toast-slide-in',
        richColors: true,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setSelectedProveedor('');
    setTipoTransporte('');
    setArchivoExcel(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleModalClose = () => {
    if (!isProcessing) {
      handleReset();
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={handleModalClose}
      size="2xl"
      isDismissable={!isProcessing}
    >
      <ModalContent className="border-0 bg-white shadow-2xl">
        {() => (
          <>
            <ModalHeader className="flex flex-col gap-0 rounded-t-lg text-black">
              <div className="flex items-center justify-center gap-2">
                <h2 className="text-[13px] font-semibold uppercase tracking-wide">
                  Carga de Datos Latam
                </h2>
              </div>
            </ModalHeader>

            <ModalBody className="space-y-0  px-8 py-4">
              {/* Selector de Proveedor */}
              <div className="space-y-2">
                <div className="relative">
                  <select
                    value={selectedProveedor}
                    onChange={handleProveedorChange}
                    disabled={isProcessing}
                    className="w-full appearance-none rounded border border-gray-300 bg-white px-4 py-2 pr-10 text-[12px] font-medium text-gray-800 shadow-sm transition-all duration-200 hover:border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:bg-gray-100 disabled:text-gray-500"
                  >
                    <option value="">Seleccionar proveedor</option>
                    {proveedores.map((proveedor) => (
                      <option key={proveedor} value={proveedor}>
                        {proveedor}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-gray-400" />
                </div>
              </div>

              {/* Selector de Tipo de Transporte */}
              <div className="space-y-2">
                <div className="relative">
                  <select
                    value={tipoTransporte}
                    onChange={handleTipoTransporteChange}
                    disabled={isProcessing}
                    className="w-full appearance-none rounded border border-gray-300 bg-white px-4 py-2 pr-10 text-[12px] font-medium text-gray-800 shadow-sm transition-all duration-200 hover:border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:bg-gray-100 disabled:text-gray-500"
                  >
                    <option value="">Seleccionar tipo</option>
                    <option value="tierra">Tierra</option>
                    <option value="aire">Aire</option>
                  </select>
                  <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-gray-400" />
                </div>
              </div>

              {/* Carga de Archivo Excel */}
              <div className="space-y-2">
                <div
                  className={`group relative cursor-pointer rounded-xl border-2 border-dashed p-4 text-center transition-all duration-300 ${
                    isProcessing
                      ? 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-50'
                      : isDragOver
                        ? 'border-blue-400 bg-blue-50'
                        : archivoExcel
                          ? 'border-green-400 bg-green-50'
                          : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
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

                  {archivoExcel ? (
                    <div className="flex flex-col items-center gap-3">
                      <CheckCircleIcon className="h-12 w-12 text-green-500" />
                      <div>
                        <p className="text-lg font-semibold text-green-700">
                          {archivoExcel.name}
                        </p>
                        <p className="text-sm text-green-600">
                          {(archivoExcel.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <p className="text-sm text-green-600">
                        Archivo cargado exitosamente
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      <DocumentArrowUpIcon className="h-16 w-16 text-gray-400 transition-colors group-hover:text-gray-500" />
                      <div>
                        <p className="mb-1 text-[14px] font-semibold text-gray-700">
                          Arrastra tu archivo Excel aquí
                        </p>
                        <p className="mb-3 text-[12px] text-gray-500">
                          o haz clic para seleccionar
                        </p>
                        <div className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
                          Seleccionar Archivo
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-center text-xs text-gray-500">
                  Formatos soportados: .xlsx, .xls
                </p>
              </div>

              {/* Indicador de procesamiento */}
              {isProcessing && (
                <div className="flex items-center justify-center gap-3 rounded-lg bg-blue-50 p-4">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                  <p className="font-medium text-blue-700">
                    Procesando datos...
                  </p>
                </div>
              )}
            </ModalBody>

            <ModalFooter className="rounded-b-lg bg-gray-50 px-8">
              <div className="flex w-full gap-3">
                <button
                  onClick={handleModalClose}
                  disabled={isProcessing}
                  className="flex-1 rounded-md bg-red-600 py-2 font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  onClick={handleCargarDatos}
                  disabled={isProcessing}
                  className="flex-1 rounded-md bg-green-600 py-2 font-semibold text-white shadow-lg transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isProcessing ? 'Procesando...' : 'Procesar Datos'}
                </button>
              </div>
            </ModalFooter>
          </>
        )}
      </ModalContent>
      <Toaster />
    </Modal>
  );
};

export default AppModalCargaDatos;
