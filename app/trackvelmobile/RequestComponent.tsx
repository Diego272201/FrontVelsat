'use client';
import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import '@/app/styles/popup.css';
import { useSession } from 'next-auth/react';
import Loader from '../components/Loader';
import { useApi } from '@/context/ApiContext';
import { toast, Toaster } from 'sonner';
const blinkingIntervals: { [key: string]: NodeJS.Timeout } = {};
const blinkingStates: { [key: string]: boolean } = {};
import GoogleMapComponent from '../components/GoogleMapComponent';
import { useMapInstance } from '@/hooks/useMapInstance';
import { useGoogleMaps } from '@/context/GoogleMapsContext';
import SidebarMobile from './SidebarMobile';
import FollowUnitCamera from '../components/FollowUnitCamera';

function sanitize(value: string): string {
  const el = document.createElement('div');
  el.textContent = value;
  return el.innerHTML;
}

const center = {
  lat: -9.22812,
  lng: -75.78894,
};

interface DeviceList {
  deviceId: string; // ← Mantener minúscula
  accountID?: string;
  lastValidLatitude: number;
  lastValidLongitude: number;
  lastValidSpeed: number;
  direccion: string;
  lastValidHeading: number;
  lastGPSTimestamp: number;
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
  } | null;
}
interface MarkerData {
  marker: google.maps.Marker;
  popup1: any;
  popup2: any;
  intervalId?: NodeJS.Timeout;
}

export default function RequestPage() {
  const openStreetView = useCallback((lat: number, lng: number) => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /iphone|ipad|ipod|android/.test(userAgent);

    if (isMobile) {
      const link = document.createElement('a');
      link.href = `https://www.google.com/maps?q=&layer=c&cbll=${lat},${lng}`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';

      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);
    } else {
      const desktopUrl = `https://www.google.com/maps/@${lat},${lng},3a,75y,90t/data=!3m6!1e1!3m4!1s0:0!2e0!7i16384!8i8192`;
      window.open(desktopUrl, '_blank');
    }
  }, []);

  const { data: session, status } = useSession();
  const [deviceList, setDeviceList] = useState<DeviceList[]>([]);
  const markersDataRef = useRef<{ [key: string]: MarkerData }>({});
  const { isLoaded } = useGoogleMaps();
  const {
    mapRef,
    mapLoaded,
    onLoad: mapOnLoad,
    onUnmount: mapOnUnmount,
  } = useMapInstance();
  const [markersLoaded, setMarkersLoaded] = useState(false);
  const [followedDeviceId, setFollowedDeviceId] = useState<string | null>(null);
  const [isCameraMinimized, setIsCameraMinimized] = useState(false);
  const followedDeviceIdRef = useRef<string | null>(null);
  followedDeviceIdRef.current = followedDeviceId;
  const clickListenerAttached = useRef<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const alertTimeouts = useRef<{ [key: string]: NodeJS.Timeout }>({});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('/alert.mp3');
      audioRef.current.preload = 'auto';
      audioRef.current.volume = 0.4;
    }
  }, []);

  const playSpeedAlert = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.loop = true;
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(console.error);
    }
  }, []);

  const { baseUrl } = useApi();

  const [filteredIdsFromSidebar, setFilteredIdsFromSidebar] = useState<
    string[] | null
  >(null);

  const activeAlerts = useRef<{ [key: string]: boolean }>({});
  const alertCooldowns = useRef<{ [key: string]: number }>({});

  const iconCache = useRef<{ [key: string]: google.maps.Icon }>({});

  const handleMapLoad = useCallback(
    (map: google.maps.Map) => {
      mapOnLoad(map);

      setMarkersLoaded(false);
    },
    [mapOnLoad],
  );

  useEffect(() => {
    console.log('Unidades filtradas desde Sidebar:', filteredIdsFromSidebar);
  }, [filteredIdsFromSidebar]);

  const insertarAlertaVelocidad = async (
    baseUrl: string,
    device: DeviceList,
    username: string,
  ): Promise<boolean> => {
    try {
      const fecha = new Date(device.lastGPSTimestamp * 1000);
      const day = String(fecha.getDate()).padStart(2, '0');
      const month = String(fecha.getMonth() + 1).padStart(2, '0');
      const year = fecha.getFullYear();
      const hours = String(fecha.getHours()).padStart(2, '0');
      const minutes = String(fecha.getMinutes()).padStart(2, '0');

      const datetimeFormatted = `${day}/${month}/${year} ${hours}:${minutes}`;

      const response = await fetch(
        `${baseUrl}/api/Preplan/InsertarAlertaVelocidad`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            usuario: username,
            deviceID: device.deviceId,
            datetime: datetimeFormatted,
            latitude: device.lastValidLatitude.toString(),
            longitude: device.lastValidLongitude.toString(),
            speed: device.lastValidSpeed.toString(),
            direccion: device.direccion,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      return false;
    }
  };

  useEffect(() => {
    let isComponentMounted = true;
    let intervalId: NodeJS.Timeout | null = null;

    const fetchDeviceData = async () => {
      if (!isComponentMounted || !session?.user?.username || !baseUrl) {
        return;
      }

      try {
        const username = session.user.username;
        const apiUrl = `https://do.velsat.pe:2053/api/Aplicativo/GetLastTrama?accountID=movilbus`;

        const response = await fetch(apiUrl, {
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

        const datos = Array.isArray(data)
          ? data.map((device: any) => ({
              deviceId: device.deviceID,
              accountID: device.accountID,
              lastValidLatitude: device.lastValidLatitude,
              lastValidLongitude: device.lastValidLongitude,
              lastValidSpeed: device.lastValidSpeed,
              lastValidHeading: device.lastValidHeading,
              direccion: device.direccion,
              lastGPSTimestamp: 0,
              lastOdometerKM: 0,
              odometerini: 0,
              kmini: 0,
              rutaact: '',
              servicio: '',
              ultimoServicio: null,
            }))
          : [];

        setMarkersLoaded(true);
        setDeviceList(datos);

        // Centrado suave en la unidad seguida (cámara fija) en cada refresco
        if (followedDeviceIdRef.current && mapRef.current) {
          const followed = datos.find(
            (d: DeviceList) => d.deviceId === followedDeviceIdRef.current,
          );
          if (followed) {
            mapRef.current.panTo({
              lat: followed.lastValidLatitude,
              lng: followed.lastValidLongitude,
            });
          }
        }

        datos.forEach(async (device: DeviceList) => {
          const deviceKey = device.deviceId;

          if (device.lastValidSpeed >= 91) {
            if (
              !activeAlerts.current[deviceKey] &&
              !alertTimeouts.current[deviceKey]
            ) {
              activeAlerts.current[deviceKey] = true;

              if (session?.user?.username) {
                await insertarAlertaVelocidad(
                  baseUrl,
                  device,
                  session.user.username,
                );
              }

              playSpeedAlert();

              const peruTime = new Date(
                device.lastGPSTimestamp * 1000,
              ).toLocaleString('es-PE', {
                timeZone: 'America/Lima',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
              });

              toast.error(
                `Alerta de velocidad: Unidad ${device.deviceId.toUpperCase()} - ${Math.round(device.lastValidSpeed)} km/h (${peruTime})`,
                {
                  duration: Infinity,
                  action: {
                    label: 'OK',
                    onClick: () => {
                      activeAlerts.current[deviceKey] = false;
                      if (audioRef.current) {
                        audioRef.current.pause();
                        audioRef.current.currentTime = 0;
                      }

                      alertTimeouts.current[deviceKey] = setTimeout(() => {
                        delete alertTimeouts.current[deviceKey];
                      }, 300000);
                    },
                  },
                },
              );
            }
          } else {
            if (activeAlerts.current[deviceKey]) {
              activeAlerts.current[deviceKey] = false;
              if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
              }
            }

            if (alertTimeouts.current[deviceKey]) {
              clearTimeout(alertTimeouts.current[deviceKey]);
              delete alertTimeouts.current[deviceKey];
            }
          }
        });
      } catch (error) {
        console.error('Error obteniendo datos de devices:', error);
      }
    };

    const handleVisibilityChange = () => {
      if (!isComponentMounted) return;

      if (document.visibilityState === 'visible') {
        console.log('Pestaña activa - Reanudando polling...');

        fetchDeviceData();

        if (!intervalId) {
          intervalId = setInterval(fetchDeviceData, 5000);
        }
      } else {
        console.log('😴 Pestaña inactiva - Pausando polling');

        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    console.log('Iniciando polling de datos cada 8 segundos...');

    fetchDeviceData();

    intervalId = setInterval(fetchDeviceData, 8000);

    return () => {
      isComponentMounted = false;

      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }

      document.removeEventListener('visibilitychange', handleVisibilityChange);

      activeAlerts.current = {};
      alertCooldowns.current = {};

      Object.values(alertTimeouts.current).forEach((timeout) => {
        clearTimeout(timeout);
      });
      alertTimeouts.current = {};

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      console.log('🧹 Cleanup: Polling detenido');
    };
  }, [session?.user?.username, baseUrl]);

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

  const getMarkerIcon = useCallback((heading: number) => {
    if (typeof window === 'undefined') return null;

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
  }, []);

  const getEstado = useCallback(
    (speed: number) => (speed < 10 ? 'Estacionado' : 'Movimiento'),
    [],
  );

  const getColorScheme = useCallback(
    (device: DeviceList) => {
      const isMovilbusUser = session?.user?.username === 'movilbus';
      const isCgacelaUser = session?.user?.username === 'cgacela';

      if (isCgacelaUser) {
        const hasUltimoServicio = device.ultimoServicio !== null;

        if (hasUltimoServicio) {
          return {
            popup1: {
              bgColor: 'bg-[#3d048c]',
              textColor: 'text-white',
              borderColor: 'border-[#3d048c]',
              triangleColor: 'border-t-[#3d048c]',
            },
            popup2: {
              bgColor: 'bg-[#3d048c]',
              textColor: 'text-white',
              borderColor: 'border-[#3d048c]',
              closeButtonColor: 'text-white hover:text-gray-300',
              linkColor: 'text-blue-300 hover:text-blue-100',
            },
          };
        } else {
          return {
            popup1: {
              bgColor: 'bg-white',
              textColor: 'text-black',
              borderColor: 'border-black',
              triangleColor: 'border-t-white',
            },
            popup2: {
              bgColor: 'bg-white',
              textColor: 'text-black',
              borderColor: 'border-black',
              closeButtonColor: 'text-black hover:text-gray-600',
              linkColor: 'text-blue-600 hover:text-blue-800',
            },
          };
        }
      }

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

      let popup1Colors, popup2Colors;

      if (device.servicio) {
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

  const updateMarkersAndPopups = useCallback(
    (map: google.maps.Map) => {
      if (!map) return;

      const filteredDeviceList = filteredIdsFromSidebar
        ? deviceList.filter((device) =>
            filteredIdsFromSidebar.includes(device.deviceId),
          )
        : deviceList;

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

            const content1 = document.querySelector(`#content-${deviceId}`);
            const content2 = document.querySelector(`#content2-${deviceId}`);
            content1?.remove();
            content2?.remove();

            delete markersDataRef.current[deviceId];
          }
        });
      }

      filteredDeviceList.forEach((device) => {
        const position = new google.maps.LatLng(
          device.lastValidLatitude,
          device.lastValidLongitude,
        );

        const existingMarkerData = markersDataRef.current[device.deviceId];

        if (existingMarkerData) {
          if (!existingMarkerData.marker.getPosition()?.equals(position)) {
            existingMarkerData.marker.setPosition(position);
            existingMarkerData.popup1.position = position;
            existingMarkerData.popup2.position = position;
          }

          const newIcon = getMarkerIcon(device.lastValidHeading);
          if (newIcon && existingMarkerData.marker.getIcon() !== newIcon) {
            existingMarkerData.marker.setIcon(newIcon);
          }

          updatePopupContent(device, existingMarkerData);
        } else {
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
    ],
  );

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
        device.lastOdometerKM != null &&
        device.odometerini != null &&
        device.kmini != null
          ? Math.round(
              device.lastOdometerKM - device.odometerini + device.kmini,
            )
          : 0;

      const isMovilbusUser = session?.user?.username === 'movilbus';

      const hasUltimoServicio = device.ultimoServicio !== null;
      const conductor = hasUltimoServicio
        ? sanitize(device.ultimoServicio?.conductor?.apepate || 'Sin asignar')
        : null;
      const numero = hasUltimoServicio
        ? sanitize(device.ultimoServicio?.numero || '')
        : '';
      const empresa = hasUltimoServicio
        ? sanitize(device.ultimoServicio?.empresa || '')
        : '';
      const tipoRaw = hasUltimoServicio
        ? device.ultimoServicio?.tipo || ''
        : '';
      const tipo = tipoRaw === 'I' ? 'INGRESO' : 'SALIDA';
      const servicioCompleto =
        hasUltimoServicio && numero && empresa
          ? `${numero} ${empresa} (${tipo})`
          : null;

      const safeDeviceId = sanitize(device.deviceId);
      const safeDireccion = sanitize(device.direccion);
      const isFollowed = device.deviceId === followedDeviceIdRef.current;

      return `
            <div class="${colorScheme.popup2.bgColor} ${colorScheme.popup2.textColor} text-[12px] flex flex-col w-[290px] rounded border ${colorScheme.popup2.borderColor}" id="content2-${safeDeviceId}">
              <h3 class="popup-title font-bold flex items-center justify-between" style="border-bottom: 1px solid #4b5563; background-color: #1f2937; color: #ffffff; font-size: 11px;">
                <div style="display: flex; align-items: center; gap: 4px;">
                  <button id="close-btn-${safeDeviceId}" class="popup-close-btn text-sm color-red">X</button>
                  <span style="font-weight: 700;">${safeDeviceId.toUpperCase()}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <button
                    type="button"
                    id="camera-btn-${safeDeviceId}"
                    class="camera-track-btn"
                    data-device-id="${safeDeviceId}"
                    title="${isFollowed ? 'Desactivar cámara fija' : 'Fijar cámara en este vehículo'}"
                    style="background-color: ${isFollowed ? '#16a34a' : '#374151'}; color: ${isFollowed ? '#ffffff' : '#9ca3af'}; border: 1px solid ${isFollowed ? '#22c55e' : '#4b5563'}; border-radius: 4px; width: 26px; height: 22px; padding: 0; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: all 0.15s ease;"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                      <circle cx="12" cy="13" r="3"/>
                    </svg>
                  </button>
                  <div class="radar-container">
                    <div class="radar-point"></div>
                    <div class="radar-wave radar-wave-1"></div>
                    <div class="radar-wave radar-wave-2"></div>
                    <div class="radar-wave radar-wave-3"></div>
                  </div>
                  <span style="font-size: 12px; color: #38b000; font-weight: 600;">Online</span>
                </div>
              </h3>

              ${conductor ? `<p class="px-2"><strong>Conductor:</strong> <span class="conductor-value">${conductor}</span></p>` : ''}
              ${servicioCompleto ? `<p class="px-2"><strong>Servicio Actual:</strong> <span class="servicio-value">${servicioCompleto}</span></p><br>` : ''}

              <p class="px-2"><strong>Velocidad:</strong> <span class="speed-value">${Math.round(device.lastValidSpeed)} Km/h</span></p>
              <p class="px-2"><strong>Estado:</strong> <span class="state-value">${getEstado(device.lastValidSpeed)}</span></p>
              ${isMovilbusUser ? `<p class="px-2"><strong>Kilometraje:</strong> <span class="kilometraje-value">${kilometraje.toFixed(0)} Km</span></p>` : ''}
              <br>

              <h4 class="px-2 font-bold uppercase" style="#fff">Último Reporte</h4>
              <p class="px-2" id="fecha-${safeDeviceId}">
                <strong>Fecha:</strong> ${day}/${month}/${year} <strong>Hora:</strong> ${hours}:${minutes}:${seconds}
              </p>        
              <span class="px-2"><strong>Dirección:</strong> <span class="direction-value">${getDireccion(device.lastValidHeading)}</span></span>
              <span class="px-2"><strong>Ubicación:</strong> <span class="location-value">${safeDireccion}</span></span>
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
              <span style="color: white; font-weight: bold; font-size: 11px;">Seguir Unidad</span>
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

      const extractColor = (bgColorClass: string): string => {
        const colorMap: { [key: string]: string } = {
          // Colores de fondo
          'bg-red-500': '#ef4444',
          'bg-white': '#ffffff',
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
          // Colores de empresas
          'bg-[#8DBB37]': '#8DBB37',
          'bg-[#3d048c]': '#3d048c',
          'bg-[#FFCC00]': '#FFCC00',
          'bg-[#ED1C24]': '#ED1C24',
          'bg-[#ff6600]': '#ff6600',

          // Mapeos de borde
          'border-red-500': '#ef4444',
          'border-white': '#ffffff',
          'border-green-500': '#22c55e',
          'border-orange-500': '#ffd670',
          'border-red-600': '#dc2626',
          'border-green-600': '#16a34a',
          'border-orange-600': '#ffd670',
          'border-[#fca311]': '#fca311',
          'border-[#1f2937]': '#1f2937',
          'border-[#ffccd5]': '#ffccd5',
          'border-[#8fd694]': '#8fd694',
          'border-[#ffd670]': '#ffd670',
          'border-black': '#000000',
          // Bordes de empresas
          'border-[#8DBB37]': '#8DBB37',
          'border-[#3d048c]': '#3d048c',
          'border-[#FFCC00]': '#FFCC00',
          'border-[#ED1C24]': '#ED1C24',
          'border-[#ff6600]': '#ff6600', // Empresa desconocida

          // Mapeos de triángulos
          'border-t-red-500': '#ef4444',
          'border-t-white': '#ffffff',
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
          // Triángulos de empresas
          'border-t-[#8DBB37]': '#8DBB37',
          'border-t-[#3d048c]': '#3d048c',
          'border-t-[#FFCC00]': '#FFCC00',
          'border-t-[#ED1C24]': '#ED1C24',
          'border-t-[#ff6600]': '#ff6600',
        };
        return colorMap[bgColorClass] || '#fca311';
      };

      const extractTextColor = (textColorClass: string): string => {
        if (textColorClass === 'text-black') return 'black';
        if (textColorClass === 'text-gray-800') return '#1f2937';
        if (textColorClass === 'text-white') return 'white';
        return 'black';
      };

      const popup1BgColor = extractColor(colorScheme.popup1.bgColor);
      const popup1BorderColor = extractColor(colorScheme.popup1.borderColor);
      const popup1TextColor = extractTextColor(colorScheme.popup1.textColor);
      const triangleColor = extractColor(colorScheme.popup1.triangleColor);

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

      const content2 = document.createElement('div');
      content2.innerHTML = getOptimizedPopupContent(device);

      const popup2Element = content2.firstElementChild as HTMLElement;
      if (popup2Element) {
        const popup2BgColor = extractColor(colorScheme.popup2.bgColor);
        const popup2BorderColor = extractColor(colorScheme.popup2.borderColor);
        const popup2TextColor = extractTextColor(colorScheme.popup2.textColor);

        popup2Element.style.backgroundColor = popup2BgColor;
        popup2Element.style.borderColor = popup2BorderColor;
        popup2Element.style.color = popup2TextColor;
      }

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

  const updatePopupContent = useCallback(
    (device: DeviceList, markerData: MarkerData) => {
      const colorScheme = getColorScheme(device);
      const isMovilbusUser = session?.user?.username === 'movilbus';

      // ACTUALIZAR el colorMap con los colores correctos
      const colorMap: { [key: string]: string } = {
        'bg-red-500': '#ef4444',
        'bg-white': '#ffffff',
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
        // Colores de empresas
        'bg-[#8DBB37]': '#8DBB37',
        'bg-[#3d048c]': '#3d048c',
        'bg-[#FFCC00]': '#FFCC00',
        'bg-[#ED1C24]': '#ED1C24',
        'bg-[#ff6600]': '#ff6600', // Empresa desconocida
        // Agregar estos mapeos de borde:
        'border-white': '#ffffff',
        'border-black': '#000000',
        'border-[#fca311]': '#fca311',
        'border-[#1f2937]': '#1f2937',
        'border-[#ffccd5]': '#ffccd5',
        'border-[#8fd694]': '#8fd694',
        'border-[#ffd670]': '#ffd670',
        // Bordes de empresas
        'border-[#8DBB37]': '#8DBB37',
        'border-[#3d048c]': '#3d048c',
        'border-[#FFCC00]': '#FFCC00',
        'border-[#ED1C24]': '#ED1C24',
        'border-[#ff6600]': '#ff6600',
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
          const borderColor =
            colorMap[colorScheme.popup1.borderColor] || '#fca311'; // ← AGREGAR ESTA LÍNEA

          if (shouldBlink) {
            // Iniciar parpadeo para contenido
            startBlinkingAnimation(contentDiv, 'background', device.deviceId);
          } else {
            stopBlinkingAnimation(device.deviceId);
            // Aplicar el color correcto según el esquema
            contentDiv.style.setProperty(
              'background-color',
              bgColor,
              'important',
            );
            contentDiv.style.setProperty(
              'border-color',
              borderColor,
              'important',
            ); // ← USAR borderColor EN LUGAR DE bgColor
          }

          // Aplicar color de texto
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
            // Iniciar parpadeo para triángulo
            startBlinkingAnimation(triangleDiv, 'triangle', device.deviceId);
          } else {
            stopBlinkingAnimation(device.deviceId);
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
            const borderColor =
              colorMap[colorScheme.popup2.borderColor] || '#1f2937';

            if (shouldBlink) {
              startBlinkingAnimation(
                popupElement,
                'background',
                device.deviceId,
                'popup2',
              );
            } else {
              stopBlinkingAnimation(device.deviceId, 'popup2');
              popupElement.style.setProperty(
                'background-color',
                bgColor,
                'important',
              );
              popupElement.style.setProperty(
                'border-color',
                borderColor,
                'important',
              );
            }

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
          const borderColor =
            colorMap[colorScheme.popup2.borderColor] || '#1f2937'; // ← AGREGAR

          if (shouldBlink) {
            startBlinkingAnimation(
              popupElement,
              'background',
              device.deviceId,
              'popup2',
            );
          } else {
            stopBlinkingAnimation(device.deviceId, 'popup2');
            popupElement.style.setProperty(
              'background-color',
              bgColor,
              'important',
            );
            popupElement.style.setProperty(
              'border-color',
              borderColor,
              'important',
            );
          }

          // Aplicar color de texto
          if (colorScheme.popup2.textColor === 'text-black') {
            popupElement.style.color = 'black';
          } else {
            popupElement.style.color = 'white';
          }
        }

        const cameraBtn = popupElement.querySelector(
          '.camera-track-btn',
        ) as HTMLElement;
        if (cameraBtn) {
          const isFollowed = device.deviceId === followedDeviceIdRef.current;
          cameraBtn.style.backgroundColor = isFollowed ? '#16a34a' : '#374151';
          cameraBtn.style.color = isFollowed ? '#ffffff' : '#9ca3af';
          cameraBtn.style.borderColor = isFollowed ? '#22c55e' : '#4b5563';
          cameraBtn.title = isFollowed
            ? 'Desactivar cámara fija'
            : 'Fijar cámara en este vehículo';
          cameraBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
              <circle cx="12" cy="13" r="3"/>
            </svg>
          `;
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
      if (typeof window === 'undefined') return;

      const target = e.target as HTMLElement;
      const streetViewLink = target.closest('.street-view-link');

      if (streetViewLink) {
        e.preventDefault();
        const lat = parseFloat(streetViewLink.getAttribute('data-lat') || '0');
        const lng = parseFloat(streetViewLink.getAttribute('data-lng') || '0');
        openStreetView(lat, lng);
      }
    },
    [openStreetView],
  );

  const handleFollowLinkClick = useCallback((e: MouseEvent) => {
    if (typeof window === 'undefined') return;

    const target = e.target as HTMLElement;
    const followLink = target.closest('.follow-link');

    if (followLink) {
      e.preventDefault();
      const deviceID = followLink.getAttribute('data-device-id');
      const url = `/trackvelnew/seguirUnidad?deviceId=${deviceID}`;
      window.open(url, '_blank');
    }
  }, []);

  const updateCameraButtonStates = useCallback((activeId: string | null) => {
    document.querySelectorAll('.camera-track-btn').forEach((btn) => {
      const btnDeviceId = btn.getAttribute('data-device-id');
      const isFollowed = btnDeviceId === activeId;
      const btnEl = btn as HTMLElement;
      btnEl.style.backgroundColor = isFollowed ? '#16a34a' : '#374151';
      btnEl.style.color = isFollowed ? '#ffffff' : '#e2e8f0';
      btnEl.style.borderColor = isFollowed ? '#22c55e' : '#4b5563';
      btnEl.title = isFollowed
        ? 'Desactivar cámara fija'
        : 'Fijar cámara en este vehículo';
      btnEl.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
          <circle cx="12" cy="13" r="3"/>
        </svg>
      `;
    });
  }, []);

  const toggleFollowUnit = useCallback(
    (deviceId: string) => {
      if (followedDeviceIdRef.current === deviceId) {
        followedDeviceIdRef.current = null;
        setFollowedDeviceId(null);
        updateCameraButtonStates(null);
        toast.info(`Cámara fija desactivada`);
      } else {
        followedDeviceIdRef.current = deviceId;
        setFollowedDeviceId(deviceId);
        updateCameraButtonStates(deviceId);

        const target = deviceList.find((d) => d.deviceId === deviceId);
        if (target && mapRef.current) {
          mapRef.current.panTo({
            lat: target.lastValidLatitude,
            lng: target.lastValidLongitude,
          });
          if ((mapRef.current.getZoom() || 6) < 16) {
            mapRef.current.setZoom(16);
          }
        }
        toast.success(`Cámara fija: ${deviceId.toUpperCase()}`);
      }
    },
    [deviceList, updateCameraButtonStates],
  );

  const handleCameraTrackClick = useCallback(
    (e: MouseEvent) => {
      if (typeof window === 'undefined') return;

      const target = e.target as HTMLElement;
      const cameraBtn = target.closest('.camera-track-btn');

      if (cameraBtn) {
        e.preventDefault();
        e.stopPropagation();
        const deviceId = cameraBtn.getAttribute('data-device-id');
        if (deviceId) {
          toggleFollowUnit(deviceId);
        }
      }
    },
    [toggleFollowUnit],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!clickListenerAttached.current) {
      const eventOptions: AddEventListenerOptions = {
        passive: false,
        capture: false,
      };

      document.addEventListener('click', handleFollowLinkClick, eventOptions);
      document.addEventListener('click', handleStreetViewClick, eventOptions);
      document.addEventListener('click', handleCameraTrackClick, eventOptions);
      clickListenerAttached.current = true;
    }

    return () => {
      if (clickListenerAttached.current) {
        const eventOptions: AddEventListenerOptions = {
          passive: false,
          capture: false,
        };

        document.removeEventListener(
          'click',
          handleFollowLinkClick,
          eventOptions,
        );
        document.removeEventListener(
          'click',
          handleStreetViewClick,
          eventOptions,
        );
        document.removeEventListener(
          'click',
          handleCameraTrackClick,
          eventOptions,
        );
        clickListenerAttached.current = false;
      }
    };
  }, [handleFollowLinkClick, handleStreetViewClick, handleCameraTrackClick]);

  const centerMap = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.setCenter(center);
      mapRef.current.setZoom(6);
    }
  }, []);

  const centerUnit = useCallback(
    (
      coords: { latitud: number; longitud: number },
      explicitDeviceId?: string,
    ) => {
      if (mapRef.current) {
        const centerCoords = { lat: coords.latitud, lng: coords.longitud };
        mapRef.current.setCenter(centerCoords);
        mapRef.current.setZoom(17);

        const targetDevice = explicitDeviceId
          ? deviceList.find(
              (d) =>
                d.deviceId.toLowerCase() === explicitDeviceId.toLowerCase(),
            )
          : deviceList.find(
              (device) =>
                device.lastValidLatitude === coords.latitud &&
                device.lastValidLongitude === coords.longitud,
            );

        const deviceID = targetDevice?.deviceId;

        if (deviceID) {
          if (markersDataRef.current[deviceID]) {
            markersDataRef.current[deviceID].popup2.setMap(mapRef.current);
          }

          followedDeviceIdRef.current = deviceID;
          setFollowedDeviceId(deviceID);
          updateCameraButtonStates(deviceID);
          toast.success(`Cámara fija: ${deviceID.toUpperCase()}`);
        }
      }
    },
    [deviceList, updateCameraButtonStates],
  );

  useEffect(() => {
    if (mapRef.current && mapLoaded && deviceList.length > 0) {
      updateMarkersAndPopups(mapRef.current);
    }
  }, [updateMarkersAndPopups, mapLoaded, deviceList]);

  function startBlinkingAnimation(
    element: HTMLElement,
    type: 'background' | 'triangle',
    deviceId: string,
    suffix: string = '',
  ) {
    const key = `${deviceId}-${type}-${suffix}`;

    // Si ya está parpadeando, no hacer nada
    if (blinkingIntervals[key]) {
      return;
    }

    // Estado inicial
    blinkingStates[key] = true;

    // Aplicar color inicial
    if (type === 'background') {
      element.style.setProperty('background-color', '#ffd670', 'important');
      element.style.setProperty('border-color', '#ffd670', 'important');
    } else if (type === 'triangle') {
      element.style.setProperty('border-top-color', '#ffd670', 'important');
    }

    // Crear intervalo para parpadeo
    blinkingIntervals[key] = setInterval(() => {
      const isYellow = blinkingStates[key];

      if (type === 'background') {
        if (isYellow) {
          // Cambiar a amarillo claro
          element.style.setProperty('background-color', '#e9ff70', 'important');
          element.style.setProperty('border-color', '#e9ff70', 'important');
        } else {
          // Cambiar a amarillo normal
          element.style.setProperty('background-color', '#ffd670', 'important');
          element.style.setProperty('border-color', '#ffd670', 'important');
        }
      } else if (type === 'triangle') {
        if (isYellow) {
          element.style.setProperty('border-top-color', '#e9ff70', 'important');
        } else {
          element.style.setProperty('border-top-color', '#ffd670', 'important');
        }
      }

      // Alternar estado
      blinkingStates[key] = !blinkingStates[key];
    }, 1000); // Parpadeo cada 500ms (1 segundo completo entre cambios)
  }

  function stopBlinkingAnimation(deviceId: string, suffix: string = '') {
    // Detener todos los parpadeos relacionados con este deviceId
    const keysToStop = Object.keys(blinkingIntervals).filter((key) =>
      key.startsWith(`${deviceId}-`),
    );

    keysToStop.forEach((key) => {
      if (blinkingIntervals[key]) {
        clearInterval(blinkingIntervals[key]);
        delete blinkingIntervals[key];
        delete blinkingStates[key];
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

  const handleMapUnmount = useCallback(() => {
    // Tu limpieza personalizada
    Object.values(markersDataRef.current).forEach((markerData) => {
      markerData.marker.setMap(null);
      markerData.popup1.setMap(null);
      markerData.popup2.setMap(null);
      if (markerData.intervalId) {
        clearInterval(markerData.intervalId);
      }
    });
    markersDataRef.current = {};
    iconCache.current = {};

    // Llamar al onUnmount del hook
    mapOnUnmount();
  }, [mapOnUnmount]);

  const followedDevice = useMemo(
    () => deviceList.find((d) => d.deviceId === followedDeviceId) || null,
    [deviceList, followedDeviceId],
  );

  if (!isLoaded) {
    return null;
  }

  return (
    <>
      <Toaster richColors position="top-center" />

      <div className="relative">
        {!markersLoaded && (
          <div className="absolute left-0 top-0 z-[9999] flex h-full w-full items-center justify-center bg-white/25">
            <Loader />
          </div>
        )}
        <GoogleMapComponent
          onLoad={handleMapLoad}
          onUnmount={handleMapUnmount}
          center={center}
          zoom={6}
        />
      </div>

      <SidebarMobile
        centerMap={centerMap}
        centerUnit={centerUnit}
        onFilteredIdsChange={setFilteredIdsFromSidebar}
      />

      {followedDevice && (
        <FollowUnitCamera
          device={followedDevice}
          isMinimized={isCameraMinimized}
          onToggleMinimize={() => setIsCameraMinimized((prev) => !prev)}
          onClose={() => {
            followedDeviceIdRef.current = null;
            setFollowedDeviceId(null);
            updateCameraButtonStates(null);
            toast.info('Cámara fija desactivada');
          }}
        />
      )}
    </>
  );
}
