'use client';
import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  MapPin,
  Users,
  TrendingUp,
  Ruler,
  BarChart3,
  Navigation,
  Home,
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { BsFillGeoAltFill } from 'react-icons/bs';

interface Pasajero {
  id: string;
  nombre: string;
  distrito: string;
  direccion: string;
  lat: number;
  lng: number;
  grupo: number;
  numeroEnMapa: number;
}

interface ModalMapaAgrupamientoProps {
  isOpen: boolean;
  onClose: () => void;
  grupos: Array<{
    id: string;
    numero: number;
    pasajeros: Array<{
      id: string;
      nombre: string;
      distrito: string;
      direccion: string;
      _apiData?: {
        direccionPasajero: {
          wy: string;
          wx: string;
        };
      };
    }>;
  }>;
  distanciaMaxima?: number;
}

const colores = [
  '#DC2626', // Rojo intenso
  '#059669', // Verde esmeralda
  '#2563EB', // Azul rey
  '#D97706', // Naranja oscuro
  '#7C3AED', // Púrpura
  '#DB2777', // Rosa fucsia
  '#0891B2', // Cyan oscuro
  '#EA580C', // Naranja fuego
  '#65A30D', // Lima
  '#4F46E5', // Índigo
  '#BE185D', // Rosa oscuro
  '#0E7490', // Cyan profundo
  '#92400E', // Marrón
  '#6D28D9', // Violeta
  '#BE123C', // Carmesí
  '#047857', // Verde bosque
  '#1E40AF', // Azul profundo
  '#B91C1C', // Rojo sangre
  '#15803D', // Verde pino
  '#6366F1', // Índigo claro
];

export const ModalMapaAgrupamiento: React.FC<ModalMapaAgrupamientoProps> = ({
  isOpen,
  onClose,
  grupos,
  distanciaMaxima = 3,
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const [pasajerosProcesados, setPasajerosProcesados] = useState<Pasajero[]>(
    [],
  );

  const [modoMapa, setModoMapa] = useState<'calles' | 'oscuro' | 'satelite'>(
    'calles',
  );

  // Procesar pasajeros con coordenadas
  useEffect(() => {
    if (!isOpen) return;

    const procesados: Pasajero[] = [];
    let numeroSecuencial = 1;

    grupos.forEach((grupo) => {
      grupo.pasajeros.forEach((pasajero) => {
        if (pasajero._apiData?.direccionPasajero) {
          const lat = parseFloat(pasajero._apiData.direccionPasajero.wy);
          const lng = parseFloat(pasajero._apiData.direccionPasajero.wx);

          if (!isNaN(lat) && !isNaN(lng)) {
            procesados.push({
              id: pasajero.id,
              nombre: pasajero.nombre,
              distrito: pasajero.distrito,
              direccion: pasajero.direccion,
              lat,
              lng,
              grupo: grupo.numero,
              numeroEnMapa: numeroSecuencial++,
            });
          }
        }
      });
    });

    setPasajerosProcesados(procesados);
  }, [isOpen, grupos]);

  // Función para centrar en un pasajero
  const centrarEnPasajero = (pasajeroId: string) => {
    const marker = markersRef.current.get(pasajeroId);
    if (marker && mapRef.current) {
      mapRef.current.setView(marker.getLatLng(), 15, {
        animate: true,
        duration: 0.5,
      });
      marker.openPopup();
    }
  };

  // Inicializar y dibujar mapa
  useEffect(() => {
    if (
      !isOpen ||
      !mapContainerRef.current ||
      pasajerosProcesados.length === 0
    ) {
      return;
    }

    // Limpiar mapa existente
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
    markersRef.current.clear();

    // Crear nuevo mapa
    const map = L.map(mapContainerRef.current).setView([-12.05, -77.03], 11);
    mapRef.current = map;

    const tileUrls = {
      calles: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      oscuro:
        'https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png',
      satelite:
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    };

    L.tileLayer(tileUrls[modoMapa], {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Agrupar pasajeros por grupo
    const gruposPorNumero = new Map<number, Pasajero[]>();
    pasajerosProcesados.forEach((pasajero) => {
      if (!gruposPorNumero.has(pasajero.grupo)) {
        gruposPorNumero.set(pasajero.grupo, []);
      }
      gruposPorNumero.get(pasajero.grupo)!.push(pasajero);
    });

    // Dibujar marcadores y círculos
    gruposPorNumero.forEach((pasajeros, grupoNumero) => {
      const grupoIndex = grupoNumero - 1;
      const color = colores[grupoIndex % colores.length];

      pasajeros.forEach((pasajero) => {
        const icon = L.divIcon({
          html: `
            <div style="position: relative; width: 40px; height: 40px;">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="40" 
                height="40" 
                viewBox="0 0 24 24" 
                fill="${color}" 
                stroke="white" 
                stroke-width="2.5" 
                stroke-linecap="round" 
                stroke-linejoin="round"
                style="filter: drop-shadow(0 4px 10px rgba(0,0,0,0.5));"
              >
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <div style="
                position: absolute;
                top: 6px;
                left: 50%;
                transform: translateX(-50%);
                background: white;
                color: ${color};
                border-radius: 50%;
                width: 18px;
                height: 18px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 900;
                font-size: 12px;
                font-family: system-ui, -apple-system, sans-serif;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
              ">
                ${pasajero.numeroEnMapa}
              </div>
            </div>
          `,
          className: '',
          iconSize: [40, 40] as [number, number],
          iconAnchor: [20, 40] as [number, number],
          popupAnchor: [0, -40] as [number, number],
        });

        // Crear marcador
        const marker = L.marker([pasajero.lat, pasajero.lng], { icon }).addTo(
          map,
        );

        // Guardar referencia al marcador
        markersRef.current.set(pasajero.id, marker);

        marker.bindPopup(`
          <div style="min-width: 250px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <div style="
                background: ${color}; 
                color: white; 
                width: 28px; 
                height: 28px; 
                border-radius: 50%; 
                display: flex; 
                align-items: center; 
                justify-content: center;
                font-weight: 900;
                font-size: 14px;
                box-shadow: 0 2px 6px rgba(0,0,0,0.25);
              ">
                ${pasajero.numeroEnMapa}
              </div>
              <strong style="font-size: 14px; color: #333;">${pasajero.nombre}</strong>
            </div>
    <div style="display: flex; align-items: flex-start; gap: 6px; margin-bottom: 4px;">
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; margin-top: 2px;">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
  <span style="color: #666; font-size: 12px; line-height: 1.3;">${pasajero.direccion}</span>
</div>
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              <span style="color: #999; font-size: 11px;">${pasajero.distrito}</span>
            </div>
            <span style="background: ${color}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 700; display: inline-block; margin-top: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.15);">Grupo ${grupoNumero}</span><br>
          </div>
        `);
      });

      // Dibujar círculo alrededor del cluster
      if (pasajeros.length > 1) {
        const lats = pasajeros.map((p) => p.lat);
        const lngs = pasajeros.map((p) => p.lng);
        const centroLat = lats.reduce((a, b) => a + b) / lats.length;
        const centroLng = lngs.reduce((a, b) => a + b) / lngs.length;

        L.circle([centroLat, centroLng], {
          color: color,
          fillColor: color,
          fillOpacity: 0.15,
          radius: distanciaMaxima * 1000,
          weight: 2.5,
          dashArray: '5, 5',
          opacity: 0.7,
        }).addTo(map);
      }
    });

    // Ajustar vista del mapa
    if (pasajerosProcesados.length > 0) {
      const bounds = L.latLngBounds(
        pasajerosProcesados.map((p) => [p.lat, p.lng] as [number, number]),
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }

    // Forzar redibujado
    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    // Cleanup
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markersRef.current.clear();
    };
  }, [isOpen, pasajerosProcesados, distanciaMaxima, modoMapa]);

  if (!isOpen) return null;

  const totalPasajeros = pasajerosProcesados.length;
  const totalGrupos = grupos.length;
  const promedioPorGrupo = totalGrupos > 0 ? totalPasajeros / totalGrupos : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="flex h-[90vh] w-[95vw] max-w-[1600px] flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between bg-blue-800 px-4 py-3 text-white">
          <div>
            <div className="flex items-center gap-3">
              <BsFillGeoAltFill className="h-6 w-6" />
              <h2 className="text-[15px] font-bold">
                Agrupamiento por Proximidad Geográfica
              </h2>
            </div>
            <p className="mt-1 text-sm opacity-90">
              Visualización de grupos formados automáticamente por cercanía
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setModoMapa('calles')}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                modoMapa === 'calles'
                  ? 'bg-white text-blue-800'
                  : 'bg-blue-700 text-white hover:bg-blue-600'
              }`}
            >
              Calles
            </button>
            <button
              onClick={() => setModoMapa('oscuro')}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                modoMapa === 'oscuro'
                  ? 'bg-white text-blue-800'
                  : 'bg-blue-700 text-white hover:bg-blue-600'
              }`}
            >
              Oscuro
            </button>
            <button
              onClick={() => setModoMapa('satelite')}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                modoMapa === 'satelite'
                  ? 'bg-white text-blue-800'
                  : 'bg-blue-700 text-white hover:bg-blue-600'
              }`}
            >
              Satélite
            </button>

            <button
              onClick={onClose}
              className="rounded-full p-2 transition-colors hover:bg-white hover:bg-opacity-20"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex flex-1 overflow-hidden">
          {/* Mapa */}
          <div
            ref={mapContainerRef}
            className="flex-1"
            style={{ height: '100%' }}
          />

          {/* Sidebar */}
          <div className="w-96 overflow-y-auto border-l bg-gray-50 p-6">
            {/* Estadísticas */}
            <div className="mb-6 rounded-lg bg-white p-4 shadow">
              <h3 className="mb-3 flex items-center gap-2 text-[12px] font-semibold text-gray-800">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Estadísticas
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-600" />
                    <span className="text-[12px] text-gray-600 ">
                      Total de pasajeros:
                    </span>
                  </div>
                  <span className="font-bold text-blue-600">
                    {totalPasajeros}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2">
                    <Navigation className="h-4 w-4 text-gray-600" />
                    <span className="text-[12px] text-gray-600 ">
                      Grupos formados:
                    </span>
                  </div>
                  <span className="font-bold text-blue-600">{totalGrupos}</span>
                </div>
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2">
                    <Ruler className="h-4 w-4 text-gray-600" />
                    <span className="text-[12px] text-gray-600 ">
                      Distancia máxima:
                    </span>
                  </div>
                  <span className="font-bold text-blue-600">
                    {distanciaMaxima} km
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-gray-600" />
                    <span className="text-[12px] text-gray-600 ">
                      Pasajeros por grupo:
                    </span>
                  </div>
                  <span className="font-bold text-blue-600">
                    {promedioPorGrupo.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>

            {/* Lista de grupos */}
            <div className="space-y-4">
              {grupos.map((grupo, index) => {
                const color = colores[index % colores.length];
                const pasajerosGrupo = pasajerosProcesados.filter(
                  (p) => p.grupo === grupo.numero,
                );

                return (
                  <div
                    key={grupo.id}
                    className="rounded-lg bg-white p-4 shadow"
                  >
                    <div className="mb-3 flex items-center gap-3">
                      <div
                        className="h-6 w-6 rounded-full border-2 border-gray-200 shadow-md"
                        style={{ backgroundColor: color }}
                      />
                      <div className="font-bold text-gray-800">
                        Grupo {grupo.numero} ({pasajerosGrupo.length} pasajero
                        {pasajerosGrupo.length !== 1 ? 's' : ''})
                      </div>
                    </div>

                    <ul className="space-y-2">
                      {pasajerosGrupo.map((p) => (
                        <li
                          key={p.id}
                          onClick={() => centrarEnPasajero(p.id)}
                          className="cursor-pointer rounded border-l-4 bg-gray-50 p-3 text-sm transition-all hover:bg-gray-100 hover:shadow-md"
                          style={{ borderLeftColor: color }}
                        >
                          <div className="mb-2 flex items-center gap-2">
                            <div
                              className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-black text-white shadow-sm"
                              style={{ backgroundColor: color }}
                            >
                              {p.numeroEnMapa}
                            </div>
                            <strong className="text-[11px] text-gray-800">
                              {p.nombre}
                            </strong>
                          </div>
                          <div className="mb-1 ml-8 flex items-start gap-2">
                            <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-600" />
                            <small className="leading-tight text-gray-600">
                              {p.direccion}
                            </small>
                          </div>
                          <div className="ml-8 flex items-center gap-2">
                            <Home className="h-3 w-3 text-gray-500" />
                            <small className="text-gray-500">
                              {p.distrito}
                            </small>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
