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
          setFechaActual(data.fechaActual);
          setDevice(updatedDevice);
        }
      } catch (error) {
        // Silently handle error in polling
      }
    };

    const handleVisibilityChange = () => {
      if (!isComponentMounted) return;

      if (document.visibilityState === 'visible') {
        fetchDeviceData();
        
        if (!intervalId) {
          intervalId = setInterval(fetchDeviceData, 8000);
        }
      } else {
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

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
      const speed = Math.round(device.lastValidSpeed);
      const isMoving = speed > 0;
      const estado = getEstado(device.lastValidSpeed);
      const statusBg = isMoving ? '#dcfce7' : '#fee2e2';
      const statusBorder = isMoving ? '#bbf7d0' : '#fecaca';
      const safeDeviceId = device.deviceId;
      const safeDireccion = device.direccion || '';
      const fechaTexto = formatFecha(fechaActual).replace('Fecha: ', '').replace(' Hora: ', ' ');

      return `
    <div style="
      background: #ffffff !important;
      color: #1e293b !important;
      padding: 0 !important;
      box-shadow: 0 4px 24px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08) !important;
      border: none !important;
      width: 260px !important;
      border-radius: 6px !important;
      font-size: 11px !important;
      line-height: 1.5 !important;
      position: relative !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
      overflow: hidden !important;
    " id="content2-${safeDeviceId}">
      <div style="background: #113EB9 !important; padding: 8px 12px !important; display: flex !important; align-items: center !important; justify-content: space-between !important;">
        <div style="display: flex !important; align-items: center !important;">
          <span style="color: #ffffff !important; font-weight: 600 !important; font-size: 11px !important; letter-spacing: 0.3px !important;">${safeDeviceId.toUpperCase()}</span>
        </div>
        <button id="close-btn-${safeDeviceId}" style="color: rgba(255,255,255,0.7) !important; font-size: 16px !important; cursor: pointer !important; border: none !important; background: none !important; padding: 0 !important; line-height: 1 !important;" onmouseover="this.style.color='#ffffff'" onmouseout="this.style.color='rgba(255,255,255,0.7)'">&times;</button>
      </div>

      <div style="padding: 10px 12px 8px !important;">
        <div style="display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 6px !important; margin-bottom: 8px !important;">
          <div style="background: #f8fafc !important; border: 1px solid #e2e8f0 !important; border-radius: 4px !important; padding: 6px 8px !important; text-align: center !important;">
            <div style="font-size: 15px !important; font-weight: 700 !important; color: #0f172a !important;">${speed}</div>
            <div style="font-size: 9px !important; color: #64748b !important; text-transform: uppercase !important; letter-spacing: 0.5px !important;">KM/H</div>
          </div>
          <div style="background: ${statusBg} !important; border: 1px solid ${statusBorder} !important; border-radius: 4px !important; padding: 6px 8px !important; text-align: center !important;">
            <div style="font-size: 11px !important; font-weight: 600 !important; color: #000000 !important;">${estado}</div>
            <div style="font-size: 9px !important; color: #000000 !important; opacity: 0.6 !important; text-transform: uppercase !important; letter-spacing: 0.5px !important;">ESTADO</div>
          </div>
        </div>

        <div style="border-top: 1px solid #e2e8f0 !important; padding-top: 8px !important;">
          <div style="display: flex !important; justify-content: space-between !important; margin-bottom: 4px !important;">
            <span style="color: #64748b !important; font-size: 12px !important;">Dirección</span>
            <span style="color: #1e293b !important; font-weight: 500 !important; font-size: 12px !important;">${getDireccion(device.lastValidHeading)}</span>
          </div>
          <div style="margin-bottom: 4px !important;">
            <span style="color: #64748b !important; font-size: 12px !important;">Ubicación</span>
            <div style="color: #1e293b !important; font-size: 12px !important; margin-top: 2px !important; line-height: 1.3 !important;">${safeDireccion}</div>
          </div>
          <div style="display: flex !important; justify-content: space-between !important; align-items: center !important; margin-top: 6px !important; padding-top: 6px !important; border-top: 1px solid #f1f5f9 !important;">
            <span style="color: #94a3b8 !important; font-size: 11px !important;">Último reporte</span>
            <span style="color: #475569 !important; font-size: 11px !important; font-weight: 500 !important;">${fechaTexto}</span>
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
            <div class="relative flex flex-col items-center mt-3">
              <div id="content" class="bg-[#113EB9] text-white px-2.5 py-1 text-xs font-semibold rounded shadow-md border border-[#113EB9] tracking-wide">
                ${device.deviceId.toUpperCase()}
              </div>
              <div class="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-[#113EB9]"></div>
            </div>
          `;
          markerData.popup1.setContent(popup1Content);
        }
      } else {
        const popup1Content = `
        <div class="relative flex flex-col items-center mt-3">
          <div id="content" class="bg-[#113EB9] text-white px-2.5 py-1 text-xs font-semibold rounded shadow-md border border-[#113EB9] tracking-wide">
            ${device.deviceId.toUpperCase()}
          </div>
          <div class="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-[#113EB9]"></div>
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
      <div className="flex items-center justify-center h-screen bg-slate-100">
        <div className="text-center bg-white p-8 rounded-2xl shadow-xl border border-slate-200/90 max-w-sm w-full mx-4">
          <div className="mb-4">
            <Spinner size="lg" color="primary" className="mx-auto" />
          </div>
          <h2 className="text-base font-bold text-slate-800 mb-1">
            Validando Acceso
          </h2>
          <p className="text-slate-500 text-xs font-normal">
            Verificando enlace de seguimiento...
          </p>
        </div>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-100 p-4">
        <div className="text-center bg-white p-8 rounded-2xl shadow-xl border border-slate-200 max-w-md w-full">
          <div className="mb-4 flex justify-center">
            <div className="h-12 w-12 rounded-full bg-red-50 border border-red-100 flex items-center justify-center">
              <AlertCircle size={24} className="text-red-600" />
            </div>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Sesión Expirada</h2>
          <p className="text-slate-600 text-xs mb-5 leading-relaxed">{tokenError}</p>
          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-left">
            <p className="text-xs text-slate-600">
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
          <div className="bg-white/95 backdrop-blur-md text-slate-800 px-4 py-2.5 rounded-xl shadow-lg border border-slate-200/90 flex items-center gap-3">
            <div className="bg-blue-50 p-2 rounded-lg border border-blue-100 text-[#113EB9]">
              <Clock8 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sesión Activa</p>
              <p className="text-xs font-bold text-[#113EB9] mt-0.5">{timeRemaining}</p>
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