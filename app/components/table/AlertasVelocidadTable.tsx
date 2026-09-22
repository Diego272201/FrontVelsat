'use client';
import React, { useEffect, useState, useMemo, useRef } from 'react';
import axios from 'axios';
import Image from 'next/image';
import { useApi } from '@/context/ApiContext';
import { Spinner } from '@nextui-org/react';

export interface AlertaVelocidad {
  id: number;
  deviceID: string;
  datetime: string;
  latitude: string;
  longitude: string;
  speed: string;
  direccion: string;
}

export interface DataStatsAlertas {
  total: number;
  unidadesInvolucradas: number;
  velocidadMaxima: number;
  unidadMasAlertas: string;
  rango91a95Count: number;
  rango96a100Count: number;
  masDe100Count: number;
}

interface AlertasVelocidadTableProps {
  url: string;
  deviceId?: string;
  searchTerm?: string;
  speedRangeFilter?: 'all' | '91a95' | '96a100' | 'masDe100';
  onDataStats?: (stats: DataStatsAlertas) => void;
}

export default function AlertasVelocidadTable({
  url,
  deviceId = 'TODAS',
  searchTerm = '',
  speedRangeFilter = 'all',
  onDataStats,
}: AlertasVelocidadTableProps) {
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<AlertaVelocidad[]>([]);
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

        if (Array.isArray(data)) {
          setRows(data);
          if (onDataStats) {
            const total = data.length;
            const uniqueUnits = new Set(data.map((r: AlertaVelocidad) => r.deviceID)).size;
            const maxSpeed =
              data.length > 0
                ? Math.max(...data.map((r: AlertaVelocidad) => parseFloat(r.speed) || 0))
                : 0;

            const unitCounts: Record<string, number> = {};
            data.forEach((r: AlertaVelocidad) => {
              if (r.deviceID) {
                unitCounts[r.deviceID] = (unitCounts[r.deviceID] || 0) + 1;
              }
            });

            let topUnit = '';
            let maxAlerts = 0;
            for (const [unit, count] of Object.entries(unitCounts)) {
              if (count > maxAlerts) {
                maxAlerts = count;
                topUnit = unit;
              }
            }
            const unidadMasAlertas = topUnit ? `${topUnit}  (${maxAlerts})` : '-';

            const rango91a95Count = data.filter((r: AlertaVelocidad) => {
              const sp = parseFloat(r.speed) || 0;
              return sp >= 91 && sp <= 95;
            }).length;

            const rango96a100Count = data.filter((r: AlertaVelocidad) => {
              const sp = parseFloat(r.speed) || 0;
              return sp > 95 && sp <= 100;
            }).length;

            const masDe100Count = data.filter((r: AlertaVelocidad) => {
              const sp = parseFloat(r.speed) || 0;
              return sp > 100;
            }).length;

            onDataStats({
              total,
              unidadesInvolucradas: uniqueUnits,
              velocidadMaxima: maxSpeed,
              unidadMasAlertas,
              rango91a95Count,
              rango96a100Count,
              masDe100Count,
            });
          }
        } else {
          console.error('Error: Data is not an array', data);
          setRows([]);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setRows([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isBaseUrlReady, baseUrl, url]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, speedRangeFilter]);

  const filteredRows = useMemo(() => {
    return rows.filter((item) => {
      const speed = parseFloat(item.speed) || 0;
      if (speedRangeFilter === '91a95' && (speed < 91 || speed > 95)) return false;
      if (speedRangeFilter === '96a100' && (speed <= 95 || speed > 100)) return false;
      if (speedRangeFilter === 'masDe100' && speed <= 100) return false;

      if (searchTerm) {
        const term = searchTerm.trim().toLowerCase();
        const matchUnit = item.deviceID?.toLowerCase().includes(term);
        const matchDate = item.datetime?.toLowerCase().includes(term);
        const matchSpeed = `${item.speed}`.toLowerCase().includes(term);
        const matchDir = item.direccion?.toLowerCase().includes(term);
        if (!matchUnit && !matchDate && !matchSpeed && !matchDir) {
          return false;
        }
      }
      return true;
    });
  }, [rows, speedRangeFilter, searchTerm]);

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

  const splitDateTime = (datetime: string) => {
    const parts = datetime.split(' ');
    return { fecha: parts[0] || '', hora: parts[1] || '' };
  };

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
              <th className="p-2 text-center">UNIDAD</th>
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
                  colSpan={9}
                  className="py-8 text-center text-sm text-gray-500"
                >
                  <Spinner size="sm" color="warning" />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="py-8 text-center text-sm text-gray-500"
                >
                  No hay datos para las fechas ingresadas
                </td>
              </tr>
            ) : (
              items.map((alerta, index) => {
                const datetime = splitDateTime(alerta.datetime);
                const lat = parseFloat(alerta.latitude);
                const lng = parseFloat(alerta.longitude);

                return (
                  <tr
                    key={alerta.id || index}
                    className="border-t border-gray-300 bg-gray-100 hover:bg-white"
                  >
                    <td className="p-2 text-center">
                      {index + 1 + (page - 1) * rowsPerPage}
                    </td>
                    <td className="p-2 text-center">{alerta.deviceID}</td>
                    <td className="p-2 text-center">{datetime.fecha}</td>
                    <td className="p-2 text-center">{datetime.hora}</td>
                    <td className="p-2 text-center">{alerta.speed} Km/h</td>
                    <td className="p-2 text-center">
                      {!isNaN(lat) ? lat.toFixed(5) : alerta.latitude}
                    </td>
                    <td className="p-2 text-center">
                      {!isNaN(lng) ? lng.toFixed(5) : alerta.longitude}
                    </td>
                    <td className="p-2 text-center">{alerta.direccion || '-'}</td>
                    <td className="p-2 text-center">
                      <a
                        href={`/VerMapa?lat=${alerta.latitude}&lng=${alerta.longitude}&deviceId=${alerta.deviceID || deviceId}&dir=${encodeURIComponent(alerta.direccion || '')}`}
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
