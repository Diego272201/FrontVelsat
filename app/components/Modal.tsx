'use client';
import React, { useContext, useRef, useState } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  useDisclosure,
  DateValue,
  Link,
} from '@nextui-org/react';
import Select from './selectUI/Select';

import App from './TimePicker';
import ButtonDownload from './ui/Button';
import { ZonedDateTime } from '@internationalized/date';
import { ReportContext } from '../context/ReportProvider';


interface AppModalProps {
  isOpen: boolean;
  onClose: () => void;

}



const AppModal: React.FC<AppModalProps> = ({ isOpen, onClose }) => {



  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');


  const handleSelect = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
  };

  const handleStartDateSelect = (date: ZonedDateTime) => {
    const isoString = date.toString();
    const formattedDate = isoString.substring(0, 16);

    console.log('Fecha de inicio seleccionada:', formattedDate);
    setStartDate(formattedDate);
  };

  const handleEndDateSelect = (date: ZonedDateTime) => {
    const isoString = date.toString();
    const formattedDate = isoString.substring(0, 16);

    console.log('Fecha de fin seleccionada:', formattedDate);
    setEndDate(formattedDate);
  };


  return (
      <Modal isOpen={isOpen} onOpenChange={onClose} size="xl" backdrop="opaque">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="contenidoM flex flex-col gap-1">
                <div className="headerModal">
                  <img src="/gpsLogo.png" alt="" width={50} />
                  <p>REPORTE GENERAL</p>
                </div>
              </ModalHeader>
              <ModalBody>
                <div className="selectunitRange">
                  <Select onSelect={handleSelect}></Select>
                </div>

                <div className="selectunitRange">
                  <App
                    texto="Fecha Inicio"
                    onDateSelect={handleStartDateSelect}
                  ></App>
                  <App
                    texto="Fecha Fin"
                    onDateSelect={handleEndDateSelect}
                  ></App>
                </div>
              </ModalBody>
              <ModalFooter>
                <div className="footerModal">
                  <div className="download">
                    <ButtonDownload
                      startDate={startDate}
                      endDate={endDate}
                      devideId={selectedDeviceId}
                    />
                  </div>

                  <div className="btnAction">
                    <Button color="danger" onPress={onClose}>
                      Cancelar
                    </Button>
                    <Button
                      href={'/trackvelnew/estadistica/reportegeneral'}
                      as={Link}
                      color="primary"
                      showAnchorIcon
                      variant="solid"
                    >
                      Mostrar
                    </Button>
                  </div>
                </div>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
      
  );
};



export default AppModal;


