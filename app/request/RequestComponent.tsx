'use client';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import '@/app/styles/popup.css';
import Sidebar from '../components/Sidebar';
import { useSession } from 'next-auth/react';
import Loader from '../components/Loader';
import { useApi } from '@/context/ApiContext';
import { toast, Toaster } from 'sonner';
const blinkingIntervals: { [key: string]: NodeJS.Timeout } = {};
const blinkingStates: { [key: string]: boolean } = {};
import GoogleMapComponent from '../components/GoogleMapComponent';
import { useMapInstance } from '@/hooks/useMapInstance';
import { useGoogleMaps } from '@/context/GoogleMapsContext';

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
  };
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
      // Llamar al onLoad del hook
      mapOnLoad(map);

      // Tu lógica personalizada
      setMarkersLoaded(false);
    },
    [mapOnLoad],
  );

  useEffect(() => {
    console.log('Unidades filtradas desde Sidebar:', filteredIdsFromSidebar);
  }, [filteredIdsFromSidebar]);

  // Función para insertar alerta de velocidad en la BD
  const insertarAlertaVelocidad = async (
    baseUrl: string,
    device: DeviceList,
    username: string, // ✅ Nuevo parámetro
  ): Promise<boolean> => {
    try {
      // Convertir Unix timestamp a formato dd/MM/yyyy HH:mm
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

      console.log(
        `✅ Alerta guardada para ${device.deviceId} - ${datetimeFormatted} (Usuario: ${username})`,
      );
      return true;
    } catch (error) {
      console.error('❌ Error guardando alerta de velocidad:', error);
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
        const apiUrl = `${baseUrl}/api/DeviceList/${username}`;

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

        const datos = data.datosDevice;
        setMarkersLoaded(true);
        setDeviceList(datos);

        // ✅ USAR for...of EN LUGAR DE forEach
        for (const device of datos) {
          const deviceKey = device.deviceId;

          if (device.lastValidSpeed >= 91) {
            if (
              !activeAlerts.current[deviceKey] &&
              !alertTimeouts.current[deviceKey]
            ) {
              activeAlerts.current[deviceKey] = true;

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
        }
      } catch (error) {
        console.error('❌ Error obteniendo datos de devices:', error);
      }
    };

    const handleVisibilityChange = () => {
      if (!isComponentMounted) return;

      if (document.visibilityState === 'visible') {
        console.log('🔍 Pestaña activa - Reanudando polling...');

        // Llamar inmediatamente al activar
        fetchDeviceData();

        // Reiniciar intervalo si no existe
        if (!intervalId) {
          intervalId = setInterval(fetchDeviceData, 8000);
        }
      } else {
        console.log('😴 Pestaña inactiva - Pausando polling');

        // Pausar polling cuando la pestaña está inactiva (opcional)
        // Si prefieres seguir consultando aunque esté inactiva, comenta estas líneas:
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }
    };

    // Agregar event listener para visibilidad
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Iniciar el polling
    console.log('🚀 Iniciando polling de datos cada 8 segundos...');

    // Llamada inmediata
    fetchDeviceData();

    // Configurar intervalo de 8 segundos
    intervalId = setInterval(fetchDeviceData, 8000);

    // Cleanup
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

      // Lógica específica para usuario cgacela
      if (isCgacelaUser) {
        const hasUltimoServicio = device.ultimoServicio !== null;

        if (hasUltimoServicio) {
          const empresa = device.ultimoServicio?.empresa?.toUpperCase() || '';
          let bgColor, borderColor, triangleColor;

          switch (empresa) {
            case 'TALMA':
              bgColor = 'bg-[#8DBB37]';
              borderColor = 'border-[#8DBB37]';
              triangleColor = 'border-t-[#8DBB37]';
              break;
            case 'LATAM':
              bgColor = 'bg-[#3d048c]';
              borderColor = 'border-[#3d048c]';
              triangleColor = 'border-t-[#3d048c]';
              break;
            case 'DHL':
              bgColor = 'bg-[#FFCC00]';
              borderColor = 'border-[#FFCC00]';
              triangleColor = 'border-t-[#FFCC00]';
              break;
            case 'TERPEL':
              bgColor = 'bg-[#ED1C24]';
              borderColor = 'border-[#ED1C24]';
              triangleColor = 'border-t-[#ED1C24]';
              break;
            default:
              // Color naranja para empresa desconocida
              bgColor = 'bg-[#ff6600]';
              borderColor = 'border-[#ff6600]';
              triangleColor = 'border-t-[#ff6600]';
          }

          // Determinar color de texto basado en el fondo
          const textColor =
            empresa === 'DHL' || empresa === 'TALMA'
              ? 'text-black'
              : 'text-white';
          const closeButtonColor =
            empresa === 'DHL' || empresa === 'TALMA'
              ? 'text-black hover:text-gray-600'
              : 'text-white hover:text-gray-300';
          const linkColor =
            empresa === 'DHL' || empresa === 'TALMA'
              ? 'text-blue-600 hover:text-blue-800'
              : 'text-blue-300 hover:text-blue-100';

          return {
            popup1: {
              bgColor,
              textColor,
              borderColor,
              triangleColor,
            },
            popup2: {
              bgColor,
              textColor,
              borderColor,
              closeButtonColor,
              linkColor,
            },
          };
        } else {
          // Blanco cuando no tiene ultimoServicio
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

          // Actualizar contenido del popup2
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
    ],
  );

  // Función para generar contenido del popup simplificado
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

      // Obtener datos del servicio
      const hasUltimoServicio = device.ultimoServicio !== null;
      const conductor = hasUltimoServicio
        ? device.ultimoServicio?.conductor?.apepate || 'Sin asignar'
        : null;
      const numero = hasUltimoServicio
        ? device.ultimoServicio?.numero || ''
        : '';
      const empresa = hasUltimoServicio
        ? device.ultimoServicio?.empresa || ''
        : '';
      const tipoRaw = hasUltimoServicio
        ? device.ultimoServicio?.tipo || ''
        : '';
      const tipo = tipoRaw === 'I' ? 'INGRESO' : 'SALIDA';
      const servicioCompleto =
        hasUltimoServicio && numero && empresa
          ? `${numero} ${empresa} (${tipo})`
          : null;

      return `
            <div class="${colorScheme.popup2.bgColor} ${colorScheme.popup2.textColor} text-[12px] flex flex-col w-[290px] rounded border ${colorScheme.popup2.borderColor} shadow-lg" id="content2-${device.deviceId}">
              <h3 class="popup-title font-bold flex items-center justify-between" style="border-bottom: 1px solid #6c757d; background-color: #1f2937; color: #ffffff;font-size: 11px;">
                <button id="close-btn-${device.deviceId}" class="popup-close-btn text-sm color-red">X</button>
                UNIDAD: ${device.deviceId.toUpperCase()}
            <div style="display: flex; align-items: center; gap: 2px;">
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

              ${conductor ? `<p class="px-2"><strong>Conductor:</strong> <span class="conductor-value">${conductor}</span></p>` : ''}
              ${servicioCompleto ? `<p class="px-2"><strong>Servicio Actual:</strong> <span class="servicio-value">${servicioCompleto}</span></p><br>` : ''}

              <p class="px-2"><strong>Velocidad:</strong> <span class="speed-value">${Math.round(device.lastValidSpeed)} Km/h</span></p>
              <p class="px-2"><strong>Estado:</strong> <span class="state-value">${getEstado(device.lastValidSpeed)}</span></p>
              ${isMovilbusUser ? `<p class="px-2"><strong>Kilometraje:</strong> <span class="kilometraje-value">${kilometraje.toFixed(0)} Km</span></p>` : ''}
              <br>

              <h4 class="px-2 font-bold uppercase" style="#fff">Último Reporte</h4>
              <p class="px-2" id="fecha-${device.deviceId}">
                <strong>Fecha:</strong> ${day}/${month}/${year} <strong>Hora:</strong> ${hours}:${minutes}:${seconds}
              </p>        
              <span class="px-2"><strong>Dirección:</strong> <span class="direction-value">${getDireccion(device.lastValidHeading)}</span></span>
              <span class="px-2"><strong>Ubicación:</strong> <span class="location-value">${device.direccion}</span></span>
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

      // ✅ FUNCIÓN COMPLETA para extraer colores (igual que en updatePopupContent)
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
          'bg-[#ff6600]': '#ff6600', // Empresa desconocida

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
          'border-t-[#ff6600]': '#ff6600', // Empresa desconocida
        };
        return colorMap[bgColorClass] || '#fca311';
      };

      // FUNCIÓN PARA EXTRAER COLOR DE TEXTO
      const extractTextColor = (textColorClass: string): string => {
        if (textColorClass === 'text-black') return 'black';
        if (textColorClass === 'text-gray-800') return '#1f2937';
        if (textColorClass === 'text-white') return 'white';
        return 'black';
      };

      // ✅ EXTRAER colores correctos (fondo Y borde por separado)
      const popup1BgColor = extractColor(colorScheme.popup1.bgColor);
      const popup1BorderColor = extractColor(colorScheme.popup1.borderColor); // ← AGREGAR ESTA LÍNEA
      const popup1TextColor = extractTextColor(colorScheme.popup1.textColor);
      const triangleColor = extractColor(colorScheme.popup1.triangleColor);

      // Crear popup1 (etiqueta) con colores correctos desde el inicio
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

      // Crear popup2 (información detallada)
      const content2 = document.createElement('div');
      content2.innerHTML = getOptimizedPopupContent(device);

      // ✅ APLICAR colores al popup2 con borde correcto
      const popup2Element = content2.firstElementChild as HTMLElement;
      if (popup2Element) {
        const popup2BgColor = extractColor(colorScheme.popup2.bgColor);
        const popup2BorderColor = extractColor(colorScheme.popup2.borderColor); // ← AGREGAR ESTA LÍNEA
        const popup2TextColor = extractTextColor(colorScheme.popup2.textColor);

        popup2Element.style.backgroundColor = popup2BgColor;
        popup2Element.style.borderColor = popup2BorderColor; // ← USAR BORDE ESPECÍFICO
        popup2Element.style.color = popup2TextColor;
      }

      // Resto del código permanece exactamente igual...
      // (Clase Popup, event listeners, etc.)

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
    [
      getMarkerIcon,
      getEstado,
      getDireccion,
      getColorScheme,
      getOptimizedPopupContent,
    ],
  );

  // TAMBIÉN necesitas actualizar updatePopupContent para usar la misma función de extracción:

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

  // ✅ REEMPLAZA tu useEffect actual con esto:
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!clickListenerAttached.current) {
      // ✅ Especificar opciones de event listener para evitar warnings
      const eventOptions: AddEventListenerOptions = {
        passive: false, // Necesario porque usamos preventDefault
        capture: false,
      };

      document.addEventListener('click', handleFollowLinkClick, eventOptions);
      document.addEventListener('click', handleStreetViewClick, eventOptions);
      clickListenerAttached.current = true;
    }

    return () => {
      if (clickListenerAttached.current) {
        // ✅ Usar las mismas opciones para remover
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
        ); // ✅ CORREGIDO: era addEventListener
        clickListenerAttached.current = false;
      }
    };
  }, [handleFollowLinkClick, handleStreetViewClick]);

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

  if (!isLoaded) {
    return <Loader />;
  }

  return (
    <>
      <Toaster richColors />

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

      <Sidebar
        centerMap={centerMap}
        centerUnit={centerUnit}
        onFilteredIdsChange={setFilteredIdsFromSidebar}
      />
    </>
  );
}
