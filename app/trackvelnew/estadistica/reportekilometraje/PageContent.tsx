'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { IoCarSport } from 'react-icons/io5';
import '@/app/styles/table.css';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Pagination,
  Spinner,
} from '@nextui-org/react';

import VistaUnidad from '@/app/components/ui/VistaUnidad';
import { useApi } from '@/context/ApiContext';
import ReporteHeader from '@/app/components/ReporteHeader';
import { formatDate } from '@/app/components/dates/convertToCustomFormat ';
import useCalculateRowsPerPage from '@/app/components/table/useCalculateRowsPerPage';
import ButtonDownloadFloat from '@/app/components/ui/ButtonDownloadFloat';
import axios from 'axios';

interface Row {
  item: number;
  deviceId: string;
  maximo: number;
  minimo: number;
}

export default function PageContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const deviceId = searchParams.get('deviceId');
  const [rows, setRows] = useState<Row[]>([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<string | null>(null);
  const { baseUrl } = useApi();
  const [isBaseUrlReady, setIsBaseUrlReady] = useState(false);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [isAllUnitsSelected, setIsAllUnitsSelected] = useState<boolean>(false);

  useEffect(() => {
    const isAll = deviceId === 'Todas las unidades';
    setIsAllUnitsSelected(isAll);
  }, [deviceId]);

  const defaultTab = useMemo(() => {
    return deviceId === 'Todas las unidades' ? 'tabla' : 'vista';
  }, [deviceId]);

  useEffect(() => {
    setSelectedTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    if (baseUrl) {
      setIsBaseUrlReady(true);
    }
  }, [baseUrl]);

  const username = session?.user?.username;

  useEffect(() => {
    if (!username || !baseUrl) return;

    const tableUrlAll = `/api/Kilometer/kilometerall/${startDate}/${endDate}/${username}`;
    const tableUrlOnly = `/api/Kilometer/kilometer/${startDate}/${endDate}/${deviceId}/${username}`;
    const url = deviceId === 'Todas las unidades' ? tableUrlAll : tableUrlOnly;

    setIsLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        const response = await axios.get(`${baseUrl}${url}`);
        const data = response.data?.result?.listaKilometros || [];
        setRows(data);
        console.log(data);
      } catch (error) {
        setError('Error al cargar los datos');

        console.error('Error fetching data:', error);
        setRows([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [username, deviceId, baseUrl, startDate, endDate]);

  useEffect(() => {
    if (selectedTab === 'vista' && rows.length > 0) {
      let loadedImages = 0;
      const totalImages = rows.length;
      setImagesLoading(true);

      const checkAllImagesLoaded = () => {
        if (loadedImages === totalImages) {
          setImagesLoading(false);
        }
      };

      rows.forEach((row) => {
        const img = new Image();
        img.src = '/UnidadK.webp';
        img.onload = img.onerror = () => {
          loadedImages++;
          checkAllImagesLoaded();
        };
      });
    }
  }, [selectedTab, rows]);

  const rowsPerPage = useCalculateRowsPerPage(40, 5, 130);
  const pages = Math.ceil(rows.length / rowsPerPage);

  const items = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return rows.slice(start, start + rowsPerPage);
  }, [page, rows, rowsPerPage]);

  const calculateDifference = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate.getTime() - startDate.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
    );
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return { days, hours, minutes };
  };

  const diff = useMemo(
    () =>
      startDate && endDate
        ? calculateDifference(startDate, endDate)
        : { days: 0, hours: 0, minutes: 0 },
    [startDate, endDate],
  );

  const extraInfo = `${diff.days} días, ${diff.hours} horas, ${diff.minutes} minutos`;

  return (
    <>
      <ReporteHeader
        title="REPORTE KILOMETRAJE"
        deviceId={deviceId ?? ''}
        startDate={startDate ?? ''}
        endDate={endDate ?? ''}
        extraInfo={extraInfo}
        formatDate={formatDate}
        icon={<IoCarSport size={25} />}
      />

      <ButtonDownloadFloat
        startDate={startDate || ''}
        endDate={endDate || ''}
        devideId={deviceId || ''}
        namedown="downloadExcelK"
        namedesc="kilometraje"
        username={username || ''}
        nameurl="reportekilometraje"
        isKilometrajeAll={isAllUnitsSelected}
      />

      <div className="">
        <div className="flex w-full flex-col">
          {/* Tabs */}
          <div className="m-2 flex gap-2">
            <button
              onClick={() => setSelectedTab('tabla')}
              className={`px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                selectedTab === 'tabla'
                  ? 'bg-orange-100 text-orange-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-orange-100'
              }`}
            >
              Tabla
            </button>
            <button
              onClick={() => setSelectedTab('vista')}
              className={`px-4 py-2 text-sm font-medium  transition-colors duration-200 ${
                selectedTab === 'vista'
                  ? 'bg-orange-100 text-orange-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-orange-100'
              }`}
            >
              Vista Unidad
            </button>
          </div>

          {/* TAB: Tabla */}
          {selectedTab === 'tabla' && (
            <>
              {isLoading ? (
                <div className="flex min-h-screen items-center justify-center">
                  <div className="space-y-4 p-4">
                    <Spinner color="warning" />
                  </div>
                </div>
              ) : (
                <div className="h-full w-full p-2">
                  <div className="overflow-auto  border border-gray-200">
                    <table className="min-w-full table-auto text-sm text-gray-700">
                      <thead className="bg-gray-100 text-xs uppercase text-gray-600">
                        <tr>
                          <th className="px-3 py-2 text-center">ITEM</th>
                          <th className="px-3 py-2 text-center">UNIDAD</th>
                          <th className="px-3 py-2 text-center">KILÓMETROS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.length === 0 ? (
                          <tr>
                            <td
                              colSpan={3}
                              className="py-8 text-center text-sm text-gray-500"
                            >
                              No hay datos para las fechas ingresadas
                            </td>
                          </tr>
                        ) : (
                          items.map((item) => (
                            <tr
                              key={item.item}
                              className="border-t border-gray-200 bg-white hover:bg-gray-50"
                            >
                              <td className="px-3 py-2 text-center text-[12px]">
                                {item.item}
                              </td>
                              <td className="px-3 py-2 text-center text-[12px]">
                                {item.deviceId.toUpperCase()}
                              </td>
                              <td className="px-3 py-2 text-center text-[12px]">
                                {(item.maximo - item.minimo).toFixed(2)} Km
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Paginación */}
                  {rows.length > 0 && (
                    <div className="mt-4 flex justify-center gap-2 text-sm">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className={`rounded border px-3 py-1 ${
                          page === 1
                            ? 'cursor-not-allowed bg-gray-200 text-gray-400'
                            : 'bg-white text-blue-600 hover:bg-blue-100'
                        }`}
                      >
                        Anterior
                      </button>

                      {Array.from({ length: pages }, (_, i) => i + 1)
                        .filter((p) => Math.abs(p - page) <= 2)
                        .map((p) => (
                          <button
                            key={p}
                            onClick={() => setPage(p)}
                            className={`rounded border px-3 py-1 ${
                              p === page
                                ? 'bg-blue-500 text-white'
                                : 'bg-white text-blue-600 hover:bg-blue-100'
                            }`}
                          >
                            {p}
                          </button>
                        ))}

                      <button
                        onClick={() => setPage((p) => Math.min(p + 1, pages))}
                        disabled={page === pages}
                        className={`rounded border px-3 py-1 ${
                          page === pages
                            ? 'cursor-not-allowed bg-gray-200 text-gray-400'
                            : 'bg-white text-blue-600 hover:bg-blue-100'
                        }`}
                      >
                        Siguiente
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* TAB: Vista Unidad */}
          {selectedTab === 'vista' && (
            <>
              {isLoading ? (
                <div className="spinnerCenter">
                  <Spinner />
                </div>
              ) : rows.length === 0 ? (
                <div className="m-2 flex flex-col items-center justify-center bg-gray-100 p-6 text-gray-700">
                  <svg
                    className="mb-4 h-12 w-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 8v4m0 4h.01M12 3c5.25 0 9 3.75 9 9s-3.75 9-9 9-9-3.75-9-9 3.75-9 9-9z"
                    />
                  </svg>
                  <p className="text-lg font-semibold">
                    No hay datos disponibles
                  </p>
                  <p className="text-center text-sm text-gray-500">
                    Intenta cambiar las fechas o verifica si hay registros para
                    el periodo seleccionado.
                  </p>
                </div>
              ) : (
                <div className="listUnidad">
                  {rows.map((row) => (
                    <VistaUnidad
                      key={row.item}
                      item={row.item}
                      deviceId={row.deviceId}
                      kilometros={parseFloat(
                        (row.maximo - row.minimo).toFixed(2),
                      )}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
