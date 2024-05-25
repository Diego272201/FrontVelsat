'use client';
import React from 'react'
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import { useRouter } from 'next/router';

export default function SeguirUnidad() {

    const containerStyle = {
        width: '100%',
        height: '100vh'
      };
      
      const center = {
        lat: -12.046591525826495,
        lng: -77.04689047482863
      };

   const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string
  })

  const [map, setMap] = React.useState(null)

  const onLoad = React.useCallback(function callback(map:any) {
    setMap(map)
  }, [])

  const onUnmount = React.useCallback(function callback(map:any) {
    setMap(null)
  }, [])

  return isLoaded ? (
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={12}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          mapTypeControl:false,
          fullscreenControl: true,
          fullscreenControlOptions: {
            position: google.maps.ControlPosition.BOTTOM_RIGHT
          }
        }}
      >
        { /* Child components, such as markers, info windows, etc. */ }
        <></>
      </GoogleMap>
  ) : <></>
}