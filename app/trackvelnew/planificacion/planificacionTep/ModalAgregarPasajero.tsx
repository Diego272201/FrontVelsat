import InputPasajero from '@/app/components/inputs/InputPasajero';
import { API_BASE_URL125 } from '@/app/components/urlsApi/urlApi';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  useDisclosure,
} from '@nextui-org/react';
import { useState } from 'react';
import { MdLibraryAdd } from 'react-icons/md';
import { toast, Toaster } from 'sonner';

interface Grupo {
  id: number;
  tipo: string;
  empresa: string;
  destinoGrupo: string;
  fecha: string;
  horaprog: string;
  conductor: string;
  unidad: string;
}

interface ModalAgregarPasajeroProps {
  grupo: Grupo;
  onRefrescarDatos?: () => void;
}
export default function App({
  grupo,
  onRefrescarDatos,
}: ModalAgregarPasajeroProps) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [pasajeroSeleccionado, setPasajeroSeleccionado] = useState<{
    apepate: string;
    codlan: string;
    codlugar: number;
  } | null>(null);

  const handleAgregar = async () => {
    if (!pasajeroSeleccionado) {
      toast.warning('Selecciona un pasajero primero');
      return;
    }

    const payload = {
      arealan: grupo.empresa,
      destinocodlugar: pasajeroSeleccionado.codlugar.toString(),
      distancia: 0,
      empresa: grupo.empresa,
      fecha: grupo.fecha,
      numero: (grupo.id - 1).toString(),
      orden: '0',
      pasajero: {
        codlan: pasajeroSeleccionado.codlan,
        nombre: pasajeroSeleccionado.apepate,
      },
      rol: 'Ninguno',
      tipo: grupo.tipo,
    };

    console.log('Payload enviado a la API:', payload);


    try {
      const response = await fetch(
        `${API_BASE_URL125}/api/Preplan/AgregarPasajero?usuario=movilbus`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        },
      );

      if (response.ok) {
        toast.success('Pasajero agregado correctamente');

        if (onRefrescarDatos) {
          onRefrescarDatos();
        }
        onOpenChange();
      } else {
        toast.error('Error al agregar pasajero');
      }
    } catch (error) {
      console.error('Error en la solicitud:', error);
      toast.error('Ocurrió un error al enviar la solicitud');
    }
  };

  return (
    <>
      <button
        onClick={onOpen}
        type="button"
        className="inline-flex h-8 items-center gap-x-2 rounded border border-transparent bg-blue-600 px-2 py-1 text-sm font-medium text-white hover:bg-blue-700 focus:bg-blue-700 focus:outline-none disabled:pointer-events-none disabled:opacity-50"
      >
        Pasajero
      </button>
      <Modal
        isDismissable={false}
        isKeyboardDismissDisabled={true}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        size="2xl"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center gap-2">
                Agregar Pasajero al Servicio
                <MdLibraryAdd />
              </ModalHeader>
              <ModalBody>
                <InputPasajero
                  onSelectPasajero={setPasajeroSeleccionado}
                ></InputPasajero>

                <div className="mt-4 text-sm text-gray-800">
                  {pasajeroSeleccionado ? (
                    <>
                      <div>
                        <strong>Apellido Paterno:</strong>{' '}
                        {pasajeroSeleccionado.apepate}
                      </div>
                      <div>
                        <strong>Codlan:</strong> {pasajeroSeleccionado.codlan}
                      </div>
                      <div>
                        <strong>CodLugar:</strong>{' '}
                        {pasajeroSeleccionado.codlugar}
                      </div>
                    </>
                  ) : (
                    <div>No se ha seleccionado ningún pasajero</div>
                  )}
                </div>

                <div>
                  <p>
                    <strong>Fecha:</strong> {grupo.fecha}
                  </p>
                  <p>
                    <strong>AreLan:</strong> {grupo.empresa}
                  </p>
                  <p>
                    <strong>Grupo:</strong> {grupo.id - 1}
                  </p>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" onPress={onClose}>
                  Cerrar
                </Button>
                <Button
                  color="primary"
                  onPress={async () => {
                    await handleAgregar();
                  }}
                >
                  Agregar
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
