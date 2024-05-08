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

interface AppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AppModalPrueba: React.FC<AppModalProps> = ({ isOpen, onClose }) => {
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
    <Modal isOpen={isOpen} onOpenChange={onClose} size="xl" backdrop="opaque">
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="contenidoM flex flex-col gap-1">
              <div className="headerModal">
                <img src="/gpsLogo.png" alt="" width={50} />
                <p>REPORTE GENERAL 02</p>
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
                    href={`/trackvelnew/estadistica/reportegeneral?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&deviceId=${encodeURIComponent(selectedDeviceId)}`}
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

export default AppModalPrueba;
