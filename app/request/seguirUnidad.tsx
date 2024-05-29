import React, { useEffect, useRef, useState } from 'react';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import '@/app/styles/popup.css';
import axios from 'axios';
import { urlDeviceList } from '../components/urlsApi/urlApi';

interface DeviceList {
  deviceId: string;
  lastValidLatitude: number;
  lastValidLongitude: number;
  lastValidSpeed: number;
  direccion: string;
  fechaActual: string;
  lastValidHeading: number;
}

export default function SeguirUnidad() {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [unitList, setUnitList] = useState<DeviceList[]>([]);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const popupsRef = useRef<google.maps.OverlayView[]>([]);
  const popupsRef2 = useRef<{ [key: string]: google.maps.OverlayView }>({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryDeviceId = params.get('deviceId');
    if (queryDeviceId) {
      setDeviceId(queryDeviceId);
      fetchUnitList(queryDeviceId);
    }
  }, []);

  useEffect(() => {
    if (mapRef.current && unitList.length > 0) {
      createMarker(mapRef.current, unitList[0]);
      centerMapOnUnit(unitList[0]);

    }
  }, [unitList]);

  const fetchUnitList = async (deviceId: string) => {
    try {
      const response = await axios.get(urlDeviceList);
      const { fechaActual, datosDevice } = response.data;
      const dataWithDate = datosDevice.map((device: DeviceList) => ({
        ...device,
        fechaActual,
      }));
      const filteredUnits = dataWithDate.filter(
        (device: DeviceList) => device.deviceId === deviceId,
      );
      setUnitList(filteredUnits);
    } catch (error) {
      console.error('Error fetching unit data: ', error);
    }
  };

  const centerMapOnUnit = (unit: DeviceList) => {
    if (mapRef.current) {
      const position = new google.maps.LatLng(unit.lastValidLatitude, unit.lastValidLongitude);
      mapRef.current.setCenter(position);
      mapRef.current.setZoom(17);
    }
  };
  
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

  const getDireccion = (heading: number) => {
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
  };

  const getMarkerIcon = (heading: number) => {
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
  };

  const getEstado = (speed: number) =>
    speed < 10 ? 'Estacionado' : 'Movimiento';

  const createMarker = (map: google.maps.Map, unit: DeviceList) => {
    markersRef.current.forEach((marker) => marker.setMap(null));
    popupsRef.current.forEach((popup) => popup.setMap(null));
    markersRef.current = [];
    popupsRef.current = [];
    

    class Popup extends google.maps.OverlayView {
      position: google.maps.LatLng;
      containerDiv: HTMLDivElement;

      constructor(position: google.maps.LatLng, content: HTMLElement) {
        super();
        this.position = position;
        content.classList.add('popup-bubble-unit');
        const bubbleAnchor = document.createElement('div');
        bubbleAnchor.classList.add('popup-bubble-unit-anchor');
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

    unitList.forEach(() => {
      const position = new google.maps.LatLng(
        unit.lastValidLatitude,
        unit.lastValidLongitude,
      );
      
      const content1 = document.createElement('div');
      content1.innerHTML = `<div id="content">${unit.deviceId.toUpperCase()}</div>`;
      const popup1 = new Popup(position, content1);
      popup1.setMap(map);
      popupsRef.current.push(popup1);

      const content2 = document.createElement('div');
      content2.innerHTML = `
        <div class="content-custom-popup">
          <span>Unidad: ${unit.deviceId.toUpperCase()} </span>
          <span>Velocidad: ${unit.lastValidSpeed} Km/h </span>
          <span>Estado: ${getEstado(unit.lastValidSpeed)} </span>
          <br>
          <span>ÚLTIMO REPORTE </span>
          <span>${formatFecha(unit.fechaActual)} </span>
          <span>Dirección: ${getDireccion(unit.lastValidHeading)}</span>
          <span>Ubicación: ${unit.direccion} </span>
          <button id="close-btn-${unit.deviceId}" class="popup-close-btn">X</button>
        </div>
      `;
      const popup2 = new Popup(position, content2);

      const closeButton = content2.querySelector(
        `#close-btn-${unit.deviceId}`,
      )!;
      
      closeButton.addEventListener('click', () => {
        popup2.setMap(null);
      });

      const marker = new google.maps.Marker({
        position,
        map,
        icon: getMarkerIcon(unit.lastValidHeading),
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

      markersRef.current.push(marker);
      popupsRef2.current[unit.deviceId] = popup2;
    });
  };

  const containerStyle = {
    width: '100%',
    height: '100vh',
  };

  const onLoad = React.useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const onUnmount = React.useCallback(() => {
    mapRef.current = null;
  }, []);

  return isLoaded ? (
    <GoogleMap
      mapContainerStyle={containerStyle}
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
    ></GoogleMap>
  ) : (
    <></>
  );
}
