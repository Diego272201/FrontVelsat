import React, { useState } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from '@nextui-org/react';
import Select from '@/app/components/selectUI/Select';
import App from '@/app/components/TimePicker';
import { toast } from 'sonner';
import '@/app/styles/sonner.css';
import { useSession } from 'next-auth/react';

interface ModalDetalleRecorridoProps {
  isOpen: boolean;
  onClose: () => void;
}

const ModalDetalleRecorrido: React.FC<ModalDetalleRecorridoProps> = ({
  isOpen,
  onClose,
}) => {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const { data: session } = useSession();

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

  const handleSubmit = () => {
  if (!selectedDeviceId || !startDate || !endDate) {
    toast.error('Rellenar campos necesarios', {
      className: 'toast-slide-in',
      richColors: true,
    });
    return;
  }

  // Validar que el rango no exceda 11 días
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays > 11) {
    toast.error('El límite de fechas es de 11 días', {
      className: 'toast-slide-in',
      richColors: true,
    });
    return;
  }

  // El TimePicker ya retorna el formato "YYYY-MM-DDTHH:mm"
  // Solo reemplazamos la T por un espacio si es necesario
  const fechaini = startDate.replace('T', ' ');
  const fechafin = endDate.replace('T', ' ');

  // Construir la URL con los parámetros
  const url = `/trackvelmobile/detallerecorrido?deviceId=${encodeURIComponent(selectedDeviceId)}&startDate=${encodeURIComponent(fechaini)}&endDate=${encodeURIComponent(fechafin)}`;

  // Abrir en nueva ventana
  window.open(url, '_blank');
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
                <p className="text-[16px]">Detalle de Recorrido</p>
              </div>
            </ModalHeader>

            <ModalBody>
              <div className="selectunitRange">
                <Select onSelect={handleSelect} />
              </div>

              <div className="selectdates flex gap-4">
                <div className="dataLabel flex flex-1 flex-col">
                  <span className="mb-1 text-[12px] font-semibold">
                    Fecha Inicial
                  </span>
                  <App
                    backgroundColor="#e9ecef"
                    onDateSelect={handleStartDateSelect}
                    borderRadius="5px"
                  />
                </div>

                <div className="dataLabel flex flex-2 flex-col">
                  <span className="mb-1 text-[12px] font-semibold">
                    Fecha Final
                  </span>
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
                <div className="btnAction btnActionHiddenDownload flex gap-4">
                  <Button color="danger" onPress={onClose} className="btn">
                    Cancelar
                  </Button>
                  <Button
                    onPress={handleSubmit}
                    color="primary"
                    variant="solid"
                    className="btn"
                  >
                    Aceptar
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

export default ModalDetalleRecorrido;
