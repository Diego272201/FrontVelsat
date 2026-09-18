import { useForm } from 'react-hook-form';
import React, { useState } from 'react';
import {
  useDisclosure,
  Input,
  Select,
  SelectItem,
  TimeInput,
} from '@nextui-org/react';
import { ImUserPlus } from 'react-icons/im';
import { MdEdit } from 'react-icons/md';
import { ClockCircleLinearIcon } from './ClockCircleLinearIcon';
import { Time } from '@internationalized/date';
import { SelectorIcon } from './SelectorIcon';
import axios from 'axios';
import { toast } from 'sonner';
import BaseModal from '@/app/components/ui/BaseModal';

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
  onEditSuccess: () => void;
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

export default function App({ titleM, user, onEditSuccess }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      empresa: user.empresa,
      area: user.area,
      subarea: user.subarea,
      rol: user.rol,
      programacion: mapProgramacion(user.programacion),
    },
  });

  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hora, setHora] = useState<Time | null>(
    new Time(
      parseInt(user.hora.slice(0, 2), 10),
      parseInt(user.hora.slice(3, 5), 10),
    ),
  );

  const onSubmit = async (data: any, onClose: () => void) => {
    if (Object.keys(errors).length === 0) {
      const formattedHora = hora?.toString().slice(0, 5);
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
        titleM.toLowerCase() === 'ingreso'
          ? 'I'
          : titleM.toLowerCase() === 'salida'
            ? 'S'
            : 'I';
            
      const putData = {
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
        await axios.put(
          `https://do.velsat.pe:2083/api/Turnos/${user.codigo}`,
          putData,
        );
        onEditSuccess();
        toast.success('Turno actualizado exitosamente');
        onClose();
      } catch (error) {
        toast.error('Error al actualizar el turno');
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
      <div className="relative h-6 w-6">
        <div className="group relative h-full w-full">
          <button
            onClick={onOpen}
            type="button"
            className="inline-flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-white text-slate-400 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 focus:outline-none transition-colors"
          >
            <MdEdit size={13} />
          </button>

          <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-max -translate-x-1/2 rounded bg-slate-800 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            Editar turno
          </div>
        </div>
      </div>

      <BaseModal
        isOpen={isOpen}
        onClose={handleClose}
        title={`Modificar Turno / ${titleM}`}
        subtitle={`Empresa: ${user.empresa}`}
        icon={<MdEdit className="h-4 w-4 text-blue-600" />}
        iconBgColor="bg-blue-100"
        size="2xl"
        confirmText="Guardar Cambios"
        cancelText="Cancelar"
        onConfirm={handleSubmit((data) => onSubmit(data, handleClose))}
        isLoading={isSubmitting}
        confirmButtonClass="bg-[#113EB9] hover:bg-blue-800 text-white"
      >
        <form onSubmit={handleSubmit((data) => onSubmit(data, handleClose))} className="space-y-3.5 -mt-1.5 pb-1.5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <Input
                type="text"
                label="Área"
                placeholder="Área"
                labelPlacement="outside"
                size="sm"
                classNames={{
                  inputWrapper: 'h-9 min-h-[36px] bg-gray-100 border border-gray-200 hover:border-gray-300 rounded-md text-xs focus-within:bg-white focus-within:border-[#113EB9] transition-colors',
                  label: 'text-xs font-semibold text-slate-700',
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
                  inputWrapper: 'h-9 min-h-[36px] bg-gray-100 border border-gray-200 hover:border-gray-300 rounded-md text-xs focus-within:bg-white focus-within:border-[#113EB9] transition-colors',
                  label: 'text-xs font-semibold text-slate-700',
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
                  inputWrapper: 'h-9 min-h-[36px] bg-gray-100 border border-gray-200 hover:border-gray-300 rounded-md text-xs focus-within:bg-white focus-within:border-[#113EB9] transition-colors',
                  label: 'text-xs font-semibold text-slate-700',
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
                onChange={(value) => setHora(value)}
                startContent={
                  <ClockCircleLinearIcon className="pointer-events-none flex-shrink-0 text-base text-slate-400" />
                }
                classNames={{
                  inputWrapper: 'h-9 min-h-[36px] bg-gray-100 border border-gray-200 hover:border-gray-300 rounded-md text-xs focus-within:bg-white focus-within:border-[#113EB9] transition-colors',
                  label: 'text-xs font-semibold text-slate-700',
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
                  trigger: 'h-9 min-h-[36px] bg-gray-100 border border-gray-200 hover:border-gray-300 rounded-md text-xs focus-within:bg-white focus-within:border-[#113EB9] transition-colors',
                  label: 'text-xs font-semibold text-slate-700',
                }}
                disableSelectorIconRotation
                selectorIcon={<SelectorIcon />}
                {...register('programacion', {
                  required: true,
                })}
              >
                <SelectItem key="actual" value="actual" className="text-xs">
                  Fecha Actual
                </SelectItem>
                <SelectItem key="futura" value="futura" className="text-xs">
                  Fecha Futura
                </SelectItem>
                <SelectItem key="pasada" value="pasada" className="text-xs">
                  Fecha Pasada
                </SelectItem>
              </Select>

              {errors.programacion && (
                <span className="text-[11px] text-red-600 font-medium">
                  Programación requerida
                </span>
              )}
            </div>
          </div>
        </form>
      </BaseModal>
    </>
  );
}
