'use client';
import React, { useState, useCallback } from 'react';
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  InfoWindow,
} from '@react-google-maps/api';

export default function RequestPageDetail() {

  const containerStyle = {
    width: '100%',
    height: '100vh',
  };

  const [mapCenter, setMapCenter] = useState({
    lat: -12.046591525826495,
    lng: -77.04689047482863,
  });

  const markerPosition = {
    lat: -12.050718080974354,
    lng: -77.12488996041199,
  };

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
  });

  const [map, setMap] = useState(null);
  const [showInfoWindow, setShowInfoWindow] = useState(false);

  const onLoad = useCallback(function callback(map: any) {
    setMap(map);
  }, []);

  const onUnmount = useCallback(function callback(map: any) {
    setMap(null);
  }, []);

  const toggleInfoWindow = () => {
    setShowInfoWindow(!showInfoWindow);
  };

  return isLoaded ? (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={mapCenter}
      zoom={12}
      onLoad={onLoad}
      onUnmount={onUnmount}
      options={{
        mapTypeControl: false,
        fullscreenControl: true,
        fullscreenControlOptions: {
          position: google.maps.ControlPosition.BOTTOM_RIGHT,
        },
      }}
    >
      {/* Renderizar el marcador en las coordenadas personalizadas */}
      <Marker
        position={markerPosition}
        onClick={toggleInfoWindow}
        icon={{
          url: '/greenmarker.png',
          scaledSize: new window.google.maps.Size(40, 40),
        }}
      >
        {showInfoWindow && (
          <InfoWindow
            options={{ disableAutoPan: true }}
            onCloseClick={toggleInfoWindow}
          >
            <div>
              <p>Fecha: 01/11/2023</p>
              <p>Hora: 21:18</p>
              <p>Velocidad: 40 Km/H</p>
            </div>
          </InfoWindow>
        )}
      </Marker>
    </GoogleMap>
  ) : (
    <></>
  );
}
