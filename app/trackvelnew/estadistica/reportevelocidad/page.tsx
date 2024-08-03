'use client';
import React, { useState } from 'react';
import { HiOutlineDocumentReport } from 'react-icons/hi';
import { FaUser } from 'react-icons/fa6';
import { useSession } from 'next-auth/react';
import { IoCarSport } from 'react-icons/io5';
import { IoCalendar } from 'react-icons/io5';
import ButtonDownload from '@/app/components/ui/Button';
import { useLocation } from 'react-router-dom';
import '@/app/styles/table.css';
import TableSpeed from '@/app/components/table/TableSpeed';
import SelectRows from '@/app/components/ui/SelectRows';
import ButtonDownloadSpeed from '@/app/components/ui/ButtonDownloadSpeed';
import { Toaster } from 'sonner';


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

  return (
    <div className="tablaReport tablaReportMargen">
      <div className="stick">
        <div className="headerRG">
          <h2 className="resaltar text-center">REPORTE DE VELOCIDAD</h2>
          <HiOutlineDocumentReport size={22} style={{ color: '#0d3b66' }} />
        </div>

        <div className="datosReporting">
          <div className="fristData">
            <div className="userReporte">
              <FaUser style={{ color: '#0d3b66' }} size={22} />
              <p>
                <span className="resaltar"> USUARIO: </span>
                {session?.user.username.toUpperCase()}
              </p>
            </div>
            <div className="userReporte">
              <IoCarSport style={{ color: '#0d3b66' }} size={22} />

              <p>
                <span className="resaltar">UNIDAD:</span>{' '}
                {deviceId?.toUpperCase()}
              </p>
            </div>
          </div>

          <div className="fristDataa">
            <div className="alinearDate">
              <IoCalendar style={{ color: '#0d3b66' }} />
              <p>
                <span className="resaltar">DESDE: </span>
                {formatDate(startDate)}
              </p>
            </div>
            <div className="alinearDate">
              <IoCalendar style={{ color: '#0d3b66' }} />
              <p>
                <span className="resaltar">HASTA: </span>
                {formatDate(endDate)}
              </p>
            </div>
          </div>
          <div className="selectRows">
            <SelectRows onChange={(value) => handleSelectRowsChange(value)} />
          </div>
        </div>

        <Toaster />
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
          selectedRowsPerPage={selectedRowsPerPage}
          onSelectedRowsPerPageChange={handleSelectRowsChange}
        ></TableSpeed>
      </div>
    </div>
  );
}