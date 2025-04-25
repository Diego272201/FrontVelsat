'use client';
import React from 'react';
import { GoogleMap, InfoWindow, Marker } from '@react-google-maps/api';

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
  if (!isOpen) return null;

  return (
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

        {isLoaded ? (
          <div className="h-[500px] w-full">
            <GoogleMap
              mapContainerStyle={{
                width: '100%',
                height: '100%',
              }}
              center={{
                lat: -12.061171148647077,
                lng: -77.03599608048779,
              }}
              zoom={11}
            >
              {coordenadas?.map((coord, index) => {
                const markerSvg = getMarkerSVG(index + 1);
                return (
                  <Marker
                    key={index}
                    position={{
                      lat: parseFloat(coord.wy),
                      lng: parseFloat(coord.wx),
                    }}
                    onClick={() => setSelectedMarker(coord)}
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
              {selectedMarker && (
                <InfoWindow
                  position={{
                    lat: parseFloat(selectedMarker.wy),
                    lng: parseFloat(selectedMarker.wx),
                  }}
                  onCloseClick={() => setSelectedMarker(null)}
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
                </InfoWindow>
              )}
            </GoogleMap>
          </div>
        ) : (
          <p>Cargando mapa...</p>
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
  );
}
