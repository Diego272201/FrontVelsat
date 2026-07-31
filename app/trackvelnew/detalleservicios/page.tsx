'use client';

import ReporteHeader from '@/app/components/ReporteHeader';
import React, { useMemo, Suspense, useState, useEffect } from 'react';
import { BiSolidReport } from 'react-icons/bi';
import { formatDate } from '@/app/components/dates/convertToCustomFormat ';
import { useSearchParams } from 'next/navigation';
import { Spinner } from '@nextui-org/react';
import { AlertCircle } from 'lucide-react';
import { useUsername } from "@/hooks/useUsername";

interface TransportService {
  servicio: number;
  tierraAire: string;
  ingresoSalida: string;
  conductor: string;
  unidad: string;
  pasajero: string;
  calificacion: string;
  fechaServicio: string;
  fechaPasajero: string;
  fechAt: string;
  lugar: string;
  distrito: string;
  empresa: string;
}

interface ApiResponse {
  id: null | number;
  codigo: number;
  numero: string;
  empresa: string;
  calificacion: string;
  fecha: string;
  fechaini: string;
  pasajero: {
    codigo: null | number;
    nombre: string;
    codlan: null | string;
    apepate: null | string;
    login: null | string;
    clave: null | string;
    sexo: null | string;
    telefono: null | string;
    empresa: null | string;
    lugar: null | string;
    servicioactual: null | string;
  };
  lugar: {
    codlugar: null | string;
    codcli: null | string;
    direccion: string;
    distrito: string;
    wy: null | string;
    wx: null | string;
    estado: null | string;
    codcliente: null | string;
    referencia: null | string;
    zona: null | string;
  };
  servicio: {
    codservicio: null | string;
    destino: null | string;
    nomDestino: null | string;
    empresa: null | string;
    area: null | string;
    nomgrupo: null | string;
    fecha: string;
    grupo: string;
    tipo: string;
    conductor: {
      codigo: null | number;
      nombre: string;
      codlan: null | string;
      apepate: string;
      login: null | string;
      clave: null | string;
      sexo: null | string;
      telefono: null | string;
      empresa: null | string;
      lugar: null | string;
      servicioactual: null | string;
    };
    unidad: {
      id: null | number;
      codunidad: string;
      gps: null | string;
      listadespachos: null | string;
      historico: null | string;
      conductor: null | string;
      cobrador: null | string;
    };
  };
}

// Componente que contiene la lógica con useSearchParams
function PageContent() {
  const searchParams = useSearchParams();
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const deviceId = searchParams.get('deviceId');
  const { username } = useUsername();

  const getEmpresaName = (username: string | null): string => {
  if (!username) return 'CORPORACIÓN CGACELA S.A.C';
  
  const usernameLower = username.toLowerCase();
  
  if (usernameLower === 'aremys') {
    return 'AREMYS';
  }
  
  // Por defecto, devuelve CGACELA
  return 'CORPORACIÓN CGACELA S.A.C';
};

  const empresaName = getEmpresaName(username);

  const [data, setData] = useState<TransportService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fechaIni = startDate
    ? new Date(startDate).toLocaleDateString('es-PE') +
      ' ' +
      new Date(startDate).toLocaleTimeString('es-PE', { hour12: false })
    : null;
  const fechaFin = endDate
    ? new Date(endDate).toLocaleDateString('es-PE') +
      ' ' +
      new Date(endDate).toLocaleTimeString('es-PE', { hour12: false })
    : null;

  const fetchData = async () => {
    if (!startDate || !endDate) {
      setLoading(false);
      return;
    }

    // Validar que el username esté disponible
    if (!username) {
      setError('No se pudo obtener el nombre de usuario');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (!startDate || !endDate || !fechaIni || !fechaFin) {
        setError(
          'Las fechas de inicio y fin son requeridas en los parámetros de la URL',
        );
        return;
      }

      const apiUrl = `https://do.velsat.pe:2083/api/Gacela/DetalleServicios?usuario=${encodeURIComponent(username)}&fechaIni=${encodeURIComponent(fechaIni)}&fechaFin=${encodeURIComponent(fechaFin)}`;

      const response = await fetch(apiUrl);

      if (response.status === 404) {
        setData([]);
        return;
      }

      if (!response.ok) {
        throw new Error(`Error en la API: ${response.status}`);
      }

      const apiData: ApiResponse[] = await response.json();

      const mappedData: TransportService[] = apiData.map((item, index) => ({
        servicio: parseInt(item.numero) || index + 1,
        tierraAire: item.servicio?.grupo || 'N/A',
        ingresoSalida: item.servicio?.tipo || 'N/A',
        conductor: item.servicio?.conductor?.apepate?.trim() || 'N/A',
        unidad: item.servicio?.unidad?.codunidad || 'N/A',
        pasajero: item.pasajero?.nombre || 'N/A',
        calificacion: item.calificacion || 'SIN CALIFICACION',
        fechaServicio: item.servicio?.fecha || 'N/A',
        fechaPasajero: item.fecha || 'N/A',
        fechAt: item.fechaini || '',
        lugar: item.lugar?.direccion || 'N/A',
        distrito: item.lugar?.distrito || 'N/A',
        empresa: item.empresa || 'N/A',
      }));

      setData(mappedData);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  // Efecto para cargar datos cuando cambien las fechas o el username
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (!startDate || !endDate) {
        setLoading(false);
        return;
      }

      if (!username) {
        setError('No se pudo obtener el nombre de usuario');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        if (!fechaIni || !fechaFin) {
          setError(
            'Las fechas de inicio y fin son requeridas en los parámetros de la URL',
          );
          return;
        }

        const apiUrl = `https://do.velsat.pe:2083/api/Gacela/DetalleServicios?usuario=${encodeURIComponent(username)}&fechaIni=${encodeURIComponent(fechaIni)}&fechaFin=${encodeURIComponent(fechaFin)}`;

        const response = await fetch(apiUrl);

        if (response.status === 404) {
          if (isMounted) setData([]);
          return;
        }

        if (!response.ok) {
          throw new Error(`Error en la API: ${response.status}`);
        }

        const apiData: ApiResponse[] = await response.json();

        const mappedData: TransportService[] = apiData.map((item, index) => ({
          servicio: parseInt(item.numero) || index + 1,
          tierraAire: item.servicio?.grupo || 'N/A',
          ingresoSalida: item.servicio?.tipo || 'N/A',
          conductor: item.servicio?.conductor?.apepate?.trim() || 'N/A',
          unidad: item.servicio?.unidad?.codunidad || 'N/A',
          pasajero: item.pasajero?.nombre || 'N/A',
          calificacion: item.calificacion || 'SIN CALIFICACION',
          fechaServicio: item.servicio?.fecha || 'N/A',
          fechaPasajero: item.fecha || 'N/A',
          fechAt: item.fechaini || '',
          lugar: item.lugar?.direccion || 'N/A',
          distrito: item.lugar?.distrito || 'N/A',
          empresa: item.empresa || 'N/A',
        }));

        if (isMounted) setData(mappedData);
      } catch (err) {
        console.error('Error fetching data:', err);
        if (isMounted) setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [startDate, endDate, username, fechaIni, fechaFin]);

  // Función para calcular la diferencia entre fechas
  const calculateDifference = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate.getTime() - startDate.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
    );
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return { days, hours, minutes };
  };

  const diff = useMemo(
    () =>
      startDate && endDate
        ? calculateDifference(startDate, endDate)
        : { days: 0, hours: 0, minutes: 0 },
    [startDate, endDate],
  );

  const extraInfo = `${diff.days} días, ${diff.hours} horas, ${diff.minutes} minutos`;

  const servicioColorMap = useMemo(() => {
    const groupColors = ['bg-blue-50', 'bg-green-50', 'bg-yellow-50'];
    const map: Record<string, string> = {};
    let colorIndex = 0;

    data.forEach((row) => {
      if (!map[row.servicio]) {
        map[row.servicio] = groupColors[colorIndex % groupColors.length];
        colorIndex++;
      }
    });
    return map;
  }, [data]);

  if (loading) {
    return (
      <div>
        <ReporteHeader
          title="REPORTE DE SERVICIOS ATENDIDOS EMPRESA"
          deviceId={empresaName}
          startDate={startDate ?? ''}
          endDate={endDate ?? ''}
          extraInfo={extraInfo}
          formatDate={formatDate}
          icon={<BiSolidReport size={25} />}
        />
        <div className="flex flex-col items-center justify-center gap-2 p-8">
          <Spinner color="primary" />
          <span className="text-gray-600">Cargando Servicios</span>
        </div>
      </div>
    );
  }

  // Mostrar error
  if (error) {
    return (
      <div>
        <ReporteHeader
          title="REPORTE DE SERVICIOS ATENDIDOS EMPRESA"
          deviceId={empresaName}
          startDate={startDate ?? ''}
          endDate={endDate ?? ''}
          extraInfo={extraInfo}
          formatDate={formatDate}
          icon={<BiSolidReport size={25} />}
        />

        <div className="flex items-center justify-center p-6">
          <div className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-700 shadow-sm">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span className="font-medium">Error al cargar los datos:</span>
            <span>{error}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <ReporteHeader
        title="REPORTE DE SERVICIOS ATENDIDOS EMPRESA"
        deviceId={empresaName}
        startDate={startDate ?? ''}
        endDate={endDate ?? ''}
        extraInfo={extraInfo}
        formatDate={formatDate}
        icon={<BiSolidReport size={25} />}
      />

      <div className="w-full overflow-x-auto bg-gradient-to-br from-gray-50 to-gray-100 p-2 shadow-lg">
        <div className="overflow-hidden border border-gray-200 bg-white shadow-sm">
          {/* Scroll vertical con altura máxima */}
          <div className="h-[calc(100vh-125px)] overflow-y-auto">
            <table className="w-full min-w-max">
              <thead className="sticky top-0 z-10 bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow">
                <tr className="bg-gradient-to-r from-gray-600 to-gray-700 text-white">
                  <th className="border-r border-gray-500 px-2 py-1 text-left text-[11px] font-semibold uppercase tracking-wider last:border-r-0">
                    Servicio
                  </th>
                  <th className="border-r border-gray-500 px-2 py-1 text-left text-[11px] font-semibold uppercase tracking-wider last:border-r-0">
                    Tierra/Aire
                  </th>
                  <th className="border-r border-gray-500 px-2 py-1 text-left text-[11px] font-semibold uppercase tracking-wider last:border-r-0">
                    Ingreso/Salida
                  </th>
                  <th className="border-r border-gray-500 px-2 py-1 text-left text-[11px] font-semibold uppercase tracking-wider last:border-r-0">
                    Conductor
                  </th>
                  <th className="border-r border-gray-500 px-2 py-1 text-left text-[11px] font-semibold uppercase tracking-wider last:border-r-0">
                    Unidad
                  </th>
                  <th className="border-r border-gray-500 px-2 py-1 text-left text-[11px] font-semibold uppercase tracking-wider last:border-r-0">
                    Pasajero
                  </th>
                  <th className="border-r border-gray-500 px-2 py-1 text-left text-[11px] font-semibold uppercase tracking-wider last:border-r-0">
                    Calificación
                  </th>
                  <th className="border-r border-gray-500 px-2 py-1 text-left text-[11px] font-semibold uppercase tracking-wider last:border-r-0">
                    Fecha Servicio
                  </th>
                  <th className="border-r border-gray-500 px-2 py-1 text-left text-[11px] font-semibold uppercase tracking-wider last:border-r-0">
                    Fecha Pasajero
                  </th>
                  <th className="border-r border-gray-500 px-2 py-1 text-left text-[11px] font-semibold uppercase tracking-wider last:border-r-0">
                    Fec At
                  </th>
                  <th className="border-r border-gray-500 px-2 py-1 text-left text-[11px] font-semibold uppercase tracking-wider last:border-r-0">
                    Lugar
                  </th>
                  <th className="border-r border-gray-500 px-2 py-1 text-left text-[11px] font-semibold uppercase tracking-wider last:border-r-0">
                    Distrito
                  </th>
                  <th className="border-r border-gray-500 px-2 py-1 text-left text-[11px] font-semibold uppercase tracking-wider last:border-r-0">
                    Empresa
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {data.length === 0 ? (
                  <tr>
                    <td
                      colSpan={13}
                      className="px-4 py-12 text-center text-gray-500"
                    >
                      <div className="flex flex-col items-center justify-center gap-2">
                        <BiSolidReport className="h-8 w-8 text-gray-400" />
                        <span className="font-normal text-gray-500 text-[12px]">
                          No se encontraron servicios para el rango de fechas seleccionado
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  data.map((row, index) => (
                    <tr
                      key={`${row.servicio}-${index}`}
                      className={`${servicioColorMap[row.servicio]} hover:bg-blue-100`}
                    >
                      <td className="border-r border-gray-100 px-4 py-4 text-[11px] font-medium text-gray-900">
                        {row.servicio}
                      </td>
                      <td className="border-r border-gray-100 px-4 py-4 text-[11px] text-gray-700">
                        {row.tierraAire}
                      </td>
                      <td className="border-r border-gray-100 px-4 py-4 text-[11px] text-gray-700">
                        {row.ingresoSalida}
                      </td>

                      <td className="max-w-[200px] border-r border-gray-100 px-4 py-4 text-[11px] font-medium text-gray-900">
                        <div className="line-clamp-2 whitespace-normal break-words leading-tight">
                          {row.conductor}
                        </div>
                      </td>

                      <td className="border-r border-gray-100 px-4 py-4 font-mono text-[11px] text-gray-700">
                        {row.unidad}
                      </td>

                      <td className="max-w-[200px] border-r border-gray-100 px-4 py-4 text-[11px] font-medium text-gray-900">
                        <div className="whitespace-normal break-words leading-tight">
                          {row.pasajero}
                        </div>
                      </td>

                      <td className="border-r border-gray-100 px-4 py-4 text-[11px] text-gray-700">
                        {row.calificacion}
                      </td>
                      <td className="border-r border-gray-100 px-4 py-4 font-mono text-[11px] text-gray-700">
                        <div className="text-xs">{row.fechaServicio}</div>
                      </td>
                      <td className="border-r border-gray-100 px-4 py-4 font-mono text-[11px] text-gray-700">
                        <div className="text-xs">{row.fechaPasajero}</div>
                      </td>
                      <td className="border-r border-gray-100 px-4 py-4 text-[11px] text-gray-700">
                        {row.fechAt || '-'}
                      </td>
                      <td className="max-w-[200px] border-r border-gray-100 px-4 py-4 text-[11px] font-medium text-gray-900">
                        {row.lugar}
                      </td>

                      <td className="border-r border-gray-100 px-4 py-4 text-[11px] text-gray-700">
                        {row.distrito}
                      </td>
                      <td className="px-4 py-4 text-[11px] text-gray-700">
                        {row.empresa}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Información adicional */}
        <div className="mt-4 flex items-center justify-end text-sm text-gray-600">
          <div className="text-gray-500">Total: {data.length} servicios</div>
        </div>
      </div>
    </div>
  );
}

// Componente de carga
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
      <span className="ml-2 text-gray-600">Cargando parámetros...</span>
    </div>
  );
}

// Componente principal - este es tu código completo actualizado
export default function Page() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PageContent />
    </Suspense>
  );
}
