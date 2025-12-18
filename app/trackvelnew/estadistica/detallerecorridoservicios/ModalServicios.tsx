import React, { useEffect, useState } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Link,
} from '@nextui-org/react';
import { Toaster, toast } from 'sonner';
import '@/app/styles/sonner.css';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { FaChevronDown } from 'react-icons/fa';
import { useUsername } from '@/hooks/useUsername';

interface AppModalProps {
  isOpen: boolean;
  onClose: () => void;
  titulo: string;
  nameurl: string;
  namedown: string;
  namedesc: string;
  showDownloadButton: boolean;
  useSelectAll?: boolean;
}

interface Servicio {
  codservicio: number;
  numero: number;
  tipo: string;
  unidad: string;
  empresa: string;
}

const AppModalServicios: React.FC<AppModalProps> = ({
  isOpen,
  onClose,
  titulo,
  nameurl,
  namedown,
  namedesc,
  showDownloadButton,
  useSelectAll = false,
}) => {
  const { data: session } = useSession();

  const [open, setOpen] = useState(false);
  const [fecha, setFecha] = useState('');
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [selectedServicio, setSelectedServicio] = useState<string>('');
  const { username, isReady } = useUsername(); // ✅ Agregar esta línea

  function formatearFecha(fechaEntrada: string): string {
    const [anio, mes, dia] = fechaEntrada.split('-');

    return `${dia}/${mes}/${anio}`;
  }

  function convertirFechaFormatoISO(fecha: string | null | undefined): string {
    if (!fecha || !fecha.includes('/')) return '';

    const [fechaParte, horaParte = '00:00:00'] = fecha.split(' ');
    const [dia, mes, anio] = fechaParte.split('/');

    if (!dia || !mes || !anio) return '';

    return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}T${horaParte}`;
  }

  useEffect(() => {
    const fetchServicios = async () => {
      if (!fecha || !isReady) return;

      const fechaFormateada = formatearFecha(fecha);

      // ✅ Condiciones personalizadas según username
      let empresa: string | null = null;
      let usuario: string | null = null;

      if (username === 'talmav') {
        empresa = 'TALMA';
        usuario = 'cgacela';
      } else if (
        username === 'aremyscontrol1' ||
        username === 'aremyscontrol2'
      ) {
        empresa = 'SASAA';
        usuario = 'aremys';
      }

      try {
        const response = await fetch(
          `https://do.velsat.pe:2083/api/Recorrido/SelectServicio?fecha=${fechaFormateada}&empresa=${empresa ?? ''}&usuario=${usuario ?? ''}`,
        );

        if (!response.ok) throw new Error('Error al obtener servicios');

        const data = await response.json();
        setServicios(data);
      } catch (error) {
        console.error('Error al obtener servicios:', error);
        setServicios([]);
      }
    };

    fetchServicios();
  }, [fecha, isReady, username]);

  useEffect(() => {
    if (!isOpen) {
      setFecha('');
      setSelectedServicio('');
      setServicios([]);
      setOpen(false);
    }
  }, [isOpen]);

  const handleShowReport = async () => {
    if (!fecha || !selectedServicio) {
      toast.error('Rellenar campos necesarios', {
        className: 'toast-slide-in',
        richColors: true,
      });
      return;
    }

    const servicioSeleccionado = servicios.find((item) => {
      const tipoTexto = item.tipo === 'S' ? 'Salida' : 'Ingreso';
      return (
        selectedServicio ===
        `Número: ${item.numero} - Tipo: ${tipoTexto} - Empresa: ${item.empresa}`
      );
    });

    if (!servicioSeleccionado) {
      toast.error('Servicio no válido');
      return;
    }

    const fechaFormateada = formatearFecha(fecha);

    // ✅ Condiciones personalizadas según username
    let empresa: string | null = null;
    let usuario: string | null = null;

    if (username === 'talmav') {
      empresa = 'TALMA';
      usuario = 'cgacela';
    } else if (username === 'aremyscontrol1' || username === 'aremyscontrol2') {
      empresa = 'SASAA';
      usuario = 'aremys';
    }

    try {
      const response = await fetch(
        `https://do.velsat.pe:2083/api/Recorrido/DatoServicio?fecha=${fechaFormateada}&numero=${servicioSeleccionado.numero}&empresa=${empresa ?? ''}&usuario=${usuario ?? ''}`,
      );

      if (!response.ok) {
        throw new Error('Error al obtener datos del servicio');
      }

      const data = await response.json();

      const fechainiFormateada = convertirFechaFormatoISO(data.fechaini);
      const fechafinFormateada = convertirFechaFormatoISO(data.fechafin);

      const queryParams = new URLSearchParams({
        codservicio: data.codservicio,
        numero: data.numero,
        tipo: data.tipo,
        unidad: data.unidad,
        empresa: data.empresa,
        fechaini: fechainiFormateada || '',
        fechafin: fechafinFormateada || '',
        fechaoriginal: fecha,
      });

      const url = `/trackvelnew/estadistica/${nameurl}?${queryParams.toString()}`;
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error al obtener datos del servicio:', error);
      toast.error('No se pudo obtener la información del servicio', {
        className: 'toast-slide-in',
        richColors: true,
      });
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
              <div>
                <div>
                  <span className="mb-1 block text-sm font-medium text-gray-700">
                    Fecha de Servicio
                  </span>{' '}
                  <input
                    id="fecha-servicio"
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="flex w-full cursor-pointer items-center justify-between rounded-md border border-gray-300 bg-gray-50 p-2 text-sm"
                  />
                </div>

                <div className="relative mt-4 w-full">
                  <div
                    onClick={() => setOpen(!open)}
                    className="flex cursor-pointer items-center justify-between rounded-md border border-gray-300 bg-gray-50 p-2 text-sm"
                  >
                    <span>{selectedServicio || 'Seleccione Servicio'}</span>
                    <FaChevronDown
                      className={`transition-transform duration-700 ${open ? 'rotate-180' : ''}`}
                      size={10}
                    />
                  </div>
                  {open && (
                    <div className="mt-1 max-h-[200px] w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow">
                      {servicios.length > 0 ? (
                        servicios.map((item) => {
                          const tipoTexto =
                            item.tipo === 'S' ? 'Salida' : 'Ingreso';
                          return (
                            <div
                              key={item.codservicio}
                              onClick={() => {
                                setSelectedServicio(
                                  `Número: ${item.numero} - Tipo: ${tipoTexto} - Empresa: ${item.empresa}`,
                                );
                                setOpen(false);
                              }}
                              className="cursor-pointer px-4 py-2 text-[12px] hover:bg-gray-100"
                            >
                              Número: {item.numero} - Tipo: {tipoTexto} -
                              Empresa: {item.empresa}
                            </div>
                          );
                        })
                      ) : (
                        <div className="px-4 py-2 text-sm text-gray-500">
                          No hay servicios
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
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
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default AppModalServicios;
