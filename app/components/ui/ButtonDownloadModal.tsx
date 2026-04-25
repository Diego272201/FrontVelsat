import React, { useState } from 'react';
import { FaDownload } from 'react-icons/fa';
import '@/app/styles/components.css';
import axios from 'axios';
import { toast } from 'sonner';
import '@/app/styles/sonner.css';
import { useApi } from '@/context/ApiContext';

interface DownloadParameterProps {
  startDate: string;
  endDate: string;
  devideId?: string;
  namedown: string;
  namedesc: string;
  username: string;
  nameurl: string;
  speedCar?: string; // solo para velocidad
  isKilometrajeAll?: boolean; // solo para kilometraje "all"
}

export default function ButtonDownload({
  startDate,
  endDate,
  devideId,
  namedown,
  namedesc,
  username,
  nameurl,
  speedCar,
  isKilometrajeAll = false,
}: DownloadParameterProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { baseUrl, setBaseUrl } = useApi();

  const handleDownload = async () => {
    const toastId = toast.loading('Descarga en proceso...', {
      className: 'toast-slide-in',
    });

    if (!startDate || !endDate || !devideId || !namedown || !namedesc) {
      toast.error('Rellenar campos necesarios', {
        id: toastId,
        className: 'toast-slide-in',
        richColors: true,
      });
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 11) {
      toast.error('El límite de fechas es de 11 días', {
        id: toastId,
        className: 'toast-slide-in',
        richColors: true,
      });
      return;
    }

    setIsLoading(true);
    setProgress(0);

    try {
      const interval = setInterval(() => {
        setProgress((prevProgress) => {
          const newProgress = prevProgress + 5;
          return newProgress <= 100 ? newProgress : 100;
        });
      }, 150);

      let url = `${baseUrl}/api`;

      if (nameurl === 'reportekilometraje') {
        url += isKilometrajeAll
          ? `/Kilometer/downloadExcelKall/${startDate}/${endDate}/${username}`
          : `/Kilometer/${namedown}/${startDate}/${endDate}/${devideId}/${username}`;
      } else if (nameurl === 'reportevelocidad') {
        url += `/Reporting/${namedown}/${startDate}/${endDate}/${devideId}/${speedCar}/${username}`;
      } else if (nameurl === 'reporteeventos') {
        url += `/Reporting/${namedown}/${startDate}/${endDate}/${devideId}/${username}`;
      } else {
        url += `/Reporting/${namedown}/${startDate}/${endDate}/${devideId}/${username}`;
      }

      console.log('AScacac' + url);
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        onDownloadProgress: (e) => {
          if (e.total) {
            const percent = Math.round((e.loaded * 100) / e.total);
            setProgress(percent);
          }
        },
      });

      clearInterval(interval);

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute(
        'download',
        `reporte_${namedesc}_gps_${devideId || 'todos'}.xlsx`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast.success('Descarga completada', {
        id: toastId,
        className: 'toast-slide-in',
        richColors: true,
      });
    } catch (error) {
      console.error('Error al descargar el archivo:', error);
      toast.error('Error al descargar el archivo', {
        id: toastId,
        className: 'toast-slide-in',
        richColors: true,
      });
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
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
