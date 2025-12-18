import React, { useEffect, useState } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  RadioGroup,
  Radio,
} from '@nextui-org/react';
import axios from 'axios';
import { toast } from 'sonner';
import { API_BASE_URL125 } from '@/app/components/urlsApi/urlApi';
import { GrSelect } from 'react-icons/gr';

type ModalDireccionesProp = {
  codCliente: string;
  nombrePasajero: string;
  codigo: string;
  setShouldRefetch: React.Dispatch<React.SetStateAction<boolean>>;
  isOpen: boolean;
  onClose: () => void;
};

type Lugar = {
  codlugar: number;
  codcli: string;
  direccion: string;
  distrito: string;
};

export default function ModalDirecciones({
  codCliente,
  nombrePasajero,
  codigo,
  setShouldRefetch,
  isOpen,
  onClose,
}: ModalDireccionesProp) {
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [selectedValue, setSelectedValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && codCliente) {
      setIsLoading(true);
      setSelectedValue(''); // Reset selection when modal opens

      axios
        .get(`${API_BASE_URL125}/api/Preplan/lugares/${codCliente}`)
        .then((response) => {
          setLugares(response.data);
        })
        .catch(() => {
          toast.error('Error al obtener las direcciones.');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, codCliente]);

  const handleGuardar = async () => {
    if (!selectedValue) {
      toast.warning('Por favor, selecciona una dirección.');
      return;
    }

    setIsSaving(true);
    try {
        
      // codpedido = codigo del pasajero, codubicli = codlugar del lugar seleccionado
      const url = `https://do.velsat.pe:2083/api/Preplan/ActualizarDireccionPasajero/${codigo}/${selectedValue}`;

      console.log("La url es: "+ url)
      await axios.put(url);
      toast.success('Dirección guardada correctamente.');
      setShouldRefetch(true);
      onClose();
    } catch (error) {
      console.error('Error al guardar dirección:', error);
      toast.error('Hubo un error al guardar la dirección.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      scrollBehavior="inside"
      onOpenChange={(open) => !open && onClose()}
      size="2xl"
    >
      <ModalContent>
        {(onCloseModal) => (
          <>
            <ModalHeader className="flex items-center text-[15px] text-gray-800">
              <div className="flex items-center gap-2">
                <GrSelect size={20} />
                Seleccione la Dirección del Pasajero:{' '}
                {nombrePasajero
                  .toLowerCase()
                  .split(' ')
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ')}
              </div>
            </ModalHeader>

            <ModalBody>
              {isLoading ? (
                <p>Cargando direcciones...</p>
              ) : lugares.length > 0 ? (
                <RadioGroup
                  color="warning"
                  label="Direcciones"
                  value={selectedValue}
                  onValueChange={setSelectedValue}
                >
                  {lugares.map((lugar) => (
                    <Radio
                      key={lugar.codlugar}
                      value={String(lugar.codlugar)}
                      description={lugar.direccion}
                    >
                      <span className="text-[11px]">{lugar.distrito}</span>
                    </Radio>
                  ))}
                </RadioGroup>
              ) : (
                <p>No hay direcciones disponibles.</p>
              )}
            </ModalBody>
            <ModalFooter>
              <Button color="danger" onPress={onClose}>
                Cerrar
              </Button>

              <Button
                color="primary"
                onPress={handleGuardar}
                isLoading={isSaving}
              >
                Guardar
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}