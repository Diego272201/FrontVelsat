import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  useDisclosure,
  useDraggable,
} from '@nextui-org/react';
import { Save, User } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import PasajeroAutocompleteInput from './PasajeroAutocompleteInputProps';

interface PasajeroItem {
  id: string;
  codigo: string; // Código real del pasajero
  codlugar: number; // Código del lugar
  nombre: string;
}

interface Pasajero {
  codigo: string;
  nombre: string | null;
  codlan: string;
  apepate: string;
  login: string | null;
  clave: string | null;
  sexo: string | null;
  telefono: string | null;
  empresa: string | null;
  lugar: {
    codlugar: number;
    codcli: string | null;
    direccion: string;
    distrito: string;
    wy: string;
    wx: string;
    estado: string | null;
    codcliente: string | null;
    referencia: string | null;
    zona: string;
  };
  servicioactual: any;
}

interface ModalAddPasajerosProps {
  codservicio: string;
  aerolinea: string;
  proximoOrden: number;
  onPasajeroAgregado?: () => void; // Función opcional para recargar la lista
}

export default function ModalAddPasajeros({ 
  codservicio, 
  aerolinea, 
  proximoOrden, 
  onPasajeroAgregado 
}: ModalAddPasajerosProps) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const targetRef = React.useRef(null);
  const { moveProps } = useDraggable({
    targetRef,
    canOverflow: true,
    isDisabled: !isOpen,
  });

  const [listaPasajeros, setListaPasajeros] = useState<PasajeroItem[]>([]);
  const [guardando, setGuardando] = useState(false);

  // Limpiar lista cuando el modal se cierre
  useEffect(() => {
    if (!isOpen && listaPasajeros.length > 0) {
      setListaPasajeros([]);
      console.log('Modal cerrado - Lista limpiada');
    }
  }, [isOpen]);

  // Función para agregar pasajero desde autocompletado
  const handleSelectPasajero = (pasajero: Pasajero) => {
    // Verificar que el pasajero no esté ya en la lista
    const yaExiste = listaPasajeros.some(p => p.codigo === pasajero.codigo);
    if (yaExiste) {
      toast.warning('El pasajero ya está en la lista');
      console.log('El pasajero ya está en la lista');
      return;
    }

    const nuevoPasajero: PasajeroItem = {
      id: pasajero.codlan, // Usar codlan como ID único
      codigo: pasajero.codigo, // Código real del pasajero
      codlugar: pasajero.lugar.codlugar, // Código del lugar
      nombre: pasajero.apepate,
    };

    const nuevaLista = [...listaPasajeros, nuevoPasajero];
    setListaPasajeros(nuevaLista);
    toast.success(`Pasajero ${pasajero.apepate} agregado a la lista`);
    console.log('Lista actualizada de pasajeros:', nuevaLista);
  };

  // Función para agregar pasajero manualmente (no se usa pero mantengo por si acaso)
  const handleManualInput = (nombre: string) => {
    if (nombre.trim()) {
      const nuevoId = Date.now().toString();
      const nuevoPasajero: PasajeroItem = {
        id: nuevoId,
        codigo: 'MANUAL', // Código por defecto para entrada manual
        codlugar: 0, // Código de lugar por defecto
        nombre: nombre.trim(),
      };

      setListaPasajeros((prev) => [...prev, nuevoPasajero]);
    }
  };

  const borrarPasajero = (id: string) => {
    const pasajeroEliminado = listaPasajeros.find(p => p.id === id);
    const nuevaLista = listaPasajeros.filter((p) => p.id !== id);
    setListaPasajeros(nuevaLista);
    toast.info(`Pasajero ${pasajeroEliminado?.nombre} eliminado de la lista`);
    console.log('Pasajero eliminado - Lista actualizada:', nuevaLista);
  };

  const handleGuardar = async (onClose: () => void) => {
    if (listaPasajeros.length === 0) {
      toast.warning('No hay pasajeros para guardar');
      console.log('No hay pasajeros para guardar');
      return;
    }

    setGuardando(true);
    
    // Mostrar toast de proceso iniciado
    const toastId = toast.loading(`Guardando ${listaPasajeros.length} pasajero${listaPasajeros.length > 1 ? 's' : ''}...`);
    
    try {
      // Preparar los datos según la estructura de la API
      const pasajerosParaGuardar = listaPasajeros.map((pasajero, index) => ({
        codservicio: codservicio,
        lugar: {
          codlugar: pasajero.codlugar.toString()
        },
        pasajero: {
          codigo: pasajero.codigo
        },
        servicio: {
          codservicio: codservicio
        },
        orden: (proximoOrden + index).toString(),
        arealan: aerolinea // Usando aerolinea como arealan
      }));

      console.log('Datos a enviar a la API:', pasajerosParaGuardar);

      // Llamar a la API PUT
      const response = await fetch('https://do.velsat.pe:2083/api/Gacela/NuevoSubServicioPasajero', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pasajerosParaGuardar)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const responseData = await response.json();
      console.log('Respuesta de la API:', responseData);

      // Mostrar toast de éxito
      toast.success(`${listaPasajeros.length} pasajero${listaPasajeros.length > 1 ? 's guardados' : ' guardado'} exitosamente`, {
        id: toastId,
        duration: 3000
      });
      
      // Limpiar la lista después de guardar exitosamente
      setListaPasajeros([]);
      
      // Llamar al callback para recargar la lista en el componente padre
      if (onPasajeroAgregado) {
        onPasajeroAgregado();
      }
      
      // Cerrar el modal
      onClose();
      
    } catch (error) {
      console.error('Error al guardar pasajeros:', error);
      
      // Mostrar toast de error
      toast.error(`Error al guardar los pasajeros: ${error instanceof Error ? error.message : 'Error desconocido'}`, {
        id: toastId,
        duration: 5000
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
     
      
      <Button
        color="success"
        onPress={onOpen}
        startContent={<User className="h-5 w-5" />}
        size="sm"
        className="font-semibold"
      >
        Agregar Pasajero
      </Button>

      <Modal
        ref={targetRef}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        size="3xl"
        scrollBehavior="inside"
        classNames={{
          base: 'bg-white',
          backdrop: 'bg-black/50',
          body: 'py-6',
          footer: 'border-t border-gray-200',
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader {...moveProps} className="flex flex-col gap-1">
                <div className="text-center">
                  <h2 className="text-lg font-semibold text-gray-800">
                    Nuevo Pasajero
                  </h2>
                  <div className="text-sm text-gray-600 mt-1">
                    Servicio: {codservicio} • {aerolinea} • Próximo orden: {proximoOrden + listaPasajeros.length}
                  </div>
                </div>
              </ModalHeader>

              <ModalBody>
                <div className="space-y-6">
                  {/* Campo de búsqueda con autocompletado */}
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Buscar o agregar pasajero:
                      </label>
                      <PasajeroAutocompleteInput
                        placeholder="Buscar pasajero (mín. 3 caracteres)..."
                        onSelectPasajero={handleSelectPasajero}
                        allowManualEntry={false}
                        variant="nextui"
                        size="md"
                        className="bg-white"
                      />
                    </div>
                  </div>

                  {/* Lista de Pasajeros */}
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <h3 className="mb-4 text-center text-sm font-semibold text-gray-800">
                      Lista de Pasajeros ({listaPasajeros.length})
                    </h3>

                    <div className="space-y-0 overflow-hidden rounded-lg border border-gray-300 bg-white">
                      {/* Header */}
                      <div className="border-b border-gray-300 bg-blue-100">
                        <div className="grid grid-cols-4 gap-4 px-4 py-2 text-sm font-semibold text-gray-800">
                          <div className="text-center">Orden</div>
                          <div className="col-span-2 text-center">Pasajero</div>
                          <div className="text-center">Acción</div>
                        </div>
                      </div>

                      {/* Lista de pasajeros */}
                      {listaPasajeros.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                          <User className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                          <p>No hay pasajeros agregados</p>
                          <p className="text-sm">
                            Use el campo de arriba para buscar y agregar pasajeros
                          </p>
                        </div>
                      ) : (
                        listaPasajeros.map((pasajero, index) => (
                          <div
                            key={pasajero.id}
                            className={`grid grid-cols-4 gap-4 items-center px-4 py-3 ${
                              index < listaPasajeros.length - 1
                                ? 'border-b border-gray-200'
                                : ''
                            } transition-colors hover:bg-gray-50`}
                          >
                            <div className="text-center">
                              <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full">
                                {proximoOrden + index}
                              </span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-sm font-medium text-gray-800">
                                {pasajero.nombre}
                              </span>
                              <div className="text-xs text-gray-500 mt-1">
                                Código: {pasajero.codigo} • Lugar: {pasajero.codlugar}
                              </div>
                            </div>
                            <div className="text-center">
                              <Button
                                color="danger"
                                variant="bordered"
                                size="sm"
                                onPress={() => borrarPasajero(pasajero.id)}
                                className="min-w-[70px]"
                                isDisabled={guardando}
                              >
                                Borrar
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Botón Guardar dentro de la lista */}
                    {listaPasajeros.length > 0 && (
                      <div className="mt-4 text-center">
                        <Button
                          color="success"
                          variant="solid"
                          onPress={() => handleGuardar(onClose)}
                          className="px-8"
                          startContent={<Save className="h-4 w-4" />}
                          isLoading={guardando}
                          isDisabled={guardando}
                        >
                          {guardando ? 'Guardando...' : `Guardar ${listaPasajeros.length} Pasajero${listaPasajeros.length > 1 ? 's' : ''}`}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </ModalBody>

              <ModalFooter>
                <Button 
                  color="danger" 
                  variant="light" 
                  onPress={onClose}
                  isDisabled={guardando}
                >
                  Cerrar
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}