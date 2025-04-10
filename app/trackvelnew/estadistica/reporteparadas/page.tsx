'use client';

import TableStops from '@/app/components/table/TableStops';
import React from 'react';
import '@/app/styles/table.css';
import { useLocation } from 'react-router-dom';
import ButtonDownloadFloat from '@/app/components/ui/ButtonDownloadFloat';
import { useSession } from 'next-auth/react';
import ReporteHeader from '@/app/components/ReporteHeader';
import { FaRegStopCircle } from "react-icons/fa";

export default function Page() {
  const { data: session } = useSession();

  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const deviceId = searchParams.get('deviceId');

  const username = session?.user.username;


  const tableUrl = `/api/Reporting/stops/${startDate}/${endDate}/${deviceId}/${username}`;


  //FORMATEAR FECHA
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
             title="REPORTE DE PARADAS"
             deviceId={deviceId ?? ""}
             startDate={startDate ?? ""}
             endDate={endDate ?? ""}
             extraInfo=""
             formatDate={formatDate}
             icon={<FaRegStopCircle    size={25} />}

           />


      <ButtonDownloadFloat
          startDate={startDate || ''}
          endDate={endDate || ''}
          devideId={deviceId || ''}
          namedown="downloadExcelS"
          namedesc="paradas"
          username= {username || ''}
          nameurl='reporteparadas'
        ></ButtonDownloadFloat>

      <div>
        <TableStops
          url={tableUrl}

        ></TableStops>
      </div>
    </div>
  );
}
