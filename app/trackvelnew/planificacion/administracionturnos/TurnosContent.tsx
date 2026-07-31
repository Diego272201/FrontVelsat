'use client';
import React, { useEffect, useState } from 'react';
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
  const [refreshKey, setRefreshKey] = useState(0); // Nuevo estado

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
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleSaveSuccess = () => {
    setRefreshKey((prev) => prev + 1);
  };

  useEffect(() => {
    fetchData();
  }, [baseUrl, username, isReady, refreshKey]);

  return (
    <div className="flex flex-col lg:flex-row p-0 m-0 bg-white h-[calc(100vh-15px)] w-full overflow-hidden border-none">
      <Toaster richColors />

      <div className="w-full lg:w-1/2 flex flex-col h-full bg-white overflow-hidden border-r border-slate-200">
        <TablaTurno
          users={ingresoData}
          title="INGRESO"
          onSaveSuccess={handleSaveSuccess}
          onEditSuccess={handleSaveSuccess}
        />
      </div>

      <div className="w-full lg:w-1/2 flex flex-col h-full bg-white overflow-hidden">
        <TablaTurno
          users={salidaData}
          title="SALIDA"
          onSaveSuccess={handleSaveSuccess}
          onEditSuccess={handleSaveSuccess}
        />
      </div>
    </div>
  );
}
