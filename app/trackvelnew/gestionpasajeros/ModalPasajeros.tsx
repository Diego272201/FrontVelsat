'use client';
import React, { useEffect, useRef, useState } from 'react';
import { AiFillCloseCircle } from 'react-icons/ai';
import { IoIosAddCircle, IoMdSave } from 'react-icons/io';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  useDisclosure,
  Input,
  Select,
  SelectItem
} from '@nextui-org/react';
import { SelectorIcon } from '../planificacion/administracionturnos/SelectorIcon';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import { useApi } from '@/context/ApiContext';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { MdAddBox } from 'react-icons/md';
import dynamic from 'next/dynamic';
import type { Map as LeafletMap } from 'leaflet';

// Importar Leaflet dinámicamente para evitar problemas de SSR
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });

// Importar useMapEvents de manera estática para evitar problemas de tipos
import { useMapEvents } from 'react-leaflet';

interface Props {
  title: string;
  onPasajeroAgregado: () => void;
}

// Interfaz para los resultados de búsqueda
interface SearchResult {
  lat: string;
  lon: string;
  display_name: string;
  place_id: string;
}

// Componente para manejar clics en el mapa
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Componente para el marcador fijo (no draggable)
function StaticMarker({ 
  position
}: { 
  position: [number, number]
}) {
  return (
    <Marker
      draggable={false}
      position={position}
    />
  );
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

export default function App({ title, onPasajeroAgregado }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    clearErrors,
    watch,
  } = useForm();

  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
  const [tarifa, setTarifa] = useState<{ zona: string }[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  const { baseUrl } = useApi();
  const [isBaseUrlReady, setIsBaseUrlReady] = useState(false);
  const { data: session } = useSession();
  const username = session?.user.username;

  const mapRef = useRef<LeafletMap | null>(null);

  const [markerPosition, setMarkerPosition] = useState<[number, number]>([0, 0]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([-12.0464, -77.0428]); 

  // Hook de Google Places
  const { isLoaded, autocompleteService, placesService } = useGooglePlacesAutocomplete();

  useEffect(() => {
    setIsClient(true);
    
    if (typeof window !== 'undefined') {
      import('leaflet').then((L) => {
        const DefaultIcon = L.Icon.Default;
        const iconPrototype = DefaultIcon.prototype as { _getIconUrl?: () => void };
        delete iconPrototype._getIconUrl;
        
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });
      });
    }
  }, []);

  // Función de fallback a Nominatim
  const fallbackToNominatim = async (query: string) => {
    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=pe`
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
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      
      if (response.data && response.data.display_name) {
        const address = response.data.display_name;
        const district = response.data.address?.suburb || 
                        response.data.address?.city_district || 
                        response.data.address?.county || 
                        response.data.address?.city || '';
                        
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

  const handleAddressSelect = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    
    setMarkerPosition([lat, lng]);
    setMapCenter([lat, lng]);
    setSearchInput(result.display_name);
    setShowSearchResults(false);

    const addressParts = result.display_name.split(', ');
    const possibleDistrict = addressParts.find(part => 
      part.includes('Lima') || 
      part.includes('Distrito') || 
      addressParts.indexOf(part) === 1 || 
      addressParts.indexOf(part) === 2
    ) || '';

    reset((prev) => ({
      ...prev,
      direccion: result.display_name,
      distrito: possibleDistrict,
      latitud: lat.toString(),
      longitud: lng.toString(),
    }));

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
    
    reset((prev) => ({
      ...prev,
      latitud: lat.toString(),
      longitud: lng.toString(),
    }));

    // Usar Google para geocodificación inversa
    const geocodeResult = await reverseGeocodeGoogle(lat, lng);
    if (geocodeResult) {
      setSearchInput(geocodeResult.address);
      reset((prev) => ({
        ...prev,
        latitud: lat.toString(),
        longitud: lng.toString(),
        direccion: geocodeResult.address,
        distrito: geocodeResult.district,
      }));
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
    setMapCenter([-12.0464, -77.0428]);
    setSearchInput('');
    setSearchResults([]);
    setShowSearchResults(false);
  };

  useEffect(() => {
    if (!isOpen) {
      handleClose();
    }
  }, [isOpen]);

  useEffect(() => {
    if (baseUrl) {
      setIsBaseUrlReady(true);
    }
  }, [baseUrl]);

  useEffect(() => {
    if (!isBaseUrlReady) return;

    const fetchTarifa = async () => {
      try {
        const response = await axios.get(
          `${baseUrl}/api/Pasajero/Tarifa/${username}`,
        );
        const data = response.data;

        if (data) {
          setTarifa(data);
        } else {
          console.error('Error: Datos no válidos', data);
        }
      } catch (error) {
        console.error('Error al obtener la tarifa:', error);
      }
    };

    fetchTarifa();
  }, [isBaseUrlReady, baseUrl]);

  const onSubmit = handleSubmit(async (data) => {
    if (!username) return;

    const body = {
      codlan: data.identificador,
      apellidos: data.nombre,
      telefono: data.telefono,
      sexo: data.sexo,
      empresa: data.empresa,
      zona: data.tarifa,
      direccion: data.direccion,
      distrito: data.distrito,
      wy: data.latitud,
      wx: data.longitud,
    };

    try {
      const response = await axios.post(
        `https://velsat.pe:2096/api/Pasajero/New/${username}`,
        body,
      );
      console.log('Pasajero registrado correctamente:', response.data);
      onClose();
      toast.success('Nuevo pasajero agregado');
      onPasajeroAgregado();
    } catch (error) {
      console.error('Error al registrar el pasajero:', error);
      toast.error('Error al agregar el pasajero');
    }
  });

  return (
    <>
      <span className="cursor-pointer text-lg text-default-400 active:opacity-50">
        <button
          onClick={onOpen}
          className="inline-flex items-center h-[40px] gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm text-white shadow-sm transition hover:bg-emerald-700"
        >
          <IoIosAddCircle className="text-white" size={18} />
          Nuevo
        </button>
      </span>

      <Modal
        className="w-[70%] max-w-none z-[1000] h-[85vh] overflow-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100"
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        isDismissable={false}
        isKeyboardDismissDisabled={true}
      >
        <form action="" onSubmit={onSubmit}>
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="flex items-center justify-center gap-1 text-[15px]">
                  <MdAddBox size={20}  />
                  {title}
                </ModalHeader>
                <ModalBody>
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap justify-between">
                      <div>
                        <Input
                          type="text"
                          label="Identificador"
                          placeholder="Atn2017"
                          labelPlacement="outside"
                          {...register('identificador', {
                            required: true,
                          })}
                        />
                        {errors.identificador && (
                          <span className="errorMesageUserI">
                            Identificador es requerido
                          </span>
                        )}
                      </div>

                      <div className="min-w-[350px]">
                        <Input
                          type="text"
                          label="Nombre"
                          placeholder="Nombre del pasajero"
                          labelPlacement="outside"
                          {...register('nombre', {
                            required: true,
                          })}
                        />
                        {errors.nombre && (
                          <span className="errorMesageUserI">
                            Nombre es requerido
                          </span>
                        )}
                      </div>

                      <div>
                        <Input
                          type="text"
                          label="Teléfono"
                          placeholder="912789654"
                          labelPlacement="outside"
                          {...register('telefono')}
                        />
                      </div>

                      <div className="w-[200px]">
                        <Select
                          label="Sexo"
                          placeholder="Selecciona el sexo"
                          labelPlacement="outside"
                          className="max-w-xs"
                          disableSelectorIconRotation
                          selectorIcon={<SelectorIcon />}
                          {...register('sexo')}
                        >
                          <SelectItem key="M">M</SelectItem>
                          <SelectItem key="F">F</SelectItem>
                        </Select>
                      </div>
                    </div>
                    <hr />

                    <div className="flex flex-wrap justify-between">
                      <Select
                        label="Empresa"
                        placeholder="Selecciona una empresa"
                        labelPlacement="outside"
                        className="w-[200px]"
                        disableSelectorIconRotation
                        selectorIcon={<SelectorIcon />}
                        {...register('empresa')}
                      >
                        <SelectItem key="AVIANCA">AVIANCA</SelectItem>
                        <SelectItem key="LATAM">LATAM</SelectItem>
                        <SelectItem key="KLM">KLM</SelectItem>
                        <SelectItem key="DELTA">DELTA</SelectItem>
                        <SelectItem key="QUALITY_PRODUCTS">
                          QUALITY PRODUCTS
                        </SelectItem>
                        <SelectItem key="NEXA">NEXA</SelectItem>
                        <SelectItem key="LCP">LCP</SelectItem>
                        <SelectItem key="AMERICAN_AIRLINES">
                          AMERICAN AIRLINES
                        </SelectItem>
                        <SelectItem key="AJINOMOTO">AJINOMOTO</SelectItem>
                        <SelectItem key="DHL">DHL</SelectItem>
                        <SelectItem key="TERPEL">TERPEL</SelectItem>
                        <SelectItem key="INDECOPI">INDECOPI</SelectItem>
                        <SelectItem key="AMERICAN_TIERRA">
                          AMERICAN TIERRA
                        </SelectItem>
                        <SelectItem key="REP">REP</SelectItem>
                        <SelectItem key="COPA_AIR">COPA AIR</SelectItem>
                        <SelectItem key="PLUSPETROL">PLUSPETROL</SelectItem>
                        <SelectItem key="PROSEGUR">PROSEGUR</SelectItem>
                        <SelectItem key="TALMA">TALMA</SelectItem>
                        <SelectItem key="OI_PERU">OI PERU</SelectItem>
                        <SelectItem key="METSO">METSO</SelectItem>
                        <SelectItem key="MOVILBUS">MOVILBUS</SelectItem>
                        <SelectItem key="OI_LURIN">OI LURIN</SelectItem>
                        <SelectItem key="METSO_SSGG">METSO SSGG</SelectItem>
                        <SelectItem key="TERPEL_AVIACION">
                          TERPEL AVIACION
                        </SelectItem>
                        <SelectItem key="TERPEL_COMERCIAL">
                          TERPEL COMERCIAL
                        </SelectItem>
                        <SelectItem key="ATSA">ATSA</SelectItem>
                      </Select>

                      <Select
                        label="Tarifa"
                        placeholder="Selecciona una tarifa"
                        labelPlacement="outside"
                        className="w-[200px]"
                        disableSelectorIconRotation
                        selectorIcon={<SelectorIcon />}
                        {...register('tarifa')}
                      >
                        {tarifa.map((item, index) => (
                          <SelectItem key={index} value={item.zona}>
                            {item.zona}
                          </SelectItem>
                        ))}
                      </Select>

                      <div>
                        <Input
                          type="text"
                          label="Dirección"
                          placeholder="Dirección"
                          labelPlacement="outside"
                          className="md:w-[350px]"
                          {...register('direccion', {
                            required: true,
                          })}
                        />

                        {errors.direccion && (
                          <span className="errorMesageUserI">
                            Dirección es requerida
                          </span>
                        )}
                      </div>

                      <div>
                        <Input
                          type="text"
                          label="Distrito"
                          placeholder="Distrito"
                          labelPlacement="outside"
                          className="md:w-[205px]"
                          {...register('distrito', {
                            required: true,
                          })}
                        />

                        {errors.distrito && (
                          <span className="errorMesageUserI">
                            Distrito es requerido
                          </span>
                        )}
                      </div>
                    </div>

                    <hr />

                    <div className="mb-6 flex w-full flex-wrap gap-4 md:mb-0 md:flex-nowrap">
                      <div className="mensajeR">
                        <Input
                          type="text"
                          label="Latitud"
                          placeholder="Latitud"
                          labelPlacement="outside"
                          readOnly
                          className="pointer-events-none cursor-default"
                          {...register('latitud', {
                            required: true,
                          })}
                        />

                        {errors.latitud && (
                          <span className="errorMesageUserI">
                            Latitud es requerida
                          </span>
                        )}
                      </div>
                      <div className="mensajeR">
                        <Input
                          type="text"
                          label="Longitud"
                          placeholder="Longitud"
                          labelPlacement="outside"
                          readOnly
                          className="pointer-events-none cursor-default"
                          {...register('longitud', {
                            required: true,
                          })}
                        />

                        {errors.longitud && (
                          <span className="errorMesageUserI">
                            Longitud es requerida
                          </span>
                        )}
                      </div>

                      {/* Sección de búsqueda de direcciones con z-index corregido */}
                      <div className="w-full -mt-1 relative" style={{ zIndex: 1050 }}>
                        <label className="mb-2 block text-sm text-black">
                          Buscar dirección
                        </label>
                        <input
                          type="text"
                          placeholder="Escribe una dirección..."
                          className="w-full rounded-xl bg-gray-100 px-4 py-2.5 text-sm focus:outline-none relative z-10"
                          value={searchInput}
                          onChange={handleSearchInputChange}
                          onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
                          onBlur={() => {
                            // Delay para permitir clic en resultados
                            setTimeout(() => setShowSearchResults(false), 200);
                          }}
                        />
                        
                        {/* Resultados de búsqueda con z-index alto */}
                        {showSearchResults && searchResults.length > 0 && (
                          <div 
                            className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                            style={{ zIndex: 1060 }}
                          >
                            {searchResults.map((result, index) => (
                              <div
                                key={index}
                                className="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                                onClick={() => handleAddressSelect(result)}
                                onMouseDown={(e) => e.preventDefault()} // Prevenir blur antes del clic
                              >
                                <div className="text-sm font-medium text-gray-900">
                                  {result.display_name}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Contenedor del mapa con z-index más bajo */}
                    <div style={{ zIndex: 1 }}>
                      {isClient && (
                        <div className="w-full h-[400px] rounded-lg overflow-hidden">
                          <MapContainer
                            center={mapCenter}
                            zoom={markerPosition[0] !== 0 && markerPosition[1] !== 0 ? 13 : 6}
                            style={{ height: '100%', width: '100%' }}
                            ref={mapRef}
                          >
                            <TileLayer
                              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            
                            <MapClickHandler onMapClick={handleMapClick} />
                            
                            {markerPosition[0] !== 0 && markerPosition[1] !== 0 && (
                              <StaticMarker 
                                position={markerPosition}
                              />
                            )}
                          </MapContainer>
                        </div>
                      )}
                    </div>
                  </div>
                </ModalBody>
                <ModalFooter>
                  <Button color="danger" onPress={onClose}>
                    Cerrar
                    <AiFillCloseCircle size={18} />
                  </Button>
                  <Button color="primary" type="submit">
                    Guardar
                    <IoMdSave size={18} />
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </form>
      </Modal>
      
      {/* Estilos para importar Leaflet CSS */}
      <style jsx global>{`
        @import url('https://unpkg.com/leaflet@1.7.1/dist/leaflet.css');
      `}</style>
    </>
  );
}