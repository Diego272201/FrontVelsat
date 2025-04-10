'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { IoCarSport } from 'react-icons/io5';
import '@/app/styles/table.css';
import { Tabs, Tab } from '@nextui-org/react';
import { useLocation } from 'react-router-dom';
import { useSession } from 'next-auth/react';
import { Toaster } from 'sonner';

import axios from 'axios';
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
import VistaUnidad from '@/app/components/ui/VistaUnidad';
import { useApi } from '@/context/ApiContext';
import ReporteHeader from '@/app/components/ReporteHeader';
import { formatDate } from '@/app/components/dates/convertToCustomFormat ';
import useCalculateRowsPerPage from '@/app/components/table/useCalculateRowsPerPage';
import ButtonDownloadFloat from '@/app/components/ui/ButtonDownloadFloat';

interface Row {
  item: number;
  deviceId: string;
  maximo: number;
  minimo: number;
}

export default function Page() {
  const { data: session } = useSession();

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const deviceId = searchParams.get('deviceId');
  const [rows, setRows] = useState<Row[]>([]);

  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<string | null>(null);
  const { baseUrl } = useApi();
  const [isBaseUrlReady, setIsBaseUrlReady] = useState(false);
  const [imagesLoading, setImagesLoading] = useState(true);

  const [isAllUnitsSelected, setIsAllUnitsSelected] = useState<boolean>(false);

  console.log('toy aca' + deviceId);

  useEffect(() => {
    const isAll = deviceId === 'Todas las unidades';
    setIsAllUnitsSelected(isAll);
  }, [deviceId]);

  const defaultTab = useMemo(() => {
    return deviceId === 'Todas las unidades' ? 'tabla' : 'vista';
  }, [deviceId]);

  useEffect(() => {
    setSelectedTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    if (baseUrl) {
      setIsBaseUrlReady(true);
    }
  }, [baseUrl]);

  const username = session?.user.username;

  useEffect(() => {
    if (!session?.user?.username || !baseUrl) return;

    const userName = session.user.username;

    const tableUrlAll = `/api/Kilometer/kilometerall/${startDate}/${endDate}/${userName}`;
    const tableUrlOnly = `/api/Kilometer/kilometer/${startDate}/${endDate}/${deviceId}/${userName}`;

    const url = deviceId === 'Todas las unidades' ? tableUrlAll : tableUrlOnly;

    setIsLoading(true);

    const fetchData = async () => {
      try {
        const response = await axios.get(`${baseUrl}${url}`);
        const data = response.data?.result?.listaKilometros || [];
        setRows(data);
      } catch (error) {
        console.error('Error fetching data:', error);
        setRows([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [session?.user?.username, deviceId, baseUrl, startDate, endDate]);

  useEffect(() => {
    if (selectedTab === 'vista' && rows.length > 0) {
      let loadedImages = 0;
      const totalImages = rows.length;
      setImagesLoading(true);

      const checkAllImagesLoaded = () => {
        if (loadedImages === totalImages) {
          setImagesLoading(false);
        }
      };

      rows.forEach((row) => {
        const img = new Image();
        img.src = '/UnidadK.webp';
        img.onload = () => {
          loadedImages += 1;
          checkAllImagesLoaded();
        };
        img.onerror = () => {
          loadedImages += 1;
          checkAllImagesLoaded();
        };
      });
    }
  }, [selectedTab, rows]);

  const rowsPerPage = useCalculateRowsPerPage(40, 5, 200);

  const pages = Math.ceil(rows.length / rowsPerPage);

  const items = React.useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;

    return rows.slice(start, end);
  }, [page, rows, rowsPerPage]);

  return (
    <div className="tablaReport tablaReportMargen">
      <ReporteHeader
        title="REPORTE KILOMETRAJE"
        deviceId={deviceId ?? ''}
        startDate={startDate ?? ''}
        endDate={endDate ?? ''}
        extraInfo={''}
        formatDate={formatDate}
        icon={<IoCarSport size={25} />}
      />
      <Toaster />

      <ButtonDownloadFloat
        startDate={startDate || ''}
        endDate={endDate || ''}
        devideId={deviceId || ''}
        namedown="downloadExcelK"
        namedesc="kilometraje"
        username={username || ''}
        nameurl="reportekilometraje"
        isKilometrajeAll={isAllUnitsSelected}
      ></ButtonDownloadFloat>

      <div className="-mt-[70px]">
        <div className="flex w-full flex-col">
          <Tabs
            aria-label="Tabs variants"
            variant="underlined"
            defaultSelectedKey={defaultTab}
            onSelectionChange={(key) => setSelectedTab(key.toString())}
          >
            <Tab key="tabla" title="Tabla">
              {isLoading ? (
                <div className="space-y-4 p-4">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="flex animate-pulse space-x-4 border-b border-gray-300 py-2"
                    >
                      <div className="relative h-6 w-12 overflow-hidden rounded bg-gray-100">
                        <div className="absolute inset-0 animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100"></div>
                      </div>

                      <div className="relative h-6 flex-1 overflow-hidden rounded bg-gray-100">
                        <div className="absolute inset-0 animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100"></div>
                      </div>

                      <div className="relative h-6 w-20 overflow-hidden rounded bg-gray-100">
                        <div className="absolute inset-0 animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <Table
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
                      wrapper: 'min-h-[222px]',
                    }}
                  >
                    <TableHeader className="VERh">
                      <TableColumn key="item" className="headerColumT">
                        ITEM
                      </TableColumn>
                      <TableColumn key="fecha" className="headerColumT">
                        UNIDAD
                      </TableColumn>
                      <TableColumn key="hora" className="headerColumT">
                        KILÓMETROS
                      </TableColumn>
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
                          <TableCell className="centerCell">
                            {item.item}
                          </TableCell>
                          <TableCell className="centerCell">
                            {item.deviceId.toUpperCase()}
                          </TableCell>
                          <TableCell className="centerCell">
                            {(item.maximo - item.minimo).toFixed(2) + ' Km'}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Tab>

            <Tab key="vista" title="Vista Unidad">
              {isLoading || imagesLoading ? (
                <div className="spinnerCenter">
                  <Spinner />
                </div>
              ) : rows.length === 0 ? (
                <div>No hay datos para las fechas ingresadas</div>
              ) : (
                <div className="listUnidad">
                  {rows.map((row) => (
                    <VistaUnidad
                      key={row.item}
                      item={row.item}
                      deviceId={row.deviceId}
                      kilometros={parseFloat(
                        (row.maximo - row.minimo).toFixed(2),
                      )}
                    />
                  ))}
                </div>
              )}
            </Tab>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
