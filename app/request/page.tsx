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
  const getColorScheme = useCallback((device: DeviceList) => {
    if (isTransporvillaUser) {
      // Lógica original para transporvilla con rutaact
      if (device.rutaact === '5') {
        return {
          popup1: {
            bgColor: 'bg-red-400',
            textColor: 'text-black',
            borderColor: 'border-red-400',
            triangleColor: 'border-t-red-400'
          },
          popup2: {
            bgColor: 'bg-red-500',
            textColor: 'text-white',
            borderColor: 'border-red-600',
            closeButtonColor: 'text-red-100 hover:text-white',
            linkColor: 'text-red-100 hover:text-white'
          }
        };
      } else if (device.rutaact === '6') {
        return {
          popup1: {
            bgColor: 'bg-[#60bfff]',
            textColor: 'text-black',
            borderColor: 'border-[#60bfff]',
            triangleColor: 'border-t-[#60bfff]'
          },
          popup2: {
            bgColor: 'bg-blue-500',
            textColor: 'text-white',
            borderColor: 'border-blue-600',
            closeButtonColor: 'text-blue-100 hover:text-white',
            linkColor: 'text-blue-100 hover:text-white'
          }
        };
      } else {
        return {
          popup1: {
            bgColor: 'bg-white',
            textColor: 'text-gray-800',
            borderColor: 'border-gray-300',
            triangleColor: 'border-t-white'
          },
          popup2: {
            bgColor: 'bg-white',
            textColor: 'text-gray-800',
            borderColor: 'border-gray-300',
            closeButtonColor: 'text-gray-600 hover:text-gray-800',
            linkColor: 'text-blue-600 hover:text-blue-800'
          }
        };
      }
    } else {
      // Colores fijos para otros usuarios (como en el segundo código)
      return {
        popup1: {
          bgColor: 'bg-[#fca311]',
          textColor: 'text-gray-800',
          borderColor: 'border-[#fca311]',
          triangleColor: 'border-t-[#fca311]'
        },
        popup2: {
          bgColor: 'bg-[#1f2937]',
          textColor: 'text-white',
          borderColor: 'border-[#1f2937]',
          closeButtonColor: 'text-white hover:text-gray-300',
          linkColor: 'text-blue-300 hover:text-blue-100'
        }
      };
    }
  }, [isTransporvillaUser]);

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
  const updatePopupContent = useCallback((device: DeviceList, markerData: MarkerData) => {
    const popupElement = document.querySelector(`#content2-${device.deviceId}`) as HTMLElement;
    if (!popupElement) return;

    // Actualizar solo los elementos que cambian
    const speedElement = popupElement.querySelector('.speed-value');
    const stateElement = popupElement.querySelector('.state-value');
    const directionElement = popupElement.querySelector('.direction-value');
    const locationElement = popupElement.querySelector('.location-value');

    if (speedElement) speedElement.textContent = `${device.lastValidSpeed} Km/h`;
    if (stateElement) stateElement.textContent = getEstado(device.lastValidSpeed);
    if (directionElement) directionElement.textContent = getDireccion(device.lastValidHeading);
    if (locationElement) locationElement.textContent = device.direccion;

    // Solo actualizar rutaact si es usuario transporvilla
    if (isTransporvillaUser) {
      const rutaactElement = popupElement.querySelector('.rutaact-value');
      if (rutaactElement) rutaactElement.textContent = device.rutaact || 'N/A';

      // Actualizar colores del popup según rutaact usando estilos inline para evitar conflictos
      if (device.rutaact === '5') {
        // Rojo
        popupElement.style.backgroundColor = '#ef4444'; // red-500
        popupElement.style.color = '#ffffff'; // white
        popupElement.style.borderColor = '#dc2626'; // red-600
      } else if (device.rutaact === '6') {
        // Azul
        popupElement.style.backgroundColor = '#3b82f6'; // blue-500
        popupElement.style.color = '#ffffff'; // white
        popupElement.style.borderColor = '#2563eb'; // blue-600
      } else {
        // Blanco (default)
        popupElement.style.backgroundColor = '#ffffff'; // white
        popupElement.style.color = '#1f2937'; // gray-800
        popupElement.style.borderColor = '#d1d5db'; // gray-300
      }
    }
  }, [getEstado, getDireccion, isTransporvillaUser]);

  // Función para crear nuevos marcadores
  const createNewMarker = useCallback((device: DeviceList, position: google.maps.LatLng, map: google.maps.Map) => {
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
  }, [getMarkerIcon, getEstado, getDireccion, getColorScheme]);

  // Función para generar contenido del popup optimizado
  const getOptimizedPopupContent = useCallback((device: DeviceList) => {
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

    if (isTransporvillaUser) {
      if (device.rutaact === '5') {
        // Rojo
        inlineStyles = 'style="background-color: #ef4444; color: #ffffff; border-color: #dc2626;"';
        closeButtonClass = 'text-red-100 hover:text-white';
        linkClass = 'text-red-100 hover:text-white';
      } else if (device.rutaact === '6') {
        // Azul
        inlineStyles = 'style="background-color: #3b82f6; color: #ffffff; border-color: #2563eb;"';
        closeButtonClass = 'text-blue-100 hover:text-white';
        linkClass = 'text-blue-100 hover:text-white';
      } else {
        // Blanco
        inlineStyles = 'style="background-color: #ffffff; color: #1f2937; border-color: #d1d5db;"';
        closeButtonClass = 'text-gray-600 hover:text-gray-800';
        linkClass = 'text-blue-600 hover:text-blue-800';
      }
    } else {
      // Para otros usuarios, usar clases CSS normalmente
      inlineStyles = '';
      closeButtonClass = colorScheme.popup2.closeButtonColor;
      linkClass = colorScheme.popup2.linkColor;
    }

    const baseClasses = isTransporvillaUser ? 'text-[12px] flex flex-col w-[250px] border shadow-lg' : `${colorScheme.popup2.bgColor} ${colorScheme.popup2.textColor} text-[12px] flex flex-col w-[250px] border ${colorScheme.popup2.borderColor} shadow-lg`;

    return `
      <div class="${baseClasses}" id="content2-${device.deviceId}" ${inlineStyles}>
        <button id="close-btn-${device.deviceId}" class="popup-close-btn text-sm ${closeButtonClass}">X</button>
        <h3 class="popup-title p-2 font-semibold">Unidad: ${device.deviceId.toUpperCase()}</h3>
        <p class="px-2"><strong>Velocidad:</strong> <span class="speed-value">${device.lastValidSpeed} Km/h</span></p>
        <p class="px-2"><strong>Estado:</strong> <span class="state-value">${getEstado(device.lastValidSpeed)}</span></p>
        ${isTransporvillaUser ? `<p class="px-2"><strong>Ruta Activa:</strong> <span class="rutaact-value">${device.rutaact || 'N/A'}</span></p>` : ''}
        <br>
        <h4 class="popup-subtitle px-2 font-medium">Último Reporte</h4>
        <p class="px-2" id="fecha-${device.deviceId}">
          <strong>Fecha:</strong> ${day}/${month}/${year} <strong>Hora:</strong> ${hours}:${minutes}:${seconds}
        </p>        
        <span class="px-2"><strong>Dirección:</strong> <span class="direction-value">${getDireccion(device.lastValidHeading)}</span></span>
        <span class="px-2"><strong>Ubicación:</strong> <span class="location-value">${device.direccion}</span></span>
        <a href="" class="follow-link ml-2 mr-2 mb-3 ${linkClass}" data-device-id="${device.deviceId}">🔍 Seguir Unidad</a>
      </div>
    `;
  }, [getEstado, getDireccion, getColorScheme, isTransporvillaUser]);

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