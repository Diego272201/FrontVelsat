'use client';

import Table from '@/app/components/table/Table';
import { HiOutlineDocumentReport } from 'react-icons/hi';
import { IoCalendarClearSharp } from 'react-icons/io5';

import React from 'react';
import ButtonDownload from '@/app/components/ui/Button';
import { IoCalendar } from 'react-icons/io5';
import Avatar from '@/app/components/ui/Avatar';
import '@/app/styles/table.css'
import { IoCarSport } from "react-icons/io5";
import { FaUser } from "react-icons/fa6";
import SelectRows from '@/app/components/ui/SelectRows';

export default function page() {
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
          <FaUser style={{ color: '#0d3b66' }}  size={22}/>
            <p>
              <span className="resaltar"> USUARIO:</span> Corporación CGACELA
              S.AC.
            </p>
          </div>
          <div className="userReporte">
          <IoCarSport style={{ color: '#0d3b66' }} size={22}/>

            <p >
              <span className="resaltar">UNIDAD:</span> C125-B3K751
            </p>
          </div>
        </div>

        <div className="fristDataa">
          <div className="alinearDate">
            <IoCalendar style={{ color: '#0d3b66' }} />
            <p className="textDat">Desde: 26/07/2024 09:00</p>
          </div>
          <div className="alinearDate">
            <IoCalendar style={{ color: '#0d3b66' }} />
            <p className="textDat">Hasta: 26/07/2024 09:00</p>
          </div>
          <SelectRows></SelectRows>

        </div>

      </div>

      <Table></Table>
    </div>
  );
}
