'use client';
import React, { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import '@/app/styles/markers.css';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { useApi } from '@/context/ApiContext';
import Loader from '@/app/components/Loader';
import Leyenda from '@/app/components/Leyenda';
import LeyendaPasajeros from '@/app/components/LeyendaPasajeros';
import dynamic from 'next/dynamic';
import type { Map as LeafletMap } from 'leaflet';

// Importar Leaflet dinámicamente para evitar problemas de SSR
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(mod => mod.Polyline), { ssr: false });

interface UnidadDetalleRecorrido {
  longitude: number;
  latitude: number;
  date: string;
  time: string;
  speed: number;
}

// Componente personalizado para el marcador con popup
function CustomMarker({ 
  markerData, 
  index, 
  selectedMarker, 
  setSelectedMarker, 
  getMarkerIcon 
}: {
  markerData: UnidadDetalleRecorrido;
  index: number;
  selectedMarker: UnidadDetalleRecorrido | null;
  setSelectedMarker: (marker: UnidadDetalleRecorrido | null) => void;
  getMarkerIcon: (speed: number) => string;
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

  // Crear icono personalizado
  const createCustomIcon = () => {
    const iconUrl = getMarkerIcon(markerData.speed);
    
    if (typeof window !== 'undefined') {
      const L = require('leaflet');
      
      // Crear un div HTML con el icono y el número
      const markerHtml = `
        <div style="position: relative; width: 40px; height: 40px;">
          <img src="${iconUrl}" style="width: 40px; height: 40px;" />
          <div style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #252424;
            font-size: 11px;
            font-weight: bold;
            font-family: 'Segoe UI';
            text-shadow: 1px 1px 1px rgba(255,255,255,0.8);
          ">${index + 1}</div>
        </div>
      `;
      
      return new L.DivIcon({
        html: markerHtml,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20],
        className: 'custom-div-icon'
      });
    }
    return undefined;
  };

  const customIcon = createCustomIcon();

  return (
    <Marker
      position={[markerData.latitude, markerData.longitude]}
      icon={customIcon}
      eventHandlers={{
        click: () => {
          setSelectedMarker(markerData);
        },
      }}
    >
      {selectedMarker === markerData && (
        <Popup
          closeOnClick={false}
          autoClose={false}
          eventHandlers={{
            remove: () => setSelectedMarker(null),
          }}
        >
          <div className="infoDetalleR">
            <p>Fecha: {markerData.date}</p>
            <p>Hora: {markerData.time}</p>
            <p>Velocidad: {markerData.speed.toFixed(2)} Km/H</p>
          </div>
        </Popup>
      )}
    </Marker>
  );
}

const ReportServicios = () => {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const { baseUrl } = useApi();

  const startDate = searchParams.get('fechaini');
  const endDate = searchParams.get('fechafin');
  const deviceId = searchParams.get('unidad');
  const numero = searchParams.get('numero') || '';
  const tipo = searchParams.get('tipo') || '';
  const unidad = searchParams.get('unidad') || '';  
  const empresa = searchParams.get('empresa') || '';
  const fecha = searchParams.get('fechaoriginal') || '';
  const fechaIni = searchParams.get('fechaini') || '';
  const fechaFin = searchParams.get('fechafin') || '';
  const codigo = searchParams.get('codservicio') || '';

  const username = session?.user.username;

  const detailRecorrido = `${baseUrl}/api/Reporting/details/${startDate}/${endDate}/${deviceId}/${username}`;

  const [mapCenter, setMapCenter] = useState<[number, number]>([
    -12.046591525826495,
    -77.04689047482863,
  ]);
  const [markersData, setMarkersData] = useState<UnidadDetalleRecorrido[]>([]);
  const [selectedMarker, setSelectedMarker] =
    useState<UnidadDetalleRecorrido | null>(null);
  const [map, setMap] = useState<LeafletMap | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isMarkersLoaded, setIsMarkersLoaded] = useState(false);

  // Configurar Leaflet cuando se carga el cliente
  useEffect(() => {
    setIsClient(true);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      if (!startDate || !endDate) {
        toast.error('No hay fechas disponibles para el reporte', {
          className: 'toast-slide-in',
          richColors: true,
          duration: Infinity,
        });
        return;
      }

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
        setMapCenter([
          response.data.result[0].latitude,
          response.data.result[0].longitude,
        ]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }, [detailRecorrido]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const polylineCoordinates: [number, number][] = markersData.map((markerData) => [
    markerData.latitude,
    markerData.longitude,
  ]);

  // Opciones para la polilínea punteada
  const polylineOptions = {
    color: '#003049',
    weight: 3,
    opacity: 0.8,
    dashArray: '5, 10',
  };

  return (
    <>
      {!isClient || !isMarkersLoaded ? (
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
        <div style={{ width: '100%', height: '100vh' }}>
          <MapContainer
            center={mapCenter}
            zoom={12}
            style={{ width: '100%', height: '100%' }}
            ref={setMap}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Renderizar marcadores personalizados */}
            {markersData.map((markerData, index) => (
              <CustomMarker
                key={index}
                markerData={markerData}
                index={index}
                selectedMarker={selectedMarker}
                setSelectedMarker={setSelectedMarker}
                getMarkerIcon={getMarkerIcon}
              />
            ))}

            {/* Polilínea punteada para mostrar el recorrido */}
            {polylineCoordinates.length > 1 && (
              <Polyline
                positions={polylineCoordinates}
                pathOptions={polylineOptions}
              />
            )}
          </MapContainer>
        </div>
      )}

      <Leyenda 
        numero={numero} 
        tipo={tipo} 
        unidad={unidad} 
        empresa={empresa}  
        fecha={fecha} 
        fechaIni={fechaIni} 
        fechaFin={fechaFin}
      />

      <LeyendaPasajeros codigo={codigo} />
      
      {/* Estilos para iconos personalizados y Leaflet CSS */}
      <style jsx global>{`
        @import url('https://unpkg.com/leaflet@1.7.1/dist/leaflet.css');
        
        .custom-div-icon {
          background: transparent !important;
          border: none !important;
        }
        
        .custom-div-icon div {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
    </>
  );
};

export default ReportServicios;