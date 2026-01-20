'use client';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, Clock8 } from 'lucide-react';
import { Spinner } from '@nextui-org/react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';

const initialCenter: [number, number] = [
  -12.046591525826495, -77.04689047482863,
];

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

interface MarkerData {
  marker: L.Marker;
  popup1: L.Popup;
  popup2: L.Popup;
  popup2IsOpen: boolean;
}

interface TokenData {
  token: string;
  deviceId: string;
  username: string;
  duracionMinutos: number;
  creationdate: string;
  expirationdate: string;
}

const MapController = ({
  onMapReady,
  device,
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

  useEffect(() => {
    if (map && device) {
      const newCenter: [number, number] = [
        device.lastValidLatitude,
        device.lastValidLongitude,
      ];
      map.setView(newCenter, 16);
    }
  }, [map, device]);

  return null;
};

const SeguimientoUnidadContent = () => {
  const searchParams = useSearchParams();

  const [device, setDevice] = useState<Device | null>(null);
  const [fechaActual, setFechaActual] = useState<FechaActual | null>(null);
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [isValidatingToken, setIsValidatingToken] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  const mapRef = useRef<L.Map | null>(null);
  const markerDataRef = useRef<MarkerData | null>(null);

  useEffect(() => {
    const validateToken = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setTokenError('Token no proporcionado. Por favor solicita un nuevo enlace de seguimiento.');
        setIsValidatingToken(false);
        return;
      }

      try {
        const response = await fetch(`https://do.velsat.pe:2083/api/Preplan/ObtenerPorToken/${token}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          throw new Error('Token inválido o expirado');
        }

        const data: TokenData = await response.json();

        const expirationDate = new Date(data.expirationdate);
        const now = new Date();

        if (now > expirationDate) {
          setTokenError('La sesión ha expirado. Por favor solicita un nuevo enlace de seguimiento.');
          setIsValidatingToken(false);
          return;
        }

        setTokenData(data);
        setTokenError(null);
        setIsValidatingToken(false);
      } catch (error) {
        console.error('Error validando token:', error);
        setTokenError('Token inválido o expirado. Por favor solicita un nuevo enlace de seguimiento.');
        setIsValidatingToken(false);
      }
    };

    validateToken();
  }, [searchParams]);

  useEffect(() => {
    if (!tokenData) return;

    const updateTimeRemaining = () => {
      const expirationDate = new Date(tokenData.expirationdate);
      const now = new Date();
      const diff = expirationDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTokenError('La sesión ha expirado. Por favor solicita un nuevo enlace de seguimiento.');
        setTimeRemaining('Expirado');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
    };

    updateTimeRemaining();
    const intervalId = setInterval(updateTimeRemaining, 1000);

    return () => clearInterval(intervalId);
  }, [tokenData]);

  useEffect(() => {
    if (!tokenData || tokenError) return;

    let isComponentMounted = true;
    let intervalId: NodeJS.Timeout | null = null;

    const fetchDeviceData = async () => {
      if (!isComponentMounted || !tokenData.deviceId) {
        console.warn('❌ Componente desmontado o deviceId no disponible');
        return;
      }

      const expirationDate = new Date(tokenData.expirationdate);
      const now = new Date();

      if (now > expirationDate) {
        setTokenError('La sesión ha expirado. Por favor solicita un nuevo enlace de seguimiento.');
        if (intervalId) clearInterval(intervalId);
        return;
      }

      try {
        const apiUrl = `https://do.velsat.pe:2083/api/DeviceList/Unidad/${tokenData.username}/${tokenData.deviceId}`;

        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          },
        });

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (!isComponentMounted) return;

        const datosDevice = data.datosDevice;

        const updatedDevice = datosDevice.find(
          (d: Device) => d.deviceId === tokenData.deviceId
        );

        if (updatedDevice) {
          console.log(`📱 Dispositivo ${tokenData.deviceId} actualizado`);
          setFechaActual(data.fechaActual);
          setDevice(updatedDevice);
        } else {
          console.warn(`⚠️ Dispositivo ${tokenData.deviceId} no encontrado en los datos`);
        }
      } catch (error) {
        console.error('❌ Error obteniendo datos del dispositivo:', error);
      }
    };

    const handleVisibilityChange = () => {
      if (!isComponentMounted) return;

      if (document.visibilityState === 'visible') {
        console.log('🔍 Pestaña activa - Reanudando polling...');
        
        fetchDeviceData();
        
        if (!intervalId) {
          intervalId = setInterval(fetchDeviceData, 8000);
        }
      } else {
        console.log('😴 Pestaña inactiva - Pausando polling');
        
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    console.log('🚀 Iniciando polling de datos del dispositivo cada 8 segundos...');
    
    const timeoutId = setTimeout(fetchDeviceData, 50);
    
    intervalId = setInterval(fetchDeviceData, 8000);

    return () => {
      isComponentMounted = false;
      clearTimeout(timeoutId);

      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }

      document.removeEventListener('visibilitychange', handleVisibilityChange);

      console.log('🧹 Cleanup: Polling detenido');
    };
  }, [tokenData, tokenError]);

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
    if (heading >= 0 && heading <= 22.5) return 'Norte';
    if (heading >= 22.51 && heading <= 67.5) return 'Noreste';
    if (heading >= 67.51 && heading <= 112.5) return 'Este';
    if (heading >= 112.51 && heading <= 157.5) return 'Sureste';
    if (heading >= 157.51 && heading <= 202.5) return 'Sur';
    if (heading >= 202.51 && heading <= 247.5) return 'Suroeste';
    if (heading >= 247.51 && heading <= 292.5) return 'Oeste';
    if (heading >= 292.51 && heading <= 337.5) return 'Noroeste';
    if (heading >= 337.51 && heading <= 360.0) return 'Norte';
    return 'Desconocido';
  }, []);

  const getMarkerIcon = useCallback((heading: number) => {
    const directions = [
      { range: [0, 22.5], url: '/up.webp', size: [25, 35] as [number, number] },
      {
        range: [22.51, 67.5],
        url: '/topright.webp',
        size: [42, 25] as [number, number],
      },
      {
        range: [67.51, 112.5],
        url: '/right.webp',
        size: [42, 25] as [number, number],
      },
      {
        range: [112.51, 157.5],
        url: '/downright.webp',
        size: [42, 25] as [number, number],
      },
      {
        range: [157.51, 202.5],
        url: '/down.webp',
        size: [25, 35] as [number, number],
      },
      {
        range: [202.51, 247.5],
        url: '/downleft.webp',
        size: [42, 25] as [number, number],
      },
      {
        range: [247.51, 292.5],
        url: '/left.webp',
        size: [42, 25] as [number, number],
      },
      {
        range: [292.51, 337.5],
        url: '/topleft.webp',
        size: [42, 25] as [number, number],
      },
      {
        range: [337.51, 360.0],
        url: '/up.webp',
        size: [25, 35] as [number, number],
      },
    ];

    const direction = directions.find(
      (d) => heading >= d.range[0] && heading <= d.range[1],
    );

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

  const getPopupContent = useCallback(
    (device: Device) => {
      return `
    <div class="content-custom-popup bg-gray-800 text-white rounded-lg shadow-2xl" style="width: 280px; padding: 0; overflow: hidden;" id="content2-${device.deviceId}">
      <div class="relative bg-gradient-to-r from-gray-700 to-gray-800 px-4 py-3 border-b border-gray-600">
        <button id="close-btn-${device.deviceId}" class="absolute top-2 right-2 text-white hover:text-red-400 transition-colors" style="font-size: 24px; line-height: 1; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.1); border-radius: 50%; cursor: pointer;">&times;</button>
        <h3 class="text-sm font-bold text-yellow-400 uppercase tracking-wide pr-8">Unidad: ${device.deviceId.toUpperCase()}</h3>
      </div>
      
      <div class="px-4 py-3 space-y-2">
        <div class="flex justify-between items-center py-1.5 px-3 bg-gray-700/50 rounded">
          <span class="text-xs text-gray-300">Velocidad:</span>
          <span class="text-sm font-bold text-green-400">${device.lastValidSpeed.toFixed(0)} Km/h</span>
        </div>
        <div class="flex justify-between items-center py-1.5 px-3 bg-gray-700/50 rounded">
          <span class="text-xs text-gray-300">Estado:</span>
          <span class="text-sm font-bold ${device.lastValidSpeed > 0 ? 'text-blue-400' : 'text-orange-400'}">${getEstado(device.lastValidSpeed)}</span>
        </div>
      </div>

      <div class="h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent mx-4"></div>

      <div class="px-4 py-3">
        <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-2">
          <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/>
          </svg>
          Último Reporte
        </h4>
        <div class="space-y-2 text-xs">
          <div class="flex items-start gap-2">
            <span class="text-gray-400 min-w-[60px]">Fecha:</span>
            <span class="text-gray-200 font-medium">${formatFecha(fechaActual).replace('Fecha: ', '').replace(' Hora: ', ' • ')}</span>
          </div>
          <div class="flex items-start gap-2">
            <span class="text-gray-400 min-w-[60px]">Dirección:</span>
            <span class="text-gray-200 font-medium">${getDireccion(device.lastValidHeading)}</span>
          </div>
          <div class="flex items-start gap-2">
            <span class="text-gray-400 min-w-[60px]">Ubicación:</span>
            <span class="text-gray-200 font-medium leading-relaxed">${device.direccion}</span>
          </div>
        </div>
      </div>
    </div>
  `;
    },
    [fechaActual, getDireccion, getEstado, formatFecha],
  );

  const createMarkerAndPopup = useCallback(
    (map: L.Map) => {
      if (!device) return;

      const position: [number, number] = [
        device.lastValidLatitude,
        device.lastValidLongitude,
      ];

      if (markerDataRef.current) {
        const markerData = markerDataRef.current;

        markerData.marker.setLatLng(position);
        markerData.marker.setIcon(getMarkerIcon(device.lastValidHeading));

        if (markerData.popup2IsOpen) {
          const popupElement = markerData.popup2.getElement();
          if (popupElement) {
            popupElement.innerHTML = getPopupContent(device);

            const closeButton = popupElement.querySelector(
              `#close-btn-${device.deviceId}`,
            );
            if (closeButton) {
              closeButton.addEventListener('click', (e) => {
                e.stopPropagation();
                markerData.marker.closePopup();
                markerData.marker.bindPopup(markerData.popup1).openPopup();
                markerData.popup2IsOpen = false;
              });
            }
          }
        } else {
          const popup1Content = `
            <div class="relative flex flex-col items-center mt-4">
              <div id="content" class="bg-[#fca311] text-gray-800 px-2 py-1.5 border border-[#fca311] custom-popup1-font">
                ${device.deviceId.toUpperCase()}
              </div>
              <div class="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-[#fca311]"></div>
            </div>
          `;
          markerData.popup1.setContent(popup1Content);
        }
      } else {
        const popup1Content = `
        <div class="relative flex flex-col items-center mt-4">
          <div id="content" class="bg-[#fca311] text-gray-800 px-2 py-1.5 border border-[#fca311] custom-popup1-font">
            ${device.deviceId.toUpperCase()}
          </div>
          <div class="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-[#fca311]"></div>
        </div>
      `;

        const popup1 = L.popup({
          closeButton: false,
          autoClose: false,
          autoPan: false,
          className: 'custom-popup-1 transparent-popup',
        }).setContent(popup1Content);

        const popup2 = L.popup({
          closeButton: false,
          autoClose: false,
          className: 'custom-popup-2 transparent-popup',
        }).setContent(getPopupContent(device));

        const icon = getMarkerIcon(device.lastValidHeading);
        const marker = L.marker(position, { icon }).addTo(map);

        marker.bindPopup(popup1).openPopup();

        const markerData: MarkerData = {
          marker,
          popup1,
          popup2,
          popup2IsOpen: false,
        };

        marker.on('click', () => {
          if (!markerData.popup2IsOpen) {
            marker.bindPopup(popup2).openPopup();
            markerData.popup2IsOpen = true;
          } else {
            marker.closePopup();
            marker.bindPopup(popup1).openPopup();
            markerData.popup2IsOpen = false;
          }
        });

        popup2.on('add', () => {
          const closeButton = document.querySelector(
            `#close-btn-${device.deviceId}`,
          );
          if (closeButton) {
            closeButton.addEventListener('click', (e) => {
              e.stopPropagation();
              marker.closePopup();
              marker.bindPopup(popup1).openPopup();
              markerData.popup2IsOpen = false;
            });
          }
        });

        markerDataRef.current = markerData;
      }
    },
    [device, getMarkerIcon, getPopupContent],
  );

  const onMapReady = useCallback(
    (map: L.Map) => {
      mapRef.current = map;

      map.on('click', (e) => {
        e.originalEvent.stopPropagation();
      });

      if (device) {
        createMarkerAndPopup(map);
      }
    },
    [createMarkerAndPopup, device],
  );

  useEffect(() => {
    if (mapRef.current && device) {
      createMarkerAndPopup(mapRef.current);
    }
  }, [device, createMarkerAndPopup]);

  if (isValidatingToken) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-blue-400/10 to-transparent rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-indigo-400/10 to-transparent rounded-full blur-3xl animate-pulse"></div>
        </div>
        <div className="relative z-10 text-center bg-white/80 backdrop-blur-xl p-10 rounded-3xl shadow-2xl border border-white/20 max-w-md">
          <div className="mb-6">
            <Spinner size="lg" color="primary" className="mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Validando Acceso
          </h2>
          <p className="text-gray-600 text-base font-medium mb-4">
            Verificando enlace de seguimiento...
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <span className="font-medium">Procesando</span>
          </div>
        </div>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-red-50 to-orange-100">
        <div className="text-center bg-white p-10 rounded-xl shadow-2xl max-w-md">
          <div className="mb-6">
            <AlertCircle size={64} className="text-red-500 mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Sesión Expirada</h2>
          <p className="text-gray-600 mb-6">{tokenError}</p>
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
            <p className="text-sm text-red-700">
              Por favor, contacta al administrador para obtener un nuevo enlace de seguimiento.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      {timeRemaining && timeRemaining !== 'Expirado' && (
        <div className="absolute bottom-4 left-4 z-[1000]">
          <div className="bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600 text-white px-5 py-3 rounded-xl shadow-2xl backdrop-blur-sm border border-white/20">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg backdrop-blur-md">
                <Clock8 className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <p className="text-xs font-bold text-white uppercase">Sesión activa</p>
                <p className="text-sm font-bold text-white mt-0.5">{timeRemaining}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <MapContainer
        center={
          device
            ? [device.lastValidLatitude + 0.009, device.lastValidLongitude]
            : initialCenter
        }
        zoom={14}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        maxZoom={19}
        minZoom={1}
        closePopupOnClick={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <MapController onMapReady={onMapReady} device={device} />
      </MapContainer>

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

        .custom-popup-2 * {
          text-align: left !important;
        }

        .custom-popup1-font {
          font-size: 12px;
          font-weight: 700;
        }

        .popup-title {
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 700;
        }

        .popup-close-btnn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          transition: all 0.2s ease;
        }

        .popup-close-btnn:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }

        .content-custom-popup {
          display: flex;
          flex-direction: column;
          gap: 4px;
          position: relative;
        }

        .content-custom-popup span {
          font-size: 12px;
        }
      `}</style>
    </div>
  );
};

export default SeguimientoUnidadContent;