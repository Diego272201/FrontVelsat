'use client';
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import L from 'leaflet';

// Importar componentes de Leaflet dinámicamente para evitar problemas de SSR
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });

interface MomentoProps {
  latitude: number;
  longitude: number;
  deviceId: string;
  direccion: string;
}

const containerStyle = {
  width: '100%',
  height: '100vh',
};

export default function Momento({
  latitude,
  longitude,
  deviceId,
  direccion,
}: MomentoProps) {
  const [isClient, setIsClient] = useState(false);
  const markerRef = React.useRef<L.Marker>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Abrir popup cuando el marcador esté listo
  useEffect(() => {
    if (markerRef.current && isClient) {
      const timer = setTimeout(() => {
        markerRef.current?.openPopup();
      }, 500); // Aumenté el delay a 500ms para mayor confiabilidad
      
      return () => clearTimeout(timer);
    }
  }, [isClient, latitude, longitude]); // Agregué dependencias para que se ejecute cuando cambien las coordenadas

  const center: [number, number] = [latitude, longitude];

  // Crear icono personalizado
  const customIcon = L.icon({
    iconUrl: '/UnidadK.webp',
    iconSize: [50, 30],
    iconAnchor: [25, 15],
    popupAnchor: [0, -15],
  });

  // Componente para abrir el popup automáticamente
  const AutoOpenPopup = () => {
    const { useMap } = require('react-leaflet');
    const map = useMap();

    useEffect(() => {
      const timer = setTimeout(() => {
        map.eachLayer((layer: any) => {
          if (layer instanceof L.Marker) {
            layer.openPopup();
          }
        });
      }, 300);

      return () => clearTimeout(timer);
    }, [map]);

    return null;
  };

  if (!isClient) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontFamily: 'Segoe UI, sans-serif'
      }}>
        <p>Cargando mapa...</p>
      </div>
    );
  }

  return (
    <>
      <div style={containerStyle}>
        <MapContainer
          center={center}
          zoom={18}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
          
          <Marker 
            position={center} 
            icon={customIcon}
            ref={markerRef}
          >
            <Popup 
              closeButton={true}
              autoClose={false}
              closeOnClick={false}
              className="custom-popup"
              autoPan={false}
            >
              <div className="popup-content">
                <p className="popup-title">
                  Unidad: {deviceId.toUpperCase()}
                </p>
                <p className="popup-address" title={direccion}>
                  Dirección: {direccion}
                </p>
              </div>
            </Popup>
          </Marker>

          <AutoOpenPopup />
        </MapContainer>
      </div>

      <style jsx global>{`
        /* Estilos para el popup personalizado */
        .custom-popup .leaflet-popup-content-wrapper {
          padding: 0;
          border-radius: 8px;
          background-color: #ffffff;
          box-shadow: 0 3px 14px rgba(0,0,0,0.4);
        }

        .custom-popup .leaflet-popup-content {
          margin: 0;
          padding: 10px;
          min-width: 200px;
          max-width: 350px;
          font-family: 'Segoe UI', sans-serif;
          font-size: 14px;
          color: #333;
          line-height: 1.4;
          word-wrap: break-word;
        }

        .popup-content {
          padding: 0;
        }

        .popup-title {
          margin: 0 0 8px 0;
          font-weight: bold;
          color: #003049;
        }

        .popup-address {
          margin: 0;
          color: #333;
          word-wrap: break-word;
          overflow-wrap: break-word;
          hyphens: auto;
          max-width: 100%;
        }

        /* Ocultar la punta del popup para simular el comportamiento de Google Maps */
        .custom-popup .leaflet-popup-tip {
          display: none;
        }

        /* Estilos para el botón de cerrar del popup */
        .custom-popup .leaflet-popup-close-button {
          position: absolute;
          top: 8px;
          right: 8px;
          padding: 4px 8px;
          margin: 0;
          color: #666 !important;
          font-size: 16px !important;
          font-weight: bold !important;
          background: none !important;
          border: none !important;
          cursor: pointer !important;
          line-height: 1 !important;
          text-decoration: none !important;
          z-index: 1000;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .custom-popup .leaflet-popup-close-button:hover {
          background-color: #f0f0f0 !important;
          color: #333 !important;
        }

        /* Estilos adicionales para el mapa */
        .leaflet-container {
          font-family: 'Segoe UI', sans-serif;
        }

        /* Controles de zoom */
        .leaflet-control-zoom {
          border: none !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15) !important;
          border-radius: 8px !important;
        }
        
        .leaflet-control-zoom a {
          background-color: white !important;
          color: #333 !important;
          border: none !important;
          width: 30px !important;
          height: 30px !important;
          line-height: 30px !important;
          font-size: 16px !important;
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
          color: #003049 !important;
        }
      `}</style>
    </>
  );
}