'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Search } from 'lucide-react';
import '@/app/styles/table.css';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Spinner } from '@nextui-org/react';
import VistaUnidad from '@/app/components/ui/VistaUnidad';
import { useApi } from '@/context/ApiContext';
import ReporteHeader from '@/app/components/ReporteHeader';
import { formatDate } from '@/app/components/dates/convertToCustomFormat ';
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

  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const deviceId = searchParams.get('deviceId');

  const [rows, setRows] = useState<Row[]>([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'tabla' | 'vista'>('tabla');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAllUnitsSelected, setIsAllUnitsSelected] = useState<boolean>(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const theadRef = useRef<HTMLTableSectionElement>(null);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;

    const calculateRows = () => {
      let containerHeight = container.clientHeight;
      const theadHeight = theadRef.current?.offsetHeight || 32;

      if (!containerHeight || containerHeight < 150) {
        containerHeight = Math.max(300, (typeof window !== 'undefined' ? window.innerHeight : 600) - 180);
      }

      const availableHeight = Math.max(100, containerHeight - theadHeight);

      const firstRow = container.querySelector('tbody tr') as HTMLElement | null;
      const rowHeight =
        firstRow?.offsetHeight && firstRow.offsetHeight > 20
          ? firstRow.offsetHeight
          : 33;

      const calculatedRows = Math.max(5, Math.floor(availableHeight / rowHeight));
      setRowsPerPage((prev) => (prev !== calculatedRows ? calculatedRows : prev));
    };

    calculateRows();

    const resizeObserver = new ResizeObserver(() => {
      calculateRows();
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [rows.length, isLoading, selectedTab]);

  const { baseUrl } = useApi();
  const [isBaseUrlReady, setIsBaseUrlReady] = useState(false);

  useEffect(() => {
    const isAll = deviceId === 'Todas las unidades';
    setIsAllUnitsSelected(isAll);
  }, [deviceId]);

  useEffect(() => {
    if (baseUrl) {
      setIsBaseUrlReady(true);
    }
  }, [baseUrl]);

  const username = session?.user?.username;

  useEffect(() => {
    if (!username || !isBaseUrlReady || !startDate || !endDate) return;

    const tableUrlAll = `/api/Kilometer/kilometerall/${startDate}/${endDate}/${username}`;
    const tableUrlOnly = `/api/Kilometer/kilometer/${startDate}/${endDate}/${deviceId}/${username}`;
    const url = deviceId === 'Todas las unidades' ? tableUrlAll : tableUrlOnly;

    setIsLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        const response = await axios.get(`${baseUrl}${url}`);
        const data = response.data?.listaKilometros || [];
        setRows(data);
      } catch {
        setError('Error al cargar los datos');
        setRows([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [username, deviceId, baseUrl, isBaseUrlReady, startDate, endDate]);

  const calculateDifference = (start?: string | null, end?: string | null) => {
    if (!start || !end) {
      return { days: 0, hours: 0, minutes: 0, daysCount: 1, diffMs: 0 };
    }
    const s = new Date(start);
    const e = new Date(end);
    const diffMs = Math.max(0, e.getTime() - s.getTime());
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
    );
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const daysCount = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) || 1);
    return { days, hours, minutes, daysCount, diffMs };
  };

  const diff = useMemo(
    () => calculateDifference(startDate, endDate),
    [startDate, endDate],
  );

  const periodoFormatted = `${diff.days} día${diff.days === 1 ? '' : 's'} · ${diff.hours} h · ${diff.minutes} min`;

  const totalKm = useMemo(() => {
    return rows.reduce((acc, r) => acc + Math.max(0, r.maximo - r.minimo), 0);
  }, [rows]);

  const avgKmPerUnit = useMemo(() => {
    return rows.length > 0 ? totalKm / rows.length : 0;
  }, [rows, totalKm]);

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const term = searchTerm.toLowerCase().trim();
    return rows.filter((r) => r.deviceId?.toLowerCase().includes(term));
  }, [rows, searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedTab]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredRows.slice(start, start + rowsPerPage);
  }, [filteredRows, page, rowsPerPage]);

  return (
    <div className="flex w-full flex-col h-screen overflow-hidden bg-[#f0f4f8]">
      <ReporteHeader
        title="REPORTE KILOMETRAJE"
        deviceId={deviceId ?? ''}
        startDate={startDate ?? ''}
        endDate={endDate ?? ''}
        extraInfo={`${diff.days} días, ${diff.hours} horas, ${diff.minutes} minutos`}
        formatDate={formatDate}
        showSubHeader={false}
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

      <div className="flex flex-shrink-0 border-b border-gray-200 bg-white px-6">
        <button
          onClick={() => setSelectedTab('tabla')}
          className={`relative py-2.5 px-1 text-[13px] font-bold transition-colors ${
            selectedTab === 'tabla'
              ? 'border-b-2 border-[#113EB9] text-gray-900'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Tabla
        </button>
        <button
          onClick={() => setSelectedTab('vista')}
          className={`ml-8 relative py-2.5 px-1 text-[13px] font-bold transition-colors ${
            selectedTab === 'vista'
              ? 'border-b-2 border-[#113EB9] text-gray-900'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Vista unidad
        </button>
      </div>

      <div className="flex-shrink-0 border-b border-slate-200 bg-[#f0f4fd] px-4 py-1.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4 divide-x divide-slate-200 text-xs">
            <div className="flex flex-col">
              <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-600 leading-tight">
                UNIDADES
              </span>
              <span className="text-[12px] font-bold text-slate-900 leading-tight">
                {filteredRows.length}
              </span>
            </div>

            <div className="flex flex-col pl-4">
              <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-600 leading-tight">
                PERIODO
              </span>
              <span className="text-[12px] font-bold text-slate-900 leading-tight">
                {periodoFormatted}
              </span>
            </div>

            <div className="flex flex-col pl-4">
              <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-600 leading-tight">
                KILOMETRAJE TOTAL
              </span>
              <span className="text-[12px] font-bold text-[#113EB9] leading-tight">
                {totalKm.toFixed(2)} km
              </span>
            </div>

            <div className="flex flex-col pl-4">
              <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-600 leading-tight">
                PROMEDIO POR UNIDAD
              </span>
              <span className="text-[12px] font-bold text-slate-900 leading-tight">
                {avgKmPerUnit.toFixed(2)} km
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-56">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar unidad..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-7 w-full rounded-md border border-slate-200 bg-white pl-8 pr-3 text-[11px] placeholder-slate-400 focus:border-[#113EB9] focus:outline-none focus:ring-1 focus:ring-[#113EB9] transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading ? (
          <div className="flex min-h-[350px] items-center justify-center">
            <Spinner color="primary" size="lg" />
          </div>
        ) : error ? (
          <div className="flex min-h-[350px] flex-col items-center justify-center p-6 text-center">
            <p className="text-sm font-semibold text-red-600 mb-1">{error}</p>
            <p className="text-xs text-gray-500">Verifique el periodo seleccionado o la conexión</p>
          </div>
        ) : selectedTab === 'tabla' ? (
          <div ref={tableContainerRef} className="w-full h-full flex flex-col p-0">
            <div className="flex-1 overflow-hidden min-h-0">
              <table className="w-full text-xs text-gray-700">
                <thead
                  ref={theadRef}
                  className="bg-gray-300 text-[10px] uppercase text-gray-600"
                >
                  <tr>
                    <th className="p-2 text-center">ITEM</th>
                    <th className="p-2 text-center">UNIDAD</th>
                    <th className="p-2 text-center">KILÓMETROS RECORRIDOS</th>
                    <th className="p-2 text-center">% DEL TOTAL</th>
                    <th className="p-2 text-center">PROMEDIO DIARIO</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-sm text-gray-500">
                        No hay datos para las fechas ingresadas
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((item, index) => {
                      const km = Math.max(0, item.maximo - item.minimo);
                      const percentage = totalKm > 0 ? ((km / totalKm) * 100).toFixed(1) : '100';
                      const dailyAvg = (km / diff.daysCount).toFixed(1);
                      const globalIndex = (page - 1) * rowsPerPage + index + 1;

                      return (
                        <tr
                          key={item.item || item.deviceId}
                          className="border-t border-gray-300 bg-gray-100 hover:bg-white"
                        >
                          <td className="p-2 text-center">{globalIndex}</td>
                          <td className="p-2 text-center">
                            {item.deviceId.toUpperCase()}
                          </td>
                          <td className="p-2 text-center">
                            {km.toFixed(2)} Km
                          </td>
                          <td className="p-2 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-blue-100">
                                <div
                                  className="h-full rounded-full bg-[#113EB9]"
                                  style={{ width: `${Math.min(100, Math.max(3, parseFloat(percentage)))}%` }}
                                />
                              </div>
                              <span>{percentage}%</span>
                            </div>
                          </td>
                          <td className="p-2 text-center">
                            {dailyAvg} km/día
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="p-5 pb-24">
            {filteredRows.length === 0 ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
                <p className="text-sm font-semibold text-gray-600">No se encontraron unidades</p>
                <p className="text-xs text-gray-400 mt-1">Intente cambiar el término de búsqueda o el periodo</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {filteredRows.map((item, index) => {
                  const km = Math.max(0, item.maximo - item.minimo);
                  const percentage = totalKm > 0 ? ((km / totalKm) * 100).toFixed(0) : '100';
                  const dailyAvg = (km / diff.daysCount).toFixed(1);

                  return (
                    <VistaUnidad
                      key={item.item || item.deviceId}
                      item={index + 1}
                      deviceId={item.deviceId}
                      kilometros={km}
                      percentage={percentage}
                      dailyAvg={dailyAvg}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {!isLoading && filteredRows.length > 0 && (
        <div className="flex-shrink-0 flex flex-wrap items-center justify-between border-t border-gray-200 bg-white px-6 py-2.5 gap-3">
          <span className="text-[12px] text-gray-500">
            Mostrando{' '}
            <span className="font-bold text-gray-800">
              {selectedTab === 'tabla' ? paginatedItems.length : filteredRows.length}
            </span>{' '}
            de <span className="font-bold text-gray-800">{filteredRows.length}</span> unidades
          </span>

          {selectedTab === 'tabla' && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-md border border-gray-200 bg-white px-3 py-1 text-[11px] font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
              >
                Anterior
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => totalPages <= 7 || Math.abs(p - page) <= 2 || p === 1 || p === totalPages)
                .map((p, idx, arr) => {
                  const prev = arr[idx - 1];
                  return (
                    <React.Fragment key={p}>
                      {prev && p - prev > 1 && (
                        <span className="px-1 text-[11px] text-gray-400">…</span>
                      )}
                      <button
                        onClick={() => setPage(p)}
                        className={`h-7 w-7 rounded-md text-[11px] font-medium transition-colors ${
                          page === p
                            ? 'bg-[#113EB9] text-white font-bold'
                            : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-md border border-gray-200 bg-white px-3 py-1 text-[11px] font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
