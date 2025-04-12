import { FaRegStopCircle } from 'react-icons/fa';
import { formatDate } from '../components/dates/convertToCustomFormat ';
import ReporteHeader from '../components/ReporteHeader';

export default async function DashboardPage() {
  return (
    <div className="p-4">
      <h1 className="mb-4 text-xl font-bold">Dashboard de Unidades</h1>

      <ReporteHeader
        title="REPORTE DE PARADAS"
        deviceId={''}
        startDate={''}
        endDate={''}
        extraInfo=""
        formatDate={formatDate}
        icon={<FaRegStopCircle size={25} />}
      />
    </div>
  );
}
