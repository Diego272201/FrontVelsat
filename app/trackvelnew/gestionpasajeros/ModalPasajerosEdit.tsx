'use client';
import React, { useEffect, useState, useRef } from 'react';
import { AiFillCloseCircle } from 'react-icons/ai';
import { IoMdSave } from 'react-icons/io';
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
import { BiEditAlt } from 'react-icons/bi';
import { useApi } from '@/context/ApiContext';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
import type { Map as LeafletMap } from 'leaflet';
import { User } from 'lucide-react';
import { Controller } from 'react-hook-form';

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

import { useMapEvents } from 'react-leaflet';

interface Props {
  title: string;
  codCliente: number | null;
}

interface SearchResult {
  lat: string;
  lon: string;
  display_name: string;
  place_id: string;
}

interface Tarifa {
  codigo: number;
  zona: string;
}

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

export default function App({ title, codCliente }: Props) {
  useEffect(() => {
    if (codCliente !== null) {
      console.log('CodCliente en ModalPasajerosEdit:', codCliente);
    }
  }, [codCliente]);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    watch,
    setValue, // ✅ Agregado setValue
  } = useForm({
    defaultValues: {
      codlan: '',
      apellidos: '',
      telefono: '',
      sexo: '',
      empresa: '',
      codigo: '',
      direccion: '',
      distrito: '',
      wy: '',
      wx: '',
      codusuario: '',
    },
  });

  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
  const [tarifa, setTarifa] = useState<Tarifa[]>([]);
  const [isTarifaLoaded, setIsTarifaLoaded] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);

  const { baseUrl } = useApi();
  const [isBaseUrlReady, setIsBaseUrlReady] = useState(false);
  const { data: session } = useSession();
  const username = session?.user.username;

  const mapRef = useRef<LeafletMap | null>(null);
  const codigoValue = watch('codigo');

  const wy = watch('wy');
  const wx = watch('wx');

  const lat = parseFloat(wy);
  const lng = parseFloat(wx);

  const [markerPosition, setMarkerPosition] = useState<[number, number]>([
    0, 0,
  ]);
  const [originalPosition, setOriginalPosition] = useState<[number, number]>([
    0, 0,
  ]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([
    -12.0464, -77.0428,
  ]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsMapFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () =>
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    const mapContainer = document.getElementById('edit-leaflet-map-container');
    if (!mapContainer) return;

    try {
      if (!document.fullscreenElement) {
        await mapContainer.requestFullscreen();
        setIsMapFullscreen(true);
      } else {
        await document.exitFullscreen();
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

  // Hook de Google Places
  const { isLoaded, autocompleteService, placesService } =
    useGooglePlacesAutocomplete();

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

  // Función principal de búsqueda con Google Places
  const searchAddress = async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    // Solo usar Google Places, sin fallback
    if (isLoaded && autocompleteService && placesService) {
      try {
        const request: google.maps.places.AutocompletionRequest = {
          input: query,
          componentRestrictions: { country: 'pe' },
          types: ['address'],
        };

        autocompleteService.getPlacePredictions(
          request,
          (predictions, status) => {
            if (
              status === google.maps.places.PlacesServiceStatus.OK &&
              predictions
            ) {
              const processedResults: SearchResult[] = [];
              let processedCount = 0;
              const totalPredictions = Math.min(5, predictions.length);

              if (totalPredictions === 0) {
                setSearchResults([]);
                setShowSearchResults(false);
                return;
              }

              predictions.slice(0, 5).forEach((prediction) => {
                const detailsRequest: google.maps.places.PlaceDetailsRequest = {
                  placeId: prediction.place_id,
                  fields: [
                    'geometry',
                    'formatted_address',
                    'address_components',
                  ],
                };

                placesService.getDetails(
                  detailsRequest,
                  (place, detailsStatus) => {
                    if (
                      detailsStatus ===
                        google.maps.places.PlacesServiceStatus.OK &&
                      place &&
                      place.geometry
                    ) {
                      processedResults.push({
                        lat: place.geometry.location!.lat().toString(),
                        lon: place.geometry.location!.lng().toString(),
                        display_name:
                          place.formatted_address || prediction.description,
                        place_id: prediction.place_id,
                      });
                    }

                    processedCount++;
                    if (processedCount === totalPredictions) {
                      if (processedResults.length > 0) {
                        setSearchResults(processedResults);
                        setShowSearchResults(true);
                      } else {
                        setSearchResults([]);
                        setShowSearchResults(false);
                      }
                    }
                  },
                );
              });
            } else {
              setSearchResults([]);
              setShowSearchResults(false);
            }
          },
        );
      } catch (error) {
        console.error('Error with Google Places:', error);
        // ❌ ELIMINAR: fallbackToNominatim(query);
        // ✅ AGREGAR: Mensaje de error
        toast.error('Error al conectar con Google Maps');
        setSearchResults([]);
        setShowSearchResults(false);
      }
    } else {
      // ❌ ELIMINAR: fallbackToNominatim(query);
      // ✅ AGREGAR: Mensaje indicando que Google Maps no está cargado
      toast.warning('Google Maps aún no está disponible, intenta nuevamente');
      setSearchResults([]);
      setShowSearchResults(false);
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
            // ❌ ELIMINAR: fallbackReverseGeocode(lat, lng).then(resolve);
            // ✅ AGREGAR: Retornar null si Google falla
            console.error('Google Geocoder error:', status);
            toast.error('No se pudo obtener la dirección desde Google Maps');
            resolve(null);
          }
        });
      } else {
        // ❌ ELIMINAR: fallbackReverseGeocode(lat, lng).then(resolve);
        // ✅ AGREGAR: Retornar null si Google no está disponible
        toast.warning('Google Maps no está disponible');
        resolve(null);
      }
    });
  };

  const fetchPasajeroDetail = async () => {
    if (!isBaseUrlReady || codCliente === null || !isTarifaLoaded) return;

    try {
      const response = await axios.get(
        `${baseUrl}/api/Pasajero/Detail/${codCliente}`,
      );
      const pasajeroData = response.data[0];

      console.log('Datos del pasajero:', pasajeroData);

      const lat = parseFloat(pasajeroData.wy) || 0;
      const lng = parseFloat(pasajeroData.wx) || 0;

      const tarifaItem = tarifa.find((item) => item.zona === pasajeroData.zona);
      const codigoZona = tarifaItem ? tarifaItem.codigo.toString() : '';

      reset({
        codlan: pasajeroData.codlan || '',
        apellidos: pasajeroData.apellidos || '',
        telefono: pasajeroData.telefono || '',
        sexo: pasajeroData.sexo === 'M' ? 'M' : 'F',
        empresa: pasajeroData.empresa || '',
        codigo: codigoZona,
        direccion: pasajeroData.direccion || '',
        distrito: pasajeroData.distrito || '',
        wy: pasajeroData.wy || '',
        wx: pasajeroData.wx || '',
        codusuario: pasajeroData.codusuario || '',
      });

      setMarkerPosition([lat, lng]);
      setOriginalPosition([lat, lng]);
      setMapCenter([lat, lng]);
      setSearchInput(pasajeroData.direccion || '');
    } catch (error) {
      console.error('Error fetching pasajero detail:', error);
    }
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
    setValue('wy', lat.toString(), { shouldValidate: true });
    setValue('wx', lng.toString(), { shouldValidate: true });

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

    setValue('wy', lat.toString(), { shouldValidate: true });
    setValue('wx', lng.toString(), { shouldValidate: true });

    // Usar Google para geocodificación inversa
    const geocodeResult = await reverseGeocodeGoogle(lat, lng);
    if (geocodeResult) {
      setSearchInput(geocodeResult.address);
      setValue('wy', lat.toString(), { shouldValidate: true });
      setValue('wx', lng.toString(), { shouldValidate: true });
      setValue('direccion', geocodeResult.address, { shouldValidate: true });
      setValue('distrito', geocodeResult.district, { shouldValidate: true });
    }
  };

  const handleClose = () => {
    reset((prev) => ({
      ...prev,
      wy: originalPosition[0].toString(),
      wx: originalPosition[1].toString(),
    }));
    setMarkerPosition(originalPosition);
    setMapCenter(
      originalPosition[0] !== 0 && originalPosition[1] !== 0
        ? originalPosition
        : [-12.0464, -77.0428],
    );
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
          setIsTarifaLoaded(true);
        } else {
          console.error('Error: Datos no válidos', data);
          setIsTarifaLoaded(false);
        }
      } catch (error) {
        console.error('Error al obtener la tarifa:', error);
        setIsTarifaLoaded(false);
      }
    };

    fetchTarifa();
  }, [isBaseUrlReady, baseUrl]);

  useEffect(() => {
    if (!isBaseUrlReady || codCliente === null || !isTarifaLoaded) return;
    fetchPasajeroDetail(); // Llamar a la función principal que ya corregiste
  }, [isBaseUrlReady, baseUrl, codCliente, isTarifaLoaded, reset]);

  const onSubmit = handleSubmit(async (data) => {
    if (!baseUrl || codCliente === null || username === null) return;

    setIsLoading(true);

    try {
      const codlan = data.codlan;
      const codigoValue =
        data.codigo && data.codigo.trim() !== '' ? data.codigo : null;

      console.log('Datos enviados:', {
        codlan: data.codlan,
        apellidos: data.apellidos,
        telefono: data.telefono,
        sexo: data.sexo,
        empresa: data.empresa,
        codigo: codigoValue,
        direccion: data.direccion,
        distrito: data.distrito,
        wy: data.wy,
        wx: data.wx,
        codusuario: data.codusuario,
      });

      const response = await axios.put(
        `${baseUrl}/api/Pasajero/Update/${username}/${codCliente}/${codlan}`,
        {
          codlan: data.codlan,
          apellidos: data.apellidos,
          telefono: data.telefono,
          sexo: data.sexo,
          empresa: data.empresa,
          zona: codigoValue,
          direccion: data.direccion,
          distrito: data.distrito,
          wy: data.wy,
          wx: data.wx,
        },
      );

      console.log('Pasajero actualizado con éxito:', response.data);
      await fetchPasajeroDetail();
      onClose();
      toast.success('Pasajero actualizado');
    } catch (error) {
      console.error('Error al actualizar el pasajero:', error);
      toast.error('Error al actualizar el pasajero');
    } finally {
      setIsLoading(false);
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
      reverseGeocodeGoogle(lat, lng).then((result) => {
        if (result) {
          setSearchInput(result.address);
          setValue('direccion', result.address, { shouldValidate: true });
          setValue('distrito', result.district, { shouldValidate: true });
        }
      });
    }
  }, [control._formValues.latitud, control._formValues.longitud]);

  return (
    <>
      <span className="cursor-pointer text-lg text-default-400 active:opacity-50">
        <button
          onClick={onOpen}
          className="inline-flex h-[40px] items-center gap-2 rounded-md bg-blue-500 px-4 py-2 text-sm text-white shadow-sm transition hover:bg-blue-600"
        >
          <BiEditAlt className="text-white" size={18} />
          Editar
        </button>
      </span>

      <Modal
        className="scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100 z-[1000] h-[85vh] w-[70%] max-w-none overflow-auto"
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        isDismissable={true}
        isKeyboardDismissDisabled={true}
      >
        <form action="" onSubmit={onSubmit}>
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="cabecera flex items-center justify-center gap-2 text-[15px]">
                  <User className="h-5 w-5" />
                  Detalle Pasajero
                </ModalHeader>

                <ModalBody>
                  <div className="flex flex-col gap-4">
                    <div className="mb-6 flex w-full flex-wrap gap-4 md:mb-0 md:flex-nowrap">
                      <div className="mensajeR w-full">
                        <Input
                          type="text"
                          label="Identificador"
                          placeholder="Atn2017"
                          labelPlacement="outside"
                          {...register('codlan', { required: true })}
                        />
                        {errors.codlan && (
                          <span className="errorMesageUserI">
                            Identificador es requerido
                          </span>
                        )}
                      </div>

                      <div className="mensajeR w-full">
                        <Input
                          type="text"
                          label="Nombre"
                          placeholder="Nombre del pasajero"
                          labelPlacement="outside"
                          {...register('apellidos', { required: true })}
                        />
                        {errors.apellidos && (
                          <span className="errorMesageUserI">
                            Nombre es requerido
                          </span>
                        )}
                      </div>

                      <div className="mensajeR w-full">
                        <Input
                          type="text"
                          label="Teléfono"
                          placeholder="No registrado"
                          labelPlacement="outside"
                          {...register('telefono')}
                        />
                      </div>

                      <div className="mensajeR w-full">
                        <Select
                          label="Sexo"
                          placeholder="Selecciona el sexo"
                          labelPlacement="outside"
                          disableSelectorIconRotation
                          selectorIcon={<SelectorIcon />}
                          {...register('sexo')}
                        >
                          <SelectItem key="M">M</SelectItem>
                          <SelectItem key="F">F</SelectItem>
                        </Select>
                      </div>

                      <div className="mensajeR w-full">
                        <Input
                          type="text"
                          label="Usuario"
                          placeholder="No registrado"
                          labelPlacement="outside"
                          {...register('codusuario')}
                        />
                      </div>
                    </div>

                    <hr />

                    <div className="mb-6 flex w-full flex-wrap gap-4 md:mb-0 md:flex-nowrap">
                      <div className="w-full">
                        <Select
                          label="Empresa"
                          placeholder="Selecciona una empresa"
                          labelPlacement="outside"
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
                          <SelectItem key="AMERICAN">
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
                          <SelectItem key="SASAA">SASAA</SelectItem>
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
                      </div>

                      <div className="w-full">
                        <Select
                          label="Tarifa"
                          placeholder="Selecciona una tarifa"
                          labelPlacement="outside"
                          className="max-w-xs"
                          disableSelectorIconRotation
                          selectorIcon={<SelectorIcon />}
                          selectedKeys={codigoValue ? [codigoValue] : []} // Usar codigoValue
                          onSelectionChange={(keys) => {
                            const selectedValue = Array.from(keys)[0] as string;
                            setValue('codigo', selectedValue);
                          }}
                          isDisabled={!isTarifaLoaded}
                        >
                          {tarifa.map((item) => (
                            <SelectItem key={item.codigo.toString()}>
                              {item.zona}
                            </SelectItem> // ✅ Correcto
                          ))}
                        </Select>
                      </div>

                      <div className="mensajeR w-full">
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

                      <div className="mensajeR w-full">
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
                          name="wy"
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
                                setValue('wy', e.target.value, {
                                  shouldValidate: true,
                                });
                              }}
                            />
                          )}
                        />

                        {errors.wy && (
                          <span className="errorMesageUserI">
                            Latitud es requerida
                          </span>
                        )}
                      </div>
                      <div className="mensajeR">
                        <Controller
                          name="wx"
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
                                setValue('wx', e.target.value, {
                                  shouldValidate: true,
                                });
                              }}
                            />
                          )}
                        />

                        {errors.wx && (
                          <span className="errorMesageUserI">
                            Longitud es requerida
                          </span>
                        )}
                      </div>

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
                            setTimeout(() => setShowSearchResults(false), 200);
                          }}
                        />

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
                                onMouseDown={(e) => e.preventDefault()}
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
                      id="edit-leaflet-map-container"
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
                        type="button"
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

                      {isClient &&
                        !isNaN(lat) &&
                        !isNaN(lng) &&
                        markerPosition[0] !== 0 &&
                        markerPosition[1] !== 0 && (
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
                            {' '}
                            <MapContainer
                              center={mapCenter}
                              zoom={18}
                              style={{ height: '100%', width: '100%' }}
                              ref={mapRef}
                            >
                              <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                              />

                              <MapClickHandler onMapClick={handleMapClick} />

                              <StaticMarker position={markerPosition} />
                            </MapContainer>
                          </div>
                        )}
                    </div>
                  </div>
                </ModalBody>

                <ModalFooter>
                  <Button
                    color="danger"
                    onPress={() => {
                      handleClose();
                      onClose();
                    }}
                    isDisabled={isLoading}
                  >
                    Cerrar
                    <AiFillCloseCircle size={18} />
                  </Button>
                  <Button
                    color="primary"
                    type="submit"
                    isLoading={isLoading}
                    isDisabled={isLoading}
                  >
                    {isLoading ? 'Guardando...' : 'Guardar'}
                    {!isLoading && <IoMdSave size={18} />}
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </form>
      </Modal>

      <style jsx global>{`
        @import url('https://unpkg.com/leaflet@1.7.1/dist/leaflet.css');

        /* Estilos para el modo fullscreen del modal de edición */
        #edit-leaflet-map-container:fullscreen {
          background: white !important;
          width: 100vw !important;
          height: 100vh !important;
          margin: 0 !important;
          padding: 0 !important;
          display: block !important;
        }

        #edit-leaflet-map-container:fullscreen .leaflet-container {
          background: #fff !important;
          width: 100% !important;
          height: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        /* Remover cualquier padding/margin del body cuando está en fullscreen */
        body:has(#edit-leaflet-map-container:fullscreen) {
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden;
        }

        /* Asegurar que el mapa en fullscreen tenga el tamaño correcto */
        #edit-leaflet-map-container.fixed {
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
        #edit-leaflet-map-container button {
          backdrop-filter: blur(5px);
          background: rgba(255, 255, 255, 0.95) !important;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2) !important;
        }

        /* Forzar el tamaño del contenedor del mapa en fullscreen */
        #edit-leaflet-map-container:fullscreen > div,
        #edit-leaflet-map-container.fixed > div {
          width: 100% !important;
          height: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        /* Animación suave para la transición */
        #edit-leaflet-map-container {
          transition: all 0.2s ease-in-out;
        }
      `}</style>
    </>
  );
}
