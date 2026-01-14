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
    <div className="m-0 bg-blue-800 px-2 py-1 text-white">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Fecha de inicio */}
        <div className="flex items-center gap-2">
          <FaCalendarDay className="text-white" />
          <span className="text-sm font-semibold">
            Fecha de Inicio:{' '}
            <span className="text-gray-200">{formatDate(startDate)}</span>
          </span>
        </div>

        {/* Título e información */}
        <div className="text-center">
          <h2 className="flex items-center justify-center gap-2 text-[14px] font-bold uppercase">
            {title} :{' '}
            <span className="text-[#ffbe0b]">{deviceId?.toUpperCase()}</span>{' '}
            {icon}
          </h2>
          <span className="-mt-1 block text-[13px] font-medium text-gray-300">
            {extraInfo}
          </span>
        </div>

        {/* Fecha final */}
        <div className="flex items-center gap-2">
          <FaCalendarDay className="text-white" />
          <span className="text-sm font-semibold">
            Fecha Final:{' '}
            <span className="text-gray-200">{formatDate(endDate)}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
