import InputPasajero from '@/app/components/inputs/InputPasajero';
import { API_BASE_URL125 } from '@/app/components/urlsApi/urlApi';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  useDisclosure,
} from '@nextui-org/react';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { MdLibraryAdd, MdDelete } from 'react-icons/md';
import { toast } from 'sonner';
import { useUsername } from '@/hooks/useUsername';

interface Grupo {
  id: number;
  tipo: string;
  empresa: string;
  destinoGrupo: string;
  fecha: string;
  horaprog: string;
  conductor: string;
  unidad: string;
}

interface Pasajero {
  apepate: string;
  codlan: string;
  codlugar: number;
}

interface ModalAgregarPasajeroProps {
  grupo: Grupo;
  onRefrescarDatos?: () => void;
}

export default function App({
  grupo,
  onRefrescarDatos,
}: ModalAgregarPasajeroProps) {
  const { username, isReady } = useUsername();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [pasajeroSeleccionado, setPasajeroSeleccionado] = useState<Pasajero | null>(null);
  const [pasajerosSeleccionados, setPasajerosSeleccionados] = useState<Pasajero[]>([]);
  const [agregandoPasajeros, setAgregandoPasajeros] = useState(false);

  const handleSeleccionarPasajero = (pasajero: Pasajero) => {
    if (!pasajero) return;

    // Verificar si el pasajero ya está en la lista
    const yaExiste = pasajerosSeleccionados.some(
      (p) => p.codlan === pasajero.codlan
    );

    if (yaExiste) {
      toast.warning('Este pasajero ya está en la lista');
      return;
    }

    setPasajerosSeleccionados([...pasajerosSeleccionados, pasajero]);
    setPasajeroSeleccionado(null);
    toast.success('Pasajero agregado a la lista');
  };

  const handleEliminarPendiente = (codlan: string) => {
    setPasajerosSeleccionados(
      pasajerosSeleccionados.filter((p) => p.codlan !== codlan)
    );
    toast.success('Pasajero eliminado de la lista');
  };

  const handleAgregarTodos = async () => {
    if (!isReady) {
    return;
  }

    if (pasajerosSeleccionados.length === 0) {
      toast.warning('No hay pasajeros para agregar');
      return;
    }

    setAgregandoPasajeros(true);

    try {
      let agregadosExitosamente = 0;
      let errores = 0;

      for (const pasajero of pasajerosSeleccionados) {
        const payload = {
          arealan: grupo.empresa,
          destinocodlugar: pasajero.codlugar.toString(),
          distancia: 0,
          empresa: grupo.empresa,
          fecha: grupo.fecha,
          horaprog: grupo.horaprog,
          numero: (grupo.id - 1).toString(),
          orden: '0',
          pasajero: {
            codlan: pasajero.codlan,
            nombre: pasajero.apepate,
          },
          rol: 'Ninguno',
          tipo: grupo.tipo,
        };

        try {
          const response = await fetch(
            `${API_BASE_URL125}/api/Preplan/AgregarPasajero?usuario=${username}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(payload),
            }
          );

          if (response.ok) {
            agregadosExitosamente++;
          } else {
            errores++;
            console.error(`Error al agregar pasajero ${pasajero.apepate}`);
          }
        } catch (error) {
          errores++;
          console.error(`Error en solicitud para ${pasajero.apepate}:`, error);
        }
      }

      // Mostrar resultado
      if (agregadosExitosamente > 0) {
        toast.success(`${agregadosExitosamente} pasajero(s) agregado(s) correctamente`);
      }
      
      if (errores > 0) {
        toast.error(`${errores} pasajero(s) no se pudieron agregar`);
      }

      // Limpiar lista y actualizar datos
      if (agregadosExitosamente > 0) {
        setPasajerosSeleccionados([]);
        if (onRefrescarDatos) {
          onRefrescarDatos();
        }
        if (errores === 0) {
          onOpenChange(); // Cerrar modal solo si todos se agregaron exitosamente
        }
      }
    } catch (error) {
      console.error('Error general:', error);
      toast.error('Ocurrió un error al procesar los pasajeros');
    } finally {
      setAgregandoPasajeros(false);
    }
  };

  const handleCerrarModal = () => {
    setPasajerosSeleccionados([]);
    setPasajeroSeleccionado(null);
    onOpenChange();
  };

  return (
    <>
      <button
        onClick={onOpen}
        type="button"
        className="inline-flex h-8 items-center gap-x-2 rounded border border-transparent bg-blue-600 px-2 py-1 text-sm font-medium text-white hover:bg-blue-700 focus:bg-blue-700 focus:outline-none disabled:pointer-events-none disabled:opacity-50"
      >
        <Plus size={14} />
        Pasajero
      </button>
      
      <Modal
        isDismissable={false}
        isKeyboardDismissDisabled={true}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        size="3xl"
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader className="flex items-center gap-2 text-[14px] uppercase">
                Agregar Pasajeros al Servicio
                <MdLibraryAdd />
              </ModalHeader>
              
              <ModalBody className="space-y-4">
                {/* Input para seleccionar pasajero */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Buscar y seleccionar pasajero:
                  </h4>
                  <InputPasajero onSelectPasajero={handleSeleccionarPasajero} clearAfterSelect={true}/>
                </div>

                {/* Lista de pasajeros seleccionados */}
                {pasajerosSeleccionados.length > 0 ? (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Pasajeros seleccionados ({pasajerosSeleccionados.length}):
                    </h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-2">
                      {pasajerosSeleccionados.map((pasajero, index) => (
                        <div
                          key={pasajero.codlan}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-800">
                              {index + 1}. {pasajero.apepate}
                            </p>
                            <p className="text-xs text-gray-600">
                              Código: {pasajero.codlan} | Lugar: {pasajero.codlugar}
                            </p>
                          </div>
                          <button
                            onClick={() => handleEliminarPendiente(pasajero.codlan)}
                            className="ml-2 p-1 text-red-600 hover:bg-red-100 rounded"
                            title="Eliminar de la lista"
                          >
                            <MdDelete size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <p className="text-sm text-gray-600 text-center">
                      Aún no has agregado pasajeros a la lista. Busca y selecciona pasajeros para agregarlos.
                    </p>
                  </div>
                )}
              </ModalBody>
              
              <ModalFooter>
                <Button color="danger" onPress={handleCerrarModal}>
                  Cerrar
                </Button>
                <Button
                  color="primary"
                  onPress={handleAgregarTodos}
                  isLoading={agregandoPasajeros}
                  isDisabled={pasajerosSeleccionados.length === 0}
                >
                  {agregandoPasajeros 
                    ? `Agregando ${pasajerosSeleccionados.length} pasajero(s)...` 
                    : `Agregar ${pasajerosSeleccionados.length} pasajero(s)`
                  }
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}