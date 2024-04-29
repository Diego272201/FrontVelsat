'use client';
import React from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  useDisclosure,
} from '@nextui-org/react';
import Select from './selectUI/Select';

import App from './TimePicker';
import ButtonDownload from './ui/Button';

interface AppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AppModal: React.FC<AppModalProps> = ({ isOpen, onClose }) => {
  return (
    <>

      <Modal isOpen={isOpen} onOpenChange={onClose} size="xl" backdrop="opaque">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 contenidoM">
                <div className="headerModal">
                  <img src="/gpsLogo.png" alt="" width={50} />
                  <p>REPORTE GENERAL</p>
                </div>
              </ModalHeader>
              <ModalBody >
                <div className="selectunitRange">
                  <Select></Select>
                </div>

                <div className="selectunitRange">
                  <App texto="Fecha Inicio"></App>
                  <App texto="Fecha Fin"></App>

                </div>
              </ModalBody>
              <ModalFooter>
                <div className="footerModal">

                  <div className="download">

                   <ButtonDownload></ButtonDownload>

                  </div>

                  <div className='btnAction'>
                    <Button color="danger"  onPress={onClose}>
                      Cancelar
                    </Button>
                    <Button color="primary" onPress={onClose}>
                      Mostrar
                    </Button>
                  </div>
                </div>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};

export default AppModal;
