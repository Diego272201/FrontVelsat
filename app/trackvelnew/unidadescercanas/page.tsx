"use client"
import dynamic from "next/dynamic"

const MapComponent = dynamic(() => import("./map-component"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
        <div className="mt-4 text-xl text-gray-700">Cargando mapa...</div>
      </div>
    </div>
  ),
})

export default function Page() {
  return <MapComponent />
}
