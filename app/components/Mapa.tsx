import {
  GoogleMap,
  Marker,
  Polyline,
  useLoadScript,
} from '@react-google-maps/api';
import { useEffect, useState } from 'react';
import { getMarkerSVG } from './ui/getMarkerSVG';
import Loader from './Loader';
interface MapaProps {
  recorrido: { lat: number; lng: number }[];
  marcadores: { lat: number; lng: number }[];
  centro?: { lat: number; lng: number } | null;
}

const Mapa = ({ recorrido, marcadores, centro }: MapaProps) => {
  const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string;
  const [zoom, setZoom] = useState(12);
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: API_KEY,
  });
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(
    marcadores.length > 0 ? marcadores[0] : { lat: -12.0464, lng: -77.0428 },
  );

  useEffect(() => {
    if (centro) {
      setMapCenter(centro);
      setZoom(15);
    } else if (marcadores.length > 0) {
      setMapCenter(marcadores[0]);
      setZoom(12);
    }
  }, [centro, marcadores]);

  return (
    <div className="flex h-[350px] w-full items-center justify-center p-2  border border-gray-300">
      {isLoaded ? (
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={mapCenter}
          zoom={zoom}
        >
          {/* Dibuja el recorrido con una línea */}
          {recorrido.length > 1 && (
            <Polyline
              path={recorrido}
              options={{
                strokeColor: '#FF0000',
                strokeOpacity: 0.8,
                strokeWeight: 3,
              }}
            />
          )}

          {/* Agrega los marcadores en los puntos */}
          {marcadores.map((punto, index) => {
            const markerSvg = getMarkerSVG(index + 1);
            return (
              <Marker
                key={index}
                position={punto}
                icon={{
                  url:
                    'data:image/svg+xml;charset=UTF-8,' +
                    encodeURIComponent(markerSvg),
                  scaledSize: new window.google.maps.Size(40, 50),
                  anchor: new window.google.maps.Point(20, 45),
                }}
              />
            );
          })}
        </GoogleMap>
      ) : (
        <div>
          <Loader></Loader>
        </div>
      )}
    </div>
  );
};

export default Mapa;
