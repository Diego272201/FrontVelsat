import { IDestino } from '@/app/components/inputs/IDestino';
import InputDestino from '@/app/components/inputs/InputDestino';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from '@nextui-org/react';
import { useEffect, useRef, useState } from 'react';
import { TbEdit, TbGpsFilled } from 'react-icons/tb';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import dynamic from 'next/dynamic';
import type { Map as LeafletMap } from 'leaflet';
import axios from 'axios';
import { useUsername } from '@/hooks/useUsername';

// Importar Leaflet dinámicamente para evitar problemas de SSR
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false },
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false },
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false },
);

// Importar useMapEvents de manera estática para evitar problemas de tipos
import { useMapEvents } from 'react-leaflet';

// Interfaz para los resultados de búsqueda
interface SearchResult {
  lat: string;
  lon: string;
  display_name: string;
  place_id: string;
}

// Componente para manejar clics en el mapa
function MapClickHandler({
  onMapClick,
}: {
  onMapClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Hook personalizado para Google Places Autocomplete
const useGooglePlacesAutocomplete = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [autocompleteService, setAutocompleteService] = useState<google.maps.places.AutocompleteService | null>(null);
  const [placesService, setPlacesService] = useState<google.maps.places.PlacesService | null>(null);

  useEffect(() => {
    const checkGoogleMaps = () => {
      if (window.google && window.google.maps && window.google.maps.places) {
        setAutocompleteService(new window.google.maps.places.AutocompleteService());
        setPlacesService(new window.google.maps.places.PlacesService(document.createElement('div')));
        setIsLoaded(true);
      } else {
        // Intentar de nuevo en 100ms si no está cargado
        setTimeout(checkGoogleMaps, 100);
      }
    };

    checkGoogleMaps();
  }, []);

  return { isLoaded, autocompleteService, placesService };
};

export default function App({
  onDestinoSeleccionado,
}: {
  onDestinoSeleccionado: (nombre: string, codigo: string) => void;
}) {
  const { username, isReady } = useUsername();

  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [editable, setEditable] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const identificadorRef = useRef<HTMLInputElement>(null);
  const [codlan, setCodlan] = useState('');
  const [direccion, setDireccion] = useState('');
  const [distrito, setDistrito] = useState('');
  const [latitud, setLatitud] = useState('');
  const [longitud, setLongitud] = useState('');
  const [nomDestino, setNomDestino] = useState('');

  // Estados para búsqueda de direcciones
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  const { reset } = useForm();

  const mapRef = useRef<LeafletMap | null>(null);

  const [markerPosition, setMarkerPosition] = useState<[number, number]>([
    0, 0,
  ]);

  // Hook de Google Places
  const { isLoaded, autocompleteService, placesService } = useGooglePlacesAutocomplete();

  // Configurar iconos de Leaflet cuando se carga el cliente
  useEffect(() => {
    setIsClient(true);

    // Configurar iconos de Leaflet solo en el cliente
    if (typeof window !== 'undefined') {
      import('leaflet').then((L) => {
        // Borrar la configuración por defecto usando Object.assign
        const DefaultIcon = L.Icon.Default;
        const iconPrototype = DefaultIcon.prototype as {
          _getIconUrl?: () => void;
        };
        delete iconPrototype._getIconUrl;

        // Configurar nuevos iconos
        L.Icon.Default.mergeOptions({
          iconRetinaUrl:
            'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl:
            'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl:
            'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });
      });
    }
  }, []);

  // Función de fallback a Nominatim
  const fallbackToNominatim = async (query: string) => {
    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=pe`,
      );
      setSearchResults(response.data);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Error with fallback search:', error);
      setSearchResults([]);
      setShowSearchResults(false);
    }
  };

  // Función principal de búsqueda con Google Places
  const searchAddress = async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    // Usar Google Places Autocomplete si está disponible
    if (isLoaded && autocompleteService && placesService) {
      try {
        const request: google.maps.places.AutocompletionRequest = {
          input: query,
          componentRestrictions: { country: 'pe' },
          types: ['address']
        };

        autocompleteService.getPlacePredictions(request, (predictions, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
            // Obtener detalles de cada predicción
            const processedResults: SearchResult[] = [];
            let processedCount = 0;
            const totalPredictions = Math.min(5, predictions.length);

            if (totalPredictions === 0) {
              fallbackToNominatim(query);
              return;
            }

            predictions.slice(0, 5).forEach((prediction) => {
              const detailsRequest: google.maps.places.PlaceDetailsRequest = {
                placeId: prediction.place_id,
                fields: ['geometry', 'formatted_address', 'address_components']
              };

              placesService.getDetails(detailsRequest, (place, detailsStatus) => {
                if (detailsStatus === google.maps.places.PlacesServiceStatus.OK && place && place.geometry) {
                  processedResults.push({
                    lat: place.geometry.location!.lat().toString(),
                    lon: place.geometry.location!.lng().toString(),
                    display_name: place.formatted_address || prediction.description,
                    place_id: prediction.place_id
                  });
                }
                
                processedCount++;
                if (processedCount === totalPredictions) {
                  if (processedResults.length > 0) {
                    setSearchResults(processedResults);
                    setShowSearchResults(true);
                  } else {
                    fallbackToNominatim(query);
                  }
                }
              });
            });
          } else {
            // Fallback a Nominatim si Google Places falla
            fallbackToNominatim(query);
          }
        });
      } catch (error) {
        console.error('Error with Google Places:', error);
        fallbackToNominatim(query);
      }
    } else {
      // Fallback a Nominatim si Google Places no está disponible
      fallbackToNominatim(query);
    }
  };

  // Función de fallback para geocodificación inversa
  const fallbackReverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      );

      if (response.data && response.data.display_name) {
        const address = response.data.display_name;
        const district =
          response.data.address?.suburb ||
          response.data.address?.city_district ||
          response.data.address?.county ||
          response.data.address?.city ||
          '';

        return { address, district };
      }
      return null;
    } catch (error) {
      console.error('Error in reverse geocoding fallback:', error);
      return null;
    }
  };

  // Función de geocodificación inversa con Google
  const reverseGeocodeGoogle = async (lat: number, lng: number): Promise<{ address: string; district: string } | null> => {
    return new Promise((resolve) => {
      if (isLoaded && window.google && window.google.maps) {
        const geocoder = new google.maps.Geocoder();
        const latlng = new google.maps.LatLng(lat, lng);

        geocoder.geocode({ location: latlng }, (results, status) => {
          if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
            const result = results[0];
            const address = result.formatted_address;
            
            // Extraer distrito
            const districtComponent = result.address_components.find(
              (component) => 
                component.types.includes('sublocality') || 
                component.types.includes('locality') ||
                component.types.includes('administrative_area_level_2')
            );
            
            const district = districtComponent ? districtComponent.long_name : '';
            resolve({ address, district });
          } else {
            // Fallback a Nominatim
            fallbackReverseGeocode(lat, lng).then(resolve);
          }
        });
      } else {
        // Fallback a Nominatim
        fallbackReverseGeocode(lat, lng).then(resolve);
      }
    });
  };

  // Manejar selección de dirección de los resultados de búsqueda
  const handleAddressSelect = async (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    setMarkerPosition([lat, lng]);
    setSearchInput(result.display_name);
    setShowSearchResults(false);

    const addressParts = result.display_name.split(', ');
    const possibleDistrict =
      addressParts.find(
        (part) =>
          part.includes('Lima') ||
          part.includes('Distrito') ||
          addressParts.indexOf(part) === 1 ||
          addressParts.indexOf(part) === 2,
      ) || '';

    setDireccion(result.display_name);
    setDistrito(possibleDistrict);
    setLatitud(lat.toString());
    setLongitud(lng.toString());

    if (mapRef.current) {
      mapRef.current.setView([lat, lng], 15);
    }
  };

  const debounceSearchRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);

    if (debounceSearchRef.current) {
      clearTimeout(debounceSearchRef.current);
    }

    debounceSearchRef.current = setTimeout(() => {
      searchAddress(value);
    }, 300);
  };

  const handleMapClick = async (lat: number, lng: number) => {
    setMarkerPosition([lat, lng]);
    setLatitud(lat.toString());
    setLongitud(lng.toString());

    // Usar Google para geocodificación inversa
    const geocodeResult = await reverseGeocodeGoogle(lat, lng);
    if (geocodeResult) {
      setSearchInput(geocodeResult.address);
      setDireccion(geocodeResult.address);
      setDistrito(geocodeResult.district);
    }
  };

  const handleClose = () => {
    reset((prev) => ({
      ...prev,
      identificador: '',
      nombre: '',
      telefono: '',
      sexo: '',
      empresa: '',
      tarifa: '',
      direccion: '',
      distrito: '',
      latitud: '',
      longitud: '',
    }));
    setMarkerPosition([0, 0]);
  };

  useEffect(() => {
    if (!isOpen) {
      handleClose();
    }
  }, [isOpen]);

  const [destinoSeleccionado, setDestinoSeleccionado] =
    useState<IDestino | null>(null);

  const handleSelectDestino = (destino: IDestino) => {
    setDestinoSeleccionado(destino);
    setCodlan(destino.codlan ?? '');
    setDireccion(destino.lugar.direccion ?? '');
    setDistrito(destino.lugar.distrito ?? '');
    setLatitud(destino.lugar.wy ?? '');
    setLongitud(destino.lugar.wx ?? '');
  };

  const handleSeleccionar = () => {
    if (destinoSeleccionado) {
      onDestinoSeleccionado(
        destinoSeleccionado.apepate || '',
        destinoSeleccionado.codigo,
      );
      onOpenChange();
      toast.success('Destino seleccionado correctamente.');
      resetCampos();
    } else {
      toast.error('Debes seleccionar un destino.');
    }
  };

  const habilitarEdicion = () => {
    // Asegúrate de no perder los datos existentes
    if (destinoSeleccionado && !nomDestino) {
      setNomDestino(destinoSeleccionado.apepate ?? '');
    }
    setEditable(true);
    setTimeout(() => {
      identificadorRef.current?.focus();
    }, 0);
  };

  const activarCampos = () => {
    setEditable(true);
    setTimeout(() => {
      identificadorRef.current?.focus();
    }, 0);
  };

  const handleGuardarDestino = async () => {
    if (!isReady) {
    return;
  }
    if (!editable) {
      toast.error(
        'Primero debes hacer clic en "Nuevo" para habilitar los campos.',
      );
      return;
    }
    if (
      !codlan ||
      !nomDestino ||
      !direccion ||
      !distrito ||
      !latitud ||
      !longitud
    ) {
      toast.error('Todos los campos son obligatorios.');
      return;
    }

    try {
      const response = await fetch(
        `https://velsat.pe:2096/api/Pasajero/NewDestino/${username}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            codlan,
            apellidos: nomDestino,
            direccion,
            distrito,
            wy: latitud,
            wx: longitud,
          }),
        },
      );

      if (!response.ok) {
        throw new Error('Error al guardar el destino.');
      }

      toast.success('Destino guardado correctamente.');
      onOpenChange();
      setEditable(false);
      resetCampos();
    } catch (error) {
      toast.error('Hubo un problema al guardar el destino.');
      console.error(error);
    }
  };

  const resetCampos = () => {
    setCodlan('');
    setDireccion('');
    setDistrito('');
    setLatitud('');
    setLongitud('');
    setNomDestino('');
    setDestinoSeleccionado(null);
    setSearchInput('');
    setSearchResults([]);
    setShowSearchResults(false);
  };

  useEffect(() => {
    const lat = parseFloat(latitud);
    const lng = parseFloat(longitud);
    if (!isNaN(lat) && !isNaN(lng)) {
      const newPos: [number, number] = [lat, lng];
      setMarkerPosition(newPos);

      if (mapRef.current) {
        mapRef.current.setView(newPos, 18);
      }
    }
  }, [latitud, longitud]);

  return (
    <>
      <button
        onClick={onOpen}
        className="ml-2 mt-[1px] rounded bg-blue-600 px-1 py-1 text-[12px] text-white hover:bg-blue-500"
      >
        <TbEdit size={18}/>
      </button>

      <Modal
        className="scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100 z-[1000] h-[85vh] w-[70%] max-w-none overflow-auto"
        isOpen={isOpen}
        onOpenChange={(open) => {
          onOpenChange();
          if (!open) setEditable(false);
          resetCampos();
        }}
        isDismissable={false}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                <h2 className="flex items-center gap-2 text-[14px] font-bold text-gray-800">
                  <TbGpsFilled size={20} />
                  MODIFICAR DESTINO
                </h2>
              </ModalHeader>
              <ModalBody>
                <div className="mt-[-15px]">
                  <label className="block text-[12px] font-medium">
                    Identificador:
                  </label>
                  <input
                    ref={identificadorRef}
                    disabled={!editable}
                    required
                    className="w-full rounded-md border border-gray-300 bg-gray-50 p-1.5 text-[12px]"
                    placeholder="Ejemplo: Colegio ABC"
                    value={codlan}
                    onChange={(e) => setCodlan(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium">
                    Nombre Punto:
                  </label>
                  <div className="flex gap-2">
                    <div className="w-full">
                      {editable ? (
                        <input
                          className="w-full rounded-md border border-gray-300 bg-white p-1.5 text-[12px]"
                          placeholder="Escribe el nuevo destino"
                          value={nomDestino}
                          onChange={(e) => setNomDestino(e.target.value)}
                          required
                        />
                      ) : (
                        <InputDestino onSelectDestino={handleSelectDestino} />
                      )}
                    </div>

                    <button
                      onClick={handleSeleccionar}
                      className="rounded bg-blue-500 px-3 py-1 text-[12px] text-white hover:bg-blue-400"
                    >
                      Seleccionar
                    </button>

                    <button
                      onClick={habilitarEdicion}
                      className="rounded bg-amber-500 px-3 py-1 text-[12px] text-white hover:bg-amber-400"
                    >
                      Editar
                    </button>

                    <button
                      onClick={activarCampos}
                      className="rounded bg-green-700 px-3 py-1 text-[12px] text-white hover:bg-green-600"
                    >
                      Nuevo
                    </button>
                  </div>
                </div>

                <div className="flex justify-between gap-2">
                  <div className="w-full">
                    <label className="block text-[12px] font-medium">
                      Dirección:
                    </label>
                    <input
                      disabled={!editable}
                      required
                      className="w-full rounded-md border border-gray-300 bg-gray-50 p-1.5 text-[12px]"
                      value={direccion}
                      onChange={(e) => setDireccion(e.target.value)}
                    />
                  </div>
                  <div className="w-full">
                    <label className="block text-[12px] font-medium">
                      Distrito:
                    </label>
                    <input
                      disabled={!editable}
                      required
                      className="w-full rounded-md border border-gray-300 bg-gray-50 p-1.5 text-[12px]"
                      value={distrito}
                      onChange={(e) => setDistrito(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-between gap-2">
                  <div className="w-full">
                    <label className="block text-[12px] font-medium">
                      Latitud:
                    </label>
                    <input
                      disabled={!editable}
                      required
                      className="w-full rounded-md border border-gray-300 bg-gray-50 p-1.5 text-[12px]"
                      value={latitud}
                      onChange={(e) => setLatitud(e.target.value)}
                    />
                  </div>

                  <div className="w-full">
                    <label className="block text-[12px] font-medium">
                      Longitud:
                    </label>
                    <input
                      disabled={!editable}
                      required
                      className="w-full rounded-md border border-gray-300 bg-gray-50 p-1.5 text-[12px]"
                      value={longitud}
                      onChange={(e) => setLongitud(e.target.value)}
                    />
                  </div>
                </div>

                {/* Sección de búsqueda de direcciones con z-index corregido */}
                <div className="relative w-full" style={{ zIndex: 1050 }}>
                  <label className="mb-1 block text-[12px] font-medium text-gray-900">
                    Buscar dirección
                  </label>
                  <input
                    disabled={!editable}
                    type="text"
                    placeholder="Escribe una dirección..."
                    className="relative z-10 w-full rounded-md border border-gray-300 bg-gray-50 p-1.5 text-[12px]"
                    value={searchInput}
                    onChange={handleSearchInputChange}
                    onFocus={() =>
                      searchResults.length > 0 && setShowSearchResults(true)
                    }
                    onBlur={() => {
                      // Delay para permitir clic en resultados
                      setTimeout(() => setShowSearchResults(false), 200);
                    }}
                  />

                  {/* Resultados de búsqueda con z-index alto */}
                  {showSearchResults && searchResults.length > 0 && (
                    <div
                      className="absolute left-0 right-0 top-full max-h-60 overflow-y-auto rounded-lg border border-gray-300 bg-white shadow-lg"
                      style={{ zIndex: 1060 }}
                    >
                      {searchResults.map((result, index) => (
                        <div
                          key={index}
                          className="cursor-pointer border-b border-gray-100 p-3 last:border-b-0 hover:bg-gray-100"
                          onClick={() => handleAddressSelect(result)}
                          onMouseDown={(e) => e.preventDefault()} // Prevenir blur antes del clic
                        >
                          <div className="text-[12px] font-medium text-gray-900">
                            {result.display_name}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Contenedor del mapa con z-index más bajo */}
                <div
                  className="mt-4 w-full rounded border"
                  style={{ zIndex: 1 }}
                >
                  {isClient && (
                    <div className="h-[400px] w-full">
                      <MapContainer
                        center={
                          markerPosition[0] !== 0 && markerPosition[1] !== 0
                            ? markerPosition
                            : [-12.0464, -77.0428]
                        }
                        zoom={
                          markerPosition[0] !== 0 && markerPosition[1] !== 0
                            ? 18
                            : 5
                        }
                        style={{ height: '100%', width: '100%' }}
                        ref={mapRef}
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        <MapClickHandler onMapClick={handleMapClick} />

                        {markerPosition[0] !== 0 && markerPosition[1] !== 0 && (
                          <Marker position={markerPosition} />
                        )}
                      </MapContainer>
                    </div>
                  )}
                </div>
              </ModalBody>

              <ModalFooter>
                <button
                  className="rounded bg-red-600 px-4 py-2 text-[14px] text-white hover:bg-red-500"
                  onClick={onClose}
                >
                  Cerrar
                </button>

                <button
                  className={`rounded px-4 py-2 text-[14px] text-white ${!editable ? 'bg-gray-500 hover:bg-gray-400' : 'bg-blue-500 hover:bg-blue-400'}`}
                  onClick={handleGuardarDestino}
                >
                  Guardar Destino
                </button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Estilos para importar Leaflet CSS */}
      <style jsx global>{`
        @import url('https://unpkg.com/leaflet@1.7.1/dist/leaflet.css');
      `}</style>
    </>
  );
}