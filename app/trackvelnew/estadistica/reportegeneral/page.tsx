'use client';
import Table from '@/app/components/table/Table';
import { HiOutlineDocumentReport } from 'react-icons/hi';
import React, { useState, useEffect } from 'react';
import ButtonDownload from '@/app/components/ui/Button';
import { IoCalendar } from 'react-icons/io5';
import '@/app/styles/table.css';
import { IoCarSport } from 'react-icons/io5';
import { FaUser } from 'react-icons/fa6';
import SelectRows from '@/app/components/ui/SelectRows';
import { useLocation } from 'react-router-dom';
import { useSession } from 'next-auth/react';
import { Toaster } from 'sonner';

export default function Page() {
  const { data: session } = useSession();

  const [location, setLocation] = useState<Location | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setLocation(window.location);
    }
  }, []);

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

  if (!location) {
    // Renderiza un estado de carga o un mensaje de espera mientras se obtiene la localización
    return <div>Cargando...</div>;
  }

  const searchParams = location ? new URLSearchParams(location.search) : new URLSearchParams();
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const deviceId = searchParams.get('deviceId');

  const tableUrl = `http://66.240.210.125:8586/api/Reporting/general/${startDate}/${endDate}/${deviceId}`;

  return (
    <div className="tablaReport">
      <div className='stick'>
        <div className="headerRG">
          <h2 className="resaltar text-center">REPORTE GENERAL</h2>
          <HiOutlineDocumentReport size={22} style={{ color: '#0d3b66' }} />
        </div>

        <hr className="lineHorizontal" />

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
              <p className="textDat">Desde: {formatDate(startDate)}</p>
            </div>
            <div className="alinearDate">
              <IoCalendar style={{ color: '#0d3b66' }} />
              <p className="textDat">Hasta: {formatDate(endDate)}</p>
            </div>
          </div>
        </div>

        <div className="optionTables">
          <ButtonDownload
            startDate={startDate || ''}
            endDate={endDate || ''}
            devideId={deviceId || ''}
            namedown="downloadExcelG"
            namedesc="general"
          />
        </div>
        <Toaster />
        <SelectRows onChange={(value) => handleSelectRowsChange(value)} />
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
