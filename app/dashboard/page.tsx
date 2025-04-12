// app/dashboard/page.tsx

import React from 'react';
import axios from 'axios';

const DeviceList = async () => {
  // Hacemos la solicitud a la API directamente en el componente
  let devices = [];

  try {
    const response = await axios.get('https://velsat.pe:8586/api/DeviceList/simplified/cgacela');
    devices = response.data;
   } catch (error) {
    console.error('Error fetching data:', error);
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Lista de Dispositivos</h1>
      <ul className="space-y-4">
        {devices.length > 0 ? (
          devices.map((device, index) => (
            <li key={index} className="border p-4 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold">{device.deviceId}</h2>
              <p><strong>Última velocidad válida:</strong> {device.lastValidSpeed} km/h</p>
              <p><strong>Última latitud válida:</strong> {device.lastValidLatitude}</p>
              <p><strong>Última longitud válida:</strong> {device.lastValidLongitude}</p>
            </li>
          ))
        ) : (
          <p>No se encontraron dispositivos.</p>
        )}
      </ul>
    </div>
  );
};

export default DeviceList;
