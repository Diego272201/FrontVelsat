import React, { useState } from 'react';
import { FaDownload } from 'react-icons/fa';
import '@/app/styles/components.css';
import axios from 'axios';
import { toast } from 'sonner';
import '@/app/styles/sonner.css';
import { useApi } from '@/context/ApiContext';
import { useSession } from 'next-auth/react';

interface DownloadParameterProps {
  startDate: string;
  endDate: string;
  devideId: string;
  namedown: string;
  namedesc: string;
}

export default function ButtonKilometerPage({
  startDate,
  endDate,
  devideId,
  namedown,
  namedesc,
}: DownloadParameterProps) {
  const { data: session } = useSession();
  const { baseUrl, setBaseUrl } = useApi();
  const username = session?.user.username;

  const handleDownload = async () => {
    const toastId = toast.loading('Descarga en proceso...', {
      className: 'toast-slide-in',
      position: 'bottom-left',
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

    if (diffDays > 5) {
      toast.error('El límite de fechas es de 5 días', {
        id: toastId,
        className: 'toast-slide-in',
        richColors: true,
      });
      return;
    }

    try {
      let response;
      if (namedown === "downloadExcelKall") {
        response = await axios.get(
          `${baseUrl}/api/Kilometer/${namedown}/${startDate}/${endDate}/${username}`,
          {
            responseType: 'arraybuffer',
          },
        );
      } else {
        response = await axios.get(
          `${baseUrl}/api/Kilometer/${namedown}/${startDate}/${endDate}/${devideId}/${username}`,
          {
            responseType: 'arraybuffer',
          },
        );
      }

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const fileName = `reporte_${namedesc}_gps_${devideId}.xlsx`;
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);

      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

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
    }
    setBaseUrl;
  };

  return (
    <div className="whatsapp-btn">
      <button className="download-btn" onClick={handleDownload}>
        <FaDownload />
      </button>
    </div>
  );
}
