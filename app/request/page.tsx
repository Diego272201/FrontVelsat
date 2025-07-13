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
  rutaact: string;
}

interface MarkerData {
  marker: google.maps.Marker;
  popup1: any;
  popup2: any;
  intervalId?: NodeJS.Timeout;
}

export default function RequestPage() {
  const isClient = typeof window !== 'undefined';

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

  // Cache para iconos para evitar recrearlos
  const iconCache = useRef<{ [key: string]: google.maps.Icon }>({});

  // Función para determinar si el usuario es transporvilla
  const isTransporvillaUser = useMemo(() => {
    return session?.user?.username?.toLowerCase() === 'transporvilla';
  }, [session?.user?.username]);

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

      const cacheKey = Math.floor(heading / 45) * 45; // Agrupa por rangos de 45 grados

      if (iconCache.current[cacheKey]) {
        return iconCache.current[cacheKey];
      }

      const directions = [
        { range: [0, 22.5], url: '/up.png', size: [25, 35] },
        { range: [22.51, 67.5], url: '/topright.png', size: [42, 25] },
        { range: [67.51, 112.5], url: '/right.png', size: [42, 25] },
        { range: [112.51, 157.5], url: '/downright.png', size: [42, 25] },
        { range: [157.51, 202.5], url: '/down.png', size: [25, 35] },
        { range: [202.51, 247.5], url: '/downleft.png', size: [42, 25] },
        { range: [247.51, 292.5], url: '/left.png', size: [42, 25] },
        { range: [292.51, 337.5], url: '/topleft.png', size: [42, 25] },
        { range: [337.51, 360.0], url: '/up.png', size: [25, 35] },
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

  // Función para obtener colores basado en el usuario
  const getColorScheme = useCallback(
    (device: DeviceList) => {
      if (isTransporvillaUser) {
        // Lógica original para transporvilla con rutaact
        if (device.rutaact === '5') {
          return {
            popup1: {
              bgColor: 'bg-[#c1121f]',
              textColor: 'text-white',
              borderColor: 'border-[#d62828]',
              triangleColor: 'border-t-[#c1121f]',
            },
            popup2: {
              bgColor: 'bg-red-500',
              textColor: 'text-white',
              borderColor: 'border-red-600',
              closeButtonColor: 'text-red-100 hover:text-white',
              linkColor: 'text-red-100 hover:text-white',
            },
          };
        } else if (device.rutaact === '6') {
          return {
            popup1: {
              bgColor: 'bg-[#60bfff]',
              textColor: 'text-black',
              borderColor: 'border-[#60bfff]',
              triangleColor: 'border-t-[#60bfff]',
            },
            popup2: {
              bgColor: 'bg-blue-500',
              textColor: 'text-white',
              borderColor: 'border-blue-600',
              closeButtonColor: 'text-blue-100 hover:text-white',
              linkColor: 'text-blue-100 hover:text-white',
            },
          };
        } else {
          return {
            popup1: {
              bgColor: 'bg-white',
              textColor: 'text-gray-800',
              borderColor: 'border-gray-300',
              triangleColor: 'border-t-white',
            },
            popup2: {
              bgColor: 'bg-white',
              textColor: 'text-gray-800',
              borderColor: 'border-gray-300',
              closeButtonColor: 'text-gray-600 hover:text-gray-800',
              linkColor: 'text-blue-600 hover:text-blue-800',
            },
          };
        }
      } else {
        // Colores fijos para otros usuarios (como en el segundo código)
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
            borderColor: 'border-[#1f2937]',
            closeButtonColor: 'text-white hover:text-gray-300',
            linkColor: 'text-blue-300 hover:text-blue-100',
          },
        };
      }
    },
    [isTransporvillaUser],
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

          // Actualizar contenido del popup2 más eficientemente
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

  // Función para actualizar contenido del popup sin recrear el elemento
  const updatePopupContent = useCallback(
    (device: DeviceList, markerData: MarkerData) => {
      // Actualizar popup2 (información detallada)
      const popupElement = document.querySelector(
        `#content2-${device.deviceId}`,
      ) as HTMLElement;
      if (popupElement) {
        // Actualizar solo los elementos que cambian
        const speedElement = popupElement.querySelector('.speed-value');
        const stateElement = popupElement.querySelector('.state-value');
        const directionElement = popupElement.querySelector('.direction-value');
        const locationElement = popupElement.querySelector('.location-value');

        if (speedElement)
          speedElement.textContent = `${device.lastValidSpeed} Km/h`;
        if (stateElement)
          stateElement.textContent = getEstado(device.lastValidSpeed);
        if (directionElement)
          directionElement.textContent = getDireccion(device.lastValidHeading);
        if (locationElement) locationElement.textContent = device.direccion;

        // Solo actualizar rutaact si es usuario transporvilla
        if (isTransporvillaUser) {
          const rutaactElement = popupElement.querySelector('.rutaact-value');
          if (rutaactElement)
            rutaactElement.textContent = device.rutaact || 'N/A';

          // Actualizar colores del popup según rutaact usando estilos inline para evitar conflictos
          if (device.rutaact === '5') {
            // Rojo
            popupElement.style.backgroundColor = '#ffccd5';
            popupElement.style.color = '#212529';
            popupElement.style.borderColor = '#ff758f';
          } else if (device.rutaact === '6') {
            // Azul
            popupElement.style.backgroundColor = '#bbdefb'; // blue-500
            popupElement.style.color = '#212529'; // white
            popupElement.style.borderColor = '#2563eb'; // blue-600
          } else {
            // Blanco (default)
            popupElement.style.backgroundColor = '#ffffff';
            popupElement.style.color = '#1f2937';
            popupElement.style.borderColor = '#d1d5db';
          }
        }
      }

      // NUEVO: Actualizar popup1 (etiqueta principal) según rutaact
      if (isTransporvillaUser) {
        const popup1Element = document.querySelector(
          `#content-${device.deviceId}`,
        ) as HTMLElement;
        if (popup1Element) {
          const contentDiv = popup1Element.querySelector(
            '#content',
          ) as HTMLElement;
          const parentDiv = popup1Element.querySelector(
            '.relative',
          ) as HTMLElement;

          if (contentDiv && parentDiv) {
            // Actualizar el contenido (rectángulo principal)
            if (device.rutaact === '5') {
              // Rojo
              contentDiv.style.backgroundColor = '#c1121f';
              contentDiv.style.color = '#ffffff';
              contentDiv.style.borderColor = '#d62828';

              // RECREAR el triángulo con el color correcto
              const existingTriangle =
                parentDiv.querySelector('div:last-child');
              if (existingTriangle) {
                existingTriangle.remove();
              }

              const newTriangle = document.createElement('div');
              newTriangle.style.width = '0';
              newTriangle.style.height = '0';
              newTriangle.style.borderLeft = '8px solid transparent';
              newTriangle.style.borderRight = '8px solid transparent';
              newTriangle.style.borderTop = '8px solid #c1121f';
              parentDiv.appendChild(newTriangle);
            } else if (device.rutaact === '6') {
              // Azul
              contentDiv.style.backgroundColor = '#60bfff';
              contentDiv.style.color = '#000000';
              contentDiv.style.borderColor = '#60bfff';

              // RECREAR el triángulo con el color correcto
              const existingTriangle =
                parentDiv.querySelector('div:last-child');
              if (existingTriangle) {
                existingTriangle.remove();
              }

              const newTriangle = document.createElement('div');
              newTriangle.style.width = '0';
              newTriangle.style.height = '0';
              newTriangle.style.borderLeft = '8px solid transparent';
              newTriangle.style.borderRight = '8px solid transparent';
              newTriangle.style.borderTop = '8px solid #60bfff';
              parentDiv.appendChild(newTriangle);
            } else {
              // Blanco (default)
              contentDiv.style.backgroundColor = '#ffffff';
              contentDiv.style.color = '#1f2937';
              contentDiv.style.borderColor = '#d1d5db';

              // RECREAR el triángulo con el color correcto
              const existingTriangle =
                parentDiv.querySelector('div:last-child');
              if (existingTriangle) {
                existingTriangle.remove();
              }

              const newTriangle = document.createElement('div');
              newTriangle.style.width = '0';
              newTriangle.style.height = '0';
              newTriangle.style.borderLeft = '8px solid transparent';
              newTriangle.style.borderRight = '8px solid transparent';
              newTriangle.style.borderTop = '8px solid #ffffff';
              parentDiv.appendChild(newTriangle);
            }
          }
        }
      }
    },
    [getEstado, getDireccion, isTransporvillaUser],
  );

  // Función para crear nuevos marcadores
  const createNewMarker = useCallback(
    (
      device: DeviceList,
      position: google.maps.LatLng,
      map: google.maps.Map,
    ) => {
      const colorScheme = getColorScheme(device);

      // Crear popup1 (etiqueta) con colores dinámicos
      const content1 = document.createElement('div');
      content1.id = `content-${device.deviceId}`;
      content1.innerHTML = `
      <div class="relative flex flex-col items-center mt-4">
        <div id="content" class="${colorScheme.popup1.bgColor} ${colorScheme.popup1.textColor} px-2 py-1.5 border ${colorScheme.popup1.borderColor}">
          ${device.deviceId.toUpperCase()}
        </div>
        <div class="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent ${colorScheme.popup1.triangleColor}"></div>
      </div>
    `;

      // Crear popup2 (información detallada)
      const content2 = document.createElement('div');
      content2.innerHTML = getOptimizedPopupContent(device);

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
    [getMarkerIcon, getEstado, getDireccion, getColorScheme],
  );

  // Función para generar contenido del popup optimizado
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

      // Para usuarios transporvilla, usar estilos inline para evitar conflictos de CSS
      let inlineStyles = '';
      let closeButtonClass = '';
      let linkClass = '';
      let textcolor = '';

      if (isTransporvillaUser) {
        if (device.rutaact === '5') {
          // Rojo
          inlineStyles =
            'style="background-color: #ffccd5; color: #212529; border-color: #ff758f;"';
          closeButtonClass = 'text-red-100 hover:text-white';
          linkClass = 'text-red-100 hover:text-white';
          textcolor = 'color: #bf0603';
        } else if (device.rutaact === '6') {
          // Azul
          inlineStyles =
            'style="background-color: #bbdefb; color: #212529; border-color: #2563eb;"';
          closeButtonClass = 'text-blue-100 hover:text-white';
          linkClass = 'text-red-100 hover:text-white';
        } else {
          // Blanco
          inlineStyles =
            'style="background-color: #ffffff; color: #1f2937; border-color: #d1d5db;"';
          closeButtonClass = 'text-red-100 hover:text-white';
          linkClass = 'text-red-100 hover:text-white';
          textcolor = 'color: #003f88';
        }
      } else {
        // Para otros usuarios, usar clases CSS normalmente
        inlineStyles = '';
        closeButtonClass = colorScheme.popup2.closeButtonColor;
        linkClass = colorScheme.popup2.linkColor;
      }

      const baseClasses = isTransporvillaUser
        ? 'text-[12px] flex flex-col w-[290px] rounded border shadow-lg'
        : `${colorScheme.popup2.bgColor} ${colorScheme.popup2.textColor} text-[12px] flex flex-col w-[290px] rounded border ${colorScheme.popup2.borderColor} shadow-lg`;

      return `
      <div class="${baseClasses}" id="content2-${device.deviceId}" ${inlineStyles}>
  
    <h3 class="popup-title font-bold  flex items-center justify-between" style="border-bottom: 1px solid ${
      device.rutaact === '5'
        ? '#ff758f'
        : device.rutaact === '6'
          ? '#000000'
          : '#6c757d'
    };  background-color: ${
      device.rutaact === '5'
        ? '#ffffff'
        : device.rutaact === '6'
          ? '#ffffff'
          : '#1f2937'
    }; color: ${
      device.rutaact === '5'
        ? '#1f2937'
        : device.rutaact === '6'
          ? '#1f2937'
          : '#ffffff'
    };">
            <button id="close-btn-${device.deviceId}" class="popup-close-btn text-sm ${closeButtonClass}">X</button>
       UNIDAD: ${device.deviceId.toUpperCase()} 


               <div style="display: flex; align-items: center;">

<svg height="18px" width="18px" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 511.999 511.999" xml:space="preserve" fill="#000000"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <circle style="fill:#CFF09E;" cx="256.004" cy="110.958" r="49.727"></circle> <g> <path style="fill:#507C5C;" d="M350.878,174.891c-2.544,0-5.119-0.682-7.443-2.115c-6.677-4.118-8.751-12.87-4.633-19.546 c7.816-12.674,11.948-27.291,11.948-42.27c0-23.122-9.952-45.172-27.305-60.494c-5.88-5.193-6.437-14.169-1.244-20.048 c5.191-5.88,14.168-6.436,20.048-1.246c23.456,20.713,36.908,50.523,36.908,81.788c0,20.25-5.593,40.023-16.176,57.181 C360.296,172.495,355.642,174.891,350.878,174.891z"></path> <path style="fill:#507C5C;" d="M161.116,174.886c-4.765,0-9.42-2.398-12.104-6.751c-10.579-17.158-16.171-36.928-16.171-57.174 c0-31.268,13.454-61.078,36.912-81.791c5.88-5.19,14.856-4.635,20.048,1.246c5.191,5.882,4.635,14.857-1.246,20.048 c-17.354,15.323-27.308,37.374-27.308,60.497c0,14.976,4.13,29.592,11.945,42.266c4.116,6.677,2.041,15.426-4.636,19.544 C166.233,174.203,163.658,174.886,161.116,174.886z"></path> <path style="fill:#507C5C;" d="M406.177,200.508c-2.544,0-5.119-0.682-7.443-2.115c-6.677-4.118-8.752-12.87-4.633-19.546 c11.715-18.997,17.908-40.902,17.908-63.348c0-34.648-14.912-67.686-40.912-90.646c-5.88-5.193-6.437-14.169-1.244-20.048 c5.193-5.882,14.168-6.436,20.048-1.246c32.104,28.35,50.516,69.151,50.516,111.941c0,27.715-7.654,54.776-22.136,78.259 C415.594,198.111,410.941,200.508,406.177,200.508z"></path> <path style="fill:#507C5C;" d="M105.816,200.498c-4.764,0-9.418-2.398-12.103-6.75c-14.478-23.48-22.131-50.538-22.131-78.249 c0-42.792,18.415-83.594,50.521-111.944c5.882-5.19,14.855-4.635,20.048,1.246c5.191,5.882,4.635,14.857-1.246,20.048 c-26.001,22.96-40.915,56.002-40.915,90.65c0,22.443,6.19,44.345,17.902,63.338c4.118,6.677,2.042,15.428-4.635,19.546 C110.934,199.815,108.359,200.498,105.816,200.498z"></path> </g> <polygon style="fill:#CFF09E;" points="357.03,363.751 256.216,415.225 417.443,497.792 "></polygon> <path style="fill:#507C5C;" d="M419.04,511.896c0.27-0.03,0.54-0.068,0.807-0.115c0.145-0.026,0.288-0.05,0.432-0.08 c0.284-0.058,0.565-0.126,0.847-0.203c0.116-0.031,0.234-0.058,0.351-0.091c0.391-0.116,0.777-0.246,1.158-0.395 c0.061-0.024,0.121-0.054,0.182-0.078c0.32-0.131,0.635-0.271,0.946-0.426c0.124-0.061,0.244-0.128,0.365-0.193 c0.249-0.132,0.493-0.271,0.734-0.419c0.126-0.078,0.251-0.156,0.376-0.239c0.243-0.159,0.479-0.328,0.713-0.503 c0.107-0.08,0.214-0.156,0.318-0.239c0.331-0.263,0.655-0.537,0.964-0.832c4.372-4.159,5.639-10.626,3.159-16.127l-60.413-134.042 c-0.001-0.003-0.003-0.004-0.004-0.007l-85.511-189.728c21-10.489,35.463-32.191,35.463-57.216c0-35.25-28.677-63.929-63.927-63.929 s-63.927,28.677-63.927,63.929c0,25.027,14.463,46.727,35.463,57.216L81.607,491.955c-0.014,0.031-0.023,0.063-0.037,0.094 c-0.115,0.26-0.212,0.527-0.31,0.793c-0.067,0.18-0.143,0.359-0.203,0.541c-0.067,0.206-0.116,0.415-0.173,0.624 c-0.068,0.244-0.145,0.489-0.199,0.734c-0.014,0.063-0.02,0.126-0.033,0.189c-0.22,1.064-0.307,2.132-0.281,3.193 c0.024,1.101,0.169,2.207,0.459,3.299c0.01,0.035,0.014,0.072,0.024,0.108c0.07,0.254,0.162,0.506,0.247,0.758 c0.064,0.193,0.121,0.388,0.193,0.578c0.072,0.187,0.16,0.371,0.241,0.555c0.109,0.251,0.214,0.504,0.337,0.749 c0.016,0.031,0.027,0.064,0.043,0.097c0.034,0.067,0.08,0.124,0.115,0.19c0.243,0.457,0.511,0.899,0.804,1.329 c0.082,0.119,0.16,0.241,0.246,0.358c0.344,0.473,0.712,0.93,1.115,1.361c0.055,0.06,0.118,0.112,0.175,0.17 c0.349,0.359,0.72,0.7,1.111,1.025c0.129,0.108,0.26,0.212,0.393,0.315c0.366,0.283,0.75,0.548,1.148,0.798 c0.102,0.064,0.2,0.136,0.305,0.197c0.447,0.264,0.909,0.51,1.393,0.729c0.045,0.021,0.094,0.034,0.139,0.054 c0.141,0.061,0.287,0.109,0.43,0.166c0.418,0.168,0.835,0.317,1.258,0.442c0.166,0.048,0.332,0.091,0.5,0.135 c0.437,0.112,0.876,0.203,1.318,0.271c0.142,0.023,0.284,0.05,0.426,0.068c0.587,0.074,1.172,0.122,1.756,0.122 c0.007,0,0.013-0.001,0.02-0.001l0,0c0.615,0,1.231-0.051,1.848-0.132c0.18-0.024,0.357-0.064,0.534-0.095 c0.435-0.074,0.868-0.165,1.298-0.281c0.212-0.058,0.419-0.124,0.628-0.19c0.379-0.122,0.756-0.261,1.129-0.416 c0.226-0.094,0.45-0.189,0.672-0.295c0.116-0.057,0.237-0.095,0.352-0.155L208.1,455.601c6.982-3.575,9.744-12.134,6.169-19.117 c-3.575-6.981-12.133-9.741-19.117-6.167l-70.992,36.355l37.762-83.783l87.802,44.966c0.006,0.003,0.011,0.007,0.017,0.01 l161.227,82.567c0.456,0.233,0.922,0.43,1.392,0.611c0.115,0.044,0.23,0.088,0.345,0.128c0.467,0.166,0.939,0.314,1.415,0.429 c0.043,0.01,0.084,0.016,0.126,0.026c0.446,0.102,0.893,0.179,1.344,0.237c0.119,0.016,0.239,0.031,0.358,0.044 c0.48,0.051,0.962,0.082,1.442,0.084c0.016,0,0.033,0.003,0.048,0.003c0.082,0,0.165-0.01,0.247-0.011 c0.308-0.004,0.616-0.018,0.925-0.043C418.754,511.93,418.897,511.911,419.04,511.896z M287.414,415.245l62.794-32.063l37.63,83.491 L287.414,415.245z M256,75.44c19.587,0,35.52,15.935,35.52,35.522c0,19.585-15.934,35.52-35.52,35.52s-35.52-15.935-35.52-35.52 C220.479,91.375,236.413,75.44,256,75.44z M255.673,174.881c0.109,0,0.216,0.009,0.325,0.009c0.109,0,0.216-0.007,0.325-0.009 l72.496,160.851l-85.679-45.436c-6.931-3.676-15.527-1.035-19.203,5.893c-3.674,6.931-1.037,15.529,5.893,19.205l93.529,49.599 l-67.137,34.28l-82.618-42.311L255.673,174.881z"></path> </g></svg>

<svg fill="#47a025" width="24px" height="24px" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" stroke="#47a025"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><title>ionicons-v5-d</title><path d="M48,322.3V189.7A29.74,29.74,0,0,1,77.7,160H215.14l24.4-32H77.7A61.77,61.77,0,0,0,16,189.7V322.3A61.77,61.77,0,0,0,77.7,384h96.85a22.57,22.57,0,0,1,.26-7.32l.15-.75.21-.73,6.5-23.2H77.7A29.74,29.74,0,0,1,48,322.3Z"></path><path d="M386.3,128H287.66a22.69,22.69,0,0,1-.27,7.2l-.15.74-.21.73L280.49,160H386.3A29.74,29.74,0,0,1,416,189.7V322.3A29.74,29.74,0,0,1,386.3,352H247l-24.42,32H386.3A61.77,61.77,0,0,0,448,322.3V189.7A61.77,61.77,0,0,0,386.3,128Z"></path><path d="M162.65,294.16a24.37,24.37,0,0,1-21.56-13,25,25,0,0,1,1.42-25.83l.31-.46.33-.44L197.62,183H89.69a20,20,0,0,0-20,20V309a20,20,0,0,0,20,20h98.42l9.78-34.86Z"></path><path d="M276.07,280.89l27.07-35.49a5.2,5.2,0,0,0,.77-1.91,5,5,0,0,0,.08-.66,5,5,0,0,0-.08-1.29,5.11,5.11,0,0,0-.68-1.75,4.76,4.76,0,0,0-.78-.95,3.48,3.48,0,0,0-.48-.38,4,4,0,0,0-1.11-.55,4.28,4.28,0,0,0-1.31-.2H237.93l12.12-43.21L253.28,183l6.21-22.16L260,159l7.79-27.76h0a3.51,3.51,0,0,0,.05-.55c0-.06,0-.11,0-.16s0-.26-.05-.38,0-.09,0-.14a2.2,2.2,0,0,0-.17-.45h0a3.77,3.77,0,0,0-.26-.39l-.09-.1a2.73,2.73,0,0,0-.25-.23l-.1-.08a3.14,3.14,0,0,0-.39-.24h0a2,2,0,0,0-.41-.14l-.13,0-.33,0h-.13a2.3,2.3,0,0,0-.45,0h0a1.9,1.9,0,0,0-.42.15l-.13.07-.3.21-.11.1a2.4,2.4,0,0,0-.36.41h0l-18,23.63-13.14,17.22L222.77,183l-63.71,83.55a5.72,5.72,0,0,0-.44.8,4.78,4.78,0,0,0-.35,1.09,4.7,4.7,0,0,0-.08,1.29,4.86,4.86,0,0,0,2,3.71,4.74,4.74,0,0,0,.54.31,4.31,4.31,0,0,0,1.89.43h61.62L194.42,380.6a3.64,3.64,0,0,0,0,.56s0,.1,0,.15a2.32,2.32,0,0,0,.06.38.58.58,0,0,0,0,.14,2.2,2.2,0,0,0,.17.45h0a3.62,3.62,0,0,0,.26.38l.09.1.25.24a.39.39,0,0,1,.1.08,2.22,2.22,0,0,0,.39.23h0a2.83,2.83,0,0,0,.41.14l.13,0a1.86,1.86,0,0,0,.33,0h.13a2.32,2.32,0,0,0,.45-.06h0a2.05,2.05,0,0,0,.41-.16l.13-.07.3-.21.11-.09a2.4,2.4,0,0,0,.36-.41h0L221.82,352l17.53-23Z"></path><path d="M319.5,256.93l-.46.6L264.51,329h109.8a20,20,0,0,0,20-20V203a20,20,0,0,0-20-20H274.05l-9.74,34.73h35.24A24.35,24.35,0,0,1,321,230.5a25.21,25.21,0,0,1-1,25.79Z"></path><path d="M480,202.67a16,16,0,0,0-16,16v74.66a16,16,0,0,0,32,0V218.67A16,16,0,0,0,480,202.67Z"></path></g></svg>

   </div>

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


        <p class="px-2"><strong>Velocidad:</strong> <span class="speed-value">${device.lastValidSpeed} Km/h</span></p>
        <p class="px-2"><strong>Estado:</strong> <span class="state-value">${getEstado(device.lastValidSpeed)}</span></p>
        ${isTransporvillaUser ? `<p class="px-2"><strong>Ruta Activa:</strong> <span class="rutaact-value">${device.rutaact || 'N/A'}</span></p>` : ''}
        <br>
        <h4 class="px-2 font-bold uppercase"  style="${textcolor}">Último Reporte</h4>
        <p class="px-2" id="fecha-${device.deviceId}">
          <strong>Fecha:</strong> ${day}/${month}/${year} <strong>Hora:</strong> ${hours}:${minutes}:${seconds}
        </p>        
        <span class="px-2"><strong>Dirección:</strong> <span class="direction-value">${getDireccion(device.lastValidHeading)}</span></span>
        <span class="px-2"><strong>Ubicación:</strong> <span class="location-value">${device.direccion}</span></span>
  <a href="" class="follow-link ml-2 mr-2 mb-3 ${linkClass}" data-device-id="${device.deviceId}">
           <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
             <circle cx="11" cy="11" r="8"/>
             <path d="m21 21-4.35-4.35"/>
           </svg>
           Seguir Unidad
         </a>     </div>
    `;
    },
    [getEstado, getDireccion, getColorScheme, isTransporvillaUser],
  );

  // Event listener optimizado para links
  const handleFollowLinkClick = useCallback(
    (e: MouseEvent) => {
      if (!isClient) return;

      const target = e.target as HTMLElement;
      if (target.classList.contains('follow-link')) {
        e.preventDefault();
        const deviceID = target.getAttribute('data-device-id');
        const url = `/trackvelnew/seguirUnidad?deviceId=${deviceID}`;
        window.open(url, '_blank');
      }
    },
    [isClient],
  );

  useEffect(() => {
    if (!isClient) return;

    // Usar delegación de eventos para mejor rendimiento
    if (!clickListenerAttached.current) {
      document.addEventListener('click', handleFollowLinkClick);
      clickListenerAttached.current = true;
    }

    return () => {
      if (clickListenerAttached.current) {
        document.removeEventListener('click', handleFollowLinkClick);
        clickListenerAttached.current = false;
      }
    };
  }, [handleFollowLinkClick, isClient]);

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

  // Effect optimizado para actualizar marcadores
  useEffect(() => {
    if (mapRef.current && isClient && deviceList.length > 0) {
      updateMarkersAndPopups(mapRef.current);
    }
  }, [updateMarkersAndPopups, isClient, deviceList]);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    setMarkersLoaded(false);
  }, []);

  const onUnmount = useCallback(() => {
    if (!isClient) return;

    // Limpiar todos los marcadores y sus intervalos
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

  const memoizedMapOptions = useMemo(
    () => ({
      mapTypeControl: false,
      fullscreenControl: true,
      fullscreenControlOptions: {
        position: 9,
      },
    }),
    [],
  );

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
