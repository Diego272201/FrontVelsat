'use client';

import React, { useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import TableEvent from '@/app/components/table/TableEvent';
import ButtonDownloadFloat from '@/app/components/ui/ButtonDownloadFloat';
import ReporteHeader from '@/app/components/ReporteHeader';
import { MdOutlineEventNote } from 'react-icons/md';
import { formatDate } from '@/app/components/dates/convertToCustomFormat ';
import '@/app/styles/table.css';

export default function EventContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();

  const startDate = searchParams.get('startDate');
  const endDate   = searchParams.get('endDate');
  const deviceId  = searchParams.get('deviceId');
  const username  = session?.user.username;

  const tableUrl = `/api/Reporting/events/${startDate}/${endDate}/${deviceId}/${username}`;

  const calculateDifference = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate   = new Date(end);
    const diffMs    = endDate.getTime() - startDate.getTime();
    const days      = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours     = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes   = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
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
    <div className="flex h-full w-full flex-col overflow-hidden">
      <ReporteHeader
        title="REPORTE DE EVENTOS DE LA UNIDAD"
        deviceId={deviceId ?? ''}
        startDate={startDate ?? ''}
        endDate={endDate ?? ''}
        extraInfo={extraInfo}
        formatDate={formatDate}
        icon={<MdOutlineEventNote size={25} />}
      />
      <ButtonDownloadFloat
        startDate={startDate || ''}
        endDate={endDate || ''}
        devideId={deviceId || ''}
        namedown="downloadExcelE"
        namedesc="eventos"
        username={username || ''}
        nameurl="reporteeventos"
      />
      <TableEvent url={tableUrl} deviceId={deviceId ?? ''} />
    </div>
  );
}