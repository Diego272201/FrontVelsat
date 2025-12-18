"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { MapContainer, TileLayer, useMap, Marker, Popup, Circle } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { useUsername } from "@/hooks/useUsername"

// Fix para los iconos de Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
})

// Estilos personalizados para el popup
const customPopupStyles = `
  .custom-popup .leaflet-popup-content-wrapper {
    background-color: #fff !important;
    border-radius: 5px !important;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1) !important;
    padding: 5px !important;
  }
  .custom-popup .leaflet-popup-content {
    padding: 0 !important;
    margin: 0 !important;
  }
  .custom-popup .leaflet-popup-tip {
    background-color: #FFF !important;
  }
`

// Inject styles only on client side
const injectStyles = () => {
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    const existingStyle = document.getElementById("custom-popup-styles")
    if (!existingStyle) {
      const styleTag = document.createElement("style")
      styleTag.id = "custom-popup-styles"
      styleTag.textContent = customPopupStyles
      document.head.appendChild(styleTag)
    }
  }
}

// Configuración de capas del mapa
const mapLayers = {
  openstreetmap: {
    name: "Calles",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    icon: "🗺️",
  },
  hybrid: {
    name: "Híbrido",
    url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
    attribution: '&copy; <a href="https://www.google.com/maps">Google</a>',
    icon: "🌍",
  },
  satellite_google: {
    name: "Satelital",
    url: "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
    attribution: '&copy; <a href="https://www.google.com/maps">Google</a>',
    icon: "🛰️",
  },
} as const

// Tipos para la API
interface Unidad {
  codunidad: string
  gps: {
    posx: number
    posy: number
    ubicacion: {
      dircompleta: string
    }
  }
  distancia: number
  esUnidadBase: boolean
}

interface ApiResponse {
  radioBusqueda: number
  unidadBase: string
  totalEncontradas: number
  unidades: Unidad[]
}

// Get URL parameters only on client side
const getUrlParams = () => {
  if (typeof window === "undefined") {
    return { deviceId: "C254-CSD202", distancia: "0.5" }
  }

  const urlParams = new URLSearchParams(window.location.search)
  return {
    deviceId: urlParams.get("deviceId") || "C254-CSD202",
    distancia: urlParams.get("distancia") || "0.5",
  }
}

// Iconos personalizados
const createCustomIcon = (isBase: boolean) => {
  const iconHtml = isBase
    ? `<div style="
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 3px solid white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        color: white;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
      ">🏠</div>`
    : `<div style="
        background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 3px solid white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        color: white;
        box-shadow: 0 3px 6px rgba(0,0,0,0.2);
      ">🚐</div>`

  return L.divIcon({
    html: iconHtml,
    className: "custom-marker",
    iconSize: [isBase ? 36 : 32, isBase ? 36 : 32],
    iconAnchor: [isBase ? 18 : 16, isBase ? 18 : 16],
    popupAnchor: [0, isBase ? -18 : -16],
  })
}

// Componente para controlar las capas
const LayerController = ({
  currentLayer,
}: {
  currentLayer: keyof typeof mapLayers
}) => {
  const map = useMap()

  useEffect(() => {
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer)
      }
    })

    const newLayer = L.tileLayer(mapLayers[currentLayer].url, {
      attribution: mapLayers[currentLayer].attribution,
      maxZoom: 19,
    })

    newLayer.addTo(map)
  }, [map, currentLayer])

  return null
}

// Componente para controlar el mapa
const MapController = ({
  onMapReady,
  unidades,
  center,
}: {
  onMapReady: (map: L.Map) => void
  unidades: Unidad[]
  center: [number, number] | null
}) => {
  const map = useMap()

  useEffect(() => {
    if (map) {
      onMapReady(map)
    }
  }, [map, onMapReady])

  // Ajustar vista cuando hay unidades y abrir todos los popups
  useEffect(() => {
    if (map && unidades.length > 0) {
      const bounds = L.latLngBounds(unidades.map((unidad) => [unidad.gps.posy, unidad.gps.posx]))
      map.fitBounds(bounds, { padding: [20, 20] })

      // Abrir todos los popups después de un pequeño delay
      setTimeout(() => {
        map.eachLayer((layer) => {
          if (layer instanceof L.Marker) {
            layer.openPopup()
          }
        })
      }, 500)
    }
  }, [map, unidades])

  return null
}

// Componente Sidebar
const Sidebar = ({
  isOpen,
  onToggle,
  unidades,
  loading,
  error,
  radioBusqueda,
}: {
  isOpen: boolean
  onToggle: () => void
  unidades: Unidad[]
  loading: boolean
  error: string | null
  radioBusqueda: number
}) => {
  return (
    <>
      {/* Overlay para móviles */}
      {isOpen && <div className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden" onClick={onToggle} />}

      {/* Sidebar */}
      <div
        className={`
        fixed left-0 top-0 z-50 h-full transform bg-white shadow-lg transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        w-80 lg:w-[320px]
      `}
      >
        {/* Header del Sidebar */}
        <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 text-white">
          <div>
            <h2 className="text-sm font-semibold">UNIDADES CERCANAS</h2>
            <p className="text-xs opacity-90">Radio: {radioBusqueda} km</p>
          </div>
          <button onClick={onToggle} className="rounded p-1 text-white transition-colors hover:text-gray-200">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Contenido del Sidebar */}
        <div className="h-full overflow-y-auto pb-20">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Cargando...</span>
            </div>
          ) : error ? (
            <div className="p-4">
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <div className="flex items-center">
                  <svg className="mr-2 h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-sm font-medium text-red-700">Error al cargar datos</p>
                </div>
                <p className="mt-1 text-xs text-red-600">{error}</p>
              </div>
            </div>
          ) : unidades.length === 0 ? (
            <div className="p-4">
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-center">
                <svg
                  className="mx-auto mb-2 h-8 w-8 text-yellow-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.471.94-6.023 2.464"
                  />
                </svg>
                <p className="text-sm text-yellow-700">No se encontraron unidades</p>
              </div>
            </div>
          ) : (
            <>
              {/* Tabla de datos */}
              <div className="p-4">
                <div className="overflow-hidden rounded-lg border bg-gray-50">
                  {/* Header de la tabla */}
                  <div className="border-b bg-gray-100 px-4 py-3">
                    <div className="grid grid-cols-[40px_1fr_80px_60px] gap-3 text-xs font-semibold uppercase tracking-wide text-gray-700">
                      <div>#</div>
                      <div>Unidad</div>
                      <div>Distancia</div>
                      <div>Tipo</div>
                    </div>
                  </div>

                  {/* Filas de datos */}
                  <div className="divide-y divide-gray-200">
                    {unidades.map((unidad, index) => (
                      <div
                        key={unidad.codunidad}
                        className={`cursor-pointer px-4 py-3 transition-colors hover:bg-blue-50 ${
                          unidad.esUnidadBase
                            ? "border-l-4 border-l-red-500 bg-red-50"
                            : index % 2 === 0
                              ? "bg-white"
                              : "bg-gray-50"
                        }`}
                      >
                        <div className="grid grid-cols-[40px_1fr_80px_60px] items-center gap-3 text-sm">
                          <div className="font-medium text-gray-500">{index + 1}</div>
                          <div className={`font-medium ${unidad.esUnidadBase ? "text-red-600" : "text-blue-600"}`}>
                            {unidad.codunidad}
                          </div>
                          <div className="text-gray-700">
                            {unidad.esUnidadBase ? "BASE" : `${unidad.distancia.toFixed(2)} km`}
                          </div>
                          <div className="flex justify-center">
                            {unidad.esUnidadBase ? (
                              <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                                🏠
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                                🚐
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Dirección */}
                        <div className="mt-2 line-clamp-2 text-xs text-gray-500">
                          {unidad.gps.ubicacion?.dircompleta || "Sin dirección disponible"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Información adicional */}
              <div className="border-t bg-gray-50 p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-2 text-sm">
                    <span className="text-gray-700">🎯 Radio de búsqueda:</span>
                    <span className="font-bold text-red-600">{radioBusqueda} km</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total de unidades:</span>
                    <span className="font-semibold text-gray-800">{unidades.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Unidades base:</span>
                    <span className="font-semibold text-red-600">{unidades.filter((u) => u.esUnidadBase).length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Unidades cercanas:</span>
                    <span className="font-semibold text-blue-600">
                      {unidades.filter((u) => !u.esUnidadBase).length}
                    </span>
                  </div>
                  <div className="mt-3 border-t pt-2">
                    <p className="text-xs text-gray-500">
                      💡 El círculo rojo muestra el área de búsqueda desde la unidad base
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      📍 Los popups permanecen siempre visibles para mejor visualización
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

export default function MapComponent() {
  const [mapLoaded, setMapLoaded] = useState(false)
  const [currentLayer, setCurrentLayer] = useState<keyof typeof mapLayers>("openstreetmap")
  const [showLayerSelector, setShowLayerSelector] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [unidades, setUnidades] = useState<Unidad[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [radioBusqueda, setRadioBusqueda] = useState(0.5)
  const [center, setCenter] = useState<[number, number] | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const { username, isReady } = useUsername();

  // Función para obtener datos de la API
const fetchUnidades = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Validar que el username esté disponible
      if (!username) {
        throw new Error('No se pudo obtener el nombre de usuario')
      }

      const { deviceId, distancia } = getUrlParams()
      
      const url = `https://do.velsat.pe:2083/api/Gacela/UnidadesCercanas?km=${distancia}&codunidad=${deviceId.toUpperCase()}&usuario=${encodeURIComponent(username)}`

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data: ApiResponse = await response.json()
      setUnidades(data.unidades || [])
      setRadioBusqueda(data.radioBusqueda)

      // Establecer centro basado en la unidad base
      const unidadBase = data.unidades.find((u) => u.esUnidadBase)
      if (unidadBase) {
        setCenter([unidadBase.gps.posy, unidadBase.gps.posx])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
      console.error("Error al obtener datos:", err)
    } finally {
      setLoading(false)
    }
  }, [username]) // Agregar username como dependencia

  useEffect(() => {
    injectStyles()
    setMapLoaded(true)
    fetchUnidades()
  }, [fetchUnidades])

  const onMapReady = useCallback((map: L.Map) => {
    mapRef.current = map
    console.log("Mapa listo")
  }, [])

  const handleLayerChange = useCallback((layerKey: keyof typeof mapLayers) => {
    setCurrentLayer(layerKey)
    setShowLayerSelector(false)
  }, [])

  const centerMap = useCallback(() => {
    if (mapRef.current && center) {
      mapRef.current.setView(center, 15)
    }
  }, [center])

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(!sidebarOpen)
  }, [sidebarOpen])

  if (!mapLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <div className="mt-4 text-xl text-gray-700">Cargando mapa...</div>
        </div>
      </div>
    )
  }

  const defaultCenter: [number, number] = center || [-12.04134, -77.11155]

  return (
    <div className="relative">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={toggleSidebar}
        unidades={unidades}
        loading={loading}
        error={error}
        radioBusqueda={radioBusqueda}
      />

      {/* Botón para abrir sidebar */}
      {!sidebarOpen && (
        <button
          onClick={toggleSidebar}
          className="fixed left-4 top-4 z-40 transform rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 p-3 text-white shadow-lg transition-all duration-200 hover:scale-105 hover:from-blue-700 hover:to-blue-800"
          title="Mostrar lista de vehículos"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      {/* Mapa */}
      <div className="h-screen w-full">
        <MapContainer
          center={defaultCenter}
          zoom={15}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%" }}
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

          <MapController onMapReady={onMapReady} unidades={unidades} center={center} />

          {/* Círculo de radio de búsqueda */}
          {center && (
            <Circle
              center={[center[0], center[1]]}
              radius={radioBusqueda * 1000} // Convertir km a metros
              pathOptions={{
                color: "#ef4444",
                weight: 2,
                opacity: 0.8,
                fillColor: "#ef4444",
                fillOpacity: 0.1,
                dashArray: "5, 10",
              }}
            />
          )}

          {/* Marcadores */}
          {unidades.map((unidad) => (
            <Marker
              key={unidad.codunidad}
              position={[unidad.gps.posy, unidad.gps.posx]}
              icon={createCustomIcon(unidad.esUnidadBase)}
            >
              <Popup
                className="custom-popup"
                closeButton={false}
                autoClose={false}
                closeOnClick={false}
                closeOnEscapeKey={false}
                offset={[0, -10]}
              >
                <div className="min-w-[220px] max-w-[280px] p-1">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className={`text-[14px] font-bold ${unidad.esUnidadBase ? "text-red-600" : "text-blue-600"}`}>
                      {unidad.codunidad}
                    </h3>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        unidad.esUnidadBase ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {unidad.esUnidadBase ? "🏠 BASE" : "🚐 UNIDAD"}
                    </span>
                  </div>

                  {!unidad.esUnidadBase && (
                    <div className="mb-2 bg-green-50  p-2">
                      <span className="text-sm font-medium text-gray-700">Distancia: </span>
                      <span className="text-sm font-bold text-green-600">{unidad.distancia.toFixed(2)} km</span>
                    </div>
                  )}

                  {unidad.gps.ubicacion?.dircompleta && (
                    <div className="bg-gray-50 p-0">
                      <span className="mb-0 block text-xs font-medium text-gray-600">
                        Ubicación: {unidad.gps.ubicacion.dircompleta}
                      </span>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Controles de zoom y selector de capas */}
      <div className="fixed bottom-4 right-4 z-30 flex flex-col gap-2">
        {/* Selector de capas */}
        <div className="relative">
          <button
            onClick={() => setShowLayerSelector(!showLayerSelector)}
            className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-300 bg-white shadow-lg transition-all hover:scale-105 hover:bg-gray-50"
            title="Cambiar vista del mapa"
          >
            <span className="text-lg">{mapLayers[currentLayer].icon}</span>
          </button>

          {showLayerSelector && (
            <div className="absolute bottom-14 right-0 z-50 w-48 rounded-xl border border-gray-200 bg-white shadow-xl">
              <div className="p-2">
                <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Vista del Mapa
                </div>
                {Object.entries(mapLayers).map(([key, layer]) => (
                  <button
                    key={key}
                    onClick={() => handleLayerChange(key as keyof typeof mapLayers)}
                    className={`flex w-full items-center rounded-lg px-3 py-3 text-sm transition-colors ${
                      currentLayer === key ? "bg-blue-50 font-medium text-blue-700" : "text-gray-700 hover:bg-gray-50"
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
            className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-300 bg-white text-lg font-bold shadow-lg transition-all hover:scale-105 hover:bg-gray-50"
          >
            +
          </button>
          <button
            onClick={() => mapRef.current?.zoomOut()}
            className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-300 bg-white text-lg font-bold shadow-lg transition-all hover:scale-105 hover:bg-gray-50"
          >
            -
          </button>
          <button
            onClick={centerMap}
            className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-300 bg-white text-lg font-bold shadow-lg transition-all hover:scale-105 hover:bg-gray-50"
            title="Centrar mapa"
          >
            🏠
          </button>
          <button
            onClick={fetchUnidades}
            className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-300 bg-white text-lg font-bold shadow-lg transition-all hover:scale-105 hover:bg-gray-50"
            title="Actualizar datos"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Indicador de estado */}
      {loading && (
        <div className="fixed right-4 top-4 z-40 flex items-center rounded-lg bg-white p-3 shadow-lg">
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <span className="text-sm text-gray-600">Actualizando...</span>
        </div>
      )}
    </div>
  )
}
