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
} from '@nextui-org/react';
import { Input } from '@nextui-org/react';
import { Select, SelectItem } from '@nextui-org/react';
import { ImUserPlus } from 'react-icons/im';
import { MdAddToPhotos } from 'react-icons/md';
import { TimeInput } from '@nextui-org/react';
import { ClockCircleLinearIcon } from './ClockCircleLinearIcon';
import { Time } from '@internationalized/date';
import { SelectorIcon } from './SelectorIcon';
import { IoSave } from 'react-icons/io5';
import { IoMdAdd, IoMdCloseCircle } from 'react-icons/io';
import axios from 'axios';
import { toast, Toaster } from 'sonner';
import { useUsername } from '@/hooks/useUsername';

interface Props {
  titleM: string;
  onSaveSuccess: () => void;
}

export default function App({ titleM, onSaveSuccess }: Props) {
  const { username, isReady } = useUsername();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    clearErrors,
  } = useForm();

  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [empresas, setEmpresas] = useState<string[]>([]);
  const [hora, setHora] = useState<Time>(new Time(12));
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isReady) return;

    axios
      .get(`https://velsat.pe:2096/api/Turnos/empresa/${username}`)
      .then((response) => {
        setEmpresas(response.data);
      })
      .catch((error) => {
        console.error('Error fetching areas:', error);
      });
  }, [username, isReady]);

  useEffect(() => {
    if (!isOpen) {
      // Solo cuando se cierra el modal
      reset();
      clearErrors();
    }
  }, [isOpen, reset, clearErrors]);

  const onSubmit = async (data: any, onClose: () => void) => {
    if (!isReady) {
      return;
    }
    if (Object.keys(errors).length === 0) {
      const formattedHora = hora.toString().slice(0, 5);
      data.hora = formattedHora;

      switch (data.programacion) {
        case 'actual':
          data.programacion = '1';
          break;
        case 'futura':
          data.programacion = '2';
          break;
        case 'pasada':
          data.programacion = '3';
          break;
        default:
          data.programacion = '1';
      }

      const tipo =
        titleM.toUpperCase() === 'INGRESO'
          ? 'I'
          : titleM.toUpperCase() === 'SALIDA'
            ? 'S'
            : 'I';

      const postData = {
        codrl: data.rol,
        hora: data.hora,
        tipo,
        area: data.area,
        subarea: data.subarea,
        empresa: data.empresa,
        programa: data.programacion,
      };

      console.log('Datos a enviar:', postData);

      try {
        setIsSubmitting(true);
        await axios.post(
          `https://velsat.pe:2096/api/Turnos/${username}`,
          postData,
        );
        console.log('Datos enviados correctamente', postData);
        onSaveSuccess();
        toast.success('Turno creado exitosamente');
        onClose();
      } catch (error) {
        console.error('Error al enviar los datos:', error);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      console.log('Errores de validación:', errors);
    }
  };

  return (
    <>
      <Button
        onPress={onOpen}
        style={{ background: '#F7931E', color: '#212529' }}
        className="text-background"
        endContent={<IoMdAdd />}
        size="sm"
      >
        Nuevo Turno
      </Button>
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="2xl">
        <form
          action=""
          onSubmit={handleSubmit((data) => onSubmit(data, onOpenChange))}
        >
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="titleModal flex gap-1">
                  Nuevo Turno / {titleM}
                  <MdAddToPhotos />
                </ModalHeader>
                <ModalBody>
                  <div className="contenidoModal flex flex-col gap-4">
                    <div className="mensajeR mb-6 flex w-full flex-wrap gap-4 md:mb-0 md:flex-nowrap">
                      <Select
                        variant="underlined"
                        label="Seleccione una Empresa"
                        className="max-w-full"
                        {...register('empresa', {
                          required: true,
                        })}
                      >
                        {empresas.map((empresa) => (
                          <SelectItem key={empresa}>{empresa}</SelectItem>
                        ))}
                      </Select>

                      {errors.empresa && (
                        <span className="errorMesageUser">
                          Nombre es requerido
                        </span>
                      )}
                    </div>
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
                        onChange={(value) => setHora(value || new Time(12))}
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
                          <SelectItem key="actual">Fecha Actual</SelectItem>
                          <SelectItem key="futura">Fecha Futura</SelectItem>
                          <SelectItem key="pasada">Fecha Pasada</SelectItem>
                        </Select>

                        {errors.programacion && (
                          <span className="errorMesageUserI">
                            Programación es requerido
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </ModalBody>
                <ModalFooter>
                  <Button color="danger" onPress={onClose}>
                    Cerrar
                    <IoMdCloseCircle size={16} />
                  </Button>
                  <Button
                    color="primary"
                    type="submit"
                    isDisabled={isSubmitting}
                  >
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
