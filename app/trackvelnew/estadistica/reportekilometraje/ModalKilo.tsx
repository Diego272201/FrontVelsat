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
import { Toaster, toast } from 'sonner';
import '@/app/styles/sonner.css';
import ButtonDownload from '@/app/components/ui/Button';
import Image from 'next/image';
import Selectall from '@/app/components/selectUI/Selectall';

interface AppModalProps {
  isOpen: boolean;
  onClose: () => void;
  titulo: string;
  nameurl: string;
  namedown: string;
  namedesc: string;
  showDownloadButton: boolean;
}


const AppModalPrueba: React.FC<AppModalProps> = ({
  isOpen,
  onClose,
  titulo,
  nameurl,
  namedown,
  namedesc,
  showDownloadButton,
}) => {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const handleSelect = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
  };

  const handleStartDateSelect = (date: string) => {
    setStartDate(date);
  };

  const handleEndDateSelect = (date: string) => {
    setEndDate(date);
  };

  const handleShowReport = () => {
    if (!selectedDeviceId || !startDate || !endDate) {
      toast.error('Rellenar campos necesarios', {className: 'toast-slide-in', richColors:true});
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 3) {
      toast.error('El límite de fechas es de 3 días', {className: 'toast-slide-in', richColors:true});
    } else {
      const url = `/trackvelnew/estadistica/${nameurl}?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&deviceId=${encodeURIComponent(selectedDeviceId)}`;
      window.open(url, '_blank');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onClose}
      size="xl"
      backdrop="opaque"
      className="modalEstilo"
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="contenidoM flex flex-col gap-1">
              <div className="headerModal">
                <Image src="/gpsLogo.png" alt="" width={50} height={'1000'} />
                <p>{titulo}</p>
              </div>
            </ModalHeader>
            <ModalBody>
              <div className="selectunitRange">
                <Selectall onSelect={handleSelect}></Selectall>
              </div>

              <div className="selectdates">
                <div className="dataLabel">
                  <span className="spanLabel">Fecha Inicial</span>
                  <App onDateSelect={handleStartDateSelect} />
                </div>

                <div className="dataLabel">
                  <span className="spanLabel">Fecha Final</span>
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

                <div
                  className={`btnAction ${!showDownloadButton && 'btnActionHiddenDownload'}`}
                >
                  <Button color="danger" onPress={onClose} className="btn">
                    Cancelar
                  </Button>
                  <Button
                    onPress={handleShowReport}
                    as={Link}
                    color="primary"
                    showAnchorIcon
                    variant="solid"
                    className="btn"
                  >
                    Mostrar
                  </Button>
                  <Toaster />
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