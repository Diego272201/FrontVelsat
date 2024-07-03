'use client'
import React, { useState } from 'react'
import { HiOutlineDocumentReport } from 'react-icons/hi'
import { FaUser } from 'react-icons/fa6';
import { useSession } from 'next-auth/react';
import { IoCarSport } from 'react-icons/io5';
import { IoCalendar } from 'react-icons/io5';
import ButtonDownload from '@/app/components/ui/Button';
import { useLocation } from 'react-router-dom';
import '@/app/styles/table.css';
import TableSpeed from '@/app/components/table/TableSpeed';
import SelectRows from '@/app/components/ui/SelectRows';

export default function ReporteVelocidad() {
  const { data: session } = useSession();

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const deviceId = searchParams.get('deviceId');
  const speedCar = searchParams.get('speedCar');
 
  const tableUrl = `http://66.240.210.125:8586/api/Reporting/speed/${startDate}/${endDate}/${deviceId}/${speedCar}`;
  
  const [selectedRowsPerPage, setSelectedRowsPerPage] = useState<number>(15);

  const handleSelectRowsChange = (value: number) => {
    setSelectedRowsPerPage(value);
  };

  return (
    <div className="tablaReport">
  
    <div className='stick' style={{background: '#ffffff', marginBottom: '20px'}}>
      <div className="headerRG">
        <h2 className="resaltar text-center">REPORTE VELOCIDAD</h2>
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
            </p>
          </div>
        </div>

        <div className="fristDataa">
          <div className="alinearDate">
            <IoCalendar style={{ color: '#0d3b66' }} />
            <p className="textDat">Desde: </p>
          </div>
          <div className="alinearDate">
            <IoCalendar style={{ color: '#0d3b66' }} />
            <p className="textDat">Hasta: </p>
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

      <SelectRows onChange={(value) => handleSelectRowsChange(value)} />

     
    </div>

    <div>
        <TableSpeed url={tableUrl} selectedRowsPerPage={selectedRowsPerPage}
         onSelectedRowsPerPageChange={handleSelectRowsChange} ></TableSpeed>
    </div>
  </div>
  )
}
