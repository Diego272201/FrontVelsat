import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from '@nextui-org/react';

interface NuevoServicioModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export default function NuevoServicioModal({
  isOpen,
  onOpenChange,
}: NuevoServicioModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      className="w-[60%] max-w-none"
    >
      <ModalContent>
        {(onClose) => (
          <>
            <div className="rounded-md border border-gray-200 bg-white p-4">
              <h2 className="mb-4 text-lg font-bold text-gray-800">
                Crear Nuevo Servicio
              </h2>

              <div className="grid grid-cols-2 gap-4">
                {/* Cliente y Tipo de Servicio */}
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Cliente:
                  </label>
                  <select className="mt-1 w-full rounded-md border border-gray-300 bg-gray-100 p-1 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500">
                    <option>AJINOMOTO</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Tipo de Servicio:
                  </label>
                  <select className="mt-1 w-full rounded-md border border-gray-300 bg-gray-100 p-1 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500">
                    <option>RECOJO</option>
                  </select>
                </div>

                {/* Hora Destino y Hora Programada */}
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Hora Destino:
                  </label>
                  <input
                    type="datetime-local"
                    className="mt-1 w-full rounded-md border border-gray-300 bg-gray-100 p-1 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Hora Programada:
                  </label>
                  <input
                    type="datetime-local"
                    className="mt-1 w-full rounded-md border border-gray-300 bg-gray-100 p-1 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                {/* Buscar Pasajero */}
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Buscar Pasajero:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ingrese Nombre Pasajero"
                      className="flex-1 rounded-md border border-gray-300 bg-gray-100 p-1 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Hora Atención"
                      className="w-1/4 rounded-md border border-gray-300 bg-gray-100 p-1 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    <button className="rounded-md bg-blue-600 px-3 py-1 text-xs text-white transition hover:bg-blue-700">
                      Agregar
                    </button>
                  </div>
                </div>

                {/* Asignar Unidad */}
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Asignar Unidad:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ingrese Placa Unidad"
                      className="flex-1 rounded-md border border-gray-300 bg-gray-100 p-1 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Nombre de Conductor"
                      className="flex-1 rounded-md border border-gray-300 bg-gray-100 p-1 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Mensaje de Pasajeros */}
              <p className="mt-4 text-xs italic text-gray-600">
                No se agregaron pasajeros
              </p>
            </div>
            <ModalFooter>
              <Button color="danger" variant="light" onPress={onClose}>
                Cerrar
              </Button>
              <Button color="primary" onPress={onClose}>
                Guardar
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
