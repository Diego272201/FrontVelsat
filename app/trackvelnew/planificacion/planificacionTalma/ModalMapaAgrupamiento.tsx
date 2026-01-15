import React, { useEffect, useRef, useState } from 'react';
import { X, MapPin } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Pasajero {
  id: string;
  nombre: string;
  distrito: string;
  direccion: string;
  lat: number;
  lng: number;
  grupo: number;
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
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788',
  '#E63946', '#A8DADC', '#457B9D', '#F1FAEE', '#E76F51',
  '#264653', '#2A9D8F', '#E9C46A', '#F4A261', '#E76F51',
];

export const ModalMapaAgrupamiento: React.FC<ModalMapaAgrupamientoProps> = ({
  isOpen,
  onClose,
  grupos,
  distanciaMaxima = 3,
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [pasajerosProcesados, setPasajerosProcesados] = useState<Pasajero[]>([]);

  // Procesar pasajeros con coordenadas
  useEffect(() => {
    if (!isOpen) return;

    const procesados: Pasajero[] = [];
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
            });
          }
        }
      });
    });

    setPasajerosProcesados(procesados);
  }, [isOpen, grupos]);

  // Inicializar y dibujar mapa
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current || pasajerosProcesados.length === 0) {
      return;
    }

    // Limpiar mapa existente
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    // Crear nuevo mapa
    const map = L.map(mapContainerRef.current).setView([-12.05, -77.03], 11);
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
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
        // Crear icono personalizado
        const icon = L.divIcon({
          html: `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 3px 8px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 11px;">${pasajero.id}</div>`,
          className: '',
          iconSize: [30, 30] as [number, number],
          iconAnchor: [15, 15] as [number, number],
        });

        // Crear marcador
        const marker = L.marker([pasajero.lat, pasajero.lng], { icon }).addTo(map);

        // Popup con información
        marker.bindPopup(`
          <div style="min-width: 250px;">
            <strong style="font-size: 14px; color: #333;">${pasajero.nombre}</strong><br>
            <span style="color: #666; font-size: 12px;">📍 ${pasajero.direccion}</span><br>
            <span style="color: #999; font-size: 11px;">${pasajero.distrito}</span><br>
            <span style="background: ${color}; color: white; padding: 3px 10px; border-radius: 10px; font-size: 11px; display: inline-block; margin-top: 5px;">Grupo ${grupoNumero}</span><br>
            <small style="color: #aaa; font-size: 10px;">Código: ${pasajero.id}</small>
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
          fillOpacity: 0.1,
          radius: distanciaMaxima * 1000, // km a metros
          weight: 2,
          dashArray: '5, 5',
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
    };
  }, [isOpen, pasajerosProcesados, distanciaMaxima]);

  if (!isOpen) return null;

  const totalPasajeros = pasajerosProcesados.length;
  const totalGrupos = grupos.length;
  const promedioPorGrupo = totalGrupos > 0 ? totalPasajeros / totalGrupos : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="flex h-[90vh] w-[95vw] max-w-[1600px] flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 text-white">
          <div>
            <h2 className="text-2xl font-bold">
              🚐 Agrupamiento por Proximidad Geográfica
            </h2>
            <p className="text-sm opacity-90">
              Visualización de grupos formados automáticamente por cercanía
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 transition-colors hover:bg-white hover:bg-opacity-20"
          >
            <X className="h-6 w-6" />
          </button>
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
              <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-800">
                📊 Estadísticas
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-600">Total de pasajeros:</span>
                  <span className="font-bold text-blue-600">{totalPasajeros}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-600">Grupos formados:</span>
                  <span className="font-bold text-blue-600">{totalGrupos}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-600">Distancia máxima:</span>
                  <span className="font-bold text-blue-600">
                    {distanciaMaxima} km
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Pasajeros por grupo:</span>
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
                  <div key={grupo.id} className="rounded-lg bg-white p-4 shadow">
                    <div className="mb-3 flex items-center gap-3">
                      <div
                        className="h-8 w-8 rounded-full border-3 border-white shadow-md"
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
                          className="rounded border-l-3 bg-gray-50 p-3 text-sm"
                          style={{ borderLeftColor: color }}
                        >
                          <strong className="block text-gray-800">{p.nombre}</strong>
                          <small className="block text-gray-600">
                            📍 {p.direccion}
                          </small>
                          <small className="block text-gray-500">
                            🏘️ {p.distrito}
                          </small>
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