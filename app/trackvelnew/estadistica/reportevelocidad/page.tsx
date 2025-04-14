'use client';
import React from 'react';
import { useSession } from 'next-auth/react';
import { IoSpeedometer } from 'react-icons/io5';
import { useLocation } from 'react-router-dom';
import '@/app/styles/table.css';
import TableSpeed from '@/app/components/table/TableSpeed';
import ReporteHeader from '@/app/components/ReporteHeader';
import ButtonDownloadFloat from '@/app/components/ui/ButtonDownloadFloat';

export default function ReporteVelocidad() {
  const { data: session } = useSession();

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
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
    <div className="tablaReport tablaReportMargen">
      
      <ReporteHeader
        title="REPORTE DE VELOCIDAD"
        deviceId={deviceId ?? ""}
        startDate={startDate ?? ""}
        endDate={endDate ?? ""}
        extraInfo="Velocidad superior a 10"
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
        <TableSpeed url={tableUrl} deviceId={deviceId ?? ''}/>
      </div>
    </div>
  );
}
