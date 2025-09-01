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
                ? 'Fecha pasada'
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
    setRefreshKey((prev) => prev + 1); // Forzar re-render
    setTimeout(() => {
      fetchData();
    }, 100);
  };

  useEffect(() => {
    fetchData();
  }, [baseUrl, username, isReady, refreshKey]);

  return (
    <div className="contenetTurnos">
      <Toaster richColors />

      <div className="ingreso">
        <TablaTurno
          users={ingresoData}
          title="INGRESO"
          onSaveSuccess={handleSaveSuccess}
          onEditSuccess={handleSaveSuccess}
        />
      </div>
      <div className="w-[5px]"></div>
      <div className="salida">
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
