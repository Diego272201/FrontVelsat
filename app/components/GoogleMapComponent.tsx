'use client';
import React, { memo, useMemo, useCallback, useState } from 'react';
import { GoogleMap } from '@react-google-maps/api';
import { useGoogleMaps } from '@/context/GoogleMapsContext';
import Loader from './Loader';
import MapFloatingControls from './MapFloatingControls';

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
  onCenterMap?: () => void;
  showFloatingControls?: boolean;
  controlsPositionClassName?: string;
}

const GoogleMapComponent = memo(function GoogleMapComponent({
  onLoad,
  onUnmount,
  center = defaultCenter,
  zoom = 6,
  children,
  className = '',
  onCenterMap,
  showFloatingControls = true,
  controlsPositionClassName = 'top-16 right-4',
}: GoogleMapComponentProps) {
  const { isLoaded, loadError } = useGoogleMaps();
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);

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
      zoomControl: false,
      streetViewControl: true,
      streetViewControlOptions: {
        position: google.maps?.ControlPosition?.RIGHT_TOP || 7,
      },
      disableDefaultUI: true,
      clickableIcons: false,
    };
  }, []);

  const handleLoad = useCallback(
    (map: google.maps.Map) => {
      const panorama = map.getStreetView();
      if (panorama) {
        panorama.setOptions({
          addressControl: false,
          fullscreenControl: false,
          enableCloseButton: false,
          motionTracking: false,
          motionTrackingControl: false,
        });
      }

      setMapInstance(map);
      onLoad(map);
    },
    [onLoad],
  );

  const handleUnmount = useCallback(() => {
    setMapInstance(null);
    onUnmount();
  }, [onUnmount]);

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
        onLoad={handleLoad}
        onUnmount={handleUnmount}
        options={mapOptions}
      >
        {children}
      </GoogleMap>

      {showFloatingControls && (
        <MapFloatingControls
          map={mapInstance}
          onCenterMap={onCenterMap}
          positionClassName={controlsPositionClassName}
        />
      )}
    </div>
  );
});

export default GoogleMapComponent;

