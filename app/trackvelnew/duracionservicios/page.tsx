import ReporteHeader from '@/app/components/ReporteHeader';
import React from 'react';
import { BiSolidReport } from 'react-icons/bi';
import { formatDate } from '@/app/components/dates/convertToCustomFormat ';

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

export default function Page() {
  const data: TransportService[] = [
    {
      servicio: 1,
      tierraAire: 'TIERRA',
      ingresoSalida: 'SALIDA',
      conductor: 'VALENCIA FRANCIA ANGEL EDUARDO',
      unidad: 'c40-c8256',
      fechaServicio: '13.08.2025 06:00',
      fechaInicio: '',
      fechaFinal: '',
      empresa: 'TALMA',
    },
    {
      servicio: 2,
      tierraAire: 'TIERRA',
      ingresoSalida: 'SALIDA',
      conductor: 'SUAREZ PAREDES FELIX',
      unidad: 'C212-bqg739',
      fechaServicio: '13.08.2025 06:00',
      fechaInicio: '',
      fechaFinal: '',
      empresa: 'TALMA',
    },
  ];

  return (
    <div>
      <ReporteHeader
        title="REPORTE GENERAL DE LA UNIDAD - Camioneta 01"
        deviceId="ABC123"
        startDate="01/08/2025"
        endDate="01/09/2025"
        extraInfo="Generado por: Luis Castrejon"
        formatDate={formatDate}
        icon={<BiSolidReport size={25} />}
      />

      <div>
        <div className="w-full overflow-x-auto bg-gradient-to-br from-gray-50 to-gray-100 p-2 shadow-lg">
          <div className="overflow-hidden border border-gray-200 bg-white shadow-sm">
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
                      Fecha Servicio
                    </th>
                    <th className="border-r border-gray-500 px-2 py-1 text-left text-[11px] font-semibold uppercase tracking-wider last:border-r-0">
                      Fecha Inicio
                    </th>
                    <th className="border-r border-gray-500 px-2 py-1 text-left text-[11px] font-semibold uppercase tracking-wider last:border-r-0">
                      Fecha Final
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