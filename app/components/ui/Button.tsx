import React, { useState } from 'react';
import { FaDownload } from 'react-icons/fa';
import '@/app/styles/components.css';
import axios from 'axios';

export default function ButtonDownload() {
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);

    const totalTime = 4000;
    const increment = 100 / (totalTime / 100);

    let currentProgress = 0;
    const intervalId = setInterval(() => {
      if (currentProgress >= 100) {
        clearInterval(intervalId);
        setLoading(false);
        return;
      }

      currentProgress += increment;
      setProgress(currentProgress);
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

        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      })
      .catch((error) => {
        console.error('Error al descargar el archivo:', error);
        setLoading(false);
      });

    setProgress(0);
    setLoading(false);
    console.log('Descarga simulada completada');
  };

  return (
    <div>
      <button
        className="button"
        type="button"
        onClick={handleDownload}
        disabled={loading}
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
            width: `${progress}%`,
            backgroundColor: '#a3e635',
            transition: 'width 0.5s',
            borderRadius: '5px',
          }}
        ></div>
      </div>
      <div>
        <span className="progressBarPercentage">{Math.round(progress)} %</span>
      </div>
    </div>
  );
}
