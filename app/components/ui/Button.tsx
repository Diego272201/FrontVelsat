import React from 'react';
import { FaDownload } from 'react-icons/fa';
import '@/app/styles/components.css';
import axios from 'axios';

export default function ButtonDownload() {
  const handleDownload = async () => {
    try {
      const response = await axios.get(
        'https://localhost:7294/api/Reporting/downloadExcel-g/2023-11-01T09:00/2023-11-01T23:00/c128-b6a726',
        {
          responseType: 'arraybuffer'
        },
      );

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'reporte_gps.xlsx');
      
      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);


    } catch (error) {
      console.error('Error al descargar el archivo:', error);
    }
  };

  return (
    <button className="button" type="button" onClick={handleDownload}>
      <span className="button__text">Download</span>
      <span className="button__icon">
        <FaDownload color="#fff" />
      </span>
    </button>
  );
}
