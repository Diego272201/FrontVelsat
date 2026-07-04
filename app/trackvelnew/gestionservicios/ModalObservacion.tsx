import React from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from '@nextui-org/react';
import { MessageSquare } from 'lucide-react';

type ModalObservacionProps = {
  nombrePasajero: string;
  observacion: string | null;
  isOpen: boolean;
  onClose: () => void;
};

export default function ModalObservacion({
  nombrePasajero,
  observacion,
  isOpen,
  onClose,
}: ModalObservacionProps) {
  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()} size="lg">
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex items-center gap-2 text-[15px] text-gray-800">
              <MessageSquare size={20} className="text-orange-600" />
              Observación de {nombrePasajero}
            </ModalHeader>

            <ModalBody>
              <p>{observacion || 'Sin observación'}</p>
            </ModalBody>

            <ModalFooter>
              <Button color="danger" onPress={onClose}>
                Cerrar
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
