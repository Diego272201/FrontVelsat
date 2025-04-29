import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from '@nextui-org/react';
import { MdHomeRepairService } from 'react-icons/md';

type ModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onRespuesta: (respuesta: string) => void;
};

export default function App({ isOpen, onOpenChange, onRespuesta }: ModalProps) {
  return (
    <>
      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center gap-2">
                <MdHomeRepairService />
                Obtener Servicios
              </ModalHeader>

              <ModalBody>
                <p>¿Desea aplicar el orden del último cierre?</p>
              </ModalBody>
              <ModalFooter>
                <Button
                  color="primary"
                  onPress={() => {
                    onRespuesta('2');
                    onClose();
                  }}
                >
                  Sí
                </Button>
                <Button
                  color="primary"
                  onPress={() => {
                    onRespuesta('1');
                    onClose();
                  }}
                >
                  No
                </Button>
                <button
                  onClick={onClose}
                  className="rounded-xl bg-[#c1121f] px-4 py-2 text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Cancelar
                </button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
