'use client';

import ReporteHeader from '@/app/components/ReporteHeader';
import React, { useMemo } from 'react';
import { BiSolidReport } from 'react-icons/bi';
import { formatDate } from '@/app/components/dates/convertToCustomFormat ';
import { useSearchParams } from 'next/navigation';

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

export default function Page() {

    const searchParams = useSearchParams();
  
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const deviceId = searchParams.get('deviceId');

  // Función para calcular la diferencia entre fechas
  const calculateDifference = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate.getTime() - startDate.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return { days, hours, minutes };
  };

  // Calcular la diferencia usando useMemo para optimización
  const diff = useMemo(() => (
    startDate && endDate
      ? calculateDifference(startDate, endDate)
      : { days: 0, hours: 0, minutes: 0 }
  ), [startDate, endDate]);

  // Crear el texto de información extra
  const extraInfo = `${diff.days} días, ${diff.hours} horas, ${diff.minutes} minutos`;

  

  const data: TransportService[] = [
    {
      servicio: 1,
      tierraAire: 'TIERRA',
      ingresoSalida: 'SALIDA',
      conductor: 'VALENCIA FRANCIA ANGEL EDGARDO DE LA CRUZ',
      unidad: 'C40-C8256',
      pasajero: 'SANCHEZ ESPADA DAYANA ANGELICA',
      calificacion: 'SIN CALIFICACION',
      fechaServicio: '13.08.2025 06:00',
      fechaPasajero: '13.08.2025 06:00',
      fechAt: '',
      lugar: 'AV HERNANDO DE SOTO 147 CERCA DE LA AV MARINA',
      distrito: 'SAN MIGUEL',
      empresa: 'TALMA',
    },
    {
      servicio: 2,
      tierraAire: 'TIERRA',
      ingresoSalida: 'SALIDA',
      conductor: 'SUAREZ PAREDES FELIX',
      unidad: 'C212-bqg739',
      pasajero: 'FALCON BARRIENTOS ALESSANDRA LUCILA',
      calificacion: 'SIN CALIFICACION',
      fechaServicio: '13.08.2025 06:00',
      fechaPasajero: '13.08.2025 06:00',
      fechAt: '',
      lugar: 'JR RAMON CARCAMO MZ C3 LT 7',
      distrito: 'LIMA - CERCADO DE LIMA',
      empresa: 'TALMA',
    },
  ];

  return (
    <div>
     <ReporteHeader
        title="DETALLE DEL SERVICIO"
        deviceId={deviceId ?? ''}
        startDate={startDate ?? ''}
        endDate={endDate ?? ''}
        extraInfo={extraInfo}
        formatDate={formatDate}
        icon={<BiSolidReport size={25} />}
      />

      <div>
        <div className="w-full overflow-x-auto  bg-gradient-to-br from-gray-50 to-gray-100 p-2 shadow-lg">
          <div className="overflow-hidden  border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-max">
                <thead>
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
                  {data.map((row, index) => (
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
                  ))}
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
    </div>
  );
}
