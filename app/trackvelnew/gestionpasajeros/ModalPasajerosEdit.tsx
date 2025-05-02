'use client';
import React, { useEffect, useState, useCallback } from 'react';
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

import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';

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
  const { baseUrl } = useApi();
  const [isBaseUrlReady, setIsBaseUrlReady] = useState(false);
  const { data: session } = useSession();
  const username = session?.user.username;

  //MAPA
  const wy = watch('wy');
  const wx = watch('wx');

  const lat = parseFloat(wy);
  const lng = parseFloat(wx);

  const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string;

  const [markerPosition, setMarkerPosition] = useState<{
    lat: number;
    lng: number;
  }>({ lat: 0, lng: 0 });
  const [originalPosition, setOriginalPosition] = useState<{
    lat: number;
    lng: number;
  }>({ lat: 0, lng: 0 });

  const containerStyle = {
    width: '100%',
    height: '250px',
  };

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: API_KEY,
    libraries: ['places'], // ← importante
  });

  const handleClose = () => {
    // Restablece las coordenadas y el marcador a los valores originales
    reset((prev) => ({
      ...prev,
      wy: originalPosition.lat.toString(),
      wx: originalPosition.lng.toString(),
    }));
    setMarkerPosition(originalPosition);
  };

  useEffect(() => {
    if (!isOpen) {
      handleClose(); // Cuando el modal se cierre, restablecemos la posición
    }
  }, [isOpen]); 
  //FIN MAPA

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

        setMarkerPosition({ lat, lng });
        setOriginalPosition({ lat, lng });
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
      console.log("Datos enviados:", {
          codlan: data.codlan,
          apellidos: data.apellidos,
          telefono: data.telefono,
          sexo: data.sexo,
          empresa: data.empresa,
          zona: data.zona,
          direccion: data.direccion,
          distrito: data.distrito,
          wy: data.wy,
          wx: data.wx
      });
      const response = await axios.put(
        `${baseUrl}/api/Pasajero/Update/${username}/${codCliente}/${codlan}`,{
          codlan: data.codlan,
          apellidos: data.apellidos,
          telefono: data.telefono,
          sexo: data.sexo,
          empresa: data.empresa,
          zona: data.zona,
          direccion: data.direccion,
          distrito: data.distrito,
          wy: data.wy,
          wx: data.wx
    });
  
      console.log('Pasajero actualizado con éxito:', response.data);
      onClose();
      toast.success('Pasajero actualizado'); // 🎉 Aquí el toast
    } catch (error) {
      console.error('Error al actualizar el pasajero:', error);
      toast.error('Error al agregar el pasajero');
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
        size="2xl"
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
                      <div className="mensajeR">
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

                      <div className="mensajeR">
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

                      <div className="mensajeR">
                        <Input
                          type="text"
                          label="Teléfono"
                          placeholder="912789654"
                          labelPlacement="outside"
                          {...register('telefono')}
                        />
                      </div>

                      <div className="mensajeR w-[70px]">
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
                      <Select
                        label="Empresa"
                        placeholder="Selecciona una empresa"
                        labelPlacement="outside"
                        className="max-w-xs"
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

                    <div className="mb-6 flex w-full flex-wrap gap-4 md:mb-0 md:flex-nowrap">
                      <div className="mensajeR">
                        <Input
                          type="text"
                          label="Dirección"
                          placeholder="Dirección"
                          labelPlacement="outside"
                          className="md:w-[400px]"
                          {...register('direccion', {
                            required: true,
                          })}
                        />

                        {errors.direccion && (
                          <span className="errorMesageUserI">
                            Nombre es requerido
                          </span>
                        )}
                      </div>

                      <div className="mensajeR">
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
                            Nombre es requerido
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
                          className="cursor-default pointer-events-none"

                          {...register('wy', {
                            required: true,
                          })}
                        />

                        {errors.wy && (
                          <span className="errorMesageUserI">
                            Nombre es requerido
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
                          className="cursor-default pointer-events-none"
                          {...register('wx', {
                            required: true,
                          })}
                        />

                        {errors.wx && (
                          <span className="errorMesageUserI">
                            Nombre es requerido
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      {isLoaded && !isNaN(lat) && !isNaN(lng) && (
                        <div className="w-full">
                          <GoogleMap
                            mapContainerStyle={containerStyle}
                            center={{ lat, lng }}
                            zoom={18}
                          >
                            <Marker
                              position={markerPosition}
                              draggable={true}
                              onDragEnd={(e) => {
                                const newLat = e.latLng?.lat() || 0;
                                const newLng = e.latLng?.lng() || 0;
                                setMarkerPosition({ lat: newLat, lng: newLng });

                                // Actualiza los campos del formulario
                                reset((prev) => ({
                                  ...prev,
                                  wy: newLat.toString(),
                                  wx: newLng.toString(),
                                }));
                              }}
                            />
                          </GoogleMap>
                        </div>
                      )}
                    </div>
                  </div>
                </ModalBody>
                <ModalFooter>
                  <Button color="danger" onPress={() => { handleClose(); onClose(); }}>
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
    </>
  );
}
