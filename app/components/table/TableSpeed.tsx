'use client';
import React, { useEffect, useState, useMemo, useRef } from 'react';
import axios from 'axios';
import Image from 'next/image';
import { useApi } from '@/context/ApiContext';
import { Spinner } from '@nextui-org/react';

interface Row {
  item: number;
  deviceId?: string;
  speedKPH: number;
  date: string;
  time: string;
  latitude: number;
  longitude: number;
  address: string;
}

export interface DataStatsSpeed {
  total: number;
  maxSpeed: number;
  avgSpeed: string;
  excesosMas100: number;
  hasta25Count: number;
  entre26y40Count: number;
  masDe40Count: number;
  tramoPrincipal: string;
}

interface AppProps {
  url: string;
  // Si se envía, se consultan en orden (por bloques de fechas) en lugar de `url`
  urls?: string[];
  deviceId: string;
  searchTerm?: string;
  speedFilterRange?: 'all' | 'hasta25' | 'entre26y40' | 'masDe40';
  onDataStats?: (stats: DataStatsSpeed) => void;
}

export default function App({
  url,
  urls,
  deviceId,
  searchTerm = '',
  speedFilterRange = 'all',
  onDataStats,
}: AppProps) {
  const showUnitColumn = deviceId === 'Todas las unidades';
  const columnCount = showUnitColumn ? 9 : 8;
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Row[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const { baseUrl } = useApi();
  const [isBaseUrlReady, setIsBaseUrlReady] = useState(false);

  useEffect(() => {
    if (baseUrl) setIsBaseUrlReady(true);
  }, [baseUrl]);

  useEffect(() => {
    const endpoints = urls && urls.length > 0 ? urls : url ? [url] : [];
    if (!isBaseUrlReady || endpoints.length === 0) return;

    let cancelled = false;

    const rowKey = (r: Row) =>
      `${r.deviceId ?? ''}|${r.date}|${r.time}|${r.latitude}|${r.longitude}|${r.speedKPH}`;

    const fetchData = async () => {
      setIsLoading(true);
      setProgress(0);
      try {
        const accumulated: Row[] = [];
        let previousKeys = new Set<string>();
        let lastData: any = null;
        let valid = true;

        for (let i = 0; i < endpoints.length; i++) {
          const response = await axios.get(`${baseUrl}${endpoints[i]}`);
          if (cancelled) return;
          const data = response.data;
          lastData = data;
          const chunk = Array.isArray(data) ? data : data?.result;
          if (!Array.isArray(chunk)) {
            valid = false;
            break;
          }
          // Los bloques comparten el instante de corte: se descartan repetidos
          const fresh = (chunk as Row[]).filter((r) => !previousKeys.has(rowKey(r)));
          previousKeys = new Set((chunk as Row[]).map(rowKey));
          accumulated.push(...fresh);
          setProgress(Math.round(((i + 1) / endpoints.length) * 100));
        }

        const data = lastData;
        const resultArray = valid ? accumulated.map((r, idx) => ({ ...r, item: idx + 1 })) : null;
        if (Array.isArray(resultArray)) {
          const fetchedRows: Row[] = resultArray;
          setRows(fetchedRows);
          if (onDataStats) {
            const maxSpeed = fetchedRows.length > 0 ? Math.max(...fetchedRows.map((r) => r.speedKPH)) : 0;
            const sumSpeed = fetchedRows.reduce((acc, r) => acc + (r.speedKPH || 0), 0);
            const avgSpeed = fetchedRows.length > 0 ? (sumSpeed / fetchedRows.length).toFixed(1) + ' km/h' : '0.0 km/h';
            const excesosMas100 = fetchedRows.filter((r) => r.speedKPH > 100).length;
            const hasta25Count = fetchedRows.filter((r) => r.speedKPH <= 25).length;
            const entre26y40Count = fetchedRows.filter((r) => r.speedKPH > 25 && r.speedKPH <= 40).length;
            const masDe40Count = fetchedRows.filter((r) => r.speedKPH > 40).length;

            const addressCounts: Record<string, number> = {};
            fetchedRows.forEach((r) => {
              if (r.address) {
                addressCounts[r.address] = (addressCounts[r.address] || 0) + 1;
              }
            });
            let tramoPrincipal = '';
            let maxCount = 0;
            for (const [addr, count] of Object.entries(addressCounts)) {
              if (count > maxCount) {
                maxCount = count;
                tramoPrincipal = addr;
              }
            }
            if (!tramoPrincipal && fetchedRows.length > 0) {
              tramoPrincipal = fetchedRows[fetchedRows.length - 1]?.address || fetchedRows[0]?.address || '';
            }

            onDataStats({
              total: fetchedRows.length,
              maxSpeed,
              avgSpeed,
              excesosMas100,
              hasta25Count,
              entre26y40Count,
              masDe40Count,
              tramoPrincipal,
            });
          }
        } else {
          console.error('Error: Data is not in expected format', data);
          setRows([]);
          if (onDataStats) {
            onDataStats({ total: 0, maxSpeed: 0, avgSpeed: '0 km/h', excesosMas100: 0, hasta25Count: 0, entre26y40Count: 0, masDe40Count: 0, tramoPrincipal: '' });
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setRows([]);
        if (onDataStats) {
          onDataStats({ total: 0, maxSpeed: 0, avgSpeed: '0 km/h', excesosMas100: 0, hasta25Count: 0, entre26y40Count: 0, masDe40Count: 0, tramoPrincipal: '' });
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [isBaseUrlReady, baseUrl, url, urls]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, speedFilterRange]);

  const filteredRows = useMemo(() => {
    return rows.filter((item) => {
      if (speedFilterRange === 'hasta25' && item.speedKPH > 25) return false;
      if (speedFilterRange === 'entre26y40' && (item.speedKPH <= 25 || item.speedKPH > 40)) return false;
      if (speedFilterRange === 'masDe40' && item.speedKPH <= 40) return false;

      if (searchTerm) {
        const term = searchTerm.trim().toLowerCase();
        if (term) {
          const matchTime = item.time?.toLowerCase().includes(term);
          const matchDate = item.date?.toLowerCase().includes(term);
          const matchAddress = item.address?.toLowerCase().includes(term);
          const matchSpeed = `${item.speedKPH}`.includes(term);
          const matchItem = `${item.item}`.includes(term);
          const matchDevice = item.deviceId?.toLowerCase().includes(term);
          if (!matchTime && !matchDate && !matchAddress && !matchSpeed && !matchItem && !matchDevice) {
            return false;
          }
        }
      }
      return true;
    });
  }, [rows, speedFilterRange, searchTerm]);

  const containerRef = useRef<HTMLDivElement>(null);
  const theadRef = useRef<HTMLTableSectionElement>(null);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  useEffect(() => {
    const container = containerRef.current;
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
  }, [rows.length, isLoading]);

  useEffect(() => {
    setPage((prevPage) => {
      const maxPage = Math.ceil(filteredRows.length / rowsPerPage) || 1;
      return prevPage > maxPage ? maxPage : prevPage;
    });
  }, [rowsPerPage, filteredRows.length]);

  const pages = Math.ceil(filteredRows.length / rowsPerPage) || 1;

  const items = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredRows.slice(start, end);
  }, [page, filteredRows, rowsPerPage]);

  return (
    <div className="flex w-full flex-1 flex-col min-h-0 p-0">
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden min-h-0"
      >
        <table className="w-full text-xs text-gray-700">
          <thead
            ref={theadRef}
            className="bg-gray-300 text-[10px] uppercase text-gray-600"
          >
            <tr>
              <th className="p-2 text-center">ITEM</th>
              {showUnitColumn && <th className="p-2 text-center">UNIDAD</th>}
              <th className="p-2 text-center">VELOCIDAD</th>
              <th className="p-2 text-center">FECHA</th>
              <th className="p-2 text-center">HORA</th>
              <th className="p-2 text-center">LATITUD</th>
              <th className="p-2 text-center">LONGITUD</th>
              <th className="p-2 text-center">UBICACIÓN</th>
              <th className="p-2 text-center">VER MAPA</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={columnCount} className="py-8 text-center text-sm text-gray-500">
                  <Spinner size="sm" color="warning" />
                  {urls && urls.length > 1 && (
                    <p className="mt-2">Cargando datos... {progress}%</p>
                  )}
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={columnCount} className="py-8 text-center text-sm text-gray-500">
                  No hay datos para las fechas ingresadas
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr
                  key={item.item}
                  className="border-t border-gray-200 bg-gray-100 hover:bg-white"
                >
                  <td className="p-2 text-center">{item.item}</td>
                  {showUnitColumn && (
                    <td className="p-2 text-center">{item.deviceId}</td>
                  )}
                  <td className="p-2 text-center">{item.speedKPH.toFixed(2)} Km/h</td>
                  <td className="p-2 text-center">{item.date}</td>
                  <td className="p-2 text-center">{item.time}</td>
                  <td className="p-2 text-center">{item.latitude}</td>
                  <td className="p-2 text-center">{item.longitude}</td>
                  <td className="p-2 text-center">{item.address}</td>
                  <td className="p-2 text-center">
                    <a
                      href={`/VerMapa?lat=${item.latitude}&lng=${item.longitude}&deviceId=${showUnitColumn ? item.deviceId : deviceId}&dir=${item.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block"
                    >
                      <Image
                        src="/map.png"
                        alt="Ver Mapa"
                        width={16}
                        height={16}
                      />
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex-shrink-0 flex justify-center gap-2 text-[14px] pt-2 pb-5">
        <button
          disabled={page === 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className={`rounded border px-2 py-1 ${
            page === 1
              ? 'cursor-not-allowed bg-gray-200 text-gray-400'
              : 'bg-white text-blue-600 hover:bg-blue-100'
          }`}
        >
          Anterior
        </button>
        {Array.from({ length: pages }, (_, i) => i)
          .filter((i) => Math.abs(i + 1 - page) <= 2)
          .map((i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`rounded border px-2 py-1 ${
                i + 1 === page
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-blue-600 hover:bg-blue-100'
              }`}
            >
              {i + 1}
            </button>
          ))}

        <button
          disabled={page === pages}
          onClick={() => setPage((p) => Math.min(p + 1, pages))}
          className={`rounded border px-2 py-1 ${
            page === pages
              ? 'cursor-not-allowed bg-gray-200 text-gray-400'
              : 'bg-white text-blue-600 hover:bg-blue-100'
          }`}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}