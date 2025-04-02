'use client';
import Table from '@/app/components/table/Table';
import { HiOutlineDocumentReport } from 'react-icons/hi';
import React, { useState } from 'react';
import { FaCalendarCheck, FaCalendarDay } from 'react-icons/fa';
import '@/app/styles/table.css';
import Image from 'next/image';
import { FaUser } from 'react-icons/fa6';
import SelectRows from '@/app/components/ui/SelectRows';
import { useLocation } from 'react-router-dom';
import { useSession } from 'next-auth/react';
import { Toaster } from 'sonner';
import ButtonDownloadFloat from '@/app/components/ui/ButtonDownloadFloat';
import { VscDebugBreakpointData } from 'react-icons/vsc';
import { GrStatusDisabledSmall } from 'react-icons/gr';
import { BiSolidReport } from 'react-icons/bi';

export default function Page() {
  const { data: session } = useSession();

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const deviceId = searchParams.get('deviceId');

  const username = session?.user.username;

  const tableUrl = `/api/Reporting/general/${startDate}/${endDate}/${deviceId}/${username}`;

  const [selectedRowsPerPage, setSelectedRowsPerPage] = useState<number>(15);

  const handleSelectRowsChange = (value: number) => {
    setSelectedRowsPerPage(value);
  };

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

  const calculateDifference = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
  
    // Calcular la diferencia en milisegundos
    const differenceInMs = end.getTime() - start.getTime();
  
    // Calcular los días, horas y minutos
    const days = Math.floor(differenceInMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((differenceInMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((differenceInMs % (1000 * 60 * 60)) / (1000 * 60));
  
    return { days, hours, minutes };
  };

  const diff = startDate && endDate ? calculateDifference(startDate, endDate) : { days: 0, hours: 0, minutes: 0 };


  return (
    <div className="tablaReport tablaReportMargen">
      <div className="stick">
        
   
        <div className="datosReporting">
          <div className="fristData flex items-center gap-6">
            <div className="dataFecha flex-1">
              <p className="flex items-center gap-2  rounded-lg border-white bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 shadow-md dark:bg-gray-800 dark:text-gray-300">
                <FaCalendarDay  className="text-sm text-white" />
                <span className="font-semibold text-white">
                  Fecha De Inicio: {formatDate(startDate)}
                </span>
              </p>
            </div>

            {/* Línea horizontal */}
            <div className="h-px flex-1 bg-gray-300 dark:bg-gray-600"></div>

            {/* Sección central destacada */}
            <div className="flex flex-col items-center rounded-lg border border-blue-300 bg-blue-100 px-6 py-2 shadow-md dark:border-blue-700 dark:bg-blue-900">
              <h2 className="resaltarT text-center">
                REPORTE GENERAL DE LA UNIDAD : {deviceId?.toUpperCase()}
                <BiSolidReport size={25} />
              </h2>
              <span className="text-small font-extrabold text-blue-900 dark:text-blue-100">
              {diff.days} días, {diff.hours} horas, {diff.minutes} minutos

              </span>
            </div>

            {/* Línea horizontal */}
            <div className="h-px flex-1 bg-gray-300 dark:bg-gray-600"></div>

            <div className="dataFecha flex-1 ">
              <p className="flex items-center gap-2  rounded-lg border-white bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 shadow-md dark:bg-gray-800 dark:text-gray-300">
                <FaCalendarDay  className="text-sm text-white" />
                <span className="font-semibold text-white">
                  Fecha De Inicio: {formatDate(endDate)}
                </span>
              </p>
            </div>
            
          </div>
        </div>
      </div>

      <Toaster />

      <ButtonDownloadFloat
        startDate={startDate || ''}
        endDate={endDate || ''}
        devideId={deviceId || ''}
        namedown="downloadExcelG"
        namedesc="general"
        username={username || ''}
      />

      <div>
        <Table url={tableUrl} />
      </div>
    </div>
  );
}
