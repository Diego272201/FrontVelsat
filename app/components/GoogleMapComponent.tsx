'use client';
import React, { memo, useMemo, useCallback } from 'react';
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

function createMapTypeControl(map: google.maps.Map) {
  const wrapper = document.createElement('div');
  wrapper.dataset.customMapType = 'true';
  wrapper.style.margin = '10px 10px 10px 0';
  wrapper.style.display = 'flex';
  wrapper.style.backgroundColor = '#fff';
  wrapper.style.borderRadius = '2px';
  wrapper.style.boxShadow = '0 1px 4px -1px rgba(0,0,0,.3)';
  wrapper.style.overflow = 'hidden';
  wrapper.style.fontFamily = 'Roboto, Arial, sans-serif';
  wrapper.style.fontSize = '13px';
  wrapper.style.userSelect = 'none';

  const makeButton = (label: string, typeIds: string[]) => {
    const btn = document.createElement('div');
    btn.textContent = label;
    btn.style.padding = '8px 12px';
    btn.style.cursor = 'pointer';
    btn.style.textAlign = 'center';
    btn.style.whiteSpace = 'nowrap';

    const setActive = () => {
      const isActive = typeIds.includes(map.getMapTypeId() || 'roadmap');
      btn.style.backgroundColor = isActive ? '#e8eaed' : '#fff';
      btn.style.color = isActive ? '#000' : '#666';
      btn.style.fontWeight = isActive ? '500' : '400';
    };

    btn.addEventListener('click', () => {
      map.setMapTypeId(typeIds[0]);
    });

    return { btn, setActive };
  };

  const roadmap = makeButton('Mapa', ['roadmap', 'terrain']);
  const satellite = makeButton('Satélite', ['satellite', 'hybrid']);

  const updateActive = () => {
    roadmap.setActive();
    satellite.setActive();
  };

  const listener = map.addListener('maptypeid_changed', updateActive);
  (wrapper as any).__mapTypeListener = listener;
  updateActive();

  wrapper.appendChild(roadmap.btn);
  wrapper.appendChild(satellite.btn);

  return wrapper;
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
      zoomControlOptions: {
        position: google.maps?.ControlPosition?.RIGHT_BOTTOM || 7,
      },
      streetViewControl: true,
      streetViewControlOptions: {
        position: google.maps?.ControlPosition?.RIGHT_BOTTOM || 7,
      },
      disableDefaultUI: true,
      clickableIcons: false,
    };
  }, []);

  const handleLoad = useCallback(
    (map: google.maps.Map) => {
      // Esperar a 'idle': recién ahí existen los controles nativos, así el
      // nuestro se agrega al final y queda debajo del stickman y del zoom
      google.maps.event.addListenerOnce(map, 'idle', () => {
        const controls = map.controls[google.maps.ControlPosition.RIGHT_BOTTOM];

        // onLoad puede dispararse más de una vez: limpiar el control anterior
        const existing = controls.getArray() as HTMLElement[];
        for (let i = existing.length - 1; i >= 0; i--) {
          if (existing[i]?.dataset?.customMapType === 'true') {
            const listener = (existing[i] as any).__mapTypeListener;
            if (listener) google.maps.event.removeListener(listener);
            controls.removeAt(i);
          }
        }

        controls.push(createMapTypeControl(map));
      });

      onLoad(map);
    },
    [onLoad],
  );

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
        onUnmount={onUnmount}
        options={mapOptions}
      >
        {children}
      </GoogleMap>
    </div>
  );
});

export default GoogleMapComponent;
