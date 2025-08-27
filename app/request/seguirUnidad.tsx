'use client';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, useMap, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';
import '@/app/styles/popup.css';
import * as signalR from '@microsoft/signalr';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { getMarkerSVG } from '@/app/components/ui/getMarkerSVG';
import { X, Maximize2, Map, MapPin, Eye } from 'lucide-react';

const initialCenter: [number, number] = [
  -12.046591525826495, -77.04689047482863,
];

interface Device {
  deviceId: string;
  lastValidLatitude: number;
  lastValidLongitude: number;
  lastValidSpeed: number;
  direccion: string;
  lastValidHeading: number;
}

interface FechaActual {
  fechaActual: string;
}

interface Props {
  deviceId?: string;
  height?: string;
  marcadores?: { lat: number; lng: number }[];
}

interface MarkerData {
  marker: L.Marker;
  popup1: L.Popup;
  popup2: L.Popup;
  intervalId?: NodeJS.Timeout;
}

// ✅ Componente simplificado para marcadores estáticos - solo Street View al hacer clic
const AdditionalMarkers = ({
  marcadores,
  onStreetViewOpen,
}: {
  marcadores: { lat: number; lng: number }[];
  onStreetViewOpen: (lat: number, lng: number, markerId: string) => void;
}) => {
  const createCustomIcon = (index: number) => {
    const markerSvg = getMarkerSVG(index + 1);

    return L.icon({
      iconUrl:
        'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(markerSvg),
      iconSize: [40, 50],
      iconAnchor: [20, 45],
      popupAnchor: [0, -45],
    });
  };

  return (
    <>
      {marcadores.map((punto, index) => {
        const StaticMarkerComponent = () => {
          const map = useMap();
          
          useEffect(() => {
            const markerId = `static-marker-${index}`;
            const marker = L.marker([punto.lat, punto.lng], {
              icon: createCustomIcon(index)
            }).addTo(map);

            // ✅ Solo abrir Street View al hacer clic - sin popups
            marker.on('click', () => {
              onStreetViewOpen(punto.lat, punto.lng, markerId);
            });

            // Cleanup al desmontar
            return () => {
              map.removeLayer(marker);
            };
          }, []);

          return null;
        };

        return <StaticMarkerComponent key={index} />;
      })}
    </>
  );
};

const MapController = ({
  onMapReady,
  device,
  hasInitialCentered,
  setHasInitialCentered,
}: {
  onMapReady: (map: L.Map) => void;
  device: Device | null;
  hasInitialCentered: boolean;
  setHasInitialCentered: (value: boolean) => void;
}) => {
  const map = useMap();

  useEffect(() => {
    if (map) {
      onMapReady(map);
    }
  }, [map, onMapReady]);

  useEffect(() => {
    if (map && device && !hasInitialCentered) {
      const newCenter: [number, number] = [
        device.lastValidLatitude,
        device.lastValidLongitude,
      ];
      map.setView(newCenter, 16);
      setHasInitialCentered(true);
    }
  }, [map, device, hasInitialCentered, setHasInitialCentered]);

  return null;
};

export default function SeguirUnidadPage({
  deviceId,
  height = '100vh',
  marcadores = [],
}: Props) {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();

  const [device, setDevice] = useState<Device | null>(null);
  const [fechaActual, setFechaActual] = useState<FechaActual | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasInitialCentered, setHasInitialCentered] = useState(false);
  const [isStreetViewOpen, setIsStreetViewOpen] = useState(false);
  // ✅ Estado para manejar Street View de marcadores estáticos
  const [streetViewData, setStreetViewData] = useState<{
    lat: number;
    lng: number;
    markerId: string;
    title: string;
  } | null>(null);
  
  const mapRef = useRef<L.Map | null>(null);
  const markerDataRef = useRef<MarkerData | null>(null);

  const servidorUrl = localStorage.getItem('servidorUrl');

  // ✅ API Key desde variables de entorno
  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY_K;

  useEffect(() => {
    console.log(
      '🔍 SeguirUnidad - Cantidad de marcadores:',
      marcadores?.length,
    );
  }, [marcadores]);

  // Manejo del fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () =>
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    const mapContainer = document.getElementById('map-container');
    if (!mapContainer) return;

    try {
      if (!document.fullscreenElement) {
        await mapContainer.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }

      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, 300);
    } catch (error) {
      console.error('Error al cambiar modo fullscreen:', error);
    }
  };

  // ✅ Funciones para Street View (mejoradas)
  const getStreetViewEmbedUrl = (lat: number, lng: number) => {
    if (!GOOGLE_MAPS_API_KEY) {
      console.error('❌ API Key de Google Maps no disponible');
      return '';
    }
    return `https://www.google.com/maps/embed/v1/streetview?location=${lat},${lng}&heading=0&pitch=0&fov=90&key=${GOOGLE_MAPS_API_KEY}`;
  };

  const getDirectGoogleMapsUrl = (lat: number, lng: number) => {
    return `https://www.google.com/maps/@${lat},${lng},3a,75y,0h,90t/data=!3m7!1e1!3m5!1s0!2e0!6shttps:%2F%2Fstreetviewpixels-pa.googleapis.com!7i16384!8i8192`;
  };

  const toggleStreetView = () => {
    setIsStreetViewOpen(!isStreetViewOpen);
  };

  const closeStreetView = () => {
    setIsStreetViewOpen(false);
    setStreetViewData(null);
  };

  // ✅ Handler para abrir Street View de marcadores estáticos
  const handleStaticMarkerStreetView = (lat: number, lng: number, markerId: string) => {
    const markerIndex = markerId.replace('static-marker-', '');
    setStreetViewData({
      lat,
      lng,
      markerId,
      title: `PUNTO ${parseInt(markerIndex) + 1}`
    });
    setIsStreetViewOpen(true);
  };

  // SignalR Connection (mismo código que tenías)
  useEffect(() => {
    let connection: signalR.HubConnection | null = null;
    let isComponentMounted = true;
    let reconnectionAttempts = 0;
    const MAX_RECONNECTION_ATTEMPTS = 3;
    const RECONNECTION_DELAY = 1000;

    const getDeviceIdFromUrl = () => {
      if (typeof window !== 'undefined') {
        return searchParams.get('deviceId');
      }
      return null;
    };

    const connectSignalR = async () => {
      const deviceIdFinal = deviceId || getDeviceIdFromUrl();

      if (!isComponentMounted || !deviceIdFinal) {
        console.warn('❌ Componente desmontado o deviceId no disponible');
        return;
      }

      if (
        status !== 'authenticated' ||
        !session?.user?.username ||
        !servidorUrl
      ) {
        console.warn('⚠️ Sesión no autenticada o datos faltantes');
        return;
      }

      if (
        connection &&
        connection.state !== signalR.HubConnectionState.Disconnected
      ) {
        try {
          await connection.stop();
        } catch (error) {
          console.warn('Error cerrando conexión previa:', error);
        }
      }

      try {
        const username = session.user.username;
        const hubUrl = `${servidorUrl}/dataHubDevice/${username}`;

        console.log(
          '🚀 Iniciando nueva conexión SignalR para device:',
          deviceIdFinal,
        );

        connection = new signalR.HubConnectionBuilder()
          .withUrl(hubUrl, {
            transport: signalR.HttpTransportType.WebSockets,
            skipNegotiation: true,
            headers: {
              'Cache-Control': 'no-cache',
              Pragma: 'no-cache',
            },
          })
          .configureLogging(signalR.LogLevel.Warning)
          .withAutomaticReconnect([0, 1000, 5000, 10000])
          .build();

        connection.keepAliveIntervalInMilliseconds = 15000;
        connection.serverTimeoutInMilliseconds = 30000;

        connection.onclose((error) => {
          if (isComponentMounted) {
            console.log('Conexión cerrada:', error?.message || 'Sin error');

            if (error && reconnectionAttempts < MAX_RECONNECTION_ATTEMPTS) {
              reconnectionAttempts++;
              setTimeout(() => {
                if (isComponentMounted) {
                  console.log(
                    `🔄 Reintentando conexión (${reconnectionAttempts}/${MAX_RECONNECTION_ATTEMPTS})...`,
                  );
                  connectSignalR();
                }
              }, RECONNECTION_DELAY);
            }
          }
        });

        connection.onreconnecting(() => {
          console.log('Reconectando...');
        });

        connection.onreconnected((connectionId) => {
          console.log('Reconectado:', connectionId);
          reconnectionAttempts = 0;
        });

        const startTime = Date.now();
        let isFirstDataReceived = false;
        await connection.start();

        if (!isComponentMounted) {
          await connection.stop();
          return;
        }

        reconnectionAttempts = 0;

        console.log(`Automáticamente unido al grupo: ${username}`);

        connection.on('ActualizarDatos', (datos) => {
          if (!isComponentMounted) return;

          if (!isFirstDataReceived) {
            const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
            console.log(`⚡ Primera actualización recibida en ${totalTime}s`);
            isFirstDataReceived = true;
          }

          const updatedDevice = datos.datosDevice.find(
            (d: Device) => d.deviceId === deviceIdFinal,
          );

          if (updatedDevice) {
            console.log(`📱 Dispositivo ${deviceIdFinal} actualizado`);
            setFechaActual(datos.fechaActual);
            setDevice(updatedDevice);
          } else {
            console.warn(
              `⚠️ Dispositivo ${deviceIdFinal} no encontrado en los datos`,
            );
          }
        });

        connection.on('Error', (error) => {
          if (isComponentMounted) {
            console.error('❌ Error desde SignalR:', error);
          }
        });

        connection.on('ConectadoExitosamente', (username) => {
          console.log(
            `Confirmación: Conectado exitosamente para usuario ${username}`,
          );
        });
      } catch (error) {
        console.error('Error conectando SignalR:', error);

        if (
          isComponentMounted &&
          reconnectionAttempts < MAX_RECONNECTION_ATTEMPTS
        ) {
          reconnectionAttempts++;
          setTimeout(() => {
            if (isComponentMounted) {
              console.log(
                `🔄 Reintentando después de error (${reconnectionAttempts}/${MAX_RECONNECTION_ATTEMPTS})...`,
              );
              connectSignalR();
            }
          }, RECONNECTION_DELAY);
        }
      }
    };

    const timeoutId = setTimeout(connectSignalR, 50);

    return () => {
      isComponentMounted = false;
      clearTimeout(timeoutId);

      if (connection) {
        connection.stop().catch((error) => {
          console.warn('Error al cerrar conexión en cleanup:', error);
        });
      }
    };
  }, [status, session, deviceId, servidorUrl, searchParams]);

  const formatFecha = useCallback((fecha: any) => {
    const date = new Date(fecha);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `
      <span class="text-gray-300 text-[12px]">
        Fecha: <span class="ml-1 text-white font-medium">${day}/${month}/${year}</span>
        <span class="mx-2"></span>
        Hora: <span class="ml-1 text-white font-medium">${hours}:${minutes}</span>
      </span>
    `;
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
      { range: [0, 22.5], url: '/up.webp', size: [25, 35] as [number, number] },
      {
        range: [22.51, 67.5],
        url: '/topright.webp',
        size: [42, 25] as [number, number],
      },
      {
        range: [67.51, 112.5],
        url: '/right.webp',
        size: [42, 25] as [number, number],
      },
      {
        range: [112.51, 157.5],
        url: '/downright.webp',
        size: [42, 25] as [number, number],
      },
      {
        range: [157.51, 202.5],
        url: '/down.webp',
        size: [25, 35] as [number, number],
      },
      {
        range: [202.51, 247.5],
        url: '/downleft.webp',
        size: [42, 25] as [number, number],
      },
      {
        range: [247.51, 292.5],
        url: '/left.webp',
        size: [42, 25] as [number, number],
      },
      {
        range: [292.51, 337.5],
        url: '/topleft.webp',
        size: [42, 25] as [number, number],
      },
      {
        range: [337.51, 360.0],
        url: '/up.webp',
        size: [25, 35] as [number, number],
      },
    ];

    const direction = directions.find(
      (d) => heading >= d.range[0] && heading <= d.range[1],
    );

    return direction
      ? L.icon({
          iconUrl: direction.url,
          iconSize: direction.size,
          iconAnchor: [direction.size[0] / 2, direction.size[1] / 2],
        })
      : L.icon({
          iconUrl: '/unknown.png',
          iconSize: [42, 25],
          iconAnchor: [21, 12.5],
        });
  }, []);

  const getEstado = useCallback((speed: number) => {
    return speed > 0 ? 'En Movimiento' : 'Estacionado';
  }, []);

  const getPopupContent = useCallback(
    (device: Device) => {
      return `
    <div class="content-custom-popup bg-gray-800 text-white p-4 shadow-lg border border-gray-600 min-w-82" id="content2-${device.deviceId}">
      <button id="close-btn-${device.deviceId}" class="absolute top-0 right-3 text-gray-300 hover:text-red-400 text-xl font-bold transition-colors">&times;</button>
      
      <div class="space-y-1">
        <div class="flex items-center">
          <span class="text-gray-300">Unidad:</span> 
          <strong class="text-blue-300 ml-1">${device.deviceId.toUpperCase()}</strong>
        </div>
        
        <div class="flex items-center">
          <span class="text-gray-300">Velocidad:</span> 
          <strong class="text-green-300 ml-1">${device.lastValidSpeed} Km/h</strong>
        </div>
        
        <div class="flex items-center">
          <span class="text-gray-300">Estado:</span> 
          <strong class="text-yellow-300 ml-1">${getEstado(device.lastValidSpeed)}</strong>
        </div>
      </div>

      <hr class="my-1 border-gray-600">
      
      <h4 class="font-semibold text-gray-200 uppercase text-[10px] mb-1 ml-[2px]">
        <strong>Último Reporte</strong>
      </h4>
      
      <div class="bg-gray-700 p-1 space-y-2">
        <div class="text-center">
            <strong>${formatFecha(fechaActual)}</strong>
        </div>
        
        <div class="space-y-1">
          <div>
            <span class="text-gray-300 text-[12px]">Dirección:</span> 
            <strong class="text-white">${getDireccion(device.lastValidHeading)}</strong>
          </div>
          
          <div>
            <span class="text-gray-300 text-[12px]">Ubicación:</span> 
            <strong class="text-white text-[12x]">${device.direccion}</strong>
          </div>
        </div>
      </div>
    </div>
    `;
    },
    [fechaActual, getDireccion, getEstado, formatFecha],
  );

  const createMarkerAndPopup = useCallback(
    (map: L.Map) => {
      if (!device) return;

      const position: [number, number] = [
        device.lastValidLatitude,
        device.lastValidLongitude,
      ];

      if (markerDataRef.current) {
        // Actualizar marcador existente
        const markerData = markerDataRef.current;

        // Actualizar posición
        markerData.marker.setLatLng(position);

        // Actualizar icono
        const newIcon = getMarkerIcon(device.lastValidHeading);
        markerData.marker.setIcon(newIcon);

        // Actualizar contenido del popup2
        const popupElement = markerData.popup2.getElement();
        if (popupElement) {
          popupElement.innerHTML = getPopupContent(device);

          // Re-agregar event listeners
          const closeButton = popupElement.querySelector(
            `#close-btn-${device.deviceId}`,
          );
          if (closeButton) {
            closeButton.addEventListener('click', (e) => {
              e.stopPropagation();
              markerData.marker.closePopup();
              markerData.marker.bindPopup(markerData.popup1).openPopup();
              // ✅ Cerrar Street View al cerrar popup
              setIsStreetViewOpen(false);
              setStreetViewData(null);
            });
          }
        }
      } else {
        // Crear nuevo marcador (mismo código que tenías)
        const popup1Content = `
        <div class="relative flex flex-col items-center mt-4">
          <div id="content" class="bg-[#fca311] text-gray-800 px-2 py-1.5 border border-[#fca311] custom-popup1-font">
            ${device.deviceId.toUpperCase()}
          </div>
          <div class="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-[#fca311]"></div>
        </div>
      `;

        const popup1 = L.popup({
          closeButton: false,
          autoClose: false,
          autoPan: false,
          className: 'custom-popup-1 transparent-popup',
        }).setContent(popup1Content);

        const popup2 = L.popup({
          closeButton: false,
          autoClose: false,
          className: 'custom-popup-2 transparent-popup',
        }).setContent(getPopupContent(device));

        const icon = getMarkerIcon(device.lastValidHeading);
        const marker = L.marker(position, { icon }).addTo(map);

        // Abrir popup1 por defecto
        marker.bindPopup(popup1).openPopup();

        let popup2IsOpen = false;

        // Event listeners
        marker.on('click', () => {
          if (!popup2IsOpen) {
            marker.bindPopup(popup2).openPopup();
            popup2IsOpen = true;
            // ✅ Abrir Street View automáticamente al hacer clic en el marcador
            setStreetViewData({
              lat: device.lastValidLatitude,
              lng: device.lastValidLongitude,
              markerId: device.deviceId,
              title: device.deviceId.toUpperCase()
            });
            setIsStreetViewOpen(true);
          } else {
            marker.closePopup();
            marker.bindPopup(popup1).openPopup();
            popup2IsOpen = false;
            // ✅ Cerrar Street View al cerrar popup2
            setIsStreetViewOpen(false);
            setStreetViewData(null);
          }
        });

        // Configurar event listeners para popup2
        popup2.on('add', () => {
          const closeButton = document.querySelector(
            `#close-btn-${device.deviceId}`,
          );
          if (closeButton) {
            closeButton.addEventListener('click', (e) => {
              e.stopPropagation();
              marker.closePopup();
              marker.bindPopup(popup1).openPopup();
              popup2IsOpen = false;
              // ✅ Cerrar Street View al cerrar popup2
              setIsStreetViewOpen(false);
              setStreetViewData(null);
            });
          }
        });

        // Guardar referencia
        markerDataRef.current = {
          marker,
          popup1,
          popup2,
        };
      }
    },
    [device, getMarkerIcon, getPopupContent],
  );

  const onMapReady = useCallback(
    (map: L.Map) => {
      mapRef.current = map;

      map.on('click', (e) => {
        e.originalEvent.stopPropagation();
      });

      if (device) {
        createMarkerAndPopup(map);
      }
    },
    [createMarkerAndPopup, device],
  );

  useEffect(() => {
    if (mapRef.current && device) {
      createMarkerAndPopup(mapRef.current);
    }
  }, [device, createMarkerAndPopup]);

  // ✅ Determinar qué datos usar para Street View
  const currentStreetViewData = streetViewData || (device && isStreetViewOpen ? {
    lat: device.lastValidLatitude,
    lng: device.lastValidLongitude,
    markerId: device.deviceId,
    title: device.deviceId.toUpperCase()
  } : null);

  return (
    <div
      id="map-container"
      className={`relative ${isFullscreen ? 'h-screen w-screen' : 'w-full'}`}
      style={{
        height: isFullscreen ? '100vh' : height,
        backgroundColor: isFullscreen ? '#000' : 'transparent',
      }}
    >
      {/* Botones de control */}
      <div className="absolute right-4 top-4 z-[1000] flex flex-col gap-2">
        {/* Botón fullscreen */}
        <button
          onClick={toggleFullscreen}
          className="rounded-md border border-gray-300 bg-white p-2 shadow-lg transition-colors duration-200 hover:bg-gray-100"
          title={
            isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'
          }
        >
          {isFullscreen ? (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 0 2-2h3M3 16h3a2 2 0 0 0 2 2v3" />
            </svg>
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          )}
        </button>
      </div>

      <MapContainer
        center={
          device
            ? [device.lastValidLatitude + 0.009, device.lastValidLongitude]
            : initialCenter
        }
        zoom={14}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        maxZoom={19}
        minZoom={1}
        closePopupOnClick={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <MapController
          onMapReady={onMapReady}
          device={device}
          hasInitialCentered={hasInitialCentered}
          setHasInitialCentered={setHasInitialCentered}
        />

        {marcadores && marcadores.length > 0 && (
          <AdditionalMarkers 
            marcadores={marcadores} 
            onStreetViewOpen={handleStaticMarkerStreetView}
          />
        )}
      </MapContainer>

      {/* ✅ Panel de Street View mejorado que funciona para ambos tipos de marcadores */}
      {currentStreetViewData && isStreetViewOpen && (
        <div
          style={{
            position: 'absolute',
            bottom: '2%',
            left: '2%',
            width: '35%',
            height: '55%',
            backgroundColor: 'white',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            zIndex: 1000,
            border: '2px solid #e0e0e0',
            borderRadius: '8px',
            fontFamily: 'Segoe UI, sans-serif',
            overflow: 'hidden',
          }}
        >
          {/* Header del panel */}
          <div
            style={{
              padding: '0px 12px',
              borderBottom: '1px solid #e0e0e0',
              backgroundColor: '#fff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              minHeight: '25px',
            }}
          >
            <h3
              style={{
                margin: '0',
                color: '#333',
                fontSize: '13px',
                fontWeight: 'bold',
              }}
            >
              {currentStreetViewData.title}
            </h3>
            <button
              onClick={closeStreetView}
              style={{
                width: '18px',
                height: '18px',
                border: 'none',
                backgroundColor: '#ff4757',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
                fontWeight: 'bold',
              }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Contenido del Street View */}
          <div
            style={{
              position: 'relative',
              height: 'calc(100% - 25px)', // Ajustado para el header
            }}
          >
            {GOOGLE_MAPS_API_KEY ? (
              <iframe
                src={getStreetViewEmbedUrl(
                  currentStreetViewData.lat,
                  currentStreetViewData.lng,
                )}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={`Street View - ${currentStreetViewData.title}`}
              />
            ) : (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '100%',
                  backgroundColor: '#f5f5f5',
                  color: '#666',
                }}
              >
                <p>Street View no disponible - API Key faltante</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CSS Styles */}
<style jsx global>{`
 .transparent-popup .leaflet-popup-content-wrapper {
   background: transparent !important;
   box-shadow: none !important;
   border: none !important;
 }

 .transparent-popup .leaflet-popup-tip {
   background: transparent !important;
   box-shadow: none !important;
   border: none !important;
 }

 .transparent-popup .leaflet-popup-content {
   margin: 0 !important;
   padding: 0 !important;
 }

 .transparent-popup .leaflet-popup-close-button {
   display: none !important;
 }

 .custom-popup-2 * {
   text-align: left !important;
 }

 .custom-popup1-font {
   font-size: 12px;
   font-weight: 700;
 }

 .popup-title {
   padding: 8px 12px;
   font-size: 12px;
   font-weight: 700;
 }

 #map-container:fullscreen {
   background: #000;
 }

 #map-container:fullscreen .leaflet-container {
   background: #fff;
 }

 /* Indicadores de estado en tiempo real */
 .status-indicator {
   display: inline-block;
   width: 8px;
   height: 8px;
   border-radius: 50%;
   margin-right: 6px;
 }

 .status-moving {
   background-color: #10b981;
   box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.3);
   animation: pulse-green 2s infinite;
 }

 .status-stopped {
   background-color: #f59e0b;
   box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.3);
   animation: pulse-orange 2s infinite;
 }

 @keyframes pulse-green {
   0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
   70% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
   100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
 }

 @keyframes pulse-orange {
   0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7); }
   70% { box-shadow: 0 0 0 6px rgba(245, 158, 11, 0); }
   100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
 }

 /* Responsividad para pantallas pequeñas */
 @media (max-width: 768px) {
   .street-view-panel {
     width: 90% !important;
     height: 50% !important;
     left: 5% !important;
     bottom: 5% !important;
   }
 }

 /* Mejoras visuales para el panel Street View */
 .street-view-panel {
   backdrop-filter: blur(10px);
   background: rgba(255, 255, 255, 0.95);
 }

 .street-view-header {
   background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
 }

 .street-view-footer {
   background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
 }

 /* Hacer más pequeños los controles del Street View */
 div[style*="position: absolute"][style*="bottom: 2%"] iframe {
   transform: scale(0.85);
   transform-origin: top left;
   width: 117.6%;
   height: 117.6%;
 }
`}</style>

    </div>
  );
}