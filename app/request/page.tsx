'use client';
import React, {
  useCallback,
  useEffect,
  useState,
  useRef,
  useMemo,
} from 'react';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import '@/app/styles/popup.css';
import Sidebar from '../components/Sidebar';
import * as signalR from '@microsoft/signalr';
import { useSession } from 'next-auth/react';
import Loader from '../components/Loader';
import { useApi } from '@/context/ApiContext';
import dynamic from 'next/dynamic';

const DynamicGoogleMap = dynamic(
  () => import('@react-google-maps/api').then(mod => mod.GoogleMap),
  { ssr: false }
);
const letters = ['V', 'E', 'L', 'S', 'A', 'T'];

const libraries: ("places")[] = ['places'];

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
}

interface fechaActual {
  fechaActual: string;
}

export default function RequestPage() {
  const isClient = typeof window !== 'undefined';
  
  const { data: session, status } = useSession();
  const [deviceList, setDeviceList] = useState<DeviceList[]>([]);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<{ [key: string]: google.maps.Marker }>({});
  const popupsRef = useRef<{ [key: string]: google.maps.OverlayView }>({});
  const [markersLoaded, setMarkersLoaded] = useState(false);

  const { baseUrl } = useApi();
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);


  const [filteredIdsFromSidebar, setFilteredIdsFromSidebar] = useState<string[] | null>(null);


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
    libraries // ← importante
  });

  useEffect(() => {
    if (!isClient) return;
    
    if (isLoaded) {
      try {
        setMapLoaded(true);
      } catch (error) {
        console.error('Error setting mapLoaded in localStorage:', error);
        setMapLoaded(true); 
      }
    } else {
      try {
        const storedMapLoaded = localStorage.getItem('mapLoaded') === 'true';
        setMapLoaded(storedMapLoaded);
      } catch (error) {
        console.error('Error getting mapLoaded from localStorage:', error);
      }
    }
  }, [isLoaded, isClient]);



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
    if (!isClient) return null;
    
    const directions = [
      { range: [0, 22.5], url: '/up.png', size: new google.maps.Size(25, 35) },
      {
        range: [22.51, 67.5],
        url: '/topright.png',
        size: new google.maps.Size(42, 25),
      },
      {
        range: [67.51, 112.5],
        url: '/right.png',
        size: new google.maps.Size(42, 25),
      },
      {
        range: [112.51, 157.5],
        url: '/downright.png',
        size: new google.maps.Size(42, 25),
      },
      {
        range: [157.51, 202.5],
        url: '/down.png',
        size: new google.maps.Size(25, 35),
      },
      {
        range: [202.51, 247.5],
        url: '/downleft.png',
        size: new google.maps.Size(42, 25),
      },
      {
        range: [247.51, 292.5],
        url: '/left.png',
        size: new google.maps.Size(42, 25),
      },
      {
        range: [292.51, 337.5],
        url: '/topleft.png',
        size: new google.maps.Size(42, 25),
      },
      {
        range: [337.51, 360.0],
        url: '/up.png',
        size: new google.maps.Size(25, 35),
      },
    ];
    const direction = directions.find(
      (d) => heading >= d.range[0] && heading <= d.range[1],
    );
    return direction
      ? { url: direction.url, scaledSize: direction.size }
      : { url: '/unknown.png', scaledSize: new google.maps.Size(42, 25) };
  }, [isClient]);

  const getEstado = useCallback(
    (speed: number) => (speed < 10 ? 'Estacionado' : 'Movimiento'),
    [],
  );



  const createMarkersAndPopups = useCallback(
    (map: google.maps.Map) => {
      if (!map || !isClient) return;
  
      const existingMarkers = markersRef.current;
      const existingPopups = popupsRef.current;

      const filteredDeviceList = filteredIdsFromSidebar
      ? deviceList.filter((device) => filteredIdsFromSidebar.includes(device.deviceId))
      : deviceList; 
    
if (filteredIdsFromSidebar) {
  Object.keys(existingMarkers).forEach((deviceId) => {
    if (!filteredIdsFromSidebar.includes(deviceId)) {
      // Eliminar marcador
      existingMarkers[deviceId].setMap(null);
      // Eliminar popup
      existingPopups[deviceId].setMap(null);
      // Eliminar contenido del popup
      const content1 = document.querySelector(`#content-${deviceId}`);
      if (content1) {
        content1.remove();
      }
      delete existingMarkers[deviceId];
      delete existingPopups[deviceId];
    }
  });
}

  
      filteredDeviceList.forEach((device) => {
        const position = new google.maps.LatLng(
          device.lastValidLatitude,
          device.lastValidLongitude,
        );
  
        if (existingMarkers[device.deviceId]) {
          // Actualiza marcador existente
          existingMarkers[device.deviceId].setPosition(position);
          const icon = getMarkerIcon(device.lastValidHeading);
          if (icon) {
            existingMarkers[device.deviceId].setIcon(icon);
          }
  
          const popupContent2 = document.querySelector(
            `#content2-${device.deviceId}`,
          ) as HTMLElement;
          if (popupContent2) {
            popupContent2.innerHTML = getPopupContent(device);
  
            const closeButton = popupContent2.querySelector(
              `#close-btn-${device.deviceId}`,
            );
            if (closeButton && !closeButton.hasAttribute('data-event-added')) {
              closeButton.setAttribute('data-event-added', 'true');
              closeButton.addEventListener('click', () => {
                existingPopups[device.deviceId].setMap(null);
              });
            }
          }
  
          existingPopups[device.deviceId].draw();
        } else {
          // Crear nuevo marcador y popups
          const content1 = document.createElement('div');
          content1.id = `content-${device.deviceId}`;
          content1.innerHTML = `
          <div class="relative flex flex-col items-center mt-4">
            <div id="content" class="bg-[#fca311] text-gray-800 px-2 py-1.5">
              ${device.deviceId.toUpperCase()}
            </div>
            <div class="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-[#fca311]"></div>
          </div>
        `;
        
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
          popup1.setMap(map);
          existingPopups[device.deviceId] = popup1;
  
          const content2 = document.createElement('div');
          content2.innerHTML = getPopupContent(device);
          const popup2 = new Popup(position, content2);
          popup2.setMap(null);
          existingPopups[device.deviceId] = popup2;
  
          const icon = getMarkerIcon(device.lastValidHeading);
          const marker = new google.maps.Marker({
            position,
            map,
            icon: icon || undefined,
          });
  
          marker.addListener('click', () => {
            popup1.setMap(map);
            popup2.getMap() ? popup2.setMap(null) : popup2.setMap(map);
          });
  
          marker.addListener('position_changed', () => {
            const newPos = marker.getPosition();
            if (newPos) {
              popup1.position = new google.maps.LatLng(newPos.lat(), newPos.lng());
              popup1.draw();
              popup2.position = new google.maps.LatLng(newPos.lat(), newPos.lng());
              popup2.draw();
            }
          });
  
          map.addListener('zoom_changed', () => {
            popup1.draw();
            popup2.draw();
          });
  
          map.addListener('center_changed', () => {
            popup1.draw();
            popup2.draw();
          });
  
          existingMarkers[device.deviceId] = marker;
  
          const closeButton = content2.querySelector(`#close-btn-${device.deviceId}`);
          const fechaEl = content2.querySelector(`#fecha-${device.deviceId}`);
  
          if (fechaEl) {
            const intervalId = setInterval(() => {
              const now = new Date();
              const day = String(now.getDate()).padStart(2, '0');
              const month = String(now.getMonth() + 1).padStart(2, '0');
              const year = now.getFullYear();
              const hours = String(now.getHours()).padStart(2, '0');
              const minutes = String(now.getMinutes()).padStart(2, '0');
              const seconds = String(now.getSeconds()).padStart(2, '0');
              fechaEl.innerHTML = `<strong>Fecha:</strong> ${day}/${month}/${year} <strong>Hora:</strong> ${hours}:${minutes}:${seconds}`;
            }, 1000);
  
            if (closeButton) {
              closeButton.addEventListener('click', () => {
                popup2.setMap(null);
                clearInterval(intervalId);
              });
            }
          }
        }
      });
  
      function getPopupContent(device: any) {
        const fechaActualHoy = new Date();
        const day = String(fechaActualHoy.getDate()).padStart(2, '0');
        const month = String(fechaActualHoy.getMonth() + 1).padStart(2, '0');
        const year = fechaActualHoy.getFullYear();
        const hours = String(fechaActualHoy.getHours()).padStart(2, '0');
        const minutes = String(fechaActualHoy.getMinutes()).padStart(2, '0');
        const seconds = String(fechaActualHoy.getSeconds()).padStart(2, '0');
  
        return `
          <div class="bg-[#1f2937] text-[12px] text-white flex flex-col w-[250px]" id="content2-${device.deviceId}">

            <button id="close-btn-${device.deviceId}" class="popup-close-btn text-sm">X</button>
            <h3 class="popup-title p-2">Unidad: ${device.deviceId.toUpperCase()}</h3>
            <p class="px-2"><strong>Velocidad:</strong> ${device.lastValidSpeed} Km/h</p>
            <p class="px-2"><strong>Estado:</strong> ${getEstado(device.lastValidSpeed)}</p>
            <br>
            <h4 class="popup-subtitle px-2">Último Reporte</h4>
            <p class="px-2" id="fecha-${device.deviceId}">
              <strong>Fecha:</strong> ${day}/${month}/${year} <strong>Hora:</strong> ${hours}:${minutes}:${seconds}
            </p>        
            <span class="px-2"><strong>Dirección:</strong> ${getDireccion(device.lastValidHeading)}</span>
            <span class="px-2"><strong>Ubicación:</strong> ${device.direccion} </span>
            <a href="" class="follow-link ml-2 mr-2 mb-3" data-device-id="${device.deviceId}">🔍 Seguir Unidad</a>

          </div>
        `;
      }
    },
    [deviceList, filteredIdsFromSidebar,getMarkerIcon, getEstado, getDireccion, isClient],
  );
  

  const handleFollowLinkClick = useCallback((e: MouseEvent) => {
    if (!isClient) return;
    
    const target = e.target as HTMLElement;
    if (target.classList.contains('follow-link')) {
      e.preventDefault();
      const deviceID = target.getAttribute('data-device-id');
      const url = `/trackvelnew/seguirUnidad?deviceId=${deviceID}`;
      window.open(url, '_blank');
    }
  }, [isClient]);

  useEffect(() => {
    if (!isClient) return;
    
    document.addEventListener('click', handleFollowLinkClick);
    return () => {
      document.removeEventListener('click', handleFollowLinkClick);
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
        if (deviceID && popupsRef.current[deviceID]) {
          popupsRef.current[deviceID].setMap(mapRef.current);
        }
      }
    },
    [deviceList],
  );

  useEffect(() => {
    if (mapRef.current && isClient) {
      createMarkersAndPopups(mapRef.current);
    }
  }, [createMarkersAndPopups, isClient]);

  const onLoad = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      setMarkersLoaded(false);
      createMarkersAndPopups(map);
    },
    [createMarkersAndPopups],
  );

  const onUnmount = useCallback(() => {
    if (!isClient) return;
    
    Object.values(markersRef.current).forEach((marker) => marker.setMap(null));
    Object.values(popupsRef.current).forEach((popup) => popup.setMap(null));
    markersRef.current = {};
    popupsRef.current = {};
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


  return (
    <>
    {isLoaded && mapLoaded ? (
      <div className="relative">
        {!markersLoaded && (
         <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-white/25 z-[9999]">
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
        >
        </DynamicGoogleMap>
      </div>
    ) : (
      <Loader></Loader>
    )}

    <Sidebar centerMap={centerMap} centerUnit={centerUnit}  onFilteredIdsChange={setFilteredIdsFromSidebar}/>
  </>
  );
}