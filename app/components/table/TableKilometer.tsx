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
import { useApi } from '@/context/ApiContext';

interface Row {
  item: number;
  deviceId: string;
  kilometros: number;
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
        const response = await axios.get(`${baseUrl}${url}`);
        const data = response.data;
        setRows(data);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isBaseUrlReady, baseUrl, url]);

  // Preload images when data is fetched
  useEffect(() => {
    if (!isLoading && rows.length > 0) {
      const img = new Image();
      img.src = '/UnidadK.webp';
    }
  }, [isLoading, rows]);

  const pages = Math.ceil(rows.length / selectedRowsPerPage);

  const items = React.useMemo(() => {
    const start = (page - 1) * selectedRowsPerPage;
    const end = start + selectedRowsPerPage;

    return rows.slice(start, end);
  }, [page, rows, selectedRowsPerPage]);

  return (
    <div>
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
          <TableColumn key="fecha" className='headerColumT'>UNIDAD</TableColumn>
          <TableColumn key="hora" className='headerColumT'>KILÓMETROS</TableColumn>
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
              <TableCell className='centerCell'>{item.deviceId}</TableCell>
              <TableCell className='centerCell'>{item.kilometros.toFixed(2) + ' Km'}</TableCell>

            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
