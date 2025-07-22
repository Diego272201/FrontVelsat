'use client';
import React, { useEffect, useState } from 'react';
import { BiSolidError } from 'react-icons/bi';
import {
  FiFile,
  FiUser,
  FiCode,
  FiBriefcase,
  FiAlertTriangle,
} from 'react-icons/fi';
import { HiOutlineExclamationCircle } from 'react-icons/hi';

interface ErrorReporte {
  item: number;
  codigoOracle: string;
  nombre: string;
  subarea: string;
  rol: string;
  motivo: string;
  archivo: string;
}

export default function ReporteErrores() {
  const [errores, setErrores] = useState<ErrorReporte[]>([]);

  useEffect(() => {
    const storedErrors = localStorage.getItem('erroresReporte');
    if (storedErrors) {
      setErrores(JSON.parse(storedErrors));
    }
  }, []);

  return (
    <div className="flex h-screen w-full flex-col">
      {/* Header - 10% de altura */}
      <div className="mb-0 flex h-[60px] w-full flex-col justify-center bg-gradient-to-r from-blue-600 to-blue-700 py-1">
        <div className="mb-1 flex items-center justify-center gap-3">
          <div className="rounded-full bg-white bg-opacity-20 p-1">
            <BiSolidError className="text-white" size={20} />
          </div>
          <h1 className="text-[15px] font-bold text-white">
            REPORTE DE ERRORES
          </h1>
        </div>

        <p className="text-center text-sm text-blue-100">
          Errores detectados durante la carga del archivo
        </p>
      </div>

      {/* Contenido principal - 90% de altura */}
      <div className="h-[92%] px-6 py-4">
        {errores.length > 0 ? (
          <div className="flex h-full w-full flex-col overflow-hidden border border-gray-200 bg-white shadow-lg">
            {/* Header */}
            <div className="flex-shrink-0 border-b border-red-200 bg-gradient-to-r from-red-50 to-red-100">
              <div className="grid w-full grid-cols-[0.5fr_1fr_3fr_1fr_1fr_2fr_2fr] gap-2 px-6 py-1 text-sm font-semibold text-red-800">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center bg-red-200 text-xs">
                    #
                  </span>
                  Item
                </div>
                <div className="flex items-center gap-2">
                  <FiCode className="text-red-600" size={16} />
                  Código Oracle
                </div>
                <div className="flex items-center gap-2">
                  <FiUser className="text-red-600" size={16} />
                  Nombre
                </div>
                <div className="flex items-center gap-2">
                  <FiBriefcase className="text-red-600" size={16} />
                  Subárea
                </div>
                <div className="flex items-center gap-2">
                  <FiUser className="text-red-600" size={16} />
                  Rol
                </div>
                <div className="flex items-center gap-2">
                  <FiAlertTriangle className="text-red-600" size={16} />
                  Motivo
                </div>
                <div className="flex items-center gap-2">
                  <FiFile className="text-red-600" size={16} />
                  Archivo
                </div>
              </div>
            </div>

            {/* Contenido */}
            <div className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 flex-1 overflow-y-auto">
              {errores.map((error, index) => (
                <div
                  key={error.item}
                  className={`grid grid-cols-[0.5fr_1fr_3fr_1fr_1fr_2fr_2fr] gap-2 border-b border-gray-100 px-6 py-1 transition-colors duration-200 hover:bg-gray-50 ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-25'
                  } w-full`}
                >
                  <div className="flex items-center">
                    <span className="flex h-6 w-6 items-center justify-center bg-red-100 text-sm font-medium text-red-700">
                      {error.item}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="overflow-hidden truncate whitespace-nowrap rounded-full px-1  py-0.5 text-xs font-medium text-blue-800">
                      {error.codigoOracle}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span
                      className="overflow-hidden truncate whitespace-nowrap text-[12px] text-gray-800"
                      title={error.nombre}
                    >
                      {(error.nombre || '')
                        .toLowerCase()
                        .split(' ')
                        .map(
                          (word) =>
                            word.charAt(0).toUpperCase() + word.slice(1),
                        )
                        .join(' ')}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span
                      className="overflow-hidden truncate whitespace-nowrap rounded bg-gray-100 px-2 py-1 text-xs text-gray-700"
                      title={error.subarea}
                    >
                      {error.subarea}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="overflow-hidden truncate whitespace-nowrap rounded bg-green-100 px-2 py-1 text-xs text-green-800">
                      {error.rol || 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div className="flex items-center gap-2">
                      <HiOutlineExclamationCircle
                        className="flex-shrink-0 text-amber-500"
                        size={16}
                      />
                      <span
                        className="overflow-hidden truncate whitespace-nowrap text-sm text-gray-700"
                        title={error.motivo}
                      >
                        {error.motivo}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="flex items-center gap-2">
                      <FiFile
                        className="flex-shrink-0 text-gray-800"
                        size={14}
                      />
                      <span
                        className="overflow-hidden truncate whitespace-nowrap text-[12px] text-gray-800"
                        title={error.archivo}
                      >
                        {error.archivo}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50 px-6 py-3">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Total de errores: {errores.length}</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-red-500"></div>
                  <span>Errores de carga</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-16 text-center">
            <div className="mb-4">
              <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-green-100">
                <svg
                  className="h-12 w-12 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
            <h3 className="mb-2 text-xl font-semibold text-gray-800">
              ¡Todo perfecto!
            </h3>
            <p className="mx-auto max-w-md text-gray-600">
              No se han registrado errores en la carga de archivos. Todos los
              procesos se completaron exitosamente.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
