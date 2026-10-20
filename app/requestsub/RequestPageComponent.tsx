'use client';
import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { MapContainer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';
import '@/app/styles/popup.css';
import Sidebar from '../components/Sidebar';
import { useSession } from 'next-auth/react';
import Loader from '../components/Loader';
import { useApi } from '@/context/ApiContext';
import DocumentosPorVencer from '../components/ExpirySubAlerts';
import FollowUnitCamera from '../components/FollowUnitCamera';
import LeafletMapControls, { MAP_MAX_ZOOM } from './LeafletMapControls';

/*
 * Mapa principal de /subtrackvelnew. REGLA: aquí no se usa ninguna API key
 * de Google ni ninguna API de pago. El mapa y el tráfico son tiles públicos
 * (ver LeafletMapControls) y el visor inferior usa el embed público de
 * Street View (FollowUnitCamera con `keyless`).
 */

interface DeviceList {
  deviceId: string;
  lastValidLatitude: number;
  lastValidLongitude: number;
  lastValidSpeed: number;
  direccion: string;
  lastValidHeading: number;
  lastGPSTimestamp: number;
  rutaact: string;
}

interface MarkerData {
  marker: L.Marker;
  label: L.Marker;
  popup: L.Popup;
  content: HTMLElement;
}

const center: [number, number] = [-9.22812, -75.78894];

const USERS_WITH_GPS_TIMESTAMP = ['oloasac'];

const PLATE_BG = '#fca311';
const PLATE_TEXT = '#1f2937';
const CARD_BG = '#1f2937';

const CAMERA_SVG = `
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
    <circle cx="12" cy="13" r="3"/>
  </svg>`;

function sanitize(value: string): string {
  const el = document.createElement('div');
  el.textContent = value ?? '';
  return el.innerHTML;
}

function formatDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} · ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function getDireccion(heading: number): string {
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
}

const getEstado = (speed: number) => (speed < 10 ? 'Estacionado' : 'Movimiento');

const MapController = ({ onMapReady }: { onMapReady: (map: L.Map) => void }) => {
  const map = useMap();

  useEffect(() => {
    if (map) onMapReady(map);
  }, [map, onMapReady]);

  return null;
};

export default function RequestPage() {
  const isClient = typeof window !== 'undefined';

  const { data: session } = useSession();
  const username = session?.user?.username ?? '';
  const useGpsTime = USERS_WITH_GPS_TIMESTAMP.includes(username);
  const { baseUrl } = useApi();

  const [deviceList, setDeviceList] = useState<DeviceList[]>([]);
  const [map, setMap] = useState<L.Map | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersDataRef = useRef<{ [key: string]: MarkerData }>({});
  const [markersLoaded, setMarkersLoaded] = useState(false);
  const [filteredIdsFromSidebar, setFilteredIdsFromSidebar] = useState<
    string[] | null
  >(null);

  // Unidad con cámara fija: el mapa la sigue y abajo a la derecha se ve su calle
  const [followedDeviceId, setFollowedDeviceId] = useState<string | null>(null);
  const [isCameraMinimized, setIsCameraMinimized] = useState(false);
  const followedDeviceIdRef = useRef<string | null>(null);
  followedDeviceIdRef.current = followedDeviceId;

  const deviceListRef = useRef<DeviceList[]>([]);
  deviceListRef.current = deviceList;

  const iconCache = useRef<{ [key: string]: L.Icon }>({});

  useEffect(() => {
    const fontId = 'pv2-popup-fonts';
    if (document.getElementById(fontId)) return;
    const link = document.createElement('link');
    link.id = fontId;
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap';
    document.head.appendChild(link);
  }, []);

  // Reloj de "Último reporte" (salvo usuarios que ven la hora del GPS)
  useEffect(() => {
    const id = setInterval(() => {
      const text = formatDateTime(new Date());
      document.querySelectorAll('.pv2-clock').forEach((el) => {
        el.textContent = text;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let isComponentMounted = true;
    let intervalId: NodeJS.Timeout | null = null;

    const fetchDeviceData = async () => {
      if (!isComponentMounted || !username || !baseUrl) return;

      try {
        const response = await fetch(`${baseUrl}/api/DeviceList/${username}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
          },
        });

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        if (!isComponentMounted) return;

        const datos: DeviceList[] = data.datosDevice;
        setMarkersLoaded(true);
        setDeviceList(datos);

        // Cámara fija: mantener centrada la unidad seguida
        const followed =
          followedDeviceIdRef.current &&
          datos.find((d) => d.deviceId === followedDeviceIdRef.current);
        if (followed && mapRef.current) {
          mapRef.current.panTo([
            followed.lastValidLatitude,
            followed.lastValidLongitude,
          ]);
        }
      } catch (error) {
        console.error('Error obteniendo datos de devices:', error);
      }
    };

    const handleVisibilityChange = () => {
      if (!isComponentMounted) return;

      if (document.visibilityState === 'visible') {
        fetchDeviceData();
        if (!intervalId) intervalId = setInterval(fetchDeviceData, 8000);
      } else if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    fetchDeviceData();
    intervalId = setInterval(fetchDeviceData, 8000);

    return () => {
      isComponentMounted = false;
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [username, baseUrl]);

  const getMarkerIcon = useCallback((heading: number) => {
    const cacheKey = Math.floor(heading / 45) * 45;
    if (iconCache.current[cacheKey]) return iconCache.current[cacheKey];

    const directions: { range: [number, number]; url: string; size: [number, number] }[] = [
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
    const url = direction?.url ?? '/unknown.png';
    const size = direction?.size ?? [42, 25];

    const icon = L.icon({
      iconUrl: url,
      iconSize: size,
      iconAnchor: [size[0] / 2, size[1] / 2],
    });
    iconCache.current[cacheKey] = icon;
    return icon;
  }, []);

  const reportDateText = useCallback(
    (device: DeviceList) => {
      if (!useGpsTime) return formatDateTime(new Date());
      if (!device.lastGPSTimestamp) return 'Sin datos';
      return formatDateTime(new Date(device.lastGPSTimestamp * 1000));
    },
    [useGpsTime],
  );

  const updateCameraButtonStates = useCallback((activeId: string | null) => {
    document.querySelectorAll('.camera-track-btn').forEach((btn) => {
      const isFollowed = btn.getAttribute('data-device-id') === activeId;
      btn.classList.toggle('pv2-cam-btn-active', isFollowed);
      (btn as HTMLElement).title = isFollowed
        ? 'Desactivar cámara fija'
        : 'Fijar cámara en este vehículo';
    });
  }, []);

  const setFollowed = useCallback(
    (deviceId: string | null) => {
      followedDeviceIdRef.current = deviceId;
      setFollowedDeviceId(deviceId);
      updateCameraButtonStates(deviceId);
    },
    [updateCameraButtonStates],
  );

  const toggleFollowUnit = useCallback(
    (deviceId: string) => {
      if (followedDeviceIdRef.current === deviceId) {
        setFollowed(null);
        return;
      }
      setFollowed(deviceId);

      const target = deviceListRef.current.find((d) => d.deviceId === deviceId);
      if (target && mapRef.current) {
        mapRef.current.setView(
          [target.lastValidLatitude, target.lastValidLongitude],
          Math.max(mapRef.current.getZoom(), 16),
        );
      }
    },
    [setFollowed],
  );

  const openStreetView = useCallback((lat: number, lng: number) => {
    // Abre Google Maps en una pestaña nueva (sitio público, sin API key)
    const isMobile = /iphone|ipad|ipod|android/.test(navigator.userAgent.toLowerCase());
    const url = isMobile
      ? `https://www.google.com/maps?q=&layer=c&cbll=${lat},${lng}`
      : `https://www.google.com/maps/@${lat},${lng},3a,75y,90t/data=!3m6!1e1!3m4!1s0:0!2e0!7i16384!8i8192`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  const buildPopupContent = useCallback(
    (device: DeviceList): HTMLElement => {
      const safeId = sanitize(device.deviceId);
      const isFollowed = device.deviceId === followedDeviceIdRef.current;

      const wrapper = document.createElement('div');
      wrapper.innerHTML = `
        <div class="pv2-popup" id="content2-${safeId}" style="--pv2-tint: ${CARD_BG}; background-color: ${CARD_BG}; color: #ffffff;">
          <div class="pv2-card">
            <div class="pv2-header">
              <button type="button" class="pv2-close-btn">X</button>
              <span class="pv2-plate">${safeId.toUpperCase()}</span>
              <div class="pv2-online">
                <span class="pv2-online-dot-wrap">
                  <span class="pv2-online-halo"></span>
                  <span class="pv2-online-dot"></span>
                </span>
                <span class="pv2-online-text">Online</span>
              </div>
              <span class="pv2-divider"></span>
              <button
                type="button"
                class="camera-track-btn pv2-cam-btn${isFollowed ? ' pv2-cam-btn-active' : ''}"
                data-device-id="${safeId}"
                title="${isFollowed ? 'Desactivar cámara fija' : 'Fijar cámara en este vehículo'}"
              >${CAMERA_SVG}</button>
            </div>

            <div class="pv2-body">
              <div class="pv2-stats">
                <div class="pv2-stat">
                  <span class="pv2-stat-label">Velocidad</span>
                  <span class="pv2-stat-value"><span class="speed-value">${Math.round(device.lastValidSpeed)}</span><span class="pv2-stat-unit">km/h</span></span>
                </div>
                <div class="pv2-stat">
                  <span class="pv2-stat-label">Estado</span>
                  <span class="pv2-stat-value state-value">${getEstado(device.lastValidSpeed)}</span>
                </div>
              </div>

              <div class="pv2-report">
                <span class="pv2-report-heading">Último reporte</span>
                <div class="pv2-report-row">
                  <span class="pv2-report-label">Fecha</span>
                  <span class="pv2-report-value fecha-value${useGpsTime ? '' : ' pv2-clock'}">${reportDateText(device)}</span>
                </div>
                <div class="pv2-report-row">
                  <span class="pv2-report-label">Dirección</span>
                  <span class="pv2-report-value direction-value">${getDireccion(device.lastValidHeading)}</span>
                </div>
                <div class="pv2-report-row">
                  <span class="pv2-report-label">Ubicación</span>
                  <span class="pv2-report-value location-value">${sanitize(device.direccion)}</span>
                </div>
              </div>

              <div class="pv2-actions">
                <a href="" class="follow-link pv2-btn-primary">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="m21 21-4.35-4.35"/>
                  </svg>
                  <span>Seguir unidad</span>
                </a>

                <a href="" class="street-view-link pv2-btn-icon" title="Vista 3D (abre Google Maps)" data-lat="${device.lastValidLatitude}" data-lng="${device.lastValidLongitude}">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.73Z"/>
                    <path d="m3.3 7 8.7 5 8.7-5"/>
                    <path d="M12 22V12"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>`;

      return wrapper.firstElementChild as HTMLElement;
    },
    [reportDateText, useGpsTime],
  );

  const updatePopupContent = useCallback(
    (device: DeviceList, content: HTMLElement) => {
      const set = (selector: string, text: string) => {
        const el = content.querySelector(selector);
        if (el) el.textContent = text;
      };
      set('.speed-value', `${Math.round(device.lastValidSpeed)}`);
      set('.state-value', getEstado(device.lastValidSpeed));
      set('.direction-value', getDireccion(device.lastValidHeading));
      set('.location-value', device.direccion);
      if (useGpsTime) set('.fecha-value', reportDateText(device));

      const streetViewLink = content.querySelector('.street-view-link');
      streetViewLink?.setAttribute('data-lat', String(device.lastValidLatitude));
      streetViewLink?.setAttribute('data-lng', String(device.lastValidLongitude));
    },
    [reportDateText, useGpsTime],
  );

  const openUnitPopup = useCallback((deviceId: string) => {
    const data = markersDataRef.current[deviceId];
    if (data && mapRef.current && !mapRef.current.hasLayer(data.popup)) {
      data.popup.addTo(mapRef.current);
    }
  }, []);

  const createNewMarker = useCallback(
    (device: DeviceList, map: L.Map) => {
      const position: [number, number] = [
        device.lastValidLatitude,
        device.lastValidLongitude,
      ];
      const deviceId = device.deviceId;
      const safeId = sanitize(deviceId).toUpperCase();

      const marker = L.marker(position, {
        icon: getMarkerIcon(device.lastValidHeading),
      }).addTo(map);

      // Placa sobre el vehículo (mismo estilo que trackvelnew)
      const label = L.marker(position, {
        interactive: false,
        keyboard: false,
        icon: L.divIcon({
          className: '',
          iconSize: [0, 0],
          iconAnchor: [0, 0],
          html: `
            <div style="position:absolute;transform:translate(-50%,calc(-100% - 14px));display:flex;flex-direction:column;align-items:center;">
              <div class="custom-popup1-font" style="background-color:${PLATE_BG};color:${PLATE_TEXT};border:1px solid ${PLATE_BG};padding:6px 8px;white-space:nowrap;">${safeId}</div>
              <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:8px solid ${PLATE_BG};"></div>
            </div>`,
        }),
      }).addTo(map);

      const content = buildPopupContent(device);
      const popup = L.popup({
        closeButton: false,
        autoClose: false,
        closeOnClick: false,
        autoPan: false,
        minWidth: 288,
        maxWidth: 320,
        // Leaflet ya separa el popup 20px del punto (margin-bottom de
        // .leaflet-popup); con +8 el borde inferior queda ~12px sobre el
        // vehículo y tapa por completo la placa, como en trackvelnew.
        offset: [0, 8],
        className: 'transparent-popup',
      })
        .setLatLng(position)
        .setContent(content);

      content.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;

        if (target.closest('.pv2-close-btn')) {
          e.preventDefault();
          popup.remove();
          return;
        }
        if (target.closest('.camera-track-btn')) {
          e.preventDefault();
          toggleFollowUnit(deviceId);
          return;
        }
        if (target.closest('.follow-link')) {
          e.preventDefault();
          window.open(`/subtrackvelnew/seguirUnidad?deviceId=${encodeURIComponent(deviceId)}`, '_blank');
          return;
        }
        const streetViewLink = target.closest('.street-view-link');
        if (streetViewLink) {
          e.preventDefault();
          openStreetView(
            parseFloat(streetViewLink.getAttribute('data-lat') || '0'),
            parseFloat(streetViewLink.getAttribute('data-lng') || '0'),
          );
        }
      });

      marker.on('click', () => {
        if (map.hasLayer(popup)) {
          popup.remove();
        } else {
          popup.addTo(map);
          setFollowed(deviceId);
        }
      });

      markersDataRef.current[deviceId] = { marker, label, popup, content };
    },
    [getMarkerIcon, buildPopupContent, toggleFollowUnit, openStreetView, setFollowed],
  );

  const removeMarker = useCallback((deviceId: string) => {
    const data = markersDataRef.current[deviceId];
    if (!data) return;
    data.marker.remove();
    data.label.remove();
    data.popup.remove();
    delete markersDataRef.current[deviceId];
  }, []);

  // Sincronizar marcadores con la lista de unidades (y el filtro del sidebar)
  useEffect(() => {
    if (!map || deviceList.length === 0) return;

    const visible = filteredIdsFromSidebar
      ? deviceList.filter((d) => filteredIdsFromSidebar.includes(d.deviceId))
      : deviceList;

    if (filteredIdsFromSidebar) {
      Object.keys(markersDataRef.current).forEach((deviceId) => {
        if (!filteredIdsFromSidebar.includes(deviceId)) removeMarker(deviceId);
      });
    }

    visible.forEach((device) => {
      const existing = markersDataRef.current[device.deviceId];
      if (!existing) {
        createNewMarker(device, map);
        return;
      }

      const position = L.latLng(device.lastValidLatitude, device.lastValidLongitude);
      if (!existing.marker.getLatLng().equals(position)) {
        existing.marker.setLatLng(position);
        existing.label.setLatLng(position);
        existing.popup.setLatLng(position);
      }
      existing.marker.setIcon(getMarkerIcon(device.lastValidHeading));
      updatePopupContent(device, existing.content);
    });
  }, [
    map,
    deviceList,
    filteredIdsFromSidebar,
    createNewMarker,
    removeMarker,
    getMarkerIcon,
    updatePopupContent,
  ]);

  const centerMap = useCallback(() => {
    mapRef.current?.setView(center, 6);
  }, []);

  const centerUnit = useCallback(
    (coords: { latitud: number; longitud: number }, explicitDeviceId?: string) => {
      if (!mapRef.current) return;
      mapRef.current.setView([coords.latitud, coords.longitud], 17);

      const target = explicitDeviceId
        ? deviceListRef.current.find(
            (d) => d.deviceId.toLowerCase() === explicitDeviceId.toLowerCase(),
          )
        : deviceListRef.current.find(
            (d) =>
              d.lastValidLatitude === coords.latitud &&
              d.lastValidLongitude === coords.longitud,
          );

      if (target) {
        openUnitPopup(target.deviceId);
        setFollowed(target.deviceId);
      }
    },
    [openUnitPopup, setFollowed],
  );

  const onMapReady = useCallback((instance: L.Map) => {
    mapRef.current = instance;
    setMap(instance);
    if (typeof window !== 'undefined') {
      (window as any).__leafletMap = instance;
      (window as any).__leafletL = L;
    }
  }, []);

  useEffect(() => {
    return () => {
      Object.keys(markersDataRef.current).forEach(removeMarker);
      iconCache.current = {};
      if (typeof window !== 'undefined') {
        delete (window as any).__leafletMap;
      }
    };
  }, [removeMarker]);

  const followedDevice = useMemo(
    () => deviceList.find((d) => d.deviceId === followedDeviceId) || null,
    [deviceList, followedDeviceId],
  );

  if (!isClient) {
    return <Loader />;
  }

  return (
    <>
      <div className="relative">
        {!markersLoaded && (
          <div className="absolute left-0 top-0 z-[9999] flex h-full w-full items-center justify-center bg-white/25">
            <Loader />
          </div>
        )}

        <div className="h-screen w-full">
          <MapContainer
            center={center}
            zoom={6}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%' }}
            className="z-10"
            zoomControl={false}
            attributionControl={false}
            maxZoom={MAP_MAX_ZOOM}
            minZoom={1}
            closePopupOnClick={false}
          >
            <MapController onMapReady={onMapReady} />
          </MapContainer>
        </div>

        <LeafletMapControls
          map={map}
          onCenterMap={centerMap}
          baseUrl={baseUrl}
          username={username}
        />

        <style jsx global>{`
          .transparent-popup .leaflet-popup-content-wrapper {
            background: transparent !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
          }

          .transparent-popup .leaflet-popup-tip-container {
            display: none !important;
          }

          .transparent-popup .leaflet-popup-content {
            margin: 0 !important;
            width: auto !important;
          }
        `}</style>
      </div>

      {/* Sidebar con posicionamiento fijo */}
      <div className="absolute left-0 top-0 z-50">
        <Sidebar
          centerMap={centerMap}
          centerUnit={centerUnit}
          onFilteredIdsChange={setFilteredIdsFromSidebar}
        />
      </div>

      <DocumentosPorVencer />

      {followedDevice && (
        <FollowUnitCamera
          device={followedDevice}
          followPath="/subtrackvelnew/seguirUnidad"
          keyless
          isMinimized={isCameraMinimized}
          onToggleMinimize={() => setIsCameraMinimized((prev) => !prev)}
          onClose={() => setFollowed(null)}
        />
      )}
    </>
  );
}
