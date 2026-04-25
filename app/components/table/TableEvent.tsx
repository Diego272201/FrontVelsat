'use client';
import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import Image from 'next/image';
import { useApi } from '@/context/ApiContext';
import useCalculateRowsPerPage from './useCalculateRowsPerPage';
import { Spinner } from '@nextui-org/react';

interface Row {
  item: number;
  fecha: string;
  hora: string;
  statusCode: number;
  longitude: number;
  latitude: number;
  address: string;
}

interface AppProps {
  url: string;
  deviceId: string;
}

const getStatusLabel = (code: number): string => {
  const map: Record<number, string> = {
    62476: 'Ignición OFF',
    62477: 'Ignición ON',
    62478: 'En movimiento',
    62479: 'Detenido',
  };
  return map[code] ?? `Código ${code}`;
};

const getStatusColor = (code: number): string => {
  switch (code) {
    case 62477:
      return 'bg-green-100 text-green-700';
    case 62476:
      return 'bg-red-100 text-red-700';
    case 62478:
      return 'bg-blue-100 text-blue-700';
    default:
      return 'bg-gray-100 text-gray-600';
  }
};

export default function TableEvent({ url, deviceId }: AppProps) {
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
        // La API de eventos devuelve el array directamente
        if (data && Array.isArray(data)) {
          setRows(data);
        } else {
          console.error('Error: Data is not in expected format', data);
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

  const rowsPerPage = useCalculateRowsPerPage(40, 5, 70);
  const pages = Math.ceil(rows.length / rowsPerPage);

  const items = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return rows.slice(start, end);
  }, [page, rows, rowsPerPage]);

  return (
    <div className="mx-2 my-1 px-0 py-1">
      <div className="overflow-auto border border-gray-200">
        <table className="min-w-full text-xs text-gray-700">
          <thead className="bg-gray-300 text-[10px] uppercase text-gray-600">
            <tr>
              <th className="p-2 text-center">ITEM</th>
              <th className="p-2 text-center">FECHA</th>
              <th className="p-2 text-center">HORA</th>
              <th className="p-2 text-center">EVENTO</th>
              <th className="p-2 text-center">LATITUD</th>
              <th className="p-2 text-center">LONGITUD</th>
              <th className="p-2 text-center">UBICACIÓN</th>
              <th className="p-2 text-center">VER MAPA</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-sm text-gray-500">
                  <Spinner size="sm" color="warning" />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-sm text-gray-500">
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
                  <td className="p-2 text-center">
                    <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${getStatusColor(item.statusCode)}`}>
                      {getStatusLabel(item.statusCode)}
                    </span>
                  </td>
                  <td className="p-2 text-center">{item.latitude.toFixed(5)}</td>
                  <td className="p-2 text-center">{item.longitude.toFixed(5)}</td>
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="mt-2 flex justify-center gap-2 text-[14px]">
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