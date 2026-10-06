import { useApi } from '@/context/ApiContext';
import axios from 'axios';
import { FaDownload } from 'react-icons/fa';
import { toast } from 'sonner';
import { validateDateRange } from '../dates/convertToCustomFormat ';

interface DownloadParameterProps {
  startDate: string;
  endDate: string;
  devideId?: string;
  namedown: string;
  namedesc: string;
  username: string;
  nameurl: string;
  speedCar?: string;
  isKilometrajeAll?: boolean;
}

export default function ButtonDownloadFloat({
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
  const { baseUrl } = useApi();

  const handleDownload = async () => {
    const toastId = toast.loading('Descarga en proceso...', {
      className: 'toast-slide-in',
      position: 'bottom-left',
    });

    if (nameurl !== 'reporteeventos') {
      const errorMsg = validateDateRange(startDate, endDate, nameurl === 'reportegeneral' ? 31 : 11);
      if (errorMsg) {
        toast.error(errorMsg, {
          id: toastId,
          className: 'toast-slide-in',
          richColors: true,
        });
        return;
      }
    }

    try {
      let url = `${baseUrl}/api`;

      if (nameurl === 'reportekilometraje') {
        url += isKilometrajeAll
          ? `/Kilometer/downloadExcelKall/${startDate}/${endDate}/${username}`
          : `/Kilometer/${namedown}/${startDate}/${endDate}/${devideId}/${username}`;
      } else if (nameurl === 'reportevelocidad') {
        url += `/Reporting/${namedown}/${startDate}/${endDate}/${devideId}/${speedCar}/${username}`;
      } else if (nameurl === 'alertasvelocidad') {
        url += `/Preplan/AlertasVelocidadExcel?usuario=${encodeURIComponent(username)}&fechaini=${encodeURIComponent(startDate)}&fechafin=${encodeURIComponent(endDate)}`;
      } else if (nameurl === 'reporteeventos') {
        url += `/Reporting/${namedown}/${startDate}/${endDate}/${devideId}/${username}`;
      } else {
        url += `/Reporting/${namedown}/${startDate}/${endDate}/${devideId}/${username}`;
      }

      const response = await axios.get(url, {
        responseType: 'arraybuffer',
      });

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const downloadUrl = window.URL.createObjectURL(blob);
      const fileName = `reporte_${namedesc}_${devideId || 'todos'}.xlsx`;
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', fileName);
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
    }
  };

  return (
    <div className="whatsapp-btn">
      <div className="tooltip-wrapper">
        <span className="tooltip-text">Descargar Excel</span>
        <button className="download-btn" onClick={handleDownload}>
          <FaDownload />
        </button>
      </div>
    </div>
  );
}
