'use client';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import * as signalR from '@microsoft/signalr';
import { X } from 'lucide-react';
import GoogleMapComponent from '../components/GoogleMapComponent';
import { useMapInstance } from '@/hooks/useMapInstance';
import { useGoogleMaps } from '@/context/GoogleMapsContext';
import { getMarkerSVG } from '@/app/components/ui/getMarkerSVG';
import '@/app/styles/popup.css';

const initialCenter = {
  lat: -12.046591525826495,
  lng: -77.04689047482863,
};

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
  marcadores?: { lat: number; lng: number }[];
  centro?: { lat: number; lng: number } | null;
  resetMap?: boolean;
}

interface MarkerData {
  marker: google.maps.Marker;
  popup1: any; // Custom popup overlay
  popup2: any; // Custom popup overlay
  intervalId?: NodeJS.Timeout;
}

interface StaticMarkerData {
  marker: google.maps.Marker;
}

export default function SeguirUnidadPage({
  deviceId,
  height,
  marcadores = [],
  centro = null,
  resetMap = false,
}: Props) {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const { isLoaded } = useGoogleMaps();
  const {
    mapRef,
    mapLoaded,
    onLoad: mapOnLoad,
    onUnmount: mapOnUnmount,
  } = useMapInstance();

  const [device, setDevice] = useState<Device | null>(null);
  const [fechaActual, setFechaActual] = useState<FechaActual | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasInitialCentered, setHasInitialCentered] = useState(false);
  const [isStreetViewOpen, setIsStreetViewOpen] = useState(false);
  const [streetViewData, setStreetViewData] = useState<{
    lat: number;
    lng: number;
    markerId: string;
    title: string;
  } | null>(null);

  const markerDataRef = useRef<MarkerData | null>(null);
  const staticMarkersRef = useRef<StaticMarkerData[]>([]);
  const iconCache = useRef<{ [key: string]: google.maps.Icon }>({});
  
  const servidorUrl = localStorage.getItem('servidorUrl');
  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY_K;

  // Manejo del fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () =>
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    const mapContainer = document.getElementById('map-container');
    if (!mapContainer) return;

    try {
      if (!document.fullscreenElement) {
        await mapContainer.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }

      setTimeout(() => {
        if (mapRef.current) {
          google.maps.event.trigger(mapRef.current, 'resize');
        }
      }, 300);
    } catch (error) {
    }
  };

  // Funciones para Street View
  const getStreetViewEmbedUrl = (lat: number, lng: number) => {
    if (!GOOGLE_MAPS_API_KEY) {
      return '';
    }
    return `https://www.google.com/maps/embed/v1/streetview?location=${lat},${lng}&heading=0&pitch=0&fov=90&key=${GOOGLE_MAPS_API_KEY}`;
  };

  const closeStreetView = () => {
    setIsStreetViewOpen(false);
    setStreetViewData(null);
  };

  const handleStaticMarkerStreetView = (
    lat: number,
    lng: number,
    markerId: string,
  ) => {
    const markerIndex = markerId.replace('static-marker-', '');
    setStreetViewData({
      lat,
      lng,
      markerId,
      title: `PUNTO ${parseInt(markerIndex) + 1}`,
    });
    setIsStreetViewOpen(true);
  };

  // SignalR Connection
  useEffect(() => {
    let connection: signalR.HubConnection | null = null;
    let isComponentMounted = true;
    let reconnectionAttempts = 0;
    const MAX_RECONNECTION_ATTEMPTS = 3;
    const RECONNECTION_DELAY = 1000;

    const getDeviceIdFromUrl = () => {
      if (typeof window !== 'undefined') {
        return searchParams.get('deviceId');
      }
      return null;
    };

    const connectSignalR = async () => {
      const deviceIdFinal = deviceId || getDeviceIdFromUrl();

      if (!isComponentMounted || !deviceIdFinal) {
        console.warn('Componente desmontado o deviceId no disponible');
        return;
      }

      if (
        status !== 'authenticated' ||
        !session?.user?.username ||
        !servidorUrl
      ) {
        console.warn('Sesión no autenticada o datos faltantes');
        return;
      }

      if (
        connection &&
        connection.state !== signalR.HubConnectionState.Disconnected
      ) {
        try {
          await connection.stop();
        } catch (error) {
          console.warn('Error cerrando conexión previa:', error);
        }
      }

      try {
        const username = session.user.username;
        const hubUrl = `${servidorUrl}/dataHubDevice/${username}`;

        console.log('Iniciando nueva conexión SignalR para device:', deviceIdFinal);

        connection = new signalR.HubConnectionBuilder()
          .withUrl(hubUrl, {
            transport: signalR.HttpTransportType.WebSockets,
            skipNegotiation: true,
            headers: {
              'Cache-Control': 'no-cache',
              Pragma: 'no-cache',
            },
          })
          .configureLogging(signalR.LogLevel.Warning)
          .withAutomaticReconnect([0, 1000, 5000, 10000])
          .build();

        connection.keepAliveIntervalInMilliseconds = 15000;
        connection.serverTimeoutInMilliseconds = 30000;

        connection.onclose((error) => {
          if (isComponentMounted) {
            if (error && reconnectionAttempts < MAX_RECONNECTION_ATTEMPTS) {
              reconnectionAttempts++;
              setTimeout(() => {
                if (isComponentMounted) {
                  connectSignalR();
                }
              }, RECONNECTION_DELAY);
            }
          }
        });

        connection.onreconnecting(() => {
          console.log('Reconectando...');
        });

        connection.onreconnected((connectionId) => {
          console.log('Reconectado:', connectionId);
          reconnectionAttempts = 0;
        });

        const startTime = Date.now();
        let isFirstDataReceived = false;
        await connection.start();

        if (!isComponentMounted) {
          await connection.stop();
          return;
        }

        reconnectionAttempts = 0;

        connection.on('ActualizarDatos', (datos) => {
          if (!isComponentMounted) return;

          const updatedDevice = datos.datosDevice.find(
            (d: Device) => d.deviceId === deviceIdFinal,
          );

          if (updatedDevice) {
            setFechaActual(datos.fechaActual);
            setDevice(updatedDevice);
          } else {
            console.warn(
              `Dispositivo ${deviceIdFinal} no encontrado en los datos`,
            );
          }
        });

        connection.on('Error', (error) => {
          if (isComponentMounted) {
            console.error('Error desde SignalR:', error);
          }
        });

        connection.on('ConectadoExitosamente', (username) => {
          console.log(
            `Confirmación: Conectado exitosamente para usuario ${username}`,
          );
        });
      } catch (error) {
        console.error('Error conectando SignalR:', error);

        if (
          isComponentMounted &&
          reconnectionAttempts < MAX_RECONNECTION_ATTEMPTS
        ) {
          reconnectionAttempts++;
          setTimeout(() => {
            if (isComponentMounted) {
              console.log(
                `Reintentando después de error (${reconnectionAttempts}/${MAX_RECONNECTION_ATTEMPTS})...`,
              );
              connectSignalR();
            }
          }, RECONNECTION_DELAY);
        }
      }
    };

    const timeoutId = setTimeout(connectSignalR, 50);

    return () => {
      isComponentMounted = false;
      clearTimeout(timeoutId);

      if (connection) {
        connection.stop().catch((error) => {
          console.warn('Error al cerrar conexión en cleanup:', error);
        });
      }
    };
  }, [status, session, deviceId, servidorUrl, searchParams]);

  // Utility functions
  const formatFecha = useCallback((fecha: any) => {
    const date = new Date(fecha);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `
      <span class="text-gray-300 text-[12px]">
        Fecha: <span class="ml-1 text-white font-medium">${day}/${month}/${year}</span>
        <span class="mx-2"></span>
        Hora: <span class="ml-1 text-white font-medium">${hours}:${minutes}</span>
      </span>
    `;
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
    if (typeof window === 'undefined') return null;

    const cacheKey = Math.floor(heading / 45) * 45;

    if (iconCache.current[cacheKey]) {
      return iconCache.current[cacheKey];
    }

    const directions = [
      { range: [0, 22.5], url: '/up.webp', size: [25, 35] },
      { range: [22.51, 67.5], url: '/topright.webp', size: [42, 25] },
      { range: [67.51, 112.5], url: '/right.webp', size: [42, 25] },
      { range: [112.51, 157.5], url: '/downright.webp', size: [42, 25] },
      { range: [157.51, 202.5], url: '/down.webp', size: [25, 35] },
      { range: [202.51, 247.5], url: '/downleft.webp', size: [42, 25] },
      { range: [247.51, 292.5], url: '/left.webp', size: [42, 25] },
      { range: [292.51, 337.5], url: '/topleft.webp', size: [42, 25] },
      { range: [337.51, 360.0], url: '/up.webp', size: [25, 35] },
    ];

    const direction = directions.find(
      (d) => heading >= d.range[0] && heading <= d.range[1],
    );
    const icon = direction
      ? {
          url: direction.url,
          scaledSize: new google.maps.Size(direction.size[0], direction.size[1]),
        }
      : { url: '/unknown.png', scaledSize: new google.maps.Size(42, 25) };

    iconCache.current[cacheKey] = icon;
    return icon;
  }, []);

  const getEstado = useCallback((speed: number) => {
    return speed > 0 ? 'En Movimiento' : 'Estacionado';
  }, []);

  // Custom Popup class for Google Maps - define as function to avoid early execution
  const createPopupClass = useCallback(() => {
    if (typeof window === 'undefined' || !window.google?.maps) {
      return null;
    }

    class Popup extends google.maps.OverlayView {
      position: google.maps.LatLng;
      containerDiv: HTMLDivElement;

      constructor(position: google.maps.LatLng, content: HTMLElement) {
        super();
        this.position = position;
        content.classList.add('popup-bubble');
        const bubbleAnchor = document.createElement('div');
        bubbleAnchor.appendChild(content);
        this.containerDiv = document.createElement('div');
        this.containerDiv.classList.add('popup-container');
        this.containerDiv.appendChild(bubbleAnchor);
        Popup.preventMapHitsAndGesturesFrom(this.containerDiv);
      }

      onAdd() {
        this.getPanes()!.floatPane.appendChild(this.containerDiv);
      }

      onRemove() {
        if (this.containerDiv.parentElement) {
          this.containerDiv.parentElement.removeChild(this.containerDiv);
        }
      }

      draw() {
        if (!this.getProjection() || !this.position || !this.containerDiv) return;

        const divPosition = this.getProjection().fromLatLngToDivPixel(this.position)!;
        this.containerDiv.style.left = `${divPosition.x}px`;
        this.containerDiv.style.top = `${divPosition.y}px`;
        this.containerDiv.style.display = 'block';
      }
    }

    return Popup;
  }, []);

  const getPopupContent = useCallback(
    (device: Device) => {
      return `
    <div style="
      background-color: #1f2937 !important;
      color: #ffffff !important;
      padding: 16px !important;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
      border: 1px solid #4b5563 !important;
      min-width: 300px !important;
      border-radius: 8px !important;
      font-size: 12px !important;
      line-height: 1.4 !important;
      position: relative !important;
      font-family: system-ui, -apple-system, sans-serif !important;
    " id="content2-${device.deviceId}">
      <button id="close-btn-${device.deviceId}" style="
        position: absolute !important;
        top: 0 !important;
        right: 12px !important;
        color: #d1d5db !important;
        font-size: 20px !important;
        font-weight: bold !important;
        cursor: pointer !important;
        border: none !important;
        background: transparent !important;
        transition: color 0.15s ease !important;
      " onmouseover="this.style.color='#f87171'" onmouseout="this.style.color='#d1d5db'">&times;</button>
      
      <div style="margin-bottom: 8px !important;">
        <div style="display: flex !important; align-items: center !important; margin-bottom: 4px !important;">
          <span style="color: #d1d5db !important;">Unidad:</span> 
          <strong style="color: #93c5fd !important; margin-left: 4px !important;">${device.deviceId.toUpperCase()}</strong>
        </div>
        
        <div style="display: flex !important; align-items: center !important; margin-bottom: 4px !important;">
          <span style="color: #d1d5db !important;">Velocidad:</span> 
          <strong style="color: #86efac !important; margin-left: 4px !important;">${device.lastValidSpeed} Km/h</strong>
        </div>
        
        <div style="display: flex !important; align-items: center !important; margin-bottom: 4px !important;">
          <span style="color: #d1d5db !important;">Estado:</span> 
          <strong style="color: #fde047 !important; margin-left: 4px !important;">${getEstado(device.lastValidSpeed)}</strong>
        </div>
      </div>

      <hr style="border: none !important; border-top: 1px solid #4b5563 !important; margin: 8px 0 !important;">
      
      <h4 style="
        font-weight: 600 !important;
        color: #e5e7eb !important;
        text-transform: uppercase !important;
        font-size: 10px !important;
        margin-bottom: 4px !important;
        margin-left: 2px !important;
      ">
        <strong>Último Reporte</strong>
      </h4>
      
      <div style="background-color: #374151 !important; padding: 8px !important; border-radius: 4px !important;">
        <div style="margin-bottom: 5px !important;">
            <strong>${formatFecha(fechaActual)}</strong>
        </div>
        
        <div>
          <div style="margin-bottom: 4px !important;">
            <span style="color: #d1d5db !important; font-size: 12px !important;">Dirección:</span> 
            <span style="color: #ffffff !important;">${getDireccion(device.lastValidHeading)}</span>
          </div>
          
          <div>
            <span style="color: #d1d5db !important; font-size: 12px !important;">Ubicación:</span> 
            <span style="color: #ffffff !important; font-size: 12px !important;">${device.direccion}</span>
          </div>
        </div>
      </div>
    </div>
    `;
    },
    [fechaActual, getDireccion, getEstado, formatFecha],
  );

  // Create static markers for additional points
  const createStaticMarkers = useCallback((map: google.maps.Map) => {
    // Clean up existing static markers
    staticMarkersRef.current.forEach((markerData) => {
      markerData.marker.setMap(null);
    });
    staticMarkersRef.current = [];

    marcadores.forEach((punto, index) => {
      const markerSvg = getMarkerSVG(index + 1);
      const icon = {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(markerSvg),
        scaledSize: new google.maps.Size(40, 50),
        anchor: new google.maps.Point(20, 45),
      };

      const marker = new google.maps.Marker({
        position: { lat: punto.lat, lng: punto.lng },
        map,
        icon,
      });

      marker.addListener('click', () => {
        handleStaticMarkerStreetView(punto.lat, punto.lng, `static-marker-${index}`);
      });

      staticMarkersRef.current.push({ marker });
    });
  }, [marcadores, handleStaticMarkerStreetView]);

  const createMarkerAndPopup = useCallback(
    (map: google.maps.Map) => {
      if (!device || !window.google?.maps) return;

      const PopupClass = createPopupClass();
      if (!PopupClass) return;

      const position = new google.maps.LatLng(
        device.lastValidLatitude,
        device.lastValidLongitude,
      );

      if (markerDataRef.current) {
        // Update existing marker - SIN mover el mapa
        const markerData = markerDataRef.current;

        // Solo actualizar posición del marcador, NO del mapa
        markerData.marker.setPosition(position);
        markerData.popup1.position = position;
        markerData.popup2.position = position;

        // Update icon
        const newIcon = getMarkerIcon(device.lastValidHeading);
        if (newIcon) {
          markerData.marker.setIcon(newIcon);
        }

        // Update popup2 content - preservar estilos con !important
        const popup2Element = document.querySelector(`#content2-${device.deviceId}`) as HTMLElement;
        if (popup2Element) {
          const newContent = getPopupContent(device);
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = newContent;
          const newPopupContent = tempDiv.firstElementChild as HTMLElement;
          
          if (newPopupContent) {
            // Reemplazar completamente el contenido para mantener los estilos
            popup2Element.parentNode?.replaceChild(newPopupContent, popup2Element);
            
            // Re-add event listeners
            setTimeout(() => {
              const closeButton = document.querySelector(`#close-btn-${device.deviceId}`);
              if (closeButton) {
                closeButton.addEventListener('click', (e) => {
                  e.stopPropagation();
                  markerData.popup2.setMap(null);
                  markerData.popup1.setMap(map);
                  setIsStreetViewOpen(false);
                  setStreetViewData(null);
                });
              }
            }, 10);
          }
        }
      } else {
        // Create new marker
        const popup1Content = document.createElement('div');
        popup1Content.innerHTML = `
          <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            margin-top: 16px;
            position: relative;
          ">
            <div id="content" style="
              background-color: #fca311 !important;
              color: #1f2937 !important;
              padding: 6px 8px !important;
              border: 1px solid #fca311 !important;
              font-size: 12px !important;
              font-weight: 700 !important;
              font-family: system-ui, -apple-system, sans-serif !important;
              border-radius: 4px !important;
            ">
              ${device.deviceId.toUpperCase()}
            </div>
            <div style="
              width: 0 !important;
              height: 0 !important;
              border-left: 8px solid transparent !important;
              border-right: 8px solid transparent !important;
              border-top: 8px solid #fca311 !important;
              margin-top: -1px !important;
            "></div>
          </div>
        `;

        const popup2Content = document.createElement('div');
        popup2Content.innerHTML = getPopupContent(device);

        const popup1 = new PopupClass(position, popup1Content);
        const popup2 = new PopupClass(position, popup2Content);

        popup1.setMap(map);
        popup2.setMap(null);

        const icon = getMarkerIcon(device.lastValidHeading);
        const marker = new google.maps.Marker({
          position,
          map,
          icon: icon || undefined,
        });

        let popup2IsOpen = false;

        marker.addListener('click', () => {
          if (!popup2IsOpen) {
            popup1.setMap(null);
            popup2.setMap(map);
            popup2IsOpen = true;
            
            // Open Street View automatically
            setStreetViewData({
              lat: device.lastValidLatitude,
              lng: device.lastValidLongitude,
              markerId: device.deviceId,
              title: device.deviceId.toUpperCase(),
            });
            setIsStreetViewOpen(true);
          } else {
            popup2.setMap(null);
            popup1.setMap(map);
            popup2IsOpen = false;
            
            // Close Street View
            setIsStreetViewOpen(false);
            setStreetViewData(null);
          }
        });

        // Add close button event listener for popup2
        setTimeout(() => {
          const closeButton = document.querySelector(`#close-btn-${device.deviceId}`);
          if (closeButton) {
            closeButton.addEventListener('click', (e) => {
              e.stopPropagation();
              popup2.setMap(null);
              popup1.setMap(map);
              popup2IsOpen = false;
              setIsStreetViewOpen(false);
              setStreetViewData(null);
            });
          }
        }, 100);

        markerDataRef.current = {
          marker,
          popup1,
          popup2,
        };
      }
    },
    [device, getMarkerIcon, getPopupContent, createPopupClass],
  );

  const handleMapLoad = useCallback(
    (map: google.maps.Map) => {
      if (!window.google?.maps) {
        return;
      }

      mapOnLoad(map);

      // Solo manejar centro externo si se proporciona explícitamente
      if (centro && centro.lat && centro.lng && !resetMap) {
        map.setCenter({ lat: centro.lat, lng: centro.lng });
        map.setZoom(16);
      }

      // Create markers only when Google Maps is ready
      if (device) {
        createMarkerAndPopup(map);
      }

      // Create static markers
      if (marcadores && marcadores.length > 0) {
        createStaticMarkers(map);
      }
    },
    [mapOnLoad, centro, resetMap, createMarkerAndPopup, createStaticMarkers, marcadores],
  );

  const handleMapUnmount = useCallback(() => {
    // Clean up markers
    if (markerDataRef.current) {
      markerDataRef.current.marker.setMap(null);
      markerDataRef.current.popup1.setMap(null);
      markerDataRef.current.popup2.setMap(null);
      if (markerDataRef.current.intervalId) {
        clearInterval(markerDataRef.current.intervalId);
      }
    }
    markerDataRef.current = null;

    // Clean up static markers
    staticMarkersRef.current.forEach((markerData) => {
      markerData.marker.setMap(null);
    });
    staticMarkersRef.current = [];

    iconCache.current = {};
    mapOnUnmount();
  }, [mapOnUnmount]);

  useEffect(() => {
    if (device && mapLoaded && mapRef.current && !hasInitialCentered) {
      const center = {
        lat: device.lastValidLatitude,
        lng: device.lastValidLongitude,
      };
      mapRef.current.setCenter(center);
      mapRef.current.setZoom(15);
      setHasInitialCentered(true);
    }
  }, [mapLoaded, hasInitialCentered]);

  useEffect(() => {
    if (mapRef.current && device && mapLoaded) {
      createMarkerAndPopup(mapRef.current);
    }
  }, [device, createMarkerAndPopup, mapLoaded]);

  useEffect(() => {
    if (mapRef.current && mapLoaded && marcadores.length > 0) {
      createStaticMarkers(mapRef.current);
    }
  }, [marcadores, createStaticMarkers, mapLoaded]);

  const currentStreetViewData =
    streetViewData ||
    (device && isStreetViewOpen
      ? {
          lat: device.lastValidLatitude,
          lng: device.lastValidLongitude,
          markerId: device.deviceId,
          title: device.deviceId.toUpperCase(),
        }
      : null);

  if (!isLoaded) {
    return;
  }

  return (
    <div
      id="map-container"
      className={`relative ${isFullscreen ? 'h-screen w-screen' : 'w-full'}`}
      style={{
        height: isFullscreen ? '100vh' : height,
        backgroundColor: isFullscreen ? '#000' : 'transparent',
        minHeight: height,
      }}
    >
      {/* Botón fullscreen */}
      <div className="absolute right-4 top-4 z-[1000] flex flex-col gap-2">
        <button
          onClick={toggleFullscreen}
          className="rounded-md border border-gray-300 bg-white p-2 shadow-lg transition-colors duration-200 hover:bg-gray-100"
          title={
            isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'
          }
        >
          {isFullscreen ? (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 0 2-2h3M3 16h3a2 2 0 0 0 2 2v3" />
            </svg>
          ) : (
            <svg
              width="20"
              height="20"
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
      </div>

      <GoogleMapComponent
        onLoad={handleMapLoad}
        onUnmount={handleMapUnmount}
        center={initialCenter}
        zoom={6}
      />

      {/* Street View Panel */}
      {currentStreetViewData && isStreetViewOpen && (
        <div
          style={{
            position: 'absolute',
            bottom: '2%',
            left: '2%',
            width: '35%',
            height: '55%',
            backgroundColor: 'white',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            zIndex: 1000,
            border: '2px solid #e0e0e0',
            borderRadius: '8px',
            fontFamily: 'Segoe UI, sans-serif',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '0px 12px',
              borderBottom: '1px solid #e0e0e0',
              backgroundColor: '#fff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              minHeight: '25px',
            }}
          >
            <h3
              style={{
                margin: '0',
                color: '#333',
                fontSize: '13px',
                fontWeight: 'bold',
              }}
            >
              {currentStreetViewData.title}
            </h3>
            <button
              onClick={closeStreetView}
              style={{
                width: '18px',
                height: '18px',
                border: 'none',
                backgroundColor: '#ff4757',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
                fontWeight: 'bold',
              }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Street View Content */}
          <div
            style={{
              position: 'relative',
              height: 'calc(100% - 25px)',
            }}
          >
            {GOOGLE_MAPS_API_KEY ? (
              <iframe
                src={getStreetViewEmbedUrl(
                  currentStreetViewData.lat,
                  currentStreetViewData.lng,
                )}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={`Street View - ${currentStreetViewData.title}`}
              />
            ) : (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '100%',
                  backgroundColor: '#f5f5f5',
                  color: '#666',
                }}
              >
                <p>Street View no disponible - API Key faltante</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom CSS Styles - Simplificado */}
      <style jsx global>{`
        .popup-bubble {
          background: transparent !important;
          box-shadow: none !important;
          border: none !important;
        }

        .popup-container {
          position: absolute;
          z-index: 1000;
        }

        /* Forzar altura específica cuando se pasa una altura pequeña */
        #map-container[style*="30vh"] {
          height: 30vh !important;
          max-height: 30vh !important;
          min-height: 30vh !important;
        }

        #map-container:fullscreen {
          background: #000;
        }

        #map-container:fullscreen .gm-style {
          background: #fff;
        }

        /* Responsividad para pantallas pequeñas */
        @media (max-width: 768px) {
          div[style*='position: absolute'][style*='bottom: 2%'] {
            width: 90% !important;
            height: 50% !important;
            left: 5% !important;
            bottom: 5% !important;
          }
        }

        /* Mejoras visuales para el panel Street View */
        div[style*='position: absolute'][style*='bottom: 2%'] {
          backdrop-filter: blur(10px);
          background: rgba(255, 255, 255, 0.95) !important;
        }
      `}</style>
    </div>
  );
}