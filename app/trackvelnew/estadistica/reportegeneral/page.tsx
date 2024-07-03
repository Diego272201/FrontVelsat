'use client';
import Table from '@/app/components/table/Table';
import { HiOutlineDocumentReport } from 'react-icons/hi';
import React, { useState } from 'react';
import ButtonDownload from '@/app/components/ui/Button';
import { IoCalendar } from 'react-icons/io5';
import '@/app/styles/table.css';
import { IoCarSport } from 'react-icons/io5';
import { FaUser } from 'react-icons/fa6';
import SelectRows from '@/app/components/ui/SelectRows';
import { useLocation } from 'react-router-dom';
import { useSession } from 'next-auth/react';
import { Toaster } from 'sonner';
import { FaDownload } from 'react-icons/fa';

export default function Page() {
  const { data: session } = useSession();

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const deviceId = searchParams.get('deviceId');

  const tableUrl = `http://66.240.210.125:8586/api/Reporting/general/${startDate}/${endDate}/${deviceId}`;

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
          <h2 className="resaltar text-center">REPORTE GENERAL</h2>
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
                {' '}
                <span className="resaltar">Desde: </span>
                {formatDate(startDate)}
              </p>
            </div>
            <div className="alinearDate">
              <IoCalendar style={{ color: '#0d3b66' }} />
              <p>
                {' '}
                <span className="resaltar">Hasta: </span>
                {formatDate(endDate)}
              </p>
            </div>
          </div>

          <div className="optionTablesr">
            <ButtonDownload
              startDate={startDate || ''}
              endDate={endDate || ''}
              devideId={deviceId || ''}
              namedown="downloadExcelG"
              namedesc="general"
            />
          </div>

          <div className="selectRows">
            <SelectRows onChange={(value) => handleSelectRowsChange(value)} />
          </div>
        </div>

        <div className="whatsapp">
          <button className="download-btn">
            <svg
              id="download"
              viewBox="0 0 24 24"
              data-name="Layer 1"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M14.29,17.29,13,18.59V13a1,1,0,0,0-2,0v5.59l-1.29-1.3a1,1,0,0,0-1.42,1.42l3,3a1,1,0,0,0,.33.21.94.94,0,0,0,.76,0,1,1,0,0,0,.33-.21l3-3a1,1,0,0,0-1.42-1.42ZM18.42,6.22A7,7,0,0,0,5.06,8.11,4,4,0,0,0,6,16a1,1,0,0,0,0-2,2,2,0,0,1,0-4A1,1,0,0,0,7,9a5,5,0,0,1,9.73-1.61,1,1,0,0,0,.78.67,3,3,0,0,1,.24,5.84,1,1,0,1,0,.5,1.94,5,5,0,0,0,.17-9.62Z"></path>
            </svg>
          </button>
        </div>
        <Toaster />
      </div>
      <div>
        <Table
          url={tableUrl}
          selectedRowsPerPage={selectedRowsPerPage}
          onSelectedRowsPerPageChange={handleSelectRowsChange}
        />
      </div>
    </div>
  );
}
