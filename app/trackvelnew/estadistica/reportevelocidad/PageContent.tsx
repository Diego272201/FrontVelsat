'use client';
import React from 'react';
import { useSession } from 'next-auth/react';
import { IoSpeedometer } from 'react-icons/io5';
import { useSearchParams } from 'next/navigation';
import TableSpeed from '@/app/components/table/TableSpeed';
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

  return (
    <>
      <ReporteHeader
        title="REPORTE DE VELOCIDAD"
        deviceId={deviceId ?? ""}
        startDate={startDate ?? ""}
        endDate={endDate ?? ""}
        extraInfo={speedCar ? `Velocidad superior a ${speedCar}` : 'Sin velocidad definida'}
        formatDate={formatDate}
        icon={<IoSpeedometer size={25} />}
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

      <div>
        <TableSpeed url={tableUrl} deviceId={deviceId ?? ''} />
      </div>
    </>
  );
};

export default PageContent;
