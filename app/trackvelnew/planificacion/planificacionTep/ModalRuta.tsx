'use client';
import React, { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import type { Map as LeafletMap } from 'leaflet';

// Importar Leaflet dinámicamente para evitar problemas de SSR
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

interface Coordenada {
  wx: string;
  wy: string;
  nombre?: string;
  direccion?: string;
}

interface ModalMapaProps {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  grupo: number;
  coordenadas?: Coordenada[];
  selectedMarker: Coordenada | null;
  setSelectedMarker: (marker: Coordenada | null) => void;
  isLoaded: boolean;
  getMarkerSVG: (index: number) => string;
}

// Componente personalizado para el marcador con popup
function CustomMarker({
  coord,
  index,
  selectedMarker,
  setSelectedMarker,
  getMarkerSVG,
}: {
  coord: Coordenada;
  index: number;
  selectedMarker: Coordenada | null;
  setSelectedMarker: (marker: Coordenada | null) => void;
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
        const iconPrototype = DefaultIcon.prototype as {
          _getIconUrl?: () => void;
        };
        delete iconPrototype._getIconUrl;

        L.Icon.Default.mergeOptions({
          iconRetinaUrl:
            'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl:
            'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl:
            'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
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
        iconUrl:
          'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(markerSvg),
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
      position={[parseFloat(coord.wy), parseFloat(coord.wx)]}
      icon={customIcon}
      eventHandlers={{
        click: () => {
          setSelectedMarker(coord);
        },
      }}
    >
      {selectedMarker === coord && (
        <Popup
          closeOnClick={false}
          autoClose={false}
          eventHandlers={{
            remove: () => setSelectedMarker(null),
          }}
        >
          <div style={{ maxWidth: '200px' }}>
            <h3
              className="text-base font-bold text-gray-800"
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={selectedMarker.nombre}
            >
              {selectedMarker.nombre
                ? selectedMarker.nombre.length > 36
                  ? `${selectedMarker.nombre.slice(0, 36)}...`
                  : selectedMarker.nombre
                : 'Sin nombre'}
            </h3>
            <p
              className="text-sm text-gray-600"
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={selectedMarker.direccion}
            >
              {selectedMarker.direccion
                ? selectedMarker.direccion.length > 36
                  ? `${selectedMarker.direccion.slice(0, 36)}...`
                  : selectedMarker.direccion
                : 'Sin dirección'}
            </p>
          </div>
        </Popup>
      )}
    </Marker>
  );
}

export default function ModalMapa({
  isOpen,
  setIsOpen,
  grupo,
  coordenadas,
  selectedMarker,
  setSelectedMarker,
  isLoaded,
  getMarkerSVG,
}: ModalMapaProps) {
  const [isClient, setIsClient] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isOpen && coordenadas) {
      console.log('Coordenadas al abrir el modal:', coordenadas);
    }
  }, [isOpen, coordenadas]);

  // Manejo de pantalla completa
  const toggleFullscreen = async () => {
    if (!mapContainerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        // Entrar en pantalla completa
        await mapContainerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        // Salir de pantalla completa
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error('Error al cambiar el modo de pantalla completa:', error);
    }
  };

  // Listener para detectar cambios en el estado de pantalla completa
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
        onClick={() => setIsOpen(false)}
      >
        <div
          className="z-60 relative w-full max-w-2xl rounded-lg bg-white p-6 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setIsOpen(false)}
            className="absolute right-4 top-4 text-3xl font-bold text-gray-500 hover:text-gray-700"
          >
            &times;
          </button>

          <h2 className="mb-4 text-lg font-semibold">
            Ruta programada - Grupo {grupo}
          </h2>

          {isLoaded && isClient ? (
            <div 
              ref={mapContainerRef}
              className="relative h-[500px] w-full"
              style={isFullscreen ? {
                height: '100vh',
                width: '100vw',
                position: 'fixed',
                top: 0,
                left: 0,
                zIndex: 9999,
                backgroundColor: 'white'
              } : {}}
            >
              {/* Botón de pantalla completa personalizado */}
              <button
                onClick={toggleFullscreen}
                className="absolute right-2 top-2 z-[1000] flex h-8 w-8 items-center justify-center rounded bg-white shadow-md hover:bg-gray-100"
                title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
                style={{ border: '2px solid rgba(0,0,0,0.2)' }}
              >
                {isFullscreen ? (
                  // Ícono para salir de pantalla completa
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                  </svg>
                ) : (
                  // Ícono para entrar en pantalla completa
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                  </svg>
                )}
              </button>

              <MapContainer
                center={[-12.061171148647077, -77.03599608048779]}
                zoom={11}
                style={{ width: '100%', height: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {coordenadas?.map((coord, index) => (
                  <CustomMarker
                    key={index}
                    coord={coord}
                    index={index}
                    selectedMarker={selectedMarker}
                    setSelectedMarker={setSelectedMarker}
                    getMarkerSVG={getMarkerSVG}
                  />
                ))}
              </MapContainer>
            </div>
          ) : (
            <div className="flex h-[500px] w-full items-center justify-center rounded bg-gray-100">
              <p>Cargando mapa...</p>
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg bg-[#d62828] px-4 py-2 text-white hover:bg-red-500"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {/* Estilos para importar Leaflet CSS */}
      <style jsx global>{`
        @import url('https://unpkg.com/leaflet@1.7.1/dist/leaflet.css');
        
        /* Asegurar que los controles de Leaflet estén visibles */
        .leaflet-control-container {
          position: relative;
          z-index: 800;
        }
        
        /* Estilo para el contenedor en pantalla completa */
        .fullscreen-map {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          z-index: 9999 !important;
          background: white;
        }
      `}</style>
    </>
  );
}