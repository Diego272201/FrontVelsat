import React, { ChangeEvent, useCallback, useEffect, useState } from 'react';
import { Select, SelectItem } from '@nextui-org/react';
import axios from 'axios';
import { getSimplifiedDeviceListUrl } from '../urlsApi/urlApi';
import { useSession } from 'next-auth/react';

interface SelectProps {
  onSelect: (deviceId: string) => void;
}

export default function App({ onSelect }: SelectProps) {
  const { data: session, status } = useSession();

  const [deviceIds, setDeviceIds] = useState<
    { value: string; label: string }[]
  >([]);

  useEffect(() => {
    if (status === 'authenticated' && session) {
      const username = session.user.username;
      const fetchData = async () => {
        try {
          const response = await axios.get(
            getSimplifiedDeviceListUrl(username),
          );
          const data = response.data;
          const ids = data.map((item: { deviceId: string }) => ({
            value: item.deviceId,
            label: item.deviceId,
          }));

          ids.unshift({ value: 'Todas las unidades', label: 'Todas las unidades' });

          setDeviceIds(ids);

        } catch (error) {
          console.error('Error al obtener datos:', error);
        }
      };

      fetchData();
    }
  }, [status, session]);

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedDeviceId = event.target.value;
    if (selectedDeviceId === 'Todas las unidades') {
      const allDeviceIds = deviceIds.map(device => device.value).join(',');
      onSelect(allDeviceIds);
    } else {
      onSelect(selectedDeviceId);
    }
  };

  return (
    <Select
      items={deviceIds}
      placeholder="Seleccione Unidad"
      className="w-[100%]"
      onChange={handleSelectChange}
    >
      {(deviceId) => (
        <SelectItem key={deviceId.value}>
          {deviceId.value.toUpperCase()}
        </SelectItem>
      )}
    </Select>
  );
}
