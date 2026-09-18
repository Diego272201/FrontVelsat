'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Table, { DataStats } from '@/app/components/table/Table';
import ButtonDownloadFloat from '@/app/components/ui/ButtonDownloadFloat';
import ReporteHeader from '@/app/components/ReporteHeader';
import { BiSolidReport } from 'react-icons/bi';
import { formatDate } from '@/app/components/dates/convertToCustomFormat ';
import '@/app/styles/table.css';

export default function ReportContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();

  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const deviceId = searchParams.get('deviceId');
  const username = session?.user.username;

  const tableUrl = `/api/Reporting/general/${startDate}/${endDate}/${deviceId}/${username}`;

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'moving' | 'stopped'>('all');
  const [dataStats, setDataStats] = useState<DataStats | null>(null);

  const handleDataStats = useCallback((stats: DataStats) => {
    setDataStats(stats);
  }, []);

  const calculateDifference = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate.getTime() - startDate.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return { days, hours, minutes };
  };

  const diff = useMemo(() => (
    startDate && endDate
      ? calculateDifference(startDate, endDate)
      : { days: 0, hours: 0, minutes: 0 }
  ), [startDate, endDate]);
  const extraInfo = `${diff.days} días, ${diff.hours} horas, ${diff.minutes} minutos`;

  return (
    <div>
      <ReporteHeader
        title="REPORTE GENERAL DE LA UNIDAD"
        deviceId={deviceId ?? ''}
        startDate={startDate ?? ''}
        endDate={endDate ?? ''}
        extraInfo={extraInfo}
        formatDate={formatDate}
        registros={dataStats ? dataStats.total : undefined}
        enMovimiento={dataStats ? dataStats.moving : undefined}
        detenido={dataStats ? dataStats.stopped : undefined}
        velocidadMaxima={dataStats ? `${dataStats.maxSpeed} km/h` : undefined}
        ultimaUbicacion={dataStats?.lastAddress || undefined}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filterStatus={filterStatus}
        onFilterStatusChange={setFilterStatus}
      />
      <ButtonDownloadFloat
        startDate={startDate || ''}
        endDate={endDate || ''}
        devideId={deviceId || ''}
        namedown="downloadExcelG"
        namedesc="general"
        username={username || ''}
        nameurl="reportegeneral"
      />
      <Table
        url={tableUrl}
        deviceId={deviceId ?? ''}
        searchTerm={searchTerm}
        filterStatus={filterStatus}
        onDataStats={handleDataStats}
      />
    </div>
  );
}
