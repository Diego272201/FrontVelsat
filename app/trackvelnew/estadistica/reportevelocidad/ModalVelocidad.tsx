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
  icono?: React.ReactNode;
}

const AppModalVelocidad: React.FC<AppModalProps> = ({
  isOpen,
  onClose,
  titulo,
  nameurl,
  namedown,
  namedesc,
  showDownloadButton,
  icono,
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
            <ModalHeader className="flex flex-col">
              <div className="flex items-center justify-center gap-2">
                <p className="text-[14px]">{titulo}</p>
                {icono && (
                  <span className="text-[40px] text-gray-800">{icono}</span>
                )}
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
                    borderRadius="5px"
                  />
                </div>

                <div className="dataLabel">
                  <span className="spanLabel">Fecha Final</span>
                  <App
                    backgroundColor="#e9ecef"
                    onDateSelect={handleEndDateSelect}
                    borderRadius="5px"
                  />
                </div>
              </div>
              <div className="mb-4">
                <p className="mb-1 text-sm font-semibold text-gray-800">
                  Velocidad mayor a:
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="0.00"
                    onChange={handleSpeedCar}
                    className="w-full rounded border border-gray-300 bg-[#e9ecef] p-1.5 text-[14px] focus:border-gray-400 focus:outline-none focus:ring-0"
                  />
                </div>
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
                      username={username || ''}
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
