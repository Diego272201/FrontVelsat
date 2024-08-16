import React, { useEffect, useState } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  useDisclosure,
} from '@nextui-org/react';
import { PlusIcon } from './PlusIcon';
import { Input } from '@nextui-org/react';
import { Select, SelectItem } from '@nextui-org/react';
import { animals } from './data';
import { ImUserPlus } from 'react-icons/im';
import { MdAddToPhotos } from 'react-icons/md';
import { TimeInput } from '@nextui-org/react';
import { ClockCircleLinearIcon } from './ClockCircleLinearIcon';
import { Time } from '@internationalized/date';
import { SelectorIcon } from './SelectorIcon';
import { IoSave } from 'react-icons/io5';
import { IoMdCloseCircle } from 'react-icons/io';
import axios from 'axios';

export default function App() {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [empresas, setEmpresas] = useState<string[]>([]);

  useEffect(() => {
    axios
      .get('http://66.240.210.125:8586/api/Turnos/empresa/movilbus')
      .then((response) => {
        setEmpresas(response.data);
      })
      .catch((error) => {
        console.error('Error fetching areas:', error);
      });
  }, []);

  return (
    <>
      <Button
        onPress={onOpen}
        style={{ background: '#FF6300' }}
        className="text-background"
        endContent={<PlusIcon />}
        size="sm"
      >
        Nuevo Turno
      </Button>
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="2xl">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="titleModal flex gap-1">
                Nuevo Turno / Ingreso
                <MdAddToPhotos />
              </ModalHeader>
              <ModalBody>
                <div className="contenidoModal flex flex-col gap-4">
                  <div className="mb-6 flex w-full flex-wrap gap-4 md:mb-0 md:flex-nowrap">
                    <Select
                      variant="underlined"
                      label="Seleccione una Empresa"
                      className="max-w-full"
                    >
                      {empresas.map((empresa) => (
                        <SelectItem key={empresa}>{empresa}</SelectItem>
                      ))}
                    </Select>
                  </div>
                  <div className="mb-6 flex w-full flex-wrap gap-4 md:mb-0 md:flex-nowrap">
                    <Input
                      type="text"
                      label="Área"
                      placeholder="Área"
                      labelPlacement="outside"
                    />
                    <Input
                      type="text"
                      label="Sub Área"
                      placeholder="Sub área"
                      labelPlacement="outside"
                    />
                    <Input
                      type="text"
                      label="Rol"
                      placeholder="Rol"
                      labelPlacement="outside"
                      endContent={
                        <div className="pointer-events-none flex items-center">
                          <span className="text-small text-default-400">
                            <ImUserPlus />
                          </span>
                        </div>
                      }
                    />
                  </div>
                  <div className="mb-6 flex w-full flex-wrap gap-4 md:mb-0 md:flex-nowrap">
                    <TimeInput
                      label="Hora"
                      labelPlacement="outside"
                      defaultValue={new Time(12)}
                      startContent={
                        <ClockCircleLinearIcon className="pointer-events-none flex-shrink-0 text-xl text-default-400" />
                      }
                    />

                    <Select
                      label="Programación"
                      placeholder="Seleccione una Empresa"
                      labelPlacement="outside"
                      className="max-w-xs"
                      disableSelectorIconRotation
                      selectorIcon={<SelectorIcon />}
                    >
                      <SelectItem key="actual">Fecha Actual</SelectItem>
                      <SelectItem key="pasada">Fecha Pasada</SelectItem>
                      <SelectItem key="futura">Fecha Futura</SelectItem>
                    </Select>
                  </div>

                  {/* <div className="mb-6 flex w-full flex-wrap gap-4 md:mb-0 md:flex-nowrap">

                  <h2 className='mensajeIngreso'>Tipo (Ingreso/Salida) : Ingreso <FaCheck />
                  </h2>

                  </div> */}
                </div>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" onPress={onClose}>
                  Cerrar
                  <IoMdCloseCircle size={16} />
                </Button>
                <Button color="primary" onPress={onClose}>
                  Guardar
                  <IoSave size={16} />
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
