import React, { useEffect, useState } from 'react';
import { TbGps, TbTrash, TbMapPin, TbPlus, TbX } from 'react-icons/tb';
import axios from 'axios';
import { toast } from 'sonner';
import { API_BASE_URL125 } from '@/app/components/urlsApi/urlApi';
import ModalDireccionAdicional from './ModalDireccionAdicional';
import { Spinner } from '@nextui-org/react';

type ModalDireccionesProp = {
  codCliente: string;
  nombrePasajero: string;
  codigo: string;
  setShouldRefetch: React.Dispatch<React.SetStateAction<boolean>>;
  useTalmaEndpoint?: boolean;
};

type Lugar = {
  codlugar: number;
  codcli: string;
  direccion: string;
  distrito: string;
};

export default function ModalDirecciones({
  codCliente,
  nombrePasajero,
  codigo,
  setShouldRefetch,
  useTalmaEndpoint = false,
}: ModalDireccionesProp) {
  const [isOpen, setIsOpen] = useState(false);
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [selectedValue, setSelectedValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [isModalDireccionAdicionalOpen, setIsModalDireccionAdicionalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && codCliente) {
      setIsLoading(true);

      axios
        .get(`${API_BASE_URL125}/api/Preplan/lugares/${codCliente}`)
        .then((response) => {
          console.log('Respuesta completa de la API:', response);
          console.log('Código del cliente:', codCliente);
        
          setLugares(response.data);
        })
        .catch((error) => {
          console.error('Error al obtener direcciones:', error);
          toast.error('Error al obtener las direcciones.');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, codCliente]);

  const handleGuardar = async () => {
    if (!selectedValue) {
      toast.warning('Por favor, selecciona una dirección.');
      return;
    }

    setIsSaving(true);
    try {
      const endpoint = useTalmaEndpoint ? 'Talma' : 'Preplan';
      const url = `${API_BASE_URL125}/api/${endpoint}/direccion/${selectedValue}/${codigo}`;     
       console.log('URL de la solicitud PUT:', url);
      await axios.put(url);
      toast.success('Dirección guardada correctamente.');
      setShouldRefetch(true);
      setIsOpen(false);
    } catch (error) {
      toast.error('Hubo un error al guardar la dirección.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEliminar = async (codlugar: number) => {
    setIsDeleting(codlugar);
    
    try {
      await axios.delete(`https://do.velsat.pe:2083/api/Preplan/EliminarDireccion?codlugar=${codlugar}`);
      
      setLugares(prevLugares => prevLugares.filter(lugar => lugar.codlugar !== codlugar));
      
      if (selectedValue === String(codlugar)) {
        setSelectedValue('');
      }
      
      toast.success('Dirección eliminada correctamente.');
      setShouldRefetch(true);
      
    } catch (error) {
      console.error('Error al eliminar dirección:', error);
      toast.error('Error al eliminar la dirección.');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleDireccionAdicionalGuardada = () => {
    setShouldRefetch(true);
    if (isOpen && codCliente) {
      setIsLoading(true);
      axios
        .get(`${API_BASE_URL125}/api/Preplan/lugares/${codCliente}`)
        .then((response) => {
          setLugares(response.data);
        })
        .catch((error) => {
          console.error('Error al recargar direcciones:', error);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  };

  return (
    <>
      {/* Botón para abrir modal */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-3 py-2 rounded-lg text-xs transition-colors"
      >
        <TbGps size={16} />
        Dirección
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 animate-in fade-in duration-200">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal Content */}
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="flex flex-col gap-2 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100 px-6 py-3 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500 rounded-lg">
                    <TbMapPin className="text-white" size={24} />
                  </div>
                  <div>
                    <h3 className="text-[12px] font-bold text-gray-800">
                      Seleccionar Dirección
                   
                    </h3>
                    <p className="text-sm font-normal text-gray-600">
                      Pasajero: <span className="font-semibold text-orange-600">
                        {nombrePasajero
                          .toLowerCase()
                          .split(' ')
                          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                          .join(' ')}
                      </span>
                    </p>
                  </div>
                </div>
                
                {/* Botón cerrar */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-orange-100 rounded-lg transition-colors"
                >
                  <TbX size={24} className="text-gray-600" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto py-3 px-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-1 bg-orange-500 rounded-full"></div>
                  <h4 className="text-[12px] font-bold text-gray-700 uppercase tracking-wide">
                    Direcciones Registradas
                  </h4>
                </div>
                <span className="bg-orange-100 text-orange-700 text-xs font-semibold px-3 py-1 rounded-full">
                  {lugares.length} {lugares.length === 1 ? 'dirección' : 'direcciones'}
                </span>
              </div>

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16">
      <Spinner color="primary" />
                  <p className="mt-4 text-sm text-gray-600 font-medium">Cargando direcciones...</p>
                </div>
              ) : lugares.length > 0 ? (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {lugares.map((lugar) => (
                    <div
                      key={lugar.codlugar}
                      onClick={() => setSelectedValue(String(lugar.codlugar))}
                      className={`group relative border-2 rounded-xl p-4 transition-all duration-200 cursor-pointer ${
                        selectedValue === String(lugar.codlugar)
                          ? 'border-orange-400 bg-gradient-to-r from-orange-50 to-amber-50 shadow-md'
                          : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50/30'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Radio personalizado */}
                        <div className="flex-shrink-0 pt-1">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            selectedValue === String(lugar.codlugar)
                              ? 'border-orange-500 bg-orange-500'
                              : 'border-gray-300'
                          }`}>
                            {selectedValue === String(lugar.codlugar) && (
                              <div className="w-2 h-2 rounded-full bg-white"></div>
                            )}
                          </div>
                        </div>

                        {/* Contenido */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <TbMapPin 
                              className={`flex-shrink-0 ${
                                selectedValue === String(lugar.codlugar) 
                                  ? 'text-orange-600' 
                                  : 'text-gray-400'
                              }`} 
                              size={18} 
                            />
                            <h5 className={`font-bold text-sm uppercase ${
                              selectedValue === String(lugar.codlugar)
                                ? 'text-orange-900'
                                : 'text-gray-800'
                            }`}>
                              {lugar.distrito}
                            </h5>
                          </div>
                          <p className={`text-sm leading-relaxed ${
                            selectedValue === String(lugar.codlugar)
                              ? 'text-orange-800'
                              : 'text-gray-600'
                          }`}>
                            {lugar.direccion}
                          </p>
                        </div>

                        {/* Botón eliminar */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEliminar(lugar.codlugar);
                          }}
                          disabled={isDeleting === lugar.codlugar}
                          className="flex-shrink-0 p-2 hover:bg-red-100 rounded-lg transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                        >
                          {isDeleting === lugar.codlugar ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-500 border-t-transparent"></div>
                          ) : (
                            <TbTrash size={18} className="text-red-500" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="bg-gray-100 p-4 rounded-full mb-4">
                    <TbMapPin className="text-gray-400" size={40} />
                  </div>
                  <h4 className="text-gray-700 font-semibold mb-1">
                    No hay direcciones disponibles
                  </h4>
                  <p className="text-sm text-gray-500">
                    Agrega una nueva dirección para comenzar
                  </p>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="bg-gradient-to-r from-gray-50 to-slate-50 border-t border-gray-200 p-6 rounded-b-3xl">
              <div className="flex items-center justify-between w-full gap-3">
                <button
                  onClick={() => setIsModalDireccionAdicionalOpen(true)}
                  className="flex items-center gap-2 bg-purple-100 hover:bg-purple-200 text-purple-700 font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  <TbPlus size={18} />
                  Nueva Dirección
                </button>

                <div className="flex gap-3">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-6 py-2 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>

                  <button
                    onClick={handleGuardar}
                    disabled={!selectedValue || isSaving}
                    className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        Guardando...
                      </>
                    ) : (
                      'Guardar Selección'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Dirección Adicional */}
      <ModalDireccionAdicional
        isOpen={isModalDireccionAdicionalOpen}
        onClose={() => setIsModalDireccionAdicionalOpen(false)}
        codCliente={codCliente}
        nombrePasajero={nombrePasajero}
        onDireccionGuardada={handleDireccionAdicionalGuardada}
      />
    </>
  );
}