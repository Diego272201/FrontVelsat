import React, { useContext, useState } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Link,
} from '@nextui-org/react';
import Select from '@/app/components/selectUI/Select';
import App from '@/app/components/TimePicker';
import { toast, Toaster } from 'sonner';
import Image from 'next/image';
import { Input } from '@nextui-org/react';
import { IoSpeedometerSharp } from 'react-icons/io5';
import { useSession } from 'next-auth/react';
import ButtonDownload from '@/app/components/ui/ButtonDownloadModal';

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
  const { data: session } = useSession();
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [speedCar, setSpeedCar] = useState<string>('');
  const username = session?.user.username;

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

  const handleShowReport = () => {
    if (!selectedDeviceId || !startDate || !endDate || !speedCar) {
      toast.error('Rellenar campos necesarios', {
        className: 'toast-slide-in',
        richColors: true,
      });
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 3) {
      toast.error('El límite de fechas es de 3 días', {
        className: 'toast-slide-in',
        richColors: true,
      });
    } else {
      const url = `/trackvelnew/estadistica/${nameurl}?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&deviceId=${encodeURIComponent(selectedDeviceId)}&speedCar=${encodeURIComponent(speedCar)}`;
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
                <Select onSelect={handleSelect}></Select>
              </div>

              <div className="selectdates">
                <div className="dataLabel">
                  <span className="spanLabel">Fecha Inicial</span>
                  <App
                    backgroundColor="#e9ecef"
                    onDateSelect={handleStartDateSelect}
                  />
                </div>

                <div className="dataLabel">
                  <span className="spanLabel">Fecha Final</span>
                  <App
                    backgroundColor="#e9ecef"
                    onDateSelect={handleEndDateSelect}
                  />
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
                    <ButtonDownload
                      startDate={startDate}
                      endDate={endDate}
                      devideId={selectedDeviceId}
                      namedown="downloadExcelV"
                      namedesc="velocidad"
                      nameurl="reportevelocidad"
                      username={username || ""}
                      speedCar={speedCar}
                  

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
