'use client';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { X, AlertCircle, Clock8 } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { Spinner } from '@nextui-org/react';
const POLLING_INTERVAL = 10000; // 10 segundos

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

interface ApiResponse {
  datosDevice: Device[];
  fechaActual: FechaActual;
}

interface MarkerData {
  marker: google.maps.Marker;
  popup1: any;
  popup2: any;
}

interface TokenData {
  token: string;
  deviceId: string;
  username: string;
  duracionMinutos: number;
  creationdate: string;
  expirationdate: string;
}

const SeguimientoUnidad = () => {
  const searchParams = useSearchParams();
  const [device, setDevice] = useState<Device | null>(null);
  const [currentDateTime, setCurrentDateTime] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [isValidatingToken, setIsValidatingToken] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerDataRef = useRef<MarkerData | null>(null);
  const iconCache = useRef<{ [key: string]: google.maps.Icon }>({});

  // Validar token al cargar
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
        
        // Verificar si el token ha expirado
        const expirationDate = new Date(data.expirationdate);
        const now = new Date();

        if (now > expirationDate) {
          setTokenError('La sesión ha expirado. Por favor solicita un nuevo enlace de seguimiento.');
          setIsValidatingToken(false);
          return;
        }

        // Token válido
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

  // Calcular tiempo restante
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

  // Actualizar fecha y hora del sistema cada segundo
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      
      setCurrentDateTime(`${day}/${month}/${year} ${hours}:${minutes}:${seconds}`);
    };

    updateDateTime();
    const intervalId = setInterval(updateDateTime, 1000);

    return () => clearInterval(intervalId);
  }, []);

  // Cargar Google Maps Script
  useEffect(() => {
    const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY_K;
    
    if (!GOOGLE_MAPS_API_KEY) {
      console.error('Google Maps API Key no encontrada');
      return;
    }

    if (window.google?.maps) {
      setIsLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setIsLoaded(true);
    script.onerror = () => console.error('Error cargando Google Maps');
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  // Polling de datos cada 10 segundos
  useEffect(() => {
    if (!tokenData || tokenError) return;

    let intervalId: NodeJS.Timeout | null = null;
    let isComponentMounted = true;

    const fetchDeviceData = async () => {
      if (!isComponentMounted) return;

      // Verificar expiración antes de hacer fetch
      const expirationDate = new Date(tokenData.expirationdate);
      const now = new Date();

      if (now > expirationDate) {
        setTokenError('La sesión ha expirado. Por favor solicita un nuevo enlace de seguimiento.');
        if (intervalId) clearInterval(intervalId);
        return;
      }

      try {
        const API_URL = `https://do.velsat.pe:2083/api/DeviceList/Unidad/${tokenData.username}/${tokenData.deviceId}`;
        
        const response = await fetch(API_URL, {
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

        const data: ApiResponse = await response.json();

        if (!isComponentMounted) return;

        if (data.datosDevice && data.datosDevice.length > 0) {
          setDevice(data.datosDevice[0]);
        }
      } catch (error) {
        console.error('Error obteniendo datos:', error);
      }
    };

    fetchDeviceData();
    intervalId = setInterval(fetchDeviceData, POLLING_INTERVAL);

    return () => {
      isComponentMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [tokenData, tokenError]);

  // Utilidades
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
      : { url: '/up.webp', scaledSize: new google.maps.Size(25, 35) };

    iconCache.current[cacheKey] = icon;
    return icon;
  }, []);

  const getEstado = useCallback((speed: number) => {
    return speed > 0 ? 'En Movimiento' : 'Estacionado';
  }, []);

  // Clase Popup personalizada
  const createPopupClass = useCallback(() => {
    if (!window.google?.maps) return null;

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
        const popupWidth = this.containerDiv.offsetWidth || 300;
        
        this.containerDiv.style.left = `${divPosition.x - (popupWidth / 2)}px`;
        this.containerDiv.style.top = `${divPosition.y - 35}px`;  
      }
    }

    return Popup;
  }, []);

  // Contenido del popup de placa (popup1)
  const getPopup1Content = useCallback((device: Device) => {
    return `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-top: 16px;
        position: relative;
      ">
        <div style="
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
  }, []);

  // Contenido del popup detallado (popup2)
  const getPopup2Content = useCallback((device: Device, currentTime: string) => {
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
        margin-top: 16px !important;
      " id="content-popup-${device.deviceId}">
        <button id="close-btn-${device.deviceId}" style="
          position: absolute !important;
          top: 8px !important;
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
            <strong style="color: #86efac !important; margin-left: 4px !important;">${device.lastValidSpeed.toFixed(0)} Km/h</strong>
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
          <strong>ÚLTIMO REPORTE</strong>
        </h4>
        
        <div style="background-color: #374151 !important; padding: 8px !important; border-radius: 4px !important;">
          <div style="margin-bottom: 5px !important;">
            <span style="color: #d1d5db !important; font-size: 12px !important;">
              Fecha: <span style="color: #ffffff !important; font-weight: 500 !important;" id="datetime-${device.deviceId}">${currentTime}</span>
            </span>
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
  }, [getDireccion, getEstado]);

  // Crear/actualizar marcador
  const createOrUpdateMarker = useCallback((map: google.maps.Map) => {
    if (!device || !window.google?.maps) return;

    const PopupClass = createPopupClass();
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

      const newIcon = getMarkerIcon(device.lastValidHeading);
      if (newIcon) {
        markerData.marker.setIcon(newIcon);
      }

      const popup2Element = document.querySelector(`#content-popup-${device.deviceId}`) as HTMLElement;
      if (popup2Element) {
        const newContent = getPopup2Content(device, currentDateTime);
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = newContent;
        const newPopupContent = tempDiv.firstElementChild as HTMLElement;
        
        if (newPopupContent) {
          popup2Element.parentNode?.replaceChild(newPopupContent, popup2Element);
          
          setTimeout(() => {
            const closeButton = document.querySelector(`#close-btn-${device.deviceId}`);
            if (closeButton) {
              closeButton.addEventListener('click', (e) => {
                e.stopPropagation();
                markerData.popup2.setMap(null);
                markerData.popup1.setMap(map);
              });
            }
          }, 10);
        }
      } else {
        const datetimeElement = document.querySelector(`#datetime-${device.deviceId}`);
        if (datetimeElement) {
          datetimeElement.textContent = currentDateTime;
        }
      }
    } else {
      const popup1Content = document.createElement('div');
      popup1Content.innerHTML = getPopup1Content(device);

      const popup2Content = document.createElement('div');
      popup2Content.innerHTML = getPopup2Content(device, currentDateTime);

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
        } else {
          popup2.setMap(null);
          popup1.setMap(map);
          popup2IsOpen = false;
        }
      });

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

      markerDataRef.current = { marker, popup1, popup2 };
      
      map.setCenter(position);
      map.setZoom(15);
    }
  }, [device, getMarkerIcon, getPopup1Content, getPopup2Content, createPopupClass, currentDateTime]);

  // Inicializar mapa
  useEffect(() => {
    if (!isLoaded || !device || tokenError) return;

    const initMap = () => {
      const mapElement = document.getElementById('map');
      if (!mapElement || mapRef.current) return;

      const map = new google.maps.Map(mapElement, {
        center: { lat: device.lastValidLatitude, lng: device.lastValidLongitude },
        zoom: 15,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
      });

      mapRef.current = map;
      createOrUpdateMarker(map);
    };

    initMap();
  }, [isLoaded, device, createOrUpdateMarker, tokenError]);

  // Actualizar marcador
  useEffect(() => {
    if (mapRef.current && device && !tokenError) {
      createOrUpdateMarker(mapRef.current);
    }
  }, [device, currentDateTime, createOrUpdateMarker, tokenError]);

  // Pantalla de carga
  if (isValidatingToken) {
    return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 relative overflow-hidden">
  {/* Efectos de fondo animados */}
  <div className="absolute inset-0 overflow-hidden">
    <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-blue-400/10 to-transparent rounded-full blur-3xl animate-pulse"></div>
    <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-indigo-400/10 to-transparent rounded-full blur-3xl animate-pulse delay-1000"></div>
  </div>

  {/* Card principal */}
  <div className="relative z-10 text-center bg-white/80 backdrop-blur-xl p-10 rounded-3xl shadow-2xl border border-white/20 max-w-md">
    {/* Spinner de Next UI */}
    <div className="mb-6">
      <Spinner 
        size="lg" 
        color="primary"
        className="mx-auto"
      />
    </div>

    {/* Título */}
    <h2 className="text-2xl font-bold text-gray-800 mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
      Validando Acceso
    </h2>

    {/* Descripción */}
    <p className="text-gray-600 text-base font-medium mb-4">
      Verificando enlace de seguimiento...
    </p>

    {/* Indicador de progreso */}
    <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
     
      <span className="font-medium">Procesando</span>
    </div>
  </div>
</div>
    );
  }

  // Pantalla de error
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

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando mapa...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen">
          <Toaster position="top-right" richColors />

      {/* Indicador de tiempo restante */}
{timeRemaining && timeRemaining !== 'Expirado' && (
  <div className="absolute bottom-4 left-4 z-[1000]">
    <div className="bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600 text-white px-5 py-3 rounded-xl shadow-2xl backdrop-blur-sm border border-white/20">
      <div className="flex items-center gap-3">
        <div className="bg-white/20 p-2 rounded-lg backdrop-blur-md">
          <Clock8 className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <p className="text-xs font-bold text-white uppercase">
            Sesión activa
          </p>
          <p className="text-sm font-bold text-white mt-0.5">
            {timeRemaining}
          </p>
        </div>
      </div>
   
    </div>
  </div>
)}
      <div id="map" className="w-full h-full"></div>

      <style jsx global>{`
        .popup-bubble {
          background: transparent !important;
          box-shadow: none !important;
          border: none !important;
        }

        .popup-container {
          position: absolute;
          z-index: 1000;
          transform: translateY(-100%);
        }
      `}</style>
    </div>
  );
};

export default SeguimientoUnidad;