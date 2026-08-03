import React, { useEffect, useState } from 'react';
import { Button, RadioGroup, Radio } from '@nextui-org/react';
import BaseModal from '@/app/components/ui/BaseModal';
import { TbTrash } from 'react-icons/tb';
import axios from 'axios';
import { toast } from 'sonner';
import { API_BASE_URL125 } from '@/app/components/urlsApi/urlApi';
import { GrSelect } from 'react-icons/gr';
import ModalDireccionAdicional from './ModalDireccionAdicional';

type ModalDireccionesProp = {
  isOpen: boolean;
  onClose: () => void;
  codCliente: string;
  nombrePasajero: string;
  codigo: string;
  setShouldRefetch:
    | React.Dispatch<React.SetStateAction<boolean>>
    | (() => void);
};

type Lugar = {
  codlugar: number;
  codcli: string;
  direccion: string;
  distrito: string;
};

// Componente controlado: el disparador vive en la fila y este modal se monta
// una sola vez, a nivel de la lista, solo mientras está abierto.
export default function ModalDirecciones(props: ModalDireccionesProp) {
  if (!props.isOpen) return null;
  return <ModalDireccionesContenido {...props} />;
}

function ModalDireccionesContenido({
  isOpen,
  onClose,
  codCliente,
  nombrePasajero,
  codigo,
  setShouldRefetch,
}: ModalDireccionesProp) {
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [selectedValue, setSelectedValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [isModalDireccionAdicionalOpen, setIsModalDireccionAdicionalOpen] =
    useState<boolean>(false);

  useEffect(() => {
    if (isOpen && codCliente) {
      setIsLoading(true);

      axios
        .get(`${API_BASE_URL125}/api/Preplan/lugares/${codCliente}`)
        .then((response) => {
          // Imprimir los datos completos de la respuesta
          console.log('Respuesta completa de la API:', response);

          // Imprimir información adicional del contexto
          console.log('Código del cliente:', codCliente);

          setLugares(response.data);
        })
        .catch((error) => {
          console.error('Error al obtener direcciones:', error);
          toast.error('Error al obtener las direcciones.');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, codCliente]);

  const handleGuardar = async (onClose: () => void) => {
    if (!selectedValue) {
      toast.warning('Por favor, selecciona una dirección.');
      return;
    }

    setIsSaving(true);
    try {
      const url = `${API_BASE_URL125}/api/Preplan/direccion/${selectedValue}/${codigo}`;
      await axios.put(url);
      toast.success('Dirección guardada correctamente.');
      setShouldRefetch(true);
      onClose();
    } catch (error) {
      toast.error('Hubo un error al guardar la dirección.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEliminar = async (codlugar: number) => {
    setIsDeleting(codlugar);

    try {
      await axios.delete(
        `https://do.velsat.pe:2083/api/Preplan/EliminarDireccion?codlugar=${codlugar}`,
      );

      // Actualizar la lista local removiendo la dirección eliminada
      setLugares((prevLugares) =>
        prevLugares.filter((lugar) => lugar.codlugar !== codlugar),
      );

      // Si la dirección eliminada era la seleccionada, limpiar la selección
      if (selectedValue === String(codlugar)) {
        setSelectedValue('');
      }

      toast.success('Dirección eliminada correctamente.');
      setShouldRefetch(true);
    } catch (error) {
      console.error('Error al eliminar dirección:', error);
      toast.error('Error al eliminar la dirección.');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleDireccionAdicionalGuardada = () => {
    // Cuando se guarde una dirección adicional, podemos recargar la lista
    setShouldRefetch(true);
    // También podríamos volver a cargar las direcciones del modal actual
    if (isOpen && codCliente) {
      setIsLoading(true);
      axios
        .get(`${API_BASE_URL125}/api/Preplan/lugares/${codCliente}`)
        .then((response) => {
          setLugares(response.data);
        })
        .catch((error) => {
          console.error('Error al recargar direcciones:', error);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  };

  return (
    <>
      <BaseModal
        isOpen={isOpen}
        onClose={onClose}
        title="Seleccione la Dirección"
        subtitle={nombrePasajero
          .toLowerCase()
          .split(' ')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')}
        icon={<GrSelect className="h-4 w-4 text-[#113eb9]" />}
        iconBgColor="bg-blue-100"
        size="2xl"
        cancelText="Cerrar"
        onCancel={onClose}
        confirmText="Guardar"
        onConfirm={() => handleGuardar(onClose)}
        isLoading={isSaving}
        footerExtra={
          <Button
            size="sm"
            onPress={() => setIsModalDireccionAdicionalOpen(true)}
            className="bg-brandPrimary hover:bg-brandPrimary-hover mr-auto h-8 px-3 text-xs font-medium text-white"
          >
            Dirección Adicional
          </Button>
        }
      >
        {isLoading ? (
          <p className="text-[12px] text-gray-600">Cargando direcciones...</p>
        ) : lugares.length > 0 ? (
          <RadioGroup
            color="warning"
            label="Direcciones"
            value={selectedValue}
            onValueChange={setSelectedValue}
          >
            {lugares.map((lugar) => (
              <div
                key={lugar.codlugar}
                className="flex w-full items-center gap-2"
              >
                <div className="flex-1">
                  <Radio
                    value={String(lugar.codlugar)}
                    description={lugar.direccion}
                  >
                    <span className="text-[11px]">{lugar.distrito}</span>
                  </Radio>
                </div>
                <Button
                  isIconOnly
                  size="sm"
                  color="danger"
                  variant="light"
                  onPress={() => handleEliminar(lugar.codlugar)}
                  isLoading={isDeleting === lugar.codlugar}
                  className="h-8 min-w-8"
                >
                  <TbTrash size={16} />
                </Button>
              </div>
            ))}
          </RadioGroup>
        ) : (
          <p className="text-[12px] text-gray-600">
            No hay direcciones disponibles.
          </p>
        )}
      </BaseModal>

      {/* Modal de Dirección Adicional */}
      <ModalDireccionAdicional
        isOpen={isModalDireccionAdicionalOpen}
        onClose={() => setIsModalDireccionAdicionalOpen(false)}
        codCliente={codCliente}
        nombrePasajero={nombrePasajero}
        onDireccionGuardada={handleDireccionAdicionalGuardada}
      />
    </>
  );
}
