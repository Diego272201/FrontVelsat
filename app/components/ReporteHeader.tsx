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
    <div className="stick">
      <div className="datosReporting">
        <div className="fristData flex items-center gap-6">

          <div className="dataFecha flex ">
            <p className="flex items-center gap-2 rounded-lg border-white py-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <FaCalendarDay className="text-sm text-[#212529]" />
              <span className="font-semibold text-[#212529]">
                Fecha De Inicio: {formatDate(startDate)}
              </span>
            </p>
          </div>

          {/* Línea horizontal */}
          <div className="h-px flex-1 bg-gray-300 dark:bg-gray-400"></div>

          {/* Sección central destacada */}
          <div className="flex flex-col items-center rounded-lg border border-blue-300 bg-blue-100 px-6 py-2 shadow-md dark:border-blue-700 dark:bg-blue-900">
            <h2 className="resaltarT text-center">
              {title} : {deviceId?.toUpperCase()}
              {icon}
            </h2>
            <span className="text-small font-extrabold text-blue-900 dark:text-blue-100">
              {extraInfo}
            </span>
          </div>

          {/* Línea horizontal */}
          <div className="h-px flex-1 bg-gray-300 dark:bg-gray-400"></div>

          <div className="dataFecha flex justify-end">
            <p className="flex items-center gap-2 rounded-lg border-white  py-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <FaCalendarDay className="text-sm text-[#212529]" />
              <span className="font-semibold text-[#212529]">
                Fecha Final: {formatDate(endDate)}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
