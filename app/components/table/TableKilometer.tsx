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

  useEffect(() => {
    const fetcData = async () => {
      try {
        const response = await axios.get(url);
        const data = response.data.listaKilometros;
        setRows(data);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setIsLoading(false);
      }
    };

    fetcData();
  }, [url]);

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
              <TableCell className='centerCell'>{item.kilometros.toFixed(2)}</TableCell>

            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
