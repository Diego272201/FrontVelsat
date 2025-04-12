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
  const { data: session, status } = useSession();
  const [deviceList, setDeviceList] = useState<DeviceList[]>([]);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<{ [key: string]: google.maps.Marker }>({});
  const popupsRef = useRef<{ [key: string]: google.maps.OverlayView }>({});
  const [fechaActual, setFechaActual] = useState<fechaActual>();

  const { baseUrl } = useApi();


  useEffect(() => {
    if (typeof window !== 'undefined' && session?.user?.username) {
      const storedFechaActual = localStorage.getItem(`fechaActual_${session.user.username}`);
      const storedDeviceList = localStorage.getItem(`deviceList_${session.user.username}`);
  
      if (storedFechaActual && storedDeviceList) {
        setFechaActual({ fechaActual: storedFechaActual });
        setDeviceList(JSON.parse(storedDeviceList));
      } else {
        console.error('No se encontraron datos en el almacenamiento local.');
      }
    }
  }, [session]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const username = session?.user?.username || '';
      handleSignalRConnection(username);
    }, 3000);

    return () => clearTimeout(timer);
  }, [session]);

  const handleSignalRConnection = async (username: string) => {
    const hubUrl = `${baseUrl}/dataHubDevice?username=${username}`;
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl)
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    try {
      await connection.start();
      await connection.invoke('UnirGrupo', username);
      console.log(`Conexión SignalR establecida y unida al grupo: ${username}`);

      connection.on('ActualizarDatos', (datos) => {
        console.log('Datos recibidos de SignalR wuaaaaaaaa:', datos);

        setFechaActual({ fechaActual: datos.fechaActual });
        setDeviceList(datos.datosDevice);
      });
    } catch (error) {
      console.error('Error al conectar con SignalR:', error);
    }
  };

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
  });

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('mapLoaded', 'true');

      setMapLoaded(true);
    }
  }, [isLoaded]);

  const [mapLoaded, setMapLoaded] = useState<boolean>(false);

  useEffect(() => {
    const storedMapLoaded = localStorage.getItem('mapLoaded') === 'true';
    setMapLoaded(storedMapLoaded);
  }, []);

  const formatFecha = useCallback((fecha: any) => {
    const date = new Date(fecha);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `<strong>Fecha:</strong> ${day}/${month}/${year} <strong>Hora:</strong> ${hours}:${minutes}:${seconds}`;
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
  }, []);

  const getEstado = useCallback(
    (speed: number) => (speed < 10 ? 'Estacionado' : 'Movimiento'),
    [],
  );

  const createMarkersAndPopups = useCallback(
    (map: google.maps.Map) => {
      if (!map) return;

      const existingMarkers = markersRef.current;
      const existingPopups = popupsRef.current;

      deviceList.forEach((device) => {
        const position = new google.maps.LatLng(
          device.lastValidLatitude,
          device.lastValidLongitude,
        );

        if (existingMarkers[device.deviceId]) {
          // Actualiza la posición del marcador existente
          existingMarkers[device.deviceId].setPosition(position);
          existingMarkers[device.deviceId].setIcon(
            getMarkerIcon(device.lastValidHeading),
          );

          // Actualiza la fecha actual en el contenido del popup
          const popupContent2 = document.querySelector(
            `#content2-${device.deviceId}`,
          ) as HTMLElement;
          if (popupContent2) {
            popupContent2.innerHTML = getPopupContent(device);

            // Asignar el evento de cierre si aún no está asignado
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
          // Crear un nuevo marcador y popup
          const content1 = document.createElement('div');

          content1.innerHTML = `<div id="content" class=" bg-[#fca311] text-gray-800 px-2 py-1.5 rounded-md mt-4">${device.deviceId.toUpperCase()}</div>`;

          class Popup extends google.maps.OverlayView {
            position: google.maps.LatLng;
            containerDiv: HTMLDivElement;

            constructor(position: google.maps.LatLng, content: HTMLElement) {
              super();
              this.position = position;
              content.classList.add('popup-bubble');
              const bubbleAnchor = document.createElement('div');
              bubbleAnchor.classList.add('popup-bubble-anchor');
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

          const marker = new google.maps.Marker({
            position,
            map,
            icon: getMarkerIcon(device.lastValidHeading),
          });

          marker.addListener('click', () => {
            popup1.setMap(map);
            popup2.getMap() ? popup2.setMap(null) : popup2.setMap(map);
          });

          marker.addListener('position_changed', () => {
            const newPos = marker.getPosition();
            if (newPos) {
              popup1.position = new google.maps.LatLng(
                newPos.lat(),
                newPos.lng(),
              );
              popup1.draw();
              popup2.position = new google.maps.LatLng(
                newPos.lat(),
                newPos.lng(),
              );
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

          // Asignar el evento de cierre solo una vez al crear el popup
          const closeButton = content2.querySelector(
            `#close-btn-${device.deviceId}`,
          );
          if (closeButton) {
            closeButton.addEventListener('click', () => {
              popup2.setMap(null);
            });
          }
        }
      });
      function getPopupContent(device: any) {
        return `
            <div class="content-custom-popup" id="content2-${device.deviceId}">
                            <button id="close-btn-${device.deviceId}" class="popup-close-btn">X</button>

        <h3 class="popup-title">Unidad: ${device.deviceId.toUpperCase()}</h3>
        <p><strong>Velocidad:</strong> ${device.lastValidSpeed} Km/h</p>
        <p><strong>Estado:</strong> ${getEstado(device.lastValidSpeed)}</p>
                <br>
        <h4 class="popup-subtitle">Último Reporte</h4>
   <p>${fechaActual ? formatFecha(fechaActual.fechaActual) : 'Fecha no disponible'}</p>                  <span><strong>Dirección:</strong> ${getDireccion(device.lastValidHeading)}</span>
                <span><strong>Ubicación:</strong> ${device.direccion} </span>
          <a href="" class="follow-link" data-device-id="${device.deviceId}">🔍 Seguir Unidad</a>
            </div>
        `;
      }
    },
    [deviceList, getMarkerIcon],
  );

  const handleFollowLinkClick = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('follow-link')) {
      e.preventDefault();
      const deviceID = target.getAttribute('data-device-id');
      const url = `/trackvelnew/seguirUnidad?deviceId=${deviceID}`;
      window.open(url, '_blank');
    }
  }, []);

  useEffect(() => {
    document.addEventListener('click', handleFollowLinkClick);
    return () => {
      document.removeEventListener('click', handleFollowLinkClick);
    };
  }, [handleFollowLinkClick]);

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
    if (mapRef.current) {
      createMarkersAndPopups(mapRef.current);
    }
  }, [createMarkersAndPopups]);

  const onLoad = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      createMarkersAndPopups(map);
    },
    [createMarkersAndPopups],
  );

  const onUnmount = useCallback(() => {
    Object.values(markersRef.current).forEach((marker) => marker.setMap(null));
    Object.values(popupsRef.current).forEach((popup) => popup.setMap(null));
    markersRef.current = {};
    popupsRef.current = {};
  }, []);

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
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={6}
          onLoad={onLoad}
          onUnmount={onUnmount}
          options={memoizedMapOptions}
        >
          {/* Aquí iría cualquier componente que desees colocar dentro del mapa */}
        </GoogleMap>
      ) : (
        <Loader />
      )}

      <Sidebar centerMap={centerMap} centerUnit={centerUnit} />
    </>
  );
}
