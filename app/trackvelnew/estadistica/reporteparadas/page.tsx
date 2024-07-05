'use client';

import TableStops from '@/app/components/table/TableStops';
import { HiOutlineDocumentReport } from 'react-icons/hi';
import React, { useContext, useEffect, useState } from 'react';
import ButtonDownload from '@/app/components/ui/Button';
import { IoCalendar } from 'react-icons/io5';
import '@/app/styles/table.css';
import { IoCarSport } from 'react-icons/io5';
import { FaUser } from 'react-icons/fa6';
import SelectRows from '@/app/components/ui/SelectRows';
import { useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import ButtonDownloadFloat from '@/app/components/ui/ButtonDownloadFloat';
import { FaCalendarCheck } from 'react-icons/fa';
import { useSession } from 'next-auth/react';

export default function Page() {
  const { data: session } = useSession();

  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const deviceId = searchParams.get('deviceId');

  const tableUrl = `http://66.240.210.125:8586/api/Reporting/stops/${startDate}/${endDate}/${deviceId}`;

  const [selectedRowsPerPage, setSelectedRowsPerPage] = useState<number>(15);

  const handleSelectRowsChange = (value: number) => {
    setSelectedRowsPerPage(value);
  };

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
      <div className="stick">
        <div className="headerRG">
          <h2 className="resaltar text-center">REPORTE DE PARADAS</h2>
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
              <FaCalendarCheck style={{ color: '#0d3b66' }} />
              <p>
                <span className="resaltar">DESDE: </span>
                {formatDate(startDate)}
              </p>
            </div>
            <div className="alinearDate">
              <FaCalendarCheck style={{ color: '#0d3b66' }} />
              <p>
                <span className="resaltar">HASTA: </span>
                {formatDate(endDate)}
              </p>
            </div>
          </div>

          {/* <div className="optionTablesr">
            <ButtonDownload
              startDate={startDate || ''}
              endDate={endDate || ''}
              devideId={deviceId || ''}
              namedown="downloadExcelG"
              namedesc="general"
            />
          </div> */}
          <div className="selectRows">
            <SelectRows onChange={(value) => handleSelectRowsChange(value)} />
          </div>
        </div>

        <ButtonDownloadFloat
          startDate={startDate || ''}
          endDate={endDate || ''}
          devideId={deviceId || ''}
          namedown="downloadExcelS"
          namedesc="paradas"
        ></ButtonDownloadFloat>

        <Toaster />
      </div>

      <div>
        <TableStops
          url={tableUrl}
          selectedRowsPerPage={selectedRowsPerPage}
          onSelectedRowsPerPageChange={handleSelectRowsChange}
        ></TableStops>
      </div>
    </div>
  );
}
