'use client';
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import L from 'leaflet';
import { X, Maximize2, Map, MapPin } from 'lucide-react';

const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false },
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false },
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false },
);
const Popup = dynamic(() => import('react-leaflet').then((mod) => mod.Popup), {
  ssr: false,
});

interface MomentoProps {
  latitude: number;
  longitude: number;
  deviceId: string;
  direccion: string;
}

const containerStyle = {
  width: '100%',
  height: '100vh',
  position: 'relative' as const,
};

export default function Momento({
  latitude = -12.046374,
  longitude = -77.042793,
  deviceId = "VH001",
  direccion = "Plaza de Armas, Lima, Perú",
}: MomentoProps) {
  const [isClient, setIsClient] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const markerRef = React.useRef<L.Marker>(null);

  // API Key de Google Maps (reemplaza con tu propia API key)
  const GOOGLE_MAPS_API_KEY = "AIzaSyB69HY-OKCtBsbRsKuHns-7HJxjvSqpogg";

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (markerRef.current && isClient) {
      const timer = setTimeout(() => {
        markerRef.current?.openPopup();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [isClient, latitude, longitude]);

  const center: [number, number] = [latitude, longitude];

  const customIcon = L.icon({
    iconUrl: '/UnidadK.webp',
    iconSize: [50, 30],
    iconAnchor: [25, 15],
    popupAnchor: [0, -15],
  });

  const handleMarkerClick = () => {
    setIsPanelOpen(true);
  };

  const closePan = () => {
    setIsPanelOpen(false);
  };

  // Función para generar URL de Google Street View
  const getStreetViewEmbedUrl = (lat: number, lng: number) => {
    return `https://www.google.com/maps/embed/v1/streetview?location=${lat},${lng}&heading=0&pitch=0&fov=90&key=${GOOGLE_MAPS_API_KEY}`;
  };

  // Función para abrir Google Maps en pantalla completa
  const getDirectGoogleMapsUrl = (lat: number, lng: number) => {
    return `https://www.google.com/maps/@${lat},${lng},3a,75y,0h,90t/data=!3m7!1e1!3m5!1s0!2e0!6shttps:%2F%2Fstreetviewpixels-pa.googleapis.com!7i16384!8i8192`;
  };

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
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          fontFamily: 'Segoe UI, sans-serif',
        }}
      >
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
            eventHandlers={{
              click: handleMarkerClick,
            }}
          >
            <Popup
              closeButton={true}
              autoClose={false}
              closeOnClick={false}
              className="custom-popup"
              autoPan={false}
            >
              <div className="popup-content">
                <p className="popup-title">Unidad: {deviceId.toUpperCase()}</p>
                <p className="popup-address" title={direccion}>
                  Dirección: {direccion}
                </p>
              
              </div>
            </Popup>
          </Marker>

          <AutoOpenPopup />
        </MapContainer>

        {/* Panel lateral con Google Street View */}
        <div
          style={{
            position: 'absolute',
            bottom: '0px',
            left: '0px',
            width: '500px',
            height: '350px',
            backgroundColor: 'white',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            transform: isPanelOpen ? 'translateX(0)' : 'translateX(-520px)',
            transition: 'transform 0.3s ease-in-out',
            zIndex: 1000,
            border: '2px solid #e0e0e0',
            fontFamily: 'Segoe UI, sans-serif',
            overflow: 'hidden',
          }}
        >
          {/* Header del panel */}
          <div style={{
            padding: '10px 10px',
            borderBottom: '2px solid #e0e0e0',
            backgroundColor: '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h3 style={{
              margin: '0',
              color: '#333',
              fontSize: '14px',
              fontWeight: 'bold'
            }}>
              {deviceId.toUpperCase()}
            </h3>
            <button
              onClick={closePan}
              style={{
                width: '20px',
                height: '20px',
                border: 'none',
                backgroundColor: '#ff4757',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Contenido del Street View */}
          <div style={{ position: 'relative', height: 'calc(100% - 100px)' }}>
            <iframe
              src={getStreetViewEmbedUrl(latitude, longitude)}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={`Street View - ${deviceId}`}
            />

            {/* Botones flotantes */}
            <div style={{
              position: 'absolute',
              bottom: '10px',
              left: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              {/* Pantalla completa */}
              <button
                onClick={() => window.open(getDirectGoogleMapsUrl(latitude, longitude), "_blank")}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  border: 'none',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#333',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <Maximize2 size={14} color="#007bff" />
              </button>

              {/* Mapa normal */}
              <button
                onClick={() => window.open(`https://www.google.com/maps/search/${latitude},${longitude}`, "_blank")}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  border: 'none',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#333',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <Map size={14} color="#28a745" />
              </button>

              {/* Mi ubicación */}
              <button
                onClick={() => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                      (position) => {
                        const { latitude: userLat, longitude: userLng } = position.coords;
                        window.open(`https://www.google.com/maps/dir/${userLat},${userLng}/${latitude},${longitude}`, "_blank");
                      },
                      (error) => {
                        console.log("Error getting location:", error);
                        alert("No se pudo obtener tu ubicación");
                      }
                    );
                  } else {
                    alert("Geolocalización no soportada");
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  border: 'none',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#333',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <MapPin size={14} color="#dc3545" />
              </button>
            </div>
          </div>

          {/* Footer con información */}
          <div style={{
            padding: '10px 10px',
            borderTop: '1px solid #e0e0e0',
            backgroundColor: '#f8f9fa',
            fontSize: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 'bold', color: '#333', marginBottom: '2px' }}>
                   {direccion}
                </div>
                <div style={{ color: '#666' }}>
                  Coordenadas: {latitude.toFixed(6)}, {longitude.toFixed(6)}
                </div>
              </div>
         
            </div>
          </div>
        </div>
      </div>
    </>
  );
}