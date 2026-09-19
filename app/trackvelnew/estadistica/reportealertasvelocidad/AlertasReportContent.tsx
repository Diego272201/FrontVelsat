'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import AlertasVelocidadTable, { DataStatsAlertas } from '@/app/components/table/AlertasVelocidadTable';
import ReporteHeader from '@/app/components/ReporteHeader';
import { useApi } from '@/context/ApiContext';
import { Spinner } from '@nextui-org/react';
import '@/app/styles/table.css';
import ButtonDownloadFloat from '@/app/components/ui/ButtonDownloadFloat';

export default function AlertasVelocidadReportContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const { baseUrl } = useApi();

  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const username = session?.user.username;

  const [searchTerm, setSearchTerm] = useState('');
  const [dataStats, setDataStats] = useState<DataStatsAlertas | null>(null);

  const handleDataStats = useCallback((stats: DataStatsAlertas) => {
    setDataStats(stats);
  }, []);

  const formatDateForAPI = (dateString: string) => {
    if (!dateString) return '';

    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const formatDisplayDate = (dateString: any) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return String(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const fechaini = formatDateForAPI(startDate || '');
  const fechafin = formatDateForAPI(endDate || '');
  const tableUrl = useMemo(() => {
    if (!fechaini || !fechafin || !username) return null;
    return `/api/Preplan/AlertasVelocidad?usuario=${encodeURIComponent(username)}&fechaini=${encodeURIComponent(fechaini)}&fechafin=${encodeURIComponent(fechafin)}`;
  }, [fechaini, fechafin, username]);

  const calculateDifference = (start: string, end: string) => {
    const startD = new Date(start);
    const endD = new Date(end);
    const diffMs = endD.getTime() - startD.getTime();
    if (isNaN(diffMs) || diffMs < 0) return { days: 0, hours: 0, minutes: 0 };
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
    );
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return { days, hours, minutes };
  };

  const diff = useMemo(
    () =>
      startDate && endDate
        ? calculateDifference(startDate, endDate)
        : { days: 0, hours: 0, minutes: 0 },
    [startDate, endDate],
  );

  const periodoText = `${diff.days === 1 ? '1 día' : `${diff.days} días`} - ${diff.hours} h - ${diff.minutes} min`;

  if (!baseUrl || !tableUrl) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" color="primary" label="Cargando..." />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <ReporteHeader
        title="ALERTAS DE VELOCIDAD"
        deviceId="TODAS LAS UNIDADES"
        startDate={startDate ?? ''}
        endDate={endDate ?? ''}
        umbral="> 90 km/h"
        periodo={periodoText}
        formatDate={formatDisplayDate}
        registros={dataStats ? dataStats.total : 0}
        unidadesInvolucradas={dataStats ? dataStats.unidadesInvolucradas : 0}
        velocidadMaxima={dataStats ? `${dataStats.velocidadMaxima} km/h` : '0 km/h'}
        unidadMasAlertas={dataStats?.unidadMasAlertas || '-'}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        alertasSpeedMode={true}
      />

      <ButtonDownloadFloat
        startDate={fechaini}
        endDate={fechafin}
        namedown="AlertasVelocidadExcel"
        namedesc="alertas_velocidad"
        username={username || ''}
        nameurl="alertasvelocidad"
      />

      <AlertasVelocidadTable
        url={tableUrl}
        deviceId="TODAS"
        searchTerm={searchTerm}
        onDataStats={handleDataStats}
      />
    </div>
  );
}
