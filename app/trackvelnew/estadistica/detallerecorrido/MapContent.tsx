'use client';
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import axios from 'axios';
import '@/app/styles/markers.css';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Toaster, toast } from 'sonner';
import { useApi } from '@/context/ApiContext';
import Loader from '@/app/components/Loader';
import L from 'leaflet';

// Importar componentes de Leaflet dinámicamente para evitar problemas de SSR
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(mod => mod.Polyline), { ssr: false });
const ZoomControl = dynamic(() => import('react-leaflet').then(mod => mod.ZoomControl), { ssr: false });

interface UnidadDetalleRecorrido {
  longitude: number;
  latitude: number;
  date: string;
  time: string;
  speed: number;
}

// Componente para manejar el centro del mapa
const MapController = ({ center, markers }: { center: [number, number], markers: UnidadDetalleRecorrido[] }) => {
  const { useMap } = require('react-leaflet');
  const map = useMap();
  
  useEffect(() => {
    if (markers.length > 0) {
      // Ajustar la vista para mostrar todos los marcadores
      const bounds = L.latLngBounds(markers.map(m => [m.latitude, m.longitude]));
      map.fitBounds(bounds, { padding: [20, 20] });
    } else {
      map.setView(center, 12);
    }
  }, [map, center, markers]);

  return null;
};

// Componente Sidebar separado para evitar que se oculte
const FixedSidebar = ({ unidad, fechaIni, fechaFin }: { unidad: string, fechaIni: string, fechaFin: string }) => {
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed-legend-sidebar">
      <div className="sidebar-header">
        <span>📍 LEYENDA</span>
      </div>
      
      <div className="sidebar-content">
        <div className="sidebar-section">
          <div className="sidebar-section-title">UNIDAD</div>
          <div className="sidebar-unit-info">{unidad}</div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-title">RANGO FECHAS</div>
          <div className="sidebar-date-range">
            {formatDate(fechaIni)} - {formatDate(fechaFin)}
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-title">RANGO VELOCIDAD</div>
          <div className="legend-item">
            <div className="legend-color red"></div>
            <span>0 km/h</span>
          </div>
          <div className="legend-item">
            <div className="legend-color yellow"></div>
            <span>1 - 10 km/h</span>
          </div>
          <div className="legend-item">
            <div className="legend-color green"></div>
            <span>11 - 59 km/h</span>
          </div>
          <div className="legend-item">
            <div className="legend-color blue"></div>
            <span> 60 km/h</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const MapContent = () => {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const { baseUrl } = useApi();

  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const deviceId = searchParams.get('deviceId');
  const username = session?.user.username;

  const detailRecorrido = `${baseUrl}/api/Reporting/details/${startDate}/${endDate}/${deviceId}/${username}`;

  const [mapCenter, setMapCenter] = useState<[number, number]>([-12.046591525826495, -77.04689047482863]);
  const [markersData, setMarkersData] = useState<UnidadDetalleRecorrido[]>([]);
  const [isMarkersLoaded, setIsMarkersLoaded] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Función para obtener el icono del marcador según la velocidad
  const getMarkerIcon = useCallback((speed: number, index: number) => {
    let iconUrl = '/gps.png';
    
    if (speed === 0) {
      iconUrl = '/gps.png';
    } else if (speed > 0 && speed < 11) {
      iconUrl = '/gpsyellow.png';
    } else if (speed >= 11 && speed < 60) {
      iconUrl = '/gpsgreen.png';
    } else {
      iconUrl = '/gpsblue.png';
    }

    return L.divIcon({
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center;">
          <img src="${iconUrl}" style="width: 40px; height: 40px;" />
          <span style="
            position: absolute; 
            top: 50%; 
            left: 50%; 
            transform: translate(-50%, -50%); 
            color: #252424; 
            font-size: 11px; 
            font-weight: bold; 
            font-family: 'Segoe UI', sans-serif;
            text-shadow: 1px 1px 1px rgba(255,255,255,0.8);
          ">${index + 1}</span>
        </div>
      `,
      className: 'custom-marker-icon',
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40]
    });
  }, []);

  // Coordenadas para la polilínea
  const polylineCoordinates = useMemo(() => {
    return markersData.map((markerData) => [markerData.latitude, markerData.longitude] as [number, number]);
  }, [markersData]);

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
        setMapCenter([response.data.result[0].latitude, response.data.result[0].longitude]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }, [detailRecorrido]);

  useEffect(() => {
    setIsClient(true);
    fetchData();
  }, [fetchData]);

  // Opciones para la polilínea con patrón de línea discontinua
  const polylineOptions = {
    color: '#003049',
    weight: 3,
    opacity: 0.8,
    dashArray: '10, 10',
  };

  if (!isClient || !isMarkersLoaded) {
    return (
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
    );
  }

  return (
    <>
      {/* Contenedor principal con layout flex */}
      <div className="map-layout-container">
        {/* Sidebar fijo */}
        <FixedSidebar 
          unidad={deviceId ?? ''} 
          fechaIni={startDate ?? ''} 
          fechaFin={endDate ?? ''} 
        />
        
        {/* Contenedor del mapa */}
        <div className="map-container">
          <MapContainer
            center={mapCenter}
            zoom={12}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />
            
            {/* Control de zoom personalizado en la esquina inferior derecha */}
            <ZoomControl position="bottomright" />
            
            <MapController center={mapCenter} markers={markersData} />

            {markersData.map((markerData, index) => (
              <Marker
                key={`marker-${index}`}
                position={[markerData.latitude, markerData.longitude]}
                icon={getMarkerIcon(markerData.speed, index)}
              >
                <Popup>
                  <div className="infoDetalleR">
                    <p><strong>Fecha:</strong> {markerData.date}</p>
                    <p><strong>Hora:</strong> {markerData.time}</p>
                    <p><strong>Velocidad:</strong> {markerData.speed.toFixed(2)} Km/H</p>
                  </div>
                </Popup>
              </Marker>
            ))}

            {polylineCoordinates.length > 1 && (
              <Polyline
                positions={polylineCoordinates}
                pathOptions={polylineOptions}
              />
            )}
          </MapContainer>
        </div>
      </div>
      
      <Toaster />
      
      <style jsx global>{`
        /* Layout principal */
        .map-layout-container {
          display: flex;
          height: 100vh;
          width: 100%;
          position: relative;
        }

        /* Sidebar fijo completamente independiente del mapa */
        .fixed-legend-sidebar {
          position: fixed;
          top: 20px;
          left: 20px;
          width: 240px;
          background: #ffffff;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 999999 !important; /* Z-index muy alto */
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          font-size: 12px;
          overflow: hidden;
          border: 1px solid #e0e0e0;
          max-height: calc(100vh - 40px);
          overflow-y: auto;
          pointer-events: auto !important; /* Asegurar que reciba eventos */
        }

        /* Contenedor del mapa */
        .map-container {
          width: 100%;
          height: 100vh;
          position: relative;
        }

        /* Header del sidebar */
        .sidebar-header {
          background: #2563eb;
          color: white;
          padding: 12px 16px;
          font-weight: bold;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        /* Contenido del sidebar */
        .sidebar-content {
          padding: 16px;
        }

        .sidebar-section {
          margin-bottom: 20px;
        }

        .sidebar-section:last-child {
          margin-bottom: 0;
        }

        .sidebar-section-title {
          font-weight: bold;
          margin-bottom: 8px;
          color: #333;
          font-size: 13px;
        }

        .sidebar-unit-info {
          background: #f8f9fa;
          padding: 8px 12px;
          border-radius: 4px;
          margin-bottom: 12px;
          border-left: 4px solid #2563eb;
          font-weight: 600;
        }

        .sidebar-date-range {
          background: #f1f5f9;
          padding: 8px 12px;
          border-radius: 4px;
          font-size: 11px;
          color: #475569;
          line-height: 1.4;
        }

        .legend-item {
          display: flex;
          align-items: center;
          margin-bottom: 8px;
          font-size: 12px;
        }

        .legend-color {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          margin-right: 8px;
          border: 2px solid #fff;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
          flex-shrink: 0;
        }

        .legend-color.red {
          background-color: #dc2626;
        }

        .legend-color.yellow {
          background-color: #fbbf24;
        }

        .legend-color.green {
          background-color: #10b981;
        }

        .legend-color.blue {
          background-color: #3b82f6;
        }

        /* Estilos para el mapa */
        .custom-marker-icon {
          background: transparent !important;
          border: none !important;
        }
        
        .leaflet-popup-content-wrapper {
          border-radius: 8px;
        }
        
        .leaflet-popup-content {
          margin: 8px 12px;
          line-height: 1.4;
        }
        
        .infoDetalleR {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          font-size: 12px;
        }
        
        .infoDetalleR p {
          margin: 4px 0;
        }
        
        /* Estilos para los controles del mapa - posicionados abajo a la derecha */
        .leaflet-control-zoom {
          border: none !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15) !important;
          border-radius: 8px !important;
        }
        
        .leaflet-control-zoom a {
          background-color: white !important;
          color: #333 !important;
          border: none !important;
          width: 40px !important;
          height: 40px !important;
          line-height: 40px !important;
          font-size: 18px !important;
          font-weight: bold !important;
          border-radius: 0 !important;
          transition: all 0.2s ease !important;
        }
        
        .leaflet-control-zoom a:first-child {
          border-top-left-radius: 8px !important;
          border-top-right-radius: 8px !important;
        }
        
        .leaflet-control-zoom a:last-child {
          border-bottom-left-radius: 8px !important;
          border-bottom-right-radius: 8px !important;
          border-top: 1px solid #e0e0e0 !important;
        }
        
        .leaflet-control-zoom a:hover {
          background-color: #f8f9fa !important;
          color: #2563eb !important;
        }

        /* Posicionamiento específico para bottom-right */
        .leaflet-bottom.leaflet-right {
          bottom: 20px !important;
          right: 20px !important;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .fixed-legend-sidebar {
            width: 200px;
            font-size: 11px;
          }
          
          .sidebar-header {
            padding: 10px 12px;
            font-size: 12px;
          }
          
          .sidebar-content {
            padding: 12px;
          }
        }

        @media (max-width: 480px) {
          .fixed-legend-sidebar {
            width: calc(100vw - 40px);
            left: 20px;
            right: 20px;
          }
        }
      `}</style>
    </>
  );
};

export default MapContent;