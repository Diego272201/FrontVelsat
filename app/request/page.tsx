'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';

interface LatLng {
  lat: number;
  lng: number;
}

export default function RequestPage() {

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
  });

  const containerStyle = {
    width: '100%',
    height: '100vh'
  };
  
  const center: LatLng = {
    lat: -12.046591525826495,
    lng: -77.04689047482863
  };

  const centertwo: LatLng = {
    lat: -12.017693333333334,
    lng: -77.10883555555556
  };

  const centerthree: LatLng = {
    lat: -12.034903,
    lng: -77.027438
  };

  const centerfour: LatLng = {
    lat: -12.023026666666668,
    lng: -77.10560000000001
  };

  const centerfive: LatLng = {
    lat: -12.048074444444444,
    lng: -77.09848888888888
  };

  const centersix: LatLng = {
    lat: -12.054253333333332,
    lng: -77.09829333333333
  };

  const centerseven: LatLng = {
    lat: -12.054056666666666,
    lng: -77.0988
  };

  const centereight: LatLng = {
    lat: -12.052733333333332,
    lng: -77.09274666666667
  };

  const centernine: LatLng = {
    lat:-12.051955555555557,
    lng:-77.08822222222221
  };

  const directionsService = useRef<google.maps.DirectionsService | null>(null);
  const directionsRenderer = useRef<google.maps.DirectionsRenderer | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const onLoad = useCallback((map:any) => {
    setMap(map);

    directionsService.current = new window.google.maps.DirectionsService();
    directionsRenderer.current = new window.google.maps.DirectionsRenderer({
      map: map,
    });
  }, []);

  const onUnmount = useCallback(() => {
    if (directionsRenderer.current) {
      directionsRenderer.current.setMap(null);
      directionsRenderer.current = null;
    }
    directionsService.current = null;
    setMap(null);
  }, []);

  
  useEffect(() => {
    if (map && directionsService.current && directionsRenderer.current) {
      directionsService.current.route({
        origin: center,
        destination: centernine, 
        waypoints: [
          { location: centertwo, stopover: true },
          { location: centerthree, stopover: true },
          { location: centerfour, stopover: true },
          { location: centerfive, stopover: true },
          { location: centersix, stopover: true },
          { location: centerseven, stopover: true },
          { location: centereight, stopover: true }
        ], 
        travelMode: google.maps.TravelMode.DRIVING
      }).then((response) => {
        directionsRenderer.current!.setDirections(response);
      }).catch((e) => window.alert("Directions request failed due to " + e));
    }
  }, [map, center, centertwo, centerthree, centerfour, centerfive, centersix, centerseven, centereight, centernine]);

  if (loadError) return <div>Error loading map</div>;
  return isLoaded ? (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={12}
      onLoad={onLoad}
      onUnmount={onUnmount}
      options={{
        mapTypeControl: false,
        fullscreenControl: true,
        fullscreenControlOptions: {
          position: window.google.maps.ControlPosition.BOTTOM_RIGHT
        }
      }}
    />
  ) : <></>;
}
