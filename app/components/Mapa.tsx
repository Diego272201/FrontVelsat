import { GoogleMap, Marker, Polyline, useLoadScript } from "@react-google-maps/api";
import { useEffect, useState } from "react";

interface MapaProps {
  recorrido: { lat: number; lng: number }[];
  marcadores: { lat: number; lng: number }[];
  centro?: { lat: number; lng: number } | null; // 🔹 Nuevo prop
}

const Mapa = ({ recorrido, marcadores, centro }: MapaProps) => {

  const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string;

  const [zoom, setZoom] = useState(12); // 🔹 Zoom inicial en 12
  const [isFirstLoad, setIsFirstLoad] = useState(true); 

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: API_KEY,
  });

  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(
    marcadores.length > 0 ? marcadores[0] : { lat: -12.0464, lng: -77.0428 }
  );

  useEffect(() => {
    if (centro) {
      setMapCenter(centro);
      setZoom(15); // 🔹 Siempre pone zoom en 15 al cambiar `centro`
      setIsFirstLoad(false); // 🔹 Ya no es la primera carga
    }
  }, [centro]);

  useEffect(() => {
    if (marcadores.length > 0) {
      setMapCenter(marcadores[0]);
      setZoom(12)
    }
  }, [marcadores]);
  
  const markerIcons = [
    "/house1.png",
    "/house2.png",
    "/house3.png",
    "/house4.png",
    "/house5.png"
  ];

  return (
    <div className="flex items-center justify-center rounded-lg bg-white p-4 shadow-md w-full h-[350px]">
      {isLoaded ? (
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "100%" }}
          center={mapCenter}
          zoom={zoom} 
        >
          {/* Dibuja el recorrido con una línea */}
          {recorrido.length > 1 && (
            <Polyline
              path={recorrido}
              options={{
                strokeColor: "#FF0000",
                strokeOpacity: 0.8,
                strokeWeight: 3,
              }}
            />
          )}

          {/* Agrega los marcadores en los puntos */}
          {marcadores.map((punto, index) => {
            const iconUrl = markerIcons[index % markerIcons.length] || ""; // Evitar undefined
            return (
              <Marker
                key={index}
                position={punto}
                icon={{
                  url: iconUrl,
                  scaledSize: new window.google.maps.Size(40, 60), // Ajusta tamaño
                }}
              />
            );
          })}
        </GoogleMap>
      ) : (
        <p>Cargando mapa...</p>
      )}
    </div>
  );
};

export default Mapa;
