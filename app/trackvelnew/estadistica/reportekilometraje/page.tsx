'use client';
import { HiOutlineDocumentReport } from 'react-icons/hi';
import React, { useEffect, useMemo, useState } from 'react';
import { FaCalendarCheck } from 'react-icons/fa';
import { IoCarSport } from 'react-icons/io5';
import '@/app/styles/table.css';
import { Tabs, Tab, Card, CardBody } from '@nextui-org/react';
import SelectRows from '@/app/components/ui/SelectRows';
import { useLocation } from 'react-router-dom';
import { useSession } from 'next-auth/react';
import { Toaster } from 'sonner';
import ButtonKilometerPage from '@/app/components/ui/ButtonKilometerPage';
import { IoSpeedometer } from 'react-icons/io5';
import { FaUser } from 'react-icons/fa6';
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
import VistaUnidad from '@/app/components/ui/VistaUnidad'; // Importación estática
import { useApi } from '@/context/ApiContext';

interface Row {
  item: number;
  deviceId: string;
  kilometros: number;
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
  const [selectedUrl, setSelectedUrl] = useState('');
  const [selectedRowsPerPage, setSelectedRowsPerPage] = useState<number>(15);
  const [loading, setLoading] = useState(true);
  const { baseUrl } = useApi();
  const [isBaseUrlReady, setIsBaseUrlReady] = useState(false);
  const [imagesLoading, setImagesLoading] = useState(true);

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

  useEffect(() => {
    if (!isBaseUrlReady) return;

    if (session && session.user && session.user.username) {
      const userName = session.user.username;
      console.log('Username:', userName);

      const tableUrlAll = `/api/Kilometer/kilometerall/${startDate}/${endDate}/${userName}`;
      const tableUrlOnly = `/api/Kilometer/kilometer/${startDate}/${endDate}/${deviceId}`;

      const url = deviceId === 'Todas las unidades' ? tableUrlAll : tableUrlOnly;

      setSelectedUrl(url);
      setLoading(false);

      const fetchData = async () => {
        try {
          const response = await axios.get(`${baseUrl}${url}`);
          const data = response.data.listaKilometros;
          setRows(data);
        } catch (error) {
          console.error('Error fetching data:', error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();

      console.log('Selected URL:', url);
    }
  }, [session, startDate, endDate, deviceId, isBaseUrlReady, baseUrl]);

  const pages = Math.ceil(rows.length / selectedRowsPerPage);

  const items = useMemo(() => {
    const start = (page - 1) * selectedRowsPerPage;
    const end = start + selectedRowsPerPage;
    return rows.slice(start, end);
  }, [page, rows, selectedRowsPerPage]);

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

  const namedown = deviceId === 'Todas las unidades' ? 'downloadExcelKall' : 'downloadExcelK';
  const updatedDeviceId = deviceId === 'Todas las unidades' ? session?.user.username || '' : deviceId;

  useEffect(() => {
    if (selectedTab === 'vista' && rows.length > 0) {
      let loadedImages = 0;
      const totalImages = rows.length;
      setImagesLoading(true); // Start loading

      const checkAllImagesLoaded = () => {
        if (loadedImages === totalImages) {
          setImagesLoading(false);
        }
      };

      rows.forEach((row) => {
        const img = new Image();
        img.src = '/UnidadK.webp'; // Path to your image
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

  return (
    <div className="tablaReport tablaReportMargen">
      <div className="stick">
        <div className="headerRG">
          <h2 className="resaltar text-center">REPORTE KILOMETRAJE</h2>
          <IoSpeedometer size={22} style={{ color: '#0d3b66' }} />
        </div>

        <div className="datosReporting">
          <div className="fristData">
            <div className="userReporte">
              <FaUser style={{ color: '#0d3b66' }} size={22} />
              <p>
                <span className="resaltar"> USUARIO: </span>
                {session?.user.username.toUpperCase()}
              </p>
            </div>
            <div className="userReporte">
              <IoCarSport style={{ color: '#0d3b66' }} size={22} />
              <p>
                <span className="resaltar">UNIDAD:</span> {deviceId?.toUpperCase()}
              </p>
            </div>
          </div>

          <div className="fristDataa">
            <div className="alinearDate">
              <FaCalendarCheck style={{ color: '#0d3b66' }} />
              <p>
                <span className="resaltar">DESDE: </span>
                {formatDate(startDate)}
              </p>
            </div>
            <div className="alinearDate">
              <FaCalendarCheck style={{ color: '#0d3b66' }} />
              <p>
                <span className="resaltar">HASTA: </span>
                {formatDate(endDate)}
              </p>
            </div>
          </div>

          {selectedTab === 'tabla' && (
            <div className="selectRows">
              <SelectRows onChange={handleSelectRowsChange} />
            </div>
          )}
        </div>
      </div>
      <Toaster />

      <ButtonKilometerPage
        startDate={startDate || ''}
        endDate={endDate || ''}
        devideId={updatedDeviceId || ''}
        namedown={namedown}
        namedesc="kilometraje"
      ></ButtonKilometerPage>

      <div>
        <div className="flex w-full flex-col">
          <Tabs
            aria-label="Tabs variants"
            variant="underlined"
            defaultSelectedKey={defaultTab}
            onSelectionChange={(key) => setSelectedTab(key.toString())}
          >
            <Tab key="tabla" title="Tabla">
              {loading ? (
                <div>Loading...</div>
              ) : (
                <div>
                  <Table
                    selectionMode="single"
                    align="left"
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
                            {item.deviceId}
                          </TableCell>
                          <TableCell className="centerCell">
                            {item.kilometros.toFixed(2) + ' Km'}
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
                      kilometros={parseFloat(row.kilometros.toFixed(2))}
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