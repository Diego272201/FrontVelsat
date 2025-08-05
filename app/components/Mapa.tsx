import { useEffect, useState } from 'react';
import { getMarkerSVG } from './ui/getMarkerSVG';
import Loader from './Loader';
import dynamic from 'next/dynamic';
import type { Map as LeafletMap } from 'leaflet';
import type * as L from 'leaflet';

// Importar Leaflet dinámicamente para evitar problemas de SSR
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(mod => mod.Polyline), { ssr: false });

interface MapaProps {
  recorrido: { lat: number; lng: number }[];
  marcadores: { lat: number; lng: number }[];
  centro?: { lat: number; lng: number } | null;
}

// Componente personalizado para marcador con SVG
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
        // Configurar iconos personalizados de Leaflet
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

  // Crear icono personalizado usando el SVG
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

const Mapa = ({ recorrido, marcadores, centro }: MapaProps) => {
  const [zoom, setZoom] = useState(10); // Reducido de 12 a 10
  const [isClient, setIsClient] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([-12.0464, -77.0428]);

  // Configurar Leaflet cuando se carga el cliente
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Actualizar centro cada vez que cambien centro, marcadores o recorrido
  useEffect(() => {
    if (centro) {
      setMapCenter([centro.lat, centro.lng]);
      setZoom(13); // Reducido de 15 a 13
    } else if (marcadores.length > 0) {
      setMapCenter([marcadores[0].lat, marcadores[0].lng]);
      setZoom(10); // Reducido de 12 a 10
    } else if (recorrido.length > 0) {
      setMapCenter([recorrido[0].lat, recorrido[0].lng]);
      setZoom(10);
    }
  }, [centro, marcadores, recorrido]); // Agregado recorrido a las dependencias

  // Convertir coordenadas del recorrido para Leaflet
  const polylineCoordinates: [number, number][] = recorrido.map((punto) => [
    punto.lat,
    punto.lng,
  ]);

  // Opciones para la polilínea (recorrido)
  const polylineOptions = {
    color: '#FF0000',
    opacity: 0.8,
    weight: 3,
  };

  return (
    <div className="flex h-[350px] w-full items-center justify-center p-2 border border-gray-300">
      {isClient ? (
        <div style={{ width: '100%', height: '100%' }}>
          <MapContainer
            center={mapCenter}
            zoom={zoom}
            style={{ width: '100%', height: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Dibuja el recorrido con una línea */}
            {recorrido.length > 1 && (
              <Polyline
                positions={polylineCoordinates}
                pathOptions={polylineOptions}
              />
            )}

            {/* Agrega los marcadores en los puntos */}
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
      
      {/* Estilos para importar Leaflet CSS */}
      <style jsx global>{`
        @import url('https://unpkg.com/leaflet@1.7.1/dist/leaflet.css');
      `}</style>
    </div>
  );
};

export default Mapa;