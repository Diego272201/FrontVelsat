import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import { useApi } from '@/context/ApiContext';
import { getDeviceListUrlSelect } from '../urlsApi/urlApi';

interface SelectProps {
  onSelect: (deviceId: string) => void;
}

export default function App({ onSelect }: SelectProps) {
  const { data: session } = useSession();
  const { baseUrl } = useApi();
  const username = session?.user.username;

  const [deviceIds, setDeviceIds] = useState<
    { value: string; label: string }[]
  >([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDevice, setSelectedDevice] = useState('');
  const [isManualSelection, setIsManualSelection] = useState(false);

  useEffect(() => {
    if (username) {
      const fetchData = async () => {
        try {
          const response = await axios.get(
            getDeviceListUrlSelect(baseUrl, username),
          );
          const data = response.data;
          const ids = data.map((item: { deviceId: string }) => ({
            value: item.deviceId,
            label: item.deviceId,
          }));
          setDeviceIds(ids);
        } catch (error) {
          console.error('Error al obtener datos:', error);
        }
      };

      fetchData();
    }
  }, [baseUrl, username]);

  const filteredDeviceIds = deviceIds.filter((deviceId) =>
    deviceId.label.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  useEffect(() => {
    if (!isManualSelection && searchQuery && filteredDeviceIds.length > 0) {
      setSelectedDevice(filteredDeviceIds[0].value);
      onSelect(filteredDeviceIds[0].value);
    }
  }, [searchQuery, filteredDeviceIds, onSelect, isManualSelection]);

  return (
    <div className="w-full">
      <input
        type="text"
        placeholder="Buscar..."
        className="mb-4 w-full rounded border border-gray-300 bg-gray-100 p-1.5"
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          setIsManualSelection(false);
        }}
      />

      <select
        value={selectedDevice}
        onChange={(e) => {
          setSelectedDevice(e.target.value);
          onSelect(e.target.value);
          setIsManualSelection(true);
        }}
        className="w-full rounded border border-gray-300 bg-gray-100 p-1.5 focus:border-gray-400 focus:outline-none focus:ring-0"
      >
        <option value="" disabled={!selectedDevice}>
          Seleccione Unidad
        </option>
        {filteredDeviceIds.map((deviceId) => (
          <option key={deviceId.value} value={deviceId.value}>
            {deviceId.label.toUpperCase()}
          </option>
        ))}
      </select>
    </div>
  );
}
