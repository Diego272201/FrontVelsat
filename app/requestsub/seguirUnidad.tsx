'use client';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';
import '@/app/styles/popup.css';
import * as signalR from '@microsoft/signalr';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

const initialCenter: [number, number] = [-12.046591525826495, -77.04689047482863];

interface Device {
  deviceId: string;
  lastValidLatitude: number;
  lastValidLongitude: number;
  lastValidSpeed: number;
  direccion: string;
  lastValidHeading: number;
}

interface FechaActual {
  fechaActual: string;
}

interface Props {
  deviceId?: string; 
  height?: string;
}

interface MarkerData {
  marker: L.Marker;
  popup1: L.Popup;
  popup2: L.Popup;
  intervalId?: NodeJS.Timeout;
}

// Componente para acceder al mapa desde dentro
const MapController = ({ 
  onMapReady, 
  device 
}: { 
  onMapReady: (map: L.Map) => void;
  device: Device | null;
}) => {
  const map = useMap();
  
  useEffect(() => {
    if (map) {
      onMapReady(map);
    }
  }, [map, onMapReady]);

  // Centrar el mapa cuando cambie el device
  useEffect(() => {
    if (map && device) {
      const newCenter: [number, number] = [
        device.lastValidLatitude, 
        device.lastValidLongitude
      ];
      map.setView(newCenter, 16);
    }
  }, [map, device]);

  return null;
};

export default function SeguirUnidadPage({ deviceId, height = '100vh' }: Props) {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();

  const [device, setDevice] = useState<Device | null>(null);
  const [fechaActual, setFechaActual] = useState<FechaActual | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerDataRef = useRef<MarkerData | null>(null);
  
  const servidorUrl = localStorage.getItem('servidorUrl');

  useEffect(() => {
    const getDeviceIdFromUrl = () => {
      if (typeof window !== 'undefined') {
        return searchParams.get('deviceId');
      }
      return null;
    };
    
    const deviceIdFinal = deviceId || getDeviceIdFromUrl();
    if (!deviceIdFinal) return; 
  
    if (status === 'authenticated' && session) {
      const username = session.user.username;
      const hubUrl = `${servidorUrl}/dataHubDevice?username=${username}`;
  
      const connection = new signalR.HubConnectionBuilder().withUrl(hubUrl).build();
      connection.start()
        .then(() => connection.invoke('UnirGrupo', username))
        .catch(console.error);
  
      connection.on('ActualizarDatos', (datos) => {
        const updatedDevice = datos.datosDevice.find((d: Device) => d.deviceId === deviceIdFinal);
        if (updatedDevice) {
          setFechaActual(datos.fechaActual);
          setDevice(updatedDevice);
        }
      });
    }
  }, [status, session, deviceId, servidorUrl]);

  const formatFecha = useCallback((fecha: any) => {
    const date = new Date(fecha);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `Fecha: ${day}/${month}/${year} Hora: ${hours}:${minutes}`;
  }, []);

  const getDireccion = useCallback((heading: number) => {
    if (heading >= 0 && heading <= 22.5) return "Norte";
    if (heading >= 22.51 && heading <= 67.50) return "Noreste";
    if (heading >= 67.51 && heading <= 112.50) return "Este";
    if (heading >= 112.51 && heading <= 157.50) return "Sureste";
    if (heading >= 157.51 && heading <= 202.50) return "Sur";
    if (heading >= 202.51 && heading <= 247.50) return "Suroeste";
    if (heading >= 247.51 && heading <= 292.50) return "Oeste";
    if (heading >= 292.51 && heading <= 337.50) return "Noroeste";
    if (heading >= 337.51 && heading <= 360.00) return "Norte";
    return "Desconocido";
  }, []);

  const getMarkerIcon = useCallback((heading: number) => {
    const directions = [
      { range: [0, 22.5], url: '/up.webp', size: [25, 35] as [number, number] },
      { range: [22.51, 67.50], url: '/topright.webp', size: [42, 25] as [number, number] },
      { range: [67.51, 112.50], url: '/right.webp', size: [42, 25] as [number, number] },
      { range: [112.51, 157.50], url: '/downright.webp', size: [42, 25] as [number, number] },
      { range: [157.51, 202.50], url: '/down.webp', size: [25, 35] as [number, number] },
      { range: [202.51, 247.50], url: '/downleft.webp', size: [42, 25] as [number, number] },
      { range: [247.51, 292.50], url: '/left.webp', size: [42, 25] as [number, number] },
      { range: [292.51, 337.50], url: '/topleft.webp', size: [42, 25] as [number, number] },
      { range: [337.51, 360.00], url: '/up.webp', size: [25, 35] as [number, number] },
    ];
    
    const direction = directions.find(d => heading >= d.range[0] && heading <= d.range[1]);
    
    return direction
      ? L.icon({
          iconUrl: direction.url,
          iconSize: direction.size,
          iconAnchor: [direction.size[0] / 2, direction.size[1] / 2],
        })
      : L.icon({
          iconUrl: '/unknown.png',
          iconSize: [42, 25],
          iconAnchor: [21, 12.5],
        });
  }, []);

  const getEstado = useCallback((speed: number) => {
    return speed > 0 ? 'En Movimiento' : 'Estacionado';
  }, []);

  const getPopupContent = useCallback((device: Device) => {
    return `
      <div class="content-custom-popup bg-gray-800 text-white rounded-lg p-2" id="content2-${device.deviceId}">
        <button id="close-btn-${device.deviceId}" class="absolute top-2 right-4 text-white hover:text-red-500 text-lg font-bold">&times;</button>
        <span>Unidad: ${device.deviceId.toUpperCase()} </span>
        <span>Velocidad: ${device.lastValidSpeed} Km/h </span>
        <span>Estado: ${getEstado(device.lastValidSpeed)} </span>
        <br>
        <hr class="my-2 border-gray-600">
        <h4 class="font-medium text-gray-300 uppercase">Último Reporte</h4>
        <span>${formatFecha(fechaActual)} </span>
        <span>Dirección: ${getDireccion(device.lastValidHeading)}</span>
        <span>Ubicación: ${device.direccion} </span>
      </div>
    `;
  }, [fechaActual, getDireccion, getEstado, formatFecha]);

  const createMarkerAndPopup = useCallback((map: L.Map) => {
    if (!device) return;

    const position: [number, number] = [device.lastValidLatitude, device.lastValidLongitude];

    if (markerDataRef.current) {
      // Actualizar marcador existente
      const markerData = markerDataRef.current;
      
      // Actualizar posición
      markerData.marker.setLatLng(position);
      
      // Actualizar icono
      const newIcon = getMarkerIcon(device.lastValidHeading);
      markerData.marker.setIcon(newIcon);

      // Actualizar contenido del popup2
      const popupElement = markerData.popup2.getElement();
      if (popupElement) {
        popupElement.innerHTML = getPopupContent(device);
        
        // Re-agregar event listener al botón de cerrar
        const closeButton = popupElement.querySelector(`#close-btn-${device.deviceId}`);
        if (closeButton) {
          closeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            markerData.marker.closePopup();
            markerData.marker.bindPopup(markerData.popup1).openPopup();
          });
        }
      }
    } else {
      // Crear nuevo marcador
      const popup1Content = `
        <div class="bg-[#fca311] text-gray-800 px-2 py-1.5 rounded-md mt-4">
          ${device.deviceId.toUpperCase()}
        </div>
      `;

      const popup1 = L.popup({
        closeButton: false,
        autoClose: false,
        autoPan: false,
        className: 'custom-popup-1 transparent-popup'
      }).setContent(popup1Content);

      const popup2 = L.popup({
        closeButton: false,
        autoClose: true,
        className: 'custom-popup-2 transparent-popup'
      }).setContent(getPopupContent(device));

      const icon = getMarkerIcon(device.lastValidHeading);
      const marker = L.marker(position, { icon }).addTo(map);

      // Abrir popup1 por defecto
      marker.bindPopup(popup1).openPopup();

      // Variable para rastrear estado del popup2
      let popup2IsOpen = false;

      // Event listeners
      marker.on('click', () => {
        if (!popup2IsOpen) {
          // Abrir popup2
          marker.bindPopup(popup2).openPopup();
          popup2IsOpen = true;
        } else {
          // Cerrar popup2 y volver a popup1
          marker.closePopup();
          marker.bindPopup(popup1).openPopup();
          popup2IsOpen = false;
        }
      });

      // Configurar event listeners para popup2
      popup2.on('add', () => {
        // Configurar botón de cerrar
        const closeButton = document.querySelector(`#close-btn-${device.deviceId}`);
        if (closeButton) {
          closeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            marker.closePopup();
            marker.bindPopup(popup1).openPopup();
            popup2IsOpen = false;
          });
        }
      });

      // Guardar referencia
      markerDataRef.current = {
        marker,
        popup1,
        popup2,
      };
    }
  }, [device, getMarkerIcon, getPopupContent]);

  const onMapReady = useCallback((map: L.Map) => {
    mapRef.current = map;
    if (device) {
      createMarkerAndPopup(map);
    }
  }, [createMarkerAndPopup, device]);

  useEffect(() => {
    if (mapRef.current && device) {
      createMarkerAndPopup(mapRef.current);
    }
  }, [device, createMarkerAndPopup]);

  return (
    <div style={{ width: '100%', height }}>
      <MapContainer
        center={device ? [device.lastValidLatitude + 0.009, device.lastValidLongitude] : initialCenter}
        zoom={14}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        maxZoom={19}
        minZoom={1}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        
        <MapController 
          onMapReady={onMapReady}
          device={device}
        />
      </MapContainer>

      {/* CSS para popups transparentes */}
      <style jsx global>{`
        .transparent-popup .leaflet-popup-content-wrapper {
          background: transparent !important;
          box-shadow: none !important;
          border: none !important;
        }
        
        .transparent-popup .leaflet-popup-tip {
          background: transparent !important;
          box-shadow: none !important;
          border: none !important;
        }
        
        .transparent-popup .leaflet-popup-content {
          margin: 0 !important;
          padding: 0 !important;
        }
        
        .transparent-popup .leaflet-popup-close-button {
          display: none !important;
        }

        .content-custom-popup {
          min-width: 250px;
          padding: 12px;
          border-radius: 8px;
          font-size: 12px;
          line-height: 1.4;
        }

        .content-custom-popup span {
          display: block;
          margin: 4px 0;
        }

        .content-custom-popup h4 {
          margin: 8px 0 4px 0;
          font-weight: 600;
        }

        .content-custom-popup hr {
          margin: 8px 0;
          border-color: #4b5563;
        }
      `}</style>
    </div>
  );
}