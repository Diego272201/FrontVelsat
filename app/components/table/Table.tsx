'use client';
import React, { useEffect, useState, useMemo, useRef } from 'react';
import axios from 'axios';
import Image from 'next/image';
import { useApi } from '@/context/ApiContext';
import { Spinner } from '@nextui-org/react';

interface Row {
  item: number;
  fecha: string;
  hora: string;
  speedKPH: number;
  longitude: number;
  latitude: number;
  address: string;
  odometerKM: number;
}

export interface DataStats {
  total: number;
  moving: number;
  stopped: number;
  maxSpeed: number;
  lastAddress: string;
}

interface AppProps {
  url: string;
  deviceId: string;
  searchTerm?: string;
  filterStatus?: 'all' | 'moving' | 'stopped';
  onDataStats?: (stats: DataStats) => void;
}

export default function App({
  url,
  deviceId,
  searchTerm = '',
  filterStatus = 'all',
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
        const data = response.data;
        if (data && Array.isArray(data.result.listaTablas)) {
          const fetchedRows: Row[] = data.result.listaTablas;
          setRows(fetchedRows);
          if (onDataStats) {
            const moving = fetchedRows.filter((r) => r.speedKPH > 0).length;
            const stopped = fetchedRows.filter((r) => r.speedKPH <= 0).length;
            const maxSpeed = fetchedRows.length > 0 ? Math.max(...fetchedRows.map((r) => r.speedKPH)) : 0;
            const lastAddress = fetchedRows.length > 0 ? (fetchedRows[fetchedRows.length - 1]?.address || fetchedRows[0]?.address || '') : '';
            onDataStats({
              total: fetchedRows.length,
              moving,
              stopped,
              maxSpeed,
              lastAddress,
            });
          }
        } else {
          console.error('Error: Data is not in expected format', data);
          setRows([]);
          if (onDataStats) {
            onDataStats({ total: 0, moving: 0, stopped: 0, maxSpeed: 0, lastAddress: '' });
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setRows([]);
        if (onDataStats) {
          onDataStats({ total: 0, moving: 0, stopped: 0, maxSpeed: 0, lastAddress: '' });
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isBaseUrlReady, baseUrl, url]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, filterStatus]);

  const filteredRows = useMemo(() => {
    return rows.filter((item) => {
      if (filterStatus === 'moving' && item.speedKPH <= 0) return false;
      if (filterStatus === 'stopped' && item.speedKPH > 0) return false;

      if (searchTerm) {
        const term = searchTerm.trim().toLowerCase();
        if (term) {
          const matchHora = item.hora?.toLowerCase().includes(term);
          const matchFecha = item.fecha?.toLowerCase().includes(term);
          const matchAddress = item.address?.toLowerCase().includes(term);
          const matchSpeed = `${item.speedKPH}`.includes(term);
          const matchItem = `${item.item}`.includes(term);
          if (!matchHora && !matchFecha && !matchAddress && !matchSpeed && !matchItem) {
            return false;
          }
        }
      }
      return true;
    });
  }, [rows, filterStatus, searchTerm]);

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
              <th className="p-2 text-center">FECHA</th>
              <th className="p-2 text-center">HORA</th>
              <th className="p-2 text-center">VELOCIDAD</th>
              <th className="p-2 text-center">LATITUD</th>
              <th className="p-2 text-center">LONGITUD</th>
              <th className="p-2 text-center">UBICACIÓN</th>
              <th className="p-2 text-center">VER MAPA</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={8}
                  className="py-8 text-center text-sm text-gray-500"
                >
                  <Spinner size="sm" color="warning" />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="py-8 text-center text-sm text-gray-500"
                >
                  No hay datos para las fechas ingresadas
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr
                  key={item.item}
                  className="border-t border-gray-300 bg-gray-100 hover:bg-white"
                >
                  <td className="p-2 text-center">{item.item}</td>
                  <td className="p-2 text-center">{item.fecha}</td>
                  <td className="p-2 text-center">{item.hora}</td>
                  <td className="p-2 text-center">{item.speedKPH} Km/h</td>
                  <td className="p-2 text-center">
                    {item.latitude.toFixed(5)}
                  </td>
                  <td className="p-2 text-center">
                    {item.longitude.toFixed(5)}
                  </td>

                  <td className="p-2 text-center">{item.address}</td>
                  <td className="p-2 text-center">
                    <a
                      href={`/VerMapa?lat=${item.latitude}&lng=${item.longitude}&deviceId=${deviceId}&dir=${item.address}`}
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
