import React, { ChangeEvent, useCallback, useEffect, useState } from "react";
import {Select, SelectItem} from "@nextui-org/react";
import axios from "axios";
import { urlAPISimplifid } from "../urlsApi/urlApi";


interface SelectProps {
  onSelect: (deviceId: string) => void; 
}


export default function App({onSelect}:SelectProps) {

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


  const handleSelectChange = (event:React.ChangeEvent<HTMLSelectElement>) => {
    const selectedDeviceId = event.target.value;
    onSelect(selectedDeviceId);
  };


  
  return (
    <Select
      items={deviceIds}
      placeholder="Seleccione Unidad"
      className="w-[100%]"
      onChange={handleSelectChange}
    >
      {(deviceId) => <SelectItem key={deviceId.value}>{deviceId.value.toUpperCase()}</SelectItem>}
    </Select>
  );
}
