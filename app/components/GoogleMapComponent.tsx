'use client';
import React, { memo, useMemo } from 'react';
import { GoogleMap } from '@react-google-maps/api';
import { useGoogleMaps } from '@/context/GoogleMapsContext';
import Loader from './Loader';

const containerStyle = {
  width: '100%',
  height: '100vh',
};

const defaultCenter = {
  lat: -9.22812,
  lng: -75.78894,
};

interface GoogleMapComponentProps {
  onLoad: (map: google.maps.Map) => void;
  onUnmount: () => void;
  center?: google.maps.LatLngLiteral;
  zoom?: number;
  children?: React.ReactNode;
  className?: string;
}

const GoogleMapComponent = memo(function GoogleMapComponent({
  onLoad,
  onUnmount,
  center = defaultCenter,
  zoom = 6,
  children,
  className = '',
}: GoogleMapComponentProps) {
  const { isLoaded, loadError } = useGoogleMaps();

  // En GoogleMapComponent.tsx
  const mapOptions = useMemo(() => {
    const isMobile =
      typeof window !== 'undefined' &&
      ('ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent,
        ));

    return {
      mapTypeControl: false,
      fullscreenControl: false,
      gestureHandling: isMobile ? 'greedy' : 'auto',
      zoomControl: true,
      streetViewControl: true,
      streetViewControlOptions: {
        position: google.maps?.ControlPosition?.RIGHT_BOTTOM || 7,
      },
      disableDefaultUI: true,
      clickableIcons: false,
    };
  }, []);

  if (loadError) {
    return (
      <div className="flex h-full items-center justify-center bg-red-50">
        <div className="text-red-600">
          Error cargando Google Maps: {loadError.message}
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return <Loader />;
  }

  return (
    <div className={`relative ${className}`}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={zoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={mapOptions}
      >
        {children}
      </GoogleMap>
    </div>
  );
});

export default GoogleMapComponent;
