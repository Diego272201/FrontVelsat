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
import { Toaster } from 'sonner';
import ButtonSpeedModal from '@/app/components/ui/ButtonSpeedModal';
import Image from 'next/image';
import { Input } from '@nextui-org/react';
import { IoSpeedometerSharp } from 'react-icons/io5';

interface AppModalProps {
  isOpen: boolean;
  onClose: () => void;
  titulo: string;
  nameurl: string;
  namedown: string;
  namedesc: string;
  showDownloadButton: boolean;
}

const AppModalVelocidad: React.FC<AppModalProps> = ({
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
  const [speedCar, setSpeedCar] = useState<string>('');

  const handleSelect = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
  };

  const handleStartDateSelect = (date: string) => {
    setStartDate(date);
  };

  const handleEndDateSelect = (date: string) => {
    setEndDate(date);
  };

  const handleSpeedCar = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSpeedCar(event.target.value);
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
                <Select onSelect={handleSelect}></Select>
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

              <div>
                <span className="spanLabel">Velocidad mayor a : </span>
                <Input
                  type="number"
                  placeholder="0.00"
                  labelPlacement="outside"
                  startContent={
                    <div className="pointer-events-none flex items-center">
                      <span className="text-small text-default-400">
                        <IoSpeedometerSharp />
                      </span>
                    </div>
                  }
                  onChange={handleSpeedCar}
                />
              </div>
            </ModalBody>
            <ModalFooter>
              <div className="footerModal">
                {showDownloadButton && (
                  <div className="download">
                    <Toaster />

                    <ButtonSpeedModal
                      startDate={startDate}
                      endDate={endDate}
                      devideId={selectedDeviceId}
                      speedCar={speedCar}
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
                    href={`/trackvelnew/estadistica/${nameurl}?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&deviceId=${encodeURIComponent(selectedDeviceId)}&speedCar=${encodeURIComponent(speedCar)}`}
                    as={Link}
                    target="_blank"
                    color="primary"
                    showAnchorIcon
                    variant="solid"
                    className="btn"
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

export default AppModalVelocidad;
