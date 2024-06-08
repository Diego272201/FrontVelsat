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
      <p>Username: {session?.user.username}</p>
    </div>

    <div>
      
    </div>

    </>
  );
};

export default Dashboard;
