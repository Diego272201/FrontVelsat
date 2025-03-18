import { GoogleMap, Marker, Polyline, useLoadScript } from "@react-google-maps/api";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string;

interface MapaProps {
  recorrido: { lat: number; lng: number }[]; // Lista de coordenadas para el recorrido
  marcadores: { lat: number; lng: number }[]; // Lista de coordenadas para los marcadores
}

const Mapa = ({ recorrido, marcadores }: MapaProps) => {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: API_KEY,
  });

  // Centro del mapa (puede ser el primer punto del recorrido o un valor fijo)
  const center = recorrido.length > 0 ? recorrido[1] : { lat: -12.0464, lng: -77.0428 };

  return (
    <div className="flex items-center justify-center rounded-lg bg-white p-4 shadow-md w-full h-[50vh]">
      {isLoaded ? (
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "100%" }}
          center={center}
          zoom={14}
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
          {marcadores.map((punto, index) => (
            <Marker key={index} position={punto} />
          ))}
        </GoogleMap>
      ) : (
        <p>Cargando mapa...</p>
      )}
    </div>
  );
};

export default Mapa;
