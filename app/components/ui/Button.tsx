import React, { useEffect, useState } from 'react';
import { FaDownload } from 'react-icons/fa';
import '@/app/styles/components.css';
import axios from 'axios';

export default function ButtonDownload() {
  const [filled, setfilled] = useState(0);
  const [loading, isLoading] = useState(false);

  useEffect(() => {
    if (filled < 100 && loading) {
      setTimeout(() => setfilled((prev) => (prev += 5)), 150);
    }  
    if (filled >= 100){
      setfilled(0);
      isLoading(false);
    }

  }, [filled, loading]);

  const handleDownload = async () => {
    try {
      const response = await axios.get(
        'http://63.251.107.133:8586/api/Reporting/downloadExcelG/2023-11-01T09:00/2023-11-01T23:00/c128-b6a726',
        {
          responseType: 'arraybuffer',
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
    <div>
      <button
        className="button"
        type="button"
        onClick={() => {
          handleDownload();
          isLoading(true);
        }}
      >
        <span className="button__text">Descargar</span>
        <span className="button__icon">
          <FaDownload color="#fff" />
        </span>
      </button>

      <div className="progressBar">
        <div
          style={{
            height: '100%',
            width: `${filled}%`,
            backgroundColor: '#65a30d',
            transition: 'width 0.5s',
          }}
        ></div>
      </div>
      <span className='progressBarPercentage'>
        {filled} %
      </span>

    </div>
  );
}
