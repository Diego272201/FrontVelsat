'use client';
import React, { useState } from 'react';
import { HiOutlineDocumentReport } from 'react-icons/hi';
import { FaCalendarDay, FaUser } from 'react-icons/fa6';
import { useSession } from 'next-auth/react';
import { IoCarSport, IoSpeedometer } from 'react-icons/io5';
import { IoCalendar } from 'react-icons/io5';
import ButtonDownload from '@/app/components/ui/Button';
import { useLocation } from 'react-router-dom';
import '@/app/styles/table.css';
import TableSpeed from '@/app/components/table/TableSpeed';
import SelectRows from '@/app/components/ui/SelectRows';
import ButtonDownloadSpeed from '@/app/components/ui/ButtonDownloadSpeed';
import { Toaster } from 'sonner';
import { BiSolidReport } from 'react-icons/bi';


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
               REPORTE DE VELOCIDAD : {deviceId?.toUpperCase()}
                 <IoSpeedometer  size={25} />
               </h2>
               <span className="text-small font-extrabold text-blue-900 dark:text-blue-100">
               Velocidad superior a 10

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

      <ButtonDownloadSpeed
          startDate={startDate || ''}
          endDate={endDate || ''}
          devideId={deviceId || ''}
          speedCar={speedCar || ''}
          namedown="downloadExcelV"
          namedesc="velocidad"
          username={username || ''}
        />
        
      <div>
        <TableSpeed
          url={tableUrl}
        ></TableSpeed>
      </div>
    </div>
  );
}