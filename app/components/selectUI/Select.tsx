import React, { useEffect, useState } from "react";
import {Select, SelectItem} from "@nextui-org/react";
import axios from "axios";
import { urlAPISimplifid } from "../urlsApi/urlApi";

export default function App() {

  const [deviceIds, setDeviceIds] = useState<{ value: string; label: string }[]>([]);

  

  useEffect(() => {
    
    const fetchData = async () => {
      try {
        const response = await axios.get(urlAPISimplifid);
        const data = response.data;
        const ids = data.map((item: { deviceId: string }) => ({ value: item.deviceId, label: item.deviceId }));
        
        setDeviceIds(ids);
      } catch (error) {
        console.error("Error al obtener datos:", error);
      }
    };

    fetchData();
    
  }, []);

  
  return (
    <Select
      items={deviceIds}
      placeholder="Seleccione Unidad"
      className="w-[100%]"
    >
      {(deviceId) => <SelectItem key={deviceId.value}>{deviceId.value.toUpperCase()}</SelectItem>}
    </Select>
  );
}
