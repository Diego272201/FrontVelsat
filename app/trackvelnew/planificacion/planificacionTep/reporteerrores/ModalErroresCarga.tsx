import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Link,
  Button,
} from '@nextui-org/react';
import { BiSolidError } from 'react-icons/bi';

interface ModalReporteErroresProps {
  errores: string[];  // Recibe un array de errores
  isOpen: boolean;
  onClose: () => void;
}

export default function ModalReporteErrores({ errores, isOpen, onClose }: ModalReporteErroresProps) {

  const handleShowReport = () => {
    localStorage.setItem('erroresReporte', JSON.stringify(errores));
    window.open('/trackvelnew/planificacion/planificacionTep/reporteerrores', '_blank');
    onClose();
  };
  

  return (
    <Modal isOpen={isOpen} onOpenChange={onClose}>
      <ModalContent>
        <>
          <ModalHeader className="flex gap-1 justify-center items-center">
            REPORTE DE ERRORES <BiSolidError size={25} color="#ef233c" />
          </ModalHeader>
          <ModalBody>
            <p>Se encontraron los siguientes errores:</p>
           
          </ModalBody>
          <ModalFooter>
            <Button color="danger" onPress={onClose}>
              Cerrar
            </Button>
            <Button
              onPress={handleShowReport}
              as={Link}
              color="primary"
              showAnchorIcon
              variant="solid"
              className="btn"
            >
              Mostrar Reporte
            </Button>
          </ModalFooter>
        </>
      </ModalContent>
    </Modal>
  );
}
