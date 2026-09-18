'use client';
import React, { useMemo, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { IoSpeedometer } from 'react-icons/io5';
import { useSearchParams } from 'next/navigation';
import TableSpeed, { DataStatsSpeed } from '@/app/components/table/TableSpeed';
import ButtonDownloadFloat from '@/app/components/ui/ButtonDownloadFloat';
import ReporteHeader from '@/app/components/ReporteHeader';
import '@/app/styles/table.css';

const PageContent = () => {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const deviceId = searchParams.get('deviceId');
  const speedCar = searchParams.get('speedCar');

  const username = session?.user.username;
  const tableUrl = `/api/Reporting/speed/${startDate}/${endDate}/${deviceId}/${speedCar}/${username}`;

  const [searchTerm, setSearchTerm] = useState('');
  const [dataStats, setDataStats] = useState<DataStatsSpeed | null>(null);

  const handleDataStats = useCallback((stats: DataStatsSpeed) => {
    setDataStats(stats);
  }, []);

  const formatDate = (dateString: any) => {
    if (!dateString) return '';

    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = date.getMinutes();

    const formattedDay = day < 10 ? `0${day}` : day;
    const formattedMonth = month < 10 ? `0${month}` : month;
    const formattedHours = hours < 10 ? `0${hours}` : hours;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;

    return `${formattedDay}/${formattedMonth}/${year} ${formattedHours}:${formattedMinutes}`;
  };

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

  const periodoText = `${diff.days} días, ${diff.hours} horas, ${diff.minutes} minutos`;
  const umbralText = speedCar ? `> ${speedCar} km/h` : '> 5 km/h';

  return (
    <div className="w-full">
      <ReporteHeader
        title="REPORTE DE VELOCIDAD"
        deviceId={deviceId ?? ""}
        startDate={startDate ?? ""}
        endDate={endDate ?? ""}
        umbral={umbralText}
        periodo={periodoText}
        formatDate={formatDate}
        icon={<IoSpeedometer size={25} />}
        registros={dataStats ? dataStats.total : undefined}
        velocidadMaxima={dataStats ? `${dataStats.maxSpeed.toFixed(2)} km/h` : undefined}
        promedioVelocidad={dataStats?.avgSpeed || undefined}
        excesosContador={dataStats ? dataStats.excesosMas100 : undefined}
        tramoPrincipal={dataStats?.tramoPrincipal || undefined}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        speedReportMode={true}
      />

      <ButtonDownloadFloat
        startDate={startDate || ''}
        endDate={endDate || ''}
        devideId={deviceId || ''}
        speedCar={speedCar || ''}
        namedown="downloadExcelV"
        namedesc="velocidad"
        username={username || ''}
        nameurl="reportevelocidad"
      />

      <TableSpeed
        url={tableUrl}
        deviceId={deviceId ?? ''}
        searchTerm={searchTerm}
        onDataStats={handleDataStats}
      />
    </div>
  );
};

export default PageContent;
