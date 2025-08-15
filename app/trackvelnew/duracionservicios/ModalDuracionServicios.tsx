import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Link,
} from '@nextui-org/react';
import App from '@/app/components/TimePicker';
import { Toaster, toast } from 'sonner';
import '@/app/styles/sonner.css';
import ButtonDownload from '@/app/components/ui/ButtonDownloadModal';
import { useSession } from 'next-auth/react';

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

const AppModalDuracionServicios: React.FC<AppModalProps> = ({
  isOpen,
  onClose,
  titulo,
  nameurl,
  namedown,
  namedesc,
  showDownloadButton,
  icono,
}) => {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const { data: session } = useSession();
  
  const pathname = usePathname();

  const username = session?.user.username;

  const handleStartDateSelect = (date: string) => {
    setStartDate(date);
  };

  const handleEndDateSelect = (date: string) => {
    setEndDate(date);
  };

  const handleShowReport = () => {
    if (!startDate || !endDate) {
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
      const url = `/trackvelnew/duracionservicios?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
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
              <div className="selectdates">
                <div className="dataLabel">
                  <span className="text-[12px] font-semibold">
                    Fecha Inicial
                  </span>
                  <App
                    backgroundColor="#e9ecef"
                    onDateSelect={handleStartDateSelect}
                    borderRadius="5px"
                  />
                </div>

                <div className="dataLabel">
                  <span className="text-[12px] font-semibold">Fecha Final</span>
                  <App
                    backgroundColor="#e9ecef"
                    onDateSelect={handleEndDateSelect}
                    borderRadius="5px"
                  />
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
                      devideId=""
                      namedown={namedown}
                      namedesc={namedesc}
                      nameurl={nameurl}
                      username={username || ''}
                      isKilometrajeAll={false}
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

export default AppModalDuracionServicios;