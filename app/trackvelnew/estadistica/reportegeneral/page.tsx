'use client';

import Table from '@/app/components/table/Table';
import { HiOutlineDocumentReport } from 'react-icons/hi';
import React, { useContext, useEffect, useState } from 'react';
import ButtonDownload from '@/app/components/ui/Button';
import { IoCalendar } from 'react-icons/io5';
import '@/app/styles/table.css';
import { IoCarSport } from 'react-icons/io5';
import { FaUser } from 'react-icons/fa6';
import SelectRows from '@/app/components/ui/SelectRows';
import { useLocation } from 'react-router-dom';

export default function page() {
  const location = useLocation();
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  const searchParams = new URLSearchParams(location.search);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const deviceId = searchParams.get('deviceId');

  const tableUrl = `http://63.251.107.133:8586/api/Reporting/general/2023-11-01T09:00/2023-11-01T23:00/${deviceId}`;

  return (
    <div className="tablaReport">
      <div className="headerRG">
        <h2 className="resaltar text-center">REPORTE GENERAL</h2>
        <HiOutlineDocumentReport size={22} style={{ color: '#0d3b66' }} />
      </div>

      <hr className="lineHorizontal" />

      <div className="datosReporting">
        <div className="fristData">
          <div className="userReporte">
            <FaUser style={{ color: '#0d3b66' }} size={22} />
            <FaUser style={{ color: '#0d3b66' }} size={22} />
            <p>
              <span className="resaltar"> USUARIO:</span>
              CORPORACION CGACELA S.A.C
            </p>
          </div>
          <div className="userReporte">
            <IoCarSport style={{ color: '#0d3b66' }} size={22} />
            <IoCarSport style={{ color: '#0d3b66' }} size={22} />

            <p>
              <span className="resaltar">UNIDAD:</span> {deviceId}
            </p>
          </div>
        </div>

        <div className="fristDataa">
          <div className="alinearDate">
            <IoCalendar style={{ color: '#0d3b66' }} />
            <p className="textDat">Desde: {startDate}</p>
          </div>
          <div className="alinearDate">
            <IoCalendar style={{ color: '#0d3b66' }} />
            <p className="textDat">Hasta: {endDate}</p>
          </div>
        </div>
      </div>

      <div className="optionTables">
        <ButtonDownload
          startDate={startDate || ''}
          endDate={endDate || ''}
          devideId={deviceId || ''}
        />
        <SelectRows></SelectRows>
      </div>

      <Table url={tableUrl}></Table>
    </div>
  );
}
