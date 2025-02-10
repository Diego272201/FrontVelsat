import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  useDisclosure,
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
  Obtener Servicios <MdHomeRepairService />
</ModalHeader>

              <ModalBody>
                <p>¿ Desea aplicar el orden del ultimo cierre ?</p>
              </ModalBody>
              <ModalFooter>
                <Button
                  color="primary"
                  variant="bordered"
                  onPress={() => {
                    onRespuesta('2');
                    onClose();
                  }}
                >
                  Sí
                </Button>
                <Button
                  color="primary"
                  variant="bordered"
                  onPress={() => {
                    onRespuesta('1');
                    onClose();
                  }}
                >
                  No
                </Button>
                <Button color="danger" variant="bordered" onPress={onClose}>
                  Cancelar
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
