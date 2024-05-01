'use client';
import React, { useEffect, useState } from 'react';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Pagination,
  getKeyValue,
  Spinner,
} from '@nextui-org/react';
import axios from 'axios';
import { urlReporteGeneral } from '../urlsApi/urlApi';

interface Row {
  item: number;
  fecha: string;
  hora: string;
  speedKPH: number;
  longitude: number;
  latitude: number;
  address: string;
}

export default function App() {
  const [page, setPage] = React.useState(1);

  const [rows, setRows] = useState<Row[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  const rowsPerPage = 15;

  useEffect(() => {
    const fetcData = async () => {
      try {
        const response = await axios.get(urlReporteGeneral);
        const data = response.data.listaTablas;
        setRows(data);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setIsLoading(false);
      }
    };

    fetcData();
  }, []);

  const pages = Math.ceil(rows.length / rowsPerPage);

  const items = React.useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;

    return rows.slice(start, end);
  }, [page, rows]);

  return (
    <Table
      selectionMode="single"
      align='left'
      color="primary"
      aria-label="Example table with client side pagination"
      bottomContent={
        <div className="flex w-full justify-center">
          {rows.length > 0 && (
            <Pagination
              isCompact
              showControls
              showShadow
              color="primary"
              page={page}
              total={pages}
              onChange={(page) => setPage(page)}
            />
          )}
        </div>
      }
      classNames={{
        wrapper: 'min-h-[222px]',
      }}
    >
      <TableHeader className='VERh'>
        <TableColumn key="item" className='headerColumT'>ITEM</TableColumn>
        <TableColumn key="fecha" className='headerColumT'>FECHA</TableColumn>
        <TableColumn key="hora" className='headerColumT'>HORA</TableColumn>
        <TableColumn key="speedKPH" className='headerColumT'>VELOCIDAD</TableColumn>
        <TableColumn key="longitude" className='headerColumT'>LONGITUD</TableColumn>
        <TableColumn key="latitude" className='headerColumT'>LATITUD</TableColumn>
        <TableColumn key="address" className='headerColumT'>UBICACION</TableColumn>
        <TableColumn className='headerColumT'>VER MAPA</TableColumn>
      </TableHeader>

      <TableBody emptyContent={<Spinner />} items={isLoading ? [] : items}>
        {(item) => (
          <TableRow key={item.item}>
            <TableCell className='centerCell'>{item.item}</TableCell>
            <TableCell className='centerCell'>{item.fecha}</TableCell>
            <TableCell className='centerCell'>{item.hora}</TableCell>
            <TableCell className='centerCell'>{item.speedKPH}</TableCell>
            <TableCell className='centerCell locationColumnU'>{item.longitude}</TableCell>
            <TableCell className='centerCell locationColumnU'>{item.latitude}</TableCell>
            <TableCell className='centerCell locationColumn'>{item.address}</TableCell>
            <TableCell >
              <div className='centerMap'>
              <a href="#" >
                <img src="/map.png" alt="" width={25} />
              </a>
              </div>
   
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
