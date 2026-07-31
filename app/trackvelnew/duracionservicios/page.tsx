'use client';

import ReporteHeader from '@/app/components/ReporteHeader';
import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { BiSolidReport } from 'react-icons/bi';
import { formatDate } from '@/app/components/dates/convertToCustomFormat ';
import { useSearchParams } from 'next/navigation';
import { useUsername } from '@/hooks/useUsername';
import { Spinner } from '@nextui-org/react';
import { AlertCircle } from 'lucide-react';

interface APIResponse {
  codservicio: string | null;
  destino: string | null;
  nomDestino: string | null;
  empresa: string;
  area: string | null;
  nomgrupo: string | null;
  fecha: string;
  fecpreplan: string | null;
  fecatoavianca: string | null;
  fecparqueolatam: string | null;
  fecatolatam: string | null;
  fecgourmetlatam: string | null;
  feclcclatam: string | null;
  formathorarec: string | null;
  fecplan: string | null;
  fecfin: string | null;
  formatfecato: string | null;
  formathoraato: string | null;
  newfechaini: string | null;
  newfechafin: string | null;
  fecasignacion: string | null;
  grupo: string;
  numguia: string | null;
  estado: string | null;
  numero: string;
  numeromovil: string | null;
  numpax: string | null;
  tipo: string;
  usuario: string | null;
  costototal: string | null;
  listapuntos: string | null;
  conductor: {
    codigo: string | null;
    nombre: string;
    codlan: string | null;
    apepate: string;
    login: string | null;
    clave: string | null;
    sexo: string | null;
    telefono: string | null;
    empresa: string | null;
    lugar: string | null;
    servicioactual: string | null;
  };
  gps: string | null;
  unidad: {
    id: string | null;
    codunidad: string;
    gps: string | null;
    listadespachos: string | null;
    historico: string | null;
    conductor: string | null;
    cobrador: string | null;
  };
  owner: string | null;
  zona: string | null;
}

interface TransportService {
  servicio: number;
  tierraAire: string;
  ingresoSalida: string;
  conductor: string;
  unidad: string;
  fechaServicio: string;
  fechaInicio: string;
  fechaFinal: string;
  empresa: string;
}

const getEmpresaName = (username: string | null): string => {
  if (!username) return 'CORPORACIÓN CGACELA S.A.C';

  const usernameLower = username.toLowerCase();

  if (usernameLower === 'aremys') {
    return 'EMPRESA AREMYS';
  }

  // Por defecto, devuelve CGACELA
  return 'CORPORACIÓN CGACELA S.A.C';
};

function DuracionServiciosContent() {
  const [data, setData] = useState<TransportService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { username } = useUsername();

  const empresaName = getEmpresaName(username);

  const searchParams = useSearchParams();

  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!startDate || !endDate || !fechaIni || !fechaFin) {
          setError(
            'Las fechas de inicio y fin son requeridas en los parámetros de la URL',
          );
          return;
        }

        if (!username) {
          setError('No se pudo obtener el nombre de usuario');
          setLoading(false);
          return;
        }

        const apiUrl = `https://do.velsat.pe:2083/api/Gacela/DuracionServicios?usuario=${encodeURIComponent(username)}&fechaIni=${encodeURIComponent(fechaIni)}&fechaFin=${encodeURIComponent(fechaFin)}`;

        const response = await fetch(apiUrl);

        if (response.status === 404) {
          setData([]);
          return;
        }

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const apiData: APIResponse[] = await response.json();

        const transformedData: TransportService[] = apiData.map(
          (item, index) => ({
            servicio: index + 1,
            tierraAire: item.grupo || 'N/A',
            ingresoSalida: item.tipo || 'N/A',
            conductor: item.conductor?.apepate || 'N/A',
            unidad: item.unidad?.codunidad || 'N/A',
            fechaServicio: item.fecha || 'N/A',
            fechaInicio: item.newfechaini || '',
            fechaFinal: item.newfechafin || '',
            empresa: item.empresa || 'N/A',
          }),
        );

        setData(transformedData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    // Solo ejecutar si username está disponible
    if (username) {
      fetchData();
    }
  }, [startDate, endDate, fechaIni, fechaFin, username]); // Agregar username aquí

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
          <div className="h-[calc(100vh-125px)] overflow-y-auto">
            <table className="w-full min-w-max">
              <thead className="sticky top-0 z-10 bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow">
                <tr className="bg-gradient-to-r from-gray-600 to-gray-700 text-white">
                  <th className="sticky top-0 z-10 border-r border-gray-500 bg-gradient-to-r from-gray-700 to-gray-700 px-2 py-1 text-left text-[11px] font-semibold uppercase tracking-wider last:border-r-0">
                    Servicio
                  </th>
                  <th className="sticky top-0 z-10 border-r border-gray-500 bg-gradient-to-r from-gray-700 to-gray-700 px-2 py-1 text-left text-[11px] font-semibold uppercase tracking-wider last:border-r-0">
                    Tierra/Aire
                  </th>
                  <th className="sticky top-0 z-10 border-r border-gray-500 bg-gradient-to-r from-gray-700 to-gray-700 px-2 py-1 text-left text-[11px] font-semibold uppercase tracking-wider last:border-r-0">
                    Ingreso/Salida
                  </th>
                  <th className="sticky top-0 z-10 border-r border-gray-500 bg-gradient-to-r from-gray-700 to-gray-700 px-2 py-1 text-left text-[11px] font-semibold uppercase tracking-wider last:border-r-0">
                    Conductor
                  </th>
                  <th className="sticky top-0 z-10 border-r border-gray-500 bg-gradient-to-r from-gray-700 to-gray-700 px-2 py-1 text-left text-[11px] font-semibold uppercase tracking-wider last:border-r-0">
                    Unidad
                  </th>
                  <th className="sticky top-0 z-10 border-r border-gray-500 bg-gradient-to-r from-gray-700 to-gray-700 px-2 py-1 text-left text-[11px] font-semibold uppercase tracking-wider last:border-r-0">
                    Fecha Servicio
                  </th>
                  <th className="sticky top-0 z-10 border-r border-gray-500 bg-gradient-to-r from-gray-700 to-gray-700 px-2 py-1 text-left text-[11px] font-semibold uppercase tracking-wider last:border-r-0">
                    Fecha Inicio
                  </th>
                  <th className="sticky top-0 z-10 border-r border-gray-500 bg-gradient-to-r from-gray-700 to-gray-700 px-2 py-1 text-left text-[11px] font-semibold uppercase tracking-wider last:border-r-0">
                    Fecha Final
                  </th>
                  <th className="sticky top-0 z-10 bg-gradient-to-r from-gray-700 to-gray-700 px-2 py-1 text-left text-[11px] font-semibold uppercase tracking-wider">
                    Empresa
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 bg-white">
                {data.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-12 text-center text-gray-500"
                    >
                      <div className="flex flex-col items-center justify-center gap-2">
                        <BiSolidReport className="h-8 w-8 text-gray-400" />
                        <span className="font-normal text-gray-500 text-[14px]">
                          No se encontraron servicios para el rango de fechas seleccionado
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  data.map((row, index) => (
                    <tr
                      key={row.servicio}
                      className={`${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      } transition-colors duration-200 hover:bg-blue-50`}
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
                        <span className="rounded bg-gray-100 px-2 py-1 text-xs">
                          {row.unidad}
                        </span>
                      </td>
                      <td className="border-r border-gray-100 px-4 py-4 font-mono text-[11px] text-gray-700">
                        <div className="text-xs">{row.fechaServicio}</div>
                      </td>
                      <td className="border-r border-gray-100 px-4 py-4 font-mono text-[11px] text-gray-700">
                        <div className="text-xs">{row.fechaInicio || '-'}</div>
                      </td>
                      <td className="border-r border-gray-100 px-4 py-4 font-mono text-[11px] text-gray-700">
                        <div className="text-xs">{row.fechaFinal || '-'}</div>
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

        <div className="mt-2 flex items-center justify-end text-sm text-gray-600">
          <div className="text-gray-500">Total: {data.length} servicios</div>
        </div>
      </div>
    </div>
  );
}

// ✅ COMPONENTE DE LOADING para Suspense
// ✅ COMPONENTE DE LOADING para Suspense
function SearchParamsLoading() {
  const { username } = useUsername();
  const empresaName = getEmpresaName(username);

  return (
    <div>
      <ReporteHeader
        title="REPORTE DE SERVICIOS ATENDIDOS EMPRESA"
        deviceId={empresaName}
        startDate=""
        endDate=""
        extraInfo="Cargando parámetros..."
        formatDate={formatDate}
        icon={<BiSolidReport size={25} />}
      />
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center space-x-2 text-gray-600">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
          <span>Cargando parámetros de URL...</span>
        </div>
      </div>
    </div>
  );
}

// ✅ COMPONENTE PRINCIPAL - Exporta este componente
export default function Page() {
  return (
    <Suspense fallback={<SearchParamsLoading />}>
      <DuracionServiciosContent />
    </Suspense>
  );
}
