import { useEffect, useState } from 'react';
import { getMarkerSVG } from './ui/getMarkerSVG';
import Loader from './Loader';
import dynamic from 'next/dynamic';
import { X } from 'lucide-react';

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
          setTimeout(() => {
            map.setView([-12.0464, -77.0428], 10);
            map.invalidateSize();
          }, 200);
          return;
        }

        if (centro) {
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
  getMarkerSVG,
  onMarkerClick
}: {
  punto: { lat: number; lng: number };
  index: number;
  getMarkerSVG: (index: number) => string;
  onMarkerClick: (punto: { lat: number; lng: number }, index: number) => void;
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
      eventHandlers={{
        click: () => onMarkerClick(punto, index)
      }}
    />
  );
}

const Mapa = ({ recorrido, marcadores, centro, resetMap }: MapaProps) => {
  const [isClient, setIsClient] = useState(false);
  const [mapKey, setMapKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isStreetViewOpen, setIsStreetViewOpen] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<{ punto: { lat: number; lng: number }; index: number } | null>(null);
  
  const initialCenter: [number, number] = [-12.0464, -77.0428];
  const initialZoom = 10;

  // ✅ API Key desde variables de entorno
  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY_K;

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (resetMap) {
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

  // ✅ Funciones para Street View
  const getStreetViewEmbedUrl = (lat: number, lng: number) => {
    if (!GOOGLE_MAPS_API_KEY) {
      console.error('❌ API Key de Google Maps no disponible');
      return '';
    }
    return `https://www.google.com/maps/embed/v1/streetview?location=${lat},${lng}&heading=0&pitch=0&fov=90&key=${GOOGLE_MAPS_API_KEY}`;
  };

  // ✅ Manejar click en marcador
  const handleMarkerClick = (punto: { lat: number; lng: number }, index: number) => {
    setSelectedMarker({ punto, index });
    setIsStreetViewOpen(true);
  };

  // ✅ Cerrar Street View
  const closeStreetView = () => {
    setIsStreetViewOpen(false);
    setSelectedMarker(null);
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
            attributionControl={false}
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
                onMarkerClick={handleMarkerClick}
              />
            ))}
          </MapContainer>
        </div>
      ) : (
        <div>
          <Loader />
        </div>
      )}

      {/* ✅ Panel de Street View para marcadores estáticos */}
      {selectedMarker && isStreetViewOpen && (
        <div
          style={{
            position: 'absolute',
            bottom: '2%',
            left: '2%',
            width: '35%',
            height: '55%',
            backgroundColor: 'white',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            zIndex: 1000,
            border: '2px solid #e0e0e0',
            borderRadius: '8px',
            fontFamily: 'Segoe UI, sans-serif',
            overflow: 'hidden',
          }}
        >
          {/* Header del panel */}
          <div
            style={{
              padding: '0px 12px',
              borderBottom: '1px solid #e0e0e0',
              backgroundColor: '#fff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              minHeight: '25px',
            }}
          >
            <h3
              style={{
                margin: '0',
                color: '#333',
                fontSize: '13px',
                fontWeight: 'bold',
              }}
            >
              Marcador {selectedMarker.index + 1}
            </h3>
            <button
              onClick={closeStreetView}
              style={{
                width: '18px',
                height: '18px',
                border: 'none',
                backgroundColor: '#ff4757',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
                fontWeight: 'bold',
              }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Contenido del Street View */}
          <div
            style={{
              position: 'relative',
              height: 'calc(100% - 25px)',
            }}
          >
            {GOOGLE_MAPS_API_KEY ? (
              <iframe
                src={getStreetViewEmbedUrl(
                  selectedMarker.punto.lat,
                  selectedMarker.punto.lng
                )}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={`Street View - Marcador ${selectedMarker.index + 1}`}
              />
            ) : (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '100%',
                  backgroundColor: '#f5f5f5',
                  color: '#666',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <p>Street View no disponible</p>
                <p style={{ fontSize: '12px' }}>API Key de Google Maps faltante</p>
                <div style={{ fontSize: '11px', color: '#999' }}>
                  <p>Lat: {selectedMarker.punto.lat.toFixed(6)}</p>
                  <p>Lng: {selectedMarker.punto.lng.toFixed(6)}</p>
                </div>
              </div>
            )}
          </div>
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

        /* Responsividad para pantallas pequeñas */
        @media (max-width: 768px) {
          div[style*="position: absolute"][style*="bottom: 2%"] {
            width: 90% !important;
            height: 50% !important;
            left: 5% !important;
            bottom: 5% !important;
          }
        }

        /* Mejoras visuales para el panel Street View */
        div[style*="position: absolute"][style*="bottom: 2%"] {
          backdrop-filter: blur(10px);
          background: rgba(255, 255, 255, 0.95) !important;
        }

        /* Hacer más pequeños los controles del Street View */
        div[style*="position: absolute"][style*="bottom: 2%"] iframe {
          transform: scale(0.85);
          transform-origin: top left;
          width: 117.6%;
          height: 117.6%;
        }

        /* Cursor pointer para marcadores */
        .leaflet-marker-icon {
          cursor: pointer !important;
        }

        /* Animación suave para el panel */
        div[style*="position: absolute"][style*="bottom: 2%"] {
          animation: slideInUp 0.3s ease-out;
        }

        @keyframes slideInUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default Mapa;