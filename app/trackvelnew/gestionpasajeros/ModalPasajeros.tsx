'use client';
import React, { useEffect, useState } from 'react';
import { AiFillCloseCircle } from 'react-icons/ai';
import { IoIosAddCircle, IoMdSave } from 'react-icons/io';
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
import { useForm } from 'react-hook-form';
import axios from 'axios';
import { useApi } from '@/context/ApiContext';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

interface Props {
  title: string;
}

export default function App({ title }: Props) {
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

  const { baseUrl } = useApi();
  const [isBaseUrlReady, setIsBaseUrlReady] = useState(false);
  const { data: session } = useSession();
  const username = session?.user.username;

  //MAPA
  const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string;

  const [markerPosition, setMarkerPosition] = useState<{
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
  });

  const handleClose = () => {
    // Restablece las coordenadas y el marcador a los valores originales
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
    setMarkerPosition({ lat: 0, lng: 0 });
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
          `${baseUrl}/api/Pasajero/Tarifa/movilbus`,
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
        `https://velsat.pe:8586/api/Pasajero/New/${username}`,
        body,
      );
      console.log('Pasajero registrado correctamente:', response.data);
      onClose(); // Cierra el modal al terminar
      toast.success('Nuevo pasajero agregado');
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
          className="inline-flex items-center gap-2 rounded-md bg-emerald-500 px-4 py-2 text-sm text-white shadow-sm transition hover:bg-emerald-600"
        >
          <IoIosAddCircle className="text-white" size={18} />
          Nuevo
        </button>
      </span>

      <Modal
      className="w-[70%] max-w-none"
      isOpen={isOpen}
        onOpenChange={onOpenChange}
        isDismissable={true}
        isKeyboardDismissDisabled={true}
      >
        <form action="" onSubmit={onSubmit}>
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="gap-1 flex items-center">
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
                    <div className="flex justify-between flex-wrap">
                      <div >
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

                      <div >
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

                    <div className="flex justify-between flex-wrap">
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


                      <div >
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
                            Nombre es requerido
                          </span>
                        )}
                      </div>

                      <div >
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
                          className="pointer-events-none cursor-default"
                          {...register('latitud', {
                            required: true,
                          })}
                        />

                        {errors.latitud && (
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
                          className="pointer-events-none cursor-default"
                          {...register('longitud', {
                            required: true,
                          })}
                        />

                        {errors.longitud && (
                          <span className="errorMesageUserI">
                            Nombre es requerido
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      {isLoaded && (
                        <div className="w-full">
                          <GoogleMap
                            mapContainerStyle={containerStyle}
                            center={
                              markerPosition.lat !== 0 &&
                              markerPosition.lng !== 0
                                ? markerPosition
                                : { lat: -12.0464, lng: -77.0428 } // Centro predeterminado solo al inicio
                            }
                            zoom={
                              markerPosition.lat !== 0 &&
                              markerPosition.lng !== 0
                                ? 13
                                : 5
                            }
                            onClick={(e) => {
                              const lat = e.latLng?.lat() || 0;
                              const lng = e.latLng?.lng() || 0;
                              setMarkerPosition({ lat, lng });

                              reset((prev) => ({
                                ...prev,
                                latitud: lat.toString(),
                                longitud: lng.toString(),
                              }));
                            }}
                          >
                            {markerPosition.lat !== 0 &&
                              markerPosition.lng !== 0 && (
                                <Marker
                                  position={markerPosition}
                                  draggable={true}
                                  onDragEnd={(e) => {
                                    const newLat = e.latLng?.lat() || 0;
                                    const newLng = e.latLng?.lng() || 0;
                                    setMarkerPosition({
                                      lat: newLat,
                                      lng: newLng,
                                    });

                                    reset((prev) => ({
                                      ...prev,
                                      latitud: newLat.toString(),
                                      longitud: newLng.toString(),
                                    }));
                                  }}
                                />
                              )}
                          </GoogleMap>
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
    </>
  );
}
