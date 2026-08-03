import React, { useState } from 'react';
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
import { Toaster, toast } from 'sonner';
import '@/app/styles/sonner.css';
import { useSession } from 'next-auth/react';
import Selectall from '@/app/components/selectUI/Selectall';

interface AppModalProps {
  isOpen: boolean;
  onClose: () => void;
  titulo: string;
  useSelectAll?: boolean;
  icono?: React.ReactNode;
}

const AppModalUnidadesCercanas: React.FC<AppModalProps> = ({
  isOpen,
  onClose,
  titulo,
  useSelectAll = false,
  icono,
}) => {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [distancia, setDistancia] = useState<string>('');
  const { data: session } = useSession();

  const handleSelect = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
  };

  const handleDistanciaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Solo permitir números y punto decimal
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setDistancia(value);
    }
  };

  const handleShowReport = () => {
    if (!selectedDeviceId || !distancia) {
      toast.error('Rellenar campos necesarios', {
        className: 'toast-slide-in',
        richColors: true,
      });
      return;
    }

    // Validar que la distancia sea un número válido mayor a 0
    const distanciaNum = parseFloat(distancia);
    if (isNaN(distanciaNum) || distanciaNum <= 0) {
      toast.error('Ingresa una distancia válida mayor a 0', {
        className: 'toast-slide-in',
        richColors: true,
      });
      return;
    }

    // Construir la URL con los parámetros (usar ruta relativa para funcionar tanto en local como en producción)
    const url = `/trackvelnew/unidadescercanas?deviceId=${encodeURIComponent(selectedDeviceId)}&distancia=${encodeURIComponent(distancia)}`;

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
                <p className="text-[14px]">{titulo}</p>
                {icono && (
                  <span className="text-[40px] text-gray-800">{icono}</span>
                )}
              </div>
            </ModalHeader>
            <ModalBody>
              <div className="selectunitRange">
                {useSelectAll ? (
                  <Selectall onSelect={handleSelect} />
                ) : (
                  <Select onSelect={handleSelect} />
                )}
              </div>

              <div className="distanciaInput">
                <div className="dataLabel flex flex-col gap-1">
                  <span className="text-[12px] font-semibold text-gray-700">
                    Distancia (km)
                  </span>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Ingresa la distancia en kilómetros"
                      value={distancia}
                      onChange={handleDistanciaChange}
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 pr-10 text-sm text-gray-700 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring focus:ring-blue-200"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                      km
                    </span>
                  </div>
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <div className="footerModal">
                <div className="btnAction btnActionHiddenDownload">
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

export default AppModalUnidadesCercanas;
