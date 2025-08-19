import React from 'react';
import { FaCalendarDay } from 'react-icons/fa';

interface ReporteHeaderProps {
  title: string;
  deviceId: string;
  startDate: string;
  endDate: string;
  extraInfo: string;
  formatDate: (date: string) => string;
  icon: React.ReactNode;
}

export default function ReporteHeader({
  title,
  deviceId,
  startDate,
  endDate,
  extraInfo,
  formatDate,
  icon,
}: ReporteHeaderProps) {
  return (
 <div className="bg-blue-800 px-2 py-1 text-white m-0">
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      {/* Fecha de inicio */}
      <div className="flex items-center gap-2">
        <FaCalendarDay className="text-white" />
        <span className="text-sm font-semibold">
          Fecha de Inicio: <span className="text-gray-200">{formatDate(startDate)}</span>
        </span>
      </div>

      {/* Título e información */}
    <div className="text-center">
  <h2 className="text-[14px] font-bold uppercase flex items-center justify-center gap-2">
    {title} : <span className="text-[#ffbe0b]">{deviceId?.toUpperCase()}</span> {icon}
  </h2>
  <span className="text-[13px] text-gray-300 font-medium -mt-1 block">{extraInfo}</span>
</div>


      {/* Fecha final */}
      <div className="flex items-center gap-2">
        <FaCalendarDay className="text-white" />
        <span className="text-sm font-semibold">
          Fecha Final: <span className="text-gray-200">{formatDate(endDate)}</span>
        </span>
      </div>
    </div>
  </div>
  );
}
