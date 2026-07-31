import { useForm } from 'react-hook-form';
import React, { useEffect, useState } from 'react';
import {
  Button,
  useDisclosure,
  Input,
  Select,
  SelectItem,
  TimeInput,
} from '@nextui-org/react';
import { ImUserPlus } from 'react-icons/im';
import { MdAddToPhotos } from 'react-icons/md';
import { ClockCircleLinearIcon } from './ClockCircleLinearIcon';
import { Time } from '@internationalized/date';
import { SelectorIcon } from './SelectorIcon';
import { IoMdAdd } from 'react-icons/io';
import axios from 'axios';
import { toast } from 'sonner';
import { useUsername } from '@/hooks/useUsername';
import BaseModal from '@/app/components/ui/BaseModal';

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
      .get(`https://do.velsat.pe:2083/api/Turnos/empresa/${username}`)
      .then((response) => {
        setEmpresas(response.data);
      })
      .catch((error) => {
        console.error('Error fetching areas:', error);
      });
  }, [username, isReady]);

  useEffect(() => {
    if (!isOpen) {
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

      try {
        setIsSubmitting(true);
        await axios.post(
          `https://do.velsat.pe:2083/api/Turnos/${username}`,
          postData,
        );
        onSaveSuccess();
        toast.success('Turno creado exitosamente');
        onClose();
      } catch (error) {
        console.error('Error al enviar los datos:', error);
        toast.error('Error al guardar el turno');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleClose = () => {
    onOpenChange();
  };

  return (
    <>
      <Button
        onPress={onOpen}
        className="bg-brandSecondary hover:bg-brandSecondary-hover text-white text-xs font-medium h-8 px-3 rounded-md shadow-xs transition-colors"
        endContent={<IoMdAdd />}
        size="sm"
      >
        Nuevo Turno
      </Button>

      <BaseModal
        isOpen={isOpen}
        onClose={handleClose}
        title={`Nuevo Turno / ${titleM}`}
        subtitle="Complete la información para registrar un nuevo turno"
        icon={<MdAddToPhotos className="h-4 w-4 text-emerald-600" />}
        iconBgColor="bg-emerald-100"
        size="2xl"
        confirmText="Guardar Turno"
        cancelText="Cancelar"
        onConfirm={handleSubmit((data) => onSubmit(data, handleClose))}
        isLoading={isSubmitting}
        confirmButtonClass="bg-brandSecondary hover:bg-brandSecondary-hover text-white"
      >
        <form onSubmit={handleSubmit((data) => onSubmit(data, handleClose))} className="space-y-4 pt-1">
          <div className="rounded-md border border-slate-200 bg-slate-50/60 p-3 space-y-3">
            <div className="flex flex-col gap-1">
              <Select
                label="Empresa"
                placeholder="Seleccione una Empresa"
                labelPlacement="outside"
                size="sm"
                className="w-full"
                classNames={{
                  trigger: 'h-9 min-h-[36px] bg-white border border-slate-300 rounded-md text-xs',
                  label: 'text-xs font-medium text-slate-700',
                }}
                {...register('empresa', {
                  required: true,
                })}
              >
                {empresas.map((empresa) => (
                  <SelectItem key={empresa} className="text-xs">{empresa}</SelectItem>
                ))}
              </Select>

              {errors.empresa && (
                <span className="text-[11px] text-red-600 font-medium">
                  Empresa requerida
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <Input
                  type="text"
                  label="Área"
                  placeholder="Área"
                  labelPlacement="outside"
                  size="sm"
                  classNames={{
                    inputWrapper: 'h-9 min-h-[36px] bg-white border border-slate-300 rounded-md text-xs',
                    label: 'text-xs font-medium text-slate-700',
                  }}
                  {...register('area', {
                    required: true,
                  })}
                />
                {errors.area && (
                  <span className="text-[11px] text-red-600 font-medium">
                    Área requerida
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <Input
                  type="text"
                  label="Sub Área"
                  placeholder="Sub área"
                  labelPlacement="outside"
                  size="sm"
                  classNames={{
                    inputWrapper: 'h-9 min-h-[36px] bg-white border border-slate-300 rounded-md text-xs',
                    label: 'text-xs font-medium text-slate-700',
                  }}
                  {...register('subarea', {
                    required: true,
                  })}
                />
                {errors.subarea && (
                  <span className="text-[11px] text-red-600 font-medium">
                    Sub área requerida
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <Input
                  type="text"
                  label="Rol"
                  placeholder="Rol"
                  labelPlacement="outside"
                  size="sm"
                  classNames={{
                    inputWrapper: 'h-9 min-h-[36px] bg-white border border-slate-300 rounded-md text-xs',
                    label: 'text-xs font-medium text-slate-700',
                  }}
                  endContent={
                    <ImUserPlus className="text-slate-400 text-sm" />
                  }
                  {...register('rol', {
                    required: true,
                  })}
                />
                {errors.rol && (
                  <span className="text-[11px] text-red-600 font-medium">
                    Rol requerido
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <TimeInput
                  label="Hora"
                  labelPlacement="outside"
                  size="sm"
                  value={hora}
                  onChange={(value) => setHora(value || new Time(12))}
                  startContent={
                    <ClockCircleLinearIcon className="pointer-events-none flex-shrink-0 text-base text-slate-400" />
                  }
                  classNames={{
                    inputWrapper: 'h-9 min-h-[36px] bg-white border border-slate-300 rounded-md text-xs',
                    label: 'text-xs font-medium text-slate-700',
                  }}
                />
              </div>

              <div className="flex flex-col gap-1">
                <Select
                  label="Programación"
                  placeholder="Seleccione Programación"
                  labelPlacement="outside"
                  size="sm"
                  className="w-full"
                  classNames={{
                    trigger: 'h-9 min-h-[36px] bg-white border border-slate-300 rounded-md text-xs',
                    label: 'text-xs font-medium text-slate-700',
                  }}
                  disableSelectorIconRotation
                  selectorIcon={<SelectorIcon />}
                  {...register('programacion', {
                    required: true,
                  })}
                >
                  <SelectItem key="actual" className="text-xs">Fecha Actual</SelectItem>
                  <SelectItem key="futura" className="text-xs">Fecha Futura</SelectItem>
                  <SelectItem key="pasada" className="text-xs">Fecha Pasada</SelectItem>
                </Select>

                {errors.programacion && (
                  <span className="text-[11px] text-red-600 font-medium">
                    Programación requerida
                  </span>
                )}
              </div>
            </div>
          </div>
        </form>
      </BaseModal>
    </>
  );
}
