import React, { useState } from 'react';
import { FaDownload } from 'react-icons/fa';
import '@/app/styles/components.css';
import axios from 'axios';
import { CircularProgress } from '@nextui-org/react';

export default function ButtonDownload() {
  const [isLoading, setIsLoading] = useState(false);
  const [value, setValue] = useState(0);

  const handleDownload = async () => {
    setIsLoading(true);

    const totalTime = 3500;
    const increment = 100 / (totalTime / 100);

    let currentProgress = 0;
    const intervalId = setInterval(() => {
      if (currentProgress >= 100) {
        clearInterval(intervalId);
        return;
      }

      currentProgress += increment;
      setValue(currentProgress);
    }, 100);

    await axios
      .get(
        'http://63.251.107.133:8586/api/Reporting/downloadExcelG/2023-11-01T09:00/2023-11-01T23:00/c128-b6a726',
        {
          responseType: 'arraybuffer',
        },
      )
      .then((response) => {
        const blob = new Blob([response.data], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = window.URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'reporte_gps.xlsx');

        document.body.appendChild(link);
        link.click();

        link.onload = () => {
          setIsLoading(false);
          setValue(0);
        };

        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      })
      .catch((error) => {
        console.error('Error al descargar el archivo:', error);
        setIsLoading(false);
      });
    setValue(0);
    setIsLoading(false);
    console.log('Descarga simulada completada');
  };

  return (
    <div className='containerB'>
      <button
        className="button"
        type="button"
        onClick={handleDownload}
        disabled={isLoading}
      >
        <span className="button__text">Descargar</span>
        <span className="button__icon">
          <FaDownload color="#fff" />
        </span>
      </button>
      <div className="progressContainer">
        <div className="progressBar">
          <CircularProgress
            aria-label="Loading..."
            size="lg"
            value={isLoading ? value : 0}
            color="warning"
            showValueLabel={true}
          />
        </div>
      </div>
    </div>
  );
}
