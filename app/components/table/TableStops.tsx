'use client';
import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import Image from 'next/image';
import { useApi } from '@/context/ApiContext';
import useCalculateRowsPerPage from './useCalculateRowsPerPage';
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

interface AppProps {
  url: string;
  deviceId: string;
}

export default function App({ url, deviceId }: AppProps) {
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
        const data = response.data.result;
        setRows(data);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isBaseUrlReady, baseUrl, url]);

  const rowsPerPage = useCalculateRowsPerPage(40, 5, 40);
  const pages = Math.ceil(rows.length / rowsPerPage);

  const items = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return rows.slice(start, end);
  }, [page, rows, rowsPerPage]);

  return (
    <div className="px-0 py-1">
      <div className="overflow-auto border border-gray-200">
        <table className="min-w-full text-xs text-gray-700">
          <thead className="bg-gray-300 text-[10px] uppercase text-gray-600">
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
              items.map((item) => (
                <tr key={item.item} className="border-t border-gray-200 bg-gray-100 hover:bg-white">
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
