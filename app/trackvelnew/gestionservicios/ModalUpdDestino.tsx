import { IDestino } from '@/app/components/inputs/IDestino';
import InputDestino from '@/app/components/inputs/InputDestino';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@nextui-org/react';
import { forwardRef, useEffect, useRef, useState } from 'react';
import { TbGpsFilled } from 'react-icons/tb';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import dynamic from 'next/dynamic';
import type { Map as LeafletMap } from 'leaflet';

// Importar Leaflet dinámicamente para evitar problemas de SSR
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => {
    const MapContainerComponent = forwardRef<any, any>((props, ref) => (
      <mod.MapContainer {...props} ref={ref} />
    ));
    MapContainerComponent.displayName = 'DynamicMapContainer';
    return MapContainerComponent;
  }),
  { ssr: false },
);

const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => {
    const TileLayerComponent = forwardRef<any, any>((props, ref) => (
      <mod.TileLayer {...props} ref={ref} />
    ));
    TileLayerComponent.displayName = 'DynamicTileLayer';
    return TileLayerComponent;
  }),
  { ssr: false },
);

const Marker = dynamic(
  () => import('react-leaflet').then((mod) => {
    const MarkerComponent = forwardRef<any, any>((props, ref) => (
      <mod.Marker {...props} ref={ref} />
    ));
    MarkerComponent.displayName = 'DynamicMarker';
    return MarkerComponent;
  }),
  { ssr: false },
);

// Importar useMapEvents de manera estática para evitar problemas de tipos
import { useMapEvents } from 'react-leaflet';
import axios from 'axios';

// Componente para manejar clics en el mapa
function MapClickHandler({
  onMapClick,
}: {
  onMapClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface ModalUpdDestinoProps {
  isOpen: boolean;
  onClose: () => void;
  codservicio: string;
  onDestinoSeleccionado: (nombre: string, codigo: string) => void;
}

export default function App({
  isOpen,
  onClose,
  codservicio,
  onDestinoSeleccionado,
}: ModalUpdDestinoProps) {
  const [editable, setEditable] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [mapInstance, setMapInstance] = useState<LeafletMap | null>(null);

  const [codlan, setCodlan] = useState('');
  const [direccion, setDireccion] = useState('');
  const [distrito, setDistrito] = useState('');
  const [latitud, setLatitud] = useState('');
  const [longitud, setLongitud] = useState('');
  const [nomDestino, setNomDestino] = useState('');

  const { reset } = useForm();

  const mapRef = useRef<LeafletMap | null>(null);

  const [markerPosition, setMarkerPosition] = useState<[number, number]>([
    0, 0,
  ]);

  // Configurar iconos de Leaflet cuando se carga el cliente
  useEffect(() => {
    setIsClient(true);

    // Configurar iconos de Leaflet solo en el cliente
    if (typeof window !== 'undefined') {
      import('leaflet').then((L) => {
        // Borrar la configuración por defecto usando Object.assign
        const DefaultIcon = L.Icon.Default;
        const iconPrototype = DefaultIcon.prototype as {
          _getIconUrl?: () => void;
        };
        delete iconPrototype._getIconUrl;

        // Configurar nuevos iconos
        L.Icon.Default.mergeOptions({
          iconRetinaUrl:
            'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl:
            'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl:
            'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });
      });
    }
  }, []);

  // Manejar clics en el mapa
  const handleMapClick = async (lat: number, lng: number) => {
    setMarkerPosition([lat, lng]);
    setLatitud(lat.toString());
    setLongitud(lng.toString());
  };

  const handleClose = () => {
    reset((prev) => ({
      ...prev,
      identificador: '',
      nombre: '',
      telefono: '',
      sexo: '',
      empresa: '',
      tarifa: '',
      direccion: '',
      distrito: '',
      latitud: '',
      longitud: '',
    }));
    setMarkerPosition([0, 0]);
  };

  useEffect(() => {
    if (!isOpen) {
      handleClose();
    }
  }, [isOpen]);

  const [destinoSeleccionado, setDestinoSeleccionado] =
    useState<IDestino | null>(null);

  const handleSelectDestino = (destino: IDestino) => {
    setDestinoSeleccionado(destino);
    setCodlan(destino.codlan ?? '');
    setDireccion(destino.lugar.direccion ?? '');
    setDistrito(destino.lugar.distrito ?? '');
    setLatitud(destino.lugar.wy ?? '');
    setLongitud(destino.lugar.wx ?? '');
  };

  const handleSeleccionar = async () => {
    if (destinoSeleccionado && codservicio) {
      try {
        // Llamar a la API UpdateDestino
        const response = await axios.put(
          `https://velsat.pe:2096/api/Preplan/UpdateDestino?codservicio=${codservicio}&newcoddestino=${destinoSeleccionado.codigo}&newcodubicli=${destinoSeleccionado.lugar.codlugar}`
        );

        console.log('Respuesta de UpdateDestino:', response.data);
        
        // Si la API responde exitosamente
        onDestinoSeleccionado(
          destinoSeleccionado.apepate || '',
          destinoSeleccionado.codigo,
        );
        
        onClose(); // Cerrar el modal
        toast.success('Destino actualizado correctamente.');
        resetCampos();
        
      } catch (error) {
        console.error('Error al actualizar destino:', error);
        toast.error('Error al actualizar el destino.');
      }
    } else {
      if (!destinoSeleccionado) {
        toast.error('Debes seleccionar un destino.');
      }
      if (!codservicio) {
        toast.error('No se encontró el código de servicio.');
      }
    }
  };

  const resetCampos = () => {
    setCodlan('');
    setDireccion('');
    setDistrito('');
    setLatitud('');
    setLongitud('');
    setNomDestino('');
    setDestinoSeleccionado(null);
  };

  useEffect(() => {
    const lat = parseFloat(latitud);
    const lng = parseFloat(longitud);
    if (!isNaN(lat) && !isNaN(lng)) {
      const newPos: [number, number] = [lat, lng];
      setMarkerPosition(newPos);

      if (mapRef.current) {
        mapRef.current.setView(newPos, 18);
      }
    }
  }, [latitud, longitud]);

  return (
    <>
      <Modal
        className="scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100 z-[1000] h-[85vh] w-[70%] max-w-none overflow-auto"
        isOpen={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditable(false);
            resetCampos();
            onClose(); // Llamar la función onClose del padre
          }
        }}
        isDismissable={false}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                <h2 className="flex items-center gap-2 text-[14px] font-bold text-gray-800">
                  <TbGpsFilled size={20} />
                  MODIFICAR DESTINO
                </h2>
              </ModalHeader>
              <ModalBody>
                <div>
                  <label className="block text-[12px] font-medium">
                    Nombre Punto:
                  </label>
                  <div className="flex gap-2">
                    <div className="w-full">
                      {editable ? (
                        <input
                          className="w-full rounded-md border border-gray-300 bg-white p-1.5 text-[12px]"
                          placeholder="Escribe el nuevo destino"
                          value={nomDestino}
                          onChange={(e) => setNomDestino(e.target.value)}
                          required
                        />
                      ) : (
                        <InputDestino onSelectDestino={handleSelectDestino} />
                      )}
                    </div>

                    <button
                      onClick={handleSeleccionar}
                      className="rounded bg-blue-500 px-3 py-1 text-[12px] text-white hover:bg-blue-400"
                    >
                      Seleccionar
                    </button>
                  </div>
                </div>

                <div className="flex justify-between gap-2">
                  <div className="w-full">
                    <label className="block text-[12px] font-medium">
                      Dirección:
                    </label>
                    <input
                      disabled={!editable}
                      required
                      className="w-full rounded-md border border-gray-300 bg-gray-50 p-1.5 text-[12px]"
                      value={direccion}
                      onChange={(e) => setDireccion(e.target.value)}
                    />
                  </div>
                  <div className="w-full">
                    <label className="block text-[12px] font-medium">
                      Distrito:
                    </label>
                    <input
                      disabled={!editable}
                      required
                      className="w-full rounded-md border border-gray-300 bg-gray-50 p-1.5 text-[12px]"
                      value={distrito}
                      onChange={(e) => setDistrito(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-between gap-2">
                  <div className="w-full">
                    <label className="block text-[12px] font-medium">
                      Latitud:
                    </label>
                    <input
                      disabled={!editable}
                      required
                      className="w-full rounded-md border border-gray-300 bg-gray-50 p-1.5 text-[12px]"
                      value={latitud}
                      onChange={(e) => setLatitud(e.target.value)}
                    />
                  </div>

                  <div className="w-full">
                    <label className="block text-[12px] font-medium">
                      Longitud:
                    </label>
                    <input
                      disabled={!editable}
                      required
                      className="w-full rounded-md border border-gray-300 bg-gray-50 p-1.5 text-[12px]"
                      value={longitud}
                      onChange={(e) => setLongitud(e.target.value)}
                    />
                  </div>
                </div>

                {/* Contenedor del mapa con z-index más bajo */}
                <div
                  className="mt-4 w-full rounded border"
                  style={{ zIndex: 1 }}
                >
                  {isClient && (
                    <div className="h-[400px] w-full">
                      <MapContainer
                        center={
                          markerPosition[0] !== 0 && markerPosition[1] !== 0
                            ? markerPosition
                            : [-12.0464, -77.0428]
                        }
                        zoom={
                          markerPosition[0] !== 0 && markerPosition[1] !== 0
                            ? 18
                            : 5
                        }
                        style={{ height: '100%', width: '100%' }}
                        whenCreated={setMapInstance} // Usar whenCreated en lugar de ref
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        <MapClickHandler onMapClick={handleMapClick} />

                        {markerPosition[0] !== 0 && markerPosition[1] !== 0 && (
                          <Marker position={markerPosition} />
                        )}
                      </MapContainer>
                    </div>
                  )}
                </div>
              </ModalBody>

              <ModalFooter>
                <button
                  className="rounded bg-red-600 px-4 py-2 text-[14px] text-white hover:bg-red-500"
                  onClick={onClose}
                >
                  Cerrar
                </button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Estilos para importar Leaflet CSS */}
      <style jsx global>{`
        @import url('https://unpkg.com/leaflet@1.7.1/dist/leaflet.css');
      `}</style>
    </>
  );
}