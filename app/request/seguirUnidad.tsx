'use client';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Check, Clock, Copy, Link2 } from 'lucide-react';
import GoogleMapComponent from '../components/GoogleMapComponent';
import { useMapInstance } from '@/hooks/useMapInstance';
import { useGoogleMaps } from '@/context/GoogleMapsContext';
import { getMarkerSVG } from '@/app/components/ui/getMarkerSVG';
import '@/app/styles/popup.css';
import { toast, Toaster } from 'sonner';

function sanitize(value: string): string {
  const el = document.createElement('div');
  el.textContent = value;
  return el.innerHTML;
}

let PopupClassCache: (new (position: google.maps.LatLng, content: HTMLElement) => google.maps.OverlayView & { position: google.maps.LatLng; containerDiv: HTMLDivElement }) | null = null;

function getPopupClass() {
  if (PopupClassCache) return PopupClassCache;

  PopupClassCache = class Popup extends google.maps.OverlayView {
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
  } as any;

  return PopupClassCache!;
}

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
  showStreetView?: boolean;
}

interface MarkerData {
  marker: google.maps.Marker;
  popup1: any;
  popup2: any;
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
  showStreetView = true,
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
  const [isStreetViewCollapsed, setIsStreetViewCollapsed] = useState(false);
  const [streetViewData, setStreetViewData] = useState<{
    lat: number;
    lng: number;
    markerId: string;
    title: string;
  } | null>(null);

  const markerDataRef = useRef<MarkerData | null>(null);
  const staticMarkersRef = useRef<StaticMarkerData[]>([]);
  const iconCache = useRef<{ [key: string]: google.maps.Icon }>({});

  const servidorUrl = typeof window !== 'undefined' ? localStorage.getItem('servidorUrl') : null;
  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY_K;


const [shareHours, setShareHours] = useState(4);
const [generatedLink, setGeneratedLink] = useState('');
const [isGeneratingLink, setIsGeneratingLink] = useState(false);

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

// Polling Connection
useEffect(() => {
  let isComponentMounted = true;
  let intervalId: NodeJS.Timeout | null = null;

  const getDeviceIdFromUrl = () => {
    if (typeof window !== 'undefined') {
      return searchParams.get('deviceId');
    }
    return null;
  };

  const fetchDeviceData = async () => {
    const deviceIdFinal = deviceId || getDeviceIdFromUrl();

    if (!isComponentMounted || !deviceIdFinal) {
      return;
    }

    if (
      status !== 'authenticated' ||
      !session?.user?.username ||
      !servidorUrl
    ) {
      return;
    }

    try {
      const username = session.user.username;
      const apiUrl = `${servidorUrl}/api/DeviceList/Unidad/${username}/${deviceIdFinal}`;

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

      // Buscar el dispositivo específico en el array
      const updatedDevice = datosDevice.find(
        (d: Device) => d.deviceId === deviceIdFinal
      );

      if (updatedDevice) {
        setFechaActual(data.fechaActual);
        setDevice(updatedDevice);
      }
    } catch (error) {
      console.error('Error obteniendo datos del dispositivo:', error);
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

  fetchDeviceData();
  intervalId = setInterval(fetchDeviceData, 8000);

  return () => {
    isComponentMounted = false;

    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }

    document.removeEventListener('visibilitychange', handleVisibilityChange);
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

    return `${day}/${month}/${year} ${hours}:${minutes}`;
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


  const getPopupContent = useCallback(
    (device: Device) => {
      const safeDeviceId = sanitize(device.deviceId);
      const safeDireccion = sanitize(device.direccion);
      const speed = device.lastValidSpeed.toFixed(0);
      const estado = getEstado(device.lastValidSpeed);
      const isMoving = device.lastValidSpeed > 0;
      const statusColor = isMoving ? '#008000' : '#ef4444';
      const statusBg = isMoving ? '#dcfce7' : '#fee2e2';
      const statusDot = isMoving ? '#008000' : '#ef4444';

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
            <div style="font-size: 9px !important; color: #64748b !important; text-transform: uppercase !important; letter-spacing: 0.5px !important;">Km/h</div>
          </div>
          <div style="background: ${statusBg} !important; border: 1px solid ${isMoving ? '#bbf7d0' : '#fecaca'} !important; border-radius: 4px !important; padding: 6px 8px !important; text-align: center !important;">
            <div style="font-size: 11px !important; font-weight: 600 !important; color: #000000 !important;">${estado}</div>
            <div style="font-size: 9px !important; color: #000000 !important; opacity: 0.6 !important; text-transform: uppercase !important; letter-spacing: 0.5px !important;">Estado</div>
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
            <span style="color: #475569 !important; font-size: 11px !important; font-weight: 500 !important;">${formatFecha(fechaActual)}</span>
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

      const PopupClass = getPopupClass();
      if (!PopupClass) return;

      const position = new google.maps.LatLng(
        device.lastValidLatitude,
        device.lastValidLongitude,
      );

      if (markerDataRef.current) {
        const markerData = markerDataRef.current;

        markerData.marker.setPosition(position);
        markerData.popup1.position = position;
        markerData.popup2.position = position;

        map.panTo({
          lat: device.lastValidLatitude - 0.0035,
          lng: device.lastValidLongitude,
        });

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
        const safeId = sanitize(device.deviceId);
        const popup1Content = document.createElement('div');
        popup1Content.innerHTML = `
          <div style="display:flex; flex-direction:column; align-items:center; margin-top:12px;">
            <div id="content" style="
              background: #113EB9 !important;
              color: #f8fafc !important;
              padding: 5px 12px !important;
              font-size: 12px !important;
              font-weight: 600 !important;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
              border-radius: 3px !important;
              letter-spacing: 0.4px !important;
              box-shadow: 0 2px 8px rgba(0,0,0,0.15) !important;
            ">${safeId.toUpperCase()}</div>
            <div style="width:0; height:0; border-left:6px solid transparent; border-right:6px solid transparent; border-top:6px solid #113EB9; margin-top:-1px;"></div>
          </div>
        `;

        const popup2Content = document.createElement('div');
        popup2Content.innerHTML = getPopupContent(device);

        const popup1 = new PopupClass(position, popup1Content);
        const popup2 = new PopupClass(position, popup2Content);

        popup1.setMap(map);
        popup2.setMap(map);

        setStreetViewData({
          lat: device.lastValidLatitude,
          lng: device.lastValidLongitude,
          markerId: device.deviceId,
          title: device.deviceId.toUpperCase(),
        });
        setIsStreetViewOpen(true);

        const icon = getMarkerIcon(device.lastValidHeading);
        const marker = new google.maps.Marker({
          position,
          map,
          icon: icon || undefined,
        });

        let popup2IsOpen = true;

        marker.addListener('click', () => {
          if (!popup2IsOpen) {
            popup1.setMap(null);
            popup2.setMap(map);
            popup2IsOpen = true;
          } else {
            popup2.setMap(null);
            popup1.setMap(map);
            popup2IsOpen = false;
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
    [device, getMarkerIcon, getPopupContent],
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
    if (markerDataRef.current) {
      markerDataRef.current.marker.setMap(null);
      markerDataRef.current.popup1.setMap(null);
      markerDataRef.current.popup2.setMap(null);
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
      mapRef.current.setCenter({
        lat: device.lastValidLatitude - 0.0035,
        lng: device.lastValidLongitude,
      });
      mapRef.current.setZoom(16);
      setHasInitialCentered(true);
    }
  }, [device, mapLoaded, hasInitialCentered]);

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
    (device
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

const handleGenerateLink = async () => {
  if (!device || !session?.user?.username) {
      toast.error('No hay datos del dispositivo');

    return;
  }

  setIsGeneratingLink(true);
  
  try {
    // Generar token único usando timestamp + random + deviceId
    const timestamp = Date.now(); // Milisegundos desde 1970
    const randomPart = Math.random().toString(36).substring(2, 10); // 8 caracteres aleatorios
    const devicePart = device.deviceId.substring(0, 4).replace(/[^a-zA-Z0-9]/g, ''); // Primeros 4 chars del device
    const uniqueToken = `${devicePart}-${timestamp}-${randomPart}`;
    
    // Convertir horas a minutos
    const duracionMinutos = shareHours * 60;
    
    const response = await fetch('https://do.velsat.pe:2083/api/Preplan/Generarlink', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: uniqueToken,
        deviceId: device.deviceId,
        username: session.user.username,
        duracionMinutos: duracionMinutos,
      }),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Generar el link con el token único
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/trackvelnew/seguimientounidad?token=${uniqueToken}`;
    setGeneratedLink(link);
    
  } catch (error) {

      toast.error('Error generando el link de seguimiento');

  } finally {
    setIsGeneratingLink(false);
  }
};
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
      <Toaster richColors />

      <div className="absolute right-3 top-3 z-[1000] flex flex-col gap-1.5">
        <button
          onClick={toggleFullscreen}
          className="rounded border border-slate-200 bg-white p-1.5 shadow-sm transition-colors hover:bg-slate-50"
          title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
        >
          {isFullscreen ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 0 2-2h3M3 16h3a2 2 0 0 0 2 2v3" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          )}
        </button>
      </div>



{session?.user?.username === 'movilbus' && (
  <div className="absolute left-3 top-3 z-[1000] bg-white rounded-md shadow-lg overflow-hidden w-64 border border-slate-200">
    <div className="bg-slate-900 px-3 py-2 flex items-center justify-between">
      <h3 className="text-[11px] font-semibold text-slate-100 flex items-center gap-1.5 tracking-wide uppercase">
        <Link2 size={13} className="text-slate-400" />
        Compartir
      </h3>
      <span className="text-[9px] text-slate-400">Max 24h</span>
    </div>

    <div className="p-3 space-y-2.5">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="number"
            value={shareHours}
            onChange={(e) => setShareHours(Number(e.target.value))}
            onKeyDown={(e) => e.preventDefault()}
            min="1"
            max="24"
            className="w-full px-3 py-1.5 pr-12 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 transition-all"
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
            horas
          </span>
        </div>
        <button
          onClick={handleGenerateLink}
          disabled={isGeneratingLink || !device}
          className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white px-3 py-1.5 rounded text-[10px] font-medium transition-colors flex items-center gap-1 whitespace-nowrap"
        >
          {isGeneratingLink ? (
            <div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent"></div>
          ) : (
            <Link2 size={12} />
          )}
          Generar
        </button>
      </div>

      {generatedLink && (
        <div className="bg-slate-50 p-2 rounded border border-slate-200">
          <div className="flex gap-1.5">
            <input
              type="text"
              value={generatedLink}
              readOnly
              className="flex-1 px-2 py-1 text-[10px] bg-white border border-slate-200 rounded font-mono text-slate-600 focus:outline-none truncate"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(generatedLink);
                toast.success('Link copiado');
              }}
              className="bg-slate-900 hover:bg-slate-700 text-white px-2 py-1 rounded text-[10px] font-medium transition-colors flex items-center gap-1"
              title="Copiar"
            >
              <Copy size={11} />
            </button>
          </div>
          <p className="text-[9px] text-slate-500 mt-1.5 flex items-center gap-1">
            <Check size={10} className="text-emerald-500" />
            Expira en {shareHours}h
          </p>
        </div>
      )}
    </div>
  </div>
)}




      <GoogleMapComponent
        onLoad={handleMapLoad}
        onUnmount={handleMapUnmount}
        center={initialCenter}
        zoom={6}
      />

      {currentStreetViewData && (
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            left: '10px',
            width: '18%',
            height: '24%',
            minWidth: '180px',
            minHeight: '120px',
            backgroundColor: '#fff',
            boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
            border: '3px solid #ffffff',
            borderRadius: '6px',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            {GOOGLE_MAPS_API_KEY ? (
              <iframe
                src={getStreetViewEmbedUrl(currentStreetViewData.lat, currentStreetViewData.lng)}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={`Street View - ${currentStreetViewData.title}`}
              />
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', backgroundColor: '#f8fafc', color: '#64748b', fontSize: '11px' }}>
                Street View no disponible
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