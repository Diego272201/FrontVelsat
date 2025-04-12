'use client';
import React, { useEffect, useState } from 'react';
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
import { useForm } from 'react-hook-form';
import axios from 'axios';
import { BiEditAlt } from 'react-icons/bi';

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

export default function App({ title,  codCliente }: Props) {
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

  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [tarifa, setTarifa] = useState<{ zona: string }[]>([]);
  const [isTarifaLoaded, setIsTarifaLoaded] = useState(false);

  useEffect(() => {
    axios
      .get('https://66.240.210.125:8586/api/Pasajero/Tarifa/movilbus')
      .then((response) => {
        setTarifa(response.data);
        setIsTarifaLoaded(true);
      })
      .catch((error) => {
        console.log('Error fetching: ', error);
      });
  }, []);

  useEffect(() => {
    if (codCliente !== null && isTarifaLoaded) {
      axios
        .get(`https://66.240.210.125:8586/api/Pasajero/Detail/${codCliente}`)
        .then((response) => {
          const pasajeroData = response.data[0];
          console.log('Datos del pasajero:', pasajeroData);

          reset({
            codlan: pasajeroData.codlan || '',
            apellidos: pasajeroData.apellidos || '',
            telefono: pasajeroData.telefono || '',
            sexo: pasajeroData.sexo === 'M' ? 'masculino' : 'femenino',
            empresa: pasajeroData.empresa || '',
            zona: pasajeroData.zona || '',
            direccion: pasajeroData.direccion || '',
            distrito: pasajeroData.distrito || '',
            wy: pasajeroData.wy || '',
            wx: pasajeroData.wx || '',
          });
        })
        .catch((error) => {
          console.log('Error fetching pasajero detail: ', error);
        });
    }
  }, [codCliente, isTarifaLoaded, reset]);

  const onSubmit = handleSubmit((data) => {
    console.log('Datos enviados:', data);
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
                    </div>
                    <div className="mb-6 flex w-full flex-wrap gap-4 md:mb-0 md:flex-nowrap">
                      <Select
                        label="Sexo"
                        placeholder="Selecciona el sexo"
                        labelPlacement="outside"
                        className="max-w-xs"
                        disableSelectorIconRotation
                        selectorIcon={<SelectorIcon />}
                        {...register('sexo')}
                      >
                        <SelectItem key="masculino">Masculino</SelectItem>
                        <SelectItem key="femenino">Femenino</SelectItem>
                      </Select>
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

                    <div>Diego coloca el Google maps:</div>
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
