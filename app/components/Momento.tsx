'use client';
import React, { useCallback, useState } from 'react';
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  InfoWindow,
} from '@react-google-maps/api';

interface MomentoProps {
  latitude: number;
  longitude: number;
  deviceId: string;
  direccion: string;
}

const containerStyle = {
  width: '100%',
  height: '100vh',
};

export default function Momento({
  latitude,
  longitude,
  deviceId,
  direccion,
}: MomentoProps) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
  });

  const center = {
    lat: latitude,
    lng: longitude,
  };

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [infoVisible] = useState(true);

  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  return isLoaded ? (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={16}
      onLoad={onLoad}
      onUnmount={onUnmount}
    >
      <Marker
        position={center}
        icon={{
          url: '/UnidadK.webp',
          scaledSize: new window.google.maps.Size(50, 30),
        }}
      />

      {infoVisible && (
        <InfoWindow
          position={{ lat: latitude, lng: longitude }}
          options={{
            disableAutoPan: true,
            pixelOffset: new window.google.maps.Size(0, -30),
          }}
        >
          <div
            style={{
              padding: '10px',
              borderRadius: '8px',
              backgroundColor: '#ffffff',
              minWidth: '180px',
              fontFamily: 'Segoe UI, sans-serif',
              fontSize: '14px',
              color: '#333',
              position: 'relative',
            }}
          >
            <p style={{ margin: 0, fontWeight: 'bold', color: '#003049' }}>
              Unidad: {deviceId.toUpperCase()}
            </p>
            <p
              title={direccion}
            >
              Dirección:{' '}
              {direccion.length > 25
                ? `${direccion.slice(0, 25)}...`
                : direccion}
            </p>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  ) : (
    <p>Cargando mapa...</p>
  );
}
