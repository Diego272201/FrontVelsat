import React, { useContext, useState } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  useDisclosure,
  Link,
} from '@nextui-org/react';
import Select from '@/app/components/selectUI/Select';
import App from '@/app/components/TimePicker';
import ButtonDownload from '@/app/components/ui/Button';
import Image from 'next/image';

interface AppModalProps {
  isOpen: boolean;
  onClose: () => void;
  titulo: string;
  nameurl: string;
  namedown: string;
  namedesc: string;
  showDownloadButton: boolean;
}

const AppModalPrueba: React.FC<AppModalProps> = ({ isOpen, onClose, titulo, nameurl, namedown, namedesc, showDownloadButton }) => {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  

  const handleSelect = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
  };

  const handleStartDateSelect = (date: string) => {
    if (date) {
      setStartDate(date);
    }
  };

  const handleEndDateSelect = (date: string) => {
    if (date) {
      setEndDate(date);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onClose} size="xl" backdrop="opaque" className='modalEstilo'>
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="contenidoM flex flex-col gap-1">
              <div className="headerModal">
                <Image src="/gpsLogo.png" alt="" width={50} height={'1000'}/>
                <p>{titulo}</p>
              </div>
            </ModalHeader>
            <ModalBody>
              <div className="selectunitRange">
                <Select onSelect={handleSelect}></Select>
              </div>

              <div className="selectdates">
                <div className="dataLabel">
                  <span className='spanLabel'>Fecha Inicial</span>
                  <App onDateSelect={handleStartDateSelect} />
                </div>

                <div className="dataLabel">
                  <span className='spanLabel'>Fecha Final</span>
                  <App onDateSelect={handleEndDateSelect} />
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <div className="footerModal">
              {showDownloadButton && (
                <div className="download">
                  <ButtonDownload
                    startDate={startDate}
                    endDate={endDate}
                    devideId={selectedDeviceId}
                    namedown={namedown}
                    namedesc={namedesc}
                  />
                </div>
                )}
                
                <div className={`btnAction ${!showDownloadButton && 'btnActionHiddenDownload'}`}>
                  <Button color="danger" onPress={onClose} className='btn'>
                    Cancelar
                  </Button>
                  <Button
                    href={`/trackvelnew/estadistica/${nameurl}?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&deviceId=${encodeURIComponent(selectedDeviceId)}`}
                    as={Link}
                    color="primary"
                    showAnchorIcon
                    variant="solid"
                    className='btn'
                    target='_blank'
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

export default AppModalPrueba;
