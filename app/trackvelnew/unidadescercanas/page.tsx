'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Configuración de capas del mapa
const mapLayers = {
  openstreetmap: {
    name: 'Calles',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    icon: '🗺️',
  },
  hybrid: {
    name: 'Híbrido',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '&copy; <a href="https://www.google.com/maps">Google</a>',
    icon: '🌍',
  },
  satellite_google: {
    name: 'Satelital',
    url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    attribution: '&copy; <a href="https://www.google.com/maps">Google</a>',
    icon: '🛰️',
  },
} as const;

// Data de ejemplo basada en tu imagen
const sidebarData = [
  { id: 1, placa: 'B111-CME191', distancia: '1.19 Km' },
  { id: 2, placa: 'C158-ACP838', distancia: '1.87 Km' },
  { id: 3, placa: 'C218-BDK752', distancia: '2.69 Km' },
  { id: 4, placa: 'B119-CMZ79', distancia: '2.77 Km' },
  { id: 5, placa: 'C169-ADG867', distancia: '4.09 Km' },
  { id: 6, placa: 'C202-ATC896', distancia: '4.43 Km' },
  { id: 7, placa: 'C182-ADT892', distancia: '4.64 Km' },
  { id: 8, placa: 'C148-ABZ856', distancia: '5.0 Km' },
];

// Centro del mapa (coordenadas de ejemplo)
const center: [number, number] = [-9.22812, -75.78894];

// Componente para controlar las capas
const LayerController = ({ currentLayer }: { currentLayer: keyof typeof mapLayers }) => {
  const map = useMap();

  useEffect(() => {
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    const newLayer = L.tileLayer(mapLayers[currentLayer].url, {
      attribution: mapLayers[currentLayer].attribution,
      maxZoom: 19,
    });

    newLayer.addTo(map);
  }, [map, currentLayer]);

  return null;
};

// Componente para controlar el mapa
const MapController = ({ onMapReady }: { onMapReady: (map: L.Map) => void }) => {
  const map = useMap();

  useEffect(() => {
    if (map) {
      onMapReady(map);
    }
  }, [map, onMapReady]);

  return null;
};

// Componente Sidebar
const Sidebar = ({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) => {
  return (
    <>
      {/* Overlay para móviles */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 h-full bg-white shadow-lg z-50 transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        w-70 lg:w-[300px]
      `}>
        {/* Header del Sidebar */}
        <div className="bg-blue-600 text-white py-2 px-4 flex items-center justify-between">
          <h2 className="text-[14px] font-semibold">UNIDADES CERCANAS: 2KM</h2>
          <button
            onClick={onToggle}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Contenido del Sidebar */}
  <div className="h-full overflow-y-auto pb-20">
  {/* Tabla de datos */}
  <div className="p-4">
    <div className="bg-gray-50 overflow-hidden">
      {/* Header de la tabla */}
      <div className="bg-gray-200 px-4 py-3 border-b">
        <div className="grid grid-cols-[0.5fr_1fr_1fr] gap-4 text-[12px] font-semibold text-gray-700">
          <div>ITEM</div>
          <div>PLACA</div>
          <div>DISTANCIA</div>
        </div>
      </div>

      {/* Filas de datos */}
      <div className="divide-y divide-gray-200">
        {sidebarData.map((item, index) => (
          <div
            key={item.id}
            className={`px-4 py-3 hover:bg-blue-50 transition-colors cursor-pointer ${
              index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
            }`}
          >
            <div className="grid grid-cols-[0.5fr_1fr_1fr] gap-4 text-[12px]">
              <div className="text-gray-600">{item.id}</div>
              <div className="text-blue-600">{item.placa}</div>
              <div className="text-gray-800">{item.distancia}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>

  {/* Información adicional */}
  <div className="p-4 border-t bg-gray-50">
    <div className="text-sm text-gray-600">
      <p className="mb-2">
        <strong>Total de vehículos:</strong> {sidebarData.length}
      </p>
      <p className="text-xs text-gray-500">
        Las distancias se calculan desde el punto de referencia actual
      </p>
    </div>
  </div>
</div>



      </div>
    </>
  );
};

export default function Page() {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [currentLayer, setCurrentLayer] = useState<keyof typeof mapLayers>('openstreetmap');
  const [showLayerSelector, setShowLayerSelector] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    setMapLoaded(true);
  }, []);

  const onMapReady = useCallback((map: L.Map) => {
    mapRef.current = map;
    console.log('Mapa listo');
  }, []);

  const handleLayerChange = useCallback((layerKey: keyof typeof mapLayers) => {
    setCurrentLayer(layerKey);
    setShowLayerSelector(false);
  }, []);

  const centerMap = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.setView(center, 6);
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(!sidebarOpen);
  }, [sidebarOpen]);

  if (!mapLoaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Cargando mapa...</div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />

      {/* Botón para abrir sidebar */}
      {!sidebarOpen && (
        <button
          onClick={toggleSidebar}
          className="fixed top-4 left-4 z-40 bg-blue-600 text-white p-3 rounded-lg shadow-lg hover:bg-blue-700 transition-colors"
          title="Mostrar lista de vehículos"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      {/* Mapa */}
      <div className="h-screen w-full">
        <MapContainer
          center={center}
          zoom={6}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
          className="z-10"
          zoomControl={false}
          maxZoom={19}
          minZoom={1}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />

          <LayerController currentLayer={currentLayer} />

          <MapController onMapReady={onMapReady} />
        </MapContainer>
      </div>

      {/* Controles de zoom y selector de capas */}
      <div className="fixed bottom-4 right-4 z-30 flex flex-col gap-2">
        {/* Selector de capas */}
        <div className="relative">
          <button
            onClick={() => setShowLayerSelector(!showLayerSelector)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white shadow-lg transition-colors hover:bg-gray-50"
            title="Cambiar vista del mapa"
          >
            <span className="text-lg">{mapLayers[currentLayer].icon}</span>
          </button>

          {showLayerSelector && (
            <div className="absolute bottom-12 right-0 z-50 w-48 rounded-lg border border-gray-200 bg-white shadow-xl">
              <div className="p-2">
                <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Vista del Mapa
                </div>
                {Object.entries(mapLayers).map(([key, layer]) => (
                  <button
                    key={key}
                    onClick={() => handleLayerChange(key as keyof typeof mapLayers)}
                    className={`flex w-full items-center rounded-md px-3 py-2 text-sm transition-colors ${
                      currentLayer === key
                        ? 'bg-blue-50 font-medium text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="mr-3 text-base">{layer.icon}</span>
                    {layer.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Controles de zoom */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => mapRef.current?.zoomIn()}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white text-lg font-bold shadow-lg hover:bg-gray-50"
          >
            +
          </button>
          <button
            onClick={() => mapRef.current?.zoomOut()}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white text-lg font-bold shadow-lg hover:bg-gray-50"
          >
            -
          </button>
          <button
            onClick={centerMap}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white text-lg font-bold shadow-lg hover:bg-gray-50"
            title="Centrar mapa"
          >
            🏠
          </button>
        </div>
      </div>
    </div>
  );
}