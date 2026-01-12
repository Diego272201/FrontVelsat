'use client';
import React, { useEffect, useState } from 'react';
import { GoogleMap, InfoWindow, Marker } from '@react-google-maps/api';
import { useGoogleMaps } from '@/context/GoogleMapsContext';

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
  getMarkerSVG: (index: number) => string;
}

export default function ModalMapa({
  isOpen,
  setIsOpen,
  grupo,
  coordenadas,
  selectedMarker,
  setSelectedMarker,
  getMarkerSVG,
}: ModalMapaProps) {
  const { isLoaded, loadError } = useGoogleMaps();
  
  const [mapCenter] = useState({
    lat: -12.061171148647077,
    lng: -77.03599608048779,
  });

  useEffect(() => {
    if (isOpen && coordenadas) {
      console.log('Coordenadas al abrir el modal:', coordenadas);
    }
  }, [isOpen, coordenadas]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedMarker(null);
    }
  }, [isOpen, setSelectedMarker]);

  if (!isOpen) return null;

  if (loadError) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={() => setIsOpen(false)}
      >
        <div
          className="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl animate-in fade-in zoom-in duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setIsOpen(false)}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div className="mb-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Error al cargar el mapa</h2>
            <p className="mt-2 text-sm text-gray-600">
              {loadError.message}
            </p>
          </div>
          
          <button
            onClick={() => setIsOpen(false)}
            className="w-full rounded-lg bg-[#d62828] px-4 py-3 font-medium text-white transition-all hover:bg-[#c02222] focus:outline-none focus:ring-2 focus:ring-[#d62828] focus:ring-offset-2"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >

<button
  onClick={() => setIsOpen(false)}
  aria-label="Cerrar"
  className="
    absolute right-4 top-4 z-10
    flex h-10 w-10 items-center justify-center
    rounded-full
    bg-white/80 backdrop-blur
    text-gray-500
    shadow-md
    transition-all duration-200
    hover:bg-red-50 hover:text-red-600
    hover:shadow-lg hover:scale-105
    active:scale-95
  "
>
  <svg
    className="h-5 w-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
</button>





        <div className="border-b border-gray-200 px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#d62828]/10">
              <svg className="h-6 w-6 text-[#d62828]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Ruta Programada
              </h2>
              <p className="text-sm text-gray-500">Grupo {grupo}</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {isLoaded ? (
            <div className="h-[550px] w-full overflow-hidden rounded-xl shadow-inner ring-1 ring-gray-200">
              <GoogleMap
                mapContainerStyle={{
                  width: '100%',
                  height: '100%',
                }}
                center={mapCenter}
                zoom={11}
                onClick={() => setSelectedMarker(null)}
                options={{
                  gestureHandling: 'cooperative',
                  disableDefaultUI: true,
                  streetViewControl: true,
                  fullscreenControl: true,
                  zoomControl: true,
                }}
                onCenterChanged={() => {}}
              >
                {coordenadas?.map((coord, index) => {
                  const markerSvg = getMarkerSVG(index + 1);
                  return (
                    <React.Fragment key={index}>
                      <Marker
                        position={{
                          lat: parseFloat(coord.wy),
                          lng: parseFloat(coord.wx),
                        }}
                        onClick={(e) => {
                          e?.stop();
                          
                          if (selectedMarker === coord) {
                            setSelectedMarker(null);
                          } else {
                            setSelectedMarker(coord);
                          }
                        }}
                        icon={{
                          url:
                            'data:image/svg+xml;charset=UTF-8,' +
                            encodeURIComponent(markerSvg),
                          scaledSize: new window.google.maps.Size(40, 50),
                          anchor: new window.google.maps.Point(20, 45),
                        }}
                      >
                        {selectedMarker === coord && (
                          <InfoWindow
                            onCloseClick={() => setSelectedMarker(null)}
                            options={{
                              pixelOffset: new window.google.maps.Size(0, 0),
                              disableAutoPan: true,
                              maxWidth: 250,
                            }}
                          >
                            <div className="p-2" style={{ maxWidth: '250px' }}>
                              <h3
                                className="text-[11px] mb-2  font-bold text-gray-900"
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
                                className="flex items-start gap-1 text-[11px] text-gray-700"
                                style={{
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                                title={selectedMarker.direccion}
                              >
                                <svg className="mt-0 h-4 w-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span>
                                  {selectedMarker.direccion
                                    ? selectedMarker.direccion.length > 36
                                      ? `${selectedMarker.direccion.slice(0, 36)}...`
                                      : selectedMarker.direccion
                                    : 'Sin dirección'}
                                </span>
                              </p>
                            </div>
                          </InfoWindow>
                        )}
                      </Marker>
                    </React.Fragment>
                  );
                })}
              </GoogleMap>
            </div>
          ) : (
            <div className="flex h-[550px] items-center justify-center rounded-xl bg-gray-50">
              <div className="text-center">
                <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-[#d62828]"></div>
                <p className="text-sm font-medium text-gray-600">Cargando mapa...</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 px-8 py-5">
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-lg bg-[#d62828] px-6 py-3 font-medium text-white transition-all hover:bg-[#c02222] focus:outline-none focus:ring-2 focus:ring-[#d62828] focus:ring-offset-2"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}