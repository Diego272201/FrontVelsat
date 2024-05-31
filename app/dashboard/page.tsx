'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import * as signalR from '@microsoft/signalr';

interface DeviceData {
  deviceId: string;
  lastValidLatitude: number;
  lastValidLongitude: number;
}

const Dashboard = () => {
  const { data: session, status } = useSession();

  const [datosEnTiempoReal, setDatosEnTiempoReal] = useState<DeviceData[]>([]);
  const [fechaActual, setFechaActual] = useState('');

  useEffect(() => {
    if (status === 'authenticated' && session) {

      const username = session.user.username;
      const hubUrl = `http://63.251.107.133:8586/dataHubDevice?username=${username}`;

      const connection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl)
        .build();

      connection.start()
        .then(() => connection.invoke('UnirGrupo', username))
        .then(() => {
          console.log(
            `Conexión SignalR establecida y unido al grupo: ${username}`,
          );
        })
        .catch((error) => {
          console.error('Error al conectar con SignalR:', error);
        });

      connection.on('ActualizarDatos', (datos) => {
        setFechaActual(datos.fechaActual);
        setDatosEnTiempoReal(datos.datosDevice);
      });

 
    }
  },[status, session]);

  if (status === 'loading') {
    return <p>Loading...</p>;
  }

  if (status === "unauthenticated") {
    return <p>No estás autenticado</p>;
  }
  return (
    <>
 
    <div>
      <h1>Dashboard</h1>
      <pre>
        <code>{JSON.stringify(session, null, 2)}</code>
      </pre>
    </div>

    <div>
      <h1>Datos en Tiempo Real</h1>
      <p>Fecha Actual: {fechaActual}</p>
      {datosEnTiempoReal.map((device, index) => (
        <div key={index}>
          <p>Device ID: {device.deviceId}</p>
          <p>Latitude: {device.lastValidLatitude}</p>
          <p>Longitude: {device.lastValidLongitude}</p>
        </div>
      ))}
    </div>

    </>
  );
};

export default Dashboard;
