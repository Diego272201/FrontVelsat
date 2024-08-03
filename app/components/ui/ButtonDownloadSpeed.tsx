import React, { useState } from 'react'
import { FaDownload } from 'react-icons/fa';
import '@/app/styles/components.css';
import axios from 'axios';
import { toast } from 'sonner';
import '@/app/styles/sonner.css';
import { useApi } from '@/context/ApiContext';


interface DownloadParameterProps {
  startDate: string;
  endDate: string;
  devideId: string;
  namedown: string;
  namedesc: string;
  speedCar: string;
  username: string;
}

export default function ButtonDownloadSpeed({
  startDate,
  endDate,
  devideId,
  namedown,
  namedesc,
  speedCar,
  username
}: DownloadParameterProps) {

  const { baseUrl, setBaseUrl } = useApi();
  
  const handleDownload = async () => {
    const toastId = toast.loading('Descarga en proceso...', {className:'toast-slide-in', position:'bottom-left'});

    if (!startDate || !endDate || !devideId || !namedown || !namedesc || !speedCar || !username) {
      toast.error('Rellenar campos necesarios', { id: toastId, className:'toast-slide-in', richColors:true});
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 5) {
      toast.error('El límite de fechas es de 5 días', { id: toastId, className: 'toast-slide-in', richColors:true});
      return;
    }

    try {
      const response = await axios.get(
        `${baseUrl}/api/Reporting/${namedown}/${startDate}/${endDate}/${devideId}/${speedCar}/${username}`,
        {
          responseType: 'arraybuffer',
        },
      );

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

      toast.success('Descarga completada', { id: toastId, className:'toast-slide-in', richColors:true});

    } catch (error) {
      console.error('Error al descargar el archivo:', error);
      setBaseUrl;
    }
    setBaseUrl;
  };

  return (
    <div className="whatsapp-btn">
    <button className="download-btn" onClick={handleDownload}>
      <FaDownload />
    </button>
  </div>
  )
}