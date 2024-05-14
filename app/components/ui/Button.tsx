import React, { useState } from 'react';
import { FaDownload } from 'react-icons/fa';
import '@/app/styles/components.css';
import axios from 'axios';

interface DownloadParameterProps {
  startDate: string;
  endDate: string;
  devideId: string;
  namedown: string;
}

export default function ButtonDownload({
  startDate,
  endDate,
  devideId,
  namedown,
}: DownloadParameterProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleDownload = async () => {
    setIsLoading(true);
    setProgress(0);

    try {
      const interval = setInterval(() => {
        setProgress((prevProgress) => {
          const newProgress = prevProgress + 5;
          return newProgress <= 100 ? newProgress : 100;
        });
      }, 150);

      const response = await axios.get(
        `http://63.251.107.133:8586/api/Reporting/${namedown}/${startDate}/${endDate}/${devideId}`,
        {
          responseType: 'arraybuffer',
          onDownloadProgress: (progressEvent) => {
            if (progressEvent.total !== undefined) {
              const progressPercent = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total,
              );
              setProgress(progressPercent);
            }
          },
        },
      );

      clearInterval(interval);

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'reporte_gps.xlsx');

      link.addEventListener('load', () => {
        setIsLoading(false);
        setProgress(0);
      });

      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al descargar el archivo:', error);
      setIsLoading(false);
      setProgress(0);
    }
    setProgress(0);
    setIsLoading(false);
  };

  return (
    <div className="containerB">
      <button
        className="button"
        type="button"
        onClick={handleDownload}
        disabled={isLoading}
      >
        <span className="button__text">
          Descargar
          <div className="progressdownload">
            {!isLoading && <span>0%</span>}
            {isLoading && <span>{progress}%</span>}
          </div>
        </span>
        <span className="button__icon">
          <FaDownload color="#fff" />
        </span>
      </button>
    </div>
  );
}
