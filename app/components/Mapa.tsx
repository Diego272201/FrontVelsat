import { useEffect, useState } from 'react';
import { getMarkerSVG } from './ui/getMarkerSVG';
import Loader from './Loader';
import dynamic from 'next/dynamic';

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(mod => mod.Polyline), { ssr: false });

const MapControllerInner = dynamic(
  () => import('react-leaflet').then(mod => {
    const { useMap } = mod;
    
    function MapControllerComponent({ 
      centro,
      resetMap
    }: { 
      centro?: { lat: number; lng: number } | null;
      resetMap?: boolean;
    }) {
      const map = useMap();

      useEffect(() => {
        if (!map) return;

        if (resetMap) {
          console.log('🔄 Reseteando mapa a posición inicial');
          setTimeout(() => {
            map.setView([-12.0464, -77.0428], 10);
            map.invalidateSize();
          }, 200);
          return;
        }

        if (centro) {
          console.log('🎯 Centrando mapa en punto específico:', centro);
          setTimeout(() => {
            map.setView([centro.lat, centro.lng], 14);
          }, 100);
        }
      }, [centro, map, resetMap]);

      useEffect(() => {
        if (map) {
          setTimeout(() => {
            map.invalidateSize();
          }, 100);
        }
      }, [map]);

      return null;
    }

    return MapControllerComponent;
  }),
  { ssr: false }
);

interface MapaProps {
  recorrido: { lat: number; lng: number }[];
  marcadores: { lat: number; lng: number }[];
  centro?: { lat: number; lng: number } | null;
  resetMap?: boolean;
}

function MapController({ 
  centro,
  marcadores,
  recorrido,
  resetMap
}: { 
  centro?: { lat: number; lng: number } | null;
  marcadores?: { lat: number; lng: number }[];
  recorrido?: { lat: number; lng: number }[];
  resetMap?: boolean;
}) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;
  
  return (
    <MapControllerInner 
      centro={centro}
      resetMap={resetMap}
    />
  );
}

function CustomMarker({ 
  punto, 
  index, 
  getMarkerSVG 
}: {
  punto: { lat: number; lng: number };
  index: number;
  getMarkerSVG: (index: number) => string;
}) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && typeof window !== 'undefined') {
      import('leaflet').then((L) => {
        const DefaultIcon = L.Icon.Default;
        const iconPrototype = DefaultIcon.prototype as { _getIconUrl?: () => void };
        delete iconPrototype._getIconUrl;
        
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });
      });
    }
  }, [isClient]);

  if (!isClient) return null;

  const createCustomIcon = () => {
    const markerSvg = getMarkerSVG(index + 1);
    
    if (typeof window !== 'undefined') {
      const L = require('leaflet');
      return new L.Icon({
        iconUrl: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(markerSvg),
        iconSize: [40, 50],
        iconAnchor: [20, 45],
        popupAnchor: [0, -45],
      });
    }
    return undefined;
  };

  const customIcon = createCustomIcon();

  return (
    <Marker
      position={[punto.lat, punto.lng]}
      icon={customIcon}
    />
  );
}

const Mapa = ({ recorrido, marcadores, centro, resetMap }: MapaProps) => {
  const [isClient, setIsClient] = useState(false);
  const [mapKey, setMapKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const initialCenter: [number, number] = [-12.0464, -77.0428];
  const initialZoom = 10;

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (resetMap) {
      console.log('🔄 Forzando re-render del mapa');
      setMapKey(prev => prev + 1);
    }
  }, [resetMap]);

  // Manejo del fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    const mapContainer = document.getElementById('map-container');
    if (!mapContainer) return;

    try {
      if (!document.fullscreenElement) {
        await mapContainer.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
      
      // Invalidar el tamaño del mapa después del cambio
      setTimeout(() => {
        setMapKey(prev => prev + 1);
      }, 300);
    } catch (error) {
      console.error('Error al cambiar modo fullscreen:', error);
    }
  };

  const polylineCoordinates: [number, number][] = recorrido.map((punto) => [
    punto.lat,
    punto.lng,
  ]);

  const polylineOptions = {
    color: '#FF0000',
    opacity: 0.8,
    weight: 3,
  };

  return (
    <div 
      id="map-container"
      className={`relative flex items-center justify-center p-2 border border-gray-300 ${
        isFullscreen ? 'w-screen h-screen' : 'h-[350px] w-full'
      }`}
      style={{
        backgroundColor: isFullscreen ? '#000' : 'transparent'
      }}
    >
      {/* Botón de fullscreen */}
      <button
        onClick={toggleFullscreen}
        className="absolute top-4 right-4 z-[1000] bg-white hover:bg-gray-100 border border-gray-300 rounded-md p-2 shadow-lg transition-colors duration-200"
        title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
      >
        {isFullscreen ? (
          // Icono para salir de fullscreen
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 0 2-2h3M3 16h3a2 2 0 0 0 2 2v3"/>
          </svg>
        ) : (
          // Icono para entrar en fullscreen
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
          </svg>
        )}
      </button>

      {isClient ? (
        <div style={{ width: '100%', height: '100%' }}>
          <MapContainer
            key={mapKey}
            center={initialCenter}
            zoom={initialZoom}
            style={{ width: '100%', height: '100%' }}
          >
            <MapController 
              centro={centro}
              marcadores={marcadores}
              recorrido={recorrido}
              resetMap={resetMap}
            />

            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {recorrido.length > 1 && (
              <Polyline
                positions={polylineCoordinates}
                pathOptions={polylineOptions}
              />
            )}

            {marcadores.map((punto, index) => (
              <CustomMarker
                key={index}
                punto={punto}
                index={index}
                getMarkerSVG={getMarkerSVG}
              />
            ))}
          </MapContainer>
        </div>
      ) : (
        <div>
          <Loader />
        </div>
      )}
      
      <style jsx global>{`
        @import url('https://unpkg.com/leaflet@1.7.1/dist/leaflet.css');
        
        /* Estilos para el modo fullscreen */
        #map-container:fullscreen {
          background: #000;
        }
        
        #map-container:fullscreen .leaflet-container {
          background: #fff;
        }
      `}</style>
    </div>
  );
};

export default Mapa;