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
import Image from 'next/image';
import { useApi } from '@/context/ApiContext';

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
  selectedRowsPerPage: number;
  onSelectedRowsPerPageChange: (value: number) => void;
}

export default function App({ url, selectedRowsPerPage, onSelectedRowsPerPageChange }: AppProps) {
  const [page, setPage] = React.useState(1);
  const [rows, setRows] = useState<Row[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { baseUrl } = useApi();
  const [isBaseUrlReady, setIsBaseUrlReady] = useState(false);

  useEffect(() => {
    if (baseUrl) {
      setIsBaseUrlReady(true);
    }
  }, [baseUrl]);

  useEffect(() => {
    if (!isBaseUrlReady) return;

    const fetchData = async () => {
      try {
        console.log('La base es:' + baseUrl);
        console.log('La url es:' + url);
        const response = await axios.get(`${baseUrl}${url}`);
        const data = response.data;

        if (data && Array.isArray(data.result.listaTablas)) {
          setRows(data.result.listaTablas);
        } else {
          console.error('Error: Data is not in expected format', data);
          setRows([]); // Opción para manejar el caso donde data no es un array
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setRows([]); // Manejo de errores
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isBaseUrlReady, baseUrl, url]);

  const pages = Math.ceil(rows.length / selectedRowsPerPage);

  const items = React.useMemo(() => {
    const start = (page - 1) * selectedRowsPerPage;
    const end = start + selectedRowsPerPage;

    return rows.slice(start, end);
  }, [page, rows, selectedRowsPerPage]);

  return (

      <Table
        isHeaderSticky
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
          base: "max-h-[78vh] overflow-scroll tablaReport",
          wrapper: 'min-h-[222px]',
        }}
      >
        <TableHeader className='VERh'>
          <TableColumn key="item" className='headerColumT'>ITEM</TableColumn>
          <TableColumn key="fecha" className='headerColumT'>FECHA</TableColumn>
          <TableColumn key="hora" className='headerColumT'>HORA</TableColumn>
          <TableColumn key="speedKPH" className='headerColumT'>VELOCIDAD</TableColumn>
          <TableColumn key="latitude" className='headerColumT'>LATITUD</TableColumn>
          <TableColumn key="longitude" className='headerColumT'>LONGITUD</TableColumn>
          <TableColumn key="address" className='headerColumT'>UBICACIÓN</TableColumn>
          <TableColumn className='headerColumT'>VER MAPA</TableColumn>
        </TableHeader>

        <TableBody 
            emptyContent={
              isLoading ? <Spinner /> : <div>No hay datos para las fechas ingresadas</div>
            } 
            items={isLoading || rows.length === 0 ? [] : items}
          >
          {(item) => (
            <TableRow key={item.item}>
              <TableCell className='centerCell'>{item.item}</TableCell>
              <TableCell className='centerCell'>{item.fecha}</TableCell>
              <TableCell className='centerCell'>{item.hora}</TableCell>
              <TableCell className='centerCell'>{item.speedKPH}</TableCell>
              <TableCell className='centerCell locationColumnU'>{item.latitude}</TableCell>
              <TableCell className='centerCell locationColumnU'>{item.longitude}</TableCell>
              <TableCell className='centerCell locationColumn'>{item.address}</TableCell>
              <TableCell >
                <div className='centerMap'>
                <a href="#" >
                  <Image src="/map.png" alt="" width={25} height={'1000'}/>
                </a>
                </div>
  
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

 );
}
