import React, { useEffect, useState } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  useDisclosure,
  RadioGroup,
  Radio,
} from '@nextui-org/react';
import { TbGps } from 'react-icons/tb';
import axios from 'axios';
import { toast } from 'sonner'; // ⬅️ 🔥 Se quita `Toaster`, solo se usa `toast`

type ModalDireccionesProp = {
  codCliente: string;
  nombrePasajero: string;
  codigo: string;
  setShouldRefetch: React.Dispatch<React.SetStateAction<boolean>>;
};

type Lugar = {
  codlugar: number;
  codcli: string;
  direccion: string;
  distrito: string;
};

export default function ModalDirecciones({ codCliente, nombrePasajero, codigo,setShouldRefetch }: ModalDireccionesProp) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [selectedValue, setSelectedValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && codCliente) {
      setIsLoading(true);

      axios
        .get(`https://66.240.210.125:8586/api/Preplan/lugares/${codCliente}`)
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

  const handleGuardar = async (onClose: () => void) => {
    if (!selectedValue) {
      toast.warning('Por favor, selecciona una dirección.');
      return;
    }

    setIsSaving(true);
    try {
      const url = `https://66.240.210.125:8586/api/Preplan/direccion/${selectedValue}/${codigo}`;
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

  return (
    <div className="flex flex-col gap-2">
      {/* ❌ SE ELIMINA <Toaster /> PARA EVITAR DUPLICADOS */}
      <Button onPress={onOpen} color="warning" size="sm">
        Dirección
        <TbGps />
      </Button>

      <Modal isOpen={isOpen} scrollBehavior="inside" onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Seleccione la Dirección del Pasajero : <span style={{ fontSize: '12px' }}>{nombrePasajero}</span>
                <p>{codigo}</p>
              </ModalHeader>
              <ModalBody>
                {isLoading ? (
                  <p>Cargando direcciones...</p>
                ) : lugares.length > 0 ? (
                  <RadioGroup color="warning" label="Direcciones" value={selectedValue} onValueChange={setSelectedValue}>
                    {lugares.map((lugar) => (
                      <Radio key={lugar.codlugar} value={String(lugar.codlugar)} description={lugar.direccion}>
                        {lugar.distrito}
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

                <Button color="primary" onPress={() => handleGuardar(onClose)} isLoading={isSaving}>
                  Guardar
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
