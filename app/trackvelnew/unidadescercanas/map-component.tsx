"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { MapContainer, TileLayer, useMap, Marker, Popup, Circle } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { useUsername } from "@/hooks/useUsername"
import {
  Layers,
  Globe,
  Satellite,
  Home,
  Truck,
  Target,
  Info,
  MapPin,
  Plus,
  Minus,
  RotateCw,
  X,
  Menu,
  AlertCircle,
  Search,
  Copy,
  Check,
  Navigation,
} from "lucide-react"

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
    border-radius: 8px !important;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15) !important;
    padding: 0 !important;
    overflow: hidden !important;
  }
  .custom-popup .leaflet-popup-content {
    padding: 0 !important;
    margin: 0 !important;
  }
  .custom-popup .leaflet-popup-tip {
    background-color: #fff !important;
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
    Icon: Layers,
  },
  hybrid: {
    name: "Híbrido",
    url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
    attribution: '&copy; <a href="https://www.google.com/maps">Google</a>',
    Icon: Globe,
  },
  satellite_google: {
    name: "Satelital",
    url: "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
    attribution: '&copy; <a href="https://www.google.com/maps">Google</a>',
    Icon: Satellite,
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

// Icono personalizado usando /UnidadK.webp directamente sin fondo ni circulo
const createCustomIcon = (isBase: boolean, codunidad: string) => {
  const iconHtml = isBase
    ? `<div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
        <div style="
          background: #ef4444;
          color: white;
          padding: 1.5px 6px;
          border-radius: 8px;
          font-size: 9.5px;
          font-weight: 700;
          box-shadow: 0 2px 4px rgba(0,0,0,0.25);
          white-space: nowrap;
          margin-bottom: 2px;
          border: 1px solid white;
          display: flex;
          align-items: center;
          gap: 2.5px;
        ">
          <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          <span>${codunidad}</span>
        </div>
        <img src="/UnidadK.webp" style="width: 36px; height: 36px; object-fit: contain; filter: drop-shadow(0px 3px 4px rgba(0,0,0,0.3));" alt="${codunidad}" />
      </div>`
    : `<div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
        <div style="
          background: #113EB9;
          color: white;
          padding: 1.5px 6px;
          border-radius: 8px;
          font-size: 9.5px;
          font-weight: 700;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          white-space: nowrap;
          margin-bottom: 2px;
          border: 1px solid white;
        ">
          ${codunidad}
        </div>
        <img src="/UnidadK.webp" style="width: 32px; height: 32px; object-fit: contain; filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.25));" alt="${codunidad}" />
      </div>`

  return L.divIcon({
    html: iconHtml,
    className: "custom-marker",
    iconSize: [60, 46],
    iconAnchor: [30, 44],
    popupAnchor: [0, -44],
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
}: {
  onMapReady: (map: L.Map) => void
  unidades: Unidad[]
}) => {
  const map = useMap()

  useEffect(() => {
    if (map) {
      onMapReady(map)
    }
  }, [map, onMapReady])

  useEffect(() => {
    if (map && unidades.length > 0) {
      const bounds = L.latLngBounds(unidades.map((unidad) => [unidad.gps.posy, unidad.gps.posx]))
      map.fitBounds(bounds, { padding: [35, 35] })
    }
  }, [map, unidades])

  return null
}

// Componente Sidebar Compacto y Elegante
const Sidebar = ({
  isOpen,
  onToggle,
  unidades,
  loading,
  error,
  radioBusqueda,
  selectedCodunidad,
  onSelectUnidad,
}: {
  isOpen: boolean
  onToggle: () => void
  unidades: Unidad[]
  loading: boolean
  error: string | null
  radioBusqueda: number
  selectedCodunidad: string | null
  onSelectUnidad: (unidad: Unidad) => void
}) => {
  const [filterQuery, setFilterQuery] = useState("")
  const [activeTab, setActiveTab] = useState<"todas" | "base" | "cercanas">("todas")

  const filteredUnidades = useMemo(() => {
    return unidades.filter((unidad) => {
      const matchesQuery =
        unidad.codunidad.toLowerCase().includes(filterQuery.toLowerCase()) ||
        (unidad.gps.ubicacion?.dircompleta || "").toLowerCase().includes(filterQuery.toLowerCase())

      if (!matchesQuery) return false

      if (activeTab === "base") return unidad.esUnidadBase
      if (activeTab === "cercanas") return !unidad.esUnidadBase
      return true
    })
  }, [unidades, filterQuery, activeTab])

  const baseCount = useMemo(() => unidades.filter((u) => u.esUnidadBase).length, [unidades])
  const cercanasCount = useMemo(() => unidades.filter((u) => !u.esUnidadBase).length, [unidades])

  return (
    <>
      {/* Overlay para móviles */}
      {isOpen && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={onToggle} />}

      {/* Sidebar */}
      <div
        className={`
        fixed left-0 top-0 z-50 h-full transform bg-white shadow-xl transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        w-72 lg:w-[280px] flex flex-col border-r border-gray-200
      `}
      >
        {/* Header del Sidebar */}
        <div className="flex shrink-0 items-center justify-between bg-[#113EB9] px-3 py-2 text-white shadow-sm">
          <div className="flex items-center gap-1.5">
            <Navigation className="h-4 w-4 text-blue-200" />
            <div>
              <h2 className="text-[12px] font-bold uppercase tracking-wide">Unidades Cercanas</h2>
              <p className="text-[10px] text-blue-100">Radio de búsqueda: {radioBusqueda} km</p>
            </div>
          </div>
          <button onClick={onToggle} className="rounded p-1 text-white hover:bg-blue-800 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Buscador interno y Pestañas */}
        <div className="shrink-0 border-b border-gray-100 bg-slate-50 p-2 space-y-1.5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por código o dirección..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="h-7 w-full rounded border border-gray-200 bg-white pl-8 pr-2.5 text-[11px] text-gray-700 placeholder-gray-400 focus:border-[#113EB9] focus:outline-none"
            />
            {filterQuery && (
              <button
                onClick={() => setFilterQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="flex rounded-md bg-gray-200/60 p-0.5 text-[10px] font-medium text-gray-600">
            <button
              onClick={() => setActiveTab("todas")}
              className={`flex-1 rounded py-0.5 text-center transition-colors ${
                activeTab === "todas" ? "bg-white text-[#113EB9] font-bold shadow-xs" : "hover:text-gray-900"
              }`}
            >
              Todas ({unidades.length})
            </button>
            <button
              onClick={() => setActiveTab("base")}
              className={`flex-1 rounded py-0.5 text-center transition-colors ${
                activeTab === "base" ? "bg-white text-red-600 font-bold shadow-xs" : "hover:text-gray-900"
              }`}
            >
              Base ({baseCount})
            </button>
            <button
              onClick={() => setActiveTab("cercanas")}
              className={`flex-1 rounded py-0.5 text-center transition-colors ${
                activeTab === "cercanas" ? "bg-white text-[#113EB9] font-bold shadow-xs" : "hover:text-gray-900"
              }`}
            >
              Cercanas ({cercanasCount})
            </button>
          </div>
        </div>

        {/* Lista de Unidades */}
        <div className="flex-1 overflow-y-auto p-1.5 space-y-1.5">
          {loading ? (
            <div className="flex items-center justify-center p-6 text-xs text-gray-500">
              <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-[#113EB9] mr-2"></div>
              <span>Cargando unidades...</span>
            </div>
          ) : error ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-2.5">
              <div className="flex items-center gap-1.5 text-red-700 text-xs font-medium">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                <span>Error al obtener datos</span>
              </div>
              <p className="mt-1 text-[11px] text-red-600">{error}</p>
            </div>
          ) : filteredUnidades.length === 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-center text-xs text-amber-700">
              No se encontraron resultados
            </div>
          ) : (
            <div className="space-y-1">
              {filteredUnidades.map((unidad, index) => {
                const isSelected = selectedCodunidad === unidad.codunidad
                return (
                  <div
                    key={unidad.codunidad}
                    onClick={() => onSelectUnidad(unidad)}
                    className={`group cursor-pointer rounded border p-2 transition-all ${
                      isSelected
                        ? "border-[#113EB9] bg-blue-50/70 shadow-xs ring-1 ring-[#113EB9]"
                        : unidad.esUnidadBase
                          ? "border-red-200 bg-red-50/40 hover:bg-red-50"
                          : "border-gray-100 bg-white hover:border-blue-200 hover:bg-blue-50/30"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <img
                          src="/UnidadK.webp"
                          alt="Car"
                          className="h-4 w-4 shrink-0 object-contain"
                        />
                        <span className={`font-bold ${unidad.esUnidadBase ? "text-red-600" : "text-[#113EB9]"}`}>
                          {unidad.codunidad}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {!unidad.esUnidadBase && (
                          <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-bold text-emerald-700 text-[10px] border border-emerald-100">
                            {unidad.distancia.toFixed(2)} km
                          </span>
                        )}
                        <span
                          className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold ${
                            unidad.esUnidadBase ? "bg-red-100 text-red-700" : "bg-blue-100 text-[#113EB9]"
                          }`}
                        >
                          {unidad.esUnidadBase ? (
                            <>
                              <Home className="h-2.5 w-2.5" /> BASE
                            </>
                          ) : (
                            <>
                              <Truck className="h-2.5 w-2.5" /> UNIDAD
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="mt-1 flex items-start gap-1 text-[10px] text-gray-500 leading-tight">
                      <MapPin className="h-3 w-3 shrink-0 text-gray-400 mt-0.5" />
                      <span className="line-clamp-2">
                        {unidad.gps.ubicacion?.dircompleta || "Sin ubicación registrada"}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Resumen al pie */}
        <div className="shrink-0 border-t border-gray-200 bg-gray-50 p-2 text-[10px] space-y-1">
          <div className="flex justify-between text-gray-600">
            <span>Resultados: <strong>{filteredUnidades.length}</strong></span>
            <span>Total en radio: <strong>{unidades.length}</strong></span>
          </div>
          <p className="flex items-center gap-1 text-gray-400 text-[9.5px]">
            <Info className="h-3 w-3 text-blue-500 shrink-0" />
            Haz clic en cualquier unidad para ubicarla en el mapa.
          </p>
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
  const [selectedCodunidad, setSelectedCodunidad] = useState<string | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const mapRef = useRef<L.Map | null>(null)
  const markerRefs = useRef<{ [codunidad: string]: L.Marker | null }>({})
  const { username } = useUsername()

  const fetchUnidades = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      if (!username) {
        throw new Error("No se pudo obtener el nombre de usuario")
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
  }, [username])

  useEffect(() => {
    injectStyles()
    setMapLoaded(true)
    fetchUnidades()
  }, [fetchUnidades])

  const onMapReady = useCallback((map: L.Map) => {
    mapRef.current = map
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

  const handleSelectUnidad = useCallback((unidad: Unidad) => {
    setSelectedCodunidad(unidad.codunidad)
    if (mapRef.current) {
      mapRef.current.setView([unidad.gps.posy, unidad.gps.posx], 16)
      const marker = markerRefs.current[unidad.codunidad]
      if (marker) {
        marker.openPopup()
      }
    }
  }, [])

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedCode(text)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  if (!mapLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-[#113EB9]"></div>
          <div className="mt-2 text-xs font-medium text-gray-600">Cargando mapa...</div>
        </div>
      </div>
    )
  }

  const defaultCenter: [number, number] = center || [-12.04134, -77.11155]
  const LayerIcon = mapLayers[currentLayer].Icon
  const unidadBase = unidades.find((u) => u.esUnidadBase)

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
        selectedCodunidad={selectedCodunidad}
        onSelectUnidad={handleSelectUnidad}
      />

      {/* Botón para abrir sidebar cuando está cerrado */}
      {!sidebarOpen && (
        <button
          onClick={toggleSidebar}
          className="fixed left-3 top-3 z-40 flex items-center gap-1.5 rounded-md bg-[#113EB9] px-2.5 py-1.5 text-white shadow-md transition-all hover:bg-blue-800 text-xs font-semibold"
          title="Mostrar lista de vehículos"
        >
          <Menu className="h-4 w-4" />
          <span>Unidades ({unidades.length})</span>
        </button>
      )}

      {/* Barra resumen flotante superior en el mapa */}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-30 hidden md:flex items-center gap-3 rounded-full border border-gray-200/80 bg-white/90 px-3.5 py-1.5 shadow-md backdrop-blur-md text-xs font-medium text-gray-700">
        {unidadBase && (
          <div className="flex items-center gap-1.5">
            <span className="flex h-2 w-2 rounded-full bg-red-500 animate-ping"></span>
            <span className="text-gray-500">Base:</span>
            <strong className="text-red-600 font-bold">{unidadBase.codunidad}</strong>
          </div>
        )}
        <div className="h-3.5 w-px bg-gray-200"></div>
        <div className="flex items-center gap-1">
          <Target className="h-3.5 w-3.5 text-red-500" />
          <span className="text-gray-500">Radio:</span>
          <strong className="text-gray-800">{radioBusqueda} km</strong>
        </div>
        <div className="h-3.5 w-px bg-gray-200"></div>
        <div className="flex items-center gap-1">
          <Truck className="h-3.5 w-3.5 text-[#113EB9]" />
          <span className="text-gray-500">Unidades:</span>
          <strong className="text-[#113EB9]">{unidades.length}</strong>
        </div>
      </div>

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

          <MapController onMapReady={onMapReady} unidades={unidades} />

          {/* Círculo del radio de búsqueda */}
          {center && (
            <Circle
              center={[center[0], center[1]]}
              radius={radioBusqueda * 1000}
              pathOptions={{
                color: "#ef4444",
                weight: 1.5,
                opacity: 0.8,
                fillColor: "#ef4444",
                fillOpacity: 0.07,
                dashArray: "4, 6",
              }}
            />
          )}

          {/* Marcadores con /UnidadK.webp */}
          {unidades.map((unidad) => (
            <Marker
              key={unidad.codunidad}
              ref={(el) => {
                markerRefs.current[unidad.codunidad] = el
              }}
              position={[unidad.gps.posy, unidad.gps.posx]}
              icon={createCustomIcon(unidad.esUnidadBase, unidad.codunidad)}
              eventHandlers={{
                click: () => setSelectedCodunidad(unidad.codunidad),
              }}
            >
              <Popup className="custom-popup" offset={[0, -10]}>
                <div className="w-[210px] overflow-hidden rounded-lg bg-white text-xs shadow-lg">
                  {/* Encabezado del Popup */}
                  <div
                    className={`flex items-center justify-between px-3 py-2 text-white ${
                      unidad.esUnidadBase ? "bg-red-600" : "bg-[#113EB9]"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <img src="/UnidadK.webp" alt="Car" className="h-4 w-4 object-contain filter brightness-0 invert" />
                      <span className="font-bold text-[13px] tracking-wide">{unidad.codunidad}</span>
                    </div>
                    <span className="rounded bg-white/20 px-1.5 py-0.5 text-[9px] font-extrabold uppercase">
                      {unidad.esUnidadBase ? "BASE" : "UNIDAD"}
                    </span>
                  </div>

                  {/* Cuerpo del Popup */}
                  <div className="p-2.5 space-y-2">
                    {!unidad.esUnidadBase && (
                      <div className="flex items-center justify-between rounded bg-emerald-50 border border-emerald-100 px-2 py-1">
                        <span className="text-[11px] text-emerald-800">Distancia a base:</span>
                        <span className="font-bold text-emerald-700 text-xs">{unidad.distancia.toFixed(2)} km</span>
                      </div>
                    )}

                    {unidad.gps.ubicacion?.dircompleta && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-gray-500 font-semibold">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-gray-400" /> Dirección:
                          </span>
                          <button
                            onClick={() => handleCopyText(unidad.gps.ubicacion.dircompleta)}
                            className="flex items-center gap-0.5 text-blue-600 hover:text-blue-800"
                            title="Copiar dirección"
                          >
                            {copiedCode === unidad.gps.ubicacion.dircompleta ? (
                              <>
                                <Check className="h-3 w-3 text-green-600" />
                                <span className="text-[9px] text-green-600">Copiado</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                <span className="text-[9px]">Copiar</span>
                              </>
                            )}
                          </button>
                        </div>
                        <p className="rounded bg-gray-50 p-1.5 text-[10.5px] leading-tight text-gray-700 border border-gray-100">
                          {unidad.gps.ubicacion.dircompleta}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Controles flotantes de navegación del mapa en esquina inferior derecha */}
      <div className="fixed bottom-3 right-3 z-30 flex flex-col gap-1.5">
        {/* Selector de capas */}
        <div className="relative">
          <button
            onClick={() => setShowLayerSelector(!showLayerSelector)}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 shadow-md transition-all hover:bg-gray-50 active:scale-95"
            title="Cambiar vista del mapa"
          >
            <LayerIcon className="h-4 w-4" />
          </button>

          {showLayerSelector && (
            <div className="absolute bottom-10 right-0 z-50 w-36 rounded-md border border-gray-200 bg-white p-1 shadow-xl">
              <div className="px-2 py-1 text-[9.5px] font-bold uppercase tracking-wider text-gray-400">
                Capas de mapa
              </div>
              {Object.entries(mapLayers).map(([key, layer]) => {
                const ItemIcon = layer.Icon
                return (
                  <button
                    key={key}
                    onClick={() => handleLayerChange(key as keyof typeof mapLayers)}
                    className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors ${
                      currentLayer === key ? "bg-blue-50 font-bold text-[#113EB9]" : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <ItemIcon className="h-3.5 w-3.5" />
                    {layer.name}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Controles de Zoom, Centrar y Refrescar */}
        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => mapRef.current?.zoomIn()}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 shadow-md hover:bg-gray-50 active:scale-95"
            title="Acercar"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            onClick={() => mapRef.current?.zoomOut()}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 shadow-md hover:bg-gray-50 active:scale-95"
            title="Alejar"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            onClick={centerMap}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 shadow-md hover:bg-gray-50 active:scale-95"
            title="Centrar en Base"
          >
            <Home className="h-4 w-4 text-red-600" />
          </button>
          <button
            onClick={fetchUnidades}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 shadow-md hover:bg-gray-50 active:scale-95"
            title="Actualizar datos"
          >
            <RotateCw className="h-4 w-4 text-[#113EB9]" />
          </button>
        </div>
      </div>

      {/* Indicador de carga flotante */}
      {loading && (
        <div className="fixed right-3 top-3 z-40 flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 shadow-md text-xs text-gray-600">
          <div className="h-3.5 w-3.5 animate-spin rounded-full border-b-2 border-[#113EB9]"></div>
          <span>Actualizando datos...</span>
        </div>
      )}
    </div>
  )
}
