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
import { TbGps, TbTrash } from 'react-icons/tb';
import axios from 'axios';
import { toast } from 'sonner';
import { API_BASE_URL125 } from '@/app/components/urlsApi/urlApi';
import { GrSelect } from 'react-icons/gr';
import ModalDireccionAdicional from './ModalDireccionAdicional';

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

export default function ModalDirecciones({
  codCliente,
  nombrePasajero,
  codigo,
  setShouldRefetch,
}: ModalDireccionesProp) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [selectedValue, setSelectedValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [isModalDireccionAdicionalOpen, setIsModalDireccionAdicionalOpen] = useState<boolean>(false);

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
      await axios.delete(`https://velsat.pe:2096/api/Preplan/EliminarDireccion?codlugar=${codlugar}`);
      
      // Actualizar la lista local removiendo la dirección eliminada
      setLugares(prevLugares => prevLugares.filter(lugar => lugar.codlugar !== codlugar));
      
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
    <div className="flex flex-col gap-2">
      <Button onPress={onOpen} color="warning" size="sm">
        Dirección
        <TbGps />
      </Button>

      <Modal
        isOpen={isOpen}
        scrollBehavior="inside"
        onOpenChange={onOpenChange}
        size="2xl"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center  text-[15px] text-gray-800">
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
                      <div key={lugar.codlugar} className="flex items-center gap-2 w-full">
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
                          className="min-w-8 h-8"
                        >
                          <TbTrash size={16} />
                        </Button>
                      </div>
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
                  onPress={() => handleGuardar(onClose)}
                  isLoading={isSaving}
                >
                  Guardar
                </Button>

                <Button 
                  color="secondary" 
                  onPress={() => setIsModalDireccionAdicionalOpen(true)}
                >
                  Dirección Adicional
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Modal de Dirección Adicional */}
      <ModalDireccionAdicional
        isOpen={isModalDireccionAdicionalOpen}
        onClose={() => setIsModalDireccionAdicionalOpen(false)}
        codCliente={codCliente}
        nombrePasajero={nombrePasajero}
        onDireccionGuardada={handleDireccionAdicionalGuardada}
      />
    </div>
  );
}