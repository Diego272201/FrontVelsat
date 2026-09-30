'use client';
import React, { useEffect, useState, useMemo, useRef } from 'react';
import axios from 'axios';
import Image from 'next/image';
import { useApi } from '@/context/ApiContext';
import { Spinner } from '@nextui-org/react';

interface Row {
  item: number;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  totalTime: string;
  latitude: number;
  longitude: number;
  address: string;
}

export interface DataStatsStops {
  total: number;
  tiempoDetenido: string;
  paradaMasLarga: string;
  zonaMasParadas: string;
  longestStopItem?: number;
}

interface AppProps {
  url: string;
  deviceId: string;
  searchTerm?: string;
  highlightItem?: number | null;
  onDataStats?: (stats: DataStatsStops) => void;
}

function parseTimeToSeconds(timeStr: string): number {
  if (!timeStr) return 0;
  const hMatch = timeStr.match(/(\d+)\s*h/i);
  const mMatch = timeStr.match(/(\d+)\s*m/i);
  const sMatch = timeStr.match(/(\d+)\s*s/i);
  if (hMatch || mMatch || sMatch) {
    const h = hMatch ? parseInt(hMatch[1], 10) : 0;
    const m = mMatch ? parseInt(mMatch[1], 10) : 0;
    const s = sMatch ? parseInt(sMatch[1], 10) : 0;
    return h * 3600 + m * 60 + s;
  }
  const parts = timeStr.split(':').map((p) => parseInt(p, 10));
  if (parts.length === 3 && !parts.some(isNaN)) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2 && !parts.some(isNaN)) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

function formatSecondsToHMS(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(h)}h ${pad(m)}m ${pad(s)}s`;
}

export default function App({
  url,
  deviceId,
  searchTerm = '',
  highlightItem,
  onDataStats,
}: AppProps) {
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Row[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { baseUrl } = useApi();
  const [isBaseUrlReady, setIsBaseUrlReady] = useState(false);

  useEffect(() => {
    if (baseUrl) setIsBaseUrlReady(true);
  }, [baseUrl]);

  useEffect(() => {
    if (!isBaseUrlReady) return;

    const fetchData = async () => {
      try {
        const response = await axios.get(`${baseUrl}${url}`);
        const data = response.data?.result;
        if (Array.isArray(data)) {
          const fetchedRows: Row[] = data;
          setRows(fetchedRows);
          if (onDataStats) {
            let totalSeconds = 0;
            let maxSeconds = 0;
            let longestItem = 1;
            const addressCounts: Record<string, number> = {};

            fetchedRows.forEach((r) => {
              const sec = parseTimeToSeconds(r.totalTime);
              totalSeconds += sec;
              if (sec > maxSeconds) {
                maxSeconds = sec;
                longestItem = r.item;
              }
              if (r.address) {
                addressCounts[r.address] = (addressCounts[r.address] || 0) + 1;
              }
            });

            let zonaMasParadas = '';
            let maxCount = 0;
            for (const [addr, count] of Object.entries(addressCounts)) {
              if (count > maxCount) {
                maxCount = count;
                zonaMasParadas = addr;
              }
            }
            if (!zonaMasParadas && fetchedRows.length > 0) {
              zonaMasParadas = fetchedRows[fetchedRows.length - 1]?.address || fetchedRows[0]?.address || '';
            }

            onDataStats({
              total: fetchedRows.length,
              tiempoDetenido: formatSecondsToHMS(totalSeconds),
              paradaMasLarga: formatSecondsToHMS(maxSeconds),
              zonaMasParadas,
              longestStopItem: longestItem,
            });
          }
        } else {
          setRows([]);
          if (onDataStats) {
            onDataStats({ total: 0, tiempoDetenido: '00h 00m 00s', paradaMasLarga: '00h 00m 00s', zonaMasParadas: '', longestStopItem: 0 });
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setRows([]);
        if (onDataStats) {
          onDataStats({ total: 0, tiempoDetenido: '00h 00m 00s', paradaMasLarga: '00h 00m 00s', zonaMasParadas: '', longestStopItem: 0 });
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isBaseUrlReady, baseUrl, url]);

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
    setPage(1);
  }, [searchTerm]);

  const filteredRows = useMemo(() => {
    if (!searchTerm) return rows;
    const term = searchTerm.trim().toLowerCase();
    return rows.filter((item) => {
      const matchAddress = item.address?.toLowerCase().includes(term);
      const matchStart = `${item.startDate} ${item.startTime}`.toLowerCase().includes(term);
      const matchEnd = `${item.endDate} ${item.endTime}`.toLowerCase().includes(term);
      const matchTime = item.totalTime?.toLowerCase().includes(term);
      const matchItem = `${item.item}`.includes(term);
      return matchAddress || matchStart || matchEnd || matchTime || matchItem;
    });
  }, [rows, searchTerm]);

  useEffect(() => {
    setPage((prevPage) => {
      const maxPage = Math.ceil(filteredRows.length / rowsPerPage) || 1;
      return prevPage > maxPage ? maxPage : prevPage;
    });
  }, [rowsPerPage, filteredRows.length]);

  useEffect(() => {
    if (highlightItem) {
      const targetPage = Math.ceil(highlightItem / rowsPerPage) || 1;
      setPage(targetPage);
      setTimeout(() => {
        const el = document.getElementById(`row-stop-${highlightItem}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);
    }
  }, [highlightItem, rowsPerPage]);

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
              <th className="p-2 text-center">FECHA INICIO</th>
              <th className="p-2 text-center">HORA INICIO</th>
              <th className="p-2 text-center">FECHA FINAL</th>
              <th className="p-2 text-center">HORA FINAL</th>
              <th className="p-2 text-center">TIEMPO TOTAL</th>
              <th className="p-2 text-center">LATITUD</th>
              <th className="p-2 text-center">LONGITUD</th>
              <th className="p-2 text-center">UBICACIÓN</th>
              <th className="p-2 text-center">VER MAPA</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-sm text-gray-500">
                  <Spinner size="sm" color="warning" />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-sm text-gray-500">
                  No hay datos para las fechas ingresadas
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const isHighlighted = item.item === highlightItem;
                return (
                  <tr
                    key={item.item}
                    id={`row-stop-${item.item}`}
                    className={`border-t border-gray-200 transition-colors ${
                      isHighlighted
                        ? 'bg-amber-100 font-semibold text-amber-900 border-l-4 border-amber-500 shadow-sm'
                        : 'bg-gray-100 hover:bg-white text-gray-700'
                    }`}
                  >
                  <td className="p-2 text-center">{item.item}</td>
                  <td className="p-2 text-center">{item.startDate}</td>
                  <td className="p-2 text-center">{item.startTime}</td>
                  <td className="p-2 text-center">{item.endDate}</td>
                  <td className="p-2 text-center">{item.endTime}</td>
                  <td className="p-2 text-center">{item.totalTime}</td>
                  <td className="p-2 text-center">{item.latitude}</td>
                  <td className="p-2 text-center">{item.longitude}</td>
                  <td className="p-2 text-center">{item.address}</td>
                  <td className="p-2 text-center">
                    <a
                      href={`/VerMapa?lat=${item.latitude}&lng=${item.longitude}&deviceId=${deviceId}&dir=${item.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block"
                    >
                      <Image src="/map.png" alt="Ver Mapa" width={16} height={16} />
                    </a>
                  </td>
                </tr>
              );
            })
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
