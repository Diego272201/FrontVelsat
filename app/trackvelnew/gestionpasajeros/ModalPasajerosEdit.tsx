'use client';
import React, { useEffect, useState, useRef } from 'react';
import {
  Modal,
  ModalContent,
  ModalBody,
  useDisclosure,
} from '@nextui-org/react';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import { BiEditAlt } from 'react-icons/bi';
import { useApi } from '@/context/ApiContext';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
import type { Map as LeafletMap } from 'leaflet';
import { X, Check, Save, MapPin, ChevronDown } from 'lucide-react';
import { MdCheck, MdContentCopy } from 'react-icons/md';
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

interface Props {
  title: string;
  codCliente: number | null;
  trigger?: React.ReactNode;
  onSaved?: () => void;
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

const EMPRESAS = [
  'AMERICAN',
  'AMERICAN TIERRA',
  'ATSA',
  'AVIANCA',
  'DELTA',
  'DHL',
  'KLM',
  'LAGARDERE',
  'LATAM',
  'LATAM ADM',
  'REP',
  'REP SI',
  'TALMA',
  'TERPEL',
];

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
    let timer: ReturnType<typeof setTimeout> | null = null;
    const checkGoogleMaps = () => {
      if (typeof window !== 'undefined' && window.google && window.google.maps && window.google.maps.places) {
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
        timer = setTimeout(checkGoogleMaps, 100);
      }
    };

    checkGoogleMaps();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  return { isLoaded, autocompleteService, placesService };
};

export default function App({ title, codCliente, trigger, onSaved }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm({
    defaultValues: {
      codlan: '',
      apellidos: '',
      telefono: '',
      sexo: 'M',
      empresa: '',
      codigo: '',
      codlugar: '',
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

  const [googleMapsLink, setGoogleMapsLink] = useState('');
  const [copied, setCopied] = useState(false);

  const mapRef = useRef<LeafletMap | null>(null);
  const codigoValue = watch('codigo');
  const empresaActual = watch('empresa');
  const apellidosWatch = watch('apellidos');

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

      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, 100);
    } catch (error) {
    }
  };

  const { isLoaded } = useGooglePlacesAutocomplete();

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

        // AutocompleteSuggestion + Place si está disponible
        if ((maps.places as any)?.AutocompleteSuggestion && (maps.places as any)?.Place) {
          const response = await (maps.places as any).AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: query,
            includedRegionCodes: ['pe'],
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

        // Geocoder estándar
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
        setSearchResults([]);
        setShowSearchResults(false);
        return;
      }
    }

    setSearchResults([]);
    setShowSearchResults(false);
  };

  // Función de geocodificación inversa con Google
  const reverseGeocodeGoogle = async (
    latCoord: number,
    lngCoord: number,
  ): Promise<{ address: string; district: string } | null> => {
    return new Promise((resolve) => {
      if (isLoaded && typeof window !== 'undefined' && window.google?.maps) {
        const geocoder = new google.maps.Geocoder();
        const latlng = new google.maps.LatLng(latCoord, lngCoord);

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
            toast.error('No se pudo obtener la dirección desde Google Maps');
            resolve(null);
          }
        });
      } else {
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
      if (!pasajeroData) return;

      const pLat = parseFloat(pasajeroData.wy) || 0;
      const pLng = parseFloat(pasajeroData.wx) || 0;

      const tarifaItem = tarifa.find((item) => item.zona === pasajeroData.zona);
      const codigoZona = tarifaItem ? tarifaItem.codigo.toString() : '';

      const formData = {
        codlan: pasajeroData.codlan || '',
        apellidos: pasajeroData.apellidos || '',
        telefono: pasajeroData.telefono || '',
        sexo: pasajeroData.sexo === 'M' ? 'M' : 'F',
        empresa: pasajeroData.empresa || '',
        codigo: codigoZona,
        codlugar: pasajeroData.codlugar || '',
        direccion: pasajeroData.direccion || '',
        distrito: pasajeroData.distrito || '',
        wy: pasajeroData.wy || '',
        wx: pasajeroData.wx || '',
        codusuario: pasajeroData.codusuario || '',
      };

      reset(formData);

      setMarkerPosition([pLat, pLng]);
      setOriginalPosition([pLat, pLng]);
      setMapCenter([pLat, pLng]);
      setSearchInput(pasajeroData.direccion || '');
    } catch (error) {
    }
  };

  const handleAddressSelect = (result: SearchResult) => {
    const aLat = parseFloat(result.lat);
    const aLng = parseFloat(result.lon);

    setMarkerPosition([aLat, aLng]);
    setMapCenter([aLat, aLng]);
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
    setValue('wy', aLat.toFixed(6), { shouldValidate: true });
    setValue('wx', aLng.toFixed(6), { shouldValidate: true });

    if (mapRef.current) {
      mapRef.current.setView([aLat, aLng], 18);
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

  const handleMapClick = async (clickedLat: number, clickedLng: number) => {
    setMarkerPosition([clickedLat, clickedLng]);

    setValue('wy', clickedLat.toFixed(6), { shouldValidate: true });
    setValue('wx', clickedLng.toFixed(6), { shouldValidate: true });

    // Usar Google para geocodificación inversa
    const geocodeResult = await reverseGeocodeGoogle(clickedLat, clickedLng);
    if (geocodeResult) {
      setSearchInput(geocodeResult.address);
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
          setIsTarifaLoaded(false);
        }
      } catch (error) {
        setIsTarifaLoaded(false);
      }
    };

    fetchTarifa();
  }, [isBaseUrlReady, baseUrl, username]);

  useEffect(() => {
    if (wy && wx && !isNaN(parseFloat(wy)) && !isNaN(parseFloat(wx))) {
      setGoogleMapsLink(`https://www.google.com/maps?q=${wy},${wx}`);
    }
  }, [wy, wx]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(googleMapsLink);
      setCopied(true);
      toast.success('Link copiado al portapapeles');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Error al copiar el link');
    }
  };

  useEffect(() => {
    if (isOpen && isBaseUrlReady && codCliente !== null && isTarifaLoaded) {
      fetchPasajeroDetail();
    }
  }, [isOpen, isBaseUrlReady, baseUrl, codCliente, isTarifaLoaded]);

  // Actualizar marcador y centrado cuando wy/wx cambian
  useEffect(() => {
    const nLat = parseFloat(wy);
    const nLng = parseFloat(wx);
    if (!isNaN(nLat) && !isNaN(nLng) && nLat !== 0 && nLng !== 0) {
      setMarkerPosition([nLat, nLng]);
    }
  }, [wy, wx]);

  const onSubmit = handleSubmit(async (data) => {
    if (!baseUrl || codCliente === null || !username) return;

    setIsLoading(true);

    try {
      const codlan = data.codlan;
      const codlugar = data.codlugar || '';
      const codigoVal =
        data.codigo && data.codigo.trim() !== '' ? data.codigo : null;
      await axios.put(
        `${baseUrl}/api/Pasajero/Update/${username}/${codCliente}/${codlan}/${codlugar}`,
        {
          codlan: data.codlan,
          apellidos: data.apellidos,
          telefono: data.telefono,
          sexo: data.sexo,
          empresa: data.empresa,
          zona: codigoVal,
          direccion: data.direccion,
          distrito: data.distrito,
          wy: data.wy,
          wx: data.wx,
        },
      );

      await fetchPasajeroDetail();
      onClose();
      toast.success('Pasajero actualizado');
      onSaved?.();
    } catch (error) {
      toast.error('Error al actualizar el pasajero');
    } finally {
      setIsLoading(false);
    }
  });

  return (
    <>
      {trigger ? (
        React.isValidElement(trigger) ? (
          React.cloneElement(trigger as React.ReactElement<{ onClick?: () => void }>, {
            onClick: onOpen,
          })
        ) : (
          <span onClick={onOpen}>{trigger}</span>
        )
      ) : (
        <button
          onClick={onOpen}
          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md bg-brandPrimary px-2.5 text-[11px] font-medium text-white transition-colors hover:bg-brandPrimary-hover"
        >
          <BiEditAlt size={14} />
          {title || 'Detalle Pasajero'}
        </button>
      )}

      <Modal
        isOpen={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleClose();
            onClose();
          }
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
              <form onSubmit={onSubmit}>
                {/* Header idéntico en color y estilo a ModalDestino */}
                <div className="-mx-4 -mt-4 px-4 py-2.5 bg-[#f0f4fc] border-b border-blue-100/70 flex items-center justify-between rounded-t-xl mb-1">
                  <div>
                    <span className="block text-[10px] font-bold tracking-wider text-[#113EB9] uppercase leading-tight">
                      DETALLE PASAJERO · PX-{codCliente ? String(codCliente).padStart(5, '0') : '00000'}
                    </span>
                    <h2 className="text-[15px] sm:text-[16px] font-bold text-slate-900 leading-tight uppercase truncate max-w-xl">
                      {apellidosWatch || title || 'DETALLE PASAJERO'}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleClose();
                      onClose();
                    }}
                    className="h-7 w-7 rounded-md border border-slate-200/80 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors shrink-0 ml-2"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* 01 · IDENTIFICACIÓN */}
                <div className="flex items-center gap-2 pt-1 pb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 shrink-0">
                    01 · IDENTIFICACIÓN
                  </span>
                  <div className="h-[1px] flex-1 bg-slate-200" />
                </div>

                {/* Fila 1 de Identificación */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 mb-2">
                  {/* Identificador */}
                  <div className="md:col-span-2">
                    <label className="block text-[10.5px] font-semibold text-slate-700 mb-0.5">
                      Identificador
                    </label>
                    <input
                      type="text"
                      placeholder="3775968"
                      className={`h-8 w-full rounded-md border ${
                        errors.codlan ? 'border-red-400' : 'border-slate-200'
                      } bg-slate-50/50 px-2.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#113EB9] focus:outline-none transition-colors`}
                      {...register('codlan', { required: true })}
                    />
                  </div>

                  {/* Nombre */}
                  <div className="md:col-span-5">
                    <label className="block text-[10.5px] font-semibold text-slate-700 mb-0.5">
                      Nombre
                    </label>
                    <input
                      type="text"
                      placeholder="Nombre del pasajero"
                      className={`h-8 w-full rounded-md border ${
                        errors.apellidos ? 'border-red-400' : 'border-slate-200'
                      } bg-slate-50/50 px-2.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#113EB9] focus:outline-none transition-colors uppercase`}
                      {...register('apellidos', { required: true })}
                    />
                  </div>

                  {/* Teléfono */}
                  <div className="md:col-span-3">
                    <label className="block text-[10.5px] font-semibold text-slate-700 mb-0.5">
                      Teléfono
                    </label>
                    <input
                      type="text"
                      placeholder="No registrado"
                      className="h-8 w-full rounded-md border border-slate-200 bg-slate-50/50 px-2.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#113EB9] focus:outline-none transition-colors"
                      {...register('telefono')}
                    />
                  </div>

                  {/* Sexo */}
                  <div className="md:col-span-2">
                    <label className="block text-[10.5px] font-semibold text-slate-700 mb-0.5">
                      Sexo
                    </label>
                    <div className="relative">
                      <select
                        className="h-8 w-full rounded-md border border-slate-200 bg-slate-50/50 pl-2.5 pr-7 text-xs text-slate-800 focus:bg-white focus:border-[#113EB9] focus:outline-none transition-colors appearance-none cursor-pointer"
                        {...register('sexo')}
                      >
                        <option value="M">M</option>
                        <option value="F">F</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    </div>
                  </div>
                </div>

                {/* Fila 2 de Identificación: Usuario */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 mb-2">
                  <div className="md:col-span-2">
                    <label className="block text-[10.5px] font-semibold text-slate-700 mb-0.5">
                      Usuario
                    </label>
                    <input
                      type="text"
                      placeholder="No registrado"
                      className="h-8 w-full rounded-md border border-slate-200 bg-slate-50/50 px-2.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#113EB9] focus:outline-none transition-colors"
                      {...register('codusuario')}
                    />
                  </div>
                </div>

                {/* 02 · SERVICIO Y UBICACIÓN */}
                <div className="flex items-center gap-2 pt-1 pb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 shrink-0">
                    02 · SERVICIO Y UBICACIÓN
                  </span>
                  <div className="h-[1px] flex-1 bg-slate-200" />
                </div>

                {/* Fila 1 de Servicio y Ubicación */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 mb-2">
                  {/* Empresa */}
                  <div className="md:col-span-2">
                    <label className="block text-[10.5px] font-semibold text-slate-700 mb-0.5">
                      Empresa
                    </label>
                    <div className="relative">
                      <select
                        className="h-8 w-full rounded-md border border-slate-200 bg-slate-50/50 pl-2.5 pr-7 text-xs text-slate-800 focus:bg-white focus:border-[#113EB9] focus:outline-none transition-colors appearance-none cursor-pointer"
                        {...register('empresa')}
                      >
                        <option value="">Seleccionar</option>
                        {EMPRESAS.map((emp) => (
                          <option key={emp} value={emp}>
                            {emp}
                          </option>
                        ))}
                        {empresaActual && !EMPRESAS.includes(empresaActual) && (
                          <option value={empresaActual}>{empresaActual}</option>
                        )}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    </div>
                  </div>

                  {/* Tarifa */}
                  <div className="md:col-span-2">
                    <label className="block text-[10.5px] font-semibold text-slate-700 mb-0.5">
                      Tarifa
                    </label>
                    <div className="relative">
                      <select
                        value={codigoValue || ''}
                        onChange={(e) => setValue('codigo', e.target.value, { shouldValidate: true })}
                        disabled={!isTarifaLoaded}
                        className="h-8 w-full rounded-md border border-slate-200 bg-slate-50/50 pl-2.5 pr-7 text-xs text-slate-800 focus:bg-white focus:border-[#113EB9] focus:outline-none transition-colors appearance-none cursor-pointer disabled:bg-slate-100/70 disabled:text-slate-400"
                      >
                        <option value="">Seleccionar tarifa</option>
                        {tarifa.map((item) => (
                          <option key={item.codigo.toString()} value={item.codigo.toString()}>
                            {item.zona}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    </div>
                  </div>

                  {/* Dirección */}
                  <div className="md:col-span-5">
                    <label className="block text-[10.5px] font-semibold text-slate-700 mb-0.5">
                      Dirección
                    </label>
                    <input
                      type="text"
                      placeholder="Dirección"
                      className={`h-8 w-full rounded-md border ${
                        errors.direccion ? 'border-red-400' : 'border-slate-200'
                      } bg-slate-50/50 px-2.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#113EB9] focus:outline-none transition-colors`}
                      {...register('direccion', { required: true })}
                    />
                  </div>

                  {/* Distrito */}
                  <div className="md:col-span-3">
                    <label className="block text-[10.5px] font-semibold text-slate-700 mb-0.5">
                      Distrito
                    </label>
                    <input
                      type="text"
                      placeholder="Distrito"
                      className={`h-8 w-full rounded-md border ${
                        errors.distrito ? 'border-red-400' : 'border-slate-200'
                      } bg-slate-50/50 px-2.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#113EB9] focus:outline-none transition-colors`}
                      {...register('distrito', { required: true })}
                    />
                  </div>
                </div>

                {/* Fila 2 de Servicio y Ubicación: Latitud, Longitud, Buscar dirección */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 mb-2">
                  {/* Latitud */}
                  <div className="md:col-span-2">
                    <label className="block text-[10.5px] font-semibold text-slate-700 mb-0.5">
                      Latitud
                    </label>
                    <input
                      type="text"
                      placeholder="-12.128900"
                      className={`h-8 w-full rounded-md border ${
                        errors.wy ? 'border-red-400' : 'border-slate-200'
                      } bg-slate-50/50 px-2.5 text-xs font-mono text-slate-800 focus:bg-white focus:border-[#113EB9] focus:outline-none transition-colors`}
                      {...register('wy', { required: true })}
                      onChange={(e) => {
                        setValue('wy', e.target.value, { shouldValidate: true });
                        const newLat = parseFloat(e.target.value);
                        const currLng = parseFloat(watch('wx'));
                        if (!isNaN(newLat) && !isNaN(currLng)) {
                          setMarkerPosition([newLat, currLng]);
                          setMapCenter([newLat, currLng]);
                        }
                      }}
                    />
                  </div>

                  {/* Longitud */}
                  <div className="md:col-span-2">
                    <label className="block text-[10.5px] font-semibold text-slate-700 mb-0.5">
                      Longitud
                    </label>
                    <input
                      type="text"
                      placeholder="-77.029400"
                      className={`h-8 w-full rounded-md border ${
                        errors.wx ? 'border-red-400' : 'border-slate-200'
                      } bg-slate-50/50 px-2.5 text-xs font-mono text-slate-800 focus:bg-white focus:border-[#113EB9] focus:outline-none transition-colors`}
                      {...register('wx', { required: true })}
                      onChange={(e) => {
                        setValue('wx', e.target.value, { shouldValidate: true });
                        const currLat = parseFloat(watch('wy'));
                        const newLng = parseFloat(e.target.value);
                        if (!isNaN(currLat) && !isNaN(newLng)) {
                          setMarkerPosition([currLat, newLng]);
                          setMapCenter([currLat, newLng]);
                        }
                      }}
                    />
                  </div>

                  {/* Buscar dirección */}
                  <div className="md:col-span-8 relative" style={{ zIndex: 1050 }}>
                    <label className="block text-[10.5px] font-semibold text-slate-700 mb-0.5">
                      Buscar dirección
                    </label>
                    <input
                      type="text"
                      placeholder="Escribe una dirección..."
                      className="h-8 w-full rounded-md border border-slate-200 bg-slate-50/50 px-2.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#113EB9] focus:outline-none transition-colors relative z-10"
                      value={searchInput}
                      onChange={handleSearchInputChange}
                      onFocus={() =>
                        searchResults.length > 0 && setShowSearchResults(true)
                      }
                      onBlur={() => {
                        setTimeout(() => setShowSearchResults(false), 200);
                      }}
                    />

                    {/* Resultados de búsqueda */}
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

                {/* Contenedor del mapa Leaflet (sin tocar lógica ni eventos de leaflet) */}
                <div
                  id="edit-leaflet-map-container"
                  className={`relative w-full overflow-hidden rounded-lg border border-slate-200 ${
                    isMapFullscreen
                      ? 'fixed inset-0 z-[9999] h-screen w-screen bg-white'
                      : 'h-[250px]'
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

                  {isClient &&
                    !isNaN(lat) &&
                    !isNaN(lng) &&
                    markerPosition[0] !== 0 &&
                    markerPosition[1] !== 0 && (
                      <div className="h-full w-full">
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

                          <MapResizer isFullscreen={isMapFullscreen} />
                          <MapClickHandler onMapClick={handleMapClick} />

                          <StaticMarker position={markerPosition} />
                        </MapContainer>
                      </div>
                    )}

                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-100">
                  {/* Enlace Google Maps con botón copiar */}
                  <div className="relative w-64 sm:w-80">
                    <input
                      type="text"
                      value={googleMapsLink}
                      readOnly
                      placeholder="Link de Google Maps"
                      className="h-8 w-full rounded-md border border-slate-200 bg-slate-50/50 pl-2.5 pr-8 text-[11px] font-mono text-slate-600 truncate focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
                      title="Copiar link"
                    >
                      {copied ? (
                        <MdCheck className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <MdContentCopy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Botones de acción */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleClose();
                        onClose();
                      }}
                      className="h-8 px-4 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
                    >
                      Cerrar
                    </button>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="h-8 px-4 rounded-md bg-[#007a4d] hover:bg-[#006640] text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-none disabled:opacity-50"
                    >
                      <Save className="h-3.5 w-3.5 stroke-[2.5]" />
                      <span>{isLoading ? 'Guardando...' : 'Guardar'}</span>
                    </button>
                  </div>
                </div>
              </form>
            </ModalBody>
          )}
        </ModalContent>
      </Modal>

      <style jsx global>{`
        @import url('https://unpkg.com/leaflet@1.7.1/dist/leaflet.css');

        /* Estilos para el modo fullscreen del mapa */
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

        body:has(#edit-leaflet-map-container:fullscreen) {
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden;
        }

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

        #edit-leaflet-map-container button {
          backdrop-filter: blur(5px);
          background: rgba(255, 255, 255, 0.95) !important;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2) !important;
        }

        #edit-leaflet-map-container:fullscreen > div,
        #edit-leaflet-map-container.fixed > div {
          width: 100% !important;
          height: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        #edit-leaflet-map-container {
          transition: all 0.2s ease-in-out;
        }
      `}</style>
    </>
  );
}
