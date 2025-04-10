'use client';
import Table from '@/app/components/table/Table';
import React, { useEffect, useMemo } from 'react';
import '@/app/styles/table.css';
import { useLocation } from 'react-router-dom';
import { useSession } from 'next-auth/react';
import { Toaster } from 'sonner';
import ButtonDownloadFloat from '@/app/components/ui/ButtonDownloadFloat';
import { BiSolidReport } from 'react-icons/bi';
import ReporteHeader from '@/app/components/ReporteHeader';
import { formatDate } from '@/app/components/dates/convertToCustomFormat ';

export default function Page() {
  const { data: session } = useSession();

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const deviceId = searchParams.get('deviceId');

  const username = session?.user.username;

  const tableUrl = `/api/Reporting/general/${startDate}/${endDate}/${deviceId}/${username}`;

  const calculateDifference = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const differenceInMs = end.getTime() - start.getTime();

    const days = Math.floor(differenceInMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (differenceInMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
    );
    const minutes = Math.floor(
      (differenceInMs % (1000 * 60 * 60)) / (1000 * 60),
    );

    return { days, hours, minutes };
  };

  const diff = useMemo(() => {
    return startDate && endDate
      ? calculateDifference(startDate, endDate)
      : { days: 0, hours: 0, minutes: 0 };
  }, [startDate, endDate]);

  const extraInfo = useMemo(() => {
    return `${diff.days} días, ${diff.hours} horas, ${diff.minutes} minutos`;
  }, [diff]);

  return (
    <div className="tablaReport tablaReportMargen">
      <ReporteHeader
        title="REPORTE GENERAL DE LA UNIDAD"
        deviceId={deviceId ?? ''}
        startDate={startDate ?? ''}
        endDate={endDate ?? ''}
        extraInfo={extraInfo}
        formatDate={formatDate}
        icon={<BiSolidReport size={25} />}
      />

      <Toaster />

      <ButtonDownloadFloat
        startDate={startDate || ''}
        endDate={endDate || ''}
        devideId={deviceId || ''}
        namedown="downloadExcelG"
        namedesc="general"
        username={username || ''}
        nameurl="reportegeneral"

      />

      <div>
        <Table url={tableUrl} />
      </div>
    </div>
  );
}
