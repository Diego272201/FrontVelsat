'use client';
import React, {
  useCallback,
  useEffect,
  useState,
  useRef,
  useMemo,
} from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import '@/app/styles/popup.css';
import Sidebar from '../components/Sidebar';
import * as signalR from '@microsoft/signalr';
import { useSession } from 'next-auth/react';
import Loader from '../components/Loader';
import { useApi } from '@/context/ApiContext';
import dynamic from 'next/dynamic';

const blinkingIntervals: { [key: string]: NodeJS.Timeout } = {};

const DynamicGoogleMap = dynamic(
  () => import('@react-google-maps/api').then((mod) => mod.GoogleMap),
  { ssr: false },
);

const libraries: 'places'[] = ['places'];

const containerStyle = {
  width: '100%',
  height: '100vh',
};

const center = {
  lat: -9.22812,
  lng: -75.78894,
};

interface DeviceList {
  deviceId: string;
  lastValidLatitude: number;
  lastValidLongitude: number;
  lastValidSpeed: number;
  direccion: string;
  lastValidHeading: number;
  lastOdometerKM: number;
  odometerini: number;
  kmini: number;
  rutaact: string;
  servicio: string;
  ultimoServicio?: {
    conductor?: {
      apepate?: string;
    };
    numero?: string;
    empresa?: string;
    tipo?: string;
  };
}

interface MarkerData {
  marker: google.maps.Marker;
  popup1: any;
  popup2: any;
  intervalId?: NodeJS.Timeout;
}

export default function RequestPage() {
  const isClient = typeof window !== 'undefined';

  const openStreetView = useCallback((lat: number, lng: number) => {
    // URL que abre directamente en Street View (vista de calles)
    const streetViewUrl = `https://www.google.com/maps/@${lat},${lng},3a,75y,90t/data=!3m6!1e1!3m4!1s0:0!2e0!7i16384!8i8192`;

    window.open(streetViewUrl, '_blank');
  }, []);

  const { data: session, status } = useSession();
  const [deviceList, setDeviceList] = useState<DeviceList[]>([]);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersDataRef = useRef<{ [key: string]: MarkerData }>({});
  const [markersLoaded, setMarkersLoaded] = useState(false);
  const clickListenerAttached = useRef<boolean>(false);

  const { baseUrl } = useApi();

  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  const [filteredIdsFromSidebar, setFilteredIdsFromSidebar] = useState<
    string[] | null
  >(null);

  const iconCache = useRef<{ [key: string]: google.maps.Icon }>({});

  useEffect(() => {
    console.log('Unidades filtradas desde Sidebar:', filteredIdsFromSidebar);
  }, [filteredIdsFromSidebar]);

  useEffect(() => {
    const connectSignalR = async () => {
      if (!session?.user?.username || !baseUrl) return;

      const username = session.user.username;
      const hubUrl = `${baseUrl}/dataHubDevice?username=${username}`;

      const connection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl)
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.Information)
        .build();

      try {
        await connection.start();
        await connection.invoke('UnirGrupo', username);
        console.log(`Conectado a SignalR con el grupo ${username}`);

        connection.on('ActualizarDatos', (datos) => {
          setMarkersLoaded(true);
          setDeviceList(datos.datosDevice);
        });
      } catch (err) {
        console.error('Error al conectar con SignalR:', err);
      }
    };

    connectSignalR();
  }, [session, baseUrl]);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
    libraries,
  });

  useEffect(() => {
    if (!isClient) return;

    if (isLoaded) {
      setMapLoaded(true);
    }
  }, [isLoaded, isClient]);

  // Funciones optimizadas con memoización
  const getDireccion = useCallback((heading: number): string => {
    const directions = [
      [0, 22.5, 'Norte'],
      [22.51, 67.5, 'Noreste'],
      [67.51, 112.5, 'Este'],
      [112.51, 157.5, 'Sureste'],
      [157.51, 202.5, 'Sur'],
      [202.51, 247.5, 'Suroeste'],
      [247.51, 292.5, 'Oeste'],
      [292.51, 337.5, 'Noroeste'],
      [337.51, 360.0, 'Norte'],
    ] as const;

    const direction = directions.find(
      ([min, max]) => heading >= min && heading <= max,
    );
    return direction ? direction[2] : 'Desconocido';
  }, []);

  const getMarkerIcon = useCallback(
    (heading: number) => {
      if (!isClient) return null;

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
            scaledSize: new google.maps.Size(
              direction.size[0],
              direction.size[1],
            ),
          }
        : { url: '/unknown.png', scaledSize: new google.maps.Size(42, 25) };

      iconCache.current[cacheKey] = icon;
      return icon;
    },
    [isClient],
  );

  const getEstado = useCallback(
    (speed: number) => (speed < 10 ? 'Estacionado' : 'Movimiento'),
    [],
  );

  const getColorScheme = useCallback(
    (device: DeviceList) => {
      const isMovilbusUser = session?.user?.username === 'movilbus';

      // Si NO es movilbus, usar color por defecto (naranja original)
      if (!isMovilbusUser) {
        return {
          popup1: {
            bgColor: 'bg-[#fca311]',
            textColor: 'text-gray-800',
            borderColor: 'border-[#fca311]',
            triangleColor: 'border-t-[#fca311]',
          },
          popup2: {
            bgColor: 'bg-[#1f2937]',
            textColor: 'text-white',
            borderColor: 'border-black',
            closeButtonColor: 'text-white hover:text-gray-300',
            linkColor: 'text-blue-300 hover:text-blue-100',
          },
        };
      }

      // Lógica de colores basada en servicio y velocidad para movilbus
      let popup1Colors, popup2Colors;

      if (device.servicio) {
        // Tiene servicio - Color rojo
        popup1Colors = {
          bgColor: 'bg-[#ffccd5]',
          textColor: 'text-black',
          borderColor: 'border-[#ffccd5]',
          triangleColor: 'border-t-[#ffccd5]',
        };
        popup2Colors = {
          bgColor: 'bg-[#ffccd5]',
          textColor: 'text-black',
          borderColor: 'border-[#ffccd5]',
          closeButtonColor: 'text-white hover:text-gray-300',
          linkColor: 'text-blue-300 hover:text-blue-100',
        };
      } else if (!device.servicio && device.lastValidSpeed < 1) {
        // Sin servicio y velocidad < 1 - Color verde
        popup1Colors = {
          bgColor: 'bg-[#8fd694]',
          textColor: 'text-black',
          borderColor: 'border-[#8fd694]',
          triangleColor: 'border-t-[#8fd694]',
        };
        popup2Colors = {
          bgColor: 'bg-[#8fd694]',
          textColor: 'text-black',
          borderColor: 'border-[#8fd694]',
          closeButtonColor: 'text-white hover:text-gray-300',
          linkColor: 'text-blue-300 hover:text-blue-100',
        };
      } else {
        // Sin servicio y velocidad >= 1 - Color naranja (para parpadeo)
        popup1Colors = {
          bgColor: 'bg-[#ffd670]',
          textColor: 'text-black',
          borderColor: 'border-[#ffd670]',
          triangleColor: 'border-t-[#ffd670]',
        };
        popup2Colors = {
          bgColor: 'bg-[#ffd670]',
          textColor: 'text-black',
          borderColor: 'border-[#ffd670]',
          closeButtonColor: 'text-white hover:text-gray-300',
          linkColor: 'text-blue-300 hover:text-blue-100',
        };
      }

      return {
        popup1: popup1Colors,
        popup2: popup2Colors,
      };
    },
    [session?.user?.username],
  );

  // Función optimizada para crear/actualizar marcadores
  const updateMarkersAndPopups = useCallback(
    (map: google.maps.Map) => {
      if (!map || !isClient) return;

      const filteredDeviceList = filteredIdsFromSidebar
        ? deviceList.filter((device) =>
            filteredIdsFromSidebar.includes(device.deviceId),
          )
        : deviceList;

      // Remover marcadores que ya no están en el filtro
      if (filteredIdsFromSidebar) {
        Object.keys(markersDataRef.current).forEach((deviceId) => {
          if (!filteredIdsFromSidebar.includes(deviceId)) {
            const markerData = markersDataRef.current[deviceId];
            markerData.marker.setMap(null);
            markerData.popup1.setMap(null);
            markerData.popup2.setMap(null);

            if (markerData.intervalId) {
              clearInterval(markerData.intervalId);
            }

            // Limpiar elementos DOM
            const content1 = document.querySelector(`#content-${deviceId}`);
            const content2 = document.querySelector(`#content2-${deviceId}`);
            content1?.remove();
            content2?.remove();

            delete markersDataRef.current[deviceId];
          }
        });
      }

      // Actualizar o crear marcadores
      filteredDeviceList.forEach((device) => {
        const position = new google.maps.LatLng(
          device.lastValidLatitude,
          device.lastValidLongitude,
        );

        const existingMarkerData = markersDataRef.current[device.deviceId];

        if (existingMarkerData) {
          // Solo actualizar posición e icono si es necesario
          if (!existingMarkerData.marker.getPosition()?.equals(position)) {
            existingMarkerData.marker.setPosition(position);
            existingMarkerData.popup1.position = position;
            existingMarkerData.popup2.position = position;
          }

          const newIcon = getMarkerIcon(device.lastValidHeading);
          if (newIcon && existingMarkerData.marker.getIcon() !== newIcon) {
            existingMarkerData.marker.setIcon(newIcon);
          }

          // Actualizar contenido del popup2
          updatePopupContent(device, existingMarkerData);
        } else {
          // Crear nuevo marcador
          createNewMarker(device, position, map);
        }
      });
    },
    [
      deviceList,
      filteredIdsFromSidebar,
      getMarkerIcon,
      getEstado,
      getDireccion,
      isClient,
    ],
  );

  // Función para generar contenido del popup simplificado
  const getOptimizedPopupContent = useCallback(
    (device: DeviceList) => {
      const fechaActualHoy = new Date();
      const day = String(fechaActualHoy.getDate()).padStart(2, '0');
      const month = String(fechaActualHoy.getMonth() + 1).padStart(2, '0');
      const year = fechaActualHoy.getFullYear();
      const hours = String(fechaActualHoy.getHours()).padStart(2, '0');
      const minutes = String(fechaActualHoy.getMinutes()).padStart(2, '0');
      const seconds = String(fechaActualHoy.getSeconds()).padStart(2, '0');

      const colorScheme = getColorScheme(device);
      const kilometraje =
        device.lastOdometerKM - device.odometerini + device.kmini;
      const isMovilbusUser = session?.user?.username === 'movilbus';

      // Obtener datos del servicio
      const hasUltimoServicio = device.ultimoServicio !== null;
      const conductor = hasUltimoServicio
        ? device.ultimoServicio?.conductor?.apepate || 'Sin asignar'
        : null;
      const numero = hasUltimoServicio
        ? device.ultimoServicio?.numero || ''
        : '';
      const empresa = hasUltimoServicio
        ? device.ultimoServicio?.empresa || ''
        : '';
      const tipoRaw = hasUltimoServicio
        ? device.ultimoServicio?.tipo || ''
        : '';
      const tipo = tipoRaw === 'I' ? 'INGRESO' : 'SALIDA';
      const servicioCompleto =
        hasUltimoServicio && numero && empresa
          ? `${numero} ${empresa} (${tipo})`
          : null;

      return `
        <div class="${colorScheme.popup2.bgColor} ${colorScheme.popup2.textColor} text-[12px] flex flex-col w-[290px] rounded border ${colorScheme.popup2.borderColor} shadow-lg" id="content2-${device.deviceId}">
          <h3 class="popup-title font-bold flex items-center justify-between" style="border-bottom: 1px solid #6c757d; background-color: #1f2937; color: #ffffff;">
            <button id="close-btn-${device.deviceId}" class="popup-close-btn text-sm ${colorScheme.popup2.closeButtonColor}">X</button>
             
            UNIDAD: ${device.deviceId.toUpperCase()}

            <div style="display: flex; align-items: center;">
              <div class="radar-container">
                <div class="radar-point"></div>
                <div class="radar-wave radar-wave-1"></div>
                <div class="radar-wave radar-wave-2"></div>
                <div class="radar-wave radar-wave-3"></div>
              </div>
              <span style="font-size: 12px; color: #38b000;">Online</span>
            </div>
          </h3>

          ${conductor ? `<p class="px-2"><strong>Conductor:</strong> <span class="conductor-value">${conductor}</span></p>` : ''}
          ${servicioCompleto ? `<p class="px-2"><strong>Servicio Actual:</strong> <span class="servicio-value">${servicioCompleto}</span></p><br>` : ''}

          <p class="px-2"><strong>Velocidad:</strong> <span class="speed-value">${Math.round(device.lastValidSpeed)} Km/h</span></p>
          <p class="px-2"><strong>Estado:</strong> <span class="state-value">${getEstado(device.lastValidSpeed)}</span></p>
          ${isMovilbusUser ? `<p class="px-2"><strong>Kilometraje:</strong> <span class="kilometraje-value">${kilometraje.toFixed(2)} Km</span></p>` : ''}
          <br>

          <h4 class="px-2 font-bold uppercase" style="#fff">Último Reporte</h4>
          <p class="px-2" id="fecha-${device.deviceId}">
            <strong>Fecha:</strong> ${day}/${month}/${year} <strong>Hora:</strong> ${hours}:${minutes}:${seconds}
          </p>        
          <span class="px-2"><strong>Dirección:</strong> <span class="direction-value">${getDireccion(device.lastValidHeading)}</span></span>
          <span class="px-2"><strong>Ubicación:</strong> <span class="location-value">${device.direccion}</span></span>
          <div style="display: flex; padding: 12px 8px 12px 8px; gap: 8px;">

          <a href="" class="street-view-link" style="width: 50% !important; height: 32px !important; background-color: ${isMovilbusUser ? '#6b7280' : '#c2410c'} !important; color: white !important; padding: 6px 8px !important; border-radius: 4px !important; text-align: center !important; text-decoration: none !important; display: flex !important; align-items: center !important; justify-content: center !important; transition: background-color 0.3s !important; font-size: 11px !important; margin: 0 !important;" ${isMovilbusUser ? '' : `onmouseover="this.style.backgroundColor='#c2410c'" onmouseout="this.style.backgroundColor='#ea580c'"`} data-lat="${device.lastValidLatitude}" data-lng="${device.lastValidLongitude}">
            <svg style="width: 14px; height: 14px; margin-right: 3px;" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            </svg>
            <span>Vista 3D</span>
          </a>

          <a href="" class="follow-link" style="width: 50% !important; height: 32px !important; background-color: #2563eb !important; color: white !important; padding: 6px 8px !important; border-radius: 4px !important; text-align: center !important; text-decoration: none !important; display: flex !important; align-items: center !important; justify-content: center !important; transition: background-color 0.3s !important; font-size: 11px !important; margin: 0 !important;" onmouseover="this.style.backgroundColor='#1d4ed8'" onmouseout="this.style.backgroundColor='#2563eb'" data-device-id="${device.deviceId}">
            <svg style="width: 14px; height: 14px; margin-right: 3px;" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg> 
            <span>Seguir Unidad</span>
          </a>
        </div>
      </div>
      `;
    },
    [getEstado, getDireccion, getColorScheme],
  );

  const createNewMarker = useCallback(
    (
      device: DeviceList,
      position: google.maps.LatLng,
      map: google.maps.Map,
    ) => {
      const colorScheme = getColorScheme(device);

      // ✅ FUNCIÓN COMPLETA para extraer colores (igual que en updatePopupContent)
      const extractColor = (bgColorClass: string): string => {
        const colorMap: { [key: string]: string } = {
          // Colores de fondo
          'bg-red-500': '#ef4444',
          'bg-green-500': '#22c55e',
          'bg-orange-500': '#ffd670',
          'bg-red-600': '#dc2626',
          'bg-green-600': '#16a34a',
          'bg-orange-600': '#ffd670',
          'bg-[#fca311]': '#fca311',
          'bg-[#1f2937]': '#1f2937',
          'bg-[#ffccd5]': '#ffccd5',
          'bg-[#8fd694]': '#8fd694',
          'bg-[#ffd670]': '#ffd670',

          // ✅ AGREGAR mapeos de borde (FALTABAN ESTOS)
          'border-red-500': '#ef4444',
          'border-green-500': '#22c55e',
          'border-orange-500': '#ffd670', // ✅ CAMBIO: Nuevo naranja suave
          'border-red-600': '#dc2626',
          'border-green-600': '#16a34a',
          'border-orange-600': '#ffd670', // ✅ CAMBIO: Nuevo naranja suave
          'border-[#fca311]': '#fca311',
          'border-[#1f2937]': '#1f2937',
          'border-[#ffccd5]': '#ffccd5',
          'border-[#8fd694]': '#8fd694',
          'border-[#ffd670]': '#ffd670',
          'border-black': '#000000',

          // Mapeos de triángulos (actualizados)
          'border-t-red-500': '#ef4444',
          'border-t-green-500': '#22c55e',
          'border-t-orange-500': '#ffd670',
          'border-t-red-600': '#dc2626',
          'border-t-green-600': '#16a34a',
          'border-t-orange-600': '#ffd670',
          'border-t-[#fca311]': '#fca311',
          'border-t-[#1f2937]': '#1f2937',
          'border-t-[#ffccd5]': '#ffccd5',
          'border-t-[#8fd694]': '#8fd694',
          'border-t-[#ffd670]': '#ffd670',
        };
        return colorMap[bgColorClass] || '#fca311';
      };

      // FUNCIÓN PARA EXTRAER COLOR DE TEXTO
      const extractTextColor = (textColorClass: string): string => {
        if (textColorClass === 'text-black') return 'black';
        if (textColorClass === 'text-gray-800') return '#1f2937';
        if (textColorClass === 'text-white') return 'white';
        return 'black';
      };

      // ✅ EXTRAER colores correctos (fondo Y borde por separado)
      const popup1BgColor = extractColor(colorScheme.popup1.bgColor);
      const popup1BorderColor = extractColor(colorScheme.popup1.borderColor); // ← AGREGAR ESTA LÍNEA
      const popup1TextColor = extractTextColor(colorScheme.popup1.textColor);
      const triangleColor = extractColor(colorScheme.popup1.triangleColor);

      // Crear popup1 (etiqueta) con colores correctos desde el inicio
      const content1 = document.createElement('div');
      content1.id = `content-${device.deviceId}`;
      content1.innerHTML = `
      <div class="relative flex flex-col items-center mt-4">
        <div id="content" style="background-color: ${popup1BgColor}; color: ${popup1TextColor}; border-color: ${popup1BorderColor};" class="px-2 py-1.5 border">
          ${device.deviceId.toUpperCase()}
        </div>
        <div id="triangle-${device.deviceId}" class="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent" style="border-top-color: ${triangleColor} !important;"></div>
      </div>
    `;

      // Crear popup2 (información detallada)
      const content2 = document.createElement('div');
      content2.innerHTML = getOptimizedPopupContent(device);

      // ✅ APLICAR colores al popup2 con borde correcto
      const popup2Element = content2.firstElementChild as HTMLElement;
      if (popup2Element) {
        const popup2BgColor = extractColor(colorScheme.popup2.bgColor);
        const popup2BorderColor = extractColor(colorScheme.popup2.borderColor); // ← AGREGAR ESTA LÍNEA
        const popup2TextColor = extractTextColor(colorScheme.popup2.textColor);

        popup2Element.style.backgroundColor = popup2BgColor;
        popup2Element.style.borderColor = popup2BorderColor; // ← USAR BORDE ESPECÍFICO
        popup2Element.style.color = popup2TextColor;
      }

      // Resto del código permanece exactamente igual...
      // (Clase Popup, event listeners, etc.)

      // Clase Popup optimizada
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
          if (!this.getProjection() || !this.position || !this.containerDiv)
            return;

          const divPosition = this.getProjection().fromLatLngToDivPixel(
            this.position,
          )!;
          this.containerDiv.style.left = `${divPosition.x}px`;
          this.containerDiv.style.top = `${divPosition.y}px`;
          this.containerDiv.style.display = 'block';
        }
      }

      const popup1 = new Popup(position, content1);
      const popup2 = new Popup(position, content2);

      popup1.setMap(map);
      popup2.setMap(null);

      // Crear marcador
      const icon = getMarkerIcon(device.lastValidHeading);
      const marker = new google.maps.Marker({
        position,
        map,
        icon: icon || undefined,
      });

      // Event listeners optimizados
      const clickListener = marker.addListener('click', () => {
        popup1.setMap(map);
        popup2.getMap() ? popup2.setMap(null) : popup2.setMap(map);
      });

      // Configurar intervalo para actualización de fecha/hora
      const fechaEl = content2.querySelector(`#fecha-${device.deviceId}`);
      let intervalId: NodeJS.Timeout | undefined;

      if (fechaEl) {
        intervalId = setInterval(() => {
          const now = new Date();
          const day = String(now.getDate()).padStart(2, '0');
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const year = now.getFullYear();
          const hours = String(now.getHours()).padStart(2, '0');
          const minutes = String(now.getMinutes()).padStart(2, '0');
          const seconds = String(now.getSeconds()).padStart(2, '0');
          fechaEl.innerHTML = `<strong>Fecha:</strong> ${day}/${month}/${year} <strong>Hora:</strong> ${hours}:${minutes}:${seconds}`;
        }, 1000);
      }

      // Configurar botón de cerrar
      const closeButton = content2.querySelector(
        `#close-btn-${device.deviceId}`,
      );
      if (closeButton) {
        closeButton.addEventListener('click', () => {
          popup2.setMap(null);
        });
      }

      // Guardar referencia
      markersDataRef.current[device.deviceId] = {
        marker,
        popup1,
        popup2,
        intervalId,
      };
    },
    [
      getMarkerIcon,
      getEstado,
      getDireccion,
      getColorScheme,
      getOptimizedPopupContent,
    ],
  );

  // TAMBIÉN necesitas actualizar updatePopupContent para usar la misma función de extracción:
  const updatePopupContent = useCallback(
    (device: DeviceList, markerData: MarkerData) => {
      const colorScheme = getColorScheme(device);
      const isMovilbusUser = session?.user?.username === 'movilbus';

      // ACTUALIZAR el colorMap con los colores correctos
      const colorMap: { [key: string]: string } = {
        'bg-red-500': '#ffccd5', // ✅ CAMBIO: Nuevo rojo suave
        'bg-green-500': '#8fd694',
        'bg-orange-500': '#ffd670',
        'bg-red-600': '#ffccd5',
        'bg-green-600': '#8fd694',
        'bg-orange-600': '#ffd670',
        'bg-[#fca311]': '#fca311',
        'bg-[#1f2937]': '#1f2937',
        'bg-[#ffccd5]': '#ffccd5',
        'bg-[#8fd694]': '#8fd694',
        'bg-[#ffd670]': '#ffd670',
      };

      const shouldBlink =
        isMovilbusUser && !device.servicio && device.lastValidSpeed >= 1;

      // ACTUALIZAR POPUP1 (etiqueta)
      const popup1Element = document.querySelector(
        `#content-${device.deviceId}`,
      ) as HTMLElement;
      if (popup1Element) {
        const contentDiv = popup1Element.querySelector(
          '#content',
        ) as HTMLElement;
        const triangleDiv = document.querySelector(
          `#triangle-${device.deviceId}`,
        ) as HTMLElement;

        if (contentDiv) {
          const bgColor = colorMap[colorScheme.popup1.bgColor] || '#fca311';

          if (shouldBlink) {
            startBlinkingAnimation(contentDiv, 'background', device.deviceId);
          } else {
            stopBlinkingAnimation(device.deviceId);
            contentDiv.style.backgroundColor = bgColor;
            contentDiv.style.borderColor = bgColor;
          }

          // APLICAR color de texto según el esquema de colores
          if (colorScheme.popup1.textColor === 'text-black') {
            contentDiv.style.color = 'black';
          } else if (colorScheme.popup1.textColor === 'text-gray-800') {
            contentDiv.style.color = '#1f2937';
          } else {
            contentDiv.style.color = 'white';
          }
        }

        if (triangleDiv) {
          const triangleColor =
            colorMap[colorScheme.popup1.bgColor] || '#fca311';

          if (shouldBlink) {
            startBlinkingAnimation(triangleDiv, 'triangle', device.deviceId);
          } else {
            stopBlinkingAnimation(device.deviceId, 'triangle');
            triangleDiv.style.setProperty(
              'border-top-color',
              triangleColor,
              'important',
            );
          }

          triangleDiv.style.setProperty(
            'border-left-color',
            'transparent',
            'important',
          );
          triangleDiv.style.setProperty(
            'border-right-color',
            'transparent',
            'important',
          );
        }
      }

      // ACTUALIZAR POPUP2
      const popupElement = document.querySelector(
        `#content2-${device.deviceId}`,
      ) as HTMLElement;
      if (popupElement) {
        const conductorElement = popupElement.querySelector('.conductor-value');
        const servicioElement = popupElement.querySelector('.servicio-value');
        const hasUltimoServicio = device.ultimoServicio !== null;

        const needsRegeneration =
          (hasUltimoServicio && (!conductorElement || !servicioElement)) ||
          (!hasUltimoServicio && (conductorElement || servicioElement));

        if (needsRegeneration) {
          // Regenerar contenido completo
          if (markerData.intervalId) {
            clearInterval(markerData.intervalId);
            markerData.intervalId = undefined;
          }

          const newContent = getOptimizedPopupContent(device);
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = newContent;
          const newPopupContent = tempDiv.firstElementChild;

          if (newPopupContent) {
            const originalClasses = popupElement.className;
            const originalId = popupElement.id;

            popupElement.innerHTML = newPopupContent.innerHTML;
            popupElement.className = originalClasses;
            popupElement.id = originalId;

            // Aplicar colores inmediatamente después de regenerar
            const bgColor = colorMap[colorScheme.popup2.bgColor] || '#1f2937';
            popupElement.style.backgroundColor = bgColor;
            popupElement.style.borderColor = bgColor;

            // Aplicar color de texto
            if (colorScheme.popup2.textColor === 'text-black') {
              popupElement.style.color = 'black';
            } else {
              popupElement.style.color = 'white';
            }
          }

          // Reconfigurar eventos
          const closeButton = popupElement.querySelector(
            `#close-btn-${device.deviceId}`,
          );
          if (closeButton) {
            closeButton.addEventListener('click', () => {
              markerData.popup2.setMap(null);
            });
          }

          const fechaEl = popupElement.querySelector(
            `#fecha-${device.deviceId}`,
          );
          if (fechaEl) {
            markerData.intervalId = setInterval(() => {
              const now = new Date();
              const day = String(now.getDate()).padStart(2, '0');
              const month = String(now.getMonth() + 1).padStart(2, '0');
              const year = now.getFullYear();
              const hours = String(now.getHours()).padStart(2, '0');
              const minutes = String(now.getMinutes()).padStart(2, '0');
              const seconds = String(now.getSeconds()).padStart(2, '0');
              fechaEl.innerHTML = `<strong>Fecha:</strong> ${day}/${month}/${year} <strong>Hora:</strong> ${hours}:${minutes}:${seconds}`;
            }, 1000);
          }
        } else {
          // Solo actualizar colores sin regenerar
          const bgColor = colorMap[colorScheme.popup2.bgColor] || '#1f2937';

          if (shouldBlink) {
            startBlinkingAnimation(
              popupElement,
              'background',
              device.deviceId,
              'popup2',
            );
          } else {
            stopBlinkingAnimation(device.deviceId, 'popup2');
            popupElement.style.backgroundColor = bgColor;
            popupElement.style.borderColor = bgColor;
          }

          // Aplicar color de texto
          if (colorScheme.popup2.textColor === 'text-black') {
            popupElement.style.color = 'black';
          } else {
            popupElement.style.color = 'white';
          }
        }

        // Actualizar contenido de los elementos
        const speedElement = popupElement.querySelector('.speed-value');
        const stateElement = popupElement.querySelector('.state-value');
        const directionElement = popupElement.querySelector('.direction-value');
        const locationElement = popupElement.querySelector('.location-value');
        const streetViewLink = popupElement.querySelector('.street-view-link');
        const kilometrajeElement =
          popupElement.querySelector('.kilometraje-value');

        const conductorElementFinal =
          popupElement.querySelector('.conductor-value');
        const servicioElementFinal =
          popupElement.querySelector('.servicio-value');

        if (speedElement)
          speedElement.textContent = `${Math.round(device.lastValidSpeed)} Km/h`;
        if (stateElement)
          stateElement.textContent = getEstado(device.lastValidSpeed);
        if (directionElement)
          directionElement.textContent = getDireccion(device.lastValidHeading);
        if (locationElement) locationElement.textContent = device.direccion;
        if (streetViewLink) {
          streetViewLink.setAttribute(
            'data-lat',
            device.lastValidLatitude.toString(),
          );
          streetViewLink.setAttribute(
            'data-lng',
            device.lastValidLongitude.toString(),
          );
        }

        if (kilometrajeElement && isMovilbusUser) {
          const kilometraje =
            device.lastOdometerKM - device.odometerini + device.kmini;
          kilometrajeElement.textContent = `${kilometraje.toFixed(1)} Km`;
        }

        if (device.ultimoServicio !== null) {
          if (conductorElementFinal) {
            const conductor =
              device.ultimoServicio?.conductor?.apepate || 'Sin asignar';
            conductorElementFinal.textContent = conductor;
          }

          if (servicioElementFinal) {
            const numero = device.ultimoServicio?.numero || '';
            const empresa = device.ultimoServicio?.empresa || '';
            const tipoRaw = device.ultimoServicio?.tipo || '';
            const tipo = tipoRaw === 'I' ? 'INGRESO' : 'SALIDA';
            const servicioCompleto =
              numero && empresa
                ? `${numero} ${empresa} (${tipo})`
                : 'Sin servicio';
            servicioElementFinal.textContent = servicioCompleto;
          }
        }
      }
    },
    [
      getEstado,
      getDireccion,
      getColorScheme,
      getOptimizedPopupContent,
      session?.user?.username,
    ],
  );

  const handleStreetViewClick = useCallback(
    (e: MouseEvent) => {
      if (!isClient) return;

      const target = e.target as HTMLElement;
      const streetViewLink = target.closest('.street-view-link');

      if (streetViewLink) {
        e.preventDefault();
        const lat = parseFloat(streetViewLink.getAttribute('data-lat') || '0');
        const lng = parseFloat(streetViewLink.getAttribute('data-lng') || '0');
        openStreetView(lat, lng);
      }
    },
    [isClient, openStreetView],
  );

  const handleFollowLinkClick = useCallback(
    (e: MouseEvent) => {
      if (!isClient) return;

      const target = e.target as HTMLElement;
      const followLink = target.closest('.follow-link');

      if (followLink) {
        e.preventDefault();
        const deviceID = followLink.getAttribute('data-device-id');
        const url = `/subtrackvelnew/seguirUnidad?deviceId=${deviceID}`;
        window.open(url, '_blank');
      }
    },
    [isClient],
  );

  useEffect(() => {
    if (!isClient) return;

    if (!clickListenerAttached.current) {
      document.addEventListener('click', handleFollowLinkClick);
      document.addEventListener('click', handleStreetViewClick);
      clickListenerAttached.current = true;
    }

    return () => {
      if (clickListenerAttached.current) {
        document.removeEventListener('click', handleFollowLinkClick);
        document.addEventListener('click', handleStreetViewClick);
        clickListenerAttached.current = false;
      }
    };
  }, [handleFollowLinkClick, handleStreetViewClick, isClient]);

  const centerMap = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.setCenter(center);
      mapRef.current.setZoom(6);
    }
  }, []);

  const centerUnit = useCallback(
    (coords: { latitud: number; longitud: number }) => {
      if (mapRef.current) {
        const centerCoords = { lat: coords.latitud, lng: coords.longitud };
        mapRef.current.setCenter(centerCoords);
        mapRef.current.setZoom(17);

        const deviceID = deviceList.find(
          (device) =>
            device.lastValidLatitude === coords.latitud &&
            device.lastValidLongitude === coords.longitud,
        )?.deviceId;

        if (deviceID && markersDataRef.current[deviceID]) {
          markersDataRef.current[deviceID].popup2.setMap(mapRef.current);
        }
      }
    },
    [deviceList],
  );

  useEffect(() => {
    if (mapRef.current && isClient && deviceList.length > 0) {
      updateMarkersAndPopups(mapRef.current);
    }
  }, [updateMarkersAndPopups, isClient, deviceList]);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    setMarkersLoaded(false);
  }, []);

function startBlinkingAnimation(
    element: HTMLElement,
    type: 'background' | 'triangle',
    deviceId: string,
    suffix: string = '',
  ) {
    const intervalKey = `${deviceId}_${type}_${suffix}`;

    // DETENER intervalo anterior si existe
    if (blinkingIntervals[intervalKey]) {
      clearInterval(blinkingIntervals[intervalKey]);
    }

    // ✅ NUEVOS colores de parpadeo con el naranja más suave
    const lightOrange = '#ffd670';   // ✅ CAMBIO: Nuevo naranja suave
    const darkerOrange = '#e9ff70';  // ✅ CAMBIO: Versión más oscura del nuevo naranja
    let isLight = true;

    // APLICAR color inicial
    if (type === 'background') {
      element.style.backgroundColor = lightOrange;
      element.style.borderColor = lightOrange;
    } else if (type === 'triangle') {
      element.style.setProperty('border-top-color', lightOrange, 'important');
    }

    // CREAR intervalo para alternar colores
    blinkingIntervals[intervalKey] = setInterval(() => {
      const currentColor = isLight ? darkerOrange : lightOrange;

      if (type === 'background') {
        element.style.backgroundColor = currentColor;
        element.style.borderColor = currentColor;
      } else if (type === 'triangle') {
        element.style.setProperty(
          'border-top-color',
          currentColor,
          'important',
        );
      }

      isLight = !isLight;
    }, 500); // Mantener la velocidad de 500ms
  }

  function stopBlinkingAnimation(deviceId: string, suffix: string = '') {
    // DETENER todos los intervalos relacionados con este device
    const keysToStop = Object.keys(blinkingIntervals).filter(
      (key) =>
        key.startsWith(deviceId) && (suffix === '' || key.includes(suffix)),
    );

    keysToStop.forEach((key) => {
      if (blinkingIntervals[key]) {
        clearInterval(blinkingIntervals[key]);
        delete blinkingIntervals[key];
      }
    });
  }

  useEffect(() => {
    return () => {
      Object.values(blinkingIntervals).forEach((interval) => {
        clearInterval(interval);
      });
      Object.keys(blinkingIntervals).forEach((key) => {
        delete blinkingIntervals[key];
      });
    };
  }, []);

  const onUnmount = useCallback(() => {
    if (!isClient) return;

    Object.values(markersDataRef.current).forEach((markerData) => {
      markerData.marker.setMap(null);
      markerData.popup1.setMap(null);
      markerData.popup2.setMap(null);
      if (markerData.intervalId) {
        clearInterval(markerData.intervalId);
      }
    });
    markersDataRef.current = {};

    // Limpiar cache de iconos
    iconCache.current = {};
  }, [isClient]);

  const memoizedMapOptions = useMemo(() => {
    let isMobile = false;

    if (typeof window !== 'undefined') {
      const isTouchDevice = () => {
        return (
          'ontouchstart' in window ||
          navigator.maxTouchPoints > 0 ||
          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent,
          )
        );
      };
      isMobile = isTouchDevice();
    }

    return {
      mapTypeControl: false,
      fullscreenControl: true,
      fullscreenControlOptions: {
        position: 9,
      },
      gestureHandling: isMobile ? 'greedy' : 'auto',
    };
  }, []);

  if (!isClient) {
    return <Loader />;
  }

  return (
    <>
      {isLoaded && mapLoaded ? (
        <div className="relative">
          {!markersLoaded && (
            <div className="absolute left-0 top-0 z-[9999] flex h-full w-full items-center justify-center bg-white/25">
              <Loader></Loader>
            </div>
          )}

          <DynamicGoogleMap
            mapContainerStyle={containerStyle}
            center={center}
            zoom={6}
            onLoad={onLoad}
            onUnmount={onUnmount}
            options={memoizedMapOptions}
          ></DynamicGoogleMap>
        </div>
      ) : (
        <></>
      )}

      <Sidebar
        centerMap={centerMap}
        centerUnit={centerUnit}
        onFilteredIdsChange={setFilteredIdsFromSidebar}
      />
    </>
  );
}