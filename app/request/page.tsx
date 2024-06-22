'use client';
import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import '@/app/styles/popup.css';
import Sidebar from '../components/Sidebar';
import * as signalR from '@microsoft/signalr';
import { useSession } from 'next-auth/react';
import { Spinner } from '@nextui-org/react';
import Loader from '../components/Loader';

const containerStyle = {
  width: '100%',
  height: '100vh',
};

const center = {
  lat: -12.046591525826495,
  lng: -77.04689047482863,
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
  const {data: session, status } = useSession();
  const [deviceList, setDeviceList] = useState<DeviceList[]>([]);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<{ [key: string]: google.maps.Marker }>({});
  const popupsRef = useRef<{ [key: string]: google.maps.OverlayView }>({});
  const [fechaActual, setFechaActual] = useState<fechaActual>();
  const [markersLoaded, setMarkersLoaded] = useState(false);

  useEffect(() => {
    if(status === 'authenticated' && session) {
      const username = session.user.username;
      const hubUrl = `http://66.240.210.125:8586/dataHubDevice?username=${username}`;

      const connection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl)
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.Information)
        .build();

      connection.start()
        .then(() => connection.invoke('UnirGrupo', username))
        .then(() => {
          console.log(`Conexión SiganlR establecida y unida al grupo: ${username}`)
          setMarkersLoaded(true);

        })
        .catch((error) => {
          console.error('Error al conectar con SignalR: ', error);
        });

      connection.on('ActualizarDatos', (datos) => {
        setFechaActual(datos.fechaActual);
        setDeviceList(datos.datosDevice);
      });


    }
  }, [status,session]);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
  });

  const formatFecha = useCallback((fecha: any) => {
    const date = new Date(fecha);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `Fecha: ${day}/${month}/${year} Hora: ${hours}:${minutes}:${seconds}`;
  }, []);

  const getDireccion = useCallback ((heading:number) => {
    if (heading >= 0 && heading <= 22.5) return "Norte";
    if (heading>=22.51 && heading<=67.50) return "Noreste";
    if (heading>=67.51 && heading<=112.50) return "Este";
    if (heading>=112.51 && heading<=157.50 ) return "Sureste";
    if (heading>=157.51 && heading<=202.50) return "Sur";
    if (heading>=202.51 && heading<=247.50) return "Suroeste";
    if (heading>=247.51 && heading<=292.50) return "Oeste";
    if (heading>=292.51 && heading<=337.50) return "Noroeste";
    if (heading>=337.51 && heading<=360.00) return "Norte";
    return "Desconocido";
  }, []);

  const getMarkerIcon = useCallback ((heading: number) => {
    const directions = [
      { range: [0, 22.5], url: '/up.png', size: new google.maps.Size(25, 35) },
      { range: [22.51, 67.50], url: '/topright.png', size: new google.maps.Size(42, 25) },
      { range: [67.51, 112.50], url: '/right.png', size: new google.maps.Size(42, 25) },
      { range: [112.51, 157.50], url: '/downright.png', size: new google.maps.Size(42, 25) },
      { range: [157.51, 202.50], url: '/down.png', size: new google.maps.Size(25, 35) },
      { range: [202.51, 247.50], url: '/downleft.png', size: new google.maps.Size(42, 25) },
      { range: [247.51, 292.50], url: '/left.png', size: new google.maps.Size(42, 25) },
      { range: [292.51, 337.50], url: '/topleft.png', size: new google.maps.Size(42, 25) },
      { range: [337.51, 360.00], url: '/up.png', size: new google.maps.Size(25, 35) },
    ];
    const direction = directions.find(d => heading >= d.range[0] && heading <= d.range[1]);
    return direction ? { url: direction.url, scaledSize: direction.size } : { url: '/unknown.png', scaledSize: new google.maps.Size(42, 25) };
  }, []);

const getEstado = useCallback((speed: number) => speed < 10 ? "Estacionado" : "Movimiento", []);

  
  const createMarkersAndPopups = useCallback((map: google.maps.Map) => {

    if (!map) return;

    const existingMarkers = markersRef.current;
    const existingPopups = popupsRef.current;
    
    deviceList.forEach((device) => {
      const position = new google.maps.LatLng(device.lastValidLatitude, device.lastValidLongitude);
  
      if (existingMarkers[device.deviceId]) {
          // Actualiza la posición del marcador existente
          existingMarkers[device.deviceId].setPosition(position);
          existingMarkers[device.deviceId].setIcon(getMarkerIcon(device.lastValidHeading));
  
          // Actualiza la fecha actual en el contenido del popup
          const popupContent2 = document.querySelector(`#content2-${device.deviceId}`) as HTMLElement;
          if (popupContent2) {
              popupContent2.innerHTML = getPopupContent(device);
  
              // Asignar el evento de cierre si aún no está asignado
              const closeButton = popupContent2.querySelector(`#close-btn-${device.deviceId}`);
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
          content1.innerHTML = `<div id="content">${device.deviceId.toUpperCase()}</div>`;
          
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
                  if (!this.getProjection() || !this.position || !this.containerDiv) return;
                  const divPosition = this.getProjection().fromLatLngToDivPixel(this.position)!;
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
  
          // Asignar el evento de cierre solo una vez al crear el popup
          const closeButton = content2.querySelector(`#close-btn-${device.deviceId}`);
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
              <span>Unidad: ${device.deviceId.toUpperCase()} </span>
              <span>Velocidad: ${device.lastValidSpeed} Km/h </span>
              <span>Estado: ${getEstado(device.lastValidSpeed)} </span>
              <br>
              <span>ÚLTIMO REPORTE </span>
              <span>${formatFecha(fechaActual)} </span>
              <span>Dirección: ${getDireccion(device.lastValidHeading)}</span>
              <span>Ubicación: ${device.direccion} </span>
              <a href="" class="follow-link" data-device-id="${device.deviceId}">Seguir</a>
              <button id="close-btn-${device.deviceId}" class="popup-close-btn">X</button>
          </div>
      `;
  }
  

 
  }, [deviceList]);

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
      mapRef.current.setZoom(12);
    }
  }, []);

  const centerUnit = useCallback((coords: { latitud: number; longitud: number }) => {
    if (mapRef.current) {
      const centerCoords = { lat: coords.latitud, lng: coords.longitud };
      mapRef.current.setCenter(centerCoords);
      mapRef.current.setZoom(17);
      const deviceID = deviceList.find(device => device.lastValidLatitude === coords.latitud && device.lastValidLongitude === coords.longitud)?.deviceId;
      if (deviceID && popupsRef.current[deviceID]) {
        popupsRef.current[deviceID].setMap(mapRef.current);
      }
    }
  }, [deviceList]);

  useEffect(() => {
    if (mapRef.current) {
      createMarkersAndPopups(mapRef.current);
    }
  }, [mapRef.current, createMarkersAndPopups]);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const onUnmount = useCallback(() => {
    Object.values(markersRef.current).forEach(marker => marker.setMap(null));
    Object.values(popupsRef.current).forEach(popup => popup.setMap(null));
    markersRef.current = {};
    popupsRef.current = {};
    mapRef.current = null;
  }, []);

  const memoizedMapOptions = useMemo(() => ({
    mapTypeControl: false,
    fullscreenControl: true,
    fullscreenControlOptions: {
      position: 4,
    },
  }), []);

  return (
    <>
 {(!isLoaded || !markersLoaded) ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <Loader  />
        </div>
      ) : (
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={12}
          onLoad={onLoad}
          onUnmount={onUnmount}
          options={memoizedMapOptions}
        >
          <Sidebar centerMap={centerMap} centerUnit={centerUnit} />
        </GoogleMap>
      )}
    </>
  );
}
