
import { useForm } from 'react-hook-form';
import React, { useEffect, useState } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  useDisclosure,
  Tooltip,
} from '@nextui-org/react';
import { PlusIcon } from './PlusIcon';
import { Input } from '@nextui-org/react';
import { Select, SelectItem } from '@nextui-org/react';
import { ImUserPlus } from 'react-icons/im';
import { MdAddToPhotos } from 'react-icons/md';
import { TimeInput } from '@nextui-org/react';
import { ClockCircleLinearIcon } from './ClockCircleLinearIcon';
import { Time } from '@internationalized/date';
import { SelectorIcon } from './SelectorIcon';
import { IoSave } from 'react-icons/io5';
import { IoMdCloseCircle } from 'react-icons/io';
import axios from 'axios';
import { EditIcon } from '@/app/components/table/operaciones/EditIcon';


interface User {
  codigo: string; 
  empresa: string;
  area: string;
  subarea: string;
  rol: string;
  programacion: string;
  hora: string; 
}

interface Props {
  titleM: string;
  user: User;
}

const mapProgramacion = (programacion: string) => {
  switch (programacion) {
    case '1':
      return 'actual';
    case '2':
      return 'futura';
    case '3':
      return 'pasada';
    default:
      return ''; 
  }
};


export default function App({ titleM, user }: Props) {
  
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      empresa: user.empresa,
      area: user.area,
      subarea: user.subarea,
      rol: user.rol,
      programacion: mapProgramacion(user.programacion),
    }
  });

  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const [empresas, setEmpresas] = useState<string[]>([]);

  const [hora, setHora] = useState<Time>(
    new Time(
      parseInt(user.hora.slice(0, 2), 10), // Convierte las horas a número
      parseInt(user.hora.slice(3, 5), 10)  // Convierte los minutos a número
    )
  );
  


  const onSubmit = async (data: any) => {
    if (Object.keys(errors).length === 0) {
      const formattedHora = hora.toString().slice(0, 5);
      data.hora = formattedHora;

      switch (data.programacion) {
        case 'actual':
          data.programacion = "1";
          break;
        case 'futura':
          data.programacion = "2";
          break;
        case 'pasada':
          data.programacion = "3";
          break;
        default:
          data.programacion = "1";
      }


      const putData  = {
        codrl: data.rol,
        hora: data.hora,
        tipo: 'I',
        area: data.area,
        subarea: data.subarea,
        empresa: data.empresa,
        programa: data.programacion,
      };

      try {
        await axios.put(
          `https://localhost:7223/api/Turnos/${user.codigo}`, 
          putData,
        );
        console.log('Datos actualizados correctamente', putData);
      } catch (error) {
        console.error('Error al actualizar los datos:', error);
      }
      
    } else {
      console.log('Errores de validación:', errors);
    }
  };
  return (
    <>
      <Tooltip color="primary" content="Editar Turno">
        <span className="cursor-pointer text-sm text-[#0d47a1] active:opacity-50">
          <Button
            onPress={onOpen}
            isIconOnly
            variant="light"
            color="primary"
            size="sm"
            className="btnEdit"
          >
            <EditIcon />
          </Button>
        </span>
      </Tooltip>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="2xl">
        <form action="" onSubmit={handleSubmit(onSubmit)}>
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="titleModal flex gap-1">
                  Modificar Turno / {titleM}
                  <MdAddToPhotos />
                </ModalHeader>
                <ModalBody>
                  <div className="contenidoModal flex flex-col gap-4 contenidoEdit">
              
                    <div className="mb-6 flex w-full flex-wrap gap-4 md:mb-0 md:flex-nowrap">
                      <div className="mensajeR">
                        <Input
                          type="text"
                          label="Área"
                          placeholder="Área"
                          labelPlacement="outside"
                          {...register('area', {
                            required: true,
                          })}
                        />
                        {errors.area && (
                          <span className="errorMesageUserI">
                            Nombre de área es requerido
                          </span>
                        )}
                      </div>
                      <div className="mensajeR">
                        <Input
                          type="text"
                          label="Sub Área"
                          placeholder="Sub área"
                          labelPlacement="outside"
                          {...register('subarea', {
                            required: true,
                          })}
                        />
                        {errors.subarea && (
                          <span className="errorMesageUserI">
                            Nombre de sub área es requerido
                          </span>
                        )}
                      </div>

                      <div className="mensajeR">
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
                          {...register('rol', {
                            required: true,
                          })}
                        />

                        {errors.rol && (
                          <span className="errorMesageUserI">
                            Rol es requerido
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mb-6 flex w-full flex-wrap gap-4 md:mb-0 md:flex-nowrap">
                      <TimeInput
                        label="Hora"
                        labelPlacement="outside"
                        value={hora}
                        onChange={(value) => setHora(value)}
                        startContent={
                          <ClockCircleLinearIcon className="pointer-events-none flex-shrink-0 text-xl text-default-400" />
                        }
                      />

                      <div className="mensajeR anchoP">
                        <Select
                          label="Programación"
                          placeholder="Seleccione una Programación"
                          labelPlacement="outside"
                          className="max-w-xs"
                          disableSelectorIconRotation
                          selectorIcon={<SelectorIcon />}
                          {...register('programacion', {
                            required: true,
                          })}
                        >
                          <SelectItem key="actual" value="actual">Fecha Actual</SelectItem>
                            <SelectItem key="futura" value="futura">Fecha Futura</SelectItem>
                            <SelectItem key="pasada" value="pasada">Fecha Pasada</SelectItem>
                        </Select>

                        {errors.programacion && (
                          <span className="errorMesageUserI">
                            Programación es requerido
                          </span>
                        )}
                      </div>
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
                  <Button color="primary" type="submit">
                    Guardar
                    <IoSave size={16} />
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
