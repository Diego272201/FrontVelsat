'use client';
import React, { useCallback, useState } from 'react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import '@/app/styles/popup.css';

const containerStyle = {
  width: '100%',
  height: '100vh'
};

const center = {
  lat: -12.046591525826495,
  lng: -77.04689047482863
};

export default function RequestPage() {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [showNewPopup, setShowNewPopup] = useState(false);

  const onLoad = useCallback(function callback(map: google.maps.Map) {
    setMap(map);

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
        const divPosition = this.getProjection().fromLatLngToDivPixel(this.position)!;
        this.containerDiv.style.left = divPosition.x + 'px';
        this.containerDiv.style.top = divPosition.y + 'px';
        this.containerDiv.style.display = 'block';
      }
    }

    // PRIMER POPUP
    const content1 = document.createElement('div');
    content1.innerHTML = '<div id="content">C128-B6A726</div>';

    const position = new google.maps.LatLng(-12.046591525826495, -77.04689047482863);
    const popup1 = new Popup(position, content1);
    popup1.setMap(map);

    // SEGUNDO POPUP
    const content2 = document.createElement('div');
    content2.innerHTML = `
      <div class="content-custom-popup">
        <span>Unidad: C128-B6A726 </span>
        <span>Velocidad: 0 Km/h </span>
        <span>Estado: Estacionado </span>
        <br>
        <span>ÚLTIMO REPORTE </span>
        <span>Fecha: 21/05/2024 Hora: 14:20 </span>
        <span>Dirección: Norte </span>
        <span>Ubicación: Callao, Callao, 07001, Perú </span>
        <a href="#" class="follow-link">Seguir</a>
        <button id="close-btn" class="popup-close-btn">X</button>
      </div>
    `;
    const popup2 = new Popup(position, content2);
    const closeButton = content2.querySelector('#close-btn')!;
    closeButton.addEventListener('click', () => {
      setShowNewPopup(false);
      popup2.setMap(null);
    });

    // MARKER
    const marker = new google.maps.Marker({
      position,
      map,
      icon: {
        url: '/right.png',
        scaledSize: new google.maps.Size(42, 25),
        anchor: new google.maps.Point(25, 50)
      }
    });

    marker.addListener('click', () => {
      setShowNewPopup((prevState) => {
        const newState = !prevState;
        if (newState) {
          popup2.setMap(map);
        } else {
          popup2.setMap(null);
        }
        return newState;
      });
    });

    marker.addListener('position_changed', () => {
      const newPos = marker.getPosition();
      if (newPos) {
        popup1.position = new google.maps.LatLng(newPos.lat(), newPos.lng());
        popup1.draw();
        if (showNewPopup) {
          popup2.position = new google.maps.LatLng(newPos.lat(), newPos.lng());
          popup2.draw();
        }
      }
    });

    map.addListener('zoom_changed', () => {
      popup1.draw();
      if (showNewPopup) {
        popup2.draw();
      }
    });

    map.addListener('center_changed', () => {
      popup1.draw();
      if (showNewPopup) {
        popup2.draw();
      }
    });
  }, [showNewPopup]);

  const onUnmount = useCallback(function callback(map: google.maps.Map) {
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
          position: google.maps.ControlPosition.BOTTOM_RIGHT
        }
      }}
    >
    </GoogleMap>
  ) : <></>;
}
