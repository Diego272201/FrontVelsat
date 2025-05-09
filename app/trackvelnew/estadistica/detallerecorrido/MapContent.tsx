'use client';
import React, { useState, useCallback, useEffect } from 'react';
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  InfoWindow,
  Polyline,
} from '@react-google-maps/api';
import axios from 'axios';
import '@/app/styles/markers.css';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Toaster, toast } from 'sonner';
import { useApi } from '@/context/ApiContext';
import Loader from '@/app/components/Loader';

interface UnidadDetalleRecorrido {
  longitude: number;
  latitude: number;
  date: string;
  time: string;
  speed: number;
}

const libraries: ("places")[] = ['places'];

const MapContent = () => {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const { baseUrl } = useApi();

  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const deviceId = searchParams.get('deviceId');
  const username = session?.user.username;

  const detailRecorrido = `${baseUrl}/api/Reporting/details/${startDate}/${endDate}/${deviceId}/${username}`;

  const [mapCenter, setMapCenter] = useState({
    lat: -12.046591525826495,
    lng: -77.04689047482863,
  });
  const [markersData, setMarkersData] = useState<UnidadDetalleRecorrido[]>([]);
  const [selectedMarker, setSelectedMarker] =
    useState<UnidadDetalleRecorrido | null>(null);
  const [map, setMap] = useState(null);

  const [isMarkersLoaded, setIsMarkersLoaded] = useState(false);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
    libraries // ← importante
  });

  const fetchData = useCallback(async () => {
    try {
      const response = await axios.get(detailRecorrido);
      if (response.data.result.length === 0) {
        toast.error('No hay registros para estas fechas', {
          className: 'toast-slide-in',
          richColors: true,
          duration: Infinity,
        });
      } else {
        setMarkersData(response.data.result);
        setIsMarkersLoaded(true);
        setMapCenter({
          lat: response.data.result[0].latitude,
          lng: response.data.result[0].longitude,
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }, [detailRecorrido]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onLoad = useCallback(function callback(map: any) {
    setMap(map);
  }, []);

  const onUnmount = useCallback(function callback(map: any) {
    setMap(null);
  }, []);

  const handleMarkerClick = (markerData: UnidadDetalleRecorrido) => {
    setSelectedMarker(markerData);
  };

  const handleCloseInfoWindow = () => {
    setSelectedMarker(null);
  };

  const getMarkerIcon = (speed: number) => {
    if (speed === 0) {
      return '/gps.png';
    } else if (speed > 0 && speed < 11) {
      return '/gpsyellow.png';
    } else if (speed >= 11 && speed < 60) {
      return '/gpsgreen.png';
    } else {
      return '/gpsblue.png';
    }
    
  };

  const mapStyles = [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }],
    },
    {
      featureType: 'transit.station.bus',
      elementType: 'labels.icon',
      stylers: [{ visibility: 'off' }],
    },
    {
      featureType: 'transit.station.rail',
      elementType: 'labels.icon',
      stylers: [{ visibility: 'off' }],
    },
  ];

  const polylineCoordinates = markersData.map((markerData) => ({
    lat: markerData.latitude,
    lng: markerData.longitude,
  }));

  return (
    <>
      {!isLoaded || !isMarkersLoaded ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
          }}
        >
          <Loader />
        </div>
      ) : (
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100vh' }}
          center={mapCenter}
          zoom={12}
          onLoad={onLoad}
          onUnmount={onUnmount}
          options={{
            mapTypeControl: false,
            fullscreenControl: false,
            styles: mapStyles,
          }}
        >
          {markersData.map((markerData, index) => (
            <Marker
              key={index}
              position={{ lat: markerData.latitude, lng: markerData.longitude }}
              onClick={() => handleMarkerClick(markerData)}
              icon={{
                url: getMarkerIcon(markerData.speed),
                scaledSize: new window.google.maps.Size(40, 40),
              }}
              label={{
                className: 'markerlabel',
                text: (index + 1).toString(),
                color: '#252424',
                fontSize: '11px',
                fontWeight: 'bold',
                fontFamily: 'Segoe UI',
              }}
            >
              {selectedMarker === markerData && (
                <InfoWindow onCloseClick={handleCloseInfoWindow}>
                  <div className="infoDetalleR">
                    <p>Fecha: {markerData.date}</p>
                    <p>Hora: {markerData.time}</p>
                    <p>Velocidad: {markerData.speed.toFixed(2)} Km/H</p>
                  </div>
                </InfoWindow>
              )}
            </Marker>
          ))}

          <Polyline
            path={polylineCoordinates}
            options={{
              strokeColor: '#003049',
              strokeOpacity: 0,
              strokeWeight: 0.5,
              icons: [
                {
                  icon: {
                    path: 'M 0,-1 0,1',
                    strokeOpacity: 1,
                    scale: 3,
                  },
                  offset: '0',
                  repeat: '20px',
                },
              ],
            }}
          />
        </GoogleMap>
      )}
    </>
  );
};

export default MapContent;
