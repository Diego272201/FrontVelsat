'use client';
import Table from '@/app/components/table/Table';
import { HiOutlineDocumentReport } from 'react-icons/hi';
import React, { useState } from 'react';
import { FaCalendarCheck } from 'react-icons/fa';
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

  return (
    <div className="tablaReport tablaReportMargen">
      <div className="stick">
        <div className="headerRG">
          <h2 className="resaltarT text-center">
            REPORTE GENERAL DE LA UNIDAD: {deviceId?.toUpperCase()}
          </h2>
          <Image
            src="/CarL.png"
            width={60}
            height={60}
            alt="Picture of the author"
          />

          {/* <HiOutlineDocumentReport size={22} style={{ color: '#0d3b66' }} /> */}
        </div>

        <div className="datosReporting">
          <div
            className="fristData"
            style={{ background: '#fe7f2d', color: 'white' }}
          >
            <div className="alinearDate">
              <p className="dateS">
                <GrStatusDisabledSmall />

                <span className="resaltar">
                  &nbsp;FECHA DE INICIO :&nbsp; {formatDate(startDate)}
                </span>
              </p>
            </div>

            <div className="alinearDate">
              <p className="dateS">
                <GrStatusDisabledSmall />

                <span className="resaltar">
                  &nbsp;FECHA DE FIN :&nbsp; {formatDate(endDate)}
                </span>
              </p>
            </div>

            {/* <div className="userReporte">
              <IoCarSport style={{ color: '#0d3b66' }} size={22} />

              <p>
                <span className="resaltar">UNIDAD:</span>{' '}
              </p>
            </div> */}
          </div>

          <div className="selectRows">
            <SelectRows onChange={(value) => handleSelectRowsChange(value)} />
          </div>

          {/* <div>
            
          </div> */}
        </div>
        <hr className="lineaH" />
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
        <Table
          url={tableUrl}
          selectedRowsPerPage={selectedRowsPerPage}
          onSelectedRowsPerPageChange={handleSelectRowsChange}
        />
      </div>
    </div>
  );
}
