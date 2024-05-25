'use client';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import '@/app/styles/popup.css';
import axios from 'axios';
import { urlDeviceList } from '../components/urlsApi/urlApi';
import Sidebar from '../components/Sidebar';

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
  fechaActual: string;
  lastValidHeading: number;
}

export default function RequestPage() {
  const [deviceList, setDeviceList] = useState<DeviceList[]>([]);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const markersRef = useRef<google.maps.Marker[]>([]);
  const popupsRef = useRef<google.maps.OverlayView[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const response = await axios.get(urlDeviceList);
      const { fechaActual, datosDevice } = response.data;

      const dataWithDate = datosDevice.map((device: DeviceList) => ({
        ...device,
        fechaActual
      }));

      setDeviceList(dataWithDate);
    } catch (error) {
      console.error('Error fetching data: ', error);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
  });

  const formatFecha = (fecha: string) => {
    const date = new Date(fecha);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `Fecha: ${day}/${month}/${year} Hora: ${hours}:${minutes}`;
  };

  const getDireccion = (heading:number) => {
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
  };

  const getMarkerIcon = (heading: number) => {
    let url = '/unknown.png';
    let scaledSize = new google.maps.Size(42, 25);
  
    if (heading >= 0 && heading <= 22.5) {
      url = '/up.png';
      scaledSize = new google.maps.Size(25, 35);
    } else if (heading >= 22.51 && heading <= 67.50) {
      url = '/topright.png';
    } else if (heading >= 67.51 && heading <= 112.50) {
      url = '/right.png';
    } else if (heading >= 112.51 && heading <= 157.50) {
      url = '/downright.png';
    } else if (heading >= 157.51 && heading <= 202.50) {
      url = '/down.png';
      scaledSize = new google.maps.Size(25, 35);
    } else if (heading >= 202.51 && heading <= 247.50) {
      url = '/downleft.png';
    } else if (heading >= 247.51 && heading <= 292.50) {
      url = '/left.png';
    } else if (heading >= 292.51 && heading <= 337.50) {
      url = '/topleft.png';
    } else if (heading >= 337.51 && heading <= 360.00) {
      url = '/up.png';
      scaledSize = new google.maps.Size(25, 35);
    }
  
    return { url, scaledSize };
  };

  const getEstado = (speed: number) => {
    if(speed < 10){
      return "Estacionado"
    } else{
      return "Movimiento"
    }
  };

  const createMarkersAndPopups = useCallback((map: google.maps.Map) => {
    markersRef.current.forEach(marker => marker.setMap(null));
    popupsRef.current.forEach(popup => popup.setMap(null));

    markersRef.current = [];
    popupsRef.current = [];

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
        if (!this.getProjection() || !this.position || !this.containerDiv) {
          return;
        }
        
        const divPosition = this.getProjection().fromLatLngToDivPixel(this.position)!;
        this.containerDiv.style.left = `${divPosition.x}px`;
        this.containerDiv.style.top = `${divPosition.y}px`;
        this.containerDiv.style.display = 'block';
      }
    }

    deviceList.forEach((device) => {
      const position = new google.maps.LatLng(device.lastValidLatitude, device.lastValidLongitude);

      const content1 = document.createElement('div');
      content1.innerHTML = `<div id="content">${device.deviceId.toUpperCase()}</div>`;
      const popup1 = new Popup(position, content1);
      popup1.setMap(map);
      popupsRef.current.push(popup1);

      const content2 = document.createElement('div');
      content2.innerHTML = `
        <div class="content-custom-popup">
          <span>Unidad: ${device.deviceId.toUpperCase()} </span>
          <span>Velocidad: ${device.lastValidSpeed} Km/h </span>
          <span>Estado: ${getEstado(device.lastValidSpeed)} </span>
          <br>
          <span>ÚLTIMO REPORTE </span>
          <span>${formatFecha(device.fechaActual)} </span>
          <span>Dirección: ${getDireccion(device.lastValidHeading)}</span>
          <span>Ubicación: ${device.direccion} </span>
          <a href="#" class="follow-link">Seguir</a>
          <button id="close-btn-${device.deviceId}" class="popup-close-btn">X</button>
        </div>
      `;
      const popup2 = new Popup(position, content2);
      const closeButton = content2.querySelector(`#close-btn-${device.deviceId}`)!;
      closeButton.addEventListener('click', () => {
        popup2.setMap(null);
      });

      const marker = new google.maps.Marker({
        position,
        map,
        icon: {
          url: getMarkerIcon(device.lastValidHeading).url,
          scaledSize: getMarkerIcon(device.lastValidHeading).scaledSize,
          anchor: new google.maps.Point(25, 50),
        },
      });

      marker.addListener('click', () => {
        popup1.setMap(map);
    
        if (popup2.getMap()) {
          popup2.setMap(null);
        } else {
          popup2.setMap(map);
        }
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

      markersRef.current.push(marker);
    });
  }, [deviceList]);

  const centerMap = useCallback(() => {
    if (map) {
      map.setCenter(center);
      map.setZoom(12);
    }
  }, [map]);

  const centerUnit = useCallback((coords: { latitud: number; longitud: number }) => {
    if (map) {
      const centerCoords = { lat: coords.latitud, lng: coords.longitud };
      map.setCenter(centerCoords);
      map.setZoom(17);
      
    }
  }, [map]);


  useEffect(() => {
    if (map) {
      createMarkersAndPopups(map);
    }
  }, [map, createMarkersAndPopups]);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback((map: google.maps.Map) => {
    markersRef.current.forEach(marker => marker.setMap(null));
    popupsRef.current.forEach(popup => popup.setMap(null));
    markersRef.current = [];
    popupsRef.current = [];
    setMap(null);
  }, []);

  return isLoaded ? (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={12}
      onLoad={onLoad}
      onUnmount={onUnmount}
      options={{
        mapTypeControl: false,
        fullscreenControl: true,
        fullscreenControlOptions: {
          position: google.maps.ControlPosition.BOTTOM_RIGHT,
        },
      }}
    >
      <Sidebar centerMap={centerMap} centerUnit={centerUnit}/>
    </GoogleMap>
  ) : (
    <></>
  );
}


