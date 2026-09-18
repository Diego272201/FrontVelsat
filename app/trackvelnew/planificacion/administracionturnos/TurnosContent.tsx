'use client';
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import '@/app/styles/turnos.css';
import TablaTurno from './TablaTurno';
import axios from 'axios';
import { useApi } from '@/context/ApiContext';
import { Toaster } from 'sonner';
import { useUsername } from '@/hooks/useUsername';

export default function TurnosContent() {
  const { username, isReady } = useUsername();
  const [ingresoData, setIngresoData] = useState<any[]>([]);
  const [salidaData, setSalidaData] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const { baseUrl } = useApi();

  const fetchData = async () => {
    if (!baseUrl || !isReady) return;

    try {
      const response = await axios.get(`${baseUrl}/api/Turnos/${username}`);

      const data = response.data.map((item: any) => ({
        codigo: item.codigo,
        empresa: item.empresa,
        area: item.area,
        subarea: item.subarea,
        rol: item.codrl,
        hora: item.hora,
        tipo: item.tipo,
        programacion:
          item.programa === '1'
            ? 'Fecha Actual'
            : item.programa === '2'
              ? 'Fecha Futura'
              : item.programa === '3'
                ? 'Fecha Pasada'
                : 'Desconocido',
      }));

      const ingresoDataFiltrada = data.filter((item: any) => item.tipo === 'I');
      const salidaDataFiltrada = data.filter((item: any) => item.tipo === 'S');

      const ingresoDataConNumeracion = ingresoDataFiltrada.map(
        (item: any, index: number) => ({
          ...item,
          id: index + 1,
          n: index + 1,
        }),
      );

      const salidaDataConNumeracion = salidaDataFiltrada.map(
        (item: any, index: number) => ({
          ...item,
          id: index + 1,
          n: index + 1,
        }),
      );

      setIngresoData(ingresoDataConNumeracion);
      setSalidaData(salidaDataConNumeracion);
    } catch {}
  };

  const handleSaveSuccess = () => {
    setRefreshKey((prev) => prev + 1);
  };

  useEffect(() => {
    fetchData();
  }, [baseUrl, username, isReady, refreshKey]);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-white">
      <Toaster richColors />

      <header className="sticky top-0 z-50 bg-[#113EB9] flex-shrink-0">
        <div className="flex h-12 items-stretch justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-full items-center bg-gradient-to-r from-orange-500 to-red-500 px-4">
              <Image
                src="/LogoWeb.png"
                alt="Velsat"
                width={44}
                height={44}
                className="h-9 w-9 object-contain"
                priority
              />
            </div>

            <div className="h-7 w-[2px] rounded-full bg-white/40 self-center" />

            <div className="flex flex-col justify-center">
              <span className="text-[9.5px] font-bold uppercase tracking-wider text-blue-200 leading-none mb-0.5">
                OPERACIONES / PROGRAMACIÓN
              </span>
              <h1 className="text-[14px] font-bold leading-none tracking-[0.01em] text-white">
                Turnos de ingreso y salida
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 pr-4">
            <div className="flex items-center gap-1.5 rounded-full bg-white/20 px-3.5 py-1 text-[11px] text-white">
              <span className="text-blue-100 font-medium">INGRESO</span>
              <span className="font-bold text-white">{ingresoData.length}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-white/20 px-3.5 py-1 text-[11px] text-white">
              <span className="text-blue-100 font-medium">SALIDA</span>
              <span className="font-bold text-white">{salidaData.length}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row w-full overflow-hidden bg-white min-h-0 min-w-0">
        <div className="w-full lg:w-1/2 flex flex-col h-full bg-white overflow-hidden border-r border-slate-200 min-h-0 min-w-0">
          <TablaTurno
            users={ingresoData}
            title="INGRESO"
            onSaveSuccess={handleSaveSuccess}
            onEditSuccess={handleSaveSuccess}
          />
        </div>

        <div className="w-full lg:w-1/2 flex flex-col h-full bg-white overflow-hidden min-h-0 min-w-0">
          <TablaTurno
            users={salidaData}
            title="SALIDA"
            onSaveSuccess={handleSaveSuccess}
            onEditSuccess={handleSaveSuccess}
          />
        </div>
      </main>
    </div>
  );
}
