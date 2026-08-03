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
  SelectItem,
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
import { Controller } from 'react-hook-form';

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

// Componente para el marcador fijo (no draggable)
function StaticMarker({ position }: { position: [number, number] }) {
  return <Marker draggable={false} position={position} />;
}

// Hook personalizado para Google Places Autocomplete
const useGooglePlacesAutocomplete = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [autocompleteService, setAutocompleteService] =
    useState<google.maps.places.AutocompleteService | null>(null);
  const [placesService, setPlacesService] =
    useState<google.maps.places.PlacesService | null>(null);

  useEffect(() => {
    const checkGoogleMaps = () => {
      if (window.google && window.google.maps && window.google.maps.places) {
        setAutocompleteService(
          new window.google.maps.places.AutocompleteService(),
        );
        setPlacesService(
          new window.google.maps.places.PlacesService(
            document.createElement('div'),
          ),
        );
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
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
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
    },
  });

  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
  const [tarifa, setTarifa] = useState<{ zona: string }[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);

  const { baseUrl } = useApi();
  const [isBaseUrlReady, setIsBaseUrlReady] = useState(false);
  const { data: session } = useSession();
  const username = session?.user.username;

  const mapRef = useRef<LeafletMap | null>(null);

  const [markerPosition, setMarkerPosition] = useState<[number, number]>([
    0, 0,
  ]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([
    -12.0464, -77.0428,
  ]);

  // Hook de Google Places
  const { isLoaded, autocompleteService, placesService } =
    useGooglePlacesAutocomplete();

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsMapFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () =>
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    const mapContainer = document.getElementById('leaflet-map-container');
    if (!mapContainer) return;

    try {
      if (!document.fullscreenElement) {
        await mapContainer.requestFullscreen();
        // Forzar el estado inmediatamente
        setIsMapFullscreen(true);
      } else {
        await document.exitFullscreen();
        // Forzar el estado inmediatamente
        setIsMapFullscreen(false);
      }

      // Invalidar el tamaño del mapa después del cambio
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, 100);
    } catch (error) {
      console.error('Error al cambiar modo fullscreen:', error);
    }
  };

  useEffect(() => {
    setIsClient(true);

    if (typeof window !== 'undefined') {
      import('leaflet').then((L) => {
        const DefaultIcon = L.Icon.Default;
        const iconPrototype = DefaultIcon.prototype as {
          _getIconUrl?: () => void;
        };
        delete iconPrototype._getIconUrl;

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

  // Búsqueda en Google Places / Geocoder
  const searchAddress = async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    if (isLoaded && typeof window !== 'undefined' && window.google?.maps) {
      try {
        const maps = window.google.maps;

        // 1. Intentar AutocompleteSuggestion + Place si está disponible
        if ((maps.places as any)?.AutocompleteSuggestion && (maps.places as any)?.Place) {
          const response = await (maps.places as any).AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: query,
            componentRestrictions: { country: 'pe' },
          });

          const suggestions = response.suggestions || [];
          const processedResults: SearchResult[] = [];

          for (const suggestion of suggestions.slice(0, 5)) {
            if (suggestion.placePrediction) {
              try {
                const place = suggestion.placePrediction.toPlace();
                await place.fetchFields({ fields: ['location', 'formattedAddress', 'displayName'] });
                if (place.location) {
                  processedResults.push({
                    lat: place.location.lat().toString(),
                    lon: place.location.lng().toString(),
                    display_name: place.displayName
                      ? `${place.displayName} - ${place.formattedAddress}`
                      : place.formattedAddress || suggestion.placePrediction.text?.text || '',
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
              if (status === maps.GeocoderStatus.OK && results && results.length > 0) {
                const processedResults: SearchResult[] = results.slice(0, 5).map((res) => ({
                  lat: res.geometry.location.lat().toString(),
                  lon: res.geometry.location.lng().toString(),
                  display_name: res.formatted_address,
                  place_id: res.place_id || '',
                }));
                setSearchResults(processedResults);
                setShowSearchResults(true);
              } else {
                setSearchResults([]);
                setShowSearchResults(false);
              }
            }
          );
          return;
        }
      } catch (error) {
        console.error('Error con Google Places:', error);
        setSearchResults([]);
        setShowSearchResults(false);
        return;
      }
    }

    setSearchResults([]);
    setShowSearchResults(false);
  };

  // Función de geocodificación inversa con Google únicamente
  const reverseGeocodeGoogle = async (
    lat: number,
    lng: number,
  ): Promise<{ address: string; district: string } | null> => {
    if (!isLoaded || !window.google || !window.google.maps) {
      console.error('Google Maps no está disponible');
      return null;
    }

    return new Promise((resolve) => {
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
              component.types.includes('administrative_area_level_2'),
          );

          const district = districtComponent ? districtComponent.long_name : '';
          resolve({ address, district });
        } else {
          console.error('Error en geocodificación inversa:', status);
          resolve(null);
        }
      });
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
    const possibleDistrict =
      addressParts.find(
        (part) =>
          part.includes('Lima') ||
          part.includes('Distrito') ||
          addressParts.indexOf(part) === 1 ||
          addressParts.indexOf(part) === 2,
      ) || '';

    setValue('direccion', result.display_name, { shouldValidate: true });
    setValue('distrito', possibleDistrict, { shouldValidate: true });
    setValue('latitud', lat.toString(), { shouldValidate: true });
    setValue('longitud', lng.toString(), { shouldValidate: true });

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

    setValue('latitud', lat.toString(), { shouldValidate: true });
    setValue('longitud', lng.toString(), { shouldValidate: true });

    // Usar Google para geocodificación inversa
    const geocodeResult = await reverseGeocodeGoogle(lat, lng);
    if (geocodeResult) {
      setSearchInput(geocodeResult.address);
      setValue('latitud', lat.toString(), { shouldValidate: true });
      setValue('longitud', lng.toString(), { shouldValidate: true });
      setValue('direccion', geocodeResult.address, { shouldValidate: true });
      setValue('distrito', geocodeResult.district, { shouldValidate: true });
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
        `https://do.velsat.pe:2083/api/Pasajero/New/${username}`,
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

  // Detectar cambios manuales en los inputs de latitud/longitud
  useEffect(() => {
    const lat = parseFloat(String(control._formValues.latitud));
    const lng = parseFloat(String(control._formValues.longitud));

    if (!isNaN(lat) && !isNaN(lng)) {
      setMarkerPosition([lat, lng]);
      setMapCenter([lat, lng]);

      // Llamar geocodificación inversa
      // reverseGeocodeGoogle(lat, lng).then((result) => {
      //   if (result) {
      //     setSearchInput(result.address);
      //     setValue('direccion', result.address, { shouldValidate: true });
      //     setValue('distrito', result.district, { shouldValidate: true });
      //   }
      // });
    }
  }, [control._formValues.latitud, control._formValues.longitud]);

  return (
    <>
      <button
        onClick={onOpen}
        className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md bg-brandSecondary px-2.5 text-[11px] font-medium text-white transition-colors hover:bg-brandSecondary-hover"
      >
        <IoIosAddCircle size={14} />
        Nuevo
      </button>

      <Modal
        className="scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100 z-[1000] h-[85vh] w-[70%] max-w-none overflow-auto"
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
                  <MdAddBox size={20} />
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
                        <SelectItem key="AMERICAN">AMERICAN</SelectItem>
                        <SelectItem key="AMERICAN TIERRA">
                          AMERICAN TIERRA
                        </SelectItem>
                        <SelectItem key="ATSA">ATSA</SelectItem>
                        <SelectItem key="AVIANCA">AVIANCA</SelectItem>
                        <SelectItem key="DELTA">DELTA</SelectItem>
                        <SelectItem key="DHL">DHL</SelectItem>
                        <SelectItem key="KLM">KLM</SelectItem>
                        <SelectItem key="LAGARDERE">LAGARDERE</SelectItem>
                        <SelectItem key="LATAM">LATAM</SelectItem>
                        <SelectItem key="LATAM ADM">LATAM ADM</SelectItem>
                        <SelectItem key="REP">REP</SelectItem>
                        <SelectItem key="REP SI">REP SI</SelectItem>
                        <SelectItem key="TALMA">TALMA</SelectItem>
                        <SelectItem key="TERPEL">TERPEL</SelectItem>
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
                        <Controller
                          name="direccion"
                          control={control}
                          rules={{ required: true }}
                          render={({ field }) => (
                            <Input
                              {...field}
                              type="text"
                              label="Dirección"
                              placeholder="Dirección"
                              labelPlacement="outside"
                            />
                          )}
                        />

                        {errors.direccion && (
                          <span className="errorMesageUserI">
                            Dirección es requerida
                          </span>
                        )}
                      </div>

                      <div>
                        <Controller
                          name="distrito"
                          control={control}
                          rules={{ required: true }}
                          render={({ field }) => (
                            <Input
                              {...field}
                              type="text"
                              label="Distrito"
                              placeholder="Distrito"
                              labelPlacement="outside"
                            />
                          )}
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
                        <Controller
                          name="latitud"
                          control={control}
                          rules={{ required: true }}
                          render={({ field }) => (
                            <Input
                              {...field}
                              type="text"
                              label="Latitud"
                              placeholder="Latitud"
                              labelPlacement="outside"
                              onChange={(e) => {
                                field.onChange(e); // mantiene react-hook-form sincronizado
                                setValue('latitud', e.target.value, {
                                  shouldValidate: true,
                                });
                              }}
                            />
                          )}
                        />

                        {errors.latitud && (
                          <span className="errorMesageUserI">
                            Latitud es requerida
                          </span>
                        )}
                      </div>
                      <div className="mensajeR">
                        <Controller
                          name="longitud"
                          control={control}
                          rules={{ required: true }}
                          render={({ field }) => (
                            <Input
                              {...field}
                              type="text"
                              label="Longitud"
                              placeholder="Longitud"
                              labelPlacement="outside"
                              onChange={(e) => {
                                field.onChange(e);
                                setValue('longitud', e.target.value, {
                                  shouldValidate: true,
                                });
                              }}
                            />
                          )}
                        />

                        {errors.longitud && (
                          <span className="errorMesageUserI">
                            Longitud es requerida
                          </span>
                        )}
                      </div>

                      {/* Sección de búsqueda de direcciones con z-index corregido */}
                      <div
                        className="relative -mt-1 w-full"
                        style={{ zIndex: 1050 }}
                      >
                        <label className="mb-2 block text-sm text-black">
                          Buscar dirección
                        </label>
                        <input
                          type="text"
                          placeholder="Escribe una dirección..."
                          className="relative z-10 w-full rounded-xl bg-gray-100 px-4 py-2.5 text-sm focus:outline-none"
                          value={searchInput}
                          onChange={handleSearchInputChange}
                          onFocus={() =>
                            searchResults.length > 0 &&
                            setShowSearchResults(true)
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
                                <div className="text-sm font-medium text-gray-900">
                                  {result.display_name}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div
                      id="leaflet-map-container"
                      className={`relative ${
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
                      {/* Botón de fullscreen */}
                      <button
                        onClick={toggleFullscreen}
                        className="absolute right-4 top-4 z-[10001] rounded-md border border-gray-300 bg-white p-2 shadow-lg transition-colors duration-200 hover:bg-gray-100"
                        title={
                          isMapFullscreen
                            ? 'Salir de pantalla completa'
                            : 'Pantalla completa'
                        }
                        style={{ zIndex: 10001 }}
                      >
                        {isMapFullscreen ? (
                          // Icono para salir de fullscreen
                          <svg
                            width="20"
                            height="20"
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
                          // Icono para entrar en fullscreen
                          <svg
                            width="20"
                            height="20"
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
                        <div
                          className={`${
                            isMapFullscreen
                              ? 'h-full w-full'
                              : 'h-[400px] w-full'
                          } overflow-hidden rounded-lg`}
                          style={
                            isMapFullscreen
                              ? {
                                  width: '100%',
                                  height: '100%',
                                  margin: 0,
                                  padding: 0,
                                }
                              : {}
                          }
                        >
                          <MapContainer
                            center={mapCenter}
                            zoom={
                              markerPosition[0] !== 0 && markerPosition[1] !== 0
                                ? 13
                                : 6
                            }
                            style={{
                              height: '100%',
                              width: '100%',
                              ...(isMapFullscreen && {
                                margin: 0,
                                padding: 0,
                              }),
                            }}
                            ref={mapRef}
                          >
                            <TileLayer
                              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />

                            <MapClickHandler onMapClick={handleMapClick} />

                            {markerPosition[0] !== 0 &&
                              markerPosition[1] !== 0 && (
                                <StaticMarker position={markerPosition} />
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

        /* Estilos para el modo fullscreen del modal */
        #leaflet-map-container:fullscreen {
          background: white !important;
          width: 100vw !important;
          height: 100vh !important;
          margin: 0 !important;
          padding: 0 !important;
          display: block !important;
        }

        #leaflet-map-container:fullscreen .leaflet-container {
          background: #fff !important;
          width: 100% !important;
          height: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        /* Remover cualquier padding/margin del body cuando está en fullscreen */
        body:has(#leaflet-map-container:fullscreen) {
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden;
        }

        /* Asegurar que el mapa en fullscreen tenga el tamaño correcto */
        #leaflet-map-container.fixed {
          z-index: 9999 !important;
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          background: white !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        /* Mejorar la visibilidad del botón en fullscreen */
        #leaflet-map-container button {
          backdrop-filter: blur(5px);
          background: rgba(255, 255, 255, 0.95) !important;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2) !important;
        }

        /* Forzar el tamaño del contenedor del mapa en fullscreen */
        #leaflet-map-container:fullscreen > div,
        #leaflet-map-container.fixed > div {
          width: 100% !important;
          height: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        /* Animación suave para la transición */
        #leaflet-map-container {
          transition: all 0.2s ease-in-out;
        }
      `}</style>
    </>
  );
}
