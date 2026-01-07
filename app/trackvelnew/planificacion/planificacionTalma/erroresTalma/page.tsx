'use client';
import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Download,
  Trash2,
  FileX,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@nextui-org/react';

interface ErrorDetail {
  id: number;
  codlan: string;
  motivo: string;
}

export default function Page() {
  const router = useRouter();
  const [errors, setErrors] = useState<ErrorDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Leer errores desde localStorage
    const storedErrors = localStorage.getItem('talmaErrors');
    
    if (storedErrors) {
      try {
        const parsedErrors = JSON.parse(storedErrors);
        setErrors(parsedErrors);
      } catch (error) {
        console.error('Error al parsear errores:', error);
        setErrors([]);
      }
    }
    
    setIsLoading(false);
  }, []);



  const handleDownloadErrors = () => {
    // Crear CSV con los errores
    const csvContent = [
      ['#', 'CODLAN', 'MOTIVO'].join(','),
      ...errors.map((error, index) => 
        [index + 1, error.codlan, `"${error.motivo}"`].join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `errores_talma_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };



  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
                  <Spinner color="primary" size='md' />

          <p className="mt-4 text-sm text-slate-600">Cargando errores...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-6 shadow-lg">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
           
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Errores de Procesamiento - Talma
                </h1>
                <p className="mt-1 text-sm text-red-100">
                  Registros que no pudieron ser procesados correctamente
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-white/20 px-4 py-2 text-sm font-semibold text-white">
                {errors.length} {errors.length === 1 ? 'Error' : 'Errores'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="mx-auto max-w-7xl px-0 py-4">
        {errors.length === 0 ? (
          // Sin errores
          <div className="rounded-lg bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100">
              <FileX className="h-12 w-12 text-emerald-600" />
            </div>
            <h3 className="mt-6 text-xl font-semibold text-slate-800">
              No hay errores registrados
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Todos los registros se procesaron correctamente o no hay datos disponibles.
            </p>
       
          </div>
        ) : (
          <>
            {/* Acciones */}
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-slate-600">
                Mostrando <span className="font-semibold">{errors.length}</span>{' '}
                {errors.length === 1 ? 'error' : 'errores'}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleDownloadErrors}
                  className="flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-95"
                >
                  <Download className="h-4 w-4" />
                  Descargar CSV
                </button>
        
              </div>
            </div>

            {/* Tabla de Errores con Scroll */}
            <div className="overflow-hidden rounded-lg bg-white shadow-md">
              <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-100 text-xs uppercase text-slate-700">
                    <tr>
                      <th className="px-6 py-4 font-semibold">#</th>
                      <th className="px-6 py-4 font-semibold">CODLAN</th>
                      <th className="px-6 py-4 font-semibold">MOTIVO DEL ERROR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {errors.map((error, index) => (
                      <tr
                        key={index}
                        className={`${
                          index % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                        } transition-colors hover:bg-red-50`}
                      >
                        <td className="px-6 py-4 text-slate-500">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 font-mono text-xs font-semibold text-slate-800">
                            {error.codlan}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                            <span className="text-slate-700">
                              {error.motivo}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer con información adicional */}
            <div className="mt-4 rounded-lg border-l-4 border-red-500 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
                <div>
                  <h4 className="font-semibold text-slate-800">
                    Información sobre los errores
                  </h4>
                  <p className="mt-1 text-sm text-slate-600">
                    Los registros listados no pudieron ser procesados. Revisa los motivos de error
                    y corrige los datos en el archivo Excel antes de volver a intentar.
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    Puedes descargar los errores en formato CSV para revisarlos más fácilmente.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}