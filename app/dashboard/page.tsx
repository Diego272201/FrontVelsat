import { FaRegStopCircle } from "react-icons/fa";
import { formatDate } from "../components/dates/convertToCustomFormat ";
import ReporteHeader from "../components/ReporteHeader";
import Loader from "../components/Loader";


export default async function DashboardPage() {

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Dashboard de Unidades</h1>


           <ReporteHeader
                   title="REPORTE DE PARADAS"
                   deviceId={""}
                   startDate={ ""}
                   endDate={ ""}
                   extraInfo=""
                   formatDate={formatDate}
                   icon={<FaRegStopCircle    size={25} />}
      
                 />

      <div className="space-y-2">
        luis
        <Loader></Loader>
      </div>
    </div>
  );
}
