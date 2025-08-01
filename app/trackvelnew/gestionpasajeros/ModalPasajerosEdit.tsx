'use client';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { AiFillCloseCircle } from 'react-icons/ai';
import { IoMdSave } from 'react-icons/io';
import Image from 'next/image';
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
  Tooltip,
} from '@nextui-org/react';
import { SelectorIcon } from '../planificacion/administracionturnos/SelectorIcon';
import { useForm, useFormContext } from 'react-hook-form';
import axios from 'axios';
import { BiEditAlt } from 'react-icons/bi';
import { useApi } from '@/context/ApiContext';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
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
  codCliente: number | null;
}

interface Pasajero {
  codlan: string;
  apellidos: string;
  telefono: string | null;
  sexo: string | null;
  empresa: string;
  zona: string | null;
  direccion: string;
  distrito: string;
  wy: string;
  wx: string;
}

// Interfaz para los resultados de búsqueda de Nominatim
interface NominatimResult {
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

// Componente para el marcador estático (no draggable)
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

export default function App({ title, codCliente }: Props) {
  useEffect(() => {
    if (codCliente !== null) {
      console.log('CodCliente en ModalPasajerosEdit:', codCliente);
    }
  }, [codCliente]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    clearErrors,
    watch,
  } = useForm({
    defaultValues: {
      codlan: '',
      apellidos: '',
      telefono: '',
      sexo: '',
      empresa: '',
      zona: '',
      direccion: '',
      distrito: '',
      wy: '',
      wx: '',
    },
  });

  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
  const [tarifa, setTarifa] = useState<{ zona: string }[]>([]);
  const [isTarifaLoaded, setIsTarifaLoaded] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  
  const { baseUrl } = useApi();
  const [isBaseUrlReady, setIsBaseUrlReady] = useState(false);
  const { data: session } = useSession();
  const username = session?.user.username;

  const mapRef = useRef<LeafletMap | null>(null);

  //MAPA
  const wy = watch('wy');
  const wx = watch('wx');

  const lat = parseFloat(wy);
  const lng = parseFloat(wx);

  const [markerPosition, setMarkerPosition] = useState<[number, number]>([0, 0]);
  const [originalPosition, setOriginalPosition] = useState<[number, number]>([0, 0]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([-12.0464, -77.0428]); // Lima, Perú

  // Configurar iconos de Leaflet cuando se carga el cliente
  useEffect(() => {
    setIsClient(true);
    
    // Configurar iconos de Leaflet solo en el cliente
    if (typeof window !== 'undefined') {
      import('leaflet').then((L) => {
        const DefaultIcon = L.Icon.Default;
        const iconPrototype = DefaultIcon.prototype as { _getIconUrl?: () => void };
        delete iconPrototype._getIconUrl;
        
        // Configurar nuevos iconos
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });
      });
    }
  }, []);

  // Función para buscar direcciones usando Nominatim (OpenStreetMap)
  const searchAddress = async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=pe`
      );
      setSearchResults(response.data);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Error searching address:', error);
    }
  };

  // Función para geocodificación inversa (obtener dirección desde coordenadas)
  const reverseGeocode = async (lat: number, lng: number) => {
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
      console.error('Error in reverse geocoding:', error);
      return null;
    }
  };

  // Manejar selección de dirección de los resultados de búsqueda
  const handleAddressSelect = (result: NominatimResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    
    setMarkerPosition([lat, lng]);
    setMapCenter([lat, lng]);
    setSearchInput(result.display_name);
    setShowSearchResults(false);

    // Extraer distrito de la dirección si está disponible
    const addressParts = result.display_name.split(', ');
    const possibleDistrict = addressParts.find(part => 
      part.includes('Lima') || 
      part.includes('Distrito') || 
      addressParts.indexOf(part) === 1 || 
      addressParts.indexOf(part) === 2
    ) || '';

    // Actualizar el formulario
    reset((prev) => ({
      ...prev,
      direccion: result.display_name,
      distrito: possibleDistrict,
      wy: lat.toString(),
      wx: lng.toString(),
    }));

    // Centrar el mapa en la nueva ubicación
    if (mapRef.current) {
      mapRef.current.setView([lat, lng], 15);
    }
  };

  // Función con debounce para búsqueda
  const debounceSearchRef = useRef<NodeJS.Timeout | null>(null);

  // Manejar cambios en el input de búsqueda
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    
    // Limpiar timeout anterior
    if (debounceSearchRef.current) {
      clearTimeout(debounceSearchRef.current);
    }
    
    // Crear nuevo timeout para debounce
    debounceSearchRef.current = setTimeout(() => {
      searchAddress(value);
    }, 300);
  };

  // Manejar clics en el mapa
  const handleMapClick = async (lat: number, lng: number) => {
    setMarkerPosition([lat, lng]);
    
    // Actualizar coordenadas inmediatamente
    reset((prev) => ({
      ...prev,
      wy: lat.toString(),
      wx: lng.toString(),
    }));

    // Obtener dirección mediante geocodificación inversa
    const geocodeResult = await reverseGeocode(lat, lng);
    if (geocodeResult) {
      setSearchInput(geocodeResult.address);
      reset((prev) => ({
        ...prev,
        wy: lat.toString(),
        wx: lng.toString(),
        direccion: geocodeResult.address,
        distrito: geocodeResult.district,
      }));
    }
  };

  const handleClose = () => {
    // Restablece las coordenadas y el marcador a los valores originales
    reset((prev) => ({
      ...prev,
      wy: originalPosition[0].toString(),
      wx: originalPosition[1].toString(),
    }));
    setMarkerPosition(originalPosition);
    setMapCenter(originalPosition[0] !== 0 && originalPosition[1] !== 0 ? originalPosition : [-12.0464, -77.0428]);
    setSearchInput('');
    setSearchResults([]);
    setShowSearchResults(false);
  };

  useEffect(() => {
    if (!isOpen) {
      handleClose(); // Cuando el modal se cierre, restablecemos la posición
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

    const fetchPasajeroDetail = async () => {
      try {
        const response = await axios.get(
          `${baseUrl}/api/Pasajero/Detail/${codCliente}`,
        );
        const pasajeroData = response.data[0];

        console.log('Datos del pasajero:', pasajeroData);

        //mapa
        const lat = parseFloat(pasajeroData.wy) || 0;
        const lng = parseFloat(pasajeroData.wx) || 0;
        //

        reset({
          codlan: pasajeroData.codlan || '',
          apellidos: pasajeroData.apellidos || '',
          telefono: pasajeroData.telefono || '',
          sexo: pasajeroData.sexo === 'M' ? 'M' : 'F',
          empresa: pasajeroData.empresa || '',
          zona: pasajeroData.zona || '',
          direccion: pasajeroData.direccion || '',
          distrito: pasajeroData.distrito || '',
          wy: pasajeroData.wy || '',
          wx: pasajeroData.wx || '',
        });

        setMarkerPosition([lat, lng]);
        setOriginalPosition([lat, lng]);
        setMapCenter([lat, lng]);
        setSearchInput(pasajeroData.direccion || '');
      } catch (error) {
        console.error('Error fetching pasajero detail:', error);
      }
    };

    fetchPasajeroDetail();
  }, [isBaseUrlReady, baseUrl, codCliente, isTarifaLoaded, reset]);

  const onSubmit = handleSubmit(async (data) => {
    if (!baseUrl || codCliente === null || username === null) return;

    try {
      const codlan = data.codlan;
      console.log('Datos enviados:', {
        codlan: data.codlan,
        apellidos: data.apellidos,
        telefono: data.telefono,
        sexo: data.sexo,
        empresa: data.empresa,
        zona: data.zona,
        direccion: data.direccion,
        distrito: data.distrito,
        wy: data.wy,
        wx: data.wx,
      });
      const response = await axios.put(
        `${baseUrl}/api/Pasajero/Update/${username}/${codCliente}/${codlan}`,
        {
          codlan: data.codlan,
          apellidos: data.apellidos,
          telefono: data.telefono,
          sexo: data.sexo,
          empresa: data.empresa,
          zona: data.zona,
          direccion: data.direccion,
          distrito: data.distrito,
          wy: data.wy,
          wx: data.wx,
        },
      );

      console.log('Pasajero actualizado con éxito:', response.data);
      onClose();
      toast.success('Pasajero actualizado'); // 🎉 Aquí el toast
    } catch (error) {
      console.error('Error al actualizar el pasajero:', error);
      toast.error('Error al actualizar el pasajero');
    }
  });

  return (
    <>
      <span className="cursor-pointer text-lg text-default-400 active:opacity-50">
        <button
          onClick={onOpen}
          className="inline-flex items-center gap-2 rounded-md bg-blue-500 px-4 py-2 text-sm text-white shadow-sm transition hover:bg-blue-600"
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
                <ModalHeader className="cabecera gap-1">
                  <Image
                    src="/gpsLogo.png"
                    width={40}
                    height={40}
                    alt="Picture of the author"
                  />
                  {title}
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
                          placeholder="912789654"
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
                          {...register('zona')}
                          isDisabled={!isTarifaLoaded}
                        >
                          {tarifa.map((item, index) => (
                            <SelectItem key={index} value={item.zona}>
                              {item.zona}
                            </SelectItem>
                          ))}
                        </Select>
                      </div>

                      <div className="mensajeR w-full">
                        <Input
                          type="text"
                          label="Dirección"
                          placeholder="Dirección"
                          labelPlacement="outside"
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

                      <div className="mensajeR w-full">
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
                          {...register('wy', {
                            required: true,
                          })}
                        />

                        {errors.wy && (
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
                          {...register('wx', {
                            required: true,
                          })}
                        />

                        {errors.wx && (
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
                      {isClient && !isNaN(lat) && !isNaN(lng) && markerPosition[0] !== 0 && markerPosition[1] !== 0 && (
                        <div className="w-full h-[400px] rounded-lg overflow-hidden">
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
                            
                            <StaticMarker 
                              position={markerPosition}
                            />
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
                  >
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