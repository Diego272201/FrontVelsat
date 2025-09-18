import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
} from '@nextui-org/react';
import { TbGpsFilled, TbMapPin } from 'react-icons/tb';
import { toast } from 'sonner';
import { forwardRef } from 'react';
import dynamic from 'next/dynamic';
import type { Map as LeafletMap } from 'leaflet';
import axios from 'axios';

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

interface ModalDireccionAdicionalProps {
  isOpen: boolean;
  onClose: () => void;
  codCliente: string;
  nombrePasajero: string;
  onDireccionGuardada?: () => void;
}

export default function ModalDireccionAdicional({
  isOpen,
  onClose,
  codCliente,
  nombrePasajero,
  onDireccionGuardada,
}: ModalDireccionAdicionalProps) {
  const [isClient, setIsClient] = useState(false);
  const [mapInstance, setMapInstance] = useState<LeafletMap | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);

  // Estados para los campos del formulario
  const [direccion, setDireccion] = useState('');
  const [distrito, setDistrito] = useState('');
  const [referencia, setReferencia] = useState('');
  const [latitud, setLatitud] = useState('');
  const [longitud, setLongitud] = useState('');

  const mapRef = useRef<LeafletMap | null>(null);
  const [markerPosition, setMarkerPosition] = useState<[number, number]>([
    -12.0464, -77.0428, // Coordenadas por defecto (Lima, Perú)
  ]);

  // Manejar cambios de fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsMapFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () =>
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Función para alternar fullscreen
  const toggleFullscreen = async () => {
    const mapContainer = document.getElementById('leaflet-map-container-adicional');
    if (!mapContainer) return;

    try {
      if (!document.fullscreenElement) {
        await mapContainer.requestFullscreen();
        setIsMapFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsMapFullscreen(false);
      }

      // Invalidar el tamaño del mapa después del cambio
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, 100);
    } catch (error) {
      console.error('Error al cambiar modo fullscreen:', error);
    }
  };

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
    
    console.log('Coordenadas seleccionadas:', { lat, lng });
  };

  // Limpiar campos cuando se cierra el modal
  const handleClose = () => {
    setDireccion('');
    setDistrito('');
    setReferencia('');
    setLatitud('');
    setLongitud('');
    setMarkerPosition([-12.0464, -77.0428]);
    onClose();
  };

  // Actualizar posición del marcador cuando cambian las coordenadas manualmente
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

  // Función para guardar la dirección usando la API
  const handleGuardar = async () => {
    // Validar campos obligatorios
    if (!direccion || !distrito) {
      toast.warning('Por favor, completa todos los campos obligatorios.');
      return;
    }

    if (!latitud || !longitud) {
      toast.warning('Por favor, selecciona una ubicación en el mapa.');
      return;
    }

    setIsSaving(true);

    try {
      // Concatenar dirección y referencia
      const direccionCompleta = referencia.trim() 
        ? `${direccion} - ${referencia}` 
        : direccion;

      // Preparar datos para la API
      const datosAPI = {
        codcli: codCliente,
        direccion: direccionCompleta, // Dirección + Referencia concatenadas
        distrito: distrito,
        wy: latitud,
        wx: longitud,
      };

      console.log('Enviando datos a la API:', datosAPI);

      // Llamada a la API POST
      const response = await axios.post(
        'https://velsat.pe:2096/api/Preplan/DireccionAdicional',
        datosAPI,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('Respuesta de la API:', response.data);
      
      toast.success('Dirección adicional creada correctamente.');
      
      // Llamar a la función callback para notificar al componente padre
      if (onDireccionGuardada) {
        onDireccionGuardada();
      }
      
      handleClose();

    } catch (error) {
      console.error('Error al guardar la dirección:', error);
      
      // Manejar diferentes tipos de errores
      if (axios.isAxiosError(error)) {
        if (error.response) {
          // Error de respuesta del servidor
          const status = error.response.status;
          const message = error.response.data?.message || error.response.data || 'Error del servidor';
          
          if (status === 400) {
            toast.error(`Error de validación: ${message}`);
          } else if (status === 401) {
            toast.error('No autorizado. Verifica tus credenciales.');
          } else if (status === 500) {
            toast.error('Error interno del servidor. Intenta más tarde.');
          } else {
            toast.error(`Error del servidor (${status}): ${message}`);
          }
        } else if (error.request) {
          // Error de conexión
          toast.error('Error de conexión. Verifica tu internet e intenta nuevamente.');
        } else {
          // Error de configuración
          toast.error('Error en la configuración de la solicitud.');
        }
      } else {
        toast.error('Hubo un error inesperado al guardar la dirección.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onOpenChange={() => {}} // Desactivar el cierre automático
        isDismissable={false}
        hideCloseButton={true}
        size="4xl"
        scrollBehavior="inside"
        classNames={{
          wrapper: "z-[999999]",
          backdrop: "z-[999998]",
          base: "z-[999999]",
          body: "p-6",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                <h2 className="flex items-center gap-2 text-[14px] font-bold text-gray-800">
                  <TbMapPin size={20} />
                  AGREGAR DIRECCIÓN ADICIONAL - {nombrePasajero
                    .toLowerCase()
                    .split(' ')
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ')}
                </h2>
              </ModalHeader>
              
              <ModalBody>
                <div className="space-y-4">
                  {/* Campo Dirección */}
                  <div>
                    <Input
                      label="Dirección"
                      placeholder="Ingrese la dirección completa"
                      value={direccion}
                      onChange={(e) => setDireccion(e.target.value)}
                      size="sm"
                      isRequired
                    />
                  </div>

                  {/* Campo Distrito */}
                  <div>
                    <Input
                      label="Distrito"
                      placeholder="Ingrese el distrito"
                      value={distrito}
                      onChange={(e) => setDistrito(e.target.value)}
                      size="sm"
                      isRequired
                    />
                  </div>

                  {/* Campo Referencia */}
                  <div>
                    <Input
                      label="Referencia"
                      placeholder="Punto de referencia (opcional)"
                      value={referencia}
                      onChange={(e) => setReferencia(e.target.value)}
                      size="sm"
                    />
                  </div>

                  {/* Coordenadas */}
                  <div className="flex gap-2">
                    <div className="w-1/2">
                      <Input
                        label="Latitud"
                        placeholder="-12.0464"
                        value={latitud}
                        onChange={(e) => setLatitud(e.target.value)}
                        size="sm"
                      />
                    </div>
                    <div className="w-1/2">
                      <Input
                        label="Longitud"
                        placeholder="-77.0428"
                        value={longitud}
                        onChange={(e) => setLongitud(e.target.value)}
                        size="sm"
                      />
                    </div>
                  </div>

                  {/* Información */}
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-[12px] text-blue-700 flex items-center gap-1">
                      <TbGpsFilled size={14} />
                      Haz clic en el mapa para seleccionar la ubicación exacta
                    </p>
                  </div>

                  {/* Mapa con Fullscreen */}
                  <div
                    id="leaflet-map-container-adicional"
                    className={`relative ${
                      isMapFullscreen
                        ? 'fixed inset-0 z-[9999] h-screen w-screen bg-white'
                        : 'mt-4 w-full rounded border'
                    }`}
                    style={{
                      zIndex: isMapFullscreen ? 9999 : 1,
                      ...(isMapFullscreen && {
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        width: '100vw',
                        height: '100vh',
                        backgroundColor: 'white',
                        margin: 0,
                        padding: 0,
                      }),
                    }}
                  >
                    {/* Botón de fullscreen */}
                    <button
                      onClick={toggleFullscreen}
                      className="absolute right-4 top-4 z-[10001] rounded-md border border-gray-300 bg-white p-2 shadow-lg transition-colors duration-200 hover:bg-gray-100"
                      title={
                        isMapFullscreen
                          ? 'Salir de pantalla completa'
                          : 'Pantalla completa'
                      }
                      style={{ zIndex: 10001 }}
                    >
                      {isMapFullscreen ? (
                        // Icono para salir de fullscreen
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 0 2-2h3M3 16h3a2 2 0 0 0 2 2v3" />
                        </svg>
                      ) : (
                        // Icono para entrar en fullscreen
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                        </svg>
                      )}
                    </button>

                    {isClient && (
                      <div
                        className={`${
                          isMapFullscreen
                            ? 'h-full w-full'
                            : 'h-[350px] w-full'
                        } overflow-hidden rounded-lg`}
                        style={
                          isMapFullscreen
                            ? {
                                width: '100%',
                                height: '100%',
                                margin: 0,
                                padding: 0,
                              }
                            : {}
                        }
                      >
                        <MapContainer
                          center={markerPosition}
                          zoom={13}
                          style={{
                            height: '100%',
                            width: '100%',
                            ...(isMapFullscreen && {
                              margin: 0,
                              padding: 0,
                            }),
                          }}
                          ref={mapRef}
                          whenCreated={setMapInstance}
                        >
                          <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          />

                          <MapClickHandler onMapClick={handleMapClick} />

                          <Marker position={markerPosition} />
                        </MapContainer>
                      </div>
                    )}
                  </div>
                </div>
              </ModalBody>

              <ModalFooter>
                <Button
                  color="danger"
                  onPress={handleClose}
                >
                  Cancelar
                </Button>
                
                <Button
                  color="primary"
                  onPress={handleGuardar}
                  isLoading={isSaving}
                >
                  Guardar Dirección
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Estilos para corregir problemas de eventos con NextUI y agregar funcionalidad de fullscreen */}
      <style jsx global>{`
        @import url('https://unpkg.com/leaflet@1.7.1/dist/leaflet.css');
        
        /* Corregir z-index general */
        [data-nextui-modal] {
          z-index: 999999 !important;
        }
        
        [data-nextui-modal-backdrop] {
          z-index: 999998 !important;
        }
        
        /* Permitir eventos en inputs y contenido del modal */
        [data-nextui-modal] input,
        [data-nextui-modal] [data-slot="input"],
        [data-nextui-modal] [data-slot="input-wrapper"],
        [data-nextui-modal] .leaflet-container,
        [data-nextui-modal] .leaflet-control-container {
          pointer-events: auto !important;
        }
        
        /* Evitar que el modal capture eventos de inputs */
        [data-nextui-modal] [data-slot="body"] * {
          pointer-events: auto !important;
        }

        /* Estilos para el modo fullscreen del modal adicional */
        #leaflet-map-container-adicional:fullscreen {
          background: white !important;
          width: 100vw !important;
          height: 100vh !important;
          margin: 0 !important;
          padding: 0 !important;
          display: block !important;
        }

        #leaflet-map-container-adicional:fullscreen .leaflet-container {
          background: #fff !important;
          width: 100% !important;
          height: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        /* Remover cualquier padding/margin del body cuando está en fullscreen */
        body:has(#leaflet-map-container-adicional:fullscreen) {
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden;
        }

        /* Asegurar que el mapa en fullscreen tenga el tamaño correcto */
        #leaflet-map-container-adicional.fixed {
          z-index: 9999 !important;
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          background: white !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        /* Mejorar la visibilidad del botón en fullscreen */
        #leaflet-map-container-adicional button {
          backdrop-filter: blur(5px);
          background: rgba(255, 255, 255, 0.95) !important;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2) !important;
        }

        /* Forzar el tamaño del contenedor del mapa en fullscreen */
        #leaflet-map-container-adicional:fullscreen > div,
        #leaflet-map-container-adicional.fixed > div {
          width: 100% !important;
          height: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        /* Animación suave para la transición */
        #leaflet-map-container-adicional {
          transition: all 0.2s ease-in-out;
        }
      `}</style>
    </>
  );
}