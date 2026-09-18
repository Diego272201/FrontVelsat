'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef, memo } from 'react';
import {
  GoogleMap,
  useJsApiLoader,
  MarkerF,
  InfoWindowF,
  PolylineF,
  MarkerClustererF,
} from '@react-google-maps/api';
import axios from 'axios';
import Image from 'next/image';
import '@/app/styles/markers.css';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast, Toaster } from 'sonner';
import { useApi } from '@/context/ApiContext';
import Loader from '@/app/components/Loader';
import { useUsername } from '@/hooks/useUsername';

import {
  Play,
  Pause,
  Activity,
  Navigation,
  Eye,
  EyeOff,
  BarChart2,
  SkipBack,
  SkipForward,
  ChevronRight,
  ChevronLeft,
  X,
  Car,
  Maximize2,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';

interface UnidadDetalleRecorrido {
  longitude: number;
  latitude: number;
  date: string;
  time: string;
  speed: number;
}

type SpeedCategory = 'stopped' | 'slow' | 'normal' | 'fast';

const libraries: 'places'[] = ['places'];

// Haversine distance calculator
const calculateTotalDistance = (points: UnidadDetalleRecorrido[]) => {
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const R = 6371; // km
    const dLat = ((p2.latitude - p1.latitude) * Math.PI) / 180;
    const dLon = ((p2.longitude - p1.longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((p1.latitude * Math.PI) / 180) *
        Math.cos((p2.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    total += R * c;
  }
  return total;
};

// `window.google.maps` ya existe mientras el API todavía se está arrancando,
// pero sus constructores (Size, Point, LatLngBounds...) aparecen después.
// Comprobar solo el namespace hacía que el componente los instanciara antes de
// tiempo y reventara con "window.google.maps.Size is not a constructor".
const isMapsApiReady = () =>
  typeof window !== 'undefined' &&
  typeof (window as any).google?.maps?.Size === 'function' &&
  typeof (window as any).google?.maps?.Point === 'function' &&
  typeof (window as any).google?.maps?.LatLngBounds === 'function';

// Los enlaces móviles envían "YYYY-MM-DD HH:mm" y los de escritorio
// "YYYY-MM-DDTHH:mm". Normalizamos a un único formato para que ambas rutas
// consulten la API y muestren la cabecera exactamente igual.
const normalizeDateParam = (value: string | null) =>
  value ? value.replace(' ', 'T') : value;

// Helper para formatear fecha y hora en formato 24h (DD/MM/YYYY HH:mm)
const formatDateTime24h = (dateStr: string | null) => {
  if (!dateStr) return '';
  const [datePart, timePart] = dateStr.split('T');
  if (!datePart) return dateStr;
  const parts = datePart.split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  const time = timePart ? timePart.slice(0, 5) : '00:00';
  return `${day}/${month}/${year} ${time}`;
};

const getHeaderColor = (speed: number) => {
  if (speed === 0) {
    return 'bg-red-800 text-white';
  } else if (speed > 0 && speed < 11) {
    return 'bg-amber-800 text-white';
  } else if (speed >= 11 && speed < 60) {
    return 'bg-emerald-800 text-white';
  } else {
    return 'bg-[#113EB9] text-white';
  }
};

const getSpeedCategory = (speed: number): SpeedCategory => {
  if (speed === 0) return 'stopped';
  if (speed > 0 && speed < 11) return 'slow';
  if (speed >= 11 && speed < 60) return 'normal';
  return 'fast';
};

const customInfoWindowStyles = `
  .gm-style .gm-style-iw-c {
    padding: 0 !important;
    border-radius: 10px !important;
    overflow: hidden !important;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18) !important;
  }
  .gm-style .gm-style-iw-d {
    overflow: hidden !important;
    max-height: none !important;
    max-width: none !important;
    padding: 0 !important;
    margin: 0 !important;
  }
  .gm-style .gm-style-iw-d > div {
    padding: 0 !important;
    margin: 0 !important;
  }
  .gm-style .gm-style-iw-ch {
    display: none !important;
  }
  .gm-style button.gm-ui-hover-or-focus {
    top: 2px !important;
    right: 2px !important;
    opacity: 0.8 !important;
  }
  .gm-style-iw-tc::after {
    background: white !important;
  }
`;

const clusterStyles = [
  {
    url: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m1.png',
    height: 53,
    width: 53,
    textColor: '#000000',
    textSize: 11,
    fontWeight: 'bold',
  },
  {
    url: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m2.png',
    height: 56,
    width: 56,
    textColor: '#000000',
    textSize: 11,
    fontWeight: 'bold',
  },
  {
    url: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m3.png',
    height: 66,
    width: 66,
    textColor: '#ffffff',
    textSize: 12,
    fontWeight: 'bold',
  },
  {
    url: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m4.png',
    height: 78,
    width: 78,
    textColor: '#ffffff',
    textSize: 13,
    fontWeight: 'bold',
  },
  {
    url: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m5.png',
    height: 90,
    width: 90,
    textColor: '#ffffff',
    textSize: 14,
    fontWeight: 'bold',
  },
];

const injectStyles = () => {
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const existingStyle = document.getElementById('custom-infowindow-styles');
    if (!existingStyle) {
      const styleTag = document.createElement('style');
      styleTag.id = 'custom-infowindow-styles';
      styleTag.textContent = customInfoWindowStyles;
      document.head.appendChild(styleTag);
    }
  }
};

const mapStyles = [
  {
    featureType: 'poi',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'transit.station.bus',
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'transit.station.rail',
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }],
  },
];

// ==========================================
// SUBCOMPONENTES MEMOIZADOS DE ALTO RENDIMIENTO
// ==========================================

// 1. Trazado de ruta (Polyline)
const RoutePolylineLayer = memo(function RoutePolylineLayer({
  path,
}: {
  path: google.maps.LatLngLiteral[];
}) {
  if (path.length === 0) return null;
  return (
    <PolylineF
      path={path}
      options={{
        strokeColor: '#113EB9',
        strokeOpacity: 0.85,
        strokeWeight: 5,
      }}
    />
  );
});

const START_ICON_SVG = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="96" height="64" viewBox="0 0 96 64">
  <filter id="start-shadow" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.35"/>
  </filter>
  <path d="M 76 56 L 46 56 Q 36 56 36 46 L 36 26" fill="none" stroke="#059669" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="4" y="2" width="64" height="24" rx="12" fill="#059669" stroke="#ffffff" stroke-width="2.5" filter="url(#start-shadow)"/>
  <text x="36" y="14" fill="#ffffff" font-size="11" font-family="system-ui, -apple-system, sans-serif" font-weight="extrabold" text-anchor="middle" dominant-baseline="central" letter-spacing="0.5">INICIO</text>
  <circle cx="76" cy="56" r="4" fill="#059669" stroke="#ffffff" stroke-width="2"/>
</svg>
`)}`;

const END_ICON_SVG = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="96" height="64" viewBox="0 0 96 64">
  <filter id="end-shadow" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.35"/>
  </filter>
  <path d="M 20 56 L 50 56 Q 60 56 60 46 L 60 26" fill="none" stroke="#dc2626" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="28" y="2" width="64" height="24" rx="12" fill="#dc2626" stroke="#ffffff" stroke-width="2.5" filter="url(#end-shadow)"/>
  <text x="60" y="14" fill="#ffffff" font-size="11" font-family="system-ui, -apple-system, sans-serif" font-weight="extrabold" text-anchor="middle" dominant-baseline="central" letter-spacing="0.5">FIN</text>
  <circle cx="20" cy="56" r="4" fill="#dc2626" stroke="#ffffff" stroke-width="2"/>
</svg>
`)}`;

// 2. Marcadores de Inicio y Fin
const StartEndMarkersLayer = memo(function StartEndMarkersLayer({
  startPoint,
  endPoint,
}: {
  startPoint?: UnidadDetalleRecorrido;
  endPoint?: UnidadDetalleRecorrido;
}) {
  const startIcon = useMemo(() => {
    if (!isMapsApiReady()) return undefined;
    return {
      url: START_ICON_SVG,
      scaledSize: new window.google.maps.Size(96, 64),
      anchor: new window.google.maps.Point(76, 56),
    };
  }, []);

  const endIcon = useMemo(() => {
    if (!isMapsApiReady()) return undefined;
    return {
      url: END_ICON_SVG,
      scaledSize: new window.google.maps.Size(96, 64),
      anchor: new window.google.maps.Point(20, 56),
    };
  }, []);

  return (
    <>
      {startPoint && (
        <MarkerF
          position={{
            lat: startPoint.latitude,
            lng: startPoint.longitude,
          }}
          zIndex={500}
          icon={startIcon}
        />
      )}
      {endPoint && (
        <MarkerF
          position={{
            lat: endPoint.latitude,
            lng: endPoint.longitude,
          }}
          zIndex={500}
          icon={endIcon}
        />
      )}
    </>
  );
});

// 3. Marcador dinámico del Vehículo animado
interface VehicleMarkerLayerProps {
  point: UnidadDetalleRecorrido | null;
  deviceId: string | null;
  show: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

const VehicleMarkerLayer = memo(function VehicleMarkerLayer({
  point,
  deviceId,
  show,
  isOpen,
  onToggle,
  onClose,
}: VehicleMarkerLayerProps) {
  const vehicleIcon = useMemo(() => {
    if (!isMapsApiReady()) return undefined;
    return {
      url: '/UnidadK.webp',
      scaledSize: new window.google.maps.Size(38, 38),
      anchor: new window.google.maps.Point(19, 19),
    };
  }, []);

  if (!show || !point) return null;

  return (
    <MarkerF
      position={{
        lat: point.latitude,
        lng: point.longitude,
      }}
      zIndex={999}
      icon={vehicleIcon}
      onClick={onToggle}
    >
      {isOpen && (
        <InfoWindowF
          position={{ lat: point.latitude, lng: point.longitude }}
          onCloseClick={onClose}
        >
          <div className="w-[215px] font-sans overflow-hidden rounded-lg bg-white text-xs">
            <div
              className={`${getHeaderColor(
                point.speed,
              )} px-3 py-2 flex items-center justify-between font-bold tracking-wide text-xs transition-colors duration-300`}
            >
              <div className="flex items-center gap-1.5">
                <Image
                  src="/UnidadK.webp"
                  alt="Car"
                  width={16}
                  height={16}
                  className="h-4 w-4 object-contain filter brightness-0 invert"
                />
                <span>{(deviceId || 'Unidad').toUpperCase()}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="text-white/80 hover:text-white hover:bg-white/10 p-0.5 rounded transition-colors"
                title="Cerrar"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="p-2.5 space-y-2 text-gray-700">
              <div className="grid grid-cols-2 gap-1.5 text-[11px] bg-slate-50 p-2 rounded-md border border-slate-100">
                <div>
                  <span className="text-[10px] text-gray-400 block font-medium">Fecha</span>
                  <span className="font-semibold text-gray-800">{point.date}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block font-medium">Hora</span>
                  <span className="font-semibold text-gray-800">{point.time} hrs</span>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-md bg-blue-50/70 p-2 border border-blue-100 text-[11.5px]">
                <span className="text-gray-600 font-medium">Velocidad:</span>
                <span
                  className={`font-extrabold text-xs ${
                    point.speed > 0 ? 'text-emerald-700' : 'text-red-600'
                  }`}
                >
                  {point.speed.toFixed(1)} km/h
                </span>
              </div>
            </div>
          </div>
        </InfoWindowF>
      )}
    </MarkerF>
  );
});

const COLOR_MAP: Record<SpeedCategory, string> = {
  stopped: '#dc2626',
  slow: '#ea580c',
  normal: '#16a34a',
  fast: '#113EB9',
};

const getPointPinIcon = (category: SpeedCategory, num: number) => {
  const color = COLOR_MAP[category] || '#113EB9';
  const fontSize = num > 999 ? '9.5' : num > 99 ? '10.5' : '11.5';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="42" viewBox="0 0 34 42">
  <filter id="p-shadow" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="0" dy="2" stdDeviation="1.5" flood-color="#000000" flood-opacity="0.35"/>
  </filter>
  <path d="M 17 39 C 11 29 3 24 3 15 A 14 14 0 1 1 31 15 C 31 24 23 29 17 39 Z" fill="${color}" stroke="#ffffff" stroke-width="2.5" stroke-linejoin="round" filter="url(#p-shadow)"/>
  <text x="17" y="15" fill="#ffffff" font-size="${fontSize}" font-family="system-ui, -apple-system, sans-serif" font-weight="bold" text-anchor="middle" dominant-baseline="central">${num}</text>
</svg>`;

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new window.google.maps.Size(34, 42),
    anchor: new window.google.maps.Point(17, 39),
  };
};

// 4. Capa agrupada de Puntos GPS (MarkerClusterer de alto rendimiento sin sobrecarga de React)
interface GPSPointsClusterLayerProps {
  markersData: UnidadDetalleRecorrido[];
  show: boolean;
  onSelectPoint: (point: UnidadDetalleRecorrido, index: number) => void;
}

const GPSPointsClusterLayer = memo(function GPSPointsClusterLayer({
  markersData,
  show,
  onSelectPoint,
}: GPSPointsClusterLayerProps) {
  const clustererRef = useRef<any>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const attachedRef = useRef(false);
  const builtForRef = useRef<UnidadDetalleRecorrido[] | null>(null);
  const showRef = useRef(show);
  showRef.current = show;
  const onSelectPointRef = useRef(onSelectPoint);
  onSelectPointRef.current = onSelectPoint;

  // Desacopla los marcadores del mapa Y del clusterer.
  // Vaciar la lista interna del clusterer es lo que garantiza que ningún
  // redraw posterior (idle / zoom_changed) vuelva a pintar los puntos.
  const detachMarkers = useCallback(() => {
    const clusterer = clustererRef.current;
    if (clusterer) {
      clusterer.clearMarkers();
    }
    const markers = markersRef.current;
    for (let i = 0; i < markers.length; i++) {
      markers[i].setVisible(false);
      markers[i].setMap(null);
    }
    attachedRef.current = false;
  }, []);

  const attachMarkers = useCallback(() => {
    const clusterer = clustererRef.current;
    const markers = markersRef.current;
    if (!clusterer || attachedRef.current || markers.length === 0) return;

    for (let i = 0; i < markers.length; i++) {
      markers[i].setVisible(true);
    }
    clusterer.addMarkers(markers, false);
    attachedRef.current = true;
  }, []);

  const destroyMarkers = useCallback(() => {
    detachMarkers();
    const markers = markersRef.current;
    for (let i = 0; i < markers.length; i++) {
      google.maps.event.clearInstanceListeners(markers[i]);
    }
    markersRef.current = [];
    builtForRef.current = null;
  }, [detachMarkers]);

  // Crea los marcadores fuera del mapa; attachMarkers los publica luego
  const buildMarkers = useCallback((dataList: UnidadDetalleRecorrido[]) => {
    const newMarkers: google.maps.Marker[] = [];
    for (let i = 0; i < dataList.length; i++) {
      const data = dataList[i];
      const category = getSpeedCategory(data.speed);
      const icon = getPointPinIcon(category, i + 1);

      const marker = new google.maps.Marker({
        position: { lat: data.latitude, lng: data.longitude },
        icon,
        visible: false,
      });

      marker.addListener('click', () => {
        onSelectPointRef.current(data, i);
      });

      newMarkers.push(marker);
    }
    markersRef.current = newMarkers;
  }, []);

  const sync = useCallback(
    (dataList: UnidadDetalleRecorrido[], visible: boolean) => {
      if (!clustererRef.current) return;

      if (builtForRef.current !== dataList) {
        destroyMarkers();
        buildMarkers(dataList);
        builtForRef.current = dataList;
      }

      if (visible) {
        attachMarkers();
      } else {
        detachMarkers();
      }
    },
    [attachMarkers, buildMarkers, destroyMarkers, detachMarkers],
  );

  useEffect(() => {
    sync(markersData, show);
  }, [markersData, show, sync]);

  useEffect(() => destroyMarkers, [destroyMarkers]);

  if (markersData.length === 0) return null;

  return (
    <MarkerClustererF
      options={{
        gridSize: 50,
        maxZoom: 16,
        minimumClusterSize: 15,
        styles: clusterStyles,
        ignoreHidden: true,
      }}
      onLoad={(clusterer) => {
        clustererRef.current = clusterer;
        sync(markersData, showRef.current);
      }}
      onUnmount={() => {
        destroyMarkers();
        clustererRef.current = null;
      }}
    >
      {() => <></>}
    </MarkerClustererF>
  );
});

// 5. InfoWindow Global Único para el punto seleccionado
interface SelectedPointInfoWindowProps {
  selected: { point: UnidadDetalleRecorrido; index: number } | null;
  onClose: () => void;
  onJumpToPoint: (index: number) => void;
}

const SelectedPointInfoWindow = memo(function SelectedPointInfoWindow({
  selected,
  onClose,
  onJumpToPoint,
}: SelectedPointInfoWindowProps) {
  if (!selected) return null;
  const { point, index } = selected;

  return (
    <InfoWindowF
      position={{ lat: point.latitude, lng: point.longitude }}
      onCloseClick={onClose}
      options={{ pixelOffset: new window.google.maps.Size(0, -10) }}
    >
      <div className="w-[220px] font-sans overflow-hidden rounded-lg bg-white text-xs">
        <div className={`${getHeaderColor(point.speed)} px-3 py-1.5 flex items-center justify-between`}>
          <span className="font-bold text-xs text-white">Punto #{index + 1}</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-white/90 font-medium">
              {point.speed.toFixed(1)} km/h
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="text-white/80 hover:text-white hover:bg-white/10 p-0.5 rounded transition-colors"
              title="Cerrar"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="p-2.5 space-y-2 text-gray-700">
          <div className="grid grid-cols-2 gap-1.5 text-[11px] bg-slate-50 p-2 rounded-md border border-slate-100">
            <div>
              <span className="text-[10px] text-gray-400 block font-medium">Fecha</span>
              <span className="font-semibold text-gray-800">{point.date}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 block font-medium">Hora</span>
              <span className="font-semibold text-gray-800">{point.time} hrs</span>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md bg-emerald-50/70 p-2 border border-emerald-100 text-[11.5px]">
            <span className="text-gray-600 font-medium">Velocidad:</span>
            <span
              className={`font-extrabold text-xs ${
                point.speed > 0 ? 'text-emerald-700' : 'text-red-600'
              }`}
            >
              {point.speed.toFixed(1)} km/h
            </span>
          </div>

          <div className="text-[10px] text-gray-500 bg-slate-50 p-1.5 rounded border border-slate-100 flex justify-between">
            <span>Lat: {point.latitude.toFixed(5)}</span>
            <span>Lng: {point.longitude.toFixed(5)}</span>
          </div>

          <button
            onClick={() => {
              onJumpToPoint(index);
            }}
            className="w-full mt-1 flex items-center justify-center gap-1.5 bg-[#113EB9] hover:bg-blue-800 text-white py-1.5 px-2 rounded-md font-medium text-[11px] shadow-sm transition-colors cursor-pointer"
          >
            <Play className="h-3 w-3" />
            <span>Reproducir desde aquí</span>
          </button>
        </div>
      </div>
    </InfoWindowF>
  );
});

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

const MapContent = () => {
  const router = useRouter();
  const { username, isReady: isUsernameReady } = useUsername();
  const searchParams = useSearchParams();
  const { baseUrl } = useApi();

  const startDate = normalizeDateParam(searchParams.get('startDate'));
  const endDate = normalizeDateParam(searchParams.get('endDate'));
  const deviceId = searchParams.get('deviceId');

  const [mapCenter, setMapCenter] = useState({
    lat: -12.046591525826495,
    lng: -77.04689047482863,
  });
  const [markersData, setMarkersData] = useState<UnidadDetalleRecorrido[]>([]);
  const [hasNoRecords, setHasNoRecords] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<{
    point: UnidadDetalleRecorrido;
    index: number;
  } | null>(null);
  const [isVehicleInfoOpen, setIsVehicleInfoOpen] = useState(false);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isMarkersLoaded, setIsMarkersLoaded] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [followVehicle, setFollowVehicle] = useState(true);
  const [showVehicle, setShowVehicle] = useState(true);
  const [showAllPoints, setShowAllPoints] = useState(true);
  const [showStatsPanel, setShowStatsPanel] = useState(true);
  const [hasUserStarted, setHasUserStarted] = useState(false);

  const { isLoaded: isScriptLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
    libraries,
  });

  const isLoaded = isScriptLoaded || isMapsApiReady();

  // Ajustar cámara a los límites de la ruta
  const fitMapToBounds = useCallback(
    (points: UnidadDetalleRecorrido[]) => {
      if (!map || points.length === 0 || !isMapsApiReady()) return;
      const bounds = new window.google.maps.LatLngBounds();
      points.forEach((p) =>
        bounds.extend({ lat: p.latitude, lng: p.longitude }),
      );
      map.fitBounds(bounds, 50);
    },
    [map],
  );

  const handleAjustarVista = useCallback(() => {
    setIsPlaying(false);
    setHasUserStarted(false);
    setIsVehicleInfoOpen(false);
    fitMapToBounds(markersData);
  }, [fitMapToBounds, markersData]);

  const focusAndOpenPoint = useCallback(
    (targetIndex: number, forceZoom = true) => {
      setHasUserStarted(true);
      setShowVehicle(true);
      setIsVehicleInfoOpen(true);
      setCurrentIndex(targetIndex);

      if (map && markersData[targetIndex]) {
        const p = markersData[targetIndex];
        map.panTo({ lat: p.latitude, lng: p.longitude });
        if (forceZoom || (map.getZoom() && map.getZoom()! < 15)) {
          map.setZoom(17);
        }
      }
    },
    [map, markersData],
  );

  const fetchData = useCallback(async () => {
    // Guard clause: Si faltan parámetros clave o el usuario aún no está listo
    if (
      !startDate ||
      !endDate ||
      !deviceId ||
      !username ||
      !isUsernameReady ||
      !baseUrl
    ) {
      return;
    }

    try {
      const detailRecorrido = `${baseUrl}/api/Reporting/details/${encodeURIComponent(
        startDate,
      )}/${encodeURIComponent(endDate)}/${encodeURIComponent(
        deviceId,
      )}/${encodeURIComponent(username)}`;
      const response = await axios.get(detailRecorrido);
      
      if (
        !response.data ||
        !response.data.result ||
        response.data.result.length === 0
      ) {
        setHasNoRecords(true);
        setMarkersData([]);
        setIsMarkersLoaded(true);
        toast.error('No hay registros para estas fechas', {
          className: 'toast-slide-in',
          richColors: true,
        });
      } else {
        const data: UnidadDetalleRecorrido[] = response.data.result;
        setHasNoRecords(false);
        setMarkersData(data);
        setIsMarkersLoaded(true);
        setCurrentIndex(0);
        setMapCenter({
          lat: data[0].latitude,
          lng: data[0].longitude,
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setHasNoRecords(true);
      setIsMarkersLoaded(true);
      toast.error('Error al obtener datos del recorrido');
    }
  }, [startDate, endDate, deviceId, username, isUsernameReady, baseUrl]);

  useEffect(() => {
    injectStyles();
    fetchData();
  }, [fetchData]);

  const onLoad = useCallback(
    (mapInstance: google.maps.Map) => {
      setMap(mapInstance);
      if (markersData.length > 0) {
        const bounds = new window.google.maps.LatLngBounds();
        markersData.forEach((p) =>
          bounds.extend({ lat: p.latitude, lng: p.longitude }),
        );
        mapInstance.fitBounds(bounds, 50);
      }
    },
    [markersData],
  );

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Métricas calculadas
  const metrics = useMemo(() => {
    if (markersData.length === 0) {
      return {
        distanciaTotal: 0,
        velMaxima: 0,
        velPromedio: 0,
        puntosMovimiento: 0,
        puntosDetenido: 0,
      };
    }

    const dist = calculateTotalDistance(markersData);
    const speeds = markersData.map((m) => m.speed || 0);
    const maxSpeed = Math.max(...speeds);

    const movingPoints = markersData.filter((m) => m.speed > 0);
    const avgSpeed =
      movingPoints.length > 0
        ? movingPoints.reduce((acc, m) => acc + m.speed, 0) /
          movingPoints.length
        : 0;

    return {
      distanciaTotal: dist,
      velMaxima: maxSpeed,
      velPromedio: avgSpeed,
      puntosMovimiento: movingPoints.length,
      puntosDetenido: markersData.length - movingPoints.length,
    };
  }, [markersData]);

  // Caché estático de iconos para evitar recreaciones por fotograma
  const pointIcons = useMemo(() => {
    if (!isLoaded || !isMapsApiReady()) return null;
    const size = new window.google.maps.Size(26, 26);
    const anchor = new window.google.maps.Point(13, 13);
    return {
      stopped: { url: '/gps.png', scaledSize: size, anchor },
      slow: { url: '/gpsyellow.png', scaledSize: size, anchor },
      normal: { url: '/gpsgreen.png', scaledSize: size, anchor },
      fast: { url: '/gpsblue.png', scaledSize: size, anchor },
    };
  }, [isLoaded]);

  // Coordenadas para Polyline
  const polylineCoordinates = useMemo(
    () =>
      markersData.map((m) => ({
        lat: m.latitude,
        lng: m.longitude,
      })),
    [markersData],
  );

  // Timer loop para el Reproductor (Playback)
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPlaying && markersData.length > 0) {
      const baseMs = 350;
      const delay = Math.max(35, Math.floor(baseMs / playbackSpeed));
      interval = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= markersData.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, delay);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, playbackSpeed, markersData.length]);

  // Auto-ajustar vista del mapa al cargar la ruta por defecto
  useEffect(() => {
    if (map && markersData.length > 0 && isMapsApiReady()) {
      const bounds = new window.google.maps.LatLngBounds();
      markersData.forEach((p) =>
        bounds.extend({ lat: p.latitude, lng: p.longitude }),
      );
      map.fitBounds(bounds, 50);
    }
  }, [map, markersData]);

  // Centrar mapa dinámicamente si followVehicle está activo durante la reproducción o selección
  useEffect(() => {
    if (isPlaying) {
      setHasUserStarted(true);
      setShowVehicle(true);
      setIsVehicleInfoOpen(true);
      if (map && markersData[currentIndex]) {
        if (map.getZoom() && map.getZoom()! < 15) {
          map.setZoom(17);
        }
        map.panTo({
          lat: markersData[currentIndex].latitude,
          lng: markersData[currentIndex].longitude,
        });
      }
    }
  }, [isPlaying, map, currentIndex, markersData]);

  useEffect(() => {
    if (hasUserStarted && followVehicle && map && markersData[currentIndex]) {
      map.panTo({
        lat: markersData[currentIndex].latitude,
        lng: markersData[currentIndex].longitude,
      });
    }
  }, [currentIndex, hasUserStarted, followVehicle, map, markersData]);

  const currentPoint = markersData[currentIndex] || markersData[0] || null;

  // Handlers para interactuar con marcadores
  const handleSelectPoint = useCallback(
    (point: UnidadDetalleRecorrido, index: number) => {
      setSelectedPoint((prev) =>
        prev?.index === index ? null : { point, index },
      );
    },
    [],
  );

  const handleCloseSelectedPoint = useCallback(() => {
    setSelectedPoint(null);
  }, []);

  const handleJumpToPoint = useCallback(
    (index: number) => {
      focusAndOpenPoint(index, true);
      setIsPlaying(true);
      toast.success(`Ubicado en punto #${index + 1}`, { duration: 1500 });
    },
    [focusAndOpenPoint],
  );

  return (
    <div className="relative h-screen w-full overflow-hidden bg-slate-900 font-sans">
      {!isLoaded || !isMarkersLoaded ? (
        <div className="flex h-screen w-full items-center justify-center bg-gray-50">
          <Loader />
        </div>
      ) : (
        <>
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100vh' }}
            center={mapCenter}
            zoom={14}
            onLoad={onLoad}
            onUnmount={onUnmount}
            options={{
              mapTypeControl: false,
              fullscreenControl: false,
              styles: mapStyles,
              zoomControl: false,
            }}
          >
            {/* Trazado principal de la ruta */}
            <RoutePolylineLayer path={polylineCoordinates} />

            {/* Marcadores de INICIO y FIN */}
            <StartEndMarkersLayer
              startPoint={markersData[0]}
              endPoint={
                markersData.length > 1
                  ? markersData[markersData.length - 1]
                  : undefined
              }
            />

            {/* Marcador animado del Vehículo */}
            <VehicleMarkerLayer
              point={currentPoint}
              deviceId={deviceId}
              show={showVehicle}
              isOpen={isVehicleInfoOpen}
              onToggle={() => setIsVehicleInfoOpen((prev) => !prev)}
              onClose={() => setIsVehicleInfoOpen(false)}
            />

            {/* Capa de Puntos GPS con Clustering de alto rendimiento */}
            <GPSPointsClusterLayer
              markersData={markersData}
              show={showAllPoints}
              onSelectPoint={handleSelectPoint}
            />

            {/* InfoWindow Global Único para el punto seleccionado */}
            <SelectedPointInfoWindow
              selected={selectedPoint}
              onClose={handleCloseSelectedPoint}
              onJumpToPoint={handleJumpToPoint}
            />
          </GoogleMap>

          {/* MODAL / BANNER DE SIN REGISTROS */}
          {hasNoRecords && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-100 text-center animate-in fade-in zoom-in duration-200">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                  <AlertCircle className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  Sin registros de recorrido
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  No se encontraron puntos GPS para la unidad{' '}
                  <span className="font-semibold text-gray-800 uppercase">
                    {deviceId || 'seleccionada'}
                  </span>{' '}
                  en el rango de fechas solicitado:
                </p>

                <div className="rounded-lg bg-slate-50 p-3 text-xs text-gray-700 border border-slate-100 mb-5 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-medium">Desde:</span>
                    <span className="font-semibold">{formatDateTime24h(startDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-medium">Hasta:</span>
                    <span className="font-semibold">{formatDateTime24h(endDate)}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => router.back()}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#113EB9] px-4 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-blue-800 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Regresar</span>
                  </button>
                  <button
                    onClick={() => setHasNoRecords(false)}
                    className="rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    Ver mapa vacío
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* BARRA SUPERIOR DE INFORMACIÓN Y OPCIONES */}
          <div className="fixed top-3 left-4 z-20 flex flex-wrap items-center gap-2.5">
            {/* Header de Detalle de recorrido (Sin borde, h-10, rounded-md) */}
            <div className="flex h-10 items-stretch rounded-md bg-[#113EB9] shadow-md overflow-hidden text-xs text-white">
              {/* Logo con fondo naranja al inicio */}
              <div className="flex h-full items-center bg-gradient-to-r from-orange-500 to-red-500 px-3.5 shrink-0">
                <Image
                  src="/LogoWeb.png"
                  alt="Velsat"
                  width={24}
                  height={24}
                  className="h-5 w-5 object-contain"
                  priority
                />
              </div>

              {/* Contenido: Línea vertical opaca bg-white/40, título, ID unidad y rango de fechas */}
              <div className="flex h-full items-center gap-2.5 px-3.5 font-medium">
                <div className="h-5 w-[2px] rounded-full bg-white/40 shrink-0 self-center" />
                <span className="font-bold uppercase text-white tracking-tight">
                  DETALLE DE RECORRIDO
                </span>
                <span className="font-extrabold text-[#ffbe0b] tracking-wide uppercase">
                  {deviceId?.toUpperCase() || ''}
                </span>
                <div className="h-4 w-[2px] rounded-full bg-white/40 shrink-0 self-center" />
                <span className="text-blue-100 font-medium">
                  {formatDateTime24h(startDate)} – {formatDateTime24h(endDate)}
                </span>
              </div>
            </div>

            {/* Switch Toggle para Auto (h-10, rounded-md) */}
            {markersData.length > 0 && (
              <label
                className={`flex h-10 items-center gap-2.5 rounded-md border px-3.5 shadow-sm backdrop-blur-md cursor-pointer select-none transition-all ${
                  showVehicle
                    ? 'bg-[#eff4fe] border-[#d0e0fd]'
                    : 'bg-white/95 border-slate-200 hover:bg-white'
                }`}
              >
                <div className="relative inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={showVehicle}
                    onChange={(e) => setShowVehicle(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`w-9 h-5 rounded-full transition-colors duration-200 flex items-center px-0.5 ${
                      showVehicle ? 'bg-[#113EB9]' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
                        showVehicle ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>
                <span
                  className={`text-xs font-bold tracking-tight transition-colors ${
                    showVehicle ? 'text-[#113EB9]' : 'text-slate-600'
                  }`}
                >
                  Auto
                </span>
              </label>
            )}

            {/* Switch Toggle para Puntos GPS (h-10, rounded-md) */}
            {markersData.length > 0 && (
              <label
                className={`flex h-10 items-center gap-2.5 rounded-md border px-3.5 shadow-sm backdrop-blur-md cursor-pointer select-none transition-all ${
                  showAllPoints
                    ? 'bg-[#eff4fe] border-[#d0e0fd]'
                    : 'bg-white/95 border-slate-200 hover:bg-white'
                }`}
              >
                <div className="relative inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={showAllPoints}
                    onChange={(e) => {
                      setShowAllPoints(e.target.checked);
                      if (!e.target.checked) setSelectedPoint(null);
                    }}
                    className="sr-only"
                  />
                  <div
                    className={`w-9 h-5 rounded-full transition-colors duration-200 flex items-center px-0.5 ${
                      showAllPoints ? 'bg-[#113EB9]' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
                        showAllPoints ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>
                <span
                  className={`text-xs font-bold tracking-tight transition-colors ${
                    showAllPoints ? 'text-[#113EB9]' : 'text-slate-600'
                  }`}
                >
                  Puntos GPS
                </span>
              </label>
            )}

            {/* Botón para reencuadrar el recorrido completo (h-10, rounded-md) */}
            {markersData.length > 0 && (
              <button
                onClick={handleAjustarVista}
                className="flex h-10 items-center gap-1.5 rounded-md border border-slate-200/90 bg-white/95 px-3.5 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-white hover:text-slate-900 cursor-pointer"
                title="Ajustar vista al recorrido completo"
              >
                <Maximize2 className="h-3.5 w-3.5 text-slate-500" />
                <span>Ajustar Vista</span>
              </button>
            )}
          </div>

          {/* BOTÓN REAPERTURA DE TELEMETRÍA (Ubicado arriba a la derecha, h-10, rounded-md) */}
          {!showStatsPanel && markersData.length > 0 && (
            <button
              onClick={() => setShowStatsPanel(true)}
              className="fixed top-3 right-4 z-20 flex h-10 items-center gap-1.5 rounded-md border border-slate-200/90 bg-white/95 px-3.5 text-xs font-bold text-slate-700 shadow-md backdrop-blur-md transition-all hover:bg-white hover:text-slate-900 cursor-pointer"
              title="Mostrar panel de telemetría"
            >
              <Activity className="h-3.5 w-3.5 text-[#113EB9]" />
              <span>Telemetría</span>
            </button>
          )}

          {/* PANEL LATERAL DE TELEMETRÍA Y ESTADÍSTICAS (Ubicado arriba a la derecha) */}
          {showStatsPanel && markersData.length > 0 && (
            <div className="fixed top-3 right-4 z-20 w-72 rounded-lg border border-gray-200/90 bg-white/95 p-3 shadow-xl backdrop-blur-md space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800 uppercase tracking-wide">
                  <Activity className="h-4 w-4 text-[#113EB9]" /> Resumen de
                  Telemetría
                </div>
                <button
                  onClick={() => setShowStatsPanel(false)}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-0.5 rounded transition-colors cursor-pointer"
                  title="Ocultar panel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-blue-50/70 p-2 border border-blue-100">
                  <span className="text-[10px] text-gray-500 block">
                    Distancia Total
                  </span>
                  <span className="font-bold text-[#113EB9] text-sm">
                    {metrics.distanciaTotal.toFixed(2)} km
                  </span>
                </div>

                <div className="rounded-lg bg-amber-50/70 p-2 border border-amber-100">
                  <span className="text-[10px] text-gray-500 block">
                    Vel. Máxima
                  </span>
                  <span className="font-bold text-amber-700 text-sm">
                    {metrics.velMaxima.toFixed(1)} km/h
                  </span>
                </div>

                <div className="rounded-lg bg-emerald-50/70 p-2 border border-emerald-100">
                  <span className="text-[10px] text-gray-500 block">
                    Vel. Promedio
                  </span>
                  <span className="font-bold text-emerald-700 text-sm">
                    {metrics.velPromedio.toFixed(1)} km/h
                  </span>
                </div>

                <div className="rounded-lg bg-slate-100 p-2 border border-slate-200">
                  <span className="text-[10px] text-gray-500 block">
                    Total Puntos
                  </span>
                  <span className="font-bold text-gray-800 text-sm">
                    {markersData.length}
                  </span>
                </div>
              </div>

              {/* Leyenda de rangos de velocidad */}
              <div className="border-t border-gray-100 pt-2 text-[11px] space-y-1.5">
                <span className="font-semibold text-gray-600 text-[10px] uppercase tracking-wider block">
                  Rangos de Velocidad
                </span>
                <div className="grid grid-cols-2 gap-1.5 text-[10.5px]">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500"></span>
                    <span className="text-gray-600">0 km/h (Detenido)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-yellow-400"></span>
                    <span className="text-gray-600">1-10 km/h (Lento)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                    <span className="text-gray-600">11-59 km/h (Normal)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-500"></span>
                    <span className="text-gray-600">≥ 60 km/h (Rápido)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* REPRODUCTOR DE RECORRIDO (PLAYBACK CONTROL BAR) */}
          {markersData.length > 0 && (
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-[92%] max-w-3xl rounded-2xl border border-gray-200/90 bg-white/95 p-3 shadow-2xl backdrop-blur-md flex flex-col gap-2">
              {/* Fila 1: Datos en tiempo real del vehículo durante la animación */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-1.5 text-xs">
                <div className="flex items-center gap-2">
                  {hasUserStarted ? (
                    <span className="font-bold text-[#113EB9] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                      Punto {currentIndex + 1} / {markersData.length}
                    </span>
                  ) : (
                    <span className="font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                      Recorrido ({markersData.length} Puntos)
                    </span>
                  )}

                  {hasUserStarted && currentPoint ? (
                    <span className="text-gray-600 text-[11px]">
                      🕒 {currentPoint.date} {currentPoint.time}
                    </span>
                  ) : (
                    <span className="text-gray-500 text-[11px]">
                      🕒 {formatDateTime24h(startDate)} – {formatDateTime24h(endDate)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {hasUserStarted && currentPoint && (
                    <div className="flex items-center gap-1 text-[11px]">
                      <span className="text-gray-500">Velocidad:</span>
                      <span
                        className={`font-bold ${
                          currentPoint.speed > 0
                            ? 'text-emerald-600'
                            : 'text-red-600'
                        }`}
                      >
                        {currentPoint.speed.toFixed(1)} km/h
                      </span>
                    </div>
                  )}

                  <button
                    onClick={() => setFollowVehicle(!followVehicle)}
                    className={`flex items-center gap-1 text-[10.5px] font-semibold px-2 py-0.5 rounded transition-colors cursor-pointer ${
                      followVehicle
                        ? 'bg-blue-100 text-[#113EB9]'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                    title="Centrar mapa en el vehículo automáticamente"
                  >
                    <Navigation className="h-3 w-3" />
                    <span>{followVehicle ? 'Centrando' : 'Libre'}</span>
                  </button>
                </div>
              </div>

              {/* Fila 2: Barra de progreso (Scrubber Slider) */}
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, markersData.length - 1)}
                  value={currentIndex}
                  onChange={(e) => {
                    focusAndOpenPoint(Number(e.target.value));
                  }}
                  className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-[#113EB9]"
                />
              </div>

              {/* Fila 3: Botones de Control (Play, Pausa, Velocidad) */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {/* Ir al inicio */}
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      focusAndOpenPoint(0);
                    }}
                    className="rounded-lg border border-gray-200 p-1.5 text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                    title="Ir al inicio"
                  >
                    <SkipBack className="h-4 w-4" />
                  </button>

                  {/* Retroceder 1 punto */}
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      focusAndOpenPoint(Math.max(0, currentIndex - 1));
                    }}
                    className="rounded-lg border border-gray-200 p-1.5 text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                    title="Punto anterior (-1)"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {/* Reproducir / Pausar */}
                  <button
                    onClick={() => {
                      if (!isPlaying) {
                        focusAndOpenPoint(currentIndex);
                      }
                      setIsPlaying(!isPlaying);
                    }}
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-white shadow-md transition-all cursor-pointer ${
                      isPlaying
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : 'bg-[#113EB9] hover:bg-blue-800'
                    }`}
                    title={isPlaying ? 'Pausar' : 'Reproducir'}
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4 ml-0.5" />
                    )}
                  </button>

                  {/* Avanzar 1 punto */}
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      if (!hasUserStarted) {
                        focusAndOpenPoint(0);
                      } else {
                        focusAndOpenPoint(
                          Math.min(markersData.length - 1, currentIndex + 1),
                        );
                      }
                    }}
                    className="rounded-lg border border-gray-200 p-1.5 text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                    title="Siguiente punto (+1)"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>

                  {/* Ir al final */}
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      focusAndOpenPoint(Math.max(0, markersData.length - 1));
                    }}
                    className="rounded-lg border border-gray-200 p-1.5 text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                    title="Ir al final"
                  >
                    <SkipForward className="h-4 w-4" />
                  </button>
                </div>

                {/* Selector de Velocidad (1x, 2x, 5x, 10x) */}
                <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-0.5 text-xs font-semibold text-gray-600">
                  {[1, 2, 5, 10].map((speed) => (
                    <button
                      key={speed}
                      onClick={() => setPlaybackSpeed(speed)}
                      className={`rounded px-2 py-1 transition-all cursor-pointer ${
                        playbackSpeed === speed
                          ? 'bg-[#113EB9] text-white shadow-sm'
                          : 'hover:text-gray-900'
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <Toaster />
    </div>
  );
};

export default MapContent;