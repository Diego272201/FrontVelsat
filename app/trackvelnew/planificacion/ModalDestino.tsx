import { IDestino } from '@/app/components/inputs/IDestino';
import InputDestino from '@/app/components/inputs/InputDestino';
import { Modal, ModalContent, ModalBody } from '@nextui-org/react';
import { MapPin, X, Plus, Save } from 'lucide-react';
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

// Importar useMapEvents y useMap de manera estática
import { useMapEvents, useMap } from 'react-leaflet';

function MapResizer({ isFullscreen }: { isFullscreen: boolean }) {
  const map = useMap();

  useEffect(() => {
    const invalidate = () => {
      map.invalidateSize();
    };

    invalidate();
    const timer1 = setTimeout(invalidate, 100);
    const timer2 = setTimeout(invalidate, 300);
    const timer3 = setTimeout(invalidate, 600);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [isFullscreen, map]);

  return null;
}

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

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const checkGoogleMaps = () => {
      if (
        typeof window !== 'undefined' &&
        window.google &&
        window.google.maps
      ) {
        setIsLoaded(true);
      } else {
        // Intentar de nuevo en 100ms si no está cargado
        timer = setTimeout(checkGoogleMaps, 100);
      }
    };

    checkGoogleMaps();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  return { isLoaded };
};

type ModalDestinoProps = {
  onDestinoSeleccionado: (nombre: string, codigo: string) => void;
  trigger?: React.ReactNode;
};

// Este modal se renderiza una vez por grupo. Mantener montado su contenido
// (Leaflet, ~14 estados y el polling de Google Maps) multiplicaba ese coste
// por la cantidad de grupos en pantalla, así que solo montamos el disparador.
export default function App(props: ModalDestinoProps) {
  const [montado, setMontado] = useState(false);

  return (
    <>
      {props.trigger ? (
        <div onClick={() => setMontado(true)} className="inline-block cursor-pointer">
          {props.trigger}
        </div>
      ) : (
        <button
          onClick={() => setMontado(true)}
          className="ml-2 mt-[1px] rounded bg-blue-600 px-1 py-1 text-[12px] text-white hover:bg-blue-500"
        >
          <TbEdit size={18} />
        </button>
      )}

      {montado && (
        <AppContenido {...props} onDesmontar={() => setMontado(false)} />
      )}
    </>
  );
}

function AppContenido({
  onDestinoSeleccionado,
  onDesmontar,
}: ModalDestinoProps & { onDesmontar: () => void }) {
  const { username, isReady } = useUsername();

  // Se monta ya abierto; al cerrarse se desmonta por completo.
  const [isOpen, setIsOpen] = useState(true);
  const onOpenChange = () => {
    setIsOpen(false);
    onDesmontar();
  };
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

  const mapRef = useRef<any>(null);

  const [markerPosition, setMarkerPosition] = useState<[number, number]>([
    0, 0,
  ]);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsMapFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () =>
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    const mapContainer = document.getElementById('destino-leaflet-map-container');
    if (!mapContainer) return;

    try {
      if (!document.fullscreenElement) {
        await mapContainer.requestFullscreen();
        setIsMapFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsMapFullscreen(false);
      }

      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, 100);
    } catch (error) {
      console.error('Error al cambiar modo fullscreen:', error);
    }
  };

  // Hook de Google Places
  const { isLoaded } = useGooglePlacesAutocomplete();

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

  // Función principal de búsqueda con Google Places / Geocoder
  const searchAddress = async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    if (isLoaded && typeof window !== 'undefined' && window.google?.maps) {
      try {
        const maps = window.google.maps;

        // 1. Intentar con la nueva API AutocompleteSuggestion y Place si están disponibles
        if (
          (maps.places as any)?.AutocompleteSuggestion &&
          (maps.places as any)?.Place
        ) {
          const response = await (
            maps.places as any
          ).AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: query,
            componentRestrictions: { country: 'pe' },
          });

          const suggestions = response.suggestions || [];
          const processedResults: SearchResult[] = [];

          for (const suggestion of suggestions.slice(0, 5)) {
            if (suggestion.placePrediction) {
              try {
                const place = suggestion.placePrediction.toPlace();
                await place.fetchFields({
                  fields: ['location', 'formattedAddress'],
                });
                if (place.location) {
                  processedResults.push({
                    lat: place.location.lat().toString(),
                    lon: place.location.lng().toString(),
                    display_name:
                      place.formattedAddress ||
                      suggestion.placePrediction.text?.text ||
                      '',
                    place_id: suggestion.placePrediction.placeId || '',
                  });
                }
              } catch (e) {
                // omitir si falla
              }
            }
          }

          if (processedResults.length > 0) {
            setSearchResults(processedResults);
            setShowSearchResults(true);
            return;
          }
        }

        // 2. Usar Geocoder estándar (no deprecado)
        if (maps.Geocoder) {
          const geocoder = new maps.Geocoder();
          geocoder.geocode(
            { address: query, componentRestrictions: { country: 'pe' } },
            (results, status) => {
              if (
                status === maps.GeocoderStatus.OK &&
                results &&
                results.length > 0
              ) {
                const processedResults: SearchResult[] = results
                  .slice(0, 5)
                  .map((res) => ({
                    lat: res.geometry.location.lat().toString(),
                    lon: res.geometry.location.lng().toString(),
                    display_name: res.formatted_address,
                    place_id: res.place_id || '',
                  }));
                setSearchResults(processedResults);
                setShowSearchResults(true);
              } else {
                fallbackToNominatim(query);
              }
            },
          );
          return;
        }
      } catch (error) {
        console.error('Error in Google search:', error);
        fallbackToNominatim(query);
        return;
      }
    }

    fallbackToNominatim(query);
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
  const reverseGeocodeGoogle = async (
    lat: number,
    lng: number,
  ): Promise<{ address: string; district: string } | null> => {
    return new Promise((resolve) => {
      if (isLoaded && window.google && window.google.maps) {
        const geocoder = new google.maps.Geocoder();
        const latlng = new google.maps.LatLng(lat, lng);

        geocoder.geocode({ location: latlng }, (results, status) => {
          if (
            status === google.maps.GeocoderStatus.OK &&
            results &&
            results[0]
          ) {
            const result = results[0];
            const address = result.formatted_address;

            // Extraer distrito
            const districtComponent = result.address_components.find(
              (component) =>
                component.types.includes('sublocality') ||
                component.types.includes('locality') ||
                component.types.includes('administrative_area_level_2'),
            );

            const district = districtComponent
              ? districtComponent.long_name
              : '';
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
        `https://do.velsat.pe:2083/api/Pasajero/NewDestino/${username}`,
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

  const handleCerrar = () => {
    setEditable(false);
    resetCampos();
    onOpenChange();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onOpenChange={(open) => {
          if (!open) handleCerrar();
        }}
        size="4xl"
        radius="lg"
        isDismissable={false}
        isKeyboardDismissDisabled={true}
        hideCloseButton={true}
        classNames={{
          base: 'bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200/80 max-w-4xl w-full',
          body: 'p-4 overflow-visible',
        }}
      >
        <ModalContent>
          {() => (
            <ModalBody className="p-4">
              {/* Header */}
              <div className="-mx-4 -mt-4 px-4 py-2.5 bg-[#f0f4fc] border-b border-blue-100/70 flex items-center justify-between rounded-t-xl mb-1">
                <h2 className="text-[15px] font-bold text-slate-900 leading-tight">
                  Modificar destino
                </h2>
                <button
                  type="button"
                  onClick={handleCerrar}
                  className="h-7 w-7 rounded-md border border-slate-200/80 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* 01 · PUNTO */}
              <div className="flex items-center gap-2 pt-2 pb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 shrink-0">
                  01 · PUNTO
                </span>
                <div className="h-[1px] flex-1 bg-slate-200" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end">
                <div className="md:col-span-5">
                  <label className="block text-[10.5px] font-semibold text-slate-700 mb-0.5">
                    Identificador
                  </label>
                  <input
                    ref={identificadorRef}
                    disabled={!editable}
                    required
                    className="h-8 w-full rounded-md border border-slate-200 bg-slate-50/50 px-2.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#113EB9] focus:outline-none disabled:bg-slate-100/70 disabled:text-slate-500 transition-colors"
                    placeholder="Ejemplo: Colegio ABC"
                    value={codlan}
                    onChange={(e) => setCodlan(e.target.value)}
                  />
                </div>

                <div className="md:col-span-7">
                  <label className="block text-[10.5px] font-semibold text-slate-700 mb-0.5">
                    Nombre del punto
                  </label>
                  <div className="flex items-center gap-1.5">
                    <div className="relative flex-1">
                      {editable ? (
                        <div className="relative w-full">
                          <MapPin className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                          <input
                            className="h-8 w-full rounded-md border border-slate-200 bg-slate-50/50 pl-7 pr-2.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#113EB9] focus:outline-none transition-colors"
                            placeholder="Escribe el nuevo destino"
                            value={nomDestino}
                            onChange={(e) => setNomDestino(e.target.value)}
                            required
                          />
                        </div>
                      ) : (
                        <InputDestino
                          onSelectDestino={handleSelectDestino}
                          className="h-8 w-full rounded-md border border-slate-200 bg-slate-50/50 pl-7 pr-2.5 text-xs text-slate-800 focus:bg-white focus:border-[#113EB9] focus:outline-none transition-colors"
                          placeholder="Aeropuerto Jorge Chávez"
                        />
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleSeleccionar}
                      className="h-8 px-3 rounded-md border border-blue-200 bg-blue-50/70 hover:bg-blue-100/70 text-[#113EB9] text-xs font-semibold transition-colors shrink-0"
                    >
                      Seleccionar
                    </button>

                    <button
                      type="button"
                      onClick={habilitarEdicion}
                      className="h-8 px-3 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors shrink-0"
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={activarCampos}
                      className="h-8 px-3 rounded-md bg-[#113EB9] hover:bg-blue-800 text-white text-xs font-semibold transition-colors shrink-0 flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3 stroke-[2.5]" />
                      <span>Nuevo</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 02 · UBICACIÓN */}
              <div className="flex items-center gap-2 pt-2 pb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 shrink-0">
                  02 · UBICACIÓN
                </span>
                <div className="h-[1px] flex-1 bg-slate-200" />
              </div>

              {/* Fila 1: Dirección y Distrito */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 mb-2">
                <div className="md:col-span-8">
                  <label className="block text-[10.5px] font-semibold text-slate-700 mb-0.5">
                    Dirección
                  </label>
                  <input
                    disabled={!editable}
                    required
                    className="h-8 w-full rounded-md border border-slate-200 bg-slate-50/50 px-2.5 text-xs text-slate-800 focus:bg-white focus:border-[#113EB9] focus:outline-none disabled:bg-slate-100/70 disabled:text-slate-500 transition-colors"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    placeholder="Av. Elmer Faucett s/n"
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="block text-[10.5px] font-semibold text-slate-700 mb-0.5">
                    Distrito
                  </label>
                  <input
                    disabled={!editable}
                    required
                    className="h-8 w-full rounded-md border border-slate-200 bg-slate-50/50 px-2.5 text-xs text-slate-800 focus:bg-white focus:border-[#113EB9] focus:outline-none disabled:bg-slate-100/70 disabled:text-slate-500 transition-colors"
                    value={distrito}
                    onChange={(e) => setDistrito(e.target.value)}
                    placeholder="Callao"
                  />
                </div>
              </div>

              {/* Fila 2: Latitud, Longitud y Buscar dirección */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 mb-2">
                <div className="md:col-span-3">
                  <label className="block text-[10.5px] font-semibold text-slate-700 mb-0.5">
                    Latitud
                  </label>
                  <input
                    disabled={!editable}
                    required
                    className="h-8 w-full rounded-md border border-slate-200 bg-slate-50/50 px-2.5 text-xs font-mono text-slate-800 focus:bg-white focus:border-[#113EB9] focus:outline-none disabled:bg-slate-100/70 disabled:text-slate-500 transition-colors"
                    value={latitud}
                    onChange={(e) => setLatitud(e.target.value)}
                    placeholder="-12.021889"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-[10.5px] font-semibold text-slate-700 mb-0.5">
                    Longitud
                  </label>
                  <input
                    disabled={!editable}
                    required
                    className="h-8 w-full rounded-md border border-slate-200 bg-slate-50/50 px-2.5 text-xs font-mono text-slate-800 focus:bg-white focus:border-[#113EB9] focus:outline-none disabled:bg-slate-100/70 disabled:text-slate-500 transition-colors"
                    value={longitud}
                    onChange={(e) => setLongitud(e.target.value)}
                    placeholder="-77.114319"
                  />
                </div>

                <div className="md:col-span-6 relative" style={{ zIndex: 1050 }}>
                  <label className="block text-[10.5px] font-semibold text-slate-700 mb-0.5">
                    Buscar dirección
                  </label>
                  <input
                    disabled={!editable}
                    type="text"
                    placeholder="Escribe una dirección..."
                    className="h-8 w-full rounded-md border border-slate-200 bg-slate-50/50 px-2.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#113EB9] focus:outline-none disabled:bg-slate-100/70 disabled:text-slate-500 transition-colors relative z-10"
                    value={searchInput}
                    onChange={handleSearchInputChange}
                    onFocus={() =>
                      searchResults.length > 0 && setShowSearchResults(true)
                    }
                    onBlur={() => {
                      setTimeout(() => setShowSearchResults(false), 200);
                    }}
                  />

                  {/* Resultados de búsqueda con z-index alto */}
                  {showSearchResults && searchResults.length > 0 && (
                    <div
                      className="absolute left-0 right-0 top-full mt-1 max-h-40 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg"
                      style={{ zIndex: 1060 }}
                    >
                      {searchResults.map((result, index) => (
                        <div
                          key={index}
                          className="cursor-pointer border-b border-slate-100 px-2.5 py-1.5 last:border-b-0 hover:bg-slate-50 text-xs text-slate-700 transition-colors"
                          onClick={() => handleAddressSelect(result)}
                          onMouseDown={(e) => e.preventDefault()}
                        >
                          {result.display_name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Contenedor del mapa Leaflet */}
              <div
                id="destino-leaflet-map-container"
                className={`relative w-full overflow-hidden rounded-lg border border-slate-200 ${
                  isMapFullscreen
                    ? 'fixed inset-0 z-[9999] h-screen w-screen bg-white'
                    : ''
                }`}
                style={{
                  zIndex: isMapFullscreen ? 9999 : 1,
                  ...(isMapFullscreen && {
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    width: '100vw',
                    height: '100vh',
                    backgroundColor: 'white',
                    margin: 0,
                    padding: 0,
                  }),
                }}
              >
                {/* Botón de pantalla completa */}
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="absolute right-3 top-3 z-[10001] rounded-md border border-slate-200 bg-white/95 p-1.5 shadow-sm backdrop-blur-sm transition-colors duration-200 hover:bg-slate-50 text-slate-600"
                  title={
                    isMapFullscreen
                      ? 'Salir de pantalla completa'
                      : 'Pantalla completa'
                  }
                >
                  {isMapFullscreen ? (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 0 2-2h3M3 16h3a2 2 0 0 0 2 2v3" />
                    </svg>
                  ) : (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                    </svg>
                  )}
                </button>

                {isClient && (
                  <div className={isMapFullscreen ? 'h-full w-full' : 'h-[220px] w-full'}>
                    <MapContainer
                      center={
                        markerPosition[0] !== 0 && markerPosition[1] !== 0
                          ? markerPosition
                          : [-12.0464, -77.0428]
                      }
                      zoom={
                        markerPosition[0] !== 0 && markerPosition[1] !== 0 ? 18 : 5
                      }
                      style={{ height: '100%', width: '100%' }}
                      ref={mapRef}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />

                      <MapResizer isFullscreen={isMapFullscreen} />
                      <MapClickHandler onMapClick={handleMapClick} />

                      {markerPosition[0] !== 0 && markerPosition[1] !== 0 && (
                        <Marker position={markerPosition} />
                      )}
                    </MapContainer>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-2.5 mt-1 border-t border-slate-100">
                <span className="text-[11px] text-slate-400 font-normal">
                  Arrastra el pin o escribe las coordenadas para ajustar el punto.
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCerrar}
                    className="h-8 px-3.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
                  >
                    Cerrar
                  </button>

                  <button
                    type="button"
                    onClick={handleGuardarDestino}
                    className="h-8 px-3.5 rounded-md bg-[#007a4d] hover:bg-[#006640] text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-none"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>Guardar destino</span>
                  </button>
                </div>
              </div>
            </ModalBody>
          )}
        </ModalContent>
      </Modal>

      {/* Estilos para importar Leaflet CSS y Fullscreen */}
      <style jsx global>{`
        @import url('https://unpkg.com/leaflet@1.7.1/dist/leaflet.css');

        #destino-leaflet-map-container:fullscreen {
          background: white !important;
          width: 100vw !important;
          height: 100vh !important;
          margin: 0 !important;
          padding: 0 !important;
          display: block !important;
        }

        #destino-leaflet-map-container:fullscreen .leaflet-container {
          background: #fff !important;
          width: 100% !important;
          height: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        #destino-leaflet-map-container:fullscreen > div {
          width: 100% !important;
          height: 100% !important;
        }
      `}</style>
    </>
  );
}
