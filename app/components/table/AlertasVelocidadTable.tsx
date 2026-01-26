'use client';
import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import Image from 'next/image';
import { useApi } from '@/context/ApiContext';
import useCalculateRowsPerPage from './useCalculateRowsPerPage';
import { Spinner } from '@nextui-org/react';

interface AlertaVelocidad {
  id: number;
  deviceID: string;
  datetime: string;
  latitude: string;
  longitude: string;
  speed: string;
}

interface AlertasVelocidadTableProps {
  url: string;
  deviceId: string;
}

export default function AlertasVelocidadTable({ url, deviceId }: AlertasVelocidadTableProps) {
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
        
        console.log('Respuesta de la API:', data);
        
        if (Array.isArray(data)) {
          setRows(data);
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

  const rowsPerPage = useCalculateRowsPerPage(40, 5, 70);
  const pages = Math.ceil(rows.length / rowsPerPage);

  const items = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return rows.slice(start, end);
  }, [page, rows, rowsPerPage]);

  const splitDateTime = (datetime: string) => {
    const parts = datetime.split(' ');
    return { fecha: parts[0] || '', hora: parts[1] || '' };
  };

  return (
    <div className="mx-2 my-1 px-0 py-1">
      <div className="overflow-auto border border-gray-200">
        <table className="min-w-full text-xs text-gray-700">
          <thead className="bg-gray-300 text-[10px] uppercase text-gray-600">
            <tr>
              <th className="p-2 text-center">ITEM</th>
              <th className="p-2 text-center">UNIDAD</th>
              <th className="p-2 text-center">FECHA</th>
              <th className="p-2 text-center">HORA</th>
              <th className="p-2 text-center">VELOCIDAD</th>
              <th className="p-2 text-center">LATITUD</th>
              <th className="p-2 text-center">LONGITUD</th>
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
                  No hay alertas de velocidad para las fechas ingresadas
                </td>
              </tr>
            ) : (
              items.map((alerta, index) => {
                const datetime = splitDateTime(alerta.datetime);
                const lat = parseFloat(alerta.latitude);
                const lng = parseFloat(alerta.longitude);
                
                return (
                  <tr key={alerta.id} className="border-t border-gray-300 bg-gray-100 hover:bg-white">
                    <td className="p-2 text-center">{index + 1 + (page - 1) * rowsPerPage}</td>
                    <td className="p-2 text-center">{alerta.deviceID}</td>
                    <td className="p-2 text-center">{datetime.fecha}</td>
                    <td className="p-2 text-center">{datetime.hora}</td>
                    <td className="p-2 text-center">{alerta.speed} Km/h</td>
                    <td className="p-2 text-center">{lat.toFixed(5)}</td>
                    <td className="p-2 text-center">{lng.toFixed(5)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="mt-2 flex justify-center gap-2 text-[14px]">
          <button disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className={`rounded border px-2 py-1 ${page === 1 ? 'cursor-not-allowed bg-gray-200 text-gray-400' : 'bg-white text-blue-600 hover:bg-blue-100'}`}>
            Anterior
          </button>
          
          {Array.from({ length: pages }, (_, i) => i).filter((i) => Math.abs(i + 1 - page) <= 2).map((i) => (
            <button key={i} onClick={() => setPage(i + 1)} className={`rounded border px-2 py-1 ${i + 1 === page ? 'bg-blue-500 text-white' : 'bg-white text-blue-600 hover:bg-blue-100'}`}>
              {i + 1}
            </button>
          ))}

          <button disabled={page === pages} onClick={() => setPage((p) => Math.min(p + 1, pages))} className={`rounded border px-2 py-1 ${page === pages ? 'cursor-not-allowed bg-gray-200 text-gray-400' : 'bg-white text-blue-600 hover:bg-blue-100'}`}>
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}