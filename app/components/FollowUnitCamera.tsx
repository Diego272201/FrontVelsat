'use client';
import React, { useMemo, useRef, useState } from 'react';
import {
  Camera,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Maximize,
  Minimize,
  X,
} from 'lucide-react';

interface DeviceData {
  deviceId: string;
  lastValidLatitude: number;
  lastValidLongitude: number;
  lastValidSpeed: number;
  direccion: string;
  lastValidHeading: number;
  lastGPSTimestamp?: number;
  ultimoServicio?: {
    conductor?: {
      apepate?: string;
    };
    numero?: string;
    empresa?: string;
    tipo?: string;
  } | null;
}

interface FollowUnitCameraProps {
  device: DeviceData;
  onClose: () => void;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

const GOOGLE_MAPS_API_KEY =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY_K ||
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
  '';

export default function FollowUnitCamera({
  device,
  onClose,
  isMinimized: controlledMinimized,
  onToggleMinimize,
}: FollowUnitCameraProps) {
  const [internalMinimized, setInternalMinimized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const isMinimized =
    controlledMinimized !== undefined ? controlledMinimized : internalMinimized;

  const handleToggleMinimize = () => {
    if (onToggleMinimize) {
      onToggleMinimize();
    } else {
      setInternalMinimized((prev) => !prev);
    }
  };

  // Redondear a 4 decimales (~11m de precisión) para que el iframe no parpadee ni se recargue
  // continuamente si el vehículo está detenido o con microvariaciones de GPS
  const roundedLat = device.lastValidLatitude
    ? Number(device.lastValidLatitude.toFixed(4))
    : null;
  const roundedLng = device.lastValidLongitude
    ? Number(device.lastValidLongitude.toFixed(4))
    : null;
  const headingSector = Math.floor((device.lastValidHeading || 0) / 45) * 45;

  const embedUrl = useMemo(() => {
    if (!GOOGLE_MAPS_API_KEY || roundedLat == null || roundedLng == null) {
      return '';
    }
    return `https://www.google.com/maps/embed/v1/streetview?location=${roundedLat},${roundedLng}&heading=${headingSector}&pitch=0&fov=90&key=${GOOGLE_MAPS_API_KEY}`;
  }, [roundedLat, roundedLng, headingSector]);

  // Doble buffer de iframes para eliminar el parpadeo negro durante las transiciones de posición
  const [currentUrl, setCurrentUrl] = useState<string>(embedUrl);
  const [incomingUrl, setIncomingUrl] = useState<string | null>(null);
  const [incomingReady, setIncomingReady] = useState<boolean>(false);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const lastDeviceIdRef = useRef(device.deviceId);

  // Sincronizar embedUrl cuando cambia de posición o de vehículo
  React.useEffect(() => {
    if (lastDeviceIdRef.current !== device.deviceId) {
      lastDeviceIdRef.current = device.deviceId;
      timeoutsRef.current.forEach((t) => clearTimeout(t));
      timeoutsRef.current = [];
      setIncomingUrl(null);
      setIncomingReady(false);
      setCurrentUrl(embedUrl);
      return;
    }

    if (!embedUrl) return;

    if (!currentUrl) {
      setCurrentUrl(embedUrl);
      return;
    }

    if (embedUrl === currentUrl || embedUrl === incomingUrl) {
      return;
    }

    // Nuevo destino: precargar en el segundo iframe mientras el actual permanece visible sin pantalla negra
    setIncomingUrl(embedUrl);
    setIncomingReady(false);
  }, [embedUrl, currentUrl, incomingUrl, device.deviceId]);

  const handleIncomingLoad = () => {
    // Esperar a que el canvas de Google Maps dibuje el primer frame
    const t1 = setTimeout(() => {
      setIncomingReady(true);

      // Una vez completada la transición suave (300ms), actualizar currentUrl y limpiar
      const t2 = setTimeout(() => {
        setIncomingUrl((latestIncoming) => {
          if (latestIncoming) {
            setCurrentUrl(latestIncoming);
          }
          return null;
        });
        setIncomingReady(false);
      }, 350);

      timeoutsRef.current.push(t2);
    }, 400);

    timeoutsRef.current.push(t1);
  };

  React.useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((t) => clearTimeout(t));
      timeoutsRef.current = [];
    };
  }, []);

  const speed = Math.round(device.lastValidSpeed || 0);

  const handleOpenFullFollow = () => {
    const url = `/trackvelnew/seguirUnidad?deviceId=${device.deviceId}`;
    window.open(url, '_blank');
  };

  const headerBtn =
    'flex h-[26px] w-[26px] items-center justify-center rounded-[5px] text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-900';

  return (
    <aside
      aria-label="Cámara fija de unidad"
      className={`fixed bottom-4 right-4 z-[990] select-none overflow-hidden rounded-lg bg-white shadow-[0_2px_6px_rgba(15,23,42,0.12),0_12px_28px_rgba(15,23,42,0.18)] transition-[width] duration-200 max-w-[calc(100vw-32px)] ${
        isExpanded ? 'w-[560px]' : 'w-[340px]'
      }`}
      style={{ fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif" }}
    >
      <div className="flex h-[36px] items-center gap-2 border-b border-slate-200 bg-slate-50 pl-3 pr-1.5">
        <span className="flex-1 truncate text-[13px] font-semibold tracking-[0.01em] text-slate-900">
          {device.deviceId.toUpperCase()}
        </span>

        <span className="flex-shrink-0 text-[12px] tabular-nums text-slate-500">
          <span className="font-semibold text-slate-900">{speed}</span> km/h
        </span>

        <span className="mx-0.5 h-[18px] w-px flex-shrink-0 bg-slate-200" />

        <div className="flex flex-shrink-0 items-center gap-0.5">
          {!isMinimized && (
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              title={isExpanded ? 'Tamaño normal' : 'Agrandar visor'}
              className={`${headerBtn} ${isExpanded ? 'bg-slate-200 text-slate-900' : ''}`}
            >
              {isExpanded ? <Minimize size={14} /> : <Maximize size={14} />}
            </button>
          )}

          <button
            type="button"
            onClick={handleOpenFullFollow}
            title="Abrir seguimiento en nueva pestaña"
            className={headerBtn}
          >
            <ExternalLink size={14} />
          </button>

          <button
            type="button"
            onClick={handleToggleMinimize}
            title={isMinimized ? 'Mostrar visor' : 'Minimizar visor'}
            className={headerBtn}
          >
            {isMinimized ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>

          <button
            type="button"
            onClick={onClose}
            title="Detener cámara fija y cerrar"
            className="flex h-[26px] w-[26px] items-center justify-center rounded-[5px] text-slate-600 transition-colors hover:bg-red-600 hover:text-white"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* overflow hidden recorta la tarjeta de dirección, los controles laterales y la franja inferior del embed */}
          <div
            className={`relative w-full bg-neutral-900 overflow-hidden transition-[height] duration-200 ${
              isExpanded ? 'h-[320px]' : 'h-[200px]'
            }`}
          >
            {/* Iframe actual (permanece visible mientras el nuevo carga para evitar pantalla negra) */}
            {currentUrl && (
              <iframe
                key={currentUrl}
                src={currentUrl}
                style={{
                  position: 'absolute',
                  top: '-95px',
                  left: '0',
                  width: 'calc(100% + 60px)',
                  height: 'calc(100% + 111px)',
                  border: 0,
                  zIndex: 1,
                  opacity: 1,
                }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={`Street View - ${device.deviceId}`}
              />
            )}

            {/* Iframe entrante (se precarga con opacity 0 encima y hace transición suave cuando esté listo) */}
            {incomingUrl && (
              <iframe
                key={incomingUrl}
                src={incomingUrl}
                onLoad={handleIncomingLoad}
                style={{
                  position: 'absolute',
                  top: '-95px',
                  left: '0',
                  width: 'calc(100% + 60px)',
                  height: 'calc(100% + 111px)',
                  border: 0,
                  zIndex: 2,
                  opacity: incomingReady ? 1 : 0,
                  transition: 'opacity 300ms ease-in-out',
                }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={`Street View nuevo - ${device.deviceId}`}
              />
            )}

            {!currentUrl && !incomingUrl && (
              <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 p-4 text-center text-xs text-neutral-400">
                <Camera className="h-6 w-6 text-neutral-500" />
                <span>Cargando vista de calle...</span>
              </div>
            )}
          </div>

 
        </>
      )}
    </aside>
  );
}
