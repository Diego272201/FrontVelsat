'use client';
export const dynamic = 'force-dynamic';

import React, { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import TableStops from '@/app/components/table/TableStops';
import ButtonDownloadFloat from '@/app/components/ui/ButtonDownloadFloat';
import ReporteHeader from '@/app/components/ReporteHeader';
import '@/app/styles/table.css';
import { BsFillSignStopFill } from 'react-icons/bs';
import { formatDate } from '@/app/components/dates/convertToCustomFormat ';

function PageContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();

  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const deviceId = searchParams.get('deviceId');

  const username = session?.user.username;
  const tableUrl = `/api/Reporting/stops/${startDate}/${endDate}/${deviceId}/${username}`;


  const calculateDifference = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate.getTime() - startDate.getTime();
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

  const extraInfo = `${diff.days} días, ${diff.hours} horas, ${diff.minutes} minutos`;

  return (
    <>
      <ReporteHeader
        title="REPORTE DE PARADAS"
        deviceId={deviceId ?? ''}
        startDate={startDate ?? ''}
        endDate={endDate ?? ''}
        extraInfo={extraInfo}
        formatDate={formatDate}
        icon={<BsFillSignStopFill size={25} />}
      />

      <ButtonDownloadFloat
        startDate={startDate || ''}
        endDate={endDate || ''}
        devideId={deviceId || ''}
        namedown="downloadExcelS"
        namedesc="paradas"
        username={username || ''}
        nameurl="reporteparadas"
      />

      <div>
        <TableStops url={tableUrl} deviceId={deviceId ?? ''} />
      </div>
    </>
  );
}

export default PageContent;
