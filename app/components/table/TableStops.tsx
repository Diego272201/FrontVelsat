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
  Spinner,
} from '@nextui-org/react';
import axios from 'axios';
import Image from 'next/image';
import { useApi } from '@/context/ApiContext';
import useCalculateRowsPerPage from './useCalculateRowsPerPage';

interface Row {
  item: number;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  totalTime: string;
  longitude: number;
  latitude: number;
  address: string;
}

interface AppProps {
  url: string;
  deviceId: string;
}

export default function App({ url, deviceId }: AppProps) {
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
        const response = await axios.get(`${baseUrl}${url}`);
        const data = response.data.result;
        setRows(data);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isBaseUrlReady, baseUrl, url]);

  const rowsPerPage = useCalculateRowsPerPage(40, 5, 180);

  const pages = Math.ceil(rows.length / rowsPerPage);

  const items = React.useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;

    return rows.slice(start, end);
  }, [page, rows, rowsPerPage]);

  return (
    <div>
      <Table
        isHeaderSticky
        selectionMode="single"
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
          base: 'max-h-[88vh] overflow-scroll tablaReport',
          wrapper: 'min-h-[222px]',
        }}
      >
        <TableHeader className="VERh">
          <TableColumn key="item" className="headerColumT">
            ITEM
          </TableColumn>
          <TableColumn key="fechainicial" className="headerColumT">
            FECHA INICIO
          </TableColumn>
          <TableColumn key="horainicial" className="headerColumT">
            HORA INICIO
          </TableColumn>
          <TableColumn key="fechafinal" className="headerColumT">
            FECHA FINAL
          </TableColumn>
          <TableColumn key="horafinal" className="headerColumT">
            HORA FINAL
          </TableColumn>
          <TableColumn key="speedKPH" className="headerColumT">
            TIEMPO TOTAL
          </TableColumn>
          <TableColumn key="latitude" className="headerColumT">
            LATITUD
          </TableColumn>
          <TableColumn key="longitude" className="headerColumT">
            LONGITUD
          </TableColumn>
          <TableColumn key="address" className="headerColumT">
            UBICACIÓN
          </TableColumn>
          <TableColumn className="headerColumT">VER MAPA</TableColumn>
        </TableHeader>

        <TableBody
          emptyContent={
            isLoading ? (
              <Spinner />
            ) : (
              <div>No hay datos para las fechas ingresadas</div>
            )
          }
          items={isLoading || rows.length === 0 ? [] : items}
        >
          {(item) => (
            <TableRow key={item.item}>
              <TableCell className="centerCell">{item.item}</TableCell>
              <TableCell className="centerCell">{item.startDate}</TableCell>
              <TableCell className="centerCell">{item.startTime}</TableCell>
              <TableCell className="centerCell">{item.endDate}</TableCell>
              <TableCell className="centerCell">{item.endTime}</TableCell>
              <TableCell className="centerCell">{item.totalTime}</TableCell>
              <TableCell className="centerCell locationColumnU">
                {item.latitude}
              </TableCell>
              <TableCell className="centerCell locationColumnU">
                {item.longitude}
              </TableCell>
              <TableCell className="centerCell locationColumn">
                {item.address}
              </TableCell>
              <TableCell>
                <div className="centerMap">
                  <a
                    href={`/VerMapa?lat=${item.latitude}&lng=${item.longitude}&deviceId=${deviceId}&dir=${item.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Image
                      src="/map.png"
                      alt="Ver Mapa"
                      width={20}
                      height={20}
                    />
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
