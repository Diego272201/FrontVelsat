'use client';

import React, { useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import AlertasVelocidadTable from '@/app/components/table/AlertasVelocidadTable';
import ReporteHeader from '@/app/components/ReporteHeader';
import { IoSpeedometer } from 'react-icons/io5';
import { formatDate } from '@/app/components/dates/convertToCustomFormat ';
import { useApi } from '@/context/ApiContext';
import { Spinner } from '@nextui-org/react';
import '@/app/styles/table.css';

export default function AlertasVelocidadReportContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const { baseUrl } = useApi();

  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const username = session?.user.username;

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

  const fechaini = formatDateForAPI(startDate || '');
  const fechafin = formatDateForAPI(endDate || '');

  const tableUrl = useMemo(() => {
    // ✅ Validar que también exista el username
    if (!fechaini || !fechafin || !username) return null;

    // ✅ Agregar el parámetro usuario a la URL
    return `/api/Preplan/AlertasVelocidad?usuario=${encodeURIComponent(username)}&fechaini=${encodeURIComponent(fechaini)}&fechafin=${encodeURIComponent(fechafin)}`;
  }, [fechaini, fechafin, username]); // ✅ Agregar username a las dependencias

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

  if (!baseUrl || !tableUrl) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" color="primary" label="Cargando..." />
      </div>
    );
  }

  return (
    <div>
      <ReporteHeader
        title="REPORTE DE ALERTAS DE VELOCIDAD"
        deviceId="TODAS LAS UNIDADES"
        startDate={startDate ?? ''}
        endDate={endDate ?? ''}
        extraInfo={extraInfo}
        formatDate={formatDate}
        icon={<IoSpeedometer size={25} />}
      />

      {/* ✅ Usar el nuevo componente */}
      <AlertasVelocidadTable url={tableUrl} deviceId="TODAS" />
    </div>
  );
}
