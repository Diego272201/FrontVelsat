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
import SelectRows from '@/app/components/ui/SelectRows';

interface Row {
  item: number;
  fecha: string;
  hora: string;
  speedKPH: number;
  longitude: number;
  latitude: number;
  address: string;
}

interface AppProps {
  url: string; 

}

export default function App({ url }: AppProps) {
  const [page, setPage] = React.useState(1);

  const [rows, setRows] = useState<Row[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  const [selectedRowsPerPage, setSelectedRowsPerPage] = useState<number>(15);

  useEffect(() => {
    const fetcData = async () => {
      try {
        const response = await axios.get(url);
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

  const handleSelectRowsChange = (value: string) => {
    setSelectedRowsPerPage(parseInt(value, 10));
    setPage(1);
  };

  const pages = Math.ceil(rows.length / selectedRowsPerPage);

  const items = React.useMemo(() => {
    const start = (page - 1) * selectedRowsPerPage;
    const end = start + selectedRowsPerPage;

    return rows.slice(start, end);
  }, [page, rows, selectedRowsPerPage]);

  return (
    <div>
      <SelectRows onChange={handleSelectRowsChange} />
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
        <TableColumn key="address" className='headerColumT'>UBICACIÓN</TableColumn>
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
    </div>
  );
}
