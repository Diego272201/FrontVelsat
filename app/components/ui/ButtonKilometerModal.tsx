import React, { useState } from 'react';
import { FaDownload } from 'react-icons/fa';
import '@/app/styles/components.css';
import axios from 'axios';
import { toast } from 'sonner';
import '@/app/styles/sonner.css';
import { useSession } from 'next-auth/react';
import { useApi } from '@/context/ApiContext';

interface DownloadParameterProps {
  startDate: string;
  endDate: string;
  devideId: string;
  namedown: string;
  namedesc: string
}

export default function ButtonKilometerModal({
  startDate,
  endDate,
  devideId,
  namedown,
  namedesc
}: DownloadParameterProps) {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { baseUrl, setBaseUrl } = useApi();

  const username = session?.user.username;

  const handleDownload = async () => {
    const toastId = toast.loading('Descarga en proceso...', {className:'toast-slide-in'});

    if (!startDate || !endDate || !devideId || !namedown || !namedesc) {
      toast.error('Rellenar campos necesarios', { id: toastId, className:'toast-slide-in', richColors:true});
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 3) {
      toast.error('El límite de fechas es de 3 días', { id: toastId, className: 'toast-slide-in', richColors:true});
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

      let url = `${baseUrl}/api/Kilometer/${namedown}/${startDate}/${endDate}/${devideId}/${username}`;
      if (devideId === 'Todas las unidades') {
        const userName = session?.user?.username || '';
        url = `${baseUrl}/api/Kilometer/downloadExcelKall/${startDate}/${endDate}/${userName}`;
      }

      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.total !== undefined) {
            const progressPercent = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setProgress(progressPercent);
          }
        },
      });

      clearInterval(interval);

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const fileName = `reporte_${namedesc}_gps_${devideId}.xlsx`;
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', fileName);

      link.addEventListener('load', () => {
        setIsLoading(false);
        setProgress(0);
      });

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
      setIsLoading(false);
      setProgress(0);
      setBaseUrl;
    }
    setProgress(0);
    setIsLoading(false);
    setBaseUrl;
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